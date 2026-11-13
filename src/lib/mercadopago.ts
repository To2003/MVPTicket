import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "@/lib/env";

/** Lo único que nos importa de un pago de MP (siempre leído de la API, nunca del aviso). */
export interface MpPayment {
  id: string;
  status: string; // approved | pending | in_process | rejected | refunded | cancelled | charged_back ...
  statusDetail: string | null;
  amount: number | null;
  currency: string | null;
  externalReference: string | null;
  raw: unknown;
}

export interface PreferenceInput {
  orderId: string;
  expiresAt: Date;
  buyer: { name: string; email: string; dni: string };
  items: Array<{ id: string; title: string; quantity: number; unitPrice: number }>;
}

/** Interfaz mínima: en los tests se reemplaza por un fake. */
export interface MpGateway {
  getPayment(id: string): Promise<MpPayment>;
  createPreference(input: PreferenceInput): Promise<{ id: string; checkoutUrl: string }>;
}

export class MpNotConfiguredError extends Error {
  constructor() {
    super("Mercado Pago no está configurado (falta MP_ACCESS_TOKEN).");
  }
}

export function realMpGateway(): MpGateway {
  const token = env.mpAccessToken();
  if (!token) throw new MpNotConfiguredError();
  const config = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10_000 } });

  return {
    async getPayment(id) {
      const p = await new Payment(config).get({ id });
      return {
        id: String(p.id),
        status: p.status ?? "unknown",
        statusDetail: p.status_detail ?? null,
        amount: typeof p.transaction_amount === "number" ? p.transaction_amount : null,
        currency: p.currency_id ?? null,
        externalReference: p.external_reference ?? null,
        raw: p,
      };
    },

    async createPreference(input) {
      const appUrl = env.appUrl();
      const isHttps = appUrl.startsWith("https://");
      const pref = await new Preference(config).create({
        body: {
          items: input.items.map((i) => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            currency_id: "ARS",
          })),
          payer: {
            name: input.buyer.name,
            email: input.buyer.email,
            identification: { type: "DNI", number: input.buyer.dni },
          },
          external_reference: input.orderId,
          back_urls: {
            success: `${appUrl}/compra/exito`,
            pending: `${appUrl}/compra/pendiente`,
            failure: `${appUrl}/compra/error`,
          },
          // MP rechaza auto_return y notification_url con http://localhost (D7).
          ...(isHttps ? { auto_return: "approved", notification_url: `${appUrl}/api/webhooks/mercadopago` } : {}),
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: input.expiresAt.toISOString(),
          payment_methods: {
            // Sin efectivo (D10) y sin cuotas.
            excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
            installments: 1,
          },
          statement_descriptor: "ALGOLINDO",
        },
        requestOptions: { idempotencyKey: `pref-${input.orderId}` },
      });
      const checkoutUrl = token.startsWith("TEST-") ? pref.sandbox_init_point ?? pref.init_point : pref.init_point;
      if (!pref.id || !checkoutUrl) throw new Error("Mercado Pago no devolvió la preferencia.");
      return { id: pref.id, checkoutUrl };
    },
  };
}

/**
 * Verifica el header x-signature de los webhooks de MP.
 * Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
export function verifyMpSignature(opts: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const { secret, signatureHeader, requestId, dataId } = opts;
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, ...v] = kv.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const given = Buffer.from(v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

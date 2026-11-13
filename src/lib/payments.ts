import "server-only";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail as defaultSendEmail, type EmailSender } from "@/lib/email/send";
import { renderTicketsEmail } from "@/lib/email/template";
import { realMpGateway, type MpGateway } from "@/lib/mercadopago";
import { getOrderDetails } from "@/lib/orders";
import { qrPng } from "@/lib/qr";

export type PaymentOutcome =
  | "confirmed"
  | "already_paid"
  | "duplicate_payment"
  | "amount_mismatch"
  | "currency_mismatch"
  | "no_stock"
  | "order_not_found"
  | "invalid_reference"
  | "ignored";

export interface PaymentDeps {
  mp: MpGateway;
  sendEmail: EmailSender;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Procesa un pago de Mercado Pago a partir de su id. Lo usan el webhook y las páginas de retorno.
 * - NO confía en el aviso: consulta el pago a la API de MP.
 * - Idempotente: se puede llamar N veces (en paralelo incluso) con el mismo id.
 * - Tolera orden y demoras: siempre actúa sobre el estado ACTUAL del pago, y "paid" es terminal.
 * Si la API de MP falla, tira error (el webhook responde 500 y MP reintenta).
 */
export async function processPayment(
  paymentId: string,
  deps: Partial<PaymentDeps> = {},
): Promise<{ outcome: PaymentOutcome; orderId: string | null; status: string }> {
  const mp = deps.mp ?? realMpGateway();
  const payment = await mp.getPayment(paymentId);

  const ref = payment.externalReference && UUID_RE.test(payment.externalReference) ? payment.externalReference : null;
  const order = ref ? await queryOne<{ id: string; total: number }>("select id, total from public.orders where id = $1", [ref]) : null;
  const amount = payment.amount === null ? null : Math.round(payment.amount * 100) / 100;

  await query(
    `insert into public.payments (mp_payment_id, order_id, status, amount, raw)
     values ($1, $2, $3, $4, $5)
     on conflict (mp_payment_id) do update
       set status = excluded.status, amount = excluded.amount, raw = excluded.raw,
           order_id = coalesce(public.payments.order_id, excluded.order_id)`,
    [payment.id, order?.id ?? null, payment.status, amount === null ? null : Math.round(amount), JSON.stringify(payment.raw ?? null)],
  );

  let outcome: PaymentOutcome;
  if (!order) outcome = "invalid_reference";
  else if (payment.status !== "approved") outcome = "ignored";
  else if (payment.currency !== "ARS") outcome = "currency_mismatch";
  else if (amount === null || amount !== order.total) outcome = "amount_mismatch";
  else {
    const r = await queryOne<{ result: PaymentOutcome }>("select public.confirm_order($1, $2, $3) as result", [
      order.id,
      payment.id,
      amount,
    ]);
    outcome = r!.result;
  }

  await query("update public.payments set outcome = $2 where mp_payment_id = $1", [payment.id, outcome]);

  if (outcome !== "ignored" && outcome !== "confirmed" && outcome !== "already_paid") {
    console.warn(`[pagos] Pago ${payment.id} (${payment.status}) → ${outcome}. Revisar en el panel.`);
  }
  if (order && (outcome === "confirmed" || outcome === "already_paid")) {
    // Si el mail falla, tira error: el webhook devuelve 500 y MP reintenta (la confirmación ya quedó).
    await deliverTicketsEmail(order.id, deps.sendEmail ?? defaultSendEmail);
  }
  return { outcome, orderId: order?.id ?? null, status: payment.status };
}

/** Modo demo: confirma la orden como si MP hubiera aprobado el pago. Mismo camino que el webhook. */
export async function confirmDemoPayment(
  orderId: string,
  deps: Partial<Pick<PaymentDeps, "sendEmail">> = {},
): Promise<PaymentOutcome> {
  if (!env.demoMode()) throw new Error("El modo demo está desactivado.");
  const order = await queryOne<{ id: string; total: number }>("select id, total from public.orders where id = $1", [orderId]);
  if (!order) return "order_not_found";
  const paymentId = `demo-${order.id}`;
  await query(
    `insert into public.payments (mp_payment_id, order_id, status, amount, raw)
     values ($1, $2, 'approved', $3, '{"demo": true}') on conflict (mp_payment_id) do nothing`,
    [paymentId, order.id, order.total],
  );
  const r = await queryOne<{ result: PaymentOutcome }>("select public.confirm_order($1, $2, $3) as result", [
    order.id,
    paymentId,
    order.total,
  ]);
  const outcome = r!.result;
  await query("update public.payments set outcome = $2 where mp_payment_id = $1", [paymentId, outcome]);
  if (outcome === "confirmed" || outcome === "already_paid") {
    try {
      await deliverTicketsEmail(order.id, deps.sendEmail ?? defaultSendEmail);
    } catch (err) {
      console.error("[mail] No se pudo enviar el mail de entradas:", (err as Error).message);
    }
  }
  return outcome;
}

/**
 * Manda el mail de entradas UNA sola vez por orden: "reserva" el envío marcando email_sent_at
 * de forma atómica; si el envío falla, lo libera para reintentar.
 */
export async function deliverTicketsEmail(orderId: string, send: EmailSender): Promise<boolean> {
  const claimed = await queryOne<{ id: string }>(
    `update public.orders set email_sent_at = now()
     where id = $1 and status = 'paid' and email_sent_at is null returning id`,
    [orderId],
  );
  if (!claimed) return false;
  try {
    const order = await getOrderDetails(orderId);
    if (!order) return false;
    const appUrl = env.appUrl();
    const pngs = await Promise.all(order.tickets.map((t) => qrPng(t.token)));
    const { subject, html, text } = renderTicketsEmail({
      buyerName: order.buyerName,
      eventName: order.event.name,
      startsAt: order.event.startsAt,
      venueName: order.event.venueName,
      venueAddress: order.event.venueAddress,
      total: order.total,
      orderUrl: `${appUrl}/compra/${order.id}`,
      tickets: order.tickets.map((t, i) => ({
        code: t.code,
        holderName: t.holderName,
        ticketTypeName: t.ticketTypeName,
        url: `${appUrl}/entrada/${t.token}`,
        qrSrc: `cid:qr-${i + 1}`,
      })),
    });
    await send({
      to: order.buyerEmail,
      subject,
      html,
      text,
      attachments: pngs.map((content, i) => ({
        filename: `entrada-${i + 1}.png`,
        content,
        contentType: "image/png",
        contentId: `qr-${i + 1}`,
      })),
    });
    return true;
  } catch (err) {
    await query("update public.orders set email_sent_at = null where id = $1", [orderId]);
    throw err;
  }
}

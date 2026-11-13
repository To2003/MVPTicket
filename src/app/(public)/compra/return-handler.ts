import "server-only";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { processPayment } from "@/lib/payments";

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * back_urls de Mercado Pago (/compra/exito|pendiente|error).
 * La query NO se cree: si viene un payment_id se consulta a la API de MP con el mismo
 * processPayment del webhook (D7). Después se muestra el estado real de la orden.
 */
export async function handleMpReturn(searchParams: Promise<Search>) {
  const sp = await searchParams;
  const paymentId = first(sp.payment_id) ?? first(sp.collection_id);
  const ref = first(sp.external_reference);
  let orderId = ref && /^[0-9a-f-]{36}$/i.test(ref) ? ref : null;

  if (paymentId && /^\d{1,24}$/.test(paymentId) && env.mpAccessToken()) {
    try {
      const r = await processPayment(paymentId);
      orderId = r.orderId ?? orderId;
    } catch (err) {
      console.error("[mp-return] No se pudo procesar el pago (lo va a reintentar el webhook):", (err as Error).message);
    }
  }
  redirect(orderId ? `/compra/${orderId}` : "/");
}

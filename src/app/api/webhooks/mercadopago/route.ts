import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifyMpSignature } from "@/lib/mercadopago";
import { processPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Webhook de Mercado Pago. Acepta el formato nuevo (?type=payment&data.id=…, body {type, data:{id}})
 * y el viejo IPN (?topic=payment&id=…). Del aviso solo usamos el id: el estado se consulta a la API.
 * - 200: procesado o ignorado (MP no reintenta).
 * - 401: firma inválida (si MP_WEBHOOK_SECRET está configurado).
 * - 500: falló algo transitorio (MP reintenta más tarde).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: { type?: string; topic?: string; action?: string; data?: { id?: string | number }; resource?: string } = {};
  try {
    body = await req.json();
  } catch {
    // algunos avisos IPN vienen sin body
  }

  const queryDataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "";
  const dataId = String(
    queryDataId ?? url.searchParams.get("id") ?? body.data?.id ?? (body.resource ? /(\d+)$/.exec(body.resource)?.[1] ?? "" : ""),
  );

  const secret = env.mpWebhookSecret();
  if (secret) {
    const ok = verifyMpSignature({
      secret,
      signatureHeader: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId: queryDataId ?? dataId,
    });
    if (!ok) return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  if (type !== "payment" || !/^\d{1,24}$/.test(dataId)) {
    return NextResponse.json({ ignored: true });
  }
  if (!env.mpAccessToken()) {
    return NextResponse.json({ ignored: true, reason: "mp_not_configured" });
  }

  try {
    const result = await processPayment(dataId);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    console.error("[webhook-mp] Error procesando el pago", dataId, (err as Error).message);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true });
}

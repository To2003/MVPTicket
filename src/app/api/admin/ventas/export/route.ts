import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { ORDER_STATUS_LABEL, TICKET_STATUS_LABEL, listAttendees, listOrders } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const view = sp.get("vista") === "asistentes" ? "asistentes" : "ordenes";
  const evento = sp.get("evento");
  const filters = {
    eventId: evento && /^[0-9a-f-]{36}$/i.test(evento) ? evento : undefined,
    status: sp.get("estado") || undefined,
    q: (sp.get("q") ?? "").slice(0, 80) || undefined,
  };

  let csv: string;
  if (view === "asistentes") {
    const rows = await listAttendees(filters, 20_000);
    csv = toCsv(
      ["Evento", "Tipo de entrada", "Precio", "Titular", "Comprador", "Mail", "DNI", "Código", "Estado", "Ingresó", "Pagada", "Orden"],
      rows.map((r) => [
        r.eventName,
        r.ticketTypeName,
        r.price,
        r.holderName,
        r.buyerName,
        r.buyerEmail,
        r.buyerDni,
        r.code,
        TICKET_STATUS_LABEL[r.status],
        r.usedAt ? formatDateTime(r.usedAt) : "",
        r.paidAt ? formatDateTime(r.paidAt) : "",
        r.orderId,
      ]),
    );
  } else {
    const rows = await listOrders(filters, 20_000);
    csv = toCsv(
      ["Fecha", "Evento", "Comprador", "Mail", "DNI", "Entradas", "Total", "Estado", "Orden"],
      rows.map((r) => [
        formatDateTime(r.createdAt),
        r.eventName,
        r.buyerName,
        r.buyerEmail,
        r.buyerDni,
        r.quantity,
        r.total,
        ORDER_STATUS_LABEL[r.status],
        r.id,
      ]),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="algo-lindo-${view}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

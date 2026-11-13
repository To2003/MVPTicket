import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrder } from "@/lib/data/admin";
import { formatDateTime, formatMoney } from "@/lib/format";
import { TicketRows } from "./TicketRows";

export const metadata = { title: "Orden" };

const OUTCOME: Record<string, string> = {
  confirmed: "Confirmó la orden",
  already_paid: "Aviso repetido (sin cambios)",
  duplicate_payment: "Pago duplicado: devolver",
  amount_mismatch: "Monto distinto: revisar",
  currency_mismatch: "Moneda distinta: revisar",
  no_stock: "Llegó sin cupo: devolver",
  ignored: "Sin aprobar",
  invalid_reference: "Sin orden asociada",
};

export default async function OrderAdminPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdmin();
  const o = await getAdminOrder((await params).orderId);
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/ventas" className="mb-4 inline-block text-sm text-muted hover:text-ink">← Ventas</Link>
      <PageHeader title={o.buyerName} subtitle={`${o.eventName} · ${formatDateTime(o.startsAt)}`} actions={<OrderStatusBadge status={o.status} />} />

      {o.status === "needs_refund" ? (
        <Alert tone="danger" title="Esta compra se pagó sin cupo" className="mb-5">
          El pago llegó cuando ya no quedaban lugares. Hacé la devolución desde Mercado Pago (pago {o.payments[0]?.id ?? "—"}).
        </Alert>
      ) : null}

      <section className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
        <Info label="Mail">{o.buyerEmail}</Info>
        <Info label="DNI">{o.buyerDni}</Info>
        <Info label="Creada">{formatDateTime(o.createdAt)}</Info>
        <Info label="Pagada">{o.paidAt ? formatDateTime(o.paidAt) : "—"}</Info>
        <Info label="Detalle">
          {o.items.map((i) => (
            <span key={i.name} className="block">
              {i.quantity} × {i.name} ({formatMoney(i.unitPrice)})
            </span>
          ))}
        </Info>
        <Info label="Total">
          <span className="font-display text-xl font-bold">{formatMoney(o.total)}</span>
        </Info>
        <Info label="Mail de entradas">{o.emailSentAt ? `Enviado ${formatDateTime(o.emailSentAt)}` : "No enviado"}</Info>
        <Info label="Código de orden">
          <span className="font-mono text-xs">{o.id}</span>
        </Info>
      </section>

      <h2 className="mb-3 font-display text-xl font-bold">Entradas</h2>
      {o.tickets.length ? (
        <TicketRows tickets={o.tickets} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Esta orden no tiene entradas (no se pagó o se pagó sin cupo).</p>
      )}

      {o.payments.length ? (
        <>
          <h2 className="mb-3 mt-8 font-display text-xl font-bold">Pagos de Mercado Pago</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {o.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3">
                <span className="font-mono">{p.id}</span>
                <span className="text-muted">
                  {p.status} · {p.amount !== null ? formatMoney(p.amount) : "—"} · {OUTCOME[p.outcome ?? ""] ?? p.outcome ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <div className="mt-0.5 break-words">{children}</div>
    </div>
  );
}

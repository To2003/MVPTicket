import { StatCard } from "@/components/admin/EventStatsCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { AttendeesList, OrdersList } from "@/components/admin/SalesLists";
import { buttonClass } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth";
import { eventOptions, listAttendees, listOrders, salesTotals } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";
import { FiltersUrl } from "./FiltersUrl";

export const metadata = { title: "Ventas" };

type SP = { vista?: string; evento?: string; estado?: string; q?: string };

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = sp.vista === "asistentes" ? "asistentes" : "ordenes";
  const eventId = sp.evento && /^[0-9a-f-]{36}$/i.test(sp.evento) ? sp.evento : "";
  const q = (sp.q ?? "").slice(0, 80);
  const status = sp.estado ?? "";
  const filters = { eventId: eventId || undefined, status: status || undefined, q: q || undefined };

  const [events, totals, orders, attendees] = await Promise.all([
    eventOptions(),
    salesTotals({ eventId: filters.eventId, q: filters.q, status: view === "ordenes" ? filters.status : undefined }),
    view === "ordenes" ? listOrders(filters) : Promise.resolve([]),
    view === "asistentes" ? listAttendees(filters) : Promise.resolve([]),
  ]);

  const exportParams = new URLSearchParams();
  exportParams.set("vista", view);
  if (eventId) exportParams.set("evento", eventId);
  if (status) exportParams.set("estado", status);
  if (q) exportParams.set("q", q);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Ventas"
        actions={
          <a href={`/api/admin/ventas/export?${exportParams}`} className={buttonClass("outline", "sm")} download>
            ⬇ Exportar a Excel (CSV)
          </a>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Entradas vendidas" value={String(totals.tickets)} hint={`${totals.orders} órdenes pagas`} tone="primary" />
        <StatCard label="Recaudado" value={formatMoney(totals.revenue)} hint="Solo órdenes pagas" />
      </div>
      <div className="mb-5">
        <FiltersUrl value={{ view, eventId, status, q }} events={events.map((e) => ({ id: e.id, name: e.name }))} />
      </div>
      {view === "ordenes" ? (
        <>
          <p className="mb-2 text-xs text-muted">{orders.length} órdenes{orders.length >= 300 ? " (mostrando las últimas 300)" : ""}</p>
          <OrdersList rows={orders} hrefFor={(id) => `/admin/ventas/${id}`} />
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">{attendees.length} entradas · tocá una para cambiar el titular o anularla</p>
          <AttendeesList rows={attendees} hrefFor={(t) => `/admin/ventas/${t.orderId}#t-${t.id}`} />
        </>
      )}
    </div>
  );
}

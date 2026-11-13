import Link from "next/link";
import { EventStatsCard, StatCard } from "@/components/admin/EventStatsCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth";
import { dashboardAlerts, listEventStats } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";
import { logout } from "../login/actions";

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [upcoming, alerts] = await Promise.all([listEventStats("upcoming"), dashboardAlerts()]);
  const sold = upcoming.reduce((a, e) => a + e.sold, 0);
  const revenue = upcoming.reduce((a, e) => a + e.revenue, 0);
  const first = admin.email.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`¡Hola, ${first}!`}
        subtitle="Así vienen las ventas de los próximos eventos."
        actions={
          <>
            <LinkButton href="/admin/eventos/nuevo" size="sm">+ Nuevo evento</LinkButton>
            <form action={logout} className="lg:hidden">
              <button type="submit" className="h-9 rounded-full border border-line px-4 text-sm font-semibold">Salir</button>
            </form>
          </>
        }
      />

      {alerts.refunds || alerts.duplicates ? (
        <Alert tone="danger" title="Hay pagos para devolver" className="mb-6">
          {alerts.refunds ? `${alerts.refunds} compra(s) se pagaron cuando ya no había cupo. ` : ""}
          {alerts.duplicates ? `${alerts.duplicates} pago(s) duplicado(s). ` : ""}
          Devolvé la plata desde el panel de Mercado Pago.{" "}
          <Link href="/admin/ventas?estado=needs_refund" className="font-semibold underline">Ver cuáles</Link>
        </Alert>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Entradas vendidas" value={String(sold)} hint="Próximos eventos" tone="primary" />
        <StatCard label="Recaudado" value={formatMoney(revenue)} hint="Próximos eventos" />
        <Link href="/admin/consultas" className="col-span-2 md:col-span-1">
          <StatCard
            label="Consultas sin leer"
            value={String(alerts.unread)}
            hint={alerts.unread ? "Tocá para verlas" : "Estás al día"}
            tone={alerts.unread ? "accent" : "ink"}
          />
        </Link>
      </div>

      <h2 className="mb-3 font-display text-xl font-bold">Próximos eventos</h2>
      {upcoming.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((e) => (
            <EventStatsCard
              key={e.id}
              e={e}
              actions={
                <>
                  <LinkButton href={`/admin/ventas?evento=${e.id}`} variant="outline" size="sm">Ventas</LinkButton>
                  <LinkButton href={`/admin/eventos/${e.id}`} variant="ghost" size="sm">Editar</LinkButton>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No hay eventos próximos" action={<LinkButton href="/admin/eventos/nuevo">Crear el primero</LinkButton>}>
          Creá un evento y publicalo para empezar a vender.
        </EmptyState>
      )}
    </div>
  );
}

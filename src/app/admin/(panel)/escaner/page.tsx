import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth";
import { gateStats, scannableEvents } from "@/lib/scan";
import { Scanner } from "./Scanner";

export const metadata = { title: "Escáner" };

export default async function ScannerPage() {
  await requireAdmin();
  const events = await scannableEvents();
  if (!events.length) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Escáner de puerta" />
        <EmptyState title="No hay eventos para hoy ni próximos">Cuando haya un evento, lo vas a poder elegir acá para validar las entradas.</EmptyState>
      </div>
    );
  }
  const first = events[0];
  const stats = await gateStats(first.id);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Escáner de puerta" subtitle="Verde: pasa · Amarillo: ya usada · Rojo: no pasa" />
      <Scanner
        events={events.map((e) => ({ id: e.id, name: e.name, startsAt: e.starts_at.toISOString() }))}
        defaultEventId={first.id}
        initialStats={stats}
      />
    </div>
  );
}

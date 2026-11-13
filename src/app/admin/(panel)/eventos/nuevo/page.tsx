import { emptyEventValues } from "@/components/admin/event-form-values";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { EventFormClient } from "../EventFormClient";

export const metadata = { title: "Nuevo evento" };

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo evento" subtitle="Completá los datos. Podés dejarlo como borrador y publicarlo después." />
      <EventFormClient initial={emptyEventValues()} isNew />
    </div>
  );
}

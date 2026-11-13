import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth";
import { getAdminEvent } from "@/lib/data/admin";
import { toLocalInputValue } from "@/lib/format";
import { EventFormClient } from "../EventFormClient";

export const metadata = { title: "Editar evento" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const event = await getAdminEvent((await params).id);
  if (!event) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Editar evento"
        subtitle={event.name}
        actions={
          event.isPublished ? (
            <LinkButton href={`/eventos/${event.slug}`} target="_blank" variant="outline" size="sm">Ver en la web ↗</LinkButton>
          ) : null
        }
      />
      <EventFormClient
        isNew={false}
        initial={{
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description,
          startsAt: toLocalInputValue(event.startsAt),
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          publish: event.isPublished,
          flyerUrl: event.flyerUrl,
          ticketTypes: event.ticketTypes.map((t) => ({
            key: t.id,
            id: t.id,
            name: t.name,
            price: String(t.price),
            capacity: String(t.capacity),
            used: t.used,
          })),
        }}
      />
    </div>
  );
}

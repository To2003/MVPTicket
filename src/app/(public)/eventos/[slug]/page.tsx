import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyPanel } from "@/components/events/BuyPanel";
import { availabilityBadge } from "@/components/events/EventCard";
import { Flyer } from "@/components/events/Flyer";
import { LinkButton } from "@/components/ui/Button";
import { getPublishedEventBySlug } from "@/lib/data/public";
import { formatDateLong, formatTime } from "@/lib/format";
import { isPast } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublishedEventBySlug((await params).slug);
  return event ? { title: event.name, description: event.description.slice(0, 160) } : { title: "Evento no encontrado" };
}

export default async function EventPage({ params }: Props) {
  const event = await getPublishedEventBySlug((await params).slug);
  if (!event) notFound();
  const past = isPast(event);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.venueAddress}`)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-brand border border-line shadow-[0_30px_80px_-30px_var(--brand-primary)]">
            <Flyer src={event.flyerUrl} alt={`Flyer de ${event.name}`} className="aspect-[4/5] w-full" priority />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">{availabilityBadge(event)}</div>
            <h1 className="condensed font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">{event.name}</h1>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Cuándo">
                <span>{formatDateLong(event.startsAt)}</span>
                <span className="block text-muted">{formatTime(event.startsAt)} hs</span>
              </InfoItem>
              <InfoItem label="Dónde">
                {event.venueName}
                {event.venueAddress ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block text-muted underline decoration-line underline-offset-4 hover:text-primary">
                    {event.venueAddress} ↗
                  </a>
                ) : null}
              </InfoItem>
            </dl>
          </header>

          <section aria-labelledby="entradas" className="flex flex-col gap-4">
            <h2 id="entradas" className="font-display text-2xl font-bold">Entradas</h2>
            {past ? (
              <div className="rounded-2xl border border-line bg-surface p-6">
                <p className="font-display text-xl font-bold">Este evento ya fue 💫</p>
                <p className="mt-1 text-muted">Gracias a todos los que vinieron. Mirá lo que se viene.</p>
                <LinkButton href="/#eventos" variant="outline" className="mt-4">Ver próximos eventos</LinkButton>
              </div>
            ) : (
              <BuyPanel slug={event.slug} ticketTypes={event.ticketTypes} />
            )}
          </section>

          {event.description ? (
            <section aria-labelledby="sobre" className="flex flex-col gap-3">
              <h2 id="sobre" className="font-display text-2xl font-bold">De qué se trata</h2>
              <div className="space-y-3 whitespace-pre-line text-ink/80 leading-relaxed">{event.description}</div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  );
}

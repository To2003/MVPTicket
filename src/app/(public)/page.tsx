import { Sparkle } from "@/components/brand/Logo";
import { EventCard } from "@/components/events/EventCard";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { brand, whatsappLink } from "@/config/brand";
import { listPastEvents, listUpcomingEvents } from "@/lib/data/public";
import { formatDateShort } from "@/lib/format";
import { Flyer } from "@/components/events/Flyer";
import Link from "next/link";
import type { EventView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [upcoming, past] = await Promise.all([listUpcomingEvents(), listPastEvents(3)]);
  const marquee = upcoming.length
    ? upcoming.map((e) => `${e.name} · ${formatDateShort(e.startsAt)}`)
    : ["Se vienen fechas nuevas", "Seguinos para enterarte"];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-primary/30 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-24 size-[22rem] rounded-full bg-violet/30 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted">
            <span className="size-2 rounded-full bg-accent" /> {brand.city} · entradas online
          </p>
          <h1 className="condensed font-display text-[clamp(3.4rem,13vw,9.5rem)] font-extrabold uppercase leading-[0.85] tracking-tight">
            {brand.heroTitle.map((line, i) => (
              <span key={line} className={i === 1 ? "block text-primary" : "block"}>
                {line}
                {i === brand.heroTitle.length - 1 ? <Sparkle className="ml-2 inline size-[0.55em] -translate-y-[0.15em] text-accent" /> : null}
              </span>
            ))}
          </h1>
          <div className="mt-8 flex max-w-xl flex-col gap-6">
            <p className="text-lg text-ink/80">{brand.heroSubtitle}</p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="#eventos" size="lg">Ver próximos eventos</LinkButton>
              <LinkButton href="/contacto" variant="outline" size="lg">Armemos tu evento</LinkButton>
            </div>
          </div>
          </div>
          {upcoming.length ? <HeroFlyers events={upcoming.slice(0, 2)} /> : null}
        </div>
        <div className="relative border-y border-line bg-accent py-3 text-accent-ink" aria-hidden>
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-lg font-bold uppercase condensed">
            {[...marquee, ...marquee, ...marquee, ...marquee].map((t, i) => (
              <span key={i} className="flex items-center gap-10">
                {t} <Sparkle className="size-4" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Agenda</p>
            <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Próximos eventos</h2>
          </div>
        </div>
        {upcoming.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Estamos armando las próximas fechas"
            action={<LinkButton href={`https://instagram.com/${brand.contact.instagram}`} variant="outline">Seguinos en Instagram</LinkButton>}
          >
            Por ahora no hay eventos a la venta. Seguinos para enterarte primero cuando salgan las entradas.
          </EmptyState>
        )}
      </section>

      {/* EVENTOS PRIVADOS */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-8 sm:p-12">
          <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">Eventos privados</p>
              <h2 className="mt-2 font-display text-4xl font-extrabold leading-none sm:text-5xl">
                ¿Cumple, aniversario o fiesta de empresa?
              </h2>
              <p className="mt-4 max-w-lg text-ink/75">
                Te armamos la fiesta completa: lugar, música, barra y todo lo que necesites para que solo te ocupes de pasarla bien.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <LinkButton href="/contacto" size="lg">Contanos tu idea</LinkButton>
              <LinkButton href={whatsappLink()} target="_blank" rel="noopener noreferrer" variant="outline" size="lg">
                Escribinos por WhatsApp
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* YA PASARON */}
      {past.length ? (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink/80">Ya pasaron por acá</h2>
          <div className="grid gap-5 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function HeroFlyers({ events }: { events: EventView[] }) {
  return (
    <div className="relative hidden h-[30rem] lg:block" aria-hidden>
      {events.map((e, i) => (
        <Link
          key={e.id}
          href={`/eventos/${e.slug}`}
          tabIndex={-1}
          className={
            "absolute w-64 overflow-hidden rounded-brand border border-line shadow-2xl transition duration-500 hover:z-10 hover:rotate-0 hover:scale-105 " +
            (i === 0 ? "right-28 top-0 rotate-[-6deg]" : "right-0 top-24 rotate-[7deg]")
          }
        >
          <Flyer src={e.flyerUrl} alt="" className="aspect-[4/5] w-full" priority />
        </Link>
      ))}
    </div>
  );
}

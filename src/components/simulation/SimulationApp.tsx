"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sparkle } from "@/components/brand/Logo";
import { Button, LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { AdminTour } from "./AdminTour";
import { ClientTour } from "./ClientTour";
import { PhoneFrame } from "./frame";
import { ADMIN_STEPS, CLIENT_STEPS, type StepMeta } from "./steps";

type Tour = "cliente" | "admin";

const TOURS: Record<Tour, { title: string; subtitle: string; steps: StepMeta[]; emoji: string; includes: string[] }> = {
  cliente: {
    title: "Así compra tu cliente",
    subtitle: "Desde que entra a la web hasta que tiene el QR en el celu.",
    steps: CLIENT_STEPS,
    emoji: "🎟️",
    includes: [
      "Web con la marca: inicio, quiénes somos con galería y contacto con WhatsApp",
      "Eventos con flyer, fecha, lugar y varios tipos de entrada con su cupo",
      "Aviso de “Quedan X” cuando quedan pocas",
      "Compra sin crear cuenta: nombre, mail y DNI",
      "Reserva de 10 minutos que nunca vende de más",
      "Pago con Mercado Pago (débito, crédito en 1 pago, dinero en cuenta)",
      "Mail automático con una entrada QR por persona",
      "Entrada online, con código para ingresar a mano si el QR falla",
    ],
  },
  admin: {
    title: "Así lo manejan ustedes",
    subtitle: "El panel para crear eventos, ver ventas y controlar la puerta.",
    steps: ADMIN_STEPS,
    emoji: "📊",
    includes: [
      "Panel privado, solo para los mails que ustedes elijan",
      "Crear, editar, publicar y despublicar eventos (con flyer)",
      "Tipos de entrada con precio y cupo, sin poder vender de más",
      "Ventas y asistentes con filtros, búsqueda y totales",
      "Exportar a Excel",
      "Cambiar el titular de una entrada y anularla",
      "Consultas del formulario de contacto",
      "Escáner de puerta desde el celu: verde, amarillo y rojo",
    ],
  },
};

const NOT_INCLUDED = [
  "Cola virtual para lanzamientos con mucha demanda",
  "Códigos de descuento o preventas con clave",
  "RRPP, vendedores o varios productores",
  "Pago en cuotas o en efectivo (Rapipago / Pago Fácil)",
  "Cuentas de usuario para compradores",
  "Que el comprador transfiera la entrada por su cuenta (hoy lo hacen ustedes desde el panel)",
  "Devoluciones automáticas (se hacen desde Mercado Pago)",
  "App nativa (funciona desde el navegador del celu)",
];

export function SimulationApp({ now }: { now: number }) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [completed, setCompleted] = useState<Record<Tour, boolean>>({ cliente: false, admin: false });
  const [runId, setRunId] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const stepsBarRef = useRef<HTMLOListElement>(null);

  const meta = tour ? TOURS[tour] : null;
  const steps = meta?.steps ?? [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    frameRef.current?.querySelectorAll<HTMLElement>(".lg\\:overflow-y-auto").forEach((el) => el.scrollTo({ top: 0 }));
    stepsBarRef.current?.querySelector<HTMLElement>("[aria-current=step]")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [tour, step, done]);

  const start = (t: Tour) => {
    setTour(t);
    setStep(0);
    setDone(false);
    setRunId((r) => r + 1);
  };
  const next = () => {
    if (!tour) return;
    if (step < steps.length - 1) setStep(step + 1);
    else {
      setDone(true);
      setCompleted((c) => ({ ...c, [tour]: true }));
    }
  };
  const prev = () => (done ? setDone(false) : setStep((s) => Math.max(0, s - 1)));

  // ─────────── Pantalla inicial ───────────
  if (!tour) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          <Sparkle className="size-3.5" /> Simulación guiada
        </p>
        <h1 className="condensed mt-4 font-display text-[clamp(3rem,10vw,6.5rem)] font-extrabold uppercase leading-[0.85]">
          Mirá cómo <span className="text-primary">funciona</span> todo
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/80">
          Elegí un recorrido y te mostramos paso a paso qué pasa en cada pantalla. Podés tocar, escribir y probar: es una simulación, así que{" "}
          <strong className="text-ink">no se guarda nada, no se cobra nada y no se mandan mails</strong>.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {(Object.keys(TOURS) as Tour[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => start(t)}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-[1.8rem] border border-line bg-surface p-6 text-left transition hover:-translate-y-0.5 hover:border-primary/60 sm:p-8"
            >
              <div aria-hidden className={cn("absolute -right-16 -top-16 size-48 rounded-full blur-3xl", t === "cliente" ? "bg-primary/25" : "bg-violet/25")} />
              <span className="relative text-4xl">{TOURS[t].emoji}</span>
              <span className="relative">
                <span className="block font-display text-3xl font-extrabold leading-tight">{TOURS[t].title}</span>
                <span className="mt-2 block text-ink/70">{TOURS[t].subtitle}</span>
              </span>
              <span className="relative flex flex-wrap gap-1.5">
                {TOURS[t].steps.map((s, i) => (
                  <span key={s.short} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
                    {i + 1}. {s.short}
                  </span>
                ))}
              </span>
              <span className="relative mt-2 inline-flex items-center gap-2 font-semibold text-primary">
                {completed[t] ? "Hacerlo de nuevo" : "Empezar"} · {TOURS[t].steps.length} pasos, unos 2 minutos →
              </span>
              {completed[t] ? <span className="absolute right-5 top-5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-bold text-ok">✓ Hecho</span> : null}
            </button>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          ¿Preferís ver la web real? <Link href="/" className="text-ink underline underline-offset-4">Volvé al inicio</Link>.
        </p>
      </div>
    );
  }

  const other: Tour = tour === "cliente" ? "admin" : "cliente";

  // ─────────── Cierre ───────────
  if (done && meta) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <div className="pop-in flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-ok text-3xl text-bg">✓</span>
          <h1 className="condensed mt-4 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">¡Eso es todo!</h1>
          <p className="mt-3 max-w-lg text-lg text-ink/80">Terminaste “{meta.title}”. Este es el resumen para que nos confirmen si es lo que necesitan.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="rounded-[1.6rem] border border-ok/30 bg-ok/5 p-6">
            <h2 className="font-display text-2xl font-bold">Qué incluye</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {meta.includes.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 text-ok">✓</span>
                  <span className="text-ink/85">{i}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[1.6rem] border border-warn/30 bg-warn/5 p-6">
            <h2 className="font-display text-2xl font-bold">Qué no incluye esta versión</h2>
            <p className="mt-1 text-sm text-muted">Se puede sumar más adelante si lo necesitan. Contanos si algo de esto es imprescindible.</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {NOT_INCLUDED.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 text-warn">—</span>
                  <span className="text-ink/85">{i}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => start(other)}>
            {completed[other] ? "Repasar" : "Ver"} “{TOURS[other].title}” →
          </Button>
          <Button size="lg" variant="outline" onClick={() => setTour(null)}>Volver al inicio de la simulación</Button>
          <LinkButton href="/" size="lg" variant="ghost">Ir a la web</LinkButton>
        </div>
      </div>
    );
  }

  // ─────────── Paso ───────────
  const s = steps[step];
  const pct = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setTour(null)} className="text-sm text-muted hover:text-ink">
          ← Recorridos
        </button>
        <p className="truncate text-sm font-semibold">
          {meta!.emoji} {meta!.title}
        </p>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del recorrido">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol ref={stepsBarRef} className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden" aria-label="Pasos">
        {steps.map((st, i) => (
          <li key={st.short}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                i === step ? "border-primary bg-primary text-primary-ink" : i < step ? "border-primary/40 text-ink" : "border-line text-muted",
              )}
            >
              {i + 1}. {st.short}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div key={`${tour}-${step}`} className="pop-in rounded-[1.6rem] border border-line bg-surface p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Paso {step + 1} de {steps.length}
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{s.title}</h1>
            <p className="mt-3 leading-relaxed text-ink/80">{s.what}</p>
            <div className="mt-4 flex gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
              <span className="text-xl" aria-hidden>👉</span>
              <p className="font-semibold text-ink">{s.todo}</p>
            </div>
          </div>
          <ol className="hidden flex-col gap-1 lg:flex" aria-label="Pasos">
            {steps.map((st, i) => (
              <li key={st.short}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left text-sm transition",
                    i === step ? "bg-primary/15 font-semibold text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                      i === step ? "bg-primary text-primary-ink" : i < step ? "bg-primary/25 text-ink" : "bg-white/10",
                    )}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  {st.title}
                </button>
              </li>
            ))}
          </ol>
          <div className="hidden gap-3 lg:flex">
            <Button variant="outline" onClick={prev} disabled={step === 0}>← Anterior</Button>
            <Button onClick={next} className="flex-1">{step === steps.length - 1 ? "Terminar" : "Siguiente →"}</Button>
          </div>
        </aside>

        <div ref={frameRef}>
          <PhoneFrame label={s.frame} tone={tour === "cliente" && step === 4 ? "mp" : tour === "cliente" && step === 5 ? "mail" : "web"}>
            {tour === "cliente" ? (
              <ClientTour key={`c-${runId}`} step={step} onNext={next} now={now} />
            ) : (
              <AdminTour key={`a-${runId}`} step={step} onNext={next} now={now} />
            )}
          </PhoneFrame>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-line bg-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <Button variant="outline" onClick={prev} disabled={step === 0}>←</Button>
        <Button onClick={next} className="flex-1">{step === steps.length - 1 ? "Terminar ✓" : "Siguiente →"}</Button>
      </div>
    </div>
  );
}

"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { BuyerFields, type BuyerValues } from "@/components/checkout/BuyerFields";
import { Countdown } from "@/components/checkout/Countdown";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { EventCard } from "@/components/events/EventCard";
import { Flyer } from "@/components/events/Flyer";
import { TicketSelector, selectionTotal, type Selection } from "@/components/events/TicketSelector";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { renderTicketsEmail } from "@/lib/email/template";
import { formatDateLong, formatMoney, formatTime } from "@/lib/format";
import { buyerSchema, zodFieldErrors } from "@/lib/validation";
import { clientEvents } from "./data";
import { Bubble, MockSiteHeader, Spotlight } from "./frame";

const SIM_CODES = ["K7M-Q9PX-3RT", "8GD-GTAY-GRP", "38X-FM65-HKR", "B4B-QTWB-B9R", "FY8-BKR5-8SZ"];

export function ClientTour({ step, onNext, now }: { step: number; onNext: () => void; now: number }) {
  const events = useMemo(() => clientEvents(now), [now]);
  const event = events[0];
  const [selection, setSelection] = useState<Selection>({});
  const [buyer, setBuyer] = useState<BuyerValues>({ name: "Sofía Martínez", email: "sofi.martinez@example.com", dni: "38456789" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [mpState, setMpState] = useState<"idle" | "processing" | "approved">("idle");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrPng, setQrPng] = useState<string>("");

  // Si saltean pasos, completamos lo que falte con algo razonable.
  const effectiveSelection = selectionTotal(event.ticketTypes, selection).qty > 0 ? selection : { "sim-anticipada": 2 };
  const lines = event.ticketTypes
    .filter((t) => (effectiveSelection[t.id] ?? 0) > 0)
    .map((t) => ({ name: t.name, quantity: effectiveSelection[t.id], unitPrice: t.price }));
  const tickets = lines.flatMap((l) =>
    Array.from({ length: l.quantity }, () => ({ type: l.name })),
  ).map((t, i) => ({ ...t, code: SIM_CODES[i % SIM_CODES.length], holder: buyer.name || "Sofía Martínez" }));
  const total = lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);

  useEffect(() => {
    if (step === 3 && !expiresAt) setExpiresAt(new Date(Date.now() + brand.reservationMinutes * 60_000).toISOString());
  }, [step, expiresAt]);

  useEffect(() => {
    const text = "SIMULACION · Algo Lindo · entrada de prueba (no válida)";
    QRCode.toString(text, { type: "svg", margin: 1, color: { dark: "#0d0a0f", light: "#ffffff" } }).then(setQrSvg);
    QRCode.toDataURL(text, { margin: 1, width: 360 }).then(setQrPng);
  }, []);

  const emailHtml = useMemo(() => {
    if (!qrPng) return "";
    return renderTicketsEmail({
      buyerName: buyer.name || "Sofía Martínez",
      eventName: event.name,
      startsAt: event.startsAt,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      total,
      orderUrl: "#",
      tickets: tickets.map((t) => ({ code: t.code, holderName: t.holder, ticketTypeName: t.type, url: "#", qrSrc: qrPng })),
    }).html;
  }, [qrPng, buyer.name, event, total, tickets]);

  switch (step) {
    case 0:
      return (
        <div>
          <MockSiteHeader />
          <div className="px-4 pb-6 pt-6">
            <h2 className="condensed font-display text-5xl font-extrabold uppercase leading-[0.85]">
              Noches <span className="text-primary">que quedan</span> lindas.
            </h2>
            <p className="mt-3 text-sm text-ink/70">{brand.heroSubtitle}</p>
            <h3 className="mb-3 mt-8 font-display text-2xl font-extrabold">Próximos eventos</h3>
            <div className="flex flex-col gap-10 pt-6">
              <Spotlight label="Tocá este evento 👇" className="rounded-brand">
                <EventCard event={events[0]} onSelect={onNext} className="w-full" />
              </Spotlight>
              <EventCard event={events[1]} onSelect={() => {}} className="w-full opacity-60" />
            </div>
          </div>
        </div>
      );

    case 1: {
      const { qty, amount } = selectionTotal(event.ticketTypes, selection);
      return (
        <div>
          <MockSiteHeader />
          <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
            <Flyer src={event.flyerUrl} alt="" className="aspect-[4/5] w-full rounded-2xl" />
            <h2 className="condensed font-display text-4xl font-extrabold uppercase leading-[0.9]">{event.name}</h2>
            <p className="text-sm text-muted">
              {formatDateLong(event.startsAt)} · {formatTime(event.startsAt)} hs · {event.venueName}
            </p>
            <Bubble>Fijate que “Anticipada” dice <strong>Quedan 7</strong>: se muestra cuando quedan 20 o menos.</Bubble>
            <TicketSelector ticketTypes={event.ticketTypes} value={selection} onChange={setSelection} />
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 pl-4">
              <div>
                <p className="text-xs text-muted">{qty ? `${qty} entradas` : "Elegí tus entradas"}</p>
                <p className="font-display text-2xl font-bold">{formatMoney(amount)}</p>
              </div>
              <Spotlight active={qty > 0} label="¡Ahora tocá Comprar!" className="rounded-full">
                <Button size="lg" disabled={qty === 0} onClick={onNext}>Comprar</Button>
              </Spotlight>
            </div>
          </div>
        </div>
      );
    }

    case 2:
      return (
        <div>
          <MockSiteHeader />
          <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Paso 2 de 3</p>
            <h2 className="-mt-3 font-display text-3xl font-extrabold">Tus datos</h2>
            <OrderSummary event={event} lines={lines} />
            <form
              className="flex flex-col gap-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const r = buyerSchema.safeParse(buyer);
                if (!r.success) return setErrors(zodFieldErrors(r.error));
                setErrors({});
                onNext();
              }}
            >
              <BuyerFields values={buyer} errors={errors} onChange={(f, v) => setBuyer((b) => ({ ...b, [f]: v }))} />
              <Spotlight label="Tocá acá cuando esté todo bien" position="bottom" className="rounded-full">
                <Button type="submit" size="lg" className="w-full">Reservar y pagar</Button>
              </Spotlight>
            </form>
            <Bubble className="mt-6">Probá borrar el mail o poner un DNI con letras: vas a ver cómo le avisamos.</Bubble>
          </div>
        </div>
      );

    case 3:
      return (
        <div>
          <MockSiteHeader />
          <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Paso 3 de 3</p>
            <h2 className="-mt-3 font-display text-3xl font-extrabold">¡Entradas reservadas!</h2>
            {expiresAt ? <Countdown expiresAt={expiresAt} /> : null}
            <OrderSummary event={event} lines={lines} />
            <Spotlight label="Tocá para pagar" className="rounded-full">
              <Button size="lg" className="w-full" onClick={onNext}>Pagar con Mercado Pago</Button>
            </Spotlight>
          </div>
        </div>
      );

    case 4:
      return (
        <div className="min-h-full text-[#1b1b1f]">
          <div className="flex h-14 items-center justify-between bg-[#2d3277] px-4 text-white">
            <span className="text-sm font-semibold">Checkout de Mercado Pago</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">Simulado</span>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#6b6b76]">Estás pagando a</p>
              <p className="font-semibold">{brand.name}</p>
              <p className="mt-3 text-xs text-[#6b6b76]">{lines.map((l) => `${l.quantity} × ${event.name} — ${l.name}`).join(" · ")}</p>
              <p className="mt-1 text-3xl font-bold">{formatMoney(total)}</p>
            </div>
            <p className="px-1 text-sm font-semibold">¿Cómo querés pagar?</p>
            {[
              ["Tarjeta de débito", "Visa terminada en 4242", true],
              ["Tarjeta de crédito", "en 1 pago", false],
              ["Dinero en cuenta", "Saldo disponible", false],
            ].map(([t, s, sel]) => (
              <div key={String(t)} className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${sel ? "border-[#2d3277] ring-1 ring-[#2d3277]" : "border-[#e2e2e8]"}`}>
                <span className={`size-4 rounded-full border-2 ${sel ? "border-[#2d3277] bg-[#2d3277]" : "border-[#b9b9c3]"}`} />
                <div>
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="text-xs text-[#6b6b76]">{s}</p>
                </div>
              </div>
            ))}
            {mpState === "approved" ? (
              <div className="pop-in rounded-xl bg-[#e7f8ef] p-4 text-center text-[#0b6b3a]">
                <p className="text-lg font-bold">¡Listo! Pago aprobado</p>
                <p className="text-sm">Volviendo a {brand.name}…</p>
              </div>
            ) : (
              <Spotlight label="Tocá Pagar" className="rounded-xl">
                <button
                  type="button"
                  disabled={mpState === "processing"}
                  onClick={() => {
                    setMpState("processing");
                    setTimeout(() => setMpState("approved"), 1100);
                    setTimeout(onNext, 2300);
                  }}
                  className="h-12 w-full rounded-xl bg-[#2d3277] font-semibold text-white transition active:scale-[0.99] disabled:opacity-70"
                >
                  {mpState === "processing" ? "Procesando pago…" : `Pagar ${formatMoney(total)}`}
                </button>
              </Spotlight>
            )}
            <p className="text-center text-xs text-[#6b6b76]">Pantalla simulada para la demo. En la versión real esto lo muestra Mercado Pago.</p>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="flex min-h-full flex-col bg-white text-[#1b1b1f]">
          <div className="border-b border-[#ececf1] px-4 py-3">
            <p className="text-xs text-[#6b6b76]">Bandeja de entrada · ahora</p>
            <p className="mt-1 text-sm">
              <strong>{brand.name}</strong> <span className="text-[#6b6b76]">&lt;entradas@algolindo.com.ar&gt;</span>
            </p>
            <p className="text-sm font-semibold">
              ¡Listo! Tus {tickets.length} entradas para {event.name} 🎉
            </p>
          </div>
          {emailHtml ? (
            <iframe
              title="Mail con las entradas"
              srcDoc={emailHtml}
              // sin scripts; allow-same-origin solo para medir el alto del contenido
              sandbox="allow-same-origin"
              className="block w-full border-0"
              style={{ height: 1300 }}
              onLoad={(e) => {
                const doc = e.currentTarget.contentDocument;
                if (doc) e.currentTarget.style.height = `${doc.documentElement.scrollHeight + 8}px`;
              }}
            />
          ) : (
            <p className="p-6 text-sm text-[#6b6b76]">Cargando mail…</p>
          )}
        </div>
      );

    case 6:
    default:
      return (
        <div className="px-4 py-8">
          <TicketCard
            eventName={event.name}
            startsAt={event.startsAt}
            venueName={event.venueName}
            venueAddress={event.venueAddress}
            ticketTypeName={tickets[0]?.type ?? "Anticipada"}
            holderName={tickets[0]?.holder ?? "Sofía Martínez"}
            code={tickets[0]?.code ?? SIM_CODES[0]}
            status="valid"
            qrSvg={qrSvg}
          />
          <Bubble className="mt-6">
            El código <strong className="font-mono">{tickets[0]?.code ?? SIM_CODES[0]}</strong> sirve si el QR no se puede leer: en la puerta lo tipean a mano.
          </Bubble>
        </div>
      );
  }
}

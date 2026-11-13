"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminNavView, type AdminSection } from "@/components/admin/AdminNav";
import { ContactMessageCard } from "@/components/admin/ContactMessageCard";
import { EventForm, emptyEventValues, newTypeKey, type EventFormValues } from "@/components/admin/EventForm";
import { EventStatsCard, StatCard } from "@/components/admin/EventStatsCard";
import { SalesFilters, type SalesFilterValue } from "@/components/admin/SalesFilters";
import { AttendeesList, OrdersList } from "@/components/admin/SalesLists";
import { ScanResultScreen, type ScanResultKind } from "@/components/admin/ScanResultScreen";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { TicketAdminRow } from "@/components/admin/TicketAdminRow";
import { Logo, Sparkle } from "@/components/brand/Logo";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { toCsv } from "@/lib/csv";
import { formatDateTime, formatMoney, fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { slugify } from "@/lib/validation";
import { adminData, simEventStats, simEventToView, type AdminSimData, type SimEvent } from "./data";
import { Bubble, MockSiteHeader, Spotlight } from "./frame";

function AdminScreen({ title, active, children, badges }: { title: string; active: AdminSection; children: React.ReactNode; badges?: Partial<Record<AdminSection, number>> }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
        <Logo size="sm" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">Panel</span>
      </div>
      <div className="flex-1 px-4 pb-6 pt-5">
        <h2 className="mb-4 font-display text-3xl font-extrabold">{title}</h2>
        {children}
      </div>
      <div className="sticky bottom-0 z-20">
        <AdminNavView active={active} badges={badges} onSelect={() => {}} embedded />
      </div>
    </div>
  );
}

const EXAMPLE_FLYER = "/seed/flyers/karaoke-disco-inferno.svg";

function exampleValues(now: number): EventFormValues {
  const d = new Date(now + 35 * 86_400_000);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  const startsAt = toLocalInputValue(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 22 + 3 - 24) + 86_400_000));
  return {
    name: "Karaoke Disco Inferno",
    slug: "karaoke-disco-inferno",
    description: "Una noche para cantar a los gritos los hits de los 70 y 80. Pelucas y brillos bienvenidos.",
    startsAt,
    venueName: "Bar Uriarte",
    venueAddress: "Uriarte 1572, Palermo",
    publish: false,
    flyerUrl: EXAMPLE_FLYER,
    ticketTypes: [
      { key: newTypeKey(), name: "General", price: "8000", capacity: "60" },
      { key: newTypeKey(), name: "VIP con trago", price: "14000", capacity: "20" },
    ],
  };
}

function formToSimEvent(v: EventFormValues, flyerUrl: string | null, id: string): SimEvent {
  return {
    id,
    slug: v.slug || slugify(v.name),
    name: v.name,
    description: v.description,
    startsAt: fromLocalInputValue(v.startsAt),
    venueName: v.venueName,
    venueAddress: v.venueAddress,
    flyerUrl,
    isPublished: v.publish,
    isNew: true,
    ticketTypes: v.ticketTypes.map((t, i) => ({ id: `${id}-t${i}`, name: t.name, price: Number(t.price), capacity: Number(t.capacity), used: 0 })),
  };
}

type ScanState = { result: ScanResultKind; holderName?: string; ticketTypeName?: string; usedAt?: string | null } | null;

export function AdminTour({ step, onNext, now }: { step: number; onNext: () => void; now: number }) {
  const [data, setData] = useState<AdminSimData>(() => adminData(now));
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState("empty");
  const [formInitial, setFormInitial] = useState<EventFormValues>(() => emptyEventValues());
  const [editSaved, setEditSaved] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [filters, setFilters] = useState<SalesFilterValue>({ view: "ordenes", eventId: "", status: "", q: "" });
  const [exported, setExported] = useState(false);
  const [scan, setScan] = useState<ScanState>(null);
  const webPreviewRef = useRef<HTMLDivElement>(null);

  const created = data.events.find((e) => e.id === createdId) ?? null;

  // Si saltearon "Crear", al llegar a "Publicar" cargamos el evento de ejemplo.
  useEffect(() => {
    if (step === 2 && !createdId) {
      const id = "ev-nuevo";
      const ev = formToSimEvent(exampleValues(now), EXAMPLE_FLYER, id);
      setData((d) => ({ ...d, events: [...d.events, ev] }));
      setCreatedId(id);
    }
  }, [step, createdId, now]);

  const eventName = (id: string) => data.events.find((e) => e.id === id)?.name ?? "";
  const unread = data.messages.filter((m) => !m.isRead).length;
  const badges = { consultas: unread };

  // ───── ventas (filtrado en memoria) ─────
  const q = filters.q.trim().toLowerCase();
  const matches = (...fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q));
  const orderStatus = (id: string) => data.orders.find((o) => o.id === id)!;
  const orderRows = data.orders
    .filter((o) => (!filters.eventId || o.eventId === filters.eventId) && (!filters.status || o.status === filters.status))
    .filter((o) => matches(o.buyerName, o.buyerEmail, o.buyerDni, ...data.tickets.filter((t) => t.orderId === o.id).map((t) => t.code)))
    .map((o) => {
      const ts = data.tickets.filter((t) => t.orderId === o.id);
      return {
        id: o.id,
        eventName: eventName(o.eventId),
        buyerName: o.buyerName,
        buyerEmail: o.buyerEmail,
        buyerDni: o.buyerDni,
        status: o.status,
        total: ts.reduce((a, t) => a + t.price, 0) || 12000,
        quantity: ts.length || 1,
        createdAt: o.createdAt,
      };
    });
  const attendeeRows = data.tickets
    .filter((t) => (!filters.eventId || t.eventId === filters.eventId) && (filters.view !== "asistentes" || !filters.status || t.status === filters.status))
    .filter((t) => {
      const o = orderStatus(t.orderId);
      return matches(t.holderName, o.buyerName, o.buyerEmail, o.buyerDni, t.code);
    })
    .map((t) => {
      const o = orderStatus(t.orderId);
      return { ...t, eventName: eventName(t.eventId), buyerName: o.buyerName, buyerDni: o.buyerDni, buyerEmail: o.buyerEmail };
    });
  const totals = useMemo(() => {
    const valid = data.tickets.filter((t) => t.status !== "void" && (!filters.eventId || t.eventId === filters.eventId));
    return { tickets: valid.length, revenue: valid.reduce((a, t) => a + t.price, 0) };
  }, [data.tickets, filters.eventId]);
  const eventOptions = data.events.map((e) => ({ id: e.id, name: e.name }));

  const downloadCsv = () => {
    const csv = toCsv(
      ["Evento", "Tipo de entrada", "Precio", "Titular", "Comprador", "Mail", "DNI", "Código", "Estado"],
      attendeeRows.map((r) => [r.eventName, r.ticketTypeName, r.price, r.holderName, r.buyerName, r.buyerEmail, r.buyerDni, r.code, { valid: "Válida", used: "Usada", void: "Anulada" }[r.status]]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "algo-lindo-asistentes-SIMULACION.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };

  switch (step) {
    case 0:
      return (
        <div className="flex min-h-full flex-col justify-center px-5 py-10">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="rounded-[1.6rem] border border-line bg-surface p-5">
            <h2 className="font-display text-3xl font-extrabold">Panel</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Solo para el equipo de Algo Lindo.</p>
            <div className="flex flex-col gap-4">
              <Field label="Mail" htmlFor="sim-mail">
                <input id="sim-mail" className={inputClass} defaultValue="vos@algolindo.com.ar" />
              </Field>
              <Field label="Contraseña" htmlFor="sim-pass">
                <input id="sim-pass" type="password" className={inputClass} defaultValue="contraseña-de-prueba" />
              </Field>
              <Spotlight label="Tocá Entrar" position="bottom" className="mt-2 rounded-full">
                <Button size="lg" className="w-full" onClick={onNext}>Entrar</Button>
              </Spotlight>
            </div>
          </div>
          <Bubble className="mt-6">Si alguien que no está en la lista intenta entrar, no puede, aunque adivine la contraseña.</Bubble>
        </div>
      );

    case 1:
      return (
        <AdminScreen title="Nuevo evento" active="eventos" badges={badges}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="accent"
              onClick={() => {
                setFormInitial(exampleValues(now));
                setFormKey(`ex-${Date.now()}`);
              }}
            >
              <Sparkle className="size-4" /> Completar con un ejemplo
            </Button>
            <span className="text-xs text-muted">o escribí lo que quieras</span>
          </div>
          <EventForm
            key={formKey}
            initial={formInitial}
            isNew
            submitLabel="Crear evento"
            highlight={formKey === "empty" ? "name" : "submit"}
            onSubmit={(values, flyer) => {
              const id = `ev-nuevo-${Date.now()}`;
              const ev = formToSimEvent(values, flyer ? URL.createObjectURL(flyer) : values.flyerUrl ?? null, id);
              setData((d) => ({ ...d, events: [...d.events.filter((e) => e.id !== createdId), ev] }));
              setCreatedId(id);
              onNext();
            }}
          />
        </AdminScreen>
      );

    case 2: {
      // El recién publicado va primero para que se vea sin buscarlo.
      const published = data.events
        .filter((e) => e.isPublished)
        .sort((a, b) => (a.id === createdId ? -1 : b.id === createdId ? 1 : a.startsAt.localeCompare(b.startsAt)));
      return (
        <div>
          <AdminScreen title="Eventos" active="eventos" badges={badges}>
            {created ? (
              <Bubble className="mb-4">
                ¡“{created.name}” quedó creado! {created.isPublished ? "Ya está publicado: bajá y mirá cómo aparece en la web 👇" : "Está como borrador: todavía no se ve en la web."}
              </Bubble>
            ) : null}
            <div className="flex flex-col gap-3">
              {[...data.events].reverse().map((e) => (
                <EventStatsCard
                  key={e.id}
                  e={simEventStats(e)}
                  actions={
                    <Spotlight active={e.id === createdId && !e.isPublished} label="Tocá Publicar" position="bottom" className="rounded-full">
                      <button
                        type="button"
                        onClick={() => {
                          setData((d) => ({ ...d, events: d.events.map((x) => (x.id === e.id ? { ...x, isPublished: !x.isPublished } : x)) }));
                          // Al publicar, bajamos hasta "la web" para que se vea aparecer.
                          if (!e.isPublished) setTimeout(() => webPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
                        }}
                        className={"h-9 rounded-full px-4 text-sm font-semibold " + (e.isPublished ? "text-muted hover:text-ink" : "bg-accent text-accent-ink")}
                      >
                        {e.isPublished ? "Despublicar" : "Publicar"}
                      </button>
                    </Spotlight>
                  }
                />
              ))}
            </div>
          </AdminScreen>
          <div ref={webPreviewRef} className="border-t-4 border-dashed border-accent/40">
            <p className="bg-accent/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-accent">Mientras tanto, en la web…</p>
            <MockSiteHeader />
            <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
              <h3 className="font-display text-2xl font-extrabold">Próximos eventos</h3>
              {published.map((e) => (
                <div key={e.id} className="relative">
                  {e.id === createdId ? (
                    <span className="pop-in absolute -top-3 left-3 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">¡Recién publicado!</span>
                  ) : null}
                  <EventCard event={simEventToView(e)} onSelect={() => {}} className={e.id === createdId ? "pop-in w-full ring-2 ring-accent" : "w-full"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 3: {
      const ev = data.events.find((e) => e.id === "ev-vinilos")!;
      return (
        <AdminScreen title="Editar evento" active="eventos" badges={badges}>
          {editSaved ? (
            <Bubble className="mb-4">
              ¡Cambios guardados! Ahora el cupo de Anticipada es {ev.ticketTypes[0].capacity} y cuesta {formatMoney(ev.ticketTypes[0].price)}. Los que ya compraron pagaron el precio anterior.
            </Bubble>
          ) : null}
          <EventForm
            key={`edit-${editVersion}`}
            isNew={false}
            submitLabel="Guardar cambios"
            highlight="capacity"
            initial={{
              id: ev.id,
              name: ev.name,
              slug: ev.slug,
              description: ev.description,
              startsAt: toLocalInputValue(ev.startsAt),
              venueName: ev.venueName,
              venueAddress: ev.venueAddress,
              publish: ev.isPublished,
              flyerUrl: ev.flyerUrl,
              ticketTypes: ev.ticketTypes.map((t) => ({ key: t.id, id: t.id, name: t.name, price: String(t.price), capacity: String(t.capacity), used: t.used })),
            }}
            onSubmit={(values) => {
              for (const t of values.ticketTypes) {
                if (t.used !== undefined && Number(t.capacity) < t.used) {
                  return { error: `El cupo de "${t.name}" no puede ser menor a ${t.used} (vendidas + reservadas).` };
                }
              }
              setData((d) => ({
                ...d,
                events: d.events.map((x) =>
                  x.id === ev.id
                    ? {
                        ...x,
                        name: values.name,
                        venueName: values.venueName,
                        ticketTypes: values.ticketTypes.map((t, i) => ({
                          id: t.id ?? `${ev.id}-new-${i}`,
                          name: t.name,
                          price: Number(t.price),
                          capacity: Number(t.capacity),
                          used: t.used ?? 0,
                        })),
                      }
                    : x,
                ),
              }));
              setEditSaved(true);
              setEditVersion((v) => v + 1);
            }}
          />
        </AdminScreen>
      );
    }

    case 4:
    case 5:
      return (
        <AdminScreen title="Ventas" active="ventas" badges={badges}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <StatCard label="Vendidas" value={String(totals.tickets)} tone="primary" />
            <StatCard label="Recaudado" value={formatMoney(totals.revenue)} />
          </div>
          {step === 5 ? (
            <div className="mb-4 flex flex-col gap-3">
              <Spotlight label="Tocá para descargar" position="top" className="rounded-full">
                <Button variant="outline" className="w-full" onClick={downloadCsv}>⬇ Exportar a Excel (CSV)</Button>
              </Spotlight>
              {exported ? (
                <>
                  <Bubble>Se descargó “algo-lindo-asistentes-SIMULACION.csv”. Así se ve al abrirlo en Excel:</Bubble>
                  <div className="overflow-x-auto rounded-xl border border-[#d0d0d6] bg-white text-[0.7rem] text-[#1b1b1f]">
                    <table className="w-max border-collapse">
                      <thead>
                        <tr className="bg-[#e8efe9]">
                          {["", "A Evento", "B Tipo", "C Titular", "D DNI", "E Código", "F Estado"].map((h) => (
                            <th key={h} className="border border-[#d0d0d6] px-2 py-1 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attendeeRows.slice(0, 6).map((r, i) => (
                          <tr key={r.id}>
                            <td className="border border-[#d0d0d6] bg-[#f3f3f5] px-2 py-1 text-center">{i + 2}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1">{r.eventName}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1">{r.ticketTypeName}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1">{r.holderName}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1">{r.buyerDni}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1 font-mono">{r.code}</td>
                            <td className="border border-[#d0d0d6] px-2 py-1">{{ valid: "Válida", used: "Usada", void: "Anulada" }[r.status]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <div className="mb-4">
            <SalesFilters value={filters} events={eventOptions} onChange={setFilters} highlightSearch={step === 4 && !filters.q} />
          </div>
          {filters.view === "ordenes" ? <OrdersList rows={orderRows} onOpen={() => {}} /> : <AttendeesList rows={attendeeRows} />}
        </AdminScreen>
      );

    case 6: {
      const order = data.orders[0];
      const ts = data.tickets.filter((t) => t.orderId === order.id);
      const renamed = ts[0]?.holderName !== order.buyerName;
      const update = (id: string, patch: Partial<(typeof ts)[number]>) =>
        setData((d) => ({ ...d, tickets: d.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      return (
        <AdminScreen title={order.buyerName} active="ventas" badges={badges}>
          <div className="-mt-2 mb-4 flex items-center gap-2 text-sm text-muted">
            <OrderStatusBadge status="paid" /> {eventName(order.eventId)} · DNI {order.buyerDni}
          </div>
          <div className="flex flex-col gap-3">
            {ts.map((t, i) => (
              <TicketAdminRow
                key={t.id}
                ticket={t}
                highlight={i === 0 && !renamed ? "rename" : i === 1 && renamed && t.status !== "void" ? "void" : undefined}
                onRename={(id, name) => update(id, { holderName: name })}
                onVoid={(id) => update(id, { status: "void" })}
              />
            ))}
          </div>
          {renamed ? <Bubble className="mt-4">¡Listo! La entrada ahora está a nombre de {ts[0].holderName}. El QR es el mismo, así que Sofía se lo puede reenviar.</Bubble> : null}
          {ts.some((t) => t.status === "void") ? (
            <Bubble className="mt-3">Entrada anulada: si alguien intenta usarla, el escáner la marca en rojo. Acordate de devolver la plata desde Mercado Pago.</Bubble>
          ) : null}
        </AdminScreen>
      );
    }

    case 7:
      return (
        <AdminScreen title="Consultas" active="consultas" badges={badges}>
          <p className="-mt-2 mb-4 text-sm text-muted">{unread ? `${unread} sin leer` : "Estás al día ✨"}</p>
          <div className="flex flex-col gap-3">
            {data.messages.map((m) => (
              <ContactMessageCard
                key={m.id}
                m={m}
                highlight={!m.isRead}
                readToggle={
                  <button
                    type="button"
                    className="ml-auto h-9 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink"
                    onClick={() => setData((d) => ({ ...d, messages: d.messages.map((x) => (x.id === m.id ? { ...x, isRead: !x.isRead } : x)) }))}
                  >
                    {m.isRead ? "Marcar como no leída" : "Marcar como leída ✓"}
                  </button>
                }
              />
            ))}
          </div>
        </AdminScreen>
      );

    case 8:
    default: {
      const sofia = data.tickets[0];
      const voided = data.tickets.find((t) => t.status === "void" && t.id !== sofia.id) ?? data.tickets.find((t) => t.status === "void");
      const cumbiaOrVinilos = data.tickets.filter((t) => t.eventId === sofia.eventId && t.status !== "void");
      const usedCount = cumbiaOrVinilos.filter((t) => t.status === "used").length + 64;
      const doScan = (kind: "sofia" | "void" | "fake") => {
        if (kind === "fake") return setScan({ result: "invalid" });
        if (kind === "void") return setScan({ result: "void", holderName: voided?.holderName, ticketTypeName: voided?.ticketTypeName });
        const t = data.tickets.find((x) => x.id === sofia.id)!;
        if (t.status === "void") return setScan({ result: "void", holderName: t.holderName, ticketTypeName: t.ticketTypeName });
        if (t.status === "used") return setScan({ result: "used", holderName: t.holderName, ticketTypeName: t.ticketTypeName, usedAt: t.usedAt });
        const usedAt = new Date().toISOString();
        setData((d) => ({ ...d, tickets: d.tickets.map((x) => (x.id === t.id ? { ...x, status: "used", usedAt } : x)) }));
        setScan({ result: "ok", holderName: t.holderName, ticketTypeName: t.ticketTypeName });
      };
      return (
        <AdminScreen title="Escáner de puerta" active="escaner" badges={badges}>
          <div className="mb-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
            {eventName(sofia.eventId)} · Ingresaron <strong className="font-display text-lg">{usedCount}</strong> de {cumbiaOrVinilos.length + 108}
          </div>
          <div className="relative mb-4 aspect-square overflow-hidden rounded-[1.6rem] border border-line bg-[radial-gradient(circle_at_50%_40%,#2a2233,#08060a)]">
            <div className="absolute inset-[18%] rounded-2xl border-[3px] border-dashed border-accent/60" />
            <div className="absolute inset-x-[18%] top-1/2 h-0.5 animate-pulse bg-accent shadow-[0_0_20px_var(--brand-accent)]" />
            <p className="absolute inset-x-0 bottom-4 text-center text-xs text-ink/60">Apuntá la cámara al QR</p>
            {scan ? (
              <div className="absolute inset-0 z-10 flex">
                <ScanResultScreen {...scan} onDismiss={() => setScan(null)} className="flex-1 [&_.text-6xl]:text-5xl" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Spotlight active={!scan && sofia.status === "valid"} label="Empezá por acá" className="rounded-full">
              <button type="button" className="h-11 w-full rounded-full bg-ok px-5 font-semibold text-[#04140c] transition active:scale-[0.98]" onClick={() => doScan("sofia")}>
                Escanear la entrada de {sofia.holderName.split(" ")[0]}
              </button>
            </Spotlight>
            <Button variant="outline" className="w-full border-danger/50 text-danger" onClick={() => doScan("void")}>Escanear una entrada anulada</Button>
            <Button variant="outline" className="w-full" onClick={() => doScan("fake")}>Escanear un QR trucho</Button>
          </div>
          {sofia.status === "used" && !scan ? (
            <Bubble className="mt-4">Ahora escaneá la de {sofia.holderName.split(" ")[0]} otra vez: vas a ver el amarillo con la hora en que entró.</Bubble>
          ) : null}
          <p className="mt-4 text-center text-xs text-muted">
            {scan ? `Último escaneo: ${formatDateTime(new Date().toISOString())}` : "En la versión real se usa la cámara del celu."}
          </p>
        </AdminScreen>
      );
    }
  }
}

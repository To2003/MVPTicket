"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { slugify } from "@/lib/validation";
import { newTypeKey, type EventFormValues, type TicketTypeDraft } from "./event-form-values";

export { emptyEventValues, newTypeKey, type EventFormValues, type TicketTypeDraft } from "./event-form-values";

/**
 * Formulario de evento (crear / editar). Lo usa el panel real y la simulación:
 * `onSubmit` recibe los valores y el archivo del flyer, y devuelve un error si algo falló.
 */
export function EventForm({
  initial,
  onSubmit,
  submitLabel,
  isNew,
  highlight,
}: {
  initial: EventFormValues;
  onSubmit: (values: EventFormValues, flyer: File | null) => Promise<{ error?: string } | void> | { error?: string } | void;
  submitLabel: string;
  isNew: boolean;
  /** Para la simulación: resalta un campo. */
  highlight?: "name" | "types" | "submit" | "capacity";
}) {
  const [v, setV] = useState<EventFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [flyer, setFlyer] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.flyerUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    if (!flyer) return;
    const url = URL.createObjectURL(flyer);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [flyer]);

  const set = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) => setV((prev) => ({ ...prev, [k]: val }));
  const setType = (key: string, patch: Partial<TicketTypeDraft>) =>
    setV((prev) => ({ ...prev, ticketTypes: prev.ticketTypes.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!v.name.trim() || !v.startsAt || !v.venueName.trim()) {
      setError("Completá nombre, fecha y hora, y lugar.");
      return;
    }
    if (v.ticketTypes.some((t) => !t.name.trim() || !t.price || t.capacity === "")) {
      setError("Cada tipo de entrada necesita nombre, precio y cupo.");
      return;
    }
    setPending(true);
    try {
      const res = await onSubmit(v, flyer);
      if (res && res.error) setError(res.error);
    } catch (err) {
      // redirect() de Next viaja como excepción: la dejamos pasar.
      if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  };

  const spot = (key: typeof highlight) => (highlight === key ? "sim-spotlight rounded-2xl ring-2 ring-accent" : "");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6 md:grid-cols-[1fr_180px]">
        <div className="flex flex-col gap-4">
          <div className={cn(spot("name"), "p-0.5")}>
            <Field label="Nombre del evento" htmlFor={`${uid}-name`}>
              <input
                id={`${uid}-name`}
                className={inputClass}
                value={v.name}
                placeholder="Ej: Noche de Vinilos & Vermú"
                onChange={(e) => {
                  const name = e.target.value;
                  setV((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
                }}
              />
            </Field>
          </div>
          <Field label="Dirección web" htmlFor={`${uid}-slug`} hint={`algolindo.com.ar/eventos/${v.slug || "…"}`}>
            <input
              id={`${uid}-slug`}
              className={inputClass}
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha y hora" htmlFor={`${uid}-date`} hint="Hora de Argentina">
              <input id={`${uid}-date`} type="datetime-local" className={inputClass} value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </Field>
            <Field label="Lugar" htmlFor={`${uid}-venue`}>
              <input id={`${uid}-venue`} className={inputClass} value={v.venueName} placeholder="Ej: Terraza Konex" onChange={(e) => set("venueName", e.target.value)} />
            </Field>
          </div>
          <Field label="Dirección" htmlFor={`${uid}-addr`} hint="Opcional. Aparece con link a Google Maps">
            <input id={`${uid}-addr`} className={inputClass} value={v.venueAddress} placeholder="Calle 123, Barrio, CABA" onChange={(e) => set("venueAddress", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Flyer</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2/60 text-center text-sm text-muted transition hover:border-primary"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vista previa del flyer" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="px-3">Tocá para subir el flyer (JPG, PNG o WEBP, hasta 5 MB)</span>
            )}
            {preview ? (
              <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 py-1 text-xs text-ink opacity-0 transition group-hover:opacity-100">Cambiar</span>
            ) : null}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setFlyer(e.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <Field label="Descripción" htmlFor={`${uid}-desc`} hint="Contá de qué se trata: música, horarios, si hay barra, edad mínima…">
          <textarea id={`${uid}-desc`} rows={5} className={inputClass} value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </section>

      <section className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-6", spot("types"))}>
        <div>
          <h2 className="font-display text-xl font-bold">Tipos de entrada</h2>
          <p className="text-sm text-muted">Cada tipo tiene su precio y su cupo. Ej: Anticipada y General.</p>
        </div>
        {v.ticketTypes.map((t, i) => {
          const price = Number(t.price);
          return (
            <div key={t.key} className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
              <Field label="Nombre" htmlFor={`${uid}-tn-${i}`} className="col-span-2 sm:col-span-1">
                <input id={`${uid}-tn-${i}`} className={inputClass} value={t.name} onChange={(e) => setType(t.key, { name: e.target.value })} />
              </Field>
              <Field label="Precio ($)" htmlFor={`${uid}-tp-${i}`} hint={price > 0 ? formatMoney(price) : undefined}>
                <input
                  id={`${uid}-tp-${i}`}
                  inputMode="numeric"
                  className={inputClass}
                  value={t.price}
                  placeholder="12000"
                  onChange={(e) => setType(t.key, { price: e.target.value.replace(/[^\d]/g, "") })}
                />
              </Field>
              <div className={cn(i === 0 && spot("capacity"), "p-0.5")}>
                <Field
                  label="Cupo"
                  htmlFor={`${uid}-tc-${i}`}
                  hint={t.used !== undefined ? `${t.used} vendidas o reservadas` : undefined}
                  error={t.used !== undefined && t.capacity !== "" && Number(t.capacity) < t.used ? `Mínimo ${t.used}` : undefined}
                >
                  <input
                    id={`${uid}-tc-${i}`}
                    inputMode="numeric"
                    className={inputClass}
                    value={t.capacity}
                    placeholder="100"
                    onChange={(e) => setType(t.key, { capacity: e.target.value.replace(/[^\d]/g, "") })}
                  />
                </Field>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2 text-danger sm:col-span-1 sm:mb-1"
                disabled={v.ticketTypes.length === 1 || (t.used ?? 0) > 0}
                title={(t.used ?? 0) > 0 ? "Tiene ventas: no se puede borrar" : "Quitar"}
                onClick={() => set("ticketTypes", v.ticketTypes.filter((x) => x.key !== t.key))}
              >
                Quitar
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => set("ticketTypes", [...v.ticketTypes, { key: newTypeKey(), name: "", price: "", capacity: "" }])}
          disabled={v.ticketTypes.length >= 10}
        >
          + Agregar tipo de entrada
        </Button>
      </section>

      {isNew ? (
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <input type="checkbox" className="size-5 accent-[var(--brand-primary)]" checked={v.publish} onChange={(e) => set("publish", e.target.checked)} />
          <span>
            <span className="block font-semibold">Publicar ya</span>
            <span className="text-sm text-muted">Si no lo tildás, queda como borrador y no aparece en la web.</span>
          </span>
        </label>
      ) : null}

      <div className={cn("sticky bottom-20 z-10 lg:bottom-4", spot("submit"))}>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

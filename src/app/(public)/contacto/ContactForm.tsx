"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { sendContactMessage, type ContactState } from "./actions";

const initial: ContactState = { ok: false };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, initial);
  const okRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.ok) okRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={okRef} className="pop-in rounded-2xl border border-ok/40 bg-ok/10 p-6">
        <p className="font-display text-2xl font-bold">¡Mensaje enviado! 🎉</p>
        <p className="mt-1 text-ink/80">{state.message}</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="c-name" error={e.name}>
          <input id="c-name" name="name" className={inputClass} defaultValue={v.name} autoComplete="name" aria-invalid={!!e.name} required />
        </Field>
        <Field label="Mail" htmlFor="c-email" error={e.email}>
          <input id="c-email" name="email" type="email" inputMode="email" className={inputClass} defaultValue={v.email} autoComplete="email" aria-invalid={!!e.email} required />
        </Field>
        <Field label="Tipo de evento" htmlFor="c-type" error={e.eventType}>
          <select id="c-type" name="eventType" className={inputClass} defaultValue={v.eventType ?? ""} aria-invalid={!!e.eventType} required>
            <option value="" disabled>Elegí una opción</option>
            <option value="cumpleanos">Cumpleaños</option>
            <option value="privado">Evento privado</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Fecha estimada" htmlFor="c-date" hint="Opcional, aunque sea aproximada" error={e.estimatedDate}>
          <input id="c-date" name="estimatedDate" type="date" className={inputClass} defaultValue={v.estimatedDate} />
        </Field>
      </div>
      <Field label="Contanos tu idea" htmlFor="c-msg" error={e.message}>
        <textarea id="c-msg" name="message" rows={5} className={inputClass} defaultValue={v.message} placeholder="Cuántas personas, qué onda querés, si ya tenés lugar…" aria-invalid={!!e.message} required />
      </Field>
      {/* Honeypot: invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>No completar <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" size="lg" disabled={pending} className="sm:self-start">
        {pending ? "Enviando…" : "Enviar consulta"}
      </Button>
    </form>
  );
}

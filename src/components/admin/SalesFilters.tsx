"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export type SalesView = "ordenes" | "asistentes";
export interface SalesFilterValue {
  view: SalesView;
  eventId: string;
  status: string;
  q: string;
}

const ORDER_STATUSES = [
  { v: "", l: "Todos los estados" },
  { v: "paid", l: "Pagadas" },
  { v: "pending", l: "Reservadas (sin pagar)" },
  { v: "expired", l: "Vencidas" },
  { v: "needs_refund", l: "A devolver" },
];
const TICKET_STATUSES = [
  { v: "", l: "Todos los estados" },
  { v: "valid", l: "Válidas" },
  { v: "used", l: "Usadas" },
  { v: "void", l: "Anuladas" },
];

/** Filtros de ventas (controlados). El panel los sincroniza con la URL; la simulación con su estado. */
export function SalesFilters({
  value,
  events,
  onChange,
  highlightSearch = false,
}: {
  value: SalesFilterValue;
  events: Array<{ id: string; name: string }>;
  onChange: (next: SalesFilterValue) => void;
  highlightSearch?: boolean;
}) {
  const [q, setQ] = useState(value.q);
  useEffect(() => setQ(value.q), [value.q]);
  useEffect(() => {
    if (q === value.q) return;
    const id = setTimeout(() => onChange({ ...value, q }), 300);
    return () => clearTimeout(id);
  }, [q, value, onChange]);

  const statuses = value.view === "ordenes" ? ORDER_STATUSES : TICKET_STATUSES;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Vista">
        {(["ordenes", "asistentes"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={value.view === v}
            onClick={() => onChange({ ...value, view: v, status: "" })}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition",
              value.view === v ? "bg-ink text-bg" : "text-ink/70 hover:text-ink",
            )}
          >
            {v === "ordenes" ? "Órdenes" : "Asistentes"}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.3fr]">
        <select aria-label="Evento" className={inputClass} value={value.eventId} onChange={(e) => onChange({ ...value, eventId: e.target.value })}>
          <option value="">Todos los eventos</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select aria-label="Estado" className={inputClass} value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
          {statuses.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar nombre, DNI, mail o código"
          className={cn(inputClass, highlightSearch && "sim-spotlight ring-2 ring-accent")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
    </div>
  );
}

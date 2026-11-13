"use client";

import { brand } from "@/config/brand";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { TicketTypeView } from "@/lib/types";

export type Selection = Record<string, number>;

export function availabilityLabel(available: number): { text: string; tone: "ok" | "warn" | "danger" } {
  if (available <= 0) return { text: "Agotado", tone: "danger" };
  if (available <= brand.lowStockThreshold) return { text: `Quedan ${available}`, tone: "warn" };
  return { text: "Disponible", tone: "ok" };
}

export function selectionTotal(types: TicketTypeView[], value: Selection) {
  let qty = 0;
  let amount = 0;
  for (const t of types) {
    const q = value[t.id] ?? 0;
    qty += q;
    amount += q * t.price;
  }
  return { qty, amount };
}

export function TicketSelector({
  ticketTypes,
  value,
  onChange,
  disabled = false,
}: {
  ticketTypes: TicketTypeView[];
  value: Selection;
  onChange: (next: Selection) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {ticketTypes.map((t) => {
        const qty = value[t.id] ?? 0;
        const max = Math.min(t.available, brand.maxPerType);
        const label = availabilityLabel(t.available);
        const soldOut = t.available <= 0;
        const set = (n: number) => onChange({ ...value, [t.id]: Math.max(0, Math.min(max, n)) });
        return (
          <li
            key={t.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/50 p-4 transition",
              qty > 0 && "border-primary/60 bg-primary/5",
              soldOut && "opacity-60",
            )}
          >
            <div className="min-w-0">
              <p className="font-semibold">{t.name}</p>
              <p className="font-display text-xl font-bold">{formatMoney(t.price)}</p>
              <p
                className={cn(
                  "mt-0.5 text-xs font-semibold",
                  label.tone === "ok" && "text-ok",
                  label.tone === "warn" && "text-warn",
                  label.tone === "danger" && "text-danger",
                )}
              >
                {label.text}
              </p>
            </div>
            {soldOut ? (
              <span className="text-sm font-semibold text-muted">Sin lugar</span>
            ) : (
              <div className="flex items-center gap-1 rounded-full border border-line bg-bg p-1" role="group" aria-label={`Cantidad de ${t.name}`}>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full text-xl font-bold transition hover:bg-white/10 disabled:opacity-30"
                  onClick={() => set(qty - 1)}
                  disabled={disabled || qty <= 0}
                  aria-label={`Sacar una ${t.name}`}
                >
                  −
                </button>
                <span className="w-7 text-center font-display text-lg font-bold tabular-nums" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full bg-primary text-xl font-bold text-primary-ink transition hover:brightness-110 disabled:opacity-30"
                  onClick={() => set(qty + 1)}
                  disabled={disabled || qty >= max}
                  aria-label={`Sumar una ${t.name}`}
                >
                  +
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

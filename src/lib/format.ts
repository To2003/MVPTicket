/** Formatos compartidos (server y cliente). Siempre en hora de Argentina. */
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return money.format(amount).replace(/ /g, " ");
}

function parts(iso: string | Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, ...opts }).format(new Date(iso));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Sábado 6 de diciembre" */
export function formatDateLong(iso: string | Date): string {
  return capitalize(parts(iso, { weekday: "long", day: "numeric", month: "long" }).replace(",", ""));
}

/** "sáb 6 dic" */
export function formatDateShort(iso: string | Date): string {
  return parts(iso, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}

/** "21:30" */
export function formatTime(iso: string | Date): string {
  return parts(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "06/12/2026 21:30" */
export function formatDateTime(iso: string | Date): string {
  return parts(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Partes para el "calendario" de las cards: { day: "06", month: "DIC" } */
export function dateBadge(iso: string | Date): { day: string; month: string; weekday: string } {
  return {
    day: parts(iso, { day: "2-digit" }),
    month: parts(iso, { month: "short" }).replace(".", "").toUpperCase(),
    weekday: parts(iso, { weekday: "short" }).replace(".", ""),
  };
}

/**
 * Valor para <input type="datetime-local"> en hora argentina.
 * Argentina no tiene horario de verano desde 2009 (UTC-3 fijo), ver DECISIONES D17.
 */
export function toLocalInputValue(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function fromLocalInputValue(value: string): string {
  return new Date(`${value}:00-03:00`).toISOString();
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

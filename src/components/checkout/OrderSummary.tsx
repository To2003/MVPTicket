import { Flyer } from "@/components/events/Flyer";
import { formatDateLong, formatMoney, formatTime } from "@/lib/format";

export interface SummaryLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export function OrderSummary({
  event,
  lines,
}: {
  event: { name: string; startsAt: string; venueName: string; flyerUrl: string | null };
  lines: SummaryLine[];
}) {
  const total = lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-4">
        <Flyer src={event.flyerUrl} alt="" className="aspect-[4/5] w-16 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">{event.name}</p>
          <p className="text-sm text-muted">
            {formatDateLong(event.startsAt)} · {formatTime(event.startsAt)} hs
          </p>
          <p className="text-sm text-muted">{event.venueName}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
        {lines.map((l) => (
          <li key={l.name} className="flex justify-between gap-3">
            <span>
              {l.quantity} × {l.name}
            </span>
            <span className="tabular-nums text-ink/80">{formatMoney(l.quantity * l.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="font-semibold">Total</span>
        <span className="font-display text-2xl font-bold tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

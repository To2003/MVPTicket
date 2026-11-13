import { Flyer } from "@/components/events/Flyer";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort, formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface EventStatsView {
  name: string;
  startsAt: string;
  isPublished: boolean;
  flyerUrl: string | null;
  capacity: number;
  sold: number;
  reserved: number;
  used?: number;
  revenue: number;
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", pct >= 95 ? "bg-warn" : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EventStatsCard({ e, past = false, actions }: { e: EventStatsView; past?: boolean; actions?: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
      <Flyer src={e.flyerUrl} alt="" className="aspect-[4/5] w-16 shrink-0 rounded-lg sm:w-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-lg font-bold leading-tight">{e.name}</p>
          {past ? <Badge>Pasado</Badge> : e.isPublished ? <Badge tone="ok">Publicado</Badge> : <Badge tone="warn">Borrador</Badge>}
        </div>
        <p className="text-xs text-muted">
          {formatDateShort(e.startsAt)} · {formatTime(e.startsAt)} hs
        </p>
        <ProgressBar value={e.sold} max={e.capacity} />
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <span>
            <strong className="tabular-nums">{e.sold}</strong>
            <span className="text-muted"> / {e.capacity} vendidas</span>
            {e.reserved ? <span className="text-warn"> · {e.reserved} reservadas</span> : null}
            {past && e.used !== undefined ? <span className="text-violet"> · {e.used} entraron</span> : null}
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(e.revenue)}</span>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: "ink" | "primary" | "accent" | "warn" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 break-words font-display text-2xl font-extrabold tabular-nums sm:text-3xl",
          tone === "primary" && "text-primary",
          tone === "accent" && "text-accent",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

import Link from "next/link";
import { brand } from "@/config/brand";
import { formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isPast, minPrice, totalAvailable, type EventView } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { DateBadge } from "./DateBadge";
import { Flyer } from "./Flyer";

export function availabilityBadge(event: EventView) {
  if (isPast(event)) return <Badge>Ya fue</Badge>;
  const left = totalAvailable(event);
  if (left === 0) return <Badge tone="danger">Agotado</Badge>;
  if (left <= brand.lowStockThreshold) return <Badge tone="warn">¡Últimas {left}!</Badge>;
  return null;
}

/** Card de evento. Con `href` es un link; con `onSelect` es un botón (lo usa la simulación). */
export function EventCard({
  event,
  href,
  onSelect,
  className,
}: {
  event: EventView;
  href?: string;
  onSelect?: () => void;
  className?: string;
}) {
  const price = minPrice(event);
  const past = isPast(event);
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden">
        <Flyer
          src={event.flyerUrl}
          alt={`Flyer de ${event.name}`}
          className="size-full transition duration-500 group-hover:scale-[1.03]"
        />
        <DateBadge iso={event.startsAt} className="absolute left-3 top-3" />
        <div className="absolute right-3 top-3 rounded-full bg-black/75 backdrop-blur-sm">{availabilityBadge(event)}</div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-xl font-bold leading-tight text-balance">{event.name}</h3>
        <p className="text-sm text-muted">
          {formatTime(event.startsAt)} hs · {event.venueName}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          {price !== null ? (
            <p className="text-sm text-muted">
              desde <span className="font-display text-lg font-bold text-ink">{formatMoney(price)}</span>
            </p>
          ) : (
            <span />
          )}
          <span className="text-sm font-semibold text-primary transition group-hover:translate-x-0.5">{past ? "Ver evento →" : "Ver entradas →"}</span>
        </div>
      </div>
    </>
  );
  const cls = cn(
    "group flex flex-col overflow-hidden rounded-brand border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-primary/50",
    className,
  );
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <Link href={href ?? `/eventos/${event.slug}`} className={cls}>
      {body}
    </Link>
  );
}

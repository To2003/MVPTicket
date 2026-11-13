import { Sparkle } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { formatDateLong, formatTime } from "@/lib/format";

export interface TicketCardProps {
  eventName: string;
  startsAt: string;
  venueName: string;
  venueAddress?: string;
  ticketTypeName: string;
  holderName: string;
  code: string;
  status: "valid" | "used" | "void";
  usedAt?: string | null;
  /** SVG del QR (string). Si no viene, se muestra el hueco del QR. */
  qrSvg?: string | null;
  className?: string;
}

/** La entrada "física": la usan /entrada/[token], la página de compra y la simulación. */
export function TicketCard(p: TicketCardProps) {
  return (
    <article
      className={cn(
        "relative mx-auto w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-line bg-surface shadow-[0_30px_80px_-40px_var(--brand-primary)]",
        p.className,
      )}
    >
      <header className="relative bg-primary px-5 pb-6 pt-5 text-primary-ink">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 font-display text-sm font-extrabold lowercase">
            <Sparkle className="size-3.5" /> {brand.name}
          </span>
          <span className="rounded-full bg-primary-ink/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">{p.ticketTypeName}</span>
        </div>
        <h2 className="condensed mt-3 font-display text-3xl font-extrabold uppercase leading-[0.9]">{p.eventName}</h2>
        <p className="mt-2 text-sm font-semibold">
          {formatDateLong(p.startsAt)} · {formatTime(p.startsAt)} hs
        </p>
        <p className="text-sm opacity-80">
          {p.venueName}
          {p.venueAddress ? ` · ${p.venueAddress}` : ""}
        </p>
      </header>
      {/* troquel */}
      <div className="relative h-0 border-t-2 border-dashed border-line">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-bg" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-bg" />
      </div>
      <div className="flex flex-col items-center gap-3 px-5 pb-6 pt-6">
        <div className="relative">
          <div
            className={cn("size-56 rounded-2xl bg-white p-2.5 [&_svg]:size-full", p.status !== "valid" && "opacity-25 blur-[1px]")}
            aria-label={`Código QR de la entrada ${p.code}`}
            role="img"
            dangerouslySetInnerHTML={p.qrSvg ? { __html: p.qrSvg } : undefined}
          />
          {p.status === "void" ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="-rotate-12 rounded-lg border-4 border-danger px-3 py-1 font-display text-3xl font-extrabold uppercase text-danger">Anulada</span>
            </span>
          ) : p.status === "used" ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="-rotate-12 rounded-lg border-4 border-warn bg-bg/80 px-3 py-1 text-center font-display text-2xl font-extrabold uppercase text-warn">
                Usada
                {p.usedAt ? <span className="block text-sm">{formatTime(p.usedAt)} hs</span> : null}
              </span>
            </span>
          ) : null}
        </div>
        <p className="font-mono text-xl font-bold tracking-[0.2em]">{p.code}</p>
        <div className="w-full border-t border-line pt-3 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Titular</p>
          <p className="font-display text-xl font-bold">{p.holderName}</p>
        </div>
        {p.status === "valid" ? (
          <p className="text-center text-xs text-muted">Mostrá este QR en la puerta. Subí el brillo del celu ☀️</p>
        ) : null}
      </div>
    </article>
  );
}

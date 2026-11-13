import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMoney } from "@/lib/format";
import { OrderStatusBadge, TicketStatusBadge, type OrderStatusKey, type TicketStatusKey } from "./StatusBadge";

export interface OrderRowView {
  id: string;
  eventName: string;
  buyerName: string;
  buyerEmail: string;
  buyerDni: string;
  status: OrderStatusKey;
  total: number;
  quantity: number;
  createdAt: string;
}

export interface AttendeeRowView {
  id: string;
  orderId: string;
  eventName: string;
  ticketTypeName: string;
  holderName: string;
  buyerName: string;
  buyerDni: string;
  code: string;
  status: TicketStatusKey;
  usedAt: string | null;
}

function RowShell({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const cls = "block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/50";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>
        {children}
      </button>
    );
  }
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function OrdersList({
  rows,
  hrefFor,
  onOpen,
}: {
  rows: OrderRowView[];
  hrefFor?: (id: string) => string;
  onOpen?: (id: string) => void;
}) {
  if (!rows.length) return <EmptyState title="No hay órdenes con esos filtros">Probá sacar algún filtro o buscar otra cosa.</EmptyState>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((o) => (
        <li key={o.id}>
          <RowShell href={hrefFor?.(o.id)} onClick={onOpen ? () => onOpen(o.id) : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{o.buyerName}</p>
                <p className="truncate text-xs text-muted">
                  DNI {o.buyerDni} · {o.buyerEmail}
                </p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2 text-sm">
              <span className="text-muted">
                {o.eventName} · {o.quantity} {o.quantity === 1 ? "entrada" : "entradas"}
                <span className="block text-xs">{formatDateTime(o.createdAt)}</span>
              </span>
              <span className="font-display text-lg font-bold tabular-nums">{formatMoney(o.total)}</span>
            </div>
          </RowShell>
        </li>
      ))}
    </ul>
  );
}

export function AttendeesList({
  rows,
  renderActions,
  hrefFor,
}: {
  rows: AttendeeRowView[];
  renderActions?: (row: AttendeeRowView) => React.ReactNode;
  hrefFor?: (row: AttendeeRowView) => string;
}) {
  if (!rows.length) return <EmptyState title="No hay entradas con esos filtros">Probá sacar algún filtro o buscar otra cosa.</EmptyState>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((t) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{t.holderName}</p>
                <p className="truncate text-xs text-muted">
                  {t.ticketTypeName} · {t.eventName}
                  {t.holderName !== t.buyerName ? ` · compró ${t.buyerName}` : ""}
                </p>
              </div>
              <TicketStatusBadge status={t.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm tracking-widest text-ink/80">{t.code}</span>
              <span className="text-xs text-muted">
                DNI {t.buyerDni}
                {t.usedAt ? ` · entró ${formatDateTime(t.usedAt)}` : ""}
              </span>
            </div>
          </>
        );
        return (
          <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
            {hrefFor ? (
              <Link href={hrefFor(t)} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
            {renderActions ? <div className="mt-3 border-t border-line pt-3">{renderActions(t)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

import { Badge } from "@/components/ui/Badge";

export type OrderStatusKey = "paid" | "pending" | "expired" | "needs_refund";
export type TicketStatusKey = "valid" | "used" | "void";

const ORDER: Record<OrderStatusKey, { label: string; tone: "ok" | "warn" | "neutral" | "danger" }> = {
  paid: { label: "Pagada", tone: "ok" },
  pending: { label: "Reservada", tone: "warn" },
  expired: { label: "Vencida", tone: "neutral" },
  needs_refund: { label: "A devolver", tone: "danger" },
};
const TICKET: Record<TicketStatusKey, { label: string; tone: "ok" | "violet" | "danger" }> = {
  valid: { label: "Válida", tone: "ok" },
  used: { label: "Usada", tone: "violet" },
  void: { label: "Anulada", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatusKey }) {
  return <Badge tone={ORDER[status].tone}>{ORDER[status].label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatusKey }) {
  return <Badge tone={TICKET[status].tone}>{TICKET[status].label}</Badge>;
}

import "server-only";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import type { MpGateway } from "@/lib/mercadopago";
import { publicFileUrl } from "@/lib/storage";
import { signTicketToken } from "@/lib/tickets";
import type { OrderStatus, TicketView } from "@/lib/types";

export type ReserveErrorCode =
  | "SIN_CUPO"
  | "EVENTO_NO_DISPONIBLE"
  | "EVENTO_PASADO"
  | "ITEMS_INVALIDOS"
  | "TIPO_INVALIDO"
  | "CANTIDAD_INVALIDA";

export class ReserveError extends Error {
  constructor(
    public code: ReserveErrorCode,
    public ticketTypeId?: string,
  ) {
    super(code);
  }
}

export interface ReserveInput {
  eventId: string;
  items: Array<{ ticket_type_id: string; quantity: number }>;
  buyer: { name: string; email: string; dni: string };
  ttlSeconds?: number;
}

/** Reserva atómica (función SQL). Devuelve el id de la orden o tira ReserveError. */
export async function reserveOrder(input: ReserveInput): Promise<string> {
  try {
    const row = await queryOne<{ id: string }>(
      "select public.reserve_order($1, $2::jsonb, $3, $4, $5, $6) as id",
      [
        input.eventId,
        JSON.stringify(input.items),
        input.buyer.name,
        input.buyer.email,
        input.buyer.dni,
        input.ttlSeconds ?? 600,
      ],
    );
    return row!.id;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "P0001" && e.message) {
      const [code, ticketTypeId] = e.message.split(":");
      throw new ReserveError(code as ReserveErrorCode, ticketTypeId);
    }
    throw err;
  }
}

export function reserveErrorMessage(err: ReserveError, typeName?: string): string {
  switch (err.code) {
    case "SIN_CUPO":
      return typeName
        ? `Uh, no quedan suficientes entradas "${typeName}". Probá con menos cantidad u otro tipo.`
        : "Uh, no quedan suficientes entradas. Probá con menos cantidad.";
    case "EVENTO_PASADO":
      return "Este evento ya empezó, no se pueden comprar más entradas.";
    case "EVENTO_NO_DISPONIBLE":
      return "Este evento ya no está a la venta.";
    default:
      return "Algo no cerró con las entradas que elegiste. Volvé al evento y elegilas de nuevo.";
  }
}

export interface OrderDetails {
  id: string;
  status: OrderStatus;
  total: number;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerDni: string;
  event: {
    id: string;
    slug: string;
    name: string;
    startsAt: string;
    venueName: string;
    venueAddress: string;
    flyerUrl: string | null;
  };
  items: Array<{ ticketTypeId: string; name: string; quantity: number; unitPrice: number }>;
  tickets: TicketView[];
  lastPaymentStatus: string | null;
}

export type OrderPhase = "pending" | "expired" | "paid" | "needs_refund";

export function orderPhase(o: Pick<OrderDetails, "status" | "expiresAt">, now = Date.now()): OrderPhase {
  if (o.status === "paid") return "paid";
  if (o.status === "needs_refund") return "needs_refund";
  return new Date(o.expiresAt).getTime() > now ? "pending" : "expired";
}

export async function getOrderDetails(orderId: string): Promise<OrderDetails | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const o = await queryOne<{
    id: string;
    status: OrderStatus;
    total: number;
    expires_at: Date;
    created_at: Date;
    paid_at: Date | null;
    buyer_name: string;
    buyer_email: string;
    buyer_dni: string;
    event_id: string;
    slug: string;
    name: string;
    starts_at: Date;
    venue_name: string;
    venue_address: string;
    flyer_path: string | null;
  }>(
    `select o.id, o.status, o.total, o.expires_at, o.created_at, o.paid_at, o.buyer_name, o.buyer_email, o.buyer_dni,
            e.id as event_id, e.slug, e.name, e.starts_at, e.venue_name, e.venue_address, e.flyer_path
     from public.orders o join public.events e on e.id = o.event_id
     where o.id = $1`,
    [orderId],
  );
  if (!o) return null;
  const [items, tickets, lastPayment] = await Promise.all([
    query<{ ticket_type_id: string; name: string; quantity: number; unit_price: number }>(
      `select oi.ticket_type_id, tt.name, oi.quantity, oi.unit_price
       from public.order_items oi join public.ticket_types tt on tt.id = oi.ticket_type_id
       where oi.order_id = $1 order by tt.sort_order`,
      [orderId],
    ),
    query<{ id: string; code: string; holder_name: string; type_name: string; status: TicketView["status"]; used_at: Date | null }>(
      `select t.id, t.code, t.holder_name, tt.name as type_name, t.status, t.used_at
       from public.tickets t join public.ticket_types tt on tt.id = t.ticket_type_id
       where t.order_id = $1 order by tt.sort_order, t.seq`,
      [orderId],
    ),
    queryOne<{ status: string }>(
      "select status from public.payments where order_id = $1 order by updated_at desc limit 1",
      [orderId],
    ),
  ]);
  const secret = env.ticketSecret();
  return {
    id: o.id,
    status: o.status,
    total: o.total,
    expiresAt: o.expires_at.toISOString(),
    createdAt: o.created_at.toISOString(),
    paidAt: o.paid_at?.toISOString() ?? null,
    buyerName: o.buyer_name,
    buyerEmail: o.buyer_email,
    buyerDni: o.buyer_dni,
    event: {
      id: o.event_id,
      slug: o.slug,
      name: o.name,
      startsAt: o.starts_at.toISOString(),
      venueName: o.venue_name,
      venueAddress: o.venue_address,
      flyerUrl: publicFileUrl(o.flyer_path),
    },
    items: items.map((i) => ({ ticketTypeId: i.ticket_type_id, name: i.name, quantity: i.quantity, unitPrice: i.unit_price })),
    tickets: tickets.map((t) => ({
      id: t.id,
      token: signTicketToken(t.id, secret),
      code: t.code,
      holderName: t.holder_name,
      ticketTypeName: t.type_name,
      status: t.status,
      usedAt: t.used_at?.toISOString() ?? null,
    })),
    lastPaymentStatus: lastPayment?.status ?? null,
  };
}

/** Crea la preferencia de MP para una orden pendiente y devuelve la URL de pago. */
export async function startMpCheckout(orderId: string, mp: MpGateway): Promise<string> {
  const order = await getOrderDetails(orderId);
  if (!order || orderPhase(order) !== "pending") throw new Error("La reserva no está vigente.");
  const pref = await mp.createPreference({
    orderId: order.id,
    expiresAt: new Date(order.expiresAt),
    buyer: { name: order.buyerName, email: order.buyerEmail, dni: order.buyerDni },
    items: order.items.map((i) => ({
      id: i.ticketTypeId,
      title: `${order.event.name} — ${i.name}`,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  });
  await query("update public.orders set mp_preference_id = $2 where id = $1", [orderId, pref.id]);
  return pref.checkoutUrl;
}

import "server-only";
import { query, queryOne, tx } from "@/lib/db";
import { env } from "@/lib/env";
import { publicFileUrl } from "@/lib/storage";
import { signTicketToken } from "@/lib/tickets";

// ───────────────────────────── Tipos ─────────────────────────────

export type AdminOrderStatus = "paid" | "pending" | "expired" | "needs_refund";
export type TicketStatus = "valid" | "used" | "void";

export const ORDER_STATUS_LABEL: Record<AdminOrderStatus, string> = {
  paid: "Pagada",
  pending: "Reservada",
  expired: "Vencida",
  needs_refund: "A devolver",
};
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  valid: "Válida",
  used: "Usada",
  void: "Anulada",
};

const STATUS_SQL = `case when o.status = 'pending' and o.expires_at <= now() then 'expired' else o.status::text end`;

function likeParam(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

// ─────────────────────────── Dashboard ───────────────────────────

export interface EventStats {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  isPublished: boolean;
  flyerUrl: string | null;
  capacity: number;
  sold: number;
  reserved: number;
  used: number;
  revenue: number;
}

export async function listEventStats(scope: "upcoming" | "past" | "all" = "all"): Promise<EventStats[]> {
  const where = scope === "upcoming" ? "where e.starts_at > now()" : scope === "past" ? "where e.starts_at <= now()" : "";
  const rows = await query<{
    id: string;
    slug: string;
    name: string;
    starts_at: Date;
    is_published: boolean;
    flyer_path: string | null;
    capacity: number;
    sold: number;
    reserved: number;
    used: number;
    revenue: number;
  }>(
    `select e.id, e.slug, e.name, e.starts_at, e.is_published, e.flyer_path,
       coalesce((select sum(capacity) from public.ticket_types where event_id = e.id), 0)::int as capacity,
       (select count(*) from public.tickets t where t.event_id = e.id and t.status <> 'void')::int as sold,
       coalesce((select sum(oi.quantity) from public.order_items oi join public.orders o on o.id = oi.order_id
                 where o.event_id = e.id and o.status = 'pending' and o.expires_at > now()), 0)::int as reserved,
       (select count(*) from public.tickets t where t.event_id = e.id and t.status = 'used')::int as used,
       coalesce((select sum(total) from public.orders o where o.event_id = e.id and o.status = 'paid'), 0)::int as revenue
     from public.events e ${where}
     order by ${scope === "past" ? "e.starts_at desc" : "e.starts_at asc"}`,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    startsAt: r.starts_at.toISOString(),
    isPublished: r.is_published,
    flyerUrl: publicFileUrl(r.flyer_path),
    capacity: r.capacity,
    sold: r.sold,
    reserved: r.reserved,
    used: r.used,
    revenue: r.revenue,
  }));
}

export async function dashboardAlerts() {
  const row = await queryOne<{ unread: number; refunds: number; duplicates: number }>(
    `select (select count(*) from public.contact_messages where not is_read)::int as unread,
            (select count(*) from public.orders where status = 'needs_refund')::int as refunds,
            (select count(*) from public.payments where outcome = 'duplicate_payment')::int as duplicates`,
  );
  return row ?? { unread: 0, refunds: 0, duplicates: 0 };
}

export async function eventOptions() {
  return query<{ id: string; name: string; starts_at: Date }>(
    "select id, name, starts_at from public.events order by starts_at desc",
  );
}

// ─────────────────────────── Eventos ───────────────────────────

export interface AdminTicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  used: number;
}

export interface AdminEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  flyerPath: string | null;
  flyerUrl: string | null;
  startsAt: string;
  venueName: string;
  venueAddress: string;
  isPublished: boolean;
  ticketTypes: AdminTicketType[];
}

export async function getAdminEvent(id: string): Promise<AdminEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const e = await queryOne<{
    id: string;
    slug: string;
    name: string;
    description: string;
    flyer_path: string | null;
    starts_at: Date;
    venue_name: string;
    venue_address: string;
    is_published: boolean;
  }>("select * from public.events where id = $1", [id]);
  if (!e) return null;
  const types = await query<{ id: string; name: string; price: number; capacity: number; used: number }>(
    `select id, name, price, capacity, public.ticket_type_used(id) as used
     from public.ticket_types where event_id = $1 order by sort_order, price`,
    [id],
  );
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    description: e.description,
    flyerPath: e.flyer_path,
    flyerUrl: publicFileUrl(e.flyer_path),
    startsAt: e.starts_at.toISOString(),
    venueName: e.venue_name,
    venueAddress: e.venue_address,
    isPublished: e.is_published,
    ticketTypes: types,
  };
}

export interface SaveEventInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  startsAt: string;
  venueName: string;
  venueAddress: string;
  flyerPath?: string | null;
  isPublished?: boolean;
  ticketTypes: Array<{ id?: string; name: string; price: number; capacity: number }>;
}

export class SaveEventError extends Error {}

/**
 * Crea o actualiza un evento con sus tipos de entrada, en una transacción.
 * Reglas (D8): no se puede bajar el cupo por debajo de vendidas+reservadas, ni borrar un tipo con ventas.
 */
export async function saveEvent(input: SaveEventInput): Promise<string> {
  return tx(async (c) => {
    const slugTaken = await c.query("select 1 from public.events where slug = $1 and id is distinct from $2", [
      input.slug,
      input.id ?? null,
    ]);
    if (slugTaken.rowCount) throw new SaveEventError("Ya hay otro evento con esa dirección (slug). Cambiá el nombre o el slug.");

    let eventId = input.id;
    if (eventId) {
      const res = await c.query(
        `update public.events set name = $2, slug = $3, description = $4, starts_at = $5, venue_name = $6,
           venue_address = $7, flyer_path = coalesce($8, flyer_path)
         where id = $1`,
        [eventId, input.name, input.slug, input.description, input.startsAt, input.venueName, input.venueAddress, input.flyerPath ?? null],
      );
      if (!res.rowCount) throw new SaveEventError("El evento no existe.");
    } else {
      const res = await c.query<{ id: string }>(
        `insert into public.events (name, slug, description, starts_at, venue_name, venue_address, flyer_path, is_published)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [input.name, input.slug, input.description, input.startsAt, input.venueName, input.venueAddress, input.flyerPath ?? null, input.isPublished ?? false],
      );
      eventId = res.rows[0].id;
    }

    // Bloqueamos los tipos actuales: nadie reserva mientras cambiamos cupos.
    const existing = await c.query<{ id: string; name: string; used: number }>(
      `select id, name, public.ticket_type_used(id) as used from public.ticket_types where event_id = $1 order by id for update`,
      [eventId],
    );
    const keep = new Set(input.ticketTypes.map((t) => t.id).filter(Boolean));
    for (const old of existing.rows) {
      if (keep.has(old.id)) continue;
      const hasSales = await c.query("select 1 from public.order_items where ticket_type_id = $1 limit 1", [old.id]);
      if (hasSales.rowCount) {
        throw new SaveEventError(`No se puede borrar "${old.name}" porque ya tiene ventas. Si querés cerrarlo, poné el cupo igual a lo vendido.`);
      }
      await c.query("delete from public.ticket_types where id = $1", [old.id]);
    }
    for (const [i, t] of input.ticketTypes.entries()) {
      if (t.id) {
        const old = existing.rows.find((r) => r.id === t.id);
        if (!old) throw new SaveEventError("Uno de los tipos de entrada no pertenece a este evento.");
        if (t.capacity < old.used) {
          throw new SaveEventError(`El cupo de "${t.name}" no puede ser menor a ${old.used} (vendidas + reservadas).`);
        }
        await c.query("update public.ticket_types set name = $2, price = $3, capacity = $4, sort_order = $5 where id = $1", [
          t.id,
          t.name,
          t.price,
          t.capacity,
          i,
        ]);
      } else {
        await c.query("insert into public.ticket_types (event_id, name, price, capacity, sort_order) values ($1, $2, $3, $4, $5)", [
          eventId,
          t.name,
          t.price,
          t.capacity,
          i,
        ]);
      }
    }
    return eventId!;
  });
}

export async function setEventPublished(id: string, published: boolean) {
  await query("update public.events set is_published = $2 where id = $1", [id, published]);
}

// ─────────────────────────── Ventas ───────────────────────────

export interface SalesFilters {
  eventId?: string;
  status?: string;
  q?: string;
}

export interface AdminOrderRow {
  id: string;
  eventName: string;
  buyerName: string;
  buyerEmail: string;
  buyerDni: string;
  status: AdminOrderStatus;
  total: number;
  quantity: number;
  createdAt: string;
  paidAt: string | null;
}

function orderWhere(f: SalesFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.eventId) {
    params.push(f.eventId);
    where.push(`o.event_id = $${params.length}`);
  }
  if (f.status && ["paid", "pending", "expired", "needs_refund"].includes(f.status)) {
    params.push(f.status);
    where.push(`${STATUS_SQL} = $${params.length}`);
  }
  if (f.q) {
    params.push(likeParam(f.q));
    const p = `$${params.length}`;
    where.push(`(o.buyer_name ilike ${p} or o.buyer_email ilike ${p} or o.buyer_dni ilike ${p}
      or exists (select 1 from public.tickets t where t.order_id = o.id and (t.holder_name ilike ${p} or t.code ilike ${p})))`);
  }
  return { sql: where.length ? `where ${where.join(" and ")}` : "", params };
}

export async function listOrders(f: SalesFilters, limit = 300): Promise<AdminOrderRow[]> {
  const w = orderWhere(f);
  const rows = await query<{
    id: string;
    event_name: string;
    buyer_name: string;
    buyer_email: string;
    buyer_dni: string;
    status: AdminOrderStatus;
    total: number;
    quantity: number;
    created_at: Date;
    paid_at: Date | null;
  }>(
    `select o.id, e.name as event_name, o.buyer_name, o.buyer_email, o.buyer_dni, ${STATUS_SQL} as status, o.total,
       (select coalesce(sum(quantity), 0) from public.order_items where order_id = o.id)::int as quantity,
       o.created_at, o.paid_at
     from public.orders o join public.events e on e.id = o.event_id
     ${w.sql}
     order by o.created_at desc
     limit ${Number(limit)}`,
    w.params,
  );
  return rows.map((r) => ({
    id: r.id,
    eventName: r.event_name,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerDni: r.buyer_dni,
    status: r.status,
    total: r.total,
    quantity: r.quantity,
    createdAt: r.created_at.toISOString(),
    paidAt: r.paid_at?.toISOString() ?? null,
  }));
}

/** Totales del filtro: solo órdenes pagadas cuentan como venta. */
export async function salesTotals(f: SalesFilters) {
  const w = orderWhere(f);
  const row = await queryOne<{ orders: number; tickets: number; revenue: number }>(
    `select count(*)::int as orders,
       coalesce(sum((select count(*) from public.tickets t where t.order_id = o.id and t.status <> 'void')), 0)::int as tickets,
       coalesce(sum(o.total), 0)::int as revenue
     from public.orders o ${w.sql ? `${w.sql} and` : "where"} o.status = 'paid'`,
    w.params,
  );
  return row ?? { orders: 0, tickets: 0, revenue: 0 };
}

export interface AttendeeRow {
  id: string;
  orderId: string;
  eventName: string;
  ticketTypeName: string;
  price: number;
  holderName: string;
  buyerName: string;
  buyerEmail: string;
  buyerDni: string;
  code: string;
  status: TicketStatus;
  usedAt: string | null;
  paidAt: string | null;
}

export async function listAttendees(f: SalesFilters, limit = 1000): Promise<AttendeeRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.eventId) {
    params.push(f.eventId);
    where.push(`t.event_id = $${params.length}`);
  }
  if (f.status && ["valid", "used", "void"].includes(f.status)) {
    params.push(f.status);
    where.push(`t.status = $${params.length}`);
  }
  if (f.q) {
    params.push(likeParam(f.q));
    const p = `$${params.length}`;
    where.push(`(t.holder_name ilike ${p} or o.buyer_name ilike ${p} or o.buyer_email ilike ${p} or o.buyer_dni ilike ${p} or t.code ilike ${p})`);
  }
  const rows = await query<{
    id: string;
    order_id: string;
    event_name: string;
    type_name: string;
    unit_price: number;
    holder_name: string;
    buyer_name: string;
    buyer_email: string;
    buyer_dni: string;
    code: string;
    status: TicketStatus;
    used_at: Date | null;
    paid_at: Date | null;
  }>(
    `select t.id, t.order_id, e.name as event_name, tt.name as type_name, oi.unit_price, t.holder_name,
       o.buyer_name, o.buyer_email, o.buyer_dni, t.code, t.status, t.used_at, o.paid_at
     from public.tickets t
     join public.orders o on o.id = t.order_id
     join public.order_items oi on oi.id = t.order_item_id
     join public.ticket_types tt on tt.id = t.ticket_type_id
     join public.events e on e.id = t.event_id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by o.paid_at desc nulls last, t.seq
     limit ${Number(limit)}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    eventName: r.event_name,
    ticketTypeName: r.type_name,
    price: r.unit_price,
    holderName: r.holder_name,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerDni: r.buyer_dni,
    code: r.code,
    status: r.status,
    usedAt: r.used_at?.toISOString() ?? null,
    paidAt: r.paid_at?.toISOString() ?? null,
  }));
}

export async function getAdminOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const o = await queryOne<{
    id: string;
    event_id: string;
    event_name: string;
    starts_at: Date;
    buyer_name: string;
    buyer_email: string;
    buyer_dni: string;
    status: AdminOrderStatus;
    total: number;
    created_at: Date;
    paid_at: Date | null;
    expires_at: Date;
    email_sent_at: Date | null;
  }>(
    `select o.id, o.event_id, e.name as event_name, e.starts_at, o.buyer_name, o.buyer_email, o.buyer_dni,
       ${STATUS_SQL} as status, o.total, o.created_at, o.paid_at, o.expires_at, o.email_sent_at
     from public.orders o join public.events e on e.id = o.event_id where o.id = $1`,
    [id],
  );
  if (!o) return null;
  const [items, tickets, payments] = await Promise.all([
    query<{ name: string; quantity: number; unit_price: number }>(
      `select tt.name, oi.quantity, oi.unit_price from public.order_items oi
       join public.ticket_types tt on tt.id = oi.ticket_type_id where oi.order_id = $1 order by tt.sort_order`,
      [id],
    ),
    query<{ id: string; code: string; holder_name: string; type_name: string; status: TicketStatus; used_at: Date | null; voided_at: Date | null }>(
      `select t.id, t.code, t.holder_name, tt.name as type_name, t.status, t.used_at, t.voided_at
       from public.tickets t join public.ticket_types tt on tt.id = t.ticket_type_id
       where t.order_id = $1 order by tt.sort_order, t.seq`,
      [id],
    ),
    query<{ mp_payment_id: string; status: string; amount: number | null; outcome: string | null; updated_at: Date }>(
      "select mp_payment_id, status, amount, outcome, updated_at from public.payments where order_id = $1 order by created_at",
      [id],
    ),
  ]);
  const secret = env.ticketSecret();
  return {
    id: o.id,
    eventId: o.event_id,
    eventName: o.event_name,
    startsAt: o.starts_at.toISOString(),
    buyerName: o.buyer_name,
    buyerEmail: o.buyer_email,
    buyerDni: o.buyer_dni,
    status: o.status,
    total: o.total,
    createdAt: o.created_at.toISOString(),
    paidAt: o.paid_at?.toISOString() ?? null,
    expiresAt: o.expires_at.toISOString(),
    emailSentAt: o.email_sent_at?.toISOString() ?? null,
    items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unit_price })),
    tickets: tickets.map((t) => ({
      id: t.id,
      code: t.code,
      holderName: t.holder_name,
      ticketTypeName: t.type_name,
      status: t.status,
      usedAt: t.used_at?.toISOString() ?? null,
      voidedAt: t.voided_at?.toISOString() ?? null,
      token: signTicketToken(t.id, secret),
    })),
    payments: payments.map((p) => ({
      id: p.mp_payment_id,
      status: p.status,
      amount: p.amount,
      outcome: p.outcome,
      updatedAt: p.updated_at.toISOString(),
    })),
  };
}

export async function renameTicket(ticketId: string, holderName: string) {
  const res = await query<{ order_id: string }>(
    "update public.tickets set holder_name = $2 where id = $1 and status <> 'void' returning order_id",
    [ticketId, holderName],
  );
  return res[0]?.order_id ?? null;
}

export async function voidTicket(ticketId: string) {
  const res = await query<{ order_id: string }>(
    "update public.tickets set status = 'void', voided_at = now() where id = $1 and status <> 'void' returning order_id",
    [ticketId],
  );
  return res[0]?.order_id ?? null;
}

// ─────────────────────────── Consultas ───────────────────────────

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  eventType: "cumpleanos" | "privado" | "otro";
  estimatedDate: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const rows = await query<{
    id: string;
    name: string;
    email: string;
    event_type: ContactMessageRow["eventType"];
    estimated_date: string | null;
    message: string;
    is_read: boolean;
    created_at: Date;
  }>("select * from public.contact_messages order by is_read asc, created_at desc limit 500");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    eventType: r.event_type,
    estimatedDate: r.estimated_date,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function setMessageRead(id: string, read: boolean) {
  await query("update public.contact_messages set is_read = $2 where id = $1", [id, read]);
}

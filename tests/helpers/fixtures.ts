import { randomUUID } from "node:crypto";
import pg from "pg";

export function newClient() {
  return new pg.Client({ connectionString: process.env.DATABASE_URL });
}

export async function withClient<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = newClient();
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export interface Fixture {
  eventId: string;
  slug: string;
  types: Array<{ id: string; price: number; capacity: number }>;
}

/** Crea un evento publicado (futuro por defecto) con los tipos de entrada pedidos. */
export async function createEvent(
  types: Array<{ name?: string; price?: number; capacity: number }>,
  opts: { published?: boolean; startsInDays?: number } = {},
): Promise<Fixture> {
  return withClient(async (c) => {
    const slug = `test-${randomUUID().slice(0, 8)}`;
    const ev = await c.query<{ id: string }>(
      `insert into public.events (slug, name, starts_at, venue_name, is_published)
       values ($1, $2, now() + make_interval(days => $3), 'Lugar de prueba', $4) returning id`,
      [slug, `Evento ${slug}`, opts.startsInDays ?? 10, opts.published ?? true],
    );
    const eventId = ev.rows[0].id;
    const out: Fixture["types"] = [];
    for (const [i, t] of types.entries()) {
      const r = await c.query<{ id: string }>(
        "insert into public.ticket_types (event_id, name, price, capacity, sort_order) values ($1, $2, $3, $4, $5) returning id",
        [eventId, t.name ?? `Tipo ${i + 1}`, t.price ?? 1000, t.capacity, i],
      );
      out.push({ id: r.rows[0].id, price: t.price ?? 1000, capacity: t.capacity });
    }
    return { eventId, slug, types: out };
  });
}

export const buyer = { name: "Sofía Test", email: "sofia@example.com", dni: "35123456" };

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { createEvent, newClient, type Fixture } from "./helpers/fixtures";

/** Corre una consulta como el rol `anon` (lo que vería alguien con la anon key de Supabase). */
async function asAnon(c: pg.Client, sql: string, params: unknown[] = []) {
  await c.query("begin");
  try {
    await c.query("set local role anon");
    return await c.query(sql, params);
  } finally {
    await c.query("rollback");
  }
}

describe("RLS y permisos del público", () => {
  let c: pg.Client;
  let published: Fixture;
  let draft: Fixture;

  beforeAll(async () => {
    published = await createEvent([{ capacity: 10 }]);
    draft = await createEvent([{ capacity: 10 }], { published: false });
    c = newClient();
    await c.connect();
  });
  afterAll(() => c.end());

  it("solo ve eventos publicados", async () => {
    const res = await asAnon(c, "select id from public.events where id = any($1)", [[published.eventId, draft.eventId]]);
    expect(res.rows.map((r) => r.id)).toEqual([published.eventId]);
  });

  it("solo ve tipos de entrada de eventos publicados", async () => {
    const res = await asAnon(c, "select event_id from public.ticket_types where event_id = any($1)", [
      [published.eventId, draft.eventId],
    ]);
    expect(new Set(res.rows.map((r) => r.event_id))).toEqual(new Set([published.eventId]));
  });

  it.each(["orders", "order_items", "tickets", "payments", "contact_messages", "rate_limits", "local_files"])(
    "no puede leer %s",
    async (table) => {
      await expect(asAnon(c, `select * from public.${table} limit 1`)).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("no puede escribir eventos", async () => {
    await expect(
      asAnon(c, "insert into public.events (slug, name, starts_at, venue_name) values ('x', 'x', now(), 'x')"),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("no puede ejecutar las funciones sensibles", async () => {
    await expect(
      asAnon(c, "select public.reserve_order($1, '[]'::jsonb, 'a', 'b', 'c')", [published.eventId]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(asAnon(c, "select public.confirm_order(gen_random_uuid(), 'x', 1)")).rejects.toMatchObject({ code: "42501" });
    await expect(asAnon(c, "select * from public.scan_ticket(gen_random_uuid(), gen_random_uuid())")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("puede consultar la disponibilidad agregada, solo de publicados", async () => {
    const res = await asAnon(c, "select * from public.public_availability($1)", [[published.eventId, draft.eventId]]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ event_id: published.eventId, available: 10 });
  });
});

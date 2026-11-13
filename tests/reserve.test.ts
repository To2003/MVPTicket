import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { ReserveError, reserveOrder } from "@/lib/orders";
import { pool } from "@/lib/db";
import { buyer, createEvent, withClient } from "./helpers/fixtures";

afterAll(() => pool().end());

async function usedOf(ticketTypeId: string) {
  return withClient(async (c) => (await c.query("select public.ticket_type_used($1) as n", [ticketTypeId])).rows[0].n as number);
}

describe("reserva de cupo", () => {
  it("reserva y congela precio y total en la base", async () => {
    const ev = await createEvent([{ price: 12000, capacity: 10 }, { price: 15000, capacity: 5 }]);
    const id = await reserveOrder({
      eventId: ev.eventId,
      items: [
        { ticket_type_id: ev.types[0].id, quantity: 2 },
        { ticket_type_id: ev.types[1].id, quantity: 1 },
      ],
      buyer,
    });
    const order = await withClient(async (c) => (await c.query("select total, status, expires_at from public.orders where id = $1", [id])).rows[0]);
    expect(order.total).toBe(2 * 12000 + 15000);
    expect(order.status).toBe("pending");
    const minutes = (new Date(order.expires_at).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(9);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(await usedOf(ev.types[0].id)).toBe(2);
  });

  it("rechaza si no alcanza el cupo", async () => {
    const ev = await createEvent([{ capacity: 3 }]);
    await reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: 2 }], buyer });
    await expect(
      reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: 2 }], buyer }),
    ).rejects.toMatchObject({ code: "SIN_CUPO", ticketTypeId: ev.types[0].id });
  });

  it("suma líneas repetidas del mismo tipo al chequear cupo", async () => {
    const ev = await createEvent([{ capacity: 3 }]);
    await expect(
      reserveOrder({
        eventId: ev.eventId,
        items: [
          { ticket_type_id: ev.types[0].id, quantity: 2 },
          { ticket_type_id: ev.types[0].id, quantity: 2 },
        ],
        buyer,
      }),
    ).rejects.toBeInstanceOf(ReserveError);
  });

  it("una reserva vencida libera el cupo sola", async () => {
    const ev = await createEvent([{ capacity: 2 }]);
    const id = await reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: 2 }], buyer });
    await withClient((c) => c.query("update public.orders set expires_at = now() - interval '1 second' where id = $1", [id]));
    expect(await usedOf(ev.types[0].id)).toBe(0);
    await expect(
      reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: 2 }], buyer }),
    ).resolves.toBeTypeOf("string");
  });

  it("no deja reservar eventos sin publicar, pasados, ni tipos de otro evento", async () => {
    const draft = await createEvent([{ capacity: 5 }], { published: false });
    const past = await createEvent([{ capacity: 5 }], { startsInDays: -1 });
    const other = await createEvent([{ capacity: 5 }]);
    await expect(reserveOrder({ eventId: draft.eventId, items: [{ ticket_type_id: draft.types[0].id, quantity: 1 }], buyer })).rejects.toMatchObject({ code: "EVENTO_NO_DISPONIBLE" });
    await expect(reserveOrder({ eventId: past.eventId, items: [{ ticket_type_id: past.types[0].id, quantity: 1 }], buyer })).rejects.toMatchObject({ code: "EVENTO_PASADO" });
    await expect(reserveOrder({ eventId: other.eventId, items: [{ ticket_type_id: draft.types[0].id, quantity: 1 }], buyer })).rejects.toMatchObject({ code: "TIPO_INVALIDO" });
    await expect(reserveOrder({ eventId: other.eventId, items: [{ ticket_type_id: other.types[0].id, quantity: 0 }], buyer })).rejects.toMatchObject({ code: "CANTIDAD_INVALIDA" });
    await expect(reserveOrder({ eventId: other.eventId, items: [], buyer })).rejects.toMatchObject({ code: "ITEMS_INVALIDOS" });
  });

  it("CONCURRENCIA: 50 compras simultáneas contra cupo 20 → exactamente 20 OK", async () => {
    const ev = await createEvent([{ capacity: 20 }]);
    // Cada intento usa su propia conexión, así las transacciones compiten de verdad.
    const attempts = Array.from({ length: 50 }, async () => {
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      try {
        await c.query("select public.reserve_order($1, $2::jsonb, 'A', 'a@example.com', '30111222')", [
          ev.eventId,
          JSON.stringify([{ ticket_type_id: ev.types[0].id, quantity: 1 }]),
        ]);
        return "ok";
      } catch (err) {
        return (err as Error).message.startsWith("SIN_CUPO") ? "sin_cupo" : `error: ${(err as Error).message}`;
      } finally {
        await c.end();
      }
    });
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(20);
    expect(results.filter((r) => r === "sin_cupo")).toHaveLength(30);
    expect(await usedOf(ev.types[0].id)).toBe(20);
  });

  it("CONCURRENCIA: compras de varios tipos cruzados no se bloquean entre sí (sin deadlocks) ni sobrevenden", async () => {
    const ev = await createEvent([{ capacity: 15 }, { capacity: 15 }]);
    const [a, b] = ev.types;
    const attempts = Array.from({ length: 40 }, async (_, i) => {
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      // La mitad pide A+B y la otra mitad B+A (orden inverso): sin el lock ordenado habría deadlocks.
      const items = i % 2 === 0
        ? [{ ticket_type_id: a.id, quantity: 1 }, { ticket_type_id: b.id, quantity: 1 }]
        : [{ ticket_type_id: b.id, quantity: 1 }, { ticket_type_id: a.id, quantity: 1 }];
      try {
        await c.query("select public.reserve_order($1, $2::jsonb, 'A', 'a@example.com', '30111222')", [ev.eventId, JSON.stringify(items)]);
        return "ok";
      } catch (err) {
        return (err as Error).message.startsWith("SIN_CUPO") ? "sin_cupo" : `error: ${(err as Error).message}`;
      } finally {
        await c.end();
      }
    });
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r.startsWith("error"))).toEqual([]);
    expect(results.filter((r) => r === "ok")).toHaveLength(15);
    expect(await usedOf(a.id)).toBe(15);
    expect(await usedOf(b.id)).toBe(15);
  });
});

import { afterAll, describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { pool } from "@/lib/db";
import { SaveEventError, saveEvent, getAdminEvent, voidTicket, renameTicket } from "@/lib/data/admin";
import { reserveOrder } from "@/lib/orders";
import { confirmDemoPayment } from "@/lib/payments";
import { buyer, withClient } from "./helpers/fixtures";

afterAll(() => pool().end());

describe("CSV para Excel", () => {
  it("usa ; con BOM y escapa comillas, ; y saltos", () => {
    const csv = toCsv(["a", "b"], [["hola; chau", 'dijo "hola"'], ["línea\nnueva", 3]]);
    expect(csv.startsWith("﻿a;b\r\n")).toBe(true);
    expect(csv).toContain('"hola; chau";"dijo ""hola"""');
    expect(csv).toContain('"línea\nnueva";3');
  });
  it("neutraliza fórmulas (CSV injection)", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+54911")).toBe("'+54911");
    expect(csvCell("@algo")).toBe("'@algo");
    expect(csvCell("Sofía")).toBe("Sofía");
  });
});

describe("ABM de eventos y entradas (admin)", () => {
  const base = {
    name: "Evento admin",
    description: "",
    startsAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    venueName: "Lugar",
    venueAddress: "",
    isPublished: true,
  };

  it("crea, edita cupo/precio y no deja bajar el cupo por debajo de lo vendido", async () => {
    const slug = `admin-${Date.now()}`;
    const id = await saveEvent({ ...base, slug, ticketTypes: [{ name: "General", price: 1000, capacity: 5 }] });
    const ev = await getAdminEvent(id);
    const tt = ev!.ticketTypes[0];
    const orderId = await reserveOrder({ eventId: id, items: [{ ticket_type_id: tt.id, quantity: 3 }], buyer });
    await confirmDemoPayment(orderId, { sendEmail: async () => ({ id: "x", transport: "console" }) });

    await saveEvent({ ...base, id, slug, ticketTypes: [{ id: tt.id, name: "General", price: 1500, capacity: 10 }] });
    expect((await getAdminEvent(id))!.ticketTypes[0]).toMatchObject({ price: 1500, capacity: 10, used: 3 });

    await expect(
      saveEvent({ ...base, id, slug, ticketTypes: [{ id: tt.id, name: "General", price: 1500, capacity: 2 }] }),
    ).rejects.toBeInstanceOf(SaveEventError);
    await expect(saveEvent({ ...base, id, slug, ticketTypes: [{ name: "Otro", price: 1, capacity: 1 }] })).rejects.toThrow(/ya tiene ventas/);
    // El precio de la orden ya hecha no cambia.
    const total = await withClient(async (c) => (await c.query("select total from public.orders where id = $1", [orderId])).rows[0].total);
    expect(total).toBe(3000);
  });

  it("no permite slugs repetidos", async () => {
    const slug = `dup-${Date.now()}`;
    await saveEvent({ ...base, slug, ticketTypes: [{ name: "General", price: 1000, capacity: 5 }] });
    await expect(saveEvent({ ...base, slug, ticketTypes: [{ name: "General", price: 1000, capacity: 5 }] })).rejects.toThrow(/slug/);
  });

  it("cambia el titular y anula (y una anulada ya no se puede renombrar)", async () => {
    const slug = `tk-${Date.now()}`;
    const id = await saveEvent({ ...base, slug, ticketTypes: [{ name: "General", price: 1000, capacity: 5 }] });
    const tt = (await getAdminEvent(id))!.ticketTypes[0];
    const orderId = await reserveOrder({ eventId: id, items: [{ ticket_type_id: tt.id, quantity: 1 }], buyer });
    await confirmDemoPayment(orderId, { sendEmail: async () => ({ id: "x", transport: "console" }) });
    const ticketId = await withClient(async (c) => (await c.query("select id from public.tickets where order_id = $1", [orderId])).rows[0].id);
    expect(await renameTicket(ticketId, "Juan Nuevo")).toBe(orderId);
    expect(await voidTicket(ticketId)).toBe(orderId);
    expect(await voidTicket(ticketId)).toBeNull();
    expect(await renameTicket(ticketId, "Otro")).toBeNull();
  });
});

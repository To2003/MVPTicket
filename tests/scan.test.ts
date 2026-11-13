import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { reserveOrder } from "@/lib/orders";
import { confirmDemoPayment } from "@/lib/payments";
import { gateStats, scanInput } from "@/lib/scan";
import { signTicketToken } from "@/lib/tickets";
import { voidTicket } from "@/lib/data/admin";
import { buyer, createEvent, withClient, type Fixture } from "./helpers/fixtures";

afterAll(() => pool().end());

const noMail = { sendEmail: async () => ({ id: "x", transport: "console" as const }) };
const secret = () => process.env.TICKET_HMAC_SECRET!;

async function ticketsFor(ev: Fixture, qty: number) {
  const orderId = await reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: qty }], buyer });
  await confirmDemoPayment(orderId, noMail);
  return withClient(async (c) => (await c.query<{ id: string; code: string }>("select id, code from public.tickets where order_id = $1 order by seq", [orderId])).rows);
}

describe("escáner de puerta", () => {
  let ev: Fixture;
  let other: Fixture;
  beforeAll(async () => {
    ev = await createEvent([{ capacity: 50, name: "General" }]);
    other = await createEvent([{ capacity: 50 }]);
  });

  it("verde la primera vez, amarillo (con hora) la segunda", async () => {
    const [t] = await ticketsFor(ev, 1);
    const token = signTicketToken(t.id, secret());
    const first = await scanInput(token, ev.eventId);
    expect(first).toMatchObject({ result: "ok", holderName: buyer.name, ticketTypeName: "General" });
    const second = await scanInput(token, ev.eventId);
    expect(second.result).toBe("used");
    expect(second.usedAt).toBeTruthy();
  });

  it("acepta el link completo /entrada/<token> y el código corto tipeado a mano", async () => {
    const [a, b] = await ticketsFor(ev, 2);
    expect((await scanInput(`https://algolindo.com/entrada/${signTicketToken(a.id, secret())}`, ev.eventId)).result).toBe("ok");
    expect((await scanInput(b.code.toLowerCase().replace(/-/g, " "), ev.eventId)).result).toBe("ok");
  });

  it("rojo si es inválida, trucha, anulada o de otro evento", async () => {
    const [a, b] = await ticketsFor(ev, 2);
    expect((await scanInput("cualquier-cosa", ev.eventId)).result).toBe("invalid");
    expect((await scanInput("ZZZ-ZZZZ-ZZZ", ev.eventId)).result).toBe("invalid");
    const forged = signTicketToken(a.id, "otro-secreto-de-al-menos-32-caracteres!!");
    expect((await scanInput(forged, ev.eventId)).result).toBe("invalid");
    await voidTicket(b.id);
    expect((await scanInput(signTicketToken(b.id, secret()), ev.eventId)).result).toBe("void");
    expect((await scanInput(signTicketToken(a.id, secret()), other.eventId)).result).toBe("wrong_event");
    // y la de otro evento no quedó marcada como usada
    expect((await scanInput(signTicketToken(a.id, secret()), ev.eventId)).result).toBe("ok");
  });

  it("CONCURRENCIA: el mismo QR leído por 8 celulares a la vez → un solo OK", async () => {
    const [t] = await ticketsFor(ev, 1);
    const token = signTicketToken(t.id, secret());
    const results = await Promise.all(Array.from({ length: 8 }, () => scanInput(token, ev.eventId)));
    expect(results.filter((r) => r.result === "ok")).toHaveLength(1);
    expect(results.filter((r) => r.result === "used")).toHaveLength(7);
  });

  it("cuenta ingresados / total (sin anuladas)", async () => {
    const fresh = await createEvent([{ capacity: 10 }]);
    const ts = await ticketsFor(fresh, 3);
    await voidTicket(ts[2].id);
    await scanInput(ts[0].code, fresh.eventId);
    expect(await gateStats(fresh.eventId)).toEqual({ used: 1, total: 2 });
  });
});

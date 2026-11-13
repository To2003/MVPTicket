import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import type { EmailMessage } from "@/lib/email/send";
import type { MpGateway, MpPayment } from "@/lib/mercadopago";
import { reserveOrder } from "@/lib/orders";
import { confirmDemoPayment, processPayment } from "@/lib/payments";
import { buyer, createEvent, withClient } from "./helpers/fixtures";

afterAll(() => pool().end());

/** Fake de la API de MP: devuelve el estado "actual" que le cargamos. */
function fakeMp() {
  const payments = new Map<string, MpPayment>();
  let calls = 0;
  const gateway: MpGateway = {
    async getPayment(id) {
      calls++;
      const p = payments.get(id);
      if (!p) throw new Error("404 payment not found");
      return p;
    },
    async createPreference() {
      throw new Error("no usado");
    },
  };
  return {
    gateway,
    calls: () => calls,
    set(id: string, data: Partial<MpPayment> & { externalReference: string | null; amount: number }) {
      payments.set(id, { id, status: "approved", statusDetail: null, currency: "ARS", raw: { id }, ...data });
    },
  };
}

function inbox() {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send: async (m: EmailMessage) => {
      sent.push(m);
      return { id: `t-${sent.length}`, transport: "console" as const };
    },
  };
}

async function newOrder(qty = 2, capacity = 10, price = 5000) {
  const ev = await createEvent([{ capacity, price }]);
  const orderId = await reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: qty }], buyer });
  return { ev, orderId, total: qty * price };
}

const countTickets = (orderId: string) =>
  withClient(async (c) => Number((await c.query("select count(*) from public.tickets where order_id = $1", [orderId])).rows[0].count));
const orderRow = (orderId: string) =>
  withClient(async (c) => (await c.query("select status, paid_payment_id, email_sent_at from public.orders where id = $1", [orderId])).rows[0]);

let mp: ReturnType<typeof fakeMp>;
let mail: ReturnType<typeof inbox>;
beforeEach(() => {
  mp = fakeMp();
  mail = inbox();
});

describe("confirmación de pagos (webhook / back_urls)", () => {
  it("pago aprobado → orden paga, una entrada por unidad, un mail con los QR", async () => {
    const { orderId, total } = await newOrder(3);
    mp.set("1001", { externalReference: orderId, amount: total });
    const r = await processPayment("1001", { mp: mp.gateway, sendEmail: mail.send });
    expect(r.outcome).toBe("confirmed");
    expect(await countTickets(orderId)).toBe(3);
    expect((await orderRow(orderId)).status).toBe("paid");
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(buyer.email);
    expect(mail.sent[0].attachments).toHaveLength(3);
    expect(mail.sent[0].html).toContain("/entrada/");
  });

  it("IDEMPOTENCIA: el mismo aviso 2 veces no duplica entradas ni mails", async () => {
    const { orderId, total } = await newOrder(2);
    mp.set("1002", { externalReference: orderId, amount: total });
    const a = await processPayment("1002", { mp: mp.gateway, sendEmail: mail.send });
    const b = await processPayment("1002", { mp: mp.gateway, sendEmail: mail.send });
    expect([a.outcome, b.outcome]).toEqual(["confirmed", "already_paid"]);
    expect(await countTickets(orderId)).toBe(2);
    expect(mail.sent).toHaveLength(1);
  });

  it("IDEMPOTENCIA: 10 avisos del mismo pago EN PARALELO → una sola confirmación", async () => {
    const { orderId, total } = await newOrder(4);
    mp.set("1003", { externalReference: orderId, amount: total });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => processPayment("1003", { mp: mp.gateway, sendEmail: mail.send })),
    );
    expect(results.filter((r) => r.outcome === "confirmed")).toHaveLength(1);
    expect(results.filter((r) => r.outcome === "already_paid")).toHaveLength(9);
    expect(await countTickets(orderId)).toBe(4);
    expect(mail.sent).toHaveLength(1);
  });

  it("NO confía en el aviso: usa lo que dice la API de MP (pendiente → no confirma)", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1004", { externalReference: orderId, amount: total, status: "in_process" });
    const r = await processPayment("1004", { mp: mp.gateway, sendEmail: mail.send });
    expect(r.outcome).toBe("ignored");
    expect((await orderRow(orderId)).status).toBe("pending");
    expect(mp.calls()).toBe(1);
  });

  it("FUERA DE ORDEN: llega 'pendiente' después de 'aprobado' → la orden sigue paga", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1005", { externalReference: orderId, amount: total, status: "approved" });
    await processPayment("1005", { mp: mp.gateway, sendEmail: mail.send });
    // MP reintenta un aviso viejo, pero la API igual devuelve el estado actual...
    const again = await processPayment("1005", { mp: mp.gateway, sendEmail: mail.send });
    expect(again.outcome).toBe("already_paid");
    // ...y aunque un pago distinto de la misma orden venga rechazado, no se toca nada.
    mp.set("1006", { externalReference: orderId, amount: total, status: "rejected" });
    expect((await processPayment("1006", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("ignored");
    expect((await orderRow(orderId)).status).toBe("paid");
    expect(await countTickets(orderId)).toBe(2);
  });

  it("monto distinto al de la orden → no confirma", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1007", { externalReference: orderId, amount: total - 1 });
    expect((await processPayment("1007", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("amount_mismatch");
    expect((await orderRow(orderId)).status).toBe("pending");
    expect(await countTickets(orderId)).toBe(0);
  });

  it("moneda distinta o referencia inexistente → no confirma", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1008", { externalReference: orderId, amount: total, currency: "USD" });
    expect((await processPayment("1008", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("currency_mismatch");
    mp.set("1009", { externalReference: "00000000-0000-4000-8000-000000000000", amount: total });
    expect((await processPayment("1009", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("invalid_reference");
    mp.set("1010", { externalReference: "'; drop table orders; --", amount: total });
    expect((await processPayment("1010", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("invalid_reference");
  });

  it("TARDE con cupo: la reserva venció pero todavía hay lugar → se confirma", async () => {
    const { orderId, total } = await newOrder(2, 10);
    await withClient((c) => c.query("update public.orders set expires_at = now() - interval '1 hour' where id = $1", [orderId]));
    mp.set("1011", { externalReference: orderId, amount: total });
    expect((await processPayment("1011", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("confirmed");
    expect(await countTickets(orderId)).toBe(2);
  });

  it("TARDE sin cupo: la reserva venció y otro se llevó el lugar → needs_refund, sin entradas", async () => {
    const { ev, orderId, total } = await newOrder(2, 2);
    await withClient((c) => c.query("update public.orders set expires_at = now() - interval '1 hour' where id = $1", [orderId]));
    await reserveOrder({ eventId: ev.eventId, items: [{ ticket_type_id: ev.types[0].id, quantity: 2 }], buyer });
    mp.set("1012", { externalReference: orderId, amount: total });
    const r = await processPayment("1012", { mp: mp.gateway, sendEmail: mail.send });
    expect(r.outcome).toBe("no_stock");
    expect((await orderRow(orderId)).status).toBe("needs_refund");
    expect(await countTickets(orderId)).toBe(0);
    expect(mail.sent).toHaveLength(0);
    // Y repetir el aviso no cambia nada.
    expect((await processPayment("1012", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("no_stock");
  });

  it("segundo pago aprobado distinto para la misma orden → duplicate_payment (devolución manual)", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1013", { externalReference: orderId, amount: total });
    mp.set("1014", { externalReference: orderId, amount: total });
    await processPayment("1013", { mp: mp.gateway, sendEmail: mail.send });
    expect((await processPayment("1014", { mp: mp.gateway, sendEmail: mail.send })).outcome).toBe("duplicate_payment");
    expect((await orderRow(orderId)).paid_payment_id).toBe("1013");
    expect(await countTickets(orderId)).toBe(2);
  });

  it("si el mail falla, la orden queda paga y el mail se reintenta en el próximo aviso", async () => {
    const { orderId, total } = await newOrder();
    mp.set("1015", { externalReference: orderId, amount: total });
    const failing = async () => {
      throw new Error("smtp caído");
    };
    await expect(processPayment("1015", { mp: mp.gateway, sendEmail: failing })).rejects.toThrow("smtp caído");
    expect((await orderRow(orderId)).status).toBe("paid");
    expect((await orderRow(orderId)).email_sent_at).toBeNull();
    const r = await processPayment("1015", { mp: mp.gateway, sendEmail: mail.send });
    expect(r.outcome).toBe("already_paid");
    expect(mail.sent).toHaveLength(1);
    expect(await countTickets(orderId)).toBe(2);
  });

  it("si la API de MP falla, tira error (el webhook responde 500 para que MP reintente)", async () => {
    await expect(processPayment("no-existe", { mp: mp.gateway, sendEmail: mail.send })).rejects.toThrow();
  });
});

describe("modo demo", () => {
  it("'Simular pago aprobado' usa el mismo flujo y es idempotente (doble click)", async () => {
    const { orderId } = await newOrder(2);
    const [a, b] = await Promise.all([
      confirmDemoPayment(orderId, { sendEmail: mail.send }),
      confirmDemoPayment(orderId, { sendEmail: mail.send }),
    ]);
    expect([a, b].sort()).toEqual(["already_paid", "confirmed"]);
    expect(await countTickets(orderId)).toBe(2);
    expect(mail.sent).toHaveLength(1);
  });

  it("no funciona con DEMO_MODE=false", async () => {
    const { orderId } = await newOrder();
    process.env.DEMO_MODE = "false";
    try {
      await expect(confirmDemoPayment(orderId, { sendEmail: mail.send })).rejects.toThrow();
    } finally {
      process.env.DEMO_MODE = "true";
    }
  });
});

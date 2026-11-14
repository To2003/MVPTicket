/**
 * npm run seed — borra y recarga los datos de ejemplo.
 * No toca usuarios de Supabase Auth salvo crear el admin de prueba si no existe.
 */
import pg from "pg";
import { pgConfig } from "../src/lib/pg-config";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv, EMBEDDED_DATA_DIR } from "./lib/env";
import { ensureDatabase } from "./lib/embedded-pg";
import { runMigrations } from "./lib/migrations";

const FIRST = ["Sofía", "Martina", "Valentina", "Camila", "Lucía", "Julieta", "Agustina", "Florencia", "Micaela", "Paula", "Carolina", "Rocío", "Milagros", "Belén", "Lautaro", "Tomás", "Joaquín", "Matías", "Facundo", "Nicolás", "Santiago", "Federico", "Gonzalo", "Ignacio", "Juan Cruz", "Franco", "Bruno", "Ezequiel", "Malena", "Abril", "Delfina", "Pilar", "Renata", "Bautista", "Thiago", "Lorenzo"];
const LAST = ["González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "Gómez", "Díaz", "Sosa", "Romero", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Benítez", "Acosta", "Medina", "Herrera", "Aguirre", "Pereyra", "Gutiérrez", "Giménez", "Molina", "Silva", "Castro", "Rojas", "Ortiz", "Núñez", "Luna", "Juárez", "Cabrera", "Ríos", "Morales", "Godoy", "Ferreyra"];

let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".");

function person(n: number) {
  const first = pick(FIRST);
  const last = pick(LAST);
  return {
    name: `${first} ${last}`,
    email: `${slugify(first)}.${slugify(last)}${n % 7 === 0 ? n : ""}@example.com`,
    dni: String(between(28_000_000, 46_999_999)),
  };
}

/** Sábado a `minDays` días o más, a la hora indicada (hora argentina, UTC-3). */
function saturdayAt(minDays: number, hourArt: number): Date {
  const d = new Date(Date.now() + minDays * 86_400_000);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hourArt + 3, 0, 0));
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

type Client = pg.Client;
let paymentSeq = 1000;

async function insertEvent(c: Client, e: { slug: string; name: string; description: string; flyer: string; startsAt: Date; venue: string; address: string }) {
  const res = await c.query<{ id: string }>(
    `insert into public.events (slug, name, description, flyer_path, starts_at, venue_name, venue_address, is_published, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, true, now() - interval '30 days') returning id`,
    [e.slug, e.name, e.description, e.flyer, e.startsAt, e.venue, e.address],
  );
  return res.rows[0].id;
}

async function insertType(c: Client, eventId: string, name: string, price: number, capacity: number, sort: number) {
  const res = await c.query<{ id: string }>(
    "insert into public.ticket_types (event_id, name, price, capacity, sort_order) values ($1, $2, $3, $4, $5) returning id",
    [eventId, name, price, capacity, sort],
  );
  return { id: res.rows[0].id, price };
}

/** Crea una orden y la confirma con la misma función que usa el webhook. */
async function paidOrder(
  c: Client,
  eventId: string,
  items: Array<{ type: { id: string; price: number }; qty: number }>,
  buyer: ReturnType<typeof person>,
  paidAt: Date,
) {
  const total = items.reduce((a, i) => a + i.type.price * i.qty, 0);
  const o = await c.query<{ id: string }>(
    `insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, expires_at)
     values ($1, $2, $3, $4, $5, now() + interval '10 minutes') returning id`,
    [eventId, buyer.name, buyer.email, buyer.dni, total],
  );
  const orderId = o.rows[0].id;
  for (const i of items) {
    await c.query("insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values ($1, $2, $3, $4)", [
      orderId,
      i.type.id,
      i.qty,
      i.type.price,
    ]);
  }
  const paymentId = `seed-${paymentSeq++}`;
  const r = await c.query<{ result: string }>("select public.confirm_order($1, $2, $3) as result", [orderId, paymentId, total]);
  if (r.rows[0].result !== "confirmed") throw new Error(`confirm_order devolvió ${r.rows[0].result}`);
  await c.query(
    `update public.orders set created_at = $2::timestamptz - interval '3 minutes', paid_at = $2, expires_at = $2::timestamptz + interval '7 minutes', email_sent_at = $2 where id = $1`,
    [orderId, paidAt],
  );
  await c.query("update public.tickets set created_at = $2 where order_id = $1", [orderId, paidAt]);
  await c.query(
    `insert into public.payments (mp_payment_id, order_id, status, amount, outcome, raw, created_at)
     values ($1, $2, 'approved', $3, 'confirmed', '{"seed": true}', $4)`,
    [paymentId, orderId, total, paidAt],
  );
  return orderId;
}

async function main() {
  loadEnv();
  const url = requireEnv("DATABASE_URL");
  const db = await ensureDatabase(url, EMBEDDED_DATA_DIR);
  const c = new pg.Client(pgConfig(url));
  try {
    await runMigrations(url, { quiet: true });
    await c.connect();
    await c.query("begin");
    console.log("▸ Borrando datos anteriores…");
    await c.query(`truncate public.tickets, public.payments, public.order_items, public.orders, public.ticket_types,
      public.events, public.contact_messages, public.gallery_photos, public.rate_limits, public.local_files restart identity cascade`);

    // ---------- Eventos ----------
    console.log("▸ Eventos…");
    const vinilos = await insertEvent(c, {
      slug: "noche-de-vinilos-y-vermu",
      name: "Noche de Vinilos & Vermú",
      description:
        "La séptima edición de nuestro ciclo más mimado. DJs que pasan solo vinilos (funk, disco, soul y algún clásico nacional), barra de vermú de autor y la terraza abierta hasta tarde.\n\nVení temprano: de 21 a 22 hs el primer vermú va por la casa. Mayores de 18. Se puede ir de a uno, te vas a ir con amigos nuevos.",
      flyer: "/seed/flyers/noche-de-vinilos.svg",
      startsAt: saturdayAt(18, 21),
      venue: "Club Atlético Fernández Fierro",
      address: "Sánchez de Bustamante 772, Almagro, CABA",
    });
    const vAnticipada = await insertType(c, vinilos, "Anticipada", 12000, 80, 0);
    const vGeneral = await insertType(c, vinilos, "General", 15000, 150, 1);

    const cumbia = await insertEvent(c, {
      slug: "cumbia-en-la-terraza",
      name: "Cumbia en la Terraza",
      description:
        "Arrancamos con el atardecer y terminamos cuando el cuerpo diga basta. Banda de cumbia en vivo, DJ con lo mejor de la tropical y una terraza con vista a toda la ciudad.\n\nCupo súper limitado porque queremos que se baile cómodo. Si llueve, nos mudamos al salón de abajo (la fiesta no se suspende).",
      flyer: "/seed/flyers/cumbia-en-la-terraza.svg",
      startsAt: saturdayAt(8, 18),
      venue: "Terraza Konex",
      address: "Sarmiento 3131, Abasto, CABA",
    });
    const cGeneral = await insertType(c, cumbia, "General", 10000, 120, 0);

    const primavera = await insertEvent(c, {
      slug: "fiesta-de-primavera",
      name: "Fiesta de Primavera",
      description:
        "Recibimos la primavera al aire libre con DJs invitados, flores por todos lados y mucho glitter. Fue una noche hermosa: gracias a todos los que vinieron.",
      flyer: "/seed/flyers/fiesta-de-primavera.svg",
      startsAt: (() => {
        const d = daysAgo(55);
        while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() - 1);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 22 + 3 - 24, 0, 0) + 86_400_000);
      })(),
      venue: "Jardín de la Casa Nacional del Bicentenario",
      address: "Riobamba 985, Recoleta, CABA",
    });
    const pGeneral = await insertType(c, primavera, "General", 9000, 200, 0);

    // ---------- Órdenes ----------
    console.log("▸ Órdenes y entradas…");
    let n = 1;
    // Cumbia: 117 de 120 vendidas (casi agotado)
    let left = 117;
    while (left > 0) {
      const qty = Math.min(left, between(1, 4));
      left -= qty;
      await paidOrder(c, cumbia, [{ type: cGeneral, qty }], person(n++), daysAgo(between(1, 25)));
    }
    // Vinilos: ventas moderadas en los dos tipos
    for (let i = 0; i < 18; i++) {
      const items = [{ type: vAnticipada, qty: between(1, 3) }];
      if (i % 4 === 0) items.push({ type: vGeneral, qty: between(1, 2) });
      await paidOrder(c, vinilos, items, person(n++), daysAgo(between(1, 20)));
    }
    // Primavera (pasado): vendidas y casi todas usadas en la puerta
    const primaveraOrders: string[] = [];
    for (let i = 0; i < 26; i++) {
      primaveraOrders.push(await paidOrder(c, primavera, [{ type: pGeneral, qty: between(1, 4) }], person(n++), daysAgo(between(58, 80))));
    }
    await c.query(
      `update public.tickets t set status = 'used',
         used_at = e.starts_at + (random() * interval '150 minutes')
       from public.events e
       where t.event_id = e.id and e.id = $1 and random() < 0.9`,
      [primavera],
    );

    // Una entrada anulada (devolución manual) para que se vea el estado
    await c.query(
      `update public.tickets set status = 'void', voided_at = now() - interval '2 days'
       where id = (select id from public.tickets where event_id = $1 order by created_at limit 1)`,
      [vinilos],
    );

    // Pago aprobado que llegó tarde y sin cupo → needs_refund (D15)
    const late = person(n++);
    const lateOrder = await c.query<{ id: string }>(
      `insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, status, expires_at, paid_payment_id, paid_at, created_at)
       values ($1, $2, $3, $4, $5, 'needs_refund', now() - interval '2 days', 'seed-late-1', now() - interval '2 days' + interval '25 minutes', now() - interval '2 days' - interval '10 minutes')
       returning id`,
      [cumbia, late.name, late.email, late.dni, 4 * 10000],
    );
    await c.query("insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values ($1, $2, 4, 10000)", [lateOrder.rows[0].id, cGeneral.id]);
    await c.query(
      `insert into public.payments (mp_payment_id, order_id, status, amount, outcome, raw) values ('seed-late-1', $1, 'approved', 40000, 'no_stock', '{"seed": true}')`,
      [lateOrder.rows[0].id],
    );

    // Reserva vencida que nunca se pagó
    const ghost = person(n++);
    const ghostOrder = await c.query<{ id: string }>(
      `insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, total, expires_at, created_at)
       values ($1, $2, $3, $4, 24000, now() - interval '1 day', now() - interval '1 day' - interval '10 minutes') returning id`,
      [vinilos, ghost.name, ghost.email, ghost.dni],
    );
    await c.query("insert into public.order_items (order_id, ticket_type_id, quantity, unit_price) values ($1, $2, 2, 12000)", [ghostOrder.rows[0].id, vAnticipada.id]);

    // ---------- Galería ----------
    console.log("▸ Galería…");
    const captions = [
      "Fiesta de Primavera · septiembre",
      "Noche de Vinilos · edición 6",
      "Cumbia en la Terraza · marzo",
      "Cumple de 30 de Meli",
      "Noche de Vinilos · edición 5",
      "Fiesta de fin de año 2025",
    ];
    for (let i = 0; i < 6; i++) {
      await c.query("insert into public.gallery_photos (image_url, caption, sort_order) values ($1, $2, $3)", [
        `/seed/galeria/foto-${i + 1}.svg`,
        captions[i],
        i,
      ]);
    }

    // ---------- Consultas ----------
    console.log("▸ Consultas de contacto…");
    await c.query(
      `insert into public.contact_messages (name, email, event_type, estimated_date, message, is_read, created_at) values
       ($1, $2, 'cumpleanos', $3, $4, false, now() - interval '5 hours'),
       ($5, $6, 'privado', $7, $8, true, now() - interval '3 days')`,
      [
        "Delfina Acosta",
        "delfina.acosta@example.com",
        saturdayAt(40, 21).toISOString().slice(0, 10),
        "¡Hola! Cumplo 30 y quiero hacer algo tipo su Noche de Vinilos pero privado, para unas 60 personas. ¿Tienen lugar o lo hacemos en una terraza? Me encantaría que haya vermú 🙌",
        "Gonzalo Herrera",
        "gonzalo.herrera@example.com",
        saturdayAt(30, 20).toISOString().slice(0, 10),
        "Buenas, trabajo en una agencia de diseño y queremos hacer la fiesta de fin de año del equipo (35 personas). Buscamos algo descontracturado con DJ y barra. ¿Me pasan presupuesto?",
      ],
    );

    await c.query("commit");

    const stats = await c.query<{ events: string; orders: string; tickets: string }>(
      `select (select count(*) from public.events) as events, (select count(*) from public.orders) as orders,
              (select count(*) from public.tickets) as tickets`,
    );
    const s = stats.rows[0];
    console.log(`✓ Seed listo: ${s.events} eventos, ${s.orders} órdenes, ${s.tickets} entradas, 6 fotos, 2 consultas.`);

    await ensureAdminUser();
  } catch (err) {
    await c.query("rollback").catch(() => {});
    throw err;
  } finally {
    await c.end().catch(() => {});
    await db.stop();
  }
}

async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("! No se creó usuario admin: faltan ADMIN_EMAILS o SEED_ADMIN_PASSWORD.");
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(`✓ Admin (modo auth local): ${email} con la contraseña de SEED_ADMIN_PASSWORD en .env.local.`);
    return;
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already/i.test(error.message)) {
    console.log(`! No se pudo crear el admin en Supabase Auth: ${error.message}`);
    return;
  }
  console.log(`✓ Admin en Supabase Auth: ${email} (contraseña = SEED_ADMIN_PASSWORD).`);
}

main().catch((err) => {
  console.error("✗ Falló el seed:", err.message);
  process.exit(1);
});

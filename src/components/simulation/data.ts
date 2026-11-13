/**
 * Datos ficticios de la Simulación. Viven solo en memoria del navegador:
 * nada de esto toca la base, ni manda mails, ni pasa por Mercado Pago.
 */
import type { EventView } from "@/lib/types";

const DAY = 86_400_000;

/** Sábado a `minDays` días o más, a la hora indicada (hora argentina). */
export function saturdayAt(now: number, minDays: number, hourArt: number): string {
  const d = new Date(now + minDays * DAY);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hourArt + 3)).toISOString();
}

export function clientEvents(now: number): EventView[] {
  return [
    {
      id: "sim-vinilos",
      slug: "noche-de-vinilos-y-vermu",
      name: "Noche de Vinilos & Vermú",
      description:
        "La séptima edición de nuestro ciclo más mimado. DJs que pasan solo vinilos, barra de vermú de autor y la terraza abierta hasta tarde.",
      flyerUrl: "/seed/flyers/noche-de-vinilos.svg",
      startsAt: saturdayAt(now, 18, 21),
      venueName: "Club Atlético Fernández Fierro",
      venueAddress: "Sánchez de Bustamante 772, Almagro",
      isPublished: true,
      ticketTypes: [
        { id: "sim-anticipada", name: "Anticipada", price: 12000, capacity: 80, available: 7 },
        { id: "sim-general", name: "General", price: 15000, capacity: 150, available: 96 },
      ],
    },
    {
      id: "sim-cumbia",
      slug: "cumbia-en-la-terraza",
      name: "Cumbia en la Terraza",
      description: "Banda en vivo, DJ y atardecer en la terraza.",
      flyerUrl: "/seed/flyers/cumbia-en-la-terraza.svg",
      startsAt: saturdayAt(now, 8, 18),
      venueName: "Terraza Konex",
      venueAddress: "Sarmiento 3131, Abasto",
      isPublished: true,
      ticketTypes: [{ id: "sim-cumbia-general", name: "General", price: 10000, capacity: 120, available: 3 }],
    },
  ];
}

// ───────────────────────── Recorrido del panel ─────────────────────────

export interface SimTicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  used: number;
}

export interface SimEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  startsAt: string;
  venueName: string;
  venueAddress: string;
  flyerUrl: string | null;
  isPublished: boolean;
  isNew?: boolean;
  ticketTypes: SimTicketType[];
}

export interface SimTicket {
  id: string;
  orderId: string;
  eventId: string;
  ticketTypeName: string;
  price: number;
  holderName: string;
  code: string;
  status: "valid" | "used" | "void";
  usedAt: string | null;
}

export interface SimOrder {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerDni: string;
  status: "paid" | "pending" | "expired" | "needs_refund";
  createdAt: string;
}

export interface SimMessage {
  id: string;
  name: string;
  email: string;
  eventType: "cumpleanos" | "privado" | "otro";
  estimatedDate: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminSimData {
  events: SimEvent[];
  orders: SimOrder[];
  tickets: SimTicket[];
  messages: SimMessage[];
}

const BUYERS: Array<[string, string, string]> = [
  ["Sofía Martínez", "sofi.martinez@example.com", "38456789"],
  ["Lautaro Gómez", "lauti.gomez@example.com", "40112233"],
  ["Camila Fernández", "cami.fernandez@example.com", "37998877"],
  ["Joaquín Pereyra", "joaco.pereyra@example.com", "41234567"],
  ["Valentina Ríos", "vale.rios@example.com", "39876543"],
  ["Tomás Álvarez", "tomi.alvarez@example.com", "36543210"],
  ["Micaela Sosa", "mica.sosa@example.com", "42111222"],
  ["Federico Luna", "fede.luna@example.com", "35222333"],
  ["Delfina Acosta", "delfi.acosta@example.com", "43333444"],
  ["Bruno Herrera", "bruno.herrera@example.com", "34444555"],
];
const CODES = ["K7M-Q9PX-3RT", "8GD-GTAY-GRP", "38X-FM65-HKR", "B4B-QTWB-B9R", "FY8-BKR5-8SZ", "JZW-2CJ4-X3E", "M2N-7VHC-QWE", "P9R-4TLD-ZXA", "H6J-8KMN-RTY", "D3F-5GHJ-UVB", "N8B-2CDE-FGH", "R5T-9YUJ-KLZ", "W2E-6RTY-PQS", "T7Y-3UIO-ASD"];

export function adminData(now: number): AdminSimData {
  const vinilos = saturdayAt(now, 18, 21);
  const cumbia = saturdayAt(now, 8, 18);
  const events: SimEvent[] = [
    {
      id: "ev-cumbia",
      slug: "cumbia-en-la-terraza",
      name: "Cumbia en la Terraza",
      description: "Banda en vivo, DJ y atardecer en la terraza.",
      startsAt: cumbia,
      venueName: "Terraza Konex",
      venueAddress: "Sarmiento 3131, Abasto",
      flyerUrl: "/seed/flyers/cumbia-en-la-terraza.svg",
      isPublished: true,
      ticketTypes: [{ id: "tt-c1", name: "General", price: 10000, capacity: 120, used: 117 }],
    },
    {
      id: "ev-vinilos",
      slug: "noche-de-vinilos-y-vermu",
      name: "Noche de Vinilos & Vermú",
      description: "DJs que pasan solo vinilos, barra de vermú de autor y terraza abierta hasta tarde.",
      startsAt: vinilos,
      venueName: "Club Atlético Fernández Fierro",
      venueAddress: "Sánchez de Bustamante 772, Almagro",
      flyerUrl: "/seed/flyers/noche-de-vinilos.svg",
      isPublished: true,
      ticketTypes: [
        { id: "tt-v1", name: "Anticipada", price: 12000, capacity: 80, used: 73 },
        { id: "tt-v2", name: "General", price: 15000, capacity: 150, used: 41 },
      ],
    },
  ];

  const orders: SimOrder[] = [];
  const tickets: SimTicket[] = [];
  let code = 0;
  BUYERS.forEach(([name, email, dni], i) => {
    const ev = i % 3 === 2 ? events[0] : events[1];
    const tt = ev.ticketTypes[i % ev.ticketTypes.length];
    const id = `ord-${i + 1}`;
    const status: SimOrder["status"] = i === 7 ? "pending" : i === 9 ? "expired" : "paid";
    orders.push({ id, eventId: ev.id, buyerName: name, buyerEmail: email, buyerDni: dni, status, createdAt: new Date(now - (i + 1) * 5.3 * 3600_000).toISOString() });
    if (status !== "paid") return;
    const qty = i === 0 ? 2 : (i % 2) + 1;
    for (let k = 0; k < qty; k++) {
      tickets.push({
        id: `tk-${i + 1}-${k + 1}`,
        orderId: id,
        eventId: ev.id,
        ticketTypeName: tt.name,
        price: tt.price,
        holderName: k === 0 ? name : `Acompañante de ${name.split(" ")[0]}`,
        code: CODES[code++ % CODES.length],
        status: i === 5 && k === 0 ? "void" : "valid",
        usedAt: null,
      });
    }
  });

  const messages: SimMessage[] = [
    {
      id: "msg-1",
      name: "Delfina Acosta",
      email: "delfina.acosta@example.com",
      eventType: "cumpleanos",
      estimatedDate: saturdayAt(now, 40, 21).slice(0, 10),
      message:
        "¡Hola! Cumplo 30 y quiero hacer algo tipo su Noche de Vinilos pero privado, para unas 60 personas. ¿Tienen lugar o lo hacemos en una terraza? Me encantaría que haya vermú 🙌",
      isRead: false,
      createdAt: new Date(now - 5 * 3600_000).toISOString(),
    },
    {
      id: "msg-2",
      name: "Gonzalo Herrera",
      email: "gonzalo.herrera@example.com",
      eventType: "privado",
      estimatedDate: saturdayAt(now, 30, 20).slice(0, 10),
      message: "Buenas, queremos hacer la fiesta de fin de año del equipo (35 personas). Buscamos algo descontracturado con DJ y barra. ¿Me pasan presupuesto?",
      isRead: true,
      createdAt: new Date(now - 3 * DAY).toISOString(),
    },
  ];

  return { events, orders, tickets, messages };
}

export function simEventToView(e: SimEvent): EventView {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    description: e.description,
    flyerUrl: e.flyerUrl,
    startsAt: e.startsAt,
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    isPublished: e.isPublished,
    ticketTypes: e.ticketTypes.map((t) => ({ id: t.id, name: t.name, price: t.price, capacity: t.capacity, available: Math.max(0, t.capacity - t.used) })),
  };
}

export function simEventStats(e: SimEvent) {
  return {
    name: e.name,
    startsAt: e.startsAt,
    isPublished: e.isPublished,
    flyerUrl: e.flyerUrl,
    capacity: e.ticketTypes.reduce((a, t) => a + t.capacity, 0),
    sold: e.ticketTypes.reduce((a, t) => a + t.used, 0),
    reserved: 0,
    revenue: e.ticketTypes.reduce((a, t) => a + t.used * t.price, 0),
  };
}

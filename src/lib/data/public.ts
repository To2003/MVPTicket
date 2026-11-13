import "server-only";
import { asAnon, type Db } from "@/lib/db";
import { publicFileUrl } from "@/lib/storage";
import type { EventView, GalleryPhoto, TicketTypeView } from "@/lib/types";

interface EventRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  flyer_path: string | null;
  starts_at: Date;
  venue_name: string;
  venue_address: string;
  is_published: boolean;
}

const EVENT_COLUMNS =
  "id, slug, name, description, flyer_path, starts_at, venue_name, venue_address, is_published";

async function withTicketTypes(client: Db, rows: EventRow[]): Promise<EventView[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const types = await client.query<{ id: string; event_id: string; name: string; price: number; capacity: number }>(
    `select id, event_id, name, price, capacity from public.ticket_types
     where event_id = any($1) order by sort_order, price`,
    [ids],
  );
  const avail = await client.query<{ ticket_type_id: string; available: number }>(
    "select ticket_type_id, available from public.public_availability($1)",
    [ids],
  );
  const availMap = new Map(avail.rows.map((a) => [a.ticket_type_id, a.available]));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    flyerUrl: publicFileUrl(r.flyer_path),
    startsAt: r.starts_at.toISOString(),
    venueName: r.venue_name,
    venueAddress: r.venue_address,
    isPublished: r.is_published,
    ticketTypes: types.rows
      .filter((t) => t.event_id === r.id)
      .map<TicketTypeView>((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        capacity: t.capacity,
        available: availMap.get(t.id) ?? 0,
      })),
  }));
}

/** Próximos eventos publicados (lectura con rol anon → RLS aplica). */
export async function listUpcomingEvents(): Promise<EventView[]> {
  return asAnon(async (client) => {
    const res = await client.query<EventRow>(
      `select ${EVENT_COLUMNS} from public.events
       where is_published and starts_at > now() order by starts_at asc`,
    );
    return withTicketTypes(client, res.rows);
  });
}

export async function listPastEvents(limit = 6): Promise<EventView[]> {
  return asAnon(async (client) => {
    const res = await client.query<EventRow>(
      `select ${EVENT_COLUMNS} from public.events
       where is_published and starts_at <= now() order by starts_at desc limit $1`,
      [limit],
    );
    return withTicketTypes(client, res.rows);
  });
}

export async function getPublishedEventBySlug(slug: string): Promise<EventView | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  return asAnon(async (client) => {
    const res = await client.query<EventRow>(
      `select ${EVENT_COLUMNS} from public.events where slug = $1 and is_published`,
      [slug],
    );
    const [event] = await withTicketTypes(client, res.rows);
    return event ?? null;
  });
}

export async function listGallery(): Promise<GalleryPhoto[]> {
  return asAnon(async (client) => {
    const res = await client.query<{ id: string; image_url: string; caption: string }>(
      "select id, image_url, caption from public.gallery_photos order by sort_order, id",
    );
    return res.rows.map((r) => ({ id: r.id, imageUrl: r.image_url, caption: r.caption }));
  });
}

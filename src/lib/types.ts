/** Vistas serializables (se pasan de server a client components). Fechas en ISO. */
export interface TicketTypeView {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
}

export interface EventView {
  id: string;
  slug: string;
  name: string;
  description: string;
  flyerUrl: string | null;
  startsAt: string;
  venueName: string;
  venueAddress: string;
  isPublished: boolean;
  ticketTypes: TicketTypeView[];
}

export interface TicketView {
  id: string;
  token: string;
  code: string;
  holderName: string;
  ticketTypeName: string;
  status: "valid" | "used" | "void";
  usedAt: string | null;
}

export type OrderStatus = "pending" | "paid" | "needs_refund";

export interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption: string;
}

export function minPrice(event: Pick<EventView, "ticketTypes">): number | null {
  if (!event.ticketTypes.length) return null;
  return Math.min(...event.ticketTypes.map((t) => t.price));
}

export function totalAvailable(event: Pick<EventView, "ticketTypes">): number {
  return event.ticketTypes.reduce((acc, t) => acc + t.available, 0);
}

export function isPast(event: Pick<EventView, "startsAt">, now = Date.now()): boolean {
  return new Date(event.startsAt).getTime() <= now;
}

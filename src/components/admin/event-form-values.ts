/** Tipos y valores iniciales del formulario de eventos (usables desde server y client). */
export interface TicketTypeDraft {
  key: string;
  id?: string;
  name: string;
  price: string;
  capacity: string;
  /** vendidas + reservadas (solo al editar) */
  used?: number;
}

export interface EventFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  startsAt: string; // valor de <input type="datetime-local"> en hora argentina
  venueName: string;
  venueAddress: string;
  publish: boolean;
  ticketTypes: TicketTypeDraft[];
  flyerUrl?: string | null;
}

let keySeq = 0;
export const newTypeKey = () => `tt-${Date.now()}-${keySeq++}`;

export function emptyEventValues(): EventFormValues {
  return {
    name: "",
    slug: "",
    description: "",
    startsAt: "",
    venueName: "",
    venueAddress: "",
    publish: false,
    ticketTypes: [{ key: newTypeKey(), name: "General", price: "", capacity: "" }],
    flyerUrl: null,
  };
}


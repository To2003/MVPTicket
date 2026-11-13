"use server";

import { query } from "@/lib/db";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { contactSchema, zodFieldErrors, type FieldErrors } from "@/lib/validation";

export interface ContactState {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
}

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = Object.fromEntries(
    ["name", "email", "eventType", "estimatedDate", "message"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = contactSchema.safeParse({ ...values, website: String(formData.get("website") ?? "") });
  if (!parsed.success) {
    return { ok: false, errors: zodFieldErrors(parsed.error), values, message: "Revisá los campos marcados." };
  }
  const allowed = await rateLimit("contact", await clientIp(), LIMITS.contact.limit, LIMITS.contact.window);
  if (!allowed) {
    return { ok: false, values, message: "Mandaste muchos mensajes seguidos. Probá en un rato o escribinos por WhatsApp." };
  }
  const d = parsed.data;
  await query(
    `insert into public.contact_messages (name, email, event_type, estimated_date, message)
     values ($1, $2, $3, $4, $5)`,
    [d.name, d.email, d.eventType, d.estimatedDate, d.message],
  );
  return { ok: true, message: `¡Gracias, ${d.name.split(" ")[0]}! Te respondemos en menos de 48 horas.` };
}

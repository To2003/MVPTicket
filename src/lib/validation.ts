import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const buyerSchema = z.object({
  name: trimmed(80).min(3, "Poné tu nombre y apellido"),
  email: z.string().trim().toLowerCase().email("Ese mail no parece válido").max(120),
  dni: z
    .string()
    .trim()
    .transform((v) => v.replace(/[.\s-]/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números, sin puntos")),
});

export const uuidSchema = z.string().uuid();

/** "id:qty,id:qty" → [{ticket_type_id, quantity}] */
export const selectionSchema = z
  .string()
  .max(2000)
  .transform((raw, ctx) => {
    const items = raw
      .split(",")
      .filter(Boolean)
      .map((pair) => {
        const [id, q] = pair.split(":");
        return { ticket_type_id: id, quantity: Number(q) };
      });
    if (!items.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No elegiste entradas" });
      return z.NEVER;
    }
    return items;
  })
  .pipe(
    z
      .array(z.object({ ticket_type_id: uuidSchema, quantity: z.number().int().min(1).max(20) }))
      .min(1)
      .max(10),
  );

export const contactSchema = z.object({
  name: trimmed(80).min(2, "¿Cómo te llamás?"),
  email: z.string().trim().toLowerCase().email("Ese mail no parece válido").max(120),
  eventType: z.enum(["cumpleanos", "privado", "otro"], { errorMap: () => ({ message: "Elegí un tipo de evento" }) }),
  estimatedDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida"),
  message: trimmed(2000).min(10, "Contanos un poquito más (mínimo 10 caracteres)"),
  // honeypot anti-bots: tiene que venir vacío
  website: z.string().max(0).optional(),
});

export const CONTACT_EVENT_LABELS: Record<"cumpleanos" | "privado" | "otro", string> = {
  cumpleanos: "Cumpleaños",
  privado: "Evento privado",
  otro: "Otro",
};

export type FieldErrors = Record<string, string | undefined>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

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

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const intFromString = (label: string, min: number, max: number) =>
  z.union([z.number(), z.string()]).transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/[.\s$]/g, ""));
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: tiene que ser un número entre ${min} y ${max.toLocaleString("es-AR")}` });
      return z.NEVER;
    }
    return n;
  });

export const eventFormSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(3, "Poné un nombre de al menos 3 letras").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug solo puede tener minúsculas, números y guiones"),
  description: z.string().trim().max(5000).default(""),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Elegí fecha y hora"),
  venueName: z.string().trim().min(2, "¿Dónde es?").max(120),
  venueAddress: z.string().trim().max(200).default(""),
  publish: z.boolean().optional(),
  ticketTypes: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        name: z.string().trim().min(1, "Cada tipo de entrada necesita un nombre").max(60),
        price: intFromString("Precio", 1, 10_000_000),
        capacity: intFromString("Cupo", 0, 100_000),
      }),
    )
    .min(1, "Agregá al menos un tipo de entrada")
    .max(10),
});

export type EventFormInput = z.input<typeof eventFormSchema>;

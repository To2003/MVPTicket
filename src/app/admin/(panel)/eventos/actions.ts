"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SaveEventError, saveEvent, setEventPublished } from "@/lib/data/admin";
import { fromLocalInputValue } from "@/lib/format";
import { UploadError, uploadFlyer } from "@/lib/storage";
import { eventFormSchema, uuidSchema } from "@/lib/validation";

export async function saveEventAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Datos inválidos." };
  }
  const parsed = eventFormSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const d = parsed.data;

  let flyerPath: string | null = null;
  const flyer = formData.get("flyer");
  if (flyer instanceof File && flyer.size > 0) {
    try {
      flyerPath = await uploadFlyer(flyer);
    } catch (err) {
      if (err instanceof UploadError) return { error: err.message };
      console.error("[admin] Error subiendo flyer", err);
      return { error: "No se pudo subir el flyer." };
    }
  }

  let id: string;
  try {
    id = await saveEvent({
      id: d.id,
      name: d.name,
      slug: d.slug,
      description: d.description,
      startsAt: fromLocalInputValue(d.startsAt),
      venueName: d.venueName,
      venueAddress: d.venueAddress,
      flyerPath,
      isPublished: d.publish,
      ticketTypes: d.ticketTypes,
    });
  } catch (err) {
    if (err instanceof SaveEventError) return { error: err.message };
    console.error("[admin] Error guardando evento", err);
    return { error: "No se pudo guardar el evento." };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/eventos?ok=${d.id ? "editado" : "creado"}&id=${id}`);
}

export async function togglePublishAction(formData: FormData) {
  await requireAdmin();
  const id = uuidSchema.parse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  await setEventPublished(id, publish);
  revalidatePath("/", "layout");
}

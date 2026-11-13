"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { renameTicket, voidTicket } from "@/lib/data/admin";
import { uuidSchema } from "@/lib/validation";

const renameSchema = z.object({ id: uuidSchema, name: z.string().trim().min(3, "Poné nombre y apellido").max(80) });

export async function renameTicketAction(id: string, name: string): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = renameSchema.safeParse({ id, name });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const orderId = await renameTicket(parsed.data.id, parsed.data.name);
  if (!orderId) return { error: "No se pudo cambiar (¿la entrada está anulada?)." };
  revalidatePath(`/admin/ventas/${orderId}`);
  return {};
}

export async function voidTicketAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "Entrada inválida." };
  const orderId = await voidTicket(parsed.data);
  if (!orderId) return { error: "La entrada ya estaba anulada." };
  revalidatePath(`/admin/ventas/${orderId}`);
  return {};
}

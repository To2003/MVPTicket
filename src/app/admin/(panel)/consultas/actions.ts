"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setMessageRead } from "@/lib/data/admin";
import { uuidSchema } from "@/lib/validation";

export async function toggleReadAction(formData: FormData) {
  await requireAdmin();
  const id = uuidSchema.parse(formData.get("id"));
  await setMessageRead(id, formData.get("read") === "true");
  revalidatePath("/admin", "layout");
}

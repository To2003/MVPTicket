"use server";

import { redirect } from "next/navigation";
import { realMpGateway } from "@/lib/mercadopago";
import { startMpCheckout } from "@/lib/orders";
import { confirmDemoPayment } from "@/lib/payments";
import { uuidSchema } from "@/lib/validation";
import { env } from "@/lib/env";

export async function simulateApprovedPayment(formData: FormData) {
  const orderId = uuidSchema.parse(formData.get("orderId"));
  if (!env.demoMode()) throw new Error("El modo demo está desactivado.");
  await confirmDemoPayment(orderId);
  redirect(`/compra/${orderId}`);
}

export async function retryMpCheckout(formData: FormData) {
  const orderId = uuidSchema.parse(formData.get("orderId"));
  let url: string;
  try {
    url = await startMpCheckout(orderId, realMpGateway());
  } catch (err) {
    console.error("[compra] No se pudo crear la preferencia:", err);
    redirect(`/compra/${orderId}?mp=error`);
  }
  redirect(url);
}

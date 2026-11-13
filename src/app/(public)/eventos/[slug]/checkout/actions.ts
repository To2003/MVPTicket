"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { realMpGateway } from "@/lib/mercadopago";
import { ReserveError, reserveErrorMessage, reserveOrder, startMpCheckout } from "@/lib/orders";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { buyerSchema, selectionSchema, uuidSchema, zodFieldErrors, type FieldErrors } from "@/lib/validation";
import { queryOne } from "@/lib/db";

export interface CheckoutState {
  message?: string;
  errors?: FieldErrors;
  values?: { name?: string; email?: string; dni?: string };
}

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    dni: String(formData.get("dni") ?? ""),
  };
  const buyer = buyerSchema.safeParse(values);
  const eventId = uuidSchema.safeParse(formData.get("eventId"));
  const items = selectionSchema.safeParse(String(formData.get("selection") ?? ""));
  if (!eventId.success || !items.success) {
    return { values, message: "Algo no cerró con las entradas que elegiste. Volvé al evento y elegilas de nuevo." };
  }
  if (!buyer.success) {
    return { values, errors: zodFieldErrors(buyer.error), message: "Revisá los datos marcados." };
  }

  const allowed = await rateLimit("checkout", await clientIp(), LIMITS.checkout.limit, LIMITS.checkout.window);
  if (!allowed) {
    return { values, message: "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo." };
  }

  let orderId: string;
  try {
    orderId = await reserveOrder({ eventId: eventId.data, items: items.data, buyer: buyer.data });
  } catch (err) {
    if (err instanceof ReserveError) {
      const typeName = err.ticketTypeId
        ? (await queryOne<{ name: string }>("select name from public.ticket_types where id = $1", [err.ticketTypeId]))?.name
        : undefined;
      return { values, message: reserveErrorMessage(err, typeName) };
    }
    console.error("[checkout] Error reservando:", err);
    return { values, message: "No pudimos reservar tus entradas. Probá de nuevo en un ratito." };
  }

  if (env.demoMode()) redirect(`/compra/${orderId}`);

  let checkoutUrl: string;
  try {
    checkoutUrl = await startMpCheckout(orderId, realMpGateway());
  } catch (err) {
    console.error("[checkout] Error creando la preferencia de MP:", err);
    redirect(`/compra/${orderId}?mp=error`);
  }
  redirect(checkoutUrl);
}

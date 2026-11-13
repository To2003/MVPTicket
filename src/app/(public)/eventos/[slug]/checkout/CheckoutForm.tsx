"use client";

import { useActionState } from "react";
import { BuyerFields } from "@/components/checkout/BuyerFields";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { startCheckout, type CheckoutState } from "./actions";

export function CheckoutForm({ eventId, selection, demoMode }: { eventId: string; selection: string; demoMode: boolean }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="selection" value={selection} />
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <BuyerFields values={state.values} errors={state.errors} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Reservando tus entradas…" : demoMode ? "Reservar y pagar" : "Ir a pagar con Mercado Pago"}
      </Button>
      <p className="text-center text-xs text-muted">
        Al continuar reservamos tus entradas por 10 minutos.{" "}
        {demoMode ? "Estás en modo demo: no se cobra nada." : "El pago se hace en Mercado Pago, sin cuotas."}
      </p>
    </form>
  );
}

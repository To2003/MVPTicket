import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkle } from "@/components/brand/Logo";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { whatsappLink } from "@/config/brand";
import { env } from "@/lib/env";
import { getOrderDetails, orderPhase } from "@/lib/orders";
import { qrSvg } from "@/lib/qr";
import { retryMpCheckout, simulateApprovedPayment } from "../actions";
import { AutoRefresh, ReservationTimer } from "./OrderLive";
import { SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu compra", robots: { index: false } };

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ mp?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ orderId }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderDetails(orderId);
  if (!order) notFound();
  const phase = orderPhase(order);
  const lines = order.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }));
  const demo = env.demoMode();

  if (phase === "paid") {
    const qrs = await Promise.all(order.tickets.map((t) => qrSvg(t.token)));
    return (
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6">
        <div className="pop-in flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-ok text-3xl text-bg">✓</span>
          <h1 className="condensed mt-4 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">¡Pago aprobado!</h1>
          <p className="mt-3 max-w-md text-lg text-ink/80">
            Ya {order.tickets.length === 1 ? "tenés tu entrada" : `tenés tus ${order.tickets.length} entradas`}. También te las mandamos a{" "}
            <strong className="text-ink">{order.buyerEmail}</strong>.
          </p>
          <p className="mt-1 text-sm text-muted">Guardá este link: desde acá podés volver a verlas cuando quieras.</p>
        </div>
        <div className="mt-10 grid justify-items-center gap-8 sm:grid-cols-2">
          {order.tickets.map((t, i) => (
            <div key={t.id} className="flex w-full flex-col items-center gap-3">
              <TicketCard
                eventName={order.event.name}
                startsAt={order.event.startsAt}
                venueName={order.event.venueName}
                ticketTypeName={t.ticketTypeName}
                holderName={t.holderName}
                code={t.code}
                status={t.status}
                usedAt={t.usedAt}
                qrSvg={qrs[i]}
              />
              <LinkButton href={`/entrada/${t.token}`} variant="outline" size="sm">Abrir esta entrada sola</LinkButton>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "needs_refund") {
    return (
      <Shell title="Uy, se agotaron justo" emoji="😔">
        <p>
          Tu pago llegó cuando ya no quedaban lugares para <strong>{order.event.name}</strong>. No te preocupes: te devolvemos
          la plata completa por Mercado Pago en los próximos días hábiles.
        </p>
        <LinkButton href={whatsappLink(`Hola! Mi compra ${order.id.slice(0, 8)} quedó sin cupo, ¿me ayudan?`)} target="_blank" rel="noopener noreferrer" variant="outline">
          Escribinos por WhatsApp
        </LinkButton>
      </Shell>
    );
  }

  if (phase === "expired") {
    return (
      <Shell title="Se venció la reserva" emoji="⏰">
        <p>Pasaron los 10 minutos y liberamos las entradas. Si todavía hay lugar, podés volver a sacarlas en un toque.</p>
        <LinkButton href={`/eventos/${order.event.slug}`}>Volver al evento</LinkButton>
      </Shell>
    );
  }

  // pending (reserva vigente)
  const paymentPending = order.lastPaymentStatus === "pending" || order.lastPaymentStatus === "in_process" || order.lastPaymentStatus === "approved";
  const paymentRejected = order.lastPaymentStatus === "rejected" || order.lastPaymentStatus === "cancelled";
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      {paymentPending ? <AutoRefresh seconds={5} /> : null}
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Paso 3 de 3</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold">
        {paymentPending ? "Estamos esperando la aprobación" : "¡Entradas reservadas!"}
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-5">
          <ReservationTimer expiresAt={order.expiresAt} />
          {sp.mp === "error" ? (
            <Alert tone="danger" title="No pudimos abrir Mercado Pago">Probá de nuevo con el botón de abajo. Tus entradas siguen reservadas.</Alert>
          ) : null}
          {paymentRejected ? (
            <Alert tone="danger" title="El pago fue rechazado">Probá con otra tarjeta o medio de pago. Tus entradas siguen reservadas.</Alert>
          ) : null}
          {paymentPending ? (
            <Alert tone="warn" title="Tu pago está en revisión">
              Mercado Pago todavía no lo aprobó. Esta página se actualiza sola; apenas se acredite te mandamos las entradas por mail.
            </Alert>
          ) : null}

          {demo ? (
            <div className="flex flex-col gap-4 rounded-[1.6rem] border border-dashed border-accent/50 bg-accent/5 p-5 sm:p-7">
              <div className="flex items-center gap-2 text-accent">
                <Sparkle className="size-5" />
                <p className="font-semibold">Modo demo</p>
              </div>
              <p className="text-ink/80">
                En la versión real, acá te llevamos a Mercado Pago. Para probar el flujo completo sin pagar, simulá que el pago se aprobó.
              </p>
              <form action={simulateApprovedPayment}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton variant="accent" pendingText="Confirmando pago…">Simular pago aprobado</SubmitButton>
              </form>
            </div>
          ) : (
            <form action={retryMpCheckout} className="rounded-[1.6rem] border border-line bg-surface p-5 sm:p-7">
              <input type="hidden" name="orderId" value={order.id} />
              <p className="mb-4 text-ink/80">Pagá con tarjeta de débito, crédito (en 1 pago) o dinero en cuenta de Mercado Pago.</p>
              <SubmitButton pendingText="Abriendo Mercado Pago…">{paymentRejected ? "Reintentar el pago" : "Pagar con Mercado Pago"}</SubmitButton>
            </form>
          )}
        </section>
        <aside>
          <OrderSummary event={order.event} lines={lines} />
          <p className="mt-3 px-1 text-sm text-muted">
            A nombre de <span className="text-ink">{order.buyerName}</span> · {order.buyerEmail}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Shell({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <div className="flex flex-col items-center gap-5 text-ink/80">{children}</div>
    </div>
  );
}

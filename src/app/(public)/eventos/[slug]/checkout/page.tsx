import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { getPublishedEventBySlug } from "@/lib/data/public";
import { env } from "@/lib/env";
import { isPast } from "@/lib/types";
import { selectionSchema } from "@/lib/validation";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tus datos", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const [{ slug }, { t }] = await Promise.all([params, searchParams]);
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  const parsed = selectionSchema.safeParse(t ?? "");
  const lines = parsed.success
    ? parsed.data
        .map((item) => {
          const type = event.ticketTypes.find((tt) => tt.id === item.ticket_type_id);
          return type ? { id: type.id, name: type.name, quantity: item.quantity, unitPrice: type.price, available: type.available } : null;
        })
        .filter((l): l is NonNullable<typeof l> => l !== null)
    : [];
  const valid = parsed.success && lines.length === parsed.data.length && !isPast(event);
  const shortOn = lines.find((l) => l.quantity > l.available);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Paso 2 de 3</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold">Tus datos</h1>

      {!valid ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <Alert tone="warn" title="No encontramos las entradas que elegiste">
            Puede que el link esté incompleto o que el evento ya no esté a la venta.
          </Alert>
          <LinkButton href={`/eventos/${event.slug}`} variant="outline">Volver al evento</LinkButton>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="order-2 rounded-[1.6rem] border border-line bg-surface p-5 sm:p-7 lg:order-1">
            {shortOn ? (
              <Alert tone="warn" className="mb-5">
                Ojo: de &quot;{shortOn.name}&quot; quedan {shortOn.available}. Si no alcanzan, te avisamos al reservar.
              </Alert>
            ) : null}
            <CheckoutForm eventId={event.id} selection={t ?? ""} demoMode={env.demoMode()} />
          </section>
          <aside className="order-1 flex flex-col gap-3 lg:order-2">
            <OrderSummary event={event} lines={lines} />
            <LinkButton href={`/eventos/${event.slug}`} variant="ghost" size="sm" className="self-start">
              ← Cambiar entradas
            </LinkButton>
          </aside>
        </div>
      )}
    </div>
  );
}

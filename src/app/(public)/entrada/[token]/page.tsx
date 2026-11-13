import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketCard } from "@/components/tickets/TicketCard";
import { LinkButton } from "@/components/ui/Button";
import { queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import { qrSvg } from "@/lib/qr";
import { verifyTicketToken } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu entrada", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = decodeURIComponent(token);
  const ticketId = verifyTicketToken(raw, env.ticketSecret());
  if (!ticketId) notFound();
  const t = await queryOne<{
    code: string;
    holder_name: string;
    status: "valid" | "used" | "void";
    used_at: Date | null;
    type_name: string;
    event_name: string;
    slug: string;
    starts_at: Date;
    venue_name: string;
    venue_address: string;
  }>(
    `select t.code, t.holder_name, t.status, t.used_at, tt.name as type_name,
            e.name as event_name, e.slug, e.starts_at, e.venue_name, e.venue_address
     from public.tickets t
     join public.ticket_types tt on tt.id = t.ticket_type_id
     join public.events e on e.id = t.event_id
     where t.id = $1`,
    [ticketId],
  );
  if (!t) notFound();
  const svg = await qrSvg(raw);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-10">
      <TicketCard
        eventName={t.event_name}
        startsAt={t.starts_at.toISOString()}
        venueName={t.venue_name}
        venueAddress={t.venue_address}
        ticketTypeName={t.type_name}
        holderName={t.holder_name}
        code={t.code}
        status={t.status}
        usedAt={t.used_at?.toISOString()}
        qrSvg={svg}
      />
      <LinkButton href={`/eventos/${t.slug}`} variant="ghost" size="sm">Ver el evento</LinkButton>
    </div>
  );
}

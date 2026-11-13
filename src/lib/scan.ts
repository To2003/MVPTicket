import "server-only";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeTicketCode, verifyTicketToken } from "@/lib/tickets";

export type ScanResult = "ok" | "used" | "void" | "wrong_event" | "invalid";

export interface ScanResponse {
  result: ScanResult;
  holderName?: string;
  ticketTypeName?: string;
  eventName?: string;
  usedAt?: string | null;
  code?: string;
}

/**
 * Valida lo que leyó la cámara (token firmado) o lo que tipearon (código corto) y,
 * si corresponde, marca la entrada como usada. Atómico: dos lecturas a la vez → un solo OK.
 */
export async function scanInput(input: string, eventId: string): Promise<ScanResponse> {
  const raw = input.trim().slice(0, 300);
  let ticketId: string | null = null;
  if (raw.includes(".")) {
    // Si el QR trae una URL (/entrada/<token>), nos quedamos con el token.
    const token = decodeURIComponent(raw.split("/").pop() ?? raw);
    ticketId = verifyTicketToken(token, env.ticketSecret());
  } else {
    const code = normalizeTicketCode(raw);
    if (code) {
      ticketId = (await queryOne<{ id: string }>("select id from public.tickets where code = $1", [code]))?.id ?? null;
    }
  }
  if (!ticketId) return { result: "invalid" };

  const row = await queryOne<{
    result: ScanResult;
    holder_name: string | null;
    ticket_type_name: string | null;
    event_name: string | null;
    used_at: Date | null;
  }>("select * from public.scan_ticket($1, $2)", [ticketId, eventId]);
  if (!row) return { result: "invalid" };
  const code = row.result === "invalid" ? undefined : (await queryOne<{ code: string }>("select code from public.tickets where id = $1", [ticketId]))?.code;
  return {
    result: row.result,
    holderName: row.holder_name ?? undefined,
    ticketTypeName: row.ticket_type_name ?? undefined,
    eventName: row.event_name ?? undefined,
    usedAt: row.used_at?.toISOString() ?? null,
    code,
  };
}

export async function gateStats(eventId: string): Promise<{ used: number; total: number }> {
  const row = await queryOne<{ used: number; total: number }>(
    `select count(*) filter (where status = 'used')::int as used,
            count(*) filter (where status <> 'void')::int as total
     from public.tickets where event_id = $1`,
    [eventId],
  );
  return row ?? { used: 0, total: 0 };
}

/** Eventos que tiene sentido escanear: los de hoy en adelante (y los que empezaron hace menos de 12 hs). */
export async function scannableEvents() {
  return query<{ id: string; name: string; starts_at: Date }>(
    `select id, name, starts_at from public.events
     where starts_at > now() - interval '12 hours'
     order by starts_at asc limit 20`,
  );
}

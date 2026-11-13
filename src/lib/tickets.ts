import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token del QR: base64url(uuid 16 bytes) + "." + base64url(HMAC-SHA256(secret, "v1:" + uuid))
 * No es un secreto: cualquiera con el token puede ver la entrada, pero nadie puede fabricar
 * uno válido sin TICKET_HMAC_SECRET.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function sign(ticketId: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`v1:${ticketId}`).digest();
}

export function signTicketToken(ticketId: string, secret: string): string {
  const id = ticketId.toLowerCase();
  if (!UUID_RE.test(id)) throw new Error("ticketId inválido");
  const idPart = Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url");
  return `${idPart}.${sign(id, secret).toString("base64url")}`;
}

/** Devuelve el id de la entrada si la firma es válida; si no, null. */
export function verifyTicketToken(token: string, secret: string): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [idPart, sigPart] = parts;
  if (!/^[A-Za-z0-9_-]{22}$/.test(idPart) || !/^[A-Za-z0-9_-]{43}$/.test(sigPart)) return null;

  const idBytes = Buffer.from(idPart, "base64url");
  if (idBytes.length !== 16 || idBytes.toString("base64url") !== idPart) return null;
  const hex = idBytes.toString("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  const given = Buffer.from(sigPart, "base64url");
  const expected = sign(id, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}

/** Normaliza lo que tipean en la puerta: "k7m q9px 3rt" → "K7M-Q9PX-3RT". */
export function normalizeTicketCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (raw.length !== 10) return null;
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/.test(raw)) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}

import "server-only";
import { headers } from "next/headers";
import { queryOne } from "@/lib/db";

/** IP del cliente (detrás de proxy: primer valor de x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** true = permitido. Guarda contadores en Postgres (D5). */
export async function rateLimit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const row = await queryOne<{ allowed: boolean }>("select public.rate_limit_hit($1, $2, $3) as allowed", [
    `${bucket}:${key}`,
    limit,
    windowSeconds,
  ]);
  return row?.allowed ?? true;
}

export const LIMITS = {
  checkout: { limit: 10, window: 10 * 60 },
  contact: { limit: 5, window: 60 * 60 },
  login: { limit: 8, window: 10 * 60 },
} as const;

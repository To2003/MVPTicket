import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Config de `pg` a partir de DATABASE_URL.
 * - Hosts locales (Postgres embebido): sin SSL.
 * - Hosts remotos (Supabase): SSL. Supabase firma con su propia CA, así que no validamos la
 *   cadena (salvo PGSSL_STRICT=true). Sacamos `sslmode` de la URL porque `pg` le daría prioridad
 *   sobre la opción `ssl` y lo trata como verify-full.
 */
export function pgConfig(connectionString: string, extra: PoolConfig = {}): PoolConfig {
  const url = new URL(connectionString);
  const local = LOCAL_HOSTS.has(url.hostname);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: process.env.PGSSL_STRICT === "true" },
    connectionTimeoutMillis: 10_000,
    ...extra,
  };
}

/** Descripción sin credenciales de a dónde apunta la URL (para diagnósticos). */
export function describeDbUrl(connectionString: string | undefined) {
  if (!connectionString) return { configured: false as const };
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    return {
      configured: true as const,
      host,
      port: url.port || "5432",
      kind: LOCAL_HOSTS.has(host)
        ? "local"
        : host.includes("pooler.supabase.com")
          ? url.port === "6543"
            ? "supabase-transaction-pooler"
            : "supabase-session-pooler"
          : host.endsWith(".supabase.co")
            ? "supabase-direct (solo IPv6: no anda en Vercel)"
            : "otro",
      hasPassword: Boolean(url.password),
    };
  } catch {
    return { configured: true as const, invalid: true };
  }
}

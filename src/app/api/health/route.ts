import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { describeDbUrl } from "@/lib/pg-config";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico del deploy (sin secretos): qué variables faltan, si conecta a la base,
 * si están las migraciones y si hay datos. Útil la primera vez que se sube a Vercel.
 */
export async function GET() {
  const env = {
    DATABASE_URL: describeDbUrl(process.env.DATABASE_URL),
    TICKET_HMAC_SECRET: (process.env.TICKET_HMAC_SECRET?.length ?? 0) >= 32,
    ADMIN_EMAILS: Boolean(process.env.ADMIN_EMAILS),
    APP_URL: process.env.APP_URL ?? null,
    DEMO_MODE: process.env.DEMO_MODE ?? null,
    SUPABASE_AUTH: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_STORAGE: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    SEED_ADMIN_PASSWORD: Boolean(process.env.SEED_ADMIN_PASSWORD),
  };
  const db: Record<string, unknown> = {};
  try {
    const client = await pool().connect();
    try {
      db.connected = true;
      const mig = await client.query<{ n: number }>(
        "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = '_migrations'",
      );
      db.migrations = mig.rows[0].n ? (await client.query("select name from public._migrations order by name")).rows.map((r) => r.name) : [];
      const ev = await client.query<{ n: number }>(
        "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'events'",
      );
      db.events = ev.rows[0].n ? (await client.query<{ n: number }>("select count(*)::int as n from public.events")).rows[0].n : "falta la tabla (no se corrió db:migrate)";
      try {
        await client.query("begin");
        await client.query("set local role anon");
        await client.query("rollback");
        db.anonRole = "ok";
      } catch (err) {
        await client.query("rollback").catch(() => {});
        db.anonRole = `no (${(err as { code?: string }).code ?? "?"})`;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    db.connected = false;
    db.error = { code: e.code ?? null, message: (e.message ?? "").replace(/postgres(ql)?:\/\/\S+/g, "<url>").slice(0, 300) };
  }
  const ok = db.connected === true && Array.isArray(db.migrations) && (db.migrations as string[]).length >= 3 && env.TICKET_HMAC_SECRET;
  return NextResponse.json({ ok, env, db }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

/**
 * Base de datos para tests:
 * - Si hay TEST_DATABASE_URL, se usa esa (no se borra; los tests crean sus propios datos).
 * - Si no, se levanta un Postgres embebido aparte (puerto 54330) y se recrea la base `algolindo_test`.
 */
import pg from "pg";
import { ensureDatabase, withDb, type DbHandle } from "../../scripts/lib/embedded-pg";
import { runMigrations } from "../../scripts/lib/migrations";

let handle: DbHandle | null = null;

export default async function setup() {
  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    process.env.EMBEDDED_POSTGRES = "true";
    const base = "postgres://postgres:postgres@127.0.0.1:54330/postgres";
    handle = await ensureDatabase(base, ".data/pg-test");
    const admin = new pg.Client({ connectionString: base });
    await admin.connect();
    await admin.query("drop database if exists algolindo_test with (force)");
    await admin.query("create database algolindo_test");
    await admin.end();
    url = withDb(base, "algolindo_test");
  }
  await runMigrations(url, { quiet: true });

  process.env.DATABASE_URL = url;
  process.env.TICKET_HMAC_SECRET = "test-secret-0123456789abcdef0123456789abcdef";
  process.env.DEMO_MODE = "true";
  process.env.APP_URL = "http://localhost:3000";
  process.env.RESEND_API_KEY = "";
  process.env.EMAIL_OUTBOX_DIR = "";
  process.env.PG_POOL_MAX = "60";

  return async () => {
    if (handle) await handle.stop();
  };
}

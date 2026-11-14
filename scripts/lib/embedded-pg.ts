/**
 * Postgres embebido para desarrollo local y tests (sin Docker).
 * Solo se usa si EMBEDDED_POSTGRES=true y no hay un Postgres respondiendo en DATABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { pgConfig } from "../../src/lib/pg-config";

export async function canConnect(url: string): Promise<boolean> {
  const client = new pg.Client(pgConfig(url, { connectionTimeoutMillis: 2000 }));
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

export interface DbHandle {
  /** true si este proceso levantó el Postgres embebido (y tiene que apagarlo). */
  started: boolean;
  stop: () => Promise<void>;
}

export async function ensureDatabase(url: string, dataDir: string): Promise<DbHandle> {
  if (await canConnect(url)) return { started: false, stop: async () => {} };

  if (process.env.EMBEDDED_POSTGRES !== "true") {
    throw new Error(
      `No me pude conectar a la base (DATABASE_URL). Revisá la URL o poné EMBEDDED_POSTGRES=true para usar el Postgres embebido.`,
    );
  }

  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres";
  const absDir = path.resolve(dataDir);
  fs.mkdirSync(path.dirname(absDir), { recursive: true });

  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const server = new EmbeddedPostgres({
    databaseDir: absDir,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || "postgres"),
    persistent: true,
    // Postgres no corre como root: en contenedores root creamos un usuario del sistema.
    createPostgresUser: isRoot,
    onLog: () => {},
    onError: (e) => {
      const msg = String(e instanceof Error ? e.message : e);
      if (/error|fatal|panic/i.test(msg)) console.error("[postgres]", msg.trim());
    },
  });

  if (!fs.existsSync(path.join(absDir, "PG_VERSION"))) {
    console.log(`▸ Inicializando Postgres embebido en ${dataDir}…`);
    await server.initialise();
  }
  await server.start();

  if (dbName !== "postgres") {
    const admin = new pg.Client({ connectionString: withDb(url, "postgres") });
    await admin.connect();
    const exists = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
    if (exists.rowCount === 0) await admin.query(`create database "${dbName.replace(/"/g, "")}"`);
    await admin.end();
  }

  return { started: true, stop: () => server.stop() };
}

export function withDb(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

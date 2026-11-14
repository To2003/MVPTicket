/**
 * npm run dev — levanta la base (Postgres embebido si EMBEDDED_POSTGRES=true),
 * aplica migraciones, carga el seed si la base está vacía y arranca `next dev`.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { pgConfig } from "../src/lib/pg-config";
import { loadEnv, requireEnv, EMBEDDED_DATA_DIR } from "./lib/env";
import { ensureDatabase } from "./lib/embedded-pg";
import { runMigrations } from "./lib/migrations";
import { ensureEnvLocal } from "./setup";

async function isEmpty(url: string) {
  const c = new pg.Client(pgConfig(url));
  await c.connect();
  try {
    const r = await c.query<{ n: string }>("select count(*) as n from public.events");
    return r.rows[0].n === "0";
  } finally {
    await c.end();
  }
}

async function main() {
  ensureEnvLocal();
  loadEnv();
  const url = requireEnv("DATABASE_URL");
  const db = await ensureDatabase(url, EMBEDDED_DATA_DIR);
  if (db.started) console.log("▸ Postgres embebido corriendo.");
  await runMigrations(url);

  const root = path.resolve(__dirname, "..");
  if (process.env.EMBEDDED_POSTGRES === "true" && (await isEmpty(url))) {
    console.log("▸ Base vacía: cargo los datos de ejemplo (npm run seed)…");
    spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "scripts/seed.ts")], {
      stdio: "inherit",
      cwd: root,
    });
  }

  const next = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: root,
  });

  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    next.kill("SIGINT");
    await db.stop().catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
  next.on("exit", (code) => void shutdown(code ?? 0));
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});

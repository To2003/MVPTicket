/** npm run db:start — deja corriendo el Postgres embebido (para `npm start` o herramientas externas). */
import { loadEnv, requireEnv, EMBEDDED_DATA_DIR } from "./lib/env";
import { ensureDatabase } from "./lib/embedded-pg";
import { runMigrations } from "./lib/migrations";

async function main() {
  loadEnv();
  const url = requireEnv("DATABASE_URL");
  const db = await ensureDatabase(url, EMBEDDED_DATA_DIR);
  await runMigrations(url, { quiet: true });
  if (!db.started) {
    console.log("✓ Ya había una base respondiendo en DATABASE_URL.");
    return;
  }
  console.log("✓ Postgres embebido corriendo. Ctrl+C para apagarlo.");
  const stop = async () => {
    await db.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});

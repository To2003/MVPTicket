import { loadEnv, requireEnv, EMBEDDED_DATA_DIR } from "./lib/env";
import { ensureDatabase } from "./lib/embedded-pg";
import { runMigrations } from "./lib/migrations";

async function main() {
  loadEnv();
  const url = requireEnv("DATABASE_URL");
  const db = await ensureDatabase(url, EMBEDDED_DATA_DIR);
  try {
    console.log("▸ Aplicando migraciones…");
    const applied = await runMigrations(url);
    console.log(applied.length ? `✓ ${applied.length} migraciones aplicadas.` : "✓ La base ya estaba al día.");
  } finally {
    await db.stop();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});

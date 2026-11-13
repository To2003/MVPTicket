import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");

/** Aplica en orden las migraciones .sql que falten. Cada una en su propia transacción. */
export async function runMigrations(url: string, opts: { quiet?: boolean } = {}): Promise<string[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(`
      create table if not exists public._migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`);
    await client.query("alter table public._migrations enable row level security");
    const done = new Set(
      (await client.query<{ name: string }>("select name from public._migrations")).rows.map((r) => r.name),
    );
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public._migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Falló la migración ${file}: ${(err as Error).message}`);
      }
      applied.push(file);
      if (!opts.quiet) console.log(`  ✓ ${file}`);
    }
  } finally {
    await client.end();
  }
  return applied;
}

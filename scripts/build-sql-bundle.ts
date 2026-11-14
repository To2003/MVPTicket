/**
 * npm run sql:bundle — arma supabase/instalar-todo.sql: todas las migraciones + datos de ejemplo
 * en un solo archivo para pegar en el SQL Editor de Supabase (sin terminal).
 */
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS_DIR } from "./lib/migrations";

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
const parts = [
  `-- =====================================================================
-- ALGO LINDO · INSTALACIÓN COMPLETA (generado con npm run sql:bundle)
--
-- Cómo usarlo:
--   1. Supabase → tu proyecto → SQL Editor → New query.
--   2. Pegá TODO este archivo y tocá "Run".
--   3. Al final tiene que mostrar una fila con eventos = 3.
--
-- Correlo UNA sola vez sobre un proyecto nuevo. Si da "already exists",
-- es porque ya estaba instalado.
-- =====================================================================
`,
  `create table if not exists public._migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public._migrations enable row level security;
`,
];
for (const f of files) {
  parts.push(`\n-- ─────────────── ${f} ───────────────\n`);
  parts.push(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
  parts.push(`\ninsert into public._migrations (name) values ('${f}') on conflict do nothing;\n`);
}
parts.push(`\n-- ─────────────── Datos de ejemplo ───────────────\n`);
parts.push(fs.readFileSync(path.resolve(MIGRATIONS_DIR, "../seed.sql"), "utf8"));

const out = path.resolve(MIGRATIONS_DIR, "../instalar-todo.sql");
fs.writeFileSync(out, parts.join(""));
console.log(`✓ ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);

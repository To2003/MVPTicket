/**
 * npm run setup — crea .env.local a partir de .env.example si no existe,
 * generando TICKET_HMAC_SECRET y SEED_ADMIN_PASSWORD aleatorios.
 * No pisa un .env.local existente.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export function ensureEnvLocal(root = path.resolve(__dirname, "..")): boolean {
  const target = path.join(root, ".env.local");
  if (fs.existsSync(target)) return false;
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const password = `AlgoLindo-${randomBytes(4).toString("hex")}`;
  const content = example
    .replace(/^TICKET_HMAC_SECRET=.*$/m, `TICKET_HMAC_SECRET=${randomBytes(32).toString("hex")}`)
    .replace(/^SEED_ADMIN_PASSWORD=.*$/m, `SEED_ADMIN_PASSWORD=${password}`);
  fs.writeFileSync(target, content, { mode: 0o600 });
  console.log("✓ Creé .env.local con secretos nuevos (modo demo + Postgres embebido).");
  console.log("  La contraseña del panel está en SEED_ADMIN_PASSWORD dentro de .env.local.");
  return true;
}

if (require.main === module) {
  if (!ensureEnvLocal()) console.log("✓ .env.local ya existe: no lo toqué.");
}

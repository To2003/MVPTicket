import { loadEnvConfig } from "@next/env";
import path from "node:path";

/** Carga .env, .env.local, etc. igual que Next. */
export function loadEnv() {
  loadEnvConfig(path.resolve(__dirname, "../.."), process.env.NODE_ENV !== "production");
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Falta la variable ${name}. Copiá .env.example a .env.local y completala.`);
    process.exit(1);
  }
  return v;
}

export const EMBEDDED_DATA_DIR = ".data/pg";

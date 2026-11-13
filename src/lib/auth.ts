import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Autenticación del panel.
 * - Con Supabase configurado: Supabase Auth (email + contraseña).
 * - Sin Supabase (modo local, D18): email de ADMIN_EMAILS + SEED_ADMIN_PASSWORD, sesión en cookie firmada.
 * En los dos casos el email TIENE que estar en ADMIN_EMAILS.
 */
export const LOCAL_SESSION_COOKIE = "al_admin";
const SESSION_HOURS = 12;

export interface Admin {
  email: string;
}

export function isAllowedAdmin(email: string | null | undefined): boolean {
  return Boolean(email) && env.adminEmails().includes(email!.trim().toLowerCase());
}

function sessionKey() {
  return createHmac("sha256", env.ticketSecret()).update("admin-session-v1").digest();
}

function signSession(email: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ e: email, x: expiresAt })).toString("base64url");
  const sig = createHmac("sha256", sessionKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readSession(value: string | undefined): Admin | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", sessionKey()).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; x: number };
    if (typeof data.x !== "number" || data.x < Date.now()) return null;
    return isAllowedAdmin(data.e) ? { email: data.e } : null;
  } catch {
    return null;
  }
}

export async function getAdmin(): Promise<Admin | null> {
  if (env.supabaseAuthEnabled()) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    return email && isAllowedAdmin(email) ? { email } : null;
  }
  const store = await cookies();
  return readSession(store.get(LOCAL_SESSION_COOKIE)?.value);
}

/** Para páginas y server actions del panel. Si no hay admin, manda al login. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signIn(emailRaw: string, password: string): Promise<SignInResult> {
  const email = emailRaw.trim().toLowerCase();
  const generic = { ok: false as const, error: "Mail o contraseña incorrectos." };
  if (!isAllowedAdmin(email)) return generic;

  if (env.supabaseAuthEnabled()) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? generic : { ok: true };
  }

  const expected = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!expected || !safeEqual(password, expected)) return generic;
  const store = await cookies();
  const expiresAt = Date.now() + SESSION_HOURS * 3600_000;
  store.set(LOCAL_SESSION_COOKIE, signSession(email, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd(),
    path: "/",
    expires: new Date(expiresAt),
  });
  return { ok: true };
}

export async function signOut() {
  if (env.supabaseAuthEnabled()) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  const store = await cookies();
  store.delete(LOCAL_SESSION_COOKIE);
}

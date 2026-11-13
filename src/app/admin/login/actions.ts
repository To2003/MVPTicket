"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { email, error: "Completá mail y contraseña." };
  const allowed = await rateLimit("login", await clientIp(), LIMITS.login.limit, LIMITS.login.window);
  if (!allowed) return { email, error: "Demasiados intentos. Esperá unos minutos." };
  const result = await signIn(email, password);
  if (!result.ok) return { email, error: result.error };
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin/login");
}

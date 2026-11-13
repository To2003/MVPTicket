import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="grain grid min-h-dvh place-items-center px-4 py-10">
      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo size="lg" />
        </Link>
        <div className="rounded-[1.6rem] border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold">Panel</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Solo para el equipo de Algo Lindo.</p>
          <LoginForm />
        </div>
        {!env.supabaseAuthEnabled() ? (
          <p className="mt-4 text-center text-xs text-muted">Modo local: la contraseña es la de SEED_ADMIN_PASSWORD en .env.local.</p>
        ) : null}
      </div>
    </main>
  );
}

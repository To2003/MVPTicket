import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Ir a la web">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-white/5">
            Salir de la simulación
          </Link>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}

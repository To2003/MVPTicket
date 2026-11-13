"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, Sparkle } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/#eventos", label: "Eventos" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader({ showSimulation }: { showSimulation: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Ir al inicio" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-white/5 hover:text-ink",
                pathname === item.href && "text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          {showSimulation ? <SimulationLink /> : null}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {showSimulation ? <SimulationLink compact /> : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="grid size-11 place-items-center rounded-full border border-line"
          >
            <span className="relative block h-3.5 w-5">
              <span className={cn("absolute left-0 top-0 h-0.5 w-5 bg-ink transition", open && "top-1.5 rotate-45")} />
              <span className={cn("absolute left-0 top-1.5 h-0.5 w-5 bg-ink transition", open && "opacity-0")} />
              <span className={cn("absolute left-0 top-3 h-0.5 w-5 bg-ink transition", open && "top-1.5 -rotate-45")} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="pop-in fixed inset-x-0 top-16 bottom-0 z-40 bg-bg px-4 pb-10 pt-6 md:hidden">
          <nav aria-label="Menú mobile" className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl px-4 py-4 font-display text-3xl font-bold condensed">
                {item.label}
              </Link>
            ))}
            {showSimulation ? (
              <Link
                href="/simulacion"
                className="mt-4 flex items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-4 py-4"
              >
                <span>
                  <span className="block font-display text-2xl font-bold text-accent">Simulación</span>
                  <span className="text-sm text-muted">Recorrido guiado de cómo funciona todo</span>
                </span>
                <Sparkle className="size-7 text-accent" />
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function SimulationLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/simulacion"
      className={cn(
        "ml-2 inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 font-semibold text-accent transition hover:bg-accent hover:text-accent-ink",
        compact ? "h-11 px-3.5 text-sm ml-0" : "h-10 px-4 text-sm",
      )}
    >
      <Sparkle className="size-4" />
      Simulación
    </Link>
  );
}

"use client";

import { Logo, Sparkle } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** Marco de celular en desktop; en el celu se vuelve una tarjeta a lo ancho. */
export function PhoneFrame({ children, label, tone = "web" }: { children: React.ReactNode; label: string; tone?: "web" | "admin" | "mp" | "mail" }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[1.6rem] border border-line bg-bg shadow-2xl",
          "lg:w-[390px] lg:rounded-[2.6rem] lg:border-[10px] lg:border-[#25202b] lg:shadow-[0_40px_120px_-40px_var(--brand-primary)]",
          tone === "mp" && "bg-[#f4f5f7] text-[#1b1b1f]",
          tone === "mail" && "bg-white text-[#1b1b1f]",
        )}
      >
        <div className="relative lg:h-[720px] lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">{children}</div>
      </div>
    </div>
  );
}

/** Header de la web dentro de la simulación (no navega). */
export function MockSiteHeader() {
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/60 bg-bg/90 px-4 backdrop-blur">
      <Logo size="sm" />
      <span className="grid size-9 place-items-center rounded-full border border-line" aria-hidden>
        <span className="block h-0.5 w-4 bg-ink shadow-[0_5px_0_var(--brand-ink),0_-5px_0_var(--brand-ink)]" />
      </span>
    </div>
  );
}

/** Resalta un elemento con un anillo que late y un globito. */
export function Spotlight({
  active = true,
  label = "Tocá acá",
  position = "top",
  className,
  children,
}: {
  active?: boolean;
  label?: string;
  position?: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <div className={cn("relative", className)}>
      <div className="sim-spotlight rounded-[inherit] outline-2 outline-offset-4 outline-accent [outline-style:solid]" style={{ borderRadius: "1.1rem" }}>
        {children}
      </div>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink shadow-lg",
          position === "top" ? "-top-9" : "-bottom-9",
        )}
      >
        {label}
        <span
          className={cn(
            "absolute left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-accent",
            position === "top" ? "-bottom-1" : "-top-1",
          )}
        />
      </span>
    </div>
  );
}

/** Globo de explicación dentro de la pantalla simulada. */
export function Bubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pop-in flex gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm text-ink", className)}>
      <Sparkle className="mt-0.5 size-4 shrink-0 text-accent" />
      <div>{children}</div>
    </div>
  );
}

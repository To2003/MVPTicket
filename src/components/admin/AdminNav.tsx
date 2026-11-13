"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export type AdminSection = "inicio" | "eventos" | "ventas" | "consultas" | "escaner";

export const ADMIN_NAV: Array<{ key: AdminSection; href: string; label: string; icon: string }> = [
  { key: "inicio", href: "/admin", label: "Inicio", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { key: "eventos", href: "/admin/eventos", label: "Eventos", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" },
  { key: "ventas", href: "/admin/ventas", label: "Ventas", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
  { key: "consultas", href: "/admin/consultas", label: "Consultas", icon: "M4 5h16v11H8l-4 4z" },
  { key: "escaner", href: "/admin/escaner", label: "Escáner", icon: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" },
];

export function NavIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function sectionFromPath(pathname: string): AdminSection {
  const seg = pathname.split("/")[2] ?? "";
  return (["eventos", "ventas", "consultas", "escaner"].includes(seg) ? seg : "inicio") as AdminSection;
}

/**
 * Navegación del panel: barra lateral en desktop, barra inferior en el celu.
 * `onSelect` la convierte en botones (lo usa la simulación).
 */
export function AdminNavView({
  active,
  badges = {},
  onSelect,
  footer,
  embedded = false,
}: {
  active: AdminSection;
  badges?: Partial<Record<AdminSection, number>>;
  onSelect?: (key: AdminSection) => void;
  footer?: React.ReactNode;
  /** Dentro de la simulación: siempre barra inferior, sin posición fija. */
  embedded?: boolean;
}) {
  const item = (n: (typeof ADMIN_NAV)[number], variant: "side" | "bottom") => {
    const isActive = n.key === active;
    const cls = cn(
      variant === "side"
        ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
        : "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.68rem] font-semibold transition",
      isActive ? (variant === "side" ? "bg-primary/15 text-primary" : "text-primary") : "text-ink/70 hover:text-ink",
    );
    const content = (
      <>
        <span className="relative">
          <NavIcon d={n.icon} className="size-5" />
          {badges[n.key] ? (
            <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold leading-4 text-primary-ink">
              {badges[n.key]}
            </span>
          ) : null}
        </span>
        <span>{n.label}</span>
      </>
    );
    return onSelect ? (
      <button key={n.key} type="button" className={cls} onClick={() => onSelect(n.key)} aria-current={isActive ? "page" : undefined}>
        {content}
      </button>
    ) : (
      <Link key={n.key} href={n.href} className={cls} aria-current={isActive ? "page" : undefined}>
        {content}
      </Link>
    );
  };

  if (embedded) {
    return <nav aria-label="Panel" className="flex border-t border-line bg-surface">{ADMIN_NAV.map((n) => item(n, "bottom"))}</nav>;
  }
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface/60 p-5 lg:flex">
        <Link href="/admin" className="px-2">
          <Logo />
        </Link>
        <nav aria-label="Panel" className="flex flex-col gap-1">
          {ADMIN_NAV.map((n) => item(n, "side"))}
        </nav>
        <div className="mt-auto">{footer}</div>
      </aside>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {ADMIN_NAV.map((n) => item(n, "bottom"))}
      </nav>
    </>
  );
}

export function AdminNav({ badges, footer }: { badges?: Partial<Record<AdminSection, number>>; footer?: React.ReactNode }) {
  const pathname = usePathname();
  return <AdminNavView active={sectionFromPath(pathname)} badges={badges} footer={footer} />;
}

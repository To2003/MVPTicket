import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { showSimulation } from "@/config/features";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only z-50 rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Saltar al contenido
      </a>
      <SiteHeader showSimulation={showSimulation} />
      <main id="contenido" className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

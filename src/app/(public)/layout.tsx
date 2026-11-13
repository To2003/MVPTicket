import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { showSimulation } from "@/config/features";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative flex min-h-dvh flex-col">
      <SiteHeader showSimulation={showSimulation} />
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

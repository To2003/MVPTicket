import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { dashboardAlerts } from "@/lib/data/admin";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const alerts = await dashboardAlerts();
  return (
    <div className="flex min-h-dvh">
      <AdminNav
        badges={{ consultas: alerts.unread, ventas: alerts.refunds + alerts.duplicates }}
        footer={
          <form action={logout} className="flex flex-col gap-2 border-t border-line pt-4">
            <span className="truncate px-2 text-xs text-muted">{admin.email}</span>
            <button type="submit" className="rounded-xl px-2 py-2 text-left text-sm font-semibold text-ink/70 hover:bg-white/5 hover:text-ink">
              Cerrar sesión
            </button>
          </form>
        }
      />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
    </div>
  );
}

import { cn } from "@/lib/cn";

type Tone = "info" | "ok" | "warn" | "danger";
const tones: Record<Tone, string> = {
  info: "border-violet/40 bg-violet/10",
  ok: "border-ok/40 bg-ok/10",
  warn: "border-warn/40 bg-warn/10",
  danger: "border-danger/40 bg-danger/10",
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="font-semibold text-ink">{title}</p> : null}
      {children ? <div className="text-ink/80">{children}</div> : null}
    </div>
  );
}

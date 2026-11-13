import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "accent" | "ok" | "warn" | "danger" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-white/8 text-ink/80 border-line",
  primary: "bg-primary/15 text-primary border-primary/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  ok: "bg-ok/12 text-ok border-ok/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  violet: "bg-violet/15 text-violet border-violet/30",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

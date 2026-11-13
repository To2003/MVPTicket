import { dateBadge } from "@/lib/format";
import { cn } from "@/lib/cn";

export function DateBadge({ iso, className }: { iso: string; className?: string }) {
  const d = dateBadge(iso);
  return (
    <div className={cn("flex w-14 flex-col items-center rounded-xl bg-ink py-1.5 text-bg shadow-lg", className)}>
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-bg/60">{d.weekday}</span>
      <span className="font-display text-2xl font-extrabold leading-none">{d.day}</span>
      <span className="text-[0.7rem] font-bold tracking-wider text-primary">{d.month}</span>
    </div>
  );
}

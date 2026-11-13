import { Sparkle } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-brand border border-dashed border-line px-6 py-12 text-center", className)}>
      <Sparkle className="size-8 text-primary/70" />
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {children ? <div className="max-w-md text-muted">{children}</div> : null}
      {action}
    </div>
  );
}

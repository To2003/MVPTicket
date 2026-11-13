import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-ink placeholder:text-muted/60 outline-none transition focus:border-accent focus:bg-surface-2 aria-[invalid=true]:border-danger";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink/90">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Estrella de 4 puntas: el "isotipo" placeholder. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z" />
    </svg>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  if (brand.logoSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoSrc} alt={brand.name} className={cn(size === "lg" ? "h-12" : "h-8", className)} />;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-display font-extrabold lowercase leading-none tracking-tight",
        size === "sm" && "text-lg",
        size === "md" && "text-2xl",
        size === "lg" && "text-4xl",
        className,
      )}
    >
      <Sparkle className={cn("text-primary", size === "lg" ? "size-8" : "size-5")} />
      <span>{brand.name}</span>
    </span>
  );
}

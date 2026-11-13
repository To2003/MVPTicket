import { Sparkle } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** Flyer del evento (o un placeholder lindo si no hay imagen). */
export function Flyer({ src, alt, className, priority = false }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-primary/40 via-violet/30 to-accent/20", className)}>
        <Sparkle className="size-16 text-ink/70" />
      </div>
    );
  }
  return (
    // Flyers subidos o de Storage: <img> simple, sin optimizador (D19).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}

import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:brightness-110 shadow-[0_8px_30px_-10px_var(--brand-primary)]",
  accent: "bg-accent text-accent-ink hover:brightness-105",
  outline: "border border-line bg-transparent text-ink hover:border-ink/50 hover:bg-white/5",
  ghost: "bg-transparent text-ink hover:bg-white/5",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  light: "bg-ink text-bg hover:bg-white",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

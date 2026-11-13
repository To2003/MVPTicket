"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function SubmitButton({ children, pendingText, variant = "primary" }: { children: React.ReactNode; pendingText: string; variant?: "primary" | "accent" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending} className="w-full">
      {pending ? pendingText : children}
    </Button>
  );
}

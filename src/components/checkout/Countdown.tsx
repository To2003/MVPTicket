"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function remaining(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/** Cuenta regresiva de la reserva. Llama a onExpire una vez cuando llega a 0. */
export function Countdown({ expiresAt, onExpire, className }: { expiresAt: string; onExpire?: () => void; className?: string }) {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(remaining(expiresAt));
    let fired = false;
    const id = setInterval(() => {
      const r = remaining(expiresAt);
      setSecs(r);
      if (r === 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const s = secs ?? 600;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const urgent = s <= 120;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        urgent ? "border-warn/50 bg-warn/10" : "border-accent/40 bg-accent/10",
        className,
      )}
      role="timer"
      aria-live="off"
    >
      <span className={cn("font-display text-3xl font-extrabold tabular-nums", urgent ? "text-warn" : "text-accent")} suppressHydrationWarning>
        {mm}:{ss}
      </span>
      <span className="text-sm leading-snug text-ink/80">
        Te guardamos las entradas por 10 minutos. Si no pagás a tiempo, se liberan para otra persona.
      </span>
    </div>
  );
}

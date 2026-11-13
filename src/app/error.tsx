"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-5xl">😵‍💫</p>
        <h1 className="font-display text-3xl font-bold">Uy, algo se rompió</h1>
        <p className="max-w-sm text-muted">
          No es tu culpa. Probá de nuevo en un ratito; si sigue pasando, escribinos por WhatsApp.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <LinkButton href="/" variant="outline">Ir al inicio</LinkButton>
        </div>
        {error.digest ? <p className="text-xs text-muted">Código: {error.digest}</p> : null}
      </div>
    </main>
  );
}

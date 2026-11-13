"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="font-display text-3xl font-bold">No se pudo cargar esta pantalla</h1>
      <p className="text-muted">Probá de nuevo. Si sigue fallando, revisá la conexión a internet o avisanos.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <LinkButton href="/admin" variant="outline">Ir al inicio del panel</LinkButton>
      </div>
      {error.digest ? <p className="text-xs text-muted">Código: {error.digest}</p> : null}
    </div>
  );
}

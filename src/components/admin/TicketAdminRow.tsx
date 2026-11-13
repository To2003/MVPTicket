"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { TicketStatusBadge, type TicketStatusKey } from "./StatusBadge";

export interface TicketAdminView {
  id: string;
  code: string;
  holderName: string;
  ticketTypeName: string;
  status: TicketStatusKey;
  usedAt: string | null;
}

/**
 * Entrada con acciones de admin: cambiar titular (transferencia manual) y anular.
 * Las acciones vienen por props: server actions en el panel, estado local en la simulación.
 */
export function TicketAdminRow({
  ticket,
  onRename,
  onVoid,
  extra,
  highlight,
}: {
  ticket: TicketAdminView;
  onRename: (id: string, name: string) => Promise<{ error?: string } | void> | void;
  onVoid: (id: string) => Promise<{ error?: string } | void> | void;
  extra?: React.ReactNode;
  highlight?: "rename" | "void";
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ticket.holderName);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVoid = ticket.status === "void";

  const run = async (fn: () => Promise<{ error?: string } | void> | void) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r && r.error) setError(r.error);
      else {
        setEditing(false);
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted">{ticket.ticketTypeName}</p>
          <p className="truncate font-display text-lg font-bold">{ticket.holderName}</p>
          <p className="font-mono text-sm tracking-widest text-ink/70">{ticket.code}</p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 3) return setError("Poné nombre y apellido.");
            void run(() => onRename(ticket.id, name.trim()));
          }}
        >
          <input aria-label="Nuevo titular" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(ticket.holderName); }}>Cancelar</Button>
          </div>
        </form>
      ) : confirming ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3">
          <p className="text-sm">
            ¿Anular esta entrada? El QR deja de servir en la puerta. <strong>La devolución de la plata se hace aparte, desde Mercado Pago.</strong>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" disabled={busy} onClick={() => run(() => onVoid(ticket.id))}>Sí, anular</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={isVoid} onClick={() => setEditing(true)} className={highlight === "rename" ? "sim-spotlight ring-2 ring-accent" : ""}>
            Cambiar titular
          </Button>
          <Button size="sm" variant="danger" disabled={isVoid} onClick={() => setConfirming(true)} className={highlight === "void" ? "sim-spotlight ring-2 ring-accent" : ""}>
            Anular
          </Button>
          {extra}
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

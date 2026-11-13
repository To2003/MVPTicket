"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { formatMoney, pluralize } from "@/lib/format";
import type { TicketTypeView } from "@/lib/types";
import { TicketSelector, selectionTotal, type Selection } from "./TicketSelector";

export function encodeSelection(sel: Selection): string {
  return Object.entries(sel)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${id}:${q}`)
    .join(",");
}

export function BuyPanel({ slug, ticketTypes }: { slug: string; ticketTypes: TicketTypeView[] }) {
  const router = useRouter();
  const [value, setValue] = useState<Selection>({});
  const [pending, startTransition] = useTransition();
  const { qty, amount } = selectionTotal(ticketTypes, value);
  const allSoldOut = ticketTypes.every((t) => t.available <= 0);

  const buy = () => {
    if (qty === 0) return;
    startTransition(() => router.push(`/eventos/${slug}/checkout?t=${encodeSelection(value)}`));
  };

  if (!ticketTypes.length) {
    return <p className="text-muted">Todavía no hay entradas a la venta para este evento.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <TicketSelector ticketTypes={ticketTypes} value={value} onChange={setValue} />
      <div className="sticky bottom-3 z-20 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface/95 p-3 pl-5 shadow-2xl backdrop-blur lg:static lg:bg-surface lg:shadow-none">
        <div>
          <p className="text-xs text-muted">{qty ? pluralize(qty, "entrada", "entradas") : "Elegí tus entradas"}</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(amount)}</p>
        </div>
        <Button size="lg" onClick={buy} disabled={qty === 0 || pending || allSoldOut}>
          {allSoldOut ? "Agotado" : pending ? "Un toque…" : "Comprar"}
        </Button>
      </div>
    </div>
  );
}

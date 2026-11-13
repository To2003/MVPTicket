"use client";

import { TicketAdminRow, type TicketAdminView } from "@/components/admin/TicketAdminRow";
import { renameTicketAction, voidTicketAction } from "../actions";

export function TicketRows({ tickets }: { tickets: Array<TicketAdminView & { token: string }> }) {
  return (
    <div className="flex flex-col gap-3">
      {tickets.map((t) => (
        <div key={t.id} id={`t-${t.id}`} className="scroll-mt-24">
          <TicketAdminRow
            ticket={t}
            onRename={renameTicketAction}
            onVoid={voidTicketAction}
            extra={
              <a href={`/entrada/${t.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
                Ver entrada ↗
              </a>
            }
          />
        </div>
      ))}
    </div>
  );
}

import { ContactMessageCard } from "@/components/admin/ContactMessageCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth";
import { listContactMessages } from "@/lib/data/admin";
import { toggleReadAction } from "./actions";

export const metadata = { title: "Consultas" };

export default async function ContactsPage() {
  await requireAdmin();
  const messages = await listContactMessages();
  const unread = messages.filter((m) => !m.isRead).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Consultas" subtitle={unread ? `${unread} sin leer` : "Estás al día ✨"} />
      {messages.length ? (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <ContactMessageCard
              key={m.id}
              m={m}
              readToggle={
                <form action={toggleReadAction} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="read" value={String(!m.isRead)} />
                  <button type="submit" className="h-9 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
                    {m.isRead ? "Marcar como no leída" : "Marcar como leída ✓"}
                  </button>
                </form>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Todavía no llegaron consultas">Cuando alguien complete el formulario de contacto, aparece acá.</EmptyState>
      )}
    </div>
  );
}

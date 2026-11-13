import { EventStatsCard } from "@/components/admin/EventStatsCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth";
import { listEventStats } from "@/lib/data/admin";
import { togglePublishAction } from "./actions";

export const metadata = { title: "Eventos" };

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const [{ ok }, upcoming, past] = await Promise.all([searchParams, listEventStats("upcoming"), listEventStats("past")]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Eventos" actions={<LinkButton href="/admin/eventos/nuevo" size="sm">+ Nuevo evento</LinkButton>} />
      {ok ? (
        <Alert tone="ok" className="mb-6">{ok === "creado" ? "¡Evento creado!" : "Cambios guardados."}</Alert>
      ) : null}

      <h2 className="mb-3 font-display text-xl font-bold">Próximos</h2>
      {upcoming.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((e) => (
            <EventStatsCard
              key={e.id}
              e={e}
              actions={
                <>
                  <LinkButton href={`/admin/eventos/${e.id}`} variant="outline" size="sm">Editar</LinkButton>
                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="publish" value={String(!e.isPublished)} />
                    <button
                      type="submit"
                      className={
                        "h-9 rounded-full px-4 text-sm font-semibold transition " +
                        (e.isPublished ? "text-muted hover:bg-white/5 hover:text-ink" : "bg-accent text-accent-ink")
                      }
                    >
                      {e.isPublished ? "Despublicar" : "Publicar"}
                    </button>
                  </form>
                  {e.isPublished ? (
                    <LinkButton href={`/eventos/${e.slug}`} target="_blank" variant="ghost" size="sm">Ver ↗</LinkButton>
                  ) : null}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No hay eventos próximos" action={<LinkButton href="/admin/eventos/nuevo">Crear evento</LinkButton>} />
      )}

      {past.length ? (
        <>
          <h2 className="mb-3 mt-10 font-display text-xl font-bold text-ink/80">Pasados</h2>
          <div className="grid gap-3 opacity-80 md:grid-cols-2">
            {past.map((e) => (
              <EventStatsCard
                key={e.id}
                e={e}
                past
                actions={<LinkButton href={`/admin/ventas?evento=${e.id}&vista=asistentes`} variant="ghost" size="sm">Ver asistentes</LinkButton>}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

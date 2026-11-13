import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { CONTACT_EVENT_LABELS } from "@/lib/validation";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface ContactMessageView {
  id: string;
  name: string;
  email: string;
  eventType: "cumpleanos" | "privado" | "otro";
  estimatedDate: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function formatPlainDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ContactMessageCard({ m, readToggle, highlight }: { m: ContactMessageView; readToggle?: React.ReactNode; highlight?: boolean }) {
  const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Tu consulta en Algo Lindo`)}&body=${encodeURIComponent(`¡Hola ${m.name.split(" ")[0]}!\n\n`)}`;
  return (
    <article className={cn("flex flex-col gap-3 rounded-2xl border bg-surface p-4", m.isRead ? "border-line" : "border-primary/50", highlight && "sim-spotlight ring-2 ring-accent")}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">{m.name}</p>
          <p className="text-xs text-muted">{m.email} · {formatDateTime(m.createdAt)}</p>
        </div>
        <div className="flex gap-1.5">
          {!m.isRead ? <Badge tone="primary">Nueva</Badge> : null}
          <Badge tone={m.eventType === "cumpleanos" ? "accent" : m.eventType === "privado" ? "violet" : "neutral"}>
            {CONTACT_EVENT_LABELS[m.eventType]}
          </Badge>
        </div>
      </header>
      {m.estimatedDate ? <p className="text-sm"><span className="text-muted">Fecha estimada:</span> {formatPlainDate(m.estimatedDate)}</p> : null}
      <p className="whitespace-pre-line leading-relaxed text-ink/90">{m.message}</p>
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <a href={reply} className={buttonClass("outline", "sm")}>Responder por mail</a>
        <a href={`https://wa.me/?text=${encodeURIComponent(`¡Hola ${m.name.split(" ")[0]}! Te escribimos de Algo Lindo por tu consulta.`)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
          WhatsApp
        </a>
        {readToggle}
      </div>
    </article>
  );
}

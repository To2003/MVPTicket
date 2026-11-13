import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { brand, whatsappLink } from "@/config/brand";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.3fr]">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Contacto</p>
          <h1 className="condensed mt-2 font-display text-6xl font-extrabold uppercase leading-[0.88]">Hablemos</h1>
          <p className="mt-4 text-lg text-ink/80">
            ¿Querés hacer un cumple, un evento privado o tenés una duda con tu entrada? Escribinos por donde te quede más cómodo.
          </p>
        </div>
        <div className="rounded-2xl border border-ok/30 bg-ok/5 p-5">
          <p className="font-semibold">La más rápida: WhatsApp</p>
          <p className="mt-1 text-sm text-muted">Te contestamos en el día (o al día siguiente si estamos en plena fiesta).</p>
          <LinkButton href={whatsappLink()} target="_blank" rel="noopener noreferrer" size="lg" variant="outline" className="mt-4 w-full border-ok/50 text-ok sm:w-auto">
            Abrir WhatsApp
          </LinkButton>
        </div>
        <p className="text-sm text-muted">
          También estamos en Instagram como <span className="text-ink">@{brand.contact.instagram}</span> y por mail en{" "}
          <a href={`mailto:${brand.contact.email}`} className="text-ink underline underline-offset-4">{brand.contact.email}</a>.
        </p>
      </div>
      <div className="relative rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
        <h2 className="mb-6 font-display text-2xl font-bold">Dejanos tu consulta</h2>
        <ContactForm />
      </div>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand, whatsappLink } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo size="lg" />
          <p className="max-w-sm text-muted">{brand.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold uppercase tracking-widest text-muted">Navegá</p>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-primary" href="/#eventos">Próximos eventos</Link></li>
            <li><Link className="hover:text-primary" href="/quienes-somos">Quiénes somos</Link></li>
            <li><Link className="hover:text-primary" href="/contacto">Contacto y eventos privados</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold uppercase tracking-widest text-muted">Hablemos</p>
          <ul className="space-y-1.5">
            <li><a className="hover:text-primary" href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            <li><a className="hover:text-primary" href={`https://instagram.com/${brand.contact.instagram}`} target="_blank" rel="noopener noreferrer">Instagram @{brand.contact.instagram}</a></li>
            <li><a className="hover:text-primary" href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/50">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {brand.name} · {brand.city} · Pagos procesados por Mercado Pago
        </p>
      </div>
    </footer>
  );
}

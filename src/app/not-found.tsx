import { Logo } from "@/components/brand/Logo";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grain grid min-h-dvh place-items-center px-6 text-center">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <Logo />
        <p className="condensed font-display text-[7rem] font-extrabold leading-none text-primary">404</p>
        <h1 className="font-display text-3xl font-bold">Acá no hay ninguna fiesta</h1>
        <p className="max-w-sm text-muted">La página que buscás no existe o el evento ya no está publicado.</p>
        <LinkButton href="/">Volver al inicio</LinkButton>
      </div>
    </main>
  );
}

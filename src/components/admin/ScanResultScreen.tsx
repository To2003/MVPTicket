import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export type ScanResultKind = "ok" | "used" | "void" | "wrong_event" | "invalid";

const COPY: Record<ScanResultKind, { title: string; icon: string; cls: string }> = {
  ok: { title: "OK, pasa", icon: "✓", cls: "bg-ok text-[#04140c]" },
  used: { title: "Ya usada", icon: "!", cls: "bg-warn text-[#1c1300]" },
  void: { title: "Anulada", icon: "✕", cls: "bg-danger text-white" },
  wrong_event: { title: "Es de otro evento", icon: "✕", cls: "bg-danger text-white" },
  invalid: { title: "Inválida", icon: "✕", cls: "bg-danger text-white" },
};

/** Pantalla de resultado del escáner (verde / amarillo / rojo). */
export function ScanResultScreen({
  result,
  holderName,
  ticketTypeName,
  usedAt,
  onDismiss,
  className,
}: {
  result: ScanResultKind;
  holderName?: string;
  ticketTypeName?: string;
  usedAt?: string | null;
  onDismiss?: () => void;
  className?: string;
}) {
  const c = COPY[result];
  const detail =
    result === "used"
      ? usedAt
        ? `Entró a las ${formatTime(usedAt)} hs`
        : "Esta entrada ya se usó"
      : result === "void"
        ? "Esta entrada fue anulada. No puede pasar."
        : result === "wrong_event"
          ? "La entrada es válida pero para otro evento."
          : result === "invalid"
            ? "El QR no es de Algo Lindo o está adulterado."
            : null;
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={cn("flex w-full flex-col items-center justify-center gap-3 p-8 text-center", c.cls, className)}
      aria-live="assertive"
    >
      <span className="pop-in flex flex-col items-center gap-3">
      <span className="grid size-24 place-items-center rounded-full border-4 border-current text-6xl font-black">{c.icon}</span>
      <span className="condensed font-display text-6xl font-extrabold uppercase leading-none">{c.title}</span>
      {holderName && result !== "invalid" ? (
        <span className="text-2xl font-bold">
          {holderName}
          {ticketTypeName ? <span className="block text-base font-semibold opacity-80">{ticketTypeName}</span> : null}
        </span>
      ) : null}
      {detail ? <span className="max-w-xs text-lg font-semibold opacity-90">{detail}</span> : null}
      {onDismiss ? <span className="mt-4 text-sm font-semibold opacity-70">Tocá para seguir escaneando</span> : null}
      </span>
    </button>
  );
}

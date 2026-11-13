"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanResultScreen, type ScanResultKind } from "@/components/admin/ScanResultScreen";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { formatDateShort, formatTime } from "@/lib/format";

interface ScanApiResponse {
  result: ScanResultKind;
  holderName?: string;
  ticketTypeName?: string;
  usedAt?: string | null;
  stats?: { used: number; total: number };
  error?: string;
}

type QrScannerInstance = { start: () => Promise<void>; stop: () => void; destroy: () => void };

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tones = ok ? [880] : [220, 180];
    tones.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = ok ? "sine" : "square";
      g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      o.start(t);
      o.stop(t + 0.14);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // sin audio, no pasa nada
  }
}

export function Scanner({
  events,
  defaultEventId,
  initialStats,
}: {
  events: Array<{ id: string; name: string; startsAt: string }>;
  defaultEventId: string;
  initialStats: { used: number; total: number };
}) {
  const [eventId, setEventId] = useState(defaultEventId);
  const [stats, setStats] = useState(initialStats);
  const [result, setResult] = useState<ScanApiResponse | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "error">("off");
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerInstance | null>(null);
  const lastRef = useRef<{ data: string; at: number }>({ data: "", at: 0 });
  const blockedRef = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setResult(null);
    blockedRef.current = false;
  }, []);

  const submit = useCallback(
    async (input: string) => {
      if (blockedRef.current || !input.trim()) return;
      blockedRef.current = true;
      setBusy(true);
      try {
        const res = await fetch("/api/admin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, eventId }),
        });
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data = (await res.json()) as ScanApiResponse;
        if (!res.ok) throw new Error(data.error ?? "Error");
        setResult(data);
        if (data.stats) setStats(data.stats);
        const ok = data.result === "ok";
        navigator.vibrate?.(ok ? 120 : [80, 60, 80, 60, 200]);
        beep(ok);
        dismissTimer.current = setTimeout(dismiss, ok ? 2200 : 4500);
      } catch {
        setResult({ result: "invalid", error: "Sin conexión" });
        dismissTimer.current = setTimeout(dismiss, 3000);
      } finally {
        setBusy(false);
      }
    },
    [eventId, dismiss],
  );

  const onDecode = useCallback(
    (data: string) => {
      const now = Date.now();
      // El mismo QR frente a la cámara se lee muchas veces por segundo: lo ignoramos 3 s.
      if (data === lastRef.current.data && now - lastRef.current.at < 3000) return;
      lastRef.current = { data, at: now };
      void submit(data);
    },
    [submit],
  );
  const onDecodeRef = useRef(onDecode);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    setCamera("starting");
    setCameraError("");
    try {
      const QrScanner = (await import("qr-scanner")).default;
      if (!(await QrScanner.hasCamera())) throw new Error("No encontramos una cámara en este dispositivo.");
      const scanner = new QrScanner(videoRef.current, (r) => onDecodeRef.current(r.data), {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 6,
        returnDetailedScanResult: true,
      });
      scannerRef.current = scanner;
      await scanner.start();
      setCamera("on");
    } catch (err) {
      setCamera("error");
      const msg = String((err as Error)?.message ?? err);
      setCameraError(
        /permission|denied|NotAllowed/i.test(msg)
          ? "No diste permiso para usar la cámara. Habilitalo en la configuración del navegador o usá el código manual."
          : /secure|https/i.test(msg)
            ? "La cámara solo funciona con https (o en localhost). Usá el código manual."
            : msg || "No se pudo abrir la cámara.",
      );
    }
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const changeEvent = async (id: string) => {
    setEventId(id);
    try {
      const res = await fetch("/api/admin/scan/stats?evento=" + id);
      if (res.ok) setStats(await res.json());
    } catch {
      // se actualiza en el próximo escaneo
    }
  };

  const current = events.find((e) => e.id === eventId);
  const pct = stats.total ? Math.round((stats.used / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select aria-label="Evento" className={inputClass} value={eventId} onChange={(e) => changeEvent(e.target.value)}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {formatDateShort(e.startsAt)} {formatTime(e.startsAt)}
            </option>
          ))}
        </select>
        <div className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm" aria-live="polite">
          Ingresaron <strong className="font-display text-lg tabular-nums">{stats.used}</strong> de{" "}
          <strong className="tabular-nums">{stats.total}</strong> <span className="text-muted">({pct}%)</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.6rem] border border-line bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover sm:aspect-video" muted playsInline />
        {camera !== "on" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="max-w-xs text-ink/80">
              {camera === "error" ? cameraError : `Apuntá la cámara al QR de cada entrada${current ? ` de ${current.name}` : ""}.`}
            </p>
            <Button size="lg" onClick={startCamera} disabled={camera === "starting"}>
              {camera === "starting" ? "Abriendo cámara…" : camera === "error" ? "Reintentar" : "Activar cámara"}
            </Button>
          </div>
        ) : null}
        {result ? (
          // Pantalla completa: en la puerta se tiene que ver de lejos.
          <div className="fixed inset-0 z-50 flex">
            <ScanResultScreen
              result={result.result}
              holderName={result.holderName}
              ticketTypeName={result.ticketTypeName}
              usedAt={result.usedAt}
              onDismiss={dismiss}
              className="flex-1"
            />
          </div>
        ) : null}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(manual).then(() => setManual(""));
        }}
      >
        <input
          aria-label="Código manual"
          className={`${inputClass} font-mono uppercase tracking-widest`}
          placeholder="Código: ABC-DEFG-HJK"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Button type="submit" disabled={busy || !manual.trim()}>Validar</Button>
      </form>
      <p className="text-xs text-muted">Si el QR no se lee (pantalla rota, poco brillo), tipeá el código que figura debajo del QR.</p>
    </div>
  );
}

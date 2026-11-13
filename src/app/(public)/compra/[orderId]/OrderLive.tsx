"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Countdown } from "@/components/checkout/Countdown";

/** Cuenta regresiva que refresca la página al vencer. */
export function ReservationTimer({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const onExpire = useCallback(() => router.refresh(), [router]);
  return <Countdown expiresAt={expiresAt} onExpire={onExpire} />;
}

/** Refresca cada tantos segundos (esperando que el webhook confirme el pago). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

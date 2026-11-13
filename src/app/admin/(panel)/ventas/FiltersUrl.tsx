"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { SalesFilters, type SalesFilterValue } from "@/components/admin/SalesFilters";

export function FiltersUrl({ value, events }: { value: SalesFilterValue; events: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const onChange = useCallback(
    (next: SalesFilterValue) => {
      const sp = new URLSearchParams();
      if (next.view !== "ordenes") sp.set("vista", next.view);
      if (next.eventId) sp.set("evento", next.eventId);
      if (next.status) sp.set("estado", next.status);
      if (next.q) sp.set("q", next.q);
      startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
    },
    [router, pathname],
  );
  return (
    <div className={pending ? "opacity-70 transition" : "transition"}>
      <SalesFilters value={value} events={events} onChange={onChange} />
    </div>
  );
}

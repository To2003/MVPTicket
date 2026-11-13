"use client";

import { EventForm, type EventFormValues } from "@/components/admin/EventForm";
import { saveEventAction } from "./actions";

export function EventFormClient({ initial, isNew }: { initial: EventFormValues; isNew: boolean }) {
  return (
    <EventForm
      initial={initial}
      isNew={isNew}
      submitLabel={isNew ? "Crear evento" : "Guardar cambios"}
      onSubmit={async (values, flyer) => {
        const fd = new FormData();
        fd.set(
          "payload",
          JSON.stringify({
            id: values.id,
            name: values.name,
            slug: values.slug,
            description: values.description,
            startsAt: values.startsAt,
            venueName: values.venueName,
            venueAddress: values.venueAddress,
            publish: values.publish,
            ticketTypes: values.ticketTypes.map((t) => ({ id: t.id, name: t.name, price: t.price, capacity: t.capacity })),
          }),
        );
        if (flyer) fd.set("flyer", flyer);
        return saveEventAction(fd);
      }}
    />
  );
}

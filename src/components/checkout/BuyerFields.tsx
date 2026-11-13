import { Field, inputClass } from "@/components/ui/Field";

export interface BuyerValues {
  name?: string;
  email?: string;
  dni?: string;
}

/** Campos del comprador. Los usa el checkout real y la simulación. */
export function BuyerFields({
  values = {},
  errors = {},
  onChange,
}: {
  values?: BuyerValues;
  errors?: Record<string, string | undefined>;
  onChange?: (field: keyof BuyerValues, value: string) => void;
}) {
  const controlled = Boolean(onChange);
  const bind = (field: keyof BuyerValues) =>
    controlled
      ? { value: values[field] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange!(field, e.target.value) }
      : { defaultValue: values[field] };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nombre y apellido" htmlFor="b-name" error={errors.name} hint="Va a figurar en las entradas">
        <input id="b-name" name="name" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} required {...bind("name")} />
      </Field>
      <Field label="Mail" htmlFor="b-email" error={errors.email} hint="Ahí te mandamos las entradas con el QR">
        <input id="b-email" name="email" type="email" inputMode="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} required {...bind("email")} />
      </Field>
      <Field label="DNI" htmlFor="b-dni" error={errors.dni} hint="Solo números, sin puntos">
        <input id="b-dni" name="dni" inputMode="numeric" autoComplete="off" className={inputClass} aria-invalid={!!errors.dni} required {...bind("dni")} />
      </Field>
    </div>
  );
}

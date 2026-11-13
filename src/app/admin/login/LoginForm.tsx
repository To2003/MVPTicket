"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Mail" htmlFor="l-email">
        <input id="l-email" name="email" type="email" autoComplete="username" inputMode="email" className={inputClass} defaultValue={state.email} required />
      </Field>
      <Field label="Contraseña" htmlFor="l-pass">
        <input id="l-pass" name="password" type="password" autoComplete="current-password" className={inputClass} required />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  // A full page load rather than a router redirect: admin pages redirect while streaming, and if
  // you arrived here through one of those, a router redirect back to that page stays on this form.
  useEffect(() => {
    if (state?.goTo) window.location.assign(state.goTo);
  }, [state]);

  return (
    <form action={formAction} className="admin-form">
      <label className="field">
        Email
        <input type="email" name="email" autoComplete="email" defaultValue={state?.email} required />
      </label>
      <label className="field">
        Kata sandi
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending || Boolean(state?.goTo)}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

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
      {state && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}

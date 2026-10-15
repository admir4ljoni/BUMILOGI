"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthFx } from "./auth-shell";

const FIELDS = {
  name: { name: "full_name", label: "Nama lengkap", autoComplete: "name", required: true },
  email: { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  phone: { name: "phone_number", label: "Nomor WhatsApp (opsional)", type: "tel", autoComplete: "tel" },
  password: { name: "password", label: "Kata sandi", type: "password", autoComplete: "current-password", required: true },
  newPassword: {
    name: "password",
    label: "Kata sandi",
    type: "password",
    autoComplete: "new-password",
    required: true,
    minLength: 8,
    maxLength: 72,
    hint: "Minimal 8 karakter.",
  },
} satisfies Record<string, { name: string; label: string; type?: string; autoComplete: string; required?: boolean; minLength?: number; maxLength?: number; hint?: string }>;

// Only same-site paths, so ?next= can't bounce the user to another origin.
function nextPath() {
  const n = new URLSearchParams(location.search).get("next");
  return n?.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/akun";
}

export function AuthForm({
  endpoint,
  fields,
  submitLabel,
  onSuccess,
  autoSubmit,
  footer,
}: {
  endpoint: "login" | "register" | "forgot-password" | "reset-password" | "verify-email";
  fields: (keyof typeof FIELDS)[];
  submitLabel: string;
  onSuccess: "redirect" | "message"; // redirect = the API logged the user in
  autoSubmit?: boolean; // verify-email: submit the link's token on load
  footer?: ReactNode;
}) {
  const router = useRouter();
  const fx = useAuthFx();
  const [pending, setPending] = useState(!!autoSubmit);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const started = useRef(false);

  async function submit(form?: HTMLFormElement) {
    setPending(true);
    setError("");
    const body: Record<string, FormDataEntryValue | null> = form ? Object.fromEntries(new FormData(form)) : {};
    const token = new URLSearchParams(location.search).get("token");
    if (token) body.token = token;
    try {
      const res = await fetch(`/api/v1/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Terjadi kesalahan. Coba lagi.");
      await fx.success();
      if (onSuccess === "redirect") {
        router.replace(nextPath());
        router.refresh();
      } else {
        setDone(json.message ?? json.data?.message);
        setPending(false);
      }
    } catch (e) {
      setError(e instanceof TypeError ? "Koneksi terputus. Periksa internetmu lalu coba lagi." : (e as Error).message);
      setPending(false);
      fx.error();
    }
  }

  useEffect(() => {
    // started guards React's dev double-run: a verify token only works once.
    if (autoSubmit && !started.current) {
      started.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) {
    return (
      <div className="form-note form-success" role="status">
        <span aria-hidden="true">✓</span> {done}
      </div>
    );
  }

  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {fields.map((key) => {
        const { label, hint, ...input } = FIELDS[key] as (typeof FIELDS)[keyof typeof FIELDS] & { hint?: string };
        return (
          <label key={key} className="field">
            <span className="field-label">{label}</span>
            <input className="input" {...input} disabled={pending} />
            {hint && <span className="field-hint">{hint}</span>}
          </label>
        );
      })}

      {error && (
        <p className="form-note form-error" role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
      {autoSubmit && pending && (
        <p className="form-note" role="status">
          Memverifikasi email…
        </p>
      )}
      {(!autoSubmit || error) && fields.length > 0 && (
        <button className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Memproses…" : submitLabel}
        </button>
      )}
      {footer && <div className="auth-links">{footer}</div>}
    </form>
  );
}

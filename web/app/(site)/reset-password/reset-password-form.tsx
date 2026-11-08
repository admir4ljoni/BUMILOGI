"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const MIN_PASSWORD = 8; // Better Auth's default minimum

async function post(path: string, body: object) {
  const response = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!response) return "Tidak bisa terhubung. Periksa koneksi internet, lalu coba lagi.";
  if (response.ok) return null;
  const data = await response.json().catch(() => null);
  if (data?.code === "INVALID_TOKEN") return "Tautan ini sudah kedaluwarsa atau sudah dipakai. Minta tautan baru di bawah.";
  if (response.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
  return "Gagal. Coba lagi sebentar lagi.";
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [askNew, setAskNew] = useState(false);

  async function onRequest(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("busy");
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    const failed = await post("request-password-reset", { email });
    setError(failed);
    setState(failed ? "idle" : "sent");
  }

  async function onReset(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirm")) return setError("Kedua kata sandi tidak sama.");
    setState("busy");
    const failed = await post("reset-password", { token, newPassword: password });
    setError(failed);
    if (failed?.startsWith("Tautan")) setAskNew(true);
    setState(failed ? "idle" : "done");
  }

  const errorLine = error && (
    <p className="form-error" role="alert">
      {error}
    </p>
  );

  if (state === "done")
    return (
      <p className="lead">
        Kata sandi sudah diganti. Silakan masuk lagi di aplikasi BUMILOGI, atau di <a href="/admin/login">halaman admin</a> untuk admin.
      </p>
    );
  if (state === "sent") return <p className="lead">Kalau email itu terdaftar, tautan untuk mengatur ulang sudah dikirim. Periksa juga folder Spam. Tautannya berlaku 1 jam.</p>;

  if (token && !askNew)
    return (
      <form onSubmit={onReset} className="admin-form">
        <label className="field">
          Kata sandi baru
          <input type="password" name="password" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={128} required />
          <span className="field-hint">Minimal {MIN_PASSWORD} karakter.</span>
        </label>
        <label className="field">
          Ulangi kata sandi baru
          <input type="password" name="confirm" autoComplete="new-password" minLength={MIN_PASSWORD} maxLength={128} required />
        </label>
        {errorLine}
        <button type="submit" className="btn btn-primary" disabled={state === "busy"}>
          {state === "busy" ? "Menyimpan…" : "Simpan kata sandi"}
        </button>
      </form>
    );

  return (
    <form onSubmit={onRequest} className="admin-form">
      <p className="muted">Masukkan email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.</p>
      <label className="field">
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      {errorLine}
      <button type="submit" className="btn btn-primary" disabled={state === "busy"}>
        {state === "busy" ? "Mengirim…" : "Kirim tautan"}
      </button>
    </form>
  );
}

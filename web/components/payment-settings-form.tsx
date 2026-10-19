"use client";

import { useState, type SubmitEvent } from "react";
import type { Payment } from "@/lib/orders";

const FIELDS = [
  { name: "bank_name", label: "Nama bank", placeholder: "BCA", maxLength: 50 },
  { name: "account_number", label: "Nomor rekening", placeholder: "1234567890", inputMode: "numeric", maxLength: 30 },
  { name: "account_holder", label: "Atas nama", placeholder: "Nama pemilik rekening", maxLength: 100 },
  { name: "whatsapp", label: "Nomor WhatsApp admin", placeholder: "0812 3456 7890", type: "tel", maxLength: 20 },
] as const;

export function PaymentSettingsForm({ initial }: { initial: Payment | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/v1/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Terjadi kesalahan. Coba lagi.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof TypeError ? "Koneksi terputus. Periksa internetmu lalu coba lagi." : (e as Error).message);
    }
    setPending(false);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <p className="label" style={{ color: "var(--ink-muted)", margin: 0 }}>
        Admin
      </p>
      <h1 className="auth-title">Pengaturan pembayaran</h1>
      <p className="muted">Ditampilkan ke pembeli di halaman pesanan. Perubahan langsung berlaku, juga untuk pesanan yang belum dibayar.</p>
      {!initial && (
        <p className="form-note" role="status">
          <span aria-hidden="true">i</span> Belum diatur: pembeli belum melihat rekening maupun tombol WhatsApp.
        </p>
      )}
      {FIELDS.map(({ label, ...f }) => (
        <label key={f.name} className="field" style={{ width: "100%" }}>
          <span className="field-label">{label}</span>
          <input className="input" {...f} defaultValue={initial?.[f.name] ?? ""} required disabled={pending} />
        </label>
      ))}
      {error && (
        <p className="form-note form-error" role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
      {saved && (
        <p className="form-note form-success" role="status">
          <span aria-hidden="true">✓</span> Tersimpan.
        </p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}

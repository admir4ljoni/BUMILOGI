"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 5 << 20; // matches the API; it checks again

export function ProofUpload({ orderId, hasProof }: { orderId: string; hasProof: boolean }) {
  const router = useRouter();
  const [replacing, setReplacing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const url = `/api/v1/preorders/${orderId}/payment-proof`;

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if ((data.get("file") as File).size > MAX_BYTES) return setError("Ukuran file maksimal 5 MB.");
    setPending(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Gagal mengunggah. Coba lagi.");
      setReplacing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof TypeError ? "Koneksi terputus. Periksa internetmu lalu coba lagi." : (e as Error).message);
    }
    setPending(false);
  }

  if (hasProof && !replacing)
    return (
      <div className="order-row">
        <p className="form-note form-success" role="status" style={{ flex: 1 }}>
          <span aria-hidden="true">✓</span> Bukti transfer terunggah.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            Lihat bukti
          </a>
        </p>
        <button type="button" className="btn-ghost" onClick={() => setReplacing(true)}>
          Ganti bukti
        </button>
      </div>
    );

  return (
    <form className="checkout-section" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Bukti transfer</span>
        <input className="input" type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required disabled={pending} />
        <span className="field-hint">Foto atau tangkapan layar bukti transfer (JPG, PNG, WEBP, atau PDF, maks. 5 MB).</span>
      </label>
      {error && (
        <p className="form-note form-error" role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
      <button className="btn btn-secondary btn-block" disabled={pending}>
        {pending ? "Mengunggah…" : "Unggah bukti"}
      </button>
    </form>
  );
}

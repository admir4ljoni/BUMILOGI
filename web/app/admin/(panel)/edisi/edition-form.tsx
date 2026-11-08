"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Edition } from "@/lib/db/schema";
import { EDITION_COLORS } from "@/lib/editions";

const lines = (text: FormDataEntryValue | null) =>
  String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function EditionForm({ edition }: { edition: Edition | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState(edition?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The image goes straight from the browser to Vercel Blob; only its URL is saved with the edition.
  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(`edisi/${file.name}`, file, { access: "public", handleUploadUrl: "/api/v1/uploads" });
      setImageUrl(blob.url);
    } catch {
      setError("Gagal mengunggah gambar. Pakai JPG, PNG, atau WebP maksimal 5 MB, lalu coba lagi.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function send(method: string, url: string, body?: object) {
    setSaving(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body && JSON.stringify(body),
    }).catch(() => null);
    if (response?.ok) {
      if (!edition) {
        // Start the next new edition from an empty form.
        formRef.current?.reset();
        setImageUrl(null);
      }
      router.push("/admin/edisi");
      router.refresh();
    } else {
      const data = await response?.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan. Periksa koneksi internet, lalu coba lagi.");
    }
    // Also after success: Next keeps a visited page's state, so the form must be usable when you come back.
    setSaving(false);
  }

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get("name"),
      slug: form.get("slug"),
      tagline: form.get("tagline"),
      description: form.get("description"),
      contents: lines(form.get("contents")),
      animals: lines(form.get("animals")),
      price_idr: Number(form.get("price_idr")),
      shopee_url: form.get("shopee_url"),
      color: form.get("color"),
      sort_order: Number(form.get("sort_order")),
      image_url: imageUrl,
    };
    if (edition) send("PUT", `/api/v1/editions/${edition.id}`, body);
    else send("POST", "/api/v1/editions", body);
  }

  function onDelete() {
    if (edition && confirm(`Hapus ${edition.name}? Tindakan ini tidak bisa dibatalkan.`)) send("DELETE", `/api/v1/editions/${edition.id}`);
  }

  const busy = uploading || saving;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="admin-form edition-form">
      <label className="field">
        Nama
        <input name="name" defaultValue={edition?.name} maxLength={80} required />
      </label>
      <label className="field">
        Slug (alamat halaman)
        <input name="slug" defaultValue={edition?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} required />
        <span className="field-hint">Huruf kecil dan tanda hubung, misalnya set-rimba → /produk/set-rimba</span>
      </label>
      <label className="field">
        Tagline
        <input name="tagline" defaultValue={edition?.tagline} maxLength={120} required />
      </label>
      <label className="field">
        Deskripsi
        <textarea name="description" defaultValue={edition?.description} rows={4} maxLength={2000} required />
      </label>
      <label className="field">
        Isi set
        <textarea name="contents" defaultValue={edition?.contents.join("\n")} rows={5} required />
        <span className="field-hint">Satu barang per baris.</span>
      </label>
      <label className="field">
        Satwa dan habitat
        <textarea name="animals" defaultValue={edition?.animals.join("\n")} rows={3} required />
        <span className="field-hint">Satu per baris.</span>
      </label>
      <label className="field">
        Harga (Rp)
        <input name="price_idr" type="number" min={1} step={1} defaultValue={edition?.price_idr} required />
      </label>
      <label className="field">
        Link Shopee
        <input name="shopee_url" type="url" defaultValue={edition?.shopee_url} placeholder="https://shopee.co.id/..." required />
      </label>
      <label className="field">
        Warna
        <select name="color" defaultValue={edition?.color ?? "green"}>
          {Object.entries(EDITION_COLORS).map(([token, label]) => (
            <option key={token} value={token}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Urutan
        <input name="sort_order" type="number" step={1} defaultValue={edition?.sort_order ?? 0} required />
        <span className="field-hint">Angka kecil tampil lebih dulu.</span>
      </label>

      <div className="field">
        Gambar
        {imageUrl && <Image src={imageUrl} alt="" width={240} height={240} className="edition-image" />}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} disabled={busy} aria-label="Pilih gambar" />
        <span className="field-hint">{uploading ? "Mengunggah…" : "JPG, PNG, atau WebP, maksimal 5 MB."}</span>
        {imageUrl && (
          <button type="button" className="btn btn-sm" onClick={() => setImageUrl(null)} disabled={busy}>
            Hapus gambar
          </button>
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        {edition && (
          <button type="button" className="btn" onClick={onDelete} disabled={busy}>
            Hapus edisi
          </button>
        )}
      </div>
    </form>
  );
}

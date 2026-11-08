"use client";

import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Edition } from "@/lib/db/schema";
import { EDITION_COLORS } from "@/lib/editions";
import { formatIDR } from "@/lib/products";
import { EditionPicture } from "./edition-picture";

type Draft = Omit<Edition, "id" | "image_url" | "created_at" | "updated_at">;

const EMPTY: Draft = { name: "", slug: "", tagline: "", description: "", contents: [], animals: [], price_idr: 0, shopee_url: "", color: "green", sort_order: 0 };

const lines = (text: FormDataEntryValue | null) =>
  String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

// "Set Rimba Raya" → "set-rimba-raya"
const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");

// The same fields the API expects; read on every keystroke for the preview and once more on save.
function readForm(form: HTMLFormElement): Draft {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    slug: String(data.get("slug") ?? ""),
    tagline: String(data.get("tagline") ?? ""),
    description: String(data.get("description") ?? ""),
    contents: lines(data.get("contents")),
    animals: lines(data.get("animals")),
    price_idr: Number(data.get("price_idr")),
    shopee_url: String(data.get("shopee_url") ?? ""),
    color: String(data.get("color") ?? "green"),
    sort_order: Number(data.get("sort_order")),
  };
}

export function EditionForm({ edition }: { edition: Edition | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initial = edition ?? EMPTY;
  const [draft, setDraft] = useState<Draft>(initial);
  const [imageUrl, setImageUrl] = useState(edition?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new edition's slug follows its name until the admin types a slug themselves.
  const slugEdited = useRef(edition !== null);

  function onInput(event: React.InputEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = event.target as HTMLInputElement;
    if (input.name === "slug") slugEdited.current = true;
    if (input.name === "name" && !slugEdited.current) (form.elements.namedItem("slug") as HTMLInputElement).value = slugify(input.value);
    setDraft(readForm(form));
  }

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

  async function send(method: string, url: string, message: string, body?: object) {
    setSaving(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body && JSON.stringify(body),
    }).catch(() => null);
    if (response?.ok) {
      if (!edition) {
        // Next keeps a visited page's state: start the next new edition from an empty form.
        formRef.current?.reset();
        setDraft(EMPTY);
        setImageUrl(null);
        slugEdited.current = false;
      }
      router.push(`/admin/edisi?pesan=${message}`);
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
    const body = { ...readForm(event.currentTarget), image_url: imageUrl };
    if (edition) send("PUT", `/api/v1/editions/${edition.id}`, "disimpan", body);
    else send("POST", "/api/v1/editions", "disimpan", body);
  }

  function onDelete() {
    if (edition && confirm(`Hapus ${edition.name}? Tindakan ini tidak bisa dibatalkan.`)) send("DELETE", `/api/v1/editions/${edition.id}`, "dihapus");
  }

  const busy = uploading || saving;

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={onInput} className="editor">
      <div className="editor-fields">
        <fieldset className="admin-section">
          <legend>Foto dan warna</legend>
          <div className="image-picker">
            <EditionPicture name={draft.name} color={draft.color} imageUrl={imageUrl} />
            <div className="image-picker-side">
              <label className="btn btn-sm file-btn">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} disabled={busy} className="sr-only" />
                {uploading ? "Mengunggah…" : imageUrl ? "Ganti foto" : "Pilih foto"}
              </label>
              {imageUrl && (
                <button type="button" className="btn btn-sm" onClick={() => setImageUrl(null)} disabled={busy}>
                  Hapus foto
                </button>
              )}
              <span className="field-hint">JPG, PNG, atau WebP, maks. 5 MB. Foto persegi paling pas. Tanpa foto, situs memakai warna edisi.</span>
            </div>
          </div>
          <div className="field">
            <span id="color-label">Warna edisi</span>
            <div className="swatches" role="radiogroup" aria-labelledby="color-label">
              {Object.entries(EDITION_COLORS).map(([token, label]) => (
                <label key={token} className="swatch">
                  <input type="radio" name="color" value={token} defaultChecked={initial.color === token} className="sr-only" />
                  <span className="swatch-dot" style={{ background: `var(--${token})` }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-section">
          <legend>Nama dan deskripsi</legend>
          <div className="field-row">
            <label className="field">
              Nama
              <input name="name" defaultValue={initial.name} maxLength={80} placeholder="Set Rimba" required />
            </label>
            <label className="field">
              Alamat halaman
              <span className="input-prefix">
                <span aria-hidden="true">/produk/</span>
                <input name="slug" defaultValue={initial.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} placeholder="set-rimba" required aria-describedby="slug-hint" />
              </span>
            </label>
          </div>
          <span className="field-hint" id="slug-hint">
            Huruf kecil, angka, dan tanda hubung. {edition ? "Mengubahnya membuat link lama tidak berlaku." : "Terisi otomatis dari nama."}
          </span>
          <label className="field">
            Tagline
            <input name="tagline" defaultValue={initial.tagline} maxLength={120} placeholder="Hutan hujan tropis" required />
          </label>
          <label className="field">
            Deskripsi
            <textarea name="description" defaultValue={initial.description} rows={4} maxLength={2000} required />
          </label>
        </fieldset>

        <fieldset className="admin-section">
          <legend>Isi kotak</legend>
          <div className="field-row">
            <label className="field">
              Isi set
              <textarea name="contents" defaultValue={initial.contents.join("\n")} rows={6} placeholder={"Papan koding 6×6\n26 keping panah"} required />
              <span className="field-hint">Satu barang per baris.</span>
            </label>
            <label className="field">
              Satwa dan habitat
              <textarea name="animals" defaultValue={initial.animals.join("\n")} rows={6} placeholder={"Badak Jawa\nOrangutan"} required />
              <span className="field-hint">Satu per baris.</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="admin-section">
          <legend>Penjualan</legend>
          <div className="field-row">
            <label className="field">
              Harga (Rp)
              <input name="price_idr" type="number" min={1} step={1} defaultValue={initial.price_idr || ""} placeholder="250000" required />
            </label>
            <label className="field">
              Urutan di situs
              <input name="sort_order" type="number" step={1} defaultValue={initial.sort_order} required aria-describedby="sort-hint" />
            </label>
          </div>
          <span className="field-hint" id="sort-hint">
            Urutan: angka kecil tampil lebih dulu.
          </span>
          <label className="field">
            Link Shopee
            <input name="shopee_url" type="url" defaultValue={initial.shopee_url} placeholder="https://shopee.co.id/..." required />
          </label>
        </fieldset>

        <div className="editor-actions">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {saving ? "Menyimpan…" : edition ? "Simpan perubahan" : "Tambah edisi"}
          </button>
          <Link href="/admin/edisi" className="btn">
            Batal
          </Link>
          {edition && (
            <button type="button" className="btn btn-danger" onClick={onDelete} disabled={busy}>
              Hapus edisi
            </button>
          )}
        </div>
      </div>

      <aside className="editor-preview" aria-label="Pratinjau halaman produk">
        <p className="editor-preview-label">Pratinjau di situs</p>
        <EditionPreview draft={draft} imageUrl={imageUrl} />
      </aside>
    </form>
  );
}

// A small copy of the product page (app/(site)/produk/[slug]) that updates while typing.
function EditionPreview({ draft, imageUrl }: { draft: Draft; imageUrl: string | null }) {
  return (
    <div className="preview">
      <div className="preview-bar" aria-hidden="true">
        <span className="preview-dots" />
        /produk/{draft.slug || "…"}
      </div>
      <div className="preview-page">
        <EditionPicture name={draft.name} color={draft.color} imageUrl={imageUrl} />
        <p className="preview-tagline">{draft.tagline || "Tagline"}</p>
        <h2>{draft.name || "Nama edisi"}</h2>
        <p className="preview-text">{draft.description || "Deskripsi edisi tampil di sini."}</p>
        <p className="preview-price">{draft.price_idr > 0 ? formatIDR(draft.price_idr) : "Rp —"}</p>
        <span className="btn btn-primary btn-sm">Beli Sekarang</span>
        <h3>Isi set</h3>
        <ul className="checks">
          {(draft.contents.length ? draft.contents : ["Isi set tampil di sini"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <h3>Tokoh dan habitat</h3>
        <ul className="animal-list">
          {(draft.animals.length ? draft.animals : ["Satwa tampil di sini"]).map((item, i) => (
            <li key={i}>
              <span className="dot" style={{ background: `var(--${draft.color})` }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

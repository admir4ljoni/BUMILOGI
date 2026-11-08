// Checks an edition sent to the admin API (POST/PUT /api/v1/editions) before it touches the database.
import type { Edition } from "./db/schema";

// Palette tokens in globals.css an edition may use; the site paints with `var(--${color})`.
export const EDITION_COLORS = {
  green: "Hijau",
  blue: "Biru",
  pink: "Merah muda",
  purple: "Ungu",
  yellow: "Kuning",
  orange: "Oranye",
};

// Images must come from our Vercel Blob store: next.config.ts only allows that host,
// and the API deletes replaced images there.
const BLOB_HOST = ".public.blob.vercel-storage.com";

export type EditionInput = Omit<Edition, "id" | "created_at" | "updated_at">;

type Result = { data: EditionInput; error: null } | { data: null; error: string };

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() !== "" && value.trim().length <= maxLength ? value.trim() : null;
}

function textList(value: unknown) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => text(item, 200));
  return items.length > 0 && items.length <= 20 && items.every((item) => item !== null) ? (items as string[]) : null;
}

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function parseEdition(body: unknown): Result {
  if (typeof body !== "object" || body === null) return { data: null, error: "Data edisi tidak valid." };
  const b = body as Record<string, unknown>;

  const slug = typeof b.slug === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug) && b.slug.length <= 60 ? b.slug : null;
  if (!slug) return { data: null, error: "Slug hanya boleh huruf kecil, angka, dan tanda hubung, misalnya set-rimba." };

  const name = text(b.name, 80);
  if (!name) return { data: null, error: "Nama wajib diisi (maks. 80 karakter)." };
  const tagline = text(b.tagline, 120);
  if (!tagline) return { data: null, error: "Tagline wajib diisi (maks. 120 karakter)." };
  const description = text(b.description, 2000);
  if (!description) return { data: null, error: "Deskripsi wajib diisi (maks. 2000 karakter)." };

  const contents = textList(b.contents);
  if (!contents) return { data: null, error: "Isi set wajib diisi: 1–20 baris, tiap baris maks. 200 karakter." };
  const animals = textList(b.animals);
  if (!animals) return { data: null, error: "Satwa wajib diisi: 1–20 baris, tiap baris maks. 200 karakter." };

  const price = b.price_idr;
  if (typeof price !== "number" || !Number.isInteger(price) || price <= 0 || price > 100_000_000)
    return { data: null, error: "Harga harus angka bulat lebih dari 0." };

  const shopee = httpsUrl(b.shopee_url);
  if (!shopee) return { data: null, error: "Link Shopee harus alamat https:// yang lengkap." };

  if (typeof b.buy_enabled !== "boolean") return { data: null, error: "Pilih apakah tombol Beli aktif." };

  let image_url: string | null = null;
  if (b.image_url !== null && b.image_url !== undefined) {
    const image = httpsUrl(b.image_url);
    if (!image || !image.hostname.endsWith(BLOB_HOST)) return { data: null, error: "Gambar harus diunggah lewat formulir ini." };
    image_url = image.href;
  }

  if (typeof b.color !== "string" || !Object.hasOwn(EDITION_COLORS, b.color)) return { data: null, error: "Pilih salah satu warna." };

  const sort = b.sort_order;
  if (typeof sort !== "number" || !Number.isInteger(sort) || Math.abs(sort) > 1000)
    return { data: null, error: "Urutan harus angka bulat." };

  return {
    data: { slug, name, tagline, description, contents, animals, price_idr: price, shopee_url: shopee.href, buy_enabled: b.buy_enabled, image_url, color: b.color, sort_order: sort },
    error: null,
  };
}

// Postgres error 23505: a unique column (here the slug) already has this value. Drizzle wraps the
// driver's error, so the code sits on `cause`.
export function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === "23505";
}

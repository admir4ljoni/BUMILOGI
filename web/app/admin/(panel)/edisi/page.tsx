import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels } from "@/lib/db/schema";
import { formatIDR } from "@/lib/products";
import { EditionPicture } from "./edition-picture";

export const metadata: Metadata = { title: "Edisi — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

// `?pesan=disimpan|dihapus` is set by the edition form after it saves or deletes.
const MESSAGES = new Map([
  ["disimpan", "Edisi disimpan. Halaman situs sudah diperbarui."],
  ["dihapus", "Edisi dihapus."],
]);

export default async function EditionsPage({ searchParams }: PageProps<"/admin/edisi">) {
  await requireAdminPage();
  const { pesan } = await searchParams;
  const message = typeof pesan === "string" ? MESSAGES.get(pesan) : undefined;

  const rows = await db
    .select({ edition: editions, level_count: count(levels.id) })
    .from(editions)
    .leftJoin(levels, eq(levels.edition_id, editions.id))
    .groupBy(editions.id)
    .orderBy(asc(editions.sort_order), asc(editions.id));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Edisi</h1>
          <p className="muted">Set mainan yang dijual. Urutan di sini sama dengan urutan di situs.</p>
        </div>
        <Link href="/admin/edisi/baru" className="btn btn-primary btn-sm">
          + Tambah edisi
        </Link>
      </div>

      {message && (
        <p className="admin-flash" role="status">
          {message}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="admin-empty">Belum ada edisi. Tambahkan edisi pertama untuk mulai membuat level.</p>
      ) : (
        <ul className="admin-grid edition-grid">
          {rows.map(({ edition: e, level_count }) => (
            <li key={e.id} className="admin-card">
              <Link href={`/admin/edisi/${e.id}`} className="admin-card-main">
                <EditionPicture name={e.name} color={e.color} imageUrl={e.image_url} />
                <span className="admin-card-body">
                  <strong className="admin-card-title">{e.name}</strong>
                  <span className="muted">{e.tagline}</span>
                  <span className="edition-price">{formatIDR(e.price_idr)}</span>
                </span>
              </Link>
              <div className="admin-card-foot">
                <Link href={`/admin/level?edisi=${e.id}`}>{level_count} level</Link>
                <a href={`/produk/${e.slug}`} target="_blank" rel="noopener noreferrer">
                  /produk/{e.slug} ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

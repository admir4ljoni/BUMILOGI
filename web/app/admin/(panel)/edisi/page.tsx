import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { formatIDR } from "@/lib/products";

export const metadata: Metadata = { title: "Edisi — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

export default async function EditionsPage() {
  await requireAdminPage();
  const rows = await db.select().from(editions).orderBy(asc(editions.sort_order), asc(editions.id));

  return (
    <>
      <div className="admin-head">
        <h1>Edisi</h1>
        <Link href="/admin/edisi/baru" className="btn btn-primary btn-sm">
          Tambah edisi
        </Link>
      </div>
      <ul className="admin-list">
        {rows.map((e) => (
          <li key={e.id}>
            <span className="dot" style={{ background: `var(--${e.color})` }} />
            <Link href={`/admin/edisi/${e.id}`}>
              <strong>{e.name}</strong>
            </Link>
            <span className="muted">/produk/{e.slug}</span>
            <span>{formatIDR(e.price_idr)}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="muted">Belum ada edisi.</p>}
    </>
  );
}

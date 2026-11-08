import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, editions, levels } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Level — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function LevelsPage() {
  await requireAdminPage();
  const rows = await db
    .select({
      id: levels.id,
      title: levels.title,
      optimal_tiles: levels.optimal_tiles,
      published_at: levels.published_at,
      on_site: levels.on_site,
      color: editions.color,
      edition_name: editions.name,
      attempt_count: count(attempts.id),
    })
    .from(levels)
    .innerJoin(editions, eq(levels.edition_id, editions.id))
    .leftJoin(attempts, eq(attempts.level_id, levels.id))
    .groupBy(levels.id, editions.id)
    .orderBy(asc(levels.sort_order), asc(levels.id));

  return (
    <>
      <div className="admin-head">
        <h1>Level</h1>
        <Link href="/admin/level/baru" className="btn btn-primary btn-sm">
          Tambah level
        </Link>
      </div>
      <ul className="admin-list">
        {rows.map((l) => (
          <li key={l.id}>
            <span className="dot" style={{ background: `var(--${l.color})` }} title={l.edition_name} />
            <Link href={`/admin/level/${l.id}`}>
              <strong>{l.title}</strong>
            </Link>
            <span className="muted">{l.optimal_tiles} keping</span>
            <span>{l.published_at ? `Terbit ${dateFormat.format(new Date(l.published_at))}` : "Draf"}</span>
            {l.on_site && <span className="chip" style={{ background: "var(--sand)" }}>di situs</span>}
            {l.attempt_count > 0 && <span className="muted">{l.attempt_count} jawaban · terkunci</span>}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="muted">Belum ada level.</p>}
    </>
  );
}

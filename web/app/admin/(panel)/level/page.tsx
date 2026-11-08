import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, editions, levels } from "@/lib/db/schema";
import { dateInIndonesia } from "@/lib/teacher";
import { MiniBoard } from "./mini-board";

export const metadata: Metadata = { title: "Level — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// `?pesan=disimpan|dihapus` is set by the level form after it saves or deletes.
const MESSAGES = new Map([
  ["disimpan", "Level disimpan."],
  ["dihapus", "Level dihapus."],
]);

const STATUSES = [
  { key: "", label: "Semua" },
  { key: "draf", label: "Draf" },
  { key: "terjadwal", label: "Terjadwal" },
  { key: "terbit", label: "Terbit" },
  { key: "situs", label: "Di papan situs" },
];

// Teachers see a level from its publish date (Indonesian time); null means a draft.
function publishStatus(publishedAt: string | null, today: string) {
  if (!publishedAt) return "draf";
  return publishedAt > today ? "terjadwal" : "terbit";
}

function filterHref(edition: string, status: string) {
  const query = new URLSearchParams();
  if (edition) query.set("edisi", edition);
  if (status) query.set("status", status);
  return query.size ? `/admin/level?${query}` : "/admin/level";
}

export default async function LevelsPage({ searchParams }: PageProps<"/admin/level">) {
  await requireAdminPage();
  const params = await searchParams;
  const editionFilter = typeof params.edisi === "string" ? params.edisi : "";
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const message = typeof params.pesan === "string" ? MESSAGES.get(params.pesan) : undefined;
  const today = dateInIndonesia(new Date());

  const editionRows = await db.select({ id: editions.id, name: editions.name, color: editions.color }).from(editions).orderBy(asc(editions.sort_order), asc(editions.id));
  const allLevels = await db
    .select({ level: levels, color: editions.color, edition_name: editions.name, attempt_count: count(attempts.id) })
    .from(levels)
    .innerJoin(editions, eq(levels.edition_id, editions.id))
    .leftJoin(attempts, eq(attempts.level_id, levels.id))
    .groupBy(levels.id, editions.id)
    .orderBy(asc(levels.sort_order), asc(levels.id));

  // ponytail: filtered in JS, fine for a few hundred levels; move into the query if it grows past that.
  const rows = allLevels.filter(({ level }) => {
    if (editionFilter && String(level.edition_id) !== editionFilter) return false;
    if (statusFilter === "situs") return level.on_site;
    return !statusFilter || publishStatus(level.published_at, today) === statusFilter;
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Level</h1>
          <p className="muted">Teka-teki papan 6×6. Guru melihat level mulai tanggal terbitnya.</p>
        </div>
        <Link href="/admin/level/baru" className="btn btn-primary btn-sm">
          + Tambah level
        </Link>
      </div>

      {message && (
        <p className="admin-flash" role="status">
          {message}
        </p>
      )}

      <nav className="filters" aria-label="Saring level">
        <div className="filter-group">
          <Link href={filterHref("", statusFilter)} className="filter" aria-current={!editionFilter ? "true" : undefined}>
            Semua edisi
          </Link>
          {editionRows.map((e) => (
            <Link key={e.id} href={filterHref(String(e.id), statusFilter)} className="filter" aria-current={editionFilter === String(e.id) ? "true" : undefined}>
              <span className="dot" style={{ background: `var(--${e.color})` }} />
              {e.name}
            </Link>
          ))}
        </div>
        <div className="filter-group">
          {STATUSES.map((s) => (
            <Link key={s.key} href={filterHref(editionFilter, s.key)} className="filter" aria-current={statusFilter === s.key ? "true" : undefined}>
              {s.label}
            </Link>
          ))}
        </div>
      </nav>

      {rows.length === 0 ? (
        <p className="admin-empty">{allLevels.length === 0 ? "Belum ada level. Tambahkan level pertama." : "Tidak ada level yang cocok dengan saringan ini."}</p>
      ) : (
        <ul className="admin-grid level-grid">
          {rows.map(({ level: l, color, edition_name, attempt_count }) => {
            const status = publishStatus(l.published_at, today);
            return (
              <li key={l.id} className="admin-card">
                <Link href={`/admin/level/${l.id}`} className="admin-card-main">
                  <span className="level-card-board">
                    <MiniBoard {...l} color={color} />
                  </span>
                  <span className="admin-card-body">
                    <strong className="admin-card-title">{l.title}</strong>
                    <span className="muted level-card-hint">{l.hint}</span>
                    <span className="level-card-meta">
                      <span className="dot" style={{ background: `var(--${color})` }} />
                      {edition_name} · {l.optimal_tiles} keping
                    </span>
                  </span>
                </Link>
                <div className="admin-card-foot">
                  <span className={`badge is-${status}`}>
                    {status === "draf" ? "Draf" : `${status === "terbit" ? "Terbit" : "Terjadwal"} ${dateFormat.format(new Date(l.published_at!))}`}
                  </span>
                  {l.on_site && <span className="badge is-situs">Di papan situs</span>}
                  {attempt_count > 0 && (
                    <span className="badge" title="Papan terkunci karena sudah ada jawaban anak">
                      {attempt_count} jawaban · terkunci
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

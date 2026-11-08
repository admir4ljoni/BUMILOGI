import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels } from "@/lib/db/schema";
import { LevelForm } from "../level-form";

export const metadata: Metadata = { title: "Tambah level — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

// `?salin=<id>` starts from a copy of that level: the way to change a locked level's layout.
export default async function NewLevelPage({ searchParams }: PageProps<"/admin/level/baru">) {
  await requireAdminPage();
  const editionRows = await db.select({ id: editions.id, name: editions.name, color: editions.color }).from(editions).orderBy(asc(editions.sort_order), asc(editions.id));
  if (editionRows.length === 0)
    return (
      <>
        <h1>Tambah level</h1>
        <p className="muted">
          Buat <Link href="/admin/edisi/baru">edisi</Link> dulu; setiap level masuk ke satu edisi.
        </p>
      </>
    );

  const copyId = Number((await searchParams).salin);
  const [original] = Number.isInteger(copyId) && copyId > 0 ? await db.select().from(levels).where(eq(levels.id, copyId)) : [];
  const template = original
    ? { ...original, title: `${original.title} (salinan)`.slice(0, 80), published_at: null, on_site: false }
    : { edition_id: editionRows[0].id, title: "", hint: "", start_x: 0, start_y: 5, target_x: 5, target_y: 0, obstacles: [], published_at: null, on_site: false, sort_order: 0 };

  return (
    <>
      <h1>{original ? `Salin ${original.title}` : "Tambah level"}</h1>
      <LevelForm key={original?.id ?? "new"} level={null} template={template} editions={editionRows} locked={false} />
    </>
  );
}

import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, editions, levels } from "@/lib/db/schema";
import { dateInIndonesia } from "@/lib/teacher";
import { LevelForm } from "../level-form";

export const metadata: Metadata = { title: "Ubah level — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

export default async function EditLevelPage({ params }: PageProps<"/admin/level/[id]">) {
  await requireAdminPage();
  const id = Number((await params).id);
  const [level] = Number.isInteger(id) ? await db.select().from(levels).where(eq(levels.id, id)) : [];
  if (!level) notFound();

  const [{ attemptCount }] = await db.select({ attemptCount: count() }).from(attempts).where(eq(attempts.level_id, level.id));
  const editionRows = await db.select({ id: editions.id, name: editions.name, color: editions.color }).from(editions).orderBy(asc(editions.sort_order), asc(editions.id));

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/level" className="admin-back">
            ← Semua level
          </Link>
          <h1>Ubah {level.title}</h1>
          {attemptCount > 0 && <p className="muted">{attemptCount} jawaban anak tersimpan untuk level ini.</p>}
        </div>
        <Link href={`/admin/level/baru?salin=${level.id}`} className="btn btn-sm">
          Salin jadi level baru
        </Link>
      </div>
      <LevelForm key={level.id} level={level} template={level} editions={editionRows} locked={attemptCount > 0} today={dateInIndonesia(new Date())} />
    </>
  );
}

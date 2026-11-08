import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { EditionForm } from "../edition-form";

export const metadata: Metadata = { title: "Ubah edisi — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

export default async function EditEditionPage({ params }: PageProps<"/admin/edisi/[id]">) {
  await requireAdminPage();
  const id = Number((await params).id);
  const [edition] = Number.isInteger(id) ? await db.select().from(editions).where(eq(editions.id, id)) : [];
  if (!edition) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/edisi" className="admin-back">
            ← Semua edisi
          </Link>
          <h1>Ubah {edition.name}</h1>
        </div>
        <a href={`/produk/${edition.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
          Lihat di situs ↗
        </a>
      </div>
      <EditionForm edition={edition} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { EditionForm } from "../edition-form";

export const metadata: Metadata = { title: "Tambah edisi — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

export default async function NewEditionPage() {
  await requireAdminPage();
  return (
    <>
      <div>
        <Link href="/admin/edisi" className="admin-back">
          ← Semua edisi
        </Link>
        <h1>Tambah edisi</h1>
      </div>
      <EditionForm edition={null} />
    </>
  );
}

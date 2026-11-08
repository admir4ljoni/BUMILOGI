import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { EditionForm } from "../edition-form";

export const metadata: Metadata = { title: "Tambah edisi — Admin BUMILOGI", robots: { index: false } };
export const instant = false;

export default async function NewEditionPage() {
  await requireAdminPage();
  return (
    <>
      <h1>Tambah edisi</h1>
      <EditionForm edition={null} />
    </>
  );
}

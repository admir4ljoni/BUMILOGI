import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Admin — BUMILOGI", robots: { index: false } };

// Depends on who is logged in, so it renders on every request instead of being prerendered.
export const instant = false;

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (user.role === "admin") redirect("/admin/edisi");

  return (
    <section className="container admin-box">
      <h1>Tidak punya akses</h1>
      <p className="muted">Akun {user.email} bukan akun admin. Guru memakai aplikasi BUMILOGI di ponsel.</p>
      <form action={signOut}>
        <button type="submit" className="btn btn-sm">
          Keluar
        </button>
      </form>
    </section>
  );
}

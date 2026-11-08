import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireAdminPage } from "@/lib/auth";
import { signOut } from "../actions";

export const instant = false;

// Admin chrome: a plain bar instead of the public site's header, footer and animations.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Checked here so visitors who aren't admins never see this bar. Pages still check for themselves,
  // because a layout doesn't re-run when navigating between its pages.
  await requireAdminPage();

  return (
    <>
      <header className="admin-bar">
        <nav className="container admin-nav" aria-label="Admin">
          <Link href="/admin" aria-label="Admin BUMILOGI">
            <Logo />
          </Link>
          <Link href="/admin/edisi">Edisi</Link>
          <Link href="/admin/level">Level</Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            Lihat situs
          </a>
          <form action={signOut}>
            <button type="submit" className="btn btn-sm">
              Keluar
            </button>
          </form>
        </nav>
      </header>
      <main className="container admin-main">{children}</main>
    </>
  );
}

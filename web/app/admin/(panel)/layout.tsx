import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireAdminPage } from "@/lib/auth";
import { signOut } from "../actions";
import { AdminNavLinks } from "./admin-nav";

export const instant = false;

// Admin chrome: a plain bar instead of the public site's header, footer and animations.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Checked here so visitors who aren't admins never see this bar. Pages still check for themselves,
  // because a layout doesn't re-run when navigating between its pages.
  const user = await requireAdminPage();

  return (
    <>
      <header className="admin-bar">
        <nav className="container admin-nav" aria-label="Admin">
          <Link href="/admin" aria-label="Admin BUMILOGI" className="admin-logo">
            <Logo />
            <span className="admin-badge">Admin</span>
          </Link>
          <div className="admin-tabs">
            <AdminNavLinks />
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-link">
            Lihat situs ↗
          </a>
          <form action={signOut} className="admin-user">
            <span className="muted" title={user.email}>
              {user.name || user.email}
            </span>
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/edisi", label: "Edisi" },
  { href: "/admin/level", label: "Level" },
];

// A client component only to know the current page, so its tab can be highlighted.
export function AdminNavLinks() {
  const path = usePathname();
  return LINKS.map((link) => {
    const current = path.startsWith(link.href);
    return (
      <Link key={link.href} href={link.href} className="admin-tab" aria-current={current ? "page" : undefined}>
        {link.label}
      </Link>
    );
  });
}

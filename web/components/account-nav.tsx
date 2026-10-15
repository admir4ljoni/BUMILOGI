"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/akun", label: "Akun saya", color: "--orange" },
  { href: "/kelas", label: "Kelas & Keluarga", color: "--yellow" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="dash-nav" aria-label="Dasbor">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="dash-nav-link" aria-current={path === l.href ? "page" : undefined}>
          <span className="nav-menu-dot" style={{ background: `var(${l.color})` }} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

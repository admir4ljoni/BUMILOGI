"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/akun", label: "Akun saya", color: "--orange" },
  { href: "/pesanan", label: "Pesanan saya", color: "--green" },
  { href: "/kelas", label: "Kelas & Keluarga", color: "--yellow" },
];

// The path is runtime data on dynamic routes (/pesanan/[id]), so it streams in;
// the fallback is the same links without the active state.
export function AccountNav() {
  return (
    <Suspense fallback={<Nav path="" />}>
      <CurrentNav />
    </Suspense>
  );
}

function CurrentNav() {
  return <Nav path={usePathname()} />;
}

function Nav({ path }: { path: string }) {
  return (
    <nav className="dash-nav" aria-label="Dasbor">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="dash-nav-link" aria-current={path === l.href || path.startsWith(l.href + "/") ? "page" : undefined}>
          <span className="nav-menu-dot" style={{ background: `var(${l.color})` }} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

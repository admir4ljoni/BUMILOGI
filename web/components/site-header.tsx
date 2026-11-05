"use client";

import Link from "next/link";
import { SHOPEE_URL } from "@/lib/products";
import { Logo, SECTIONS } from "./logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="container nav" aria-label="Utama">
        <Link href="/" className="nav-logo" aria-label="BUMILOGI, ke beranda">
          <Logo />
        </Link>

        <ul className="nav-links">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href}>{s.label}</Link>
            </li>
          ))}
        </ul>

        <a href={SHOPEE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
          Beli di Shopee
        </a>
        <button type="button" className="icon-btn nav-menu-btn" popoverTarget="nav-menu" aria-label="Buka menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </nav>

      {/* Native popover: light-dismiss and Esc for free; links close it on click. */}
      <div
        id="nav-menu"
        popover="auto"
        className="nav-menu"
        onClick={(e) => (e.target as HTMLElement).closest("a") && e.currentTarget.hidePopover()}
      >
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href}>{s.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

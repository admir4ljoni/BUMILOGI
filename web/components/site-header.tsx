"use client";

import Link from "next/link";
import { Logo, SECTIONS } from "./logo";

function AccountIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="container site-header">
      <nav className="nav" aria-label="Utama">
        <Link href="/" className="nav-logo" aria-label="BUMILOGI, ke beranda">
          <Logo />
        </Link>

        <ul className="nav-links">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="nav-link label" style={{ "--dot": `var(${s.color})` } as React.CSSProperties}>
                {s.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <Link href="/akun" className="icon-btn nav-account" aria-label="Akun saya">
            <AccountIcon />
          </Link>
          <Link href="/#seri" className="btn btn-primary nav-cta">
            Pre-order
          </Link>
          <button type="button" className="icon-btn nav-menu-btn" popoverTarget="nav-menu" aria-label="Buka menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
        </div>

        {/* Scroll progress: a mini pawn drives along the bar's bottom edge (CSS scroll timeline). */}
        <div className="nav-track" aria-hidden="true">
          <span className="nav-track-fill" />
          <span className="nav-pawn" />
        </div>
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
              <Link href={s.href} className="nav-menu-link">
                <span className="nav-menu-dot" style={{ background: `var(${s.color})` }} />
                {s.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/akun" className="nav-menu-link">
              <AccountIcon />
              Akun saya
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}

import Link from "next/link";
import { SHOPEE_URL } from "@/lib/products";
import { Logo, SECTIONS } from "./logo";
import { Glyph, type Cmd } from "./glyph";

const SWATCH: { c: string; k: Cmd }[] = [
  { c: "--orange", k: "maju" },
  { c: "--purple", k: "kiri" },
  { c: "--green", k: "maju" },
  { c: "--yellow", k: "kanan" },
  { c: "--pink", k: "maju" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-cta">
          <h2>Siap bermain sambil belajar?</h2>
          <a href={SHOPEE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Beli di Shopee
          </a>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>Mainan koding tanpa layar untuk anak 4–6 tahun, dicetak 3D dari plastik daur ulang.</p>
          </div>
          <nav aria-label="Jelajahi">
            <p className="label footer-head">Jelajahi</p>
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href}>{s.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <div className="footer-swatch" aria-hidden="true">
            {SWATCH.map((t, i) => (
              <svg key={i} width="28" height="28" viewBox="-32 -32 64 64">
                <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${t.c})`} />
                <Glyph k={t.k} />
              </svg>
            ))}
          </div>
          <p>© 2026 BUMILOGI · Universitas Sebelas Maret, Surakarta</p>
        </div>
      </div>
    </footer>
  );
}

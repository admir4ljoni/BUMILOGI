import Link from "next/link";
import { STORE_URL } from "@/lib/products";
import { Logo, SECTIONS } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-cta">
          <h2>Siap bermain sambil belajar?</h2>
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Beli Sekarang
          </a>
        </div>

        <div className="footer-grid">
          <div>
            <Logo />
            <p>Mainan koding tanpa layar untuk anak 4–6 tahun, dicetak 3D dari plastik daur ulang.</p>
          </div>
          <nav aria-label="Jelajahi">
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href}>{s.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="footer-bottom">© 2026 BUMILOGI, Universitas Sebelas Maret, Surakarta</p>
      </div>
    </footer>
  );
}

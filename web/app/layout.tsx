import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BUMILOGI — Belajar Koding, Tanpa Layar",
  description: "Mainan edukatif dari plastik daur ulang yang melatih logika anak 4–6 tahun lewat bermain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body>
        <header className="container" style={{ position: "sticky", top: 16, zIndex: 10 }}>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 72,
              padding: "0 var(--s-lg)",
              background: "rgba(251,248,243,0.72)",
              backdropFilter: "blur(16px) saturate(140%)",
              border: "1px solid rgba(255,255,255,0.6)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-nav)",
            }}
          >
            <Link href="/" className="label" style={{ textDecoration: "none" }}>
              BUMILOGI
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s-sm)" }}>
              <Link href="/akun" className="icon-btn" aria-label="Akun saya">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                </svg>
              </Link>
              <Link href="/" className="btn btn-primary" style={{ padding: "10px 20px" }}>
                Pre-order
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            borderRadius: "var(--r-xl) var(--r-xl) 0 0",
            marginTop: "var(--s-3xl)",
          }}
        >
          <div className="container" style={{ padding: "var(--s-2xl) var(--gutter)", color: "var(--ink-soft)", fontSize: 14 }}>
            © 2026 BUMILOGI · Universitas Sebelas Maret
          </div>
        </footer>
      </body>
    </html>
  );
}

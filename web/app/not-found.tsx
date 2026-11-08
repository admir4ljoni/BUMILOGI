import Link from "next/link";
import { Glyph } from "@/components/glyph";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Lives outside app/(site), so it adds the site header and footer itself.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="container not-found">
          <svg width="88" height="88" viewBox="-32 -32 64 64" aria-hidden="true">
            <rect x={-28} y={-28} width={56} height={56} rx={14} fill="var(--blue)" stroke="var(--ink)" strokeWidth={3} />
            <Glyph k="kiri" />
          </svg>
          <h1>Langkahnya keliru.</h1>
          <p className="lead">Halaman ini tidak ada. Kembali ke beranda dan coba langkah lain.</p>
          <Link href="/" className="btn btn-primary">
            Ke beranda
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

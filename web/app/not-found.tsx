import Link from "next/link";
import { Glyph } from "@/components/glyph";

export default function NotFound() {
  return (
    <section className="container not-found">
      <svg width="88" height="88" viewBox="-32 -32 64 64" aria-hidden="true">
        <rect x={-28} y={-28} width={56} height={56} rx={14} fill="var(--purple)" stroke="var(--ink)" strokeWidth={3} />
        <Glyph k="kiri" />
      </svg>
      <h1>Langkahnya keliru.</h1>
      <p className="lead">Halaman ini tidak ada. Belok kembali ke beranda.</p>
      <Link href="/" className="btn btn-primary">
        Ke beranda
      </Link>
    </section>
  );
}

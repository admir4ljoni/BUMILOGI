import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Glyph } from "@/components/glyph";
import { getEditions } from "@/lib/db/site";
import { formatIDR } from "@/lib/products";

export async function generateStaticParams() {
  const editions = await getEditions();
  return editions.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getEditions()).find((x) => x.slug === slug);
  return { title: p ? `${p.name} — BUMILOGI` : "Produk — BUMILOGI", description: p?.description };
}

const PERKS = [
  { title: "Plastik daur ulang", text: "Dicetak 3D dari filamen HDPE" },
  { title: "Usia 4–6 tahun", text: "Keping besar, sudut membulat" },
  { title: "Tanpa layar", text: "Belajar logika lewat tangan" },
];

export default async function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  const { slug } = await params;
  const editions = await getEditions();
  const p = editions.find((x) => x.slug === slug);
  if (!p) notFound();
  const color = `--${p.color}`;
  const other = editions.find((x) => x.slug !== p.slug);

  return (
    <div className="container product">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true">/</span>
        <Link href="/#seri">Seri</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.name}</span>
      </nav>

      <div className="product-top">
        <div className="product-visual" style={{ background: `var(${color})` }}>
          <svg className="product-glyph" viewBox="-32 -32 64 64" width="40%" aria-hidden="true">
            <rect x={-28} y={-28} width={56} height={56} rx={14} fill="var(--white)" stroke="var(--ink)" strokeWidth={3} />
            <Glyph k="kanan" />
          </svg>
          <span>Foto produk segera hadir</span>
        </div>

        <div className="product-info">
          <p className="product-habitat">{p.tagline}</p>
          <h1>{p.name}</h1>
          <p className="lead">{p.description}</p>
          <p className="product-price">{formatIDR(p.price_idr)}</p>
          <a href={p.shopee_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Beli Sekarang
          </a>
          <p className="hint">Pembelian, pembayaran, dan pengiriman lewat Shopee.</p>
          <ul className="perks">
            {PERKS.map((k) => (
              <li key={k.title}>
                <strong>{k.title}</strong>
                <span>{k.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="product-details">
        <section data-reveal>
          <h2>Isi set</h2>
          <ul className="checks">
            {p.contents.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
        <section data-reveal style={{ "--i": 1 } as CSSProperties}>
          <h2>Tokoh dan habitat</h2>
          <ul className="animal-list">
            {p.animals.map((a) => (
              <li key={a}>
                <span className="dot" style={{ background: `var(${color})` }} />
                {a}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {other && (
        <Link href={`/produk/${other.slug}`} className="other-series" data-reveal style={{ borderColor: `var(--${other.color})` }}>
          <span>Lihat juga</span>
          <strong>{other.name}</strong>
          <span>{other.tagline}</span>
        </Link>
      )}
    </div>
  );
}

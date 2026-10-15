import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Glyph } from "@/components/glyph";
import { OrderCard } from "@/components/order-card";
import { EDITION_COLOR, PRODUCTS, formatIDR } from "@/lib/products";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug);
  return { title: p ? `${p.name} — BUMILOGI` : "Produk — BUMILOGI", description: p?.description };
}

const PERKS = [
  { title: "Plastik daur ulang", text: "Dicetak 3D dari filamen HDPE" },
  { title: "Usia 4–6 tahun", text: "Keping besar, sudut membulat" },
  { title: "Tanpa layar", text: "Belajar logika lewat tangan" },
];

function Check() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="11" fill="var(--yellow)" />
      <path d="M7 12.5l3.2 3L17 9" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// params resolve inside Suspense so a client navigation can show the skeleton instantly.
export default function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      {params.then(({ slug }) => (
        <Product slug={slug} />
      ))}
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="container product" aria-busy="true">
      <div className="product-top">
        <div className="image-well product-well" />
        <div className="product-info">
          <div className="skeleton" style={{ width: "40%", height: 56 }} />
          <div className="skeleton" style={{ width: "30%", height: 28 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: "var(--r-lg)" }} />
        </div>
      </div>
    </div>
  );
}

function Product({ slug }: { slug: string }) {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) notFound();
  const color = EDITION_COLOR[p.edition];
  const other = PRODUCTS.find((x) => x.slug !== p.slug);

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
        <div className="product-gallery">
          <div className="image-well product-well">
            <div className="image-blob" style={{ background: `var(${color})` }} />
            <div className="product-tile" aria-hidden="true">
              <svg viewBox="-32 -32 64 64" width="100%" height="100%">
                <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${color})`} stroke="var(--ink)" strokeWidth={3} />
                <Glyph k="maju" />
              </svg>
            </div>
            <span className="field-hint">Foto produk segera hadir</span>
          </div>
        </div>

        <div className="product-info">
          <span className="chip" style={{ background: `var(${color})` }}>
            {p.edition}
          </span>
          <h1 className="product-title">{p.name}</h1>
          <p className="muted">{p.tagline}</p>
          <p className="product-price mono">{formatIDR(p.price_idr)}</p>
          <OrderCard price={p.price_idr} />
          <ul className="perks">
            {PERKS.map((k) => (
              <li key={k.title}>
                <strong>{k.title}</strong>
                <span className="muted">{k.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="product-details">
        <section>
          <h2 className="card-title">Tentang set ini</h2>
          <p className="lead">{p.description}</p>
          <div className="animal-chips">
            {p.animals.map((a) => (
              <span key={a} className="animal-chip">
                <span className="nav-menu-dot" style={{ background: `var(${color})` }} />
                {a}
              </span>
            ))}
          </div>
        </section>
        <section>
          <h2 className="card-title">Isi set</h2>
          <ul className="checks">
            {p.contents.map((c) => (
              <li key={c}>
                <Check />
                {c}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {other && (
        <Link href={`/produk/${other.slug}`} className="card other-series">
          <span className="chip" style={{ background: `var(${EDITION_COLOR[other.edition]})` }}>
            {other.edition}
          </span>
          <span>
            <span className="muted" style={{ display: "block", fontSize: 14 }}>
              Lihat juga
            </span>
            <strong className="card-title">{other.name}</strong>
          </span>
          <span className="mono other-price">{formatIDR(other.price_idr)} →</span>
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { Glyph, TILE_COLOR, type Cmd } from "@/components/glyph";
import { HeroBoard } from "@/components/hero-board";
import { EDITION_COLOR, PRODUCTS, SHOPEE_URL, formatIDR } from "@/lib/products";

// Testimonials and training photos are placeholders until real ones are collected.
const HOW = [
  {
    title: "Susun keping perintah",
    text: "Anak memutar keping panah ke atas, bawah, kiri, atau kanan, lalu menjajarkannya menjadi program.",
  },
  {
    title: "Jalankan tokoh satwa",
    text: "Tokoh satwa digerakkan di papan 6×6 mengikuti keping satu per satu.",
  },
  {
    title: "Sampai di bintang",
    text: "Menabrak rintangan? Anak mencari keping yang keliru, menggantinya, lalu mencoba lagi.",
  },
];

const RECYCLING = [
  { title: "Sampah plastik dipilah", text: "Tutup botol dan wadah HDPE dari limbah lokal dikumpulkan, dipilah, lalu dicuci." },
  { title: "Dilebur jadi filamen", text: "Plastik dicacah dan dilelehkan, lalu ditarik menjadi benang filamen untuk printer 3D." },
  { title: "Dicetak jadi klik-klak", text: "Filamen dicetak lapis demi lapis menjadi keping perintah, papan, dan tokoh satwa." },
];

const TRAINING = [
  "Materi disusun untuk kelas TK dan PAUD",
  "Praktik langsung dengan set klik-klak",
  "Sertifikat untuk setiap peserta",
  "Panduan ajar dan kartu misi siap pakai",
];

const TRAINING_DOCS = [
  { title: "Lokakarya klik-klak untuk guru", place: "Solo Raya" },
  { title: "Kelas praktik berpikir komputasional", place: "Solo Raya" },
  { title: "Pendampingan langsung di sekolah", place: "Jawa Tengah" },
];

const TESTIMONIALS = [
  { quote: "Anak-anak jadi terbiasa bilang “kanan dua, atas satu” saat bermain. Mereka belajar urutan tanpa sadar sedang belajar.", who: "Guru TK, Surakarta" },
  { quote: "Saya suka karena tidak ada layar. Anak tetap aktif bergerak dan bekerja sama dengan temannya.", who: "Orang tua murid, Sukoharjo" },
  { quote: "Pelatihannya praktis. Besoknya saya langsung bisa memakai kartu misi di kelas.", who: "Guru PAUD, Karanganyar" },
];

// The ticker under the hero: plain facts about the toy, separated by small tiles.
const FACTS = ["Tanpa layar", "Usia 4–6 tahun", "Plastik daur ulang", "Papan 6×6", "Satwa Nusantara", "Pelatihan guru PAUD"];
const FACT_TILES: Cmd[] = ["kanan", "atas", "kiri"];

/** Stagger index for [data-reveal] children. */
const nth = (i: number) => ({ "--i": i }) as CSSProperties;


function Tile({ k, size = 48 }: { k: Cmd; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-32 -32 64 64" aria-hidden="true">
      <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${TILE_COLOR[k]})`} stroke="var(--ink)" strokeWidth={3.5} />
      <Glyph k={k} />
    </svg>
  );
}

// Small pictures for the three how-to-play steps, drawn from the board's own pieces.
function HowPicture({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="how-pic">
        {(["kanan", "atas", "kanan"] as const).map((k, i) => (
          <span key={i} className="how-tile" style={nth(i)}>
            <Tile k={k} size={60} />
          </span>
        ))}
      </div>
    );
  return (
    <div className="how-pic">
      <svg width="190" height="60" viewBox="0 0 152 48" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={2 + i * 50} y={2} width={44} height={44} rx={10} fill={step === 2 && i === 2 ? "var(--yellow)" : "var(--cream)"} stroke="var(--line)" strokeWidth={2} />
        ))}
        {step === 2 && <path className="how-star" d="M124 11l3.6 7.3 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />}
        <g className={step === 1 ? "how-pawn" : undefined} transform={`translate(${step === 1 ? 74 : 24} 24)`}>
          <path d="M8-6 18 0 8 6z" fill="var(--ink)" />
          <circle r={13} fill="var(--green)" stroke="var(--ink)" strokeWidth={2.5} />
          <circle cx={4} cy={-5} r={2} fill="var(--ink)" />
          <circle cx={4} cy={5} r={2} fill="var(--ink)" />
        </g>
        {step === 1 && <path className="how-trail" d="M30 24h22" stroke="var(--ink)" strokeWidth={2.5} strokeDasharray="3 5" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

// Section headings rise word by word from behind a mask when revealed.
function Words({ text }: { text: string }) {
  return text.split(" ").map((w, j) => (
    <Fragment key={j}>
      <span className="w">
        <span style={{ "--j": j } as CSSProperties}>{w}</span>
      </span>{" "}
    </Fragment>
  ));
}

// Recycled bottle caps drifting through the Daur ulang stage; --v sets speed and spin direction.
const CAPS = [
  { c: "--pink", x: "3%", y: "14%", s: 72, v: 1 },
  { c: "--green", x: "96%", y: "22%", s: 56, v: -1.4 },
  { c: "--yellow", x: "5%", y: "80%", s: 48, v: 0.8 },
  { c: "--orange", x: "94%", y: "74%", s: 66, v: -0.6 },
  { c: "--blue", x: "48%", y: "98%", s: 40, v: 1.2 },
];
function Caps() {
  return (
    <div className="caps" aria-hidden="true">
      {CAPS.map((k) => (
        <svg key={k.c} className="cap" viewBox="-32 -32 64 64" style={{ left: k.x, top: k.y, width: k.s, height: k.s, "--v": k.v } as CSSProperties}>
          <circle r={28} fill={`var(${k.c})`} />
          <circle r={18} fill="none" stroke="var(--ink)" strokeWidth={3} strokeDasharray="5 6" />
        </svg>
      ))}
    </div>
  );
}

// Living corner of each series panel: leaves sway for the forest, bubbles rise for the sea.
function PanelDecor({ edition }: { edition: "rimba" | "samudra" }) {
  return (
    <svg className={`panel-decor panel-decor-${edition}`} viewBox="0 0 120 120" aria-hidden="true">
      {edition === "rimba"
        ? [
            [40, 70, -30],
            [70, 50, 10],
            [92, 78, 45],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path className="leaf" style={nth(i)} d="M0 22C-16 8-14-14 0-24 14-14 16 8 0 22ZM0 20V-14" fill="var(--white)" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
            </g>
          ))
        : [
            [36, 90, 12],
            [70, 100, 8],
            [90, 80, 15],
            [56, 70, 6],
          ].map(([x, y, r], i) => (
            <circle key={i} className="bubble" style={nth(i)} cx={x} cy={y} r={r} fill="var(--white)" stroke="var(--ink)" strokeWidth={2.5} />
          ))}
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <section className="container hero" data-scroll>
        <div className="hero-copy">
          <h1>
            {"Belajar koding, tanpa layar.".split(" ").map((w, i) => (
              <Fragment key={i}>
                <span className="hero-word" style={nth(i)}>
                  {w}
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="lead">
            klik-klak adalah mainan koding untuk anak 4–6 tahun. Anak menyusun keping perintah dari plastik daur ulang, lalu menggerakkan tokoh
            satwa di papan sampai ke bintang.
          </p>
          <div className="actions">
            <a className="btn btn-primary" href={SHOPEE_URL} target="_blank" rel="noopener noreferrer">
              Beli Sekarang
            </a>
            <Link className="btn btn-secondary" href="/papan-koding">
              Coba papan koding
            </Link>
          </div>
        </div>
        <HeroBoard />
      </section>

      <div className="ticker" data-scroll>
        {[0, 1].map((copy) => (
          <ul key={copy} className="ticker-track" aria-hidden={copy === 1 || undefined}>
            {FACTS.map((f, i) => (
              <li key={f}>
                <Tile k={FACT_TILES[i % 3]} size={30} />
                {f}
              </li>
            ))}
          </ul>
        ))}
      </div>

      <section id="cara-bermain" className="container section">
        <div className="section-head" data-reveal>
          <h2>
            <Words text="Cara bermain" />
          </h2>
          <p className="lead">Tiga langkah yang sama dengan cara programmer bekerja: menyusun, menjalankan, lalu memperbaiki.</p>
        </div>
        <ol className="how">
          {HOW.map((s, i) => (
            <li key={s.title} data-reveal style={nth(i)}>
              <HowPicture step={i} />
              <h3>
                <span className="how-num">{i + 1}</span>
                {s.title}
              </h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="seri" className="section stage stage-cream" data-scroll>
        <div className="container">
          <div className="section-head" data-reveal>
            <h2>
            <Words text="Dua seri, dua habitat" />
          </h2>
            <p className="lead">Setiap seri membawa satwa Nusantara yang perlu kita jaga. Isi papan dan kepingnya sama; tokoh dan kartu misinya berbeda.</p>
          </div>
          <div className="series">
            {PRODUCTS.map((p, i) => (
              <Link
                key={p.slug}
                href={`/produk/${p.slug}`}
                className="series-panel"
                data-reveal
                style={{ ...nth(i), background: `var(${EDITION_COLOR[p.edition]})` }}
              >
                <PanelDecor edition={p.edition} />
                <span className="series-habitat">{p.tagline}</span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <p className="series-animals">{p.animals.join(", ")}</p>
                <span className="series-foot">
                  <strong>{formatIDR(p.price_idr)}</strong>
                  <span className="series-link">Lihat isi set</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="daur-ulang" className="section stage stage-ink" data-scroll>
        <Caps />
        <div className="container split">
          <div className="section-head" data-reveal>
            <h2>
            <Words text="Dari tutup botol jadi keping perintah" />
          </h2>
            <p className="lead">Setiap keping klik-klak dicetak 3D dari plastik HDPE daur ulang. Anak belajar berpikir runtut, sampah plastik berkurang.</p>
          </div>
          <ol className="process">
            {RECYCLING.map((s, i) => (
              <li key={s.title} data-reveal style={nth(i)}>
                <span className="process-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pelatihan" className="container section">
        <div className="split">
          <div className="section-head" data-reveal>
            <h2>
            <Words text="Pelatihan bersertifikat untuk guru PAUD" />
          </h2>
            <p className="lead">
              Kami mendampingi guru agar percaya diri mengajarkan berpikir komputasional, yaitu cara berpikir runtut untuk memecahkan masalah, lewat
              permainan.
            </p>
          </div>
          <ul className="checks">
            {TRAINING.map((t, i) => (
              <li key={t} data-reveal style={nth(i + 1)}>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {/* Photos are the proof here, so they get the width: one lead photo, two beside it. */}
        <div className="docs">
          {TRAINING_DOCS.map((d, i) => (
            <figure key={d.title} className="doc" data-reveal style={nth(i)}>
              <div className="photo-slot">Foto kegiatan</div>
              <figcaption>
                <strong>{d.title}</strong>
                <span>{d.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="testimoni" className="container section">
        <div className="section-head" data-reveal>
          <h2>
            <Words text="Kata guru dan orang tua" />
          </h2>
        </div>
        <div className="quotes">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.who} className="quote" data-reveal style={nth(i)}>
              <blockquote>{t.quote}</blockquote>
              <figcaption>{t.who}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

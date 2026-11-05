import Link from "next/link";
import { Glyph, type Cmd } from "@/components/glyph";
import { HeroBoard } from "@/components/hero-board";
import { EDITION_COLOR, PRODUCTS, SHOPEE_URL, formatIDR } from "@/lib/products";

// Testimonials and training photos are placeholders until real ones are collected.
const HOW = [
  {
    title: "Susun keping perintah",
    text: "Anak memilih keping Maju, Belok, atau Ulangi dan menjajarkannya menjadi program.",
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
  { quote: "Anak-anak jadi terbiasa bilang “maju dua, belok kiri” saat bermain. Mereka belajar urutan tanpa sadar sedang belajar.", who: "Guru TK, Surakarta" },
  { quote: "Saya suka karena tidak ada layar. Anak tetap aktif bergerak dan bekerja sama dengan temannya.", who: "Orang tua murid, Sukoharjo" },
  { quote: "Pelatihannya praktis. Besoknya saya langsung bisa memakai kartu misi di kelas.", who: "Guru PAUD, Karanganyar" },
];

const TILE_COLOR: Record<Cmd, string> = { maju: "--orange", kiri: "--purple", kanan: "--purple" };

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
        {(["maju", "kanan", "maju"] as const).map((k, i) => (
          <Tile key={i} k={k} size={60} />
        ))}
      </div>
    );
  return (
    <div className="how-pic">
      <svg width="190" height="60" viewBox="0 0 152 48" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={2 + i * 50} y={2} width={44} height={44} rx={10} fill={step === 2 && i === 2 ? "var(--yellow)" : "var(--cream)"} stroke="var(--line)" strokeWidth={2} />
        ))}
        {step === 2 && <path d="M124 11l3.6 7.3 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />}
        <g transform={`translate(${step === 1 ? 74 : 24} 24)`}>
          <path d="M8-6 18 0 8 6z" fill="var(--ink)" />
          <circle r={13} fill="var(--green)" stroke="var(--ink)" strokeWidth={2.5} />
          <circle cx={4} cy={-5} r={2} fill="var(--ink)" />
          <circle cx={4} cy={5} r={2} fill="var(--ink)" />
        </g>
        {step === 1 && <path d="M30 24h22" stroke="var(--ink)" strokeWidth={2.5} strokeDasharray="3 5" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <h1>Belajar koding, tanpa layar.</h1>
          <p className="lead">
            klik-klak adalah mainan koding untuk anak 4–6 tahun. Anak menyusun keping perintah dari plastik daur ulang, lalu menggerakkan tokoh
            satwa di papan sampai ke bintang.
          </p>
          <div className="actions">
            <a className="btn btn-primary" href={SHOPEE_URL} target="_blank" rel="noopener noreferrer">
              Beli di Shopee
            </a>
            <Link className="btn btn-secondary" href="/papan-koding">
              Coba papan koding
            </Link>
          </div>
        </div>
        <HeroBoard />
      </section>

      <section id="cara-bermain" className="container section">
        <div className="section-head">
          <h2>Cara bermain</h2>
          <p className="lead">Tiga langkah yang sama dengan cara programmer bekerja: menyusun, menjalankan, lalu memperbaiki.</p>
        </div>
        <ol className="how">
          {HOW.map((s, i) => (
            <li key={s.title}>
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

      <section id="seri" className="container section">
        <div className="section-head">
          <h2>Dua seri, dua habitat</h2>
          <p className="lead">Setiap seri membawa satwa Nusantara yang perlu kita jaga. Isi papan dan kepingnya sama; tokoh dan kartu misinya berbeda.</p>
        </div>
        <div className="series">
          {PRODUCTS.map((p) => (
            <Link key={p.slug} href={`/produk/${p.slug}`} className="series-panel" style={{ background: `var(${EDITION_COLOR[p.edition]})` }}>
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
      </section>

      <section id="daur-ulang" className="container section split">
        <div className="section-head">
          <h2>Dari tutup botol jadi keping perintah</h2>
          <p className="lead">Setiap keping klik-klak dicetak 3D dari plastik HDPE daur ulang. Anak belajar berpikir runtut, sampah plastik berkurang.</p>
        </div>
        <ol className="process">
          {RECYCLING.map((s, i) => (
            <li key={s.title}>
              <span className="process-num">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pelatihan" className="container section split">
        <div className="section-head">
          <h2>Pelatihan bersertifikat untuk guru PAUD</h2>
          <p className="lead">
            Kami mendampingi guru agar percaya diri mengajarkan berpikir komputasional, yaitu cara berpikir runtut untuk memecahkan masalah, lewat
            permainan.
          </p>
          <ul className="checks">
            {TRAINING.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="docs">
          {TRAINING_DOCS.map((d) => (
            <figure key={d.title} className="doc">
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
        <div className="section-head">
          <h2>Kata guru dan orang tua</h2>
        </div>
        <div className="quotes">
          {TESTIMONIALS.map((t) => (
            <figure key={t.who} className="quote">
              <blockquote>{t.quote}</blockquote>
              <figcaption>{t.who}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

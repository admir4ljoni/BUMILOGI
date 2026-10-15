import Link from "next/link";
import { Glyph, type Cmd } from "@/components/glyph";
import { LandingMotion } from "@/components/landing-motion";
import { PRODUCTS, formatIDR } from "@/lib/products";

// Static seed content; moves to the cms_contents table in task 13.
// Testimonials and training docs are placeholders until real ones are collected.
const RECYCLING = [
  { title: "Sampah plastik dipilah", text: "Tutup botol dan wadah plastik HDPE dari limbah lokal dikumpulkan, dipilah, lalu dicuci." },
  { title: "Dilebur jadi filamen", text: "Plastik dicacah dan dilelehkan, lalu ditarik menjadi benang filamen untuk printer 3D." },
  { title: "Dicetak jadi klik-klak", text: "Filamen dicetak lapis demi lapis menjadi keping perintah, papan, dan tokoh satwa Nusantara." },
];

const SERIES = [
  {
    key: "rimba",
    name: "Seri Rimba",
    habitat: "Hutan hujan tropis",
    text: "Pandu badak jawa dan orangutan menyusuri hutan, satu perintah demi satu perintah.",
    animals: ["Badak Jawa", "Orangutan", "Pohon hutan hujan"],
    color: "--green",
    tilt: "-3deg",
  },
  {
    key: "samudra",
    name: "Seri Samudra",
    habitat: "Terumbu karang",
    text: "Arahkan ikan badut menjelajahi terumbu karang tanpa menabrak karang.",
    animals: ["Ikan badut", "Terumbu karang"],
    color: "--pink",
    tilt: "3deg",
  },
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
  { quote: "Anak-anak jadi terbiasa bilang “maju dua, belok kiri” saat bermain. Mereka belajar urutan tanpa sadar sedang belajar.", who: "Guru TK", where: "Surakarta" },
  { quote: "Saya suka karena tidak ada layar. Anak tetap aktif bergerak dan bekerja sama dengan temannya.", who: "Orang tua murid", where: "Sukoharjo" },
  { quote: "Pelatihannya praktis. Besoknya saya langsung bisa memakai kartu misi di kelas.", who: "Guru PAUD", where: "Karanganyar" },
];

// Hero board: a stepped track across the full width, ending at the star.
const TRACK = "M-40 240 H260 V120 H560 V240 H860 V120 H1110";
const HERO_TILES: { x: number; y: number; k: Cmd; color: string }[] = [
  { x: 110, y: 240, k: "maju", color: "--orange" },
  { x: 260, y: 240, k: "kiri", color: "--purple" },
  { x: 260, y: 120, k: "kanan", color: "--purple" },
  { x: 410, y: 120, k: "maju", color: "--orange" },
  { x: 560, y: 120, k: "kanan", color: "--purple" },
  { x: 560, y: 240, k: "kiri", color: "--purple" },
  { x: 710, y: 240, k: "maju", color: "--orange" },
  { x: 860, y: 240, k: "kiri", color: "--purple" },
  { x: 860, y: 120, k: "kanan", color: "--purple" },
  { x: 985, y: 120, k: "maju", color: "--orange" },
];
const CONFETTI = ["--pink", "--purple", "--green", "--yellow", "--orange"];
const STAR = "0,-30 7.6,-10.5 28.5,-9.3 12.4,4 17.6,24.3 0,13 -17.6,24.3 -12.4,4 -28.5,-9.3 -7.6,-10.5";

function Check() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="11" fill="var(--yellow)" />
      <path d="M7 12.5l3.2 3L17 9" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One step of the coding path, sitting on the top edge of each page.
function PathNode({ k, color }: { k: Cmd; color: string }) {
  return (
    <div className="path-node" aria-hidden="true">
      <svg viewBox="-32 -32 64 64" width="56" height="56">
        <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${color})`} stroke="var(--ink)" strokeWidth={2.5} />
        <Glyph k={k} r={k === "maju" ? 90 : 0} />
      </svg>
    </div>
  );
}

// Background decoration per page, in that page's lead + support colors (DESIGN.md §4).
// `at` positions it inside the page; depth drives scroll parallax. Phones get only the
// blobs: anything else would land on text, since content fills a narrow screen.
type Deco = {
  k: "blob" | "tile" | "pellets" | "star" | "ring" | "dots";
  c: string;
  c2?: string;
  at: React.CSSProperties;
  size?: number;
  cmd?: Cmd;
  r?: number;
  depth: number;
};

const PELLETS = [
  [10, 14, 7], [30, 6, 9], [26, 30, 6], [48, 20, 8], [44, 42, 6], [64, 34, 7], [12, 40, 5],
];

function Decor({ items, children }: { items: Deco[]; children?: React.ReactNode }) {
  return (
    <div className="decor-layer" aria-hidden="true">
      {items.map((d, i) => (
        <div key={i} className={d.k === "blob" ? "decor" : "decor decor-wide"} data-depth={d.depth} style={d.at}>
          <div className="decor-float" style={{ rotate: `${d.r ?? 0}deg` }}>
            {d.k === "blob" && <div className="scene-blob decor-blob" style={{ width: `min(${d.size}px, 48vw)`, background: `var(${d.c})` }} />}
            {d.k === "tile" && (
              <div className="loose-tile" style={{ background: `var(${d.c})` }}>
                <svg viewBox="-32 -32 64 64" width="100%" height="100%">
                  <Glyph k={d.cmd ?? "maju"} />
                </svg>
              </div>
            )}
            {d.k === "pellets" && (
              <svg width={d.size ?? 80} viewBox="0 0 76 50">
                {PELLETS.map(([x, y, r], j) => (
                  <ellipse key={j} cx={x} cy={y} rx={r} ry={r * 0.82} fill={`var(${j % 2 && d.c2 ? d.c2 : d.c})`} stroke="var(--ink)" strokeWidth={1.5} />
                ))}
              </svg>
            )}
            {d.k === "star" && (
              <svg width={d.size ?? 56} viewBox="-32 -32 64 64">
                <polygon points={STAR} fill={`var(${d.c})`} stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
              </svg>
            )}
            {d.k === "ring" && (
              <svg width={d.size ?? 96} viewBox="0 0 100 100">
                <circle cx={50} cy={50} r={40} fill="none" stroke={`var(${d.c})`} strokeWidth={8} strokeDasharray="18 12" strokeLinecap="round" />
              </svg>
            )}
            {d.k === "dots" && (
              <svg width={d.size ?? 96} viewBox="0 0 96 64">
                {Array.from({ length: 24 }, (_, j) => (
                  <circle key={j} cx={8 + (j % 6) * 16} cy={8 + Math.floor(j / 6) * 16} r={3.5} fill={`var(${d.c})`} />
                ))}
              </svg>
            )}
          </div>
        </div>
      ))}
      {children}
    </div>
  );
}

// The pawn robot from the hero board, as a little character. Faces right.
function Bot({ nose = "--orange" }: { nose?: string }) {
  return (
    <svg className="bot" width="48" height="48" viewBox="-32 -32 64 64">
      <rect x={-24} y={-24} width={48} height={48} rx={16} fill="var(--white)" stroke="var(--ink)" strokeWidth={3} />
      <g className="bot-eyes">
        <circle cx={8} cy={-8} r={4} fill="var(--ink)" />
        <circle cx={8} cy={8} r={4} fill="var(--ink)" />
      </g>
      <path d="M21-7 31 0 21 7Z" fill={`var(${nose})`} stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function Pellet({ c }: { c: string }) {
  return (
    <svg className="hop roll" width="22" height="22" viewBox="-12 -12 24 24">
      <circle r={10} fill={`var(${c})`} stroke="var(--ink)" strokeWidth={2} />
      <circle cx={-3.5} cy={-3.5} r={2.5} fill="var(--white)" opacity={0.7} />
    </svg>
  );
}

function MiniTile({ c }: { c: string }) {
  return (
    <svg className="hop" width="30" height="30" viewBox="-32 -32 64 64">
      <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${c})`} stroke="var(--ink)" strokeWidth={4} />
      <Glyph k="maju" />
    </svg>
  );
}

// Walks across the page's bottom edge forever; .hop children bounce in a wave.
function Walker({ dur, reverse, children }: { dur: number; reverse?: boolean; children: React.ReactNode }) {
  return (
    <div className="walker" data-dur={dur} data-reverse={reverse || undefined}>
      {children}
    </div>
  );
}

function Sticker({ c, at, size = 40 }: { c: string; at: React.CSSProperties; size?: number }) {
  return (
    <svg className="sticker decor-wide" width={size} viewBox="-32 -32 64 64" style={at}>
      <polygon points={STAR} fill={`var(${c})`} stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

function Bubble({ text, at }: { text: string; at: React.CSSProperties }) {
  return (
    <span className="bubble decor-wide" style={at}>
      {text}
    </span>
  );
}

const DECOR: Record<string, Deco[]> = {
  recycling: [
    { k: "blob", c: "--green", size: 320, at: { left: "-7%", bottom: "4%" }, depth: 0.3 },
    { k: "blob", c: "--yellow", size: 200, at: { right: "-4%", top: "6%" }, depth: 0.5 },
    { k: "pellets", c: "--green", c2: "--yellow", size: 96, at: { left: "6%", top: "12%" }, depth: 0.8 },
    { k: "dots", c: "--yellow", at: { right: "8%", bottom: "6%" }, depth: 0.4 },
    { k: "tile", c: "--green", cmd: "maju", r: -12, at: { left: "40%", bottom: "8%" }, depth: 1 },
  ],
  series: [
    { k: "blob", c: "--pink", size: 300, at: { right: "-6%", top: "4%" }, depth: 0.3 },
    { k: "blob", c: "--green", size: 340, at: { left: "-8%", bottom: "-4%" }, depth: 0.4 },
    { k: "tile", c: "--green", cmd: "kiri", r: -10, at: { left: "6%", top: "12%" }, depth: 1 },
    { k: "tile", c: "--pink", cmd: "kanan", r: 9, at: { right: "6%", bottom: "8%" }, depth: 1 },
    { k: "pellets", c: "--pink", c2: "--green", size: 84, at: { right: "18%", top: "9%" }, depth: 0.7 },
  ],
  training: [
    { k: "blob", c: "--yellow", size: 320, at: { left: "-6%", top: "6%" }, depth: 0.3 },
    { k: "blob", c: "--orange", size: 180, at: { right: "-3%", bottom: "6%" }, depth: 0.5 },
    { k: "ring", c: "--orange", at: { right: "6%", top: "8%" }, depth: 0.8 },
    { k: "star", c: "--yellow", r: 12, at: { left: "6%", bottom: "8%" }, depth: 1 },
    { k: "dots", c: "--yellow", at: { left: "42%", top: "7%" }, depth: 0.4 },
    { k: "tile", c: "--yellow", cmd: "maju", r: 10, at: { left: "47%", bottom: "6%" }, depth: 1 },
  ],
  testimonials: [
    { k: "blob", c: "--yellow", size: 300, at: { right: "-6%", top: "5%" }, depth: 0.3 },
    { k: "blob", c: "--orange", size: 220, at: { left: "-6%", bottom: "8%" }, depth: 0.4 },
    { k: "tile", c: "--orange", cmd: "kanan", r: -8, at: { left: "8%", top: "13%" }, depth: 1 },
    { k: "star", c: "--yellow", size: 44, r: -10, at: { right: "22%", top: "12%" }, depth: 0.9 },
    { k: "pellets", c: "--orange", c2: "--yellow", size: 88, at: { right: "8%", bottom: "8%" }, depth: 0.7 },
    { k: "dots", c: "--orange", at: { left: "30%", bottom: "5%" }, depth: 0.4 },
  ],
};

export default function Home() {
  return (
    <LandingMotion>
      <section className="hero page">
        <div className="container hero-copy">
          <p className="label" style={{ color: "var(--ink-muted)", margin: 0 }}>
            Keberlanjutan · Seri Rimba · Seri Samudra · Pelatihan Guru
          </p>
          <h1>Belajar Koding, Tanpa Layar.</h1>
          <p className="lead">Mainan edukatif dari plastik daur ulang yang melatih logika anak 4–6 tahun lewat bermain.</p>
          <div style={{ display: "flex", gap: "var(--s-md)", justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="#seri">Pre-order Sekarang</a>
            <a className="btn btn-secondary" href="/simulator">Coba Papan Koding</a>
          </div>
        </div>

        <div className="hero-scene" aria-hidden="true">
          <div className="hero-blob" style={{ left: "6%", top: "-6%", width: "22%", background: "var(--pink)" }} />
          <div className="hero-blob" style={{ right: "4%", bottom: "-10%", width: "26%", background: "var(--yellow)" }} />
          <div className="hero-blob" style={{ left: "44%", top: "30%", width: "16%", background: "var(--green)" }} />
          <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice">
            <path className="hero-track" d={TRACK} fill="none" stroke="var(--sand)" strokeWidth={78} strokeLinecap="round" strokeLinejoin="round" />
            <path className="hero-guide" d={TRACK} fill="none" stroke="var(--line)" strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" />
            {HERO_TILES.map((t, i) => (
              <g key={i} transform={`translate(${t.x} ${t.y})`}>
                <g className="hero-tile">
                  <rect x={-30} y={-30} width={60} height={60} rx={15} fill={`var(${t.color})`} stroke="var(--ink)" strokeWidth={2.5} />
                  <Glyph k={t.k} />
                </g>
              </g>
            ))}
            <g transform="translate(1110 120)">
              <circle r={40} fill="var(--paper)" stroke="var(--line)" strokeWidth={2} />
              {Array.from({ length: 16 }, (_, i) => (
                <rect key={i} className="confetti" x={-5} y={-5} width={10} height={10} rx={i % 2 ? 5 : 2} fill={`var(${CONFETTI[i % 5]})`} />
              ))}
              <polygon className="hero-star" points={STAR} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
            </g>
            <g className="hero-pawn" transform="translate(4 240)">
              <rect x={-24} y={-24} width={48} height={48} rx={16} fill="var(--white)" stroke="var(--ink)" strokeWidth={3} />
              <g className="bot-eyes">
                <circle cx={8} cy={-8} r={4} fill="var(--ink)" />
                <circle cx={8} cy={8} r={4} fill="var(--ink)" />
              </g>
              <path d="M21-7 31 0 21 7Z" fill="var(--orange)" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      </section>

      <section id="daur-ulang" className="section page section-white">
        <PathNode k="maju" color="--green" />
        <Decor items={DECOR.recycling}>
          <Walker dur={18}>
            <span className="hop">
              <Bot nose="--green" />
            </span>
            <Pellet c="--green" />
            <Pellet c="--yellow" />
            <Pellet c="--green" />
          </Walker>
        </Decor>
        <div className="container split">
          <div className="split-text">
            <p className="label eyebrow reveal" style={{ color: "var(--green-deep)" }}>Keberlanjutan</p>
            <h2 className="reveal">Dari Sampah Plastik, Jadi Mainan Cerdas.</h2>
            <p className="lead reveal">
              Setiap keping klik-klak dicetak 3D dari filamen plastik HDPE daur ulang. Anak belajar berpikir runtut, sampah plastik
              berkurang.
            </p>
          </div>
          <ol className="steps">
            {RECYCLING.map((s, i) => (
              <li key={s.title} className="step reveal">
                <span className="step-num mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="card-title">{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="seri" className="section page">
        <PathNode k="kanan" color="--purple" />
        <Decor items={DECOR.series}>
          <Walker dur={22}>
            {["--pink", "--green", "--pink", "--green", "--pink"].map((c, i) => (
              <MiniTile key={i} c={c} />
            ))}
            <span className="hop">
              <Bot nose="--pink" />
            </span>
          </Walker>
        </Decor>
        <div className="container">
          <div className="section-head">
            <p className="label eyebrow reveal" style={{ color: "var(--ink-muted)" }}>Seri Rimba · Seri Samudra</p>
            <h2 className="reveal">Jelajahi Rimba &amp; Samudra Nusantara.</h2>
            <p className="lead reveal">
              Dua seri bertema keanekaragaman hayati Indonesia. Sambil menyusun langkah, anak berkenalan dengan satwa yang perlu kita jaga.
            </p>
          </div>
          <div className="series">
            {SERIES.map((s) => (
              <Link key={s.key} href={`/produk/set-${s.key}`} className="card series-card reveal" style={{ "--tilt": s.tilt } as React.CSSProperties}>
                <div className="image-well">
                  <div className="image-blob" style={{ background: `var(${s.color})` }} />
                  <span className="field-hint">Foto produk segera hadir</span>
                </div>
                <div className="series-body">
                  <span className="chip" style={{ background: `var(${s.color})` }}>{s.key}</span>
                  <h3 className="card-title">{s.name}</h3>
                  <p className="muted">{s.habitat}</p>
                  <p>{s.text}</p>
                  <p className="muted" style={{ fontSize: 14 }}>Berisi: {s.animals.join(" · ")}</p>
                  <p className="series-price">
                    <span className="mono">{formatIDR(PRODUCTS.find((x) => x.edition === s.key)!.price_idr)}</span>
                    <span className="series-more">Lihat detail →</span>
                  </p>
                </div>
                <span className="series-dot" style={{ background: `var(${s.color})` }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="pelatihan" className="section page section-white">
        <PathNode k="maju" color="--yellow" />
        <Decor items={DECOR.training}>
          <Walker dur={16} reverse>
            <span className="hop carry">
              <svg width="30" viewBox="-32 -32 64 64">
                <polygon points={STAR} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" />
              </svg>
              <Bot nose="--yellow" />
            </span>
          </Walker>
          <Sticker c="--yellow" at={{ left: "30%", top: "14%" }} />
          <Sticker c="--orange" size={32} at={{ right: "28%", bottom: "16%" }} />
          <Sticker c="--yellow" size={28} at={{ right: "14%", top: "30%" }} />
          <Sticker c="--orange" size={34} at={{ left: "14%", top: "46%" }} />
        </Decor>
        <div className="container split split-flip">
          <div className="split-text">
            <p className="label eyebrow reveal" style={{ color: "var(--yellow-deep)" }}>Pelatihan Guru</p>
            <h2 className="reveal">Pelatihan Bersertifikat untuk Guru PAUD.</h2>
            <p className="lead reveal">
              Kami mendampingi guru agar percaya diri mengajarkan berpikir komputasional, yaitu cara berpikir runtut untuk memecahkan
              masalah, lewat permainan.
            </p>
            <ul className="checks">
              {TRAINING.map((t) => (
                <li key={t} className="reveal">
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="card-title reveal" style={{ marginBottom: "var(--s-md)" }}>Dokumentasi Pelatihan</h3>
            <div className="docs">
              {TRAINING_DOCS.map((d) => (
                <figure key={d.title} className="card doc reveal">
                  <div className="image-well image-well-sm">
                    <span className="field-hint">Foto kegiatan</span>
                  </div>
                  <figcaption>
                    <strong>{d.title}</strong>
                    <span className="muted">{d.place}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimoni" className="section page">
        <PathNode k="kiri" color="--orange" />
        <Decor items={DECOR.testimonials}>
          <Walker dur={20}>
            <span className="hop carry">
              <span className="say">Hore!</span>
              <Bot nose="--orange" />
            </span>
          </Walker>
          <Bubble text="Maju!" at={{ left: "14%", top: "30%" }} />
          <Bubble text="Belok kiri!" at={{ right: "12%", top: "36%" }} />
          <Bubble text="Ulangi ×2" at={{ left: "40%", bottom: "14%" }} />
          <Bubble text="Sampai!" at={{ left: "22%", top: "20%" }} />
        </Decor>
        <div className="container">
          <div className="section-head">
            <p className="label eyebrow reveal" style={{ color: "var(--orange-deep)" }}>Testimoni</p>
            <h2 className="reveal">Kata Guru &amp; Orang Tua.</h2>
          </div>
          <div className="quotes">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.who} className="card quote reveal" style={{ "--tilt": `${[-2, 1.5, -1][i]}deg` } as React.CSSProperties}>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <strong>{t.who}</strong>
                  <span className="muted">{t.where}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </LandingMotion>
  );
}

export default function Home() {
  return (
    <section className="container" style={{ textAlign: "center", padding: "var(--s-3xl) var(--gutter)" }}>
      <h1>Belajar Koding, Tanpa Layar.</h1>
      <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ink-muted)", maxWidth: "60ch", margin: "var(--s-lg) auto" }}>
        Mainan edukatif dari plastik daur ulang yang melatih logika anak 4–6 tahun lewat bermain.
      </p>
      <div style={{ display: "flex", gap: "var(--s-md)", justifyContent: "center", flexWrap: "wrap" }}>
        <a className="btn btn-primary" href="#">Pre-order Sekarang</a>
        <a className="btn btn-secondary" href="#">Coba Papan Koding</a>
      </div>
    </section>
  );
}

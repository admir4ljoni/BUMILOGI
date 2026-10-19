"use client";

import { useState, type SubmitEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/api";
import { EDITION_COLOR, formatIDR, type Product } from "@/lib/products";
import type { Pin } from "./address-map";
import { QtyStepper } from "./qty-stepper";

// Leaflet touches window and weighs ~40 KB, so it loads only when the buyer opens the map.
const AddressMap = dynamic(() => import("./address-map").then((m) => m.AddressMap), {
  ssr: false,
  loading: () => <div className="map-box skeleton" />,
});

export function PreorderForm({ product, user, qty: initialQty }: { product: Product; user: User; qty: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(initialQty);
  const [address, setAddress] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [pin, setPin] = useState<Pin | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: product.slug,
          quantity: qty,
          recipient_name: f.get("recipient_name"),
          phone: f.get("phone"),
          address_text: address,
          ...pin,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login?next=" + encodeURIComponent(location.pathname + location.search));
      if (!res.ok) throw new Error(json.message ?? "Terjadi kesalahan. Coba lagi.");
      router.push(`/pesanan/${json.data.id}`);
    } catch (e) {
      setError(e instanceof TypeError ? "Koneksi terputus. Periksa internetmu lalu coba lagi." : (e as Error).message);
      setPending(false);
    }
  }

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="dash-head">
        <h1 className="dash-title">Pre-order</h1>
        <p>Isi data pengiriman. Total transfer muncul setelah pesanan dibuat.</p>
      </div>

      <section className="dash-panel checkout-section">
        <span className="chip" style={{ background: `var(${EDITION_COLOR[product.edition]})` }}>
          {product.edition}
        </span>
        <div className="order-row">
          <strong className="card-title">{product.name}</strong>
          <span className="mono">{formatIDR(product.price_idr)}</span>
        </div>
        <div className="order-row">
          <span className="field-label" id="qty-label">
            Jumlah set
          </span>
          <QtyStepper value={qty} onChange={setQty} labelId="qty-label" />
        </div>
        <div className="order-row order-total">
          <span>Subtotal</span>
          <strong className="mono">{formatIDR(product.price_idr * qty)}</strong>
        </div>
        <p className="field-hint" style={{ margin: 0 }}>
          Ditambah kode unik Rp 1–999 agar transfermu mudah dikenali. Ongkos kirim dikonfirmasi admin via WhatsApp.
        </p>
      </section>

      <section className="dash-panel checkout-section">
        <h2 className="card-title">Pengiriman</h2>
        <label className="field">
          <span className="field-label">Nama penerima</span>
          <input className="input" name="recipient_name" defaultValue={user.full_name} autoComplete="name" required maxLength={100} disabled={pending} />
        </label>
        <label className="field">
          <span className="field-label">Nomor WhatsApp</span>
          <input
            className="input"
            name="phone"
            type="tel"
            defaultValue={user.phone_number ?? ""}
            autoComplete="tel"
            placeholder="0812 3456 7890"
            required
            disabled={pending}
          />
        </label>
        <label className="field">
          <span className="field-label">Alamat lengkap</span>
          <textarea
            className="input"
            name="address_text"
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
            placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"
            required
            minLength={10}
            maxLength={1000}
            disabled={pending}
          />
          <span className="field-hint">Tulis selengkap mungkin. Alamat inilah yang dipakai kurir.</span>
        </label>

        {showMap ? (
          <AddressMap
            onPick={(p, label) => {
              setPin(p);
              if (label && !address.trim()) setAddress(label);
            }}
          />
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setShowMap(true)} disabled={pending}>
            Tandai lokasi di peta (opsional)
          </button>
        )}
        {pin && (
          <p className="form-note form-success" role="status">
            <span aria-hidden="true">✓</span> Lokasi ditandai di peta.
          </p>
        )}
      </section>

      {error && (
        <p className="form-note form-error" role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Memproses…" : "Buat pesanan"}
      </button>
    </form>
  );
}

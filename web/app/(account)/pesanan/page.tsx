import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { STATUS, type OrderSummary } from "@/lib/orders";
import { formatIDR } from "@/lib/products";

export const metadata: Metadata = { title: "Pesanan saya — BUMILOGI" };

export default function OrdersPage() {
  return (
    <div className="checkout">
      <div className="dash-head">
        <h1 className="dash-title">Pesanan saya</h1>
      </div>
      <Suspense fallback={<p className="muted">Memuat pesanan…</p>}>
        <Orders />
      </Suspense>
    </div>
  );
}

async function Orders() {
  const r = await api<OrderSummary[]>("/me/preorders");
  if (r.status === 401) redirect("/login?next=/pesanan");
  if (!r.data) throw new Error(r.message ?? "Gagal memuat pesanan");

  if (r.data.length === 0)
    return (
      <div className="dash-panel empty">
        <h2 className="card-title">Belum ada pesanan</h2>
        <p className="muted">Pilih set Rimba atau Samudra untuk mulai belajar koding tanpa layar.</p>
        <Link href="/#seri" className="btn btn-primary">
          Lihat produk
        </Link>
      </div>
    );

  return (
    <ul className="order-list">
      {r.data.map((o) => {
        const status = STATUS[o.status];
        return (
          <li key={o.id}>
            <Link href={`/pesanan/${o.id}`} className="dash-panel checkout-section order-link">
              <div className="order-row">
                <span className="chip" style={{ background: `var(${status.color})` }}>
                  {status.label}
                </span>
                <span className="muted">
                  {new Date(o.created_at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}
                </span>
              </div>
              <div className="order-row">
                <span>
                  <strong className="card-title">
                    {o.product_name} × {o.quantity}
                  </strong>
                  <br />
                  <span className="mono muted">{o.order_code}</span>
                </span>
                <strong className="mono">{formatIDR(o.total_idr)}</strong>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

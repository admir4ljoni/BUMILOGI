import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { STATUS, type Order } from "@/lib/orders";
import { formatIDR } from "@/lib/products";
import { CopyButton } from "@/components/copy-button";
import { ProofUpload } from "@/components/proof-upload";

export const metadata: Metadata = { title: "Pesanan — BUMILOGI" };

export default function OrderPage({ params }: PageProps<"/pesanan/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Memuat pesanan…</p>}>
      {params.then(({ id }) => (
        <OrderDetail id={id} />
      ))}
    </Suspense>
  );
}

async function OrderDetail({ id }: { id: string }) {
  const r = await api<Order>("/preorders/" + encodeURIComponent(id));
  if (r.status === 401) redirect("/login?next=" + encodeURIComponent("/pesanan/" + id));
  if (r.status === 404) notFound();
  if (!r.data) throw new Error(r.message ?? "Gagal memuat pesanan");
  const o = r.data;
  const status = STATUS[o.status];
  const pending = o.status === "pending_payment";

  return (
    <div className="checkout">
      <Link href="/pesanan" className="muted">
        ← Semua pesanan
      </Link>
      <div className="dash-head">
        <span className="chip" style={{ background: `var(${status.color})` }}>
          {status.label}
        </span>
        <h1 className="dash-title">Pesanan {o.order_code}</h1>
        <p>
          {o.product_name} × {o.quantity}
        </p>
      </div>

      {pending && (
        <section className="dash-panel checkout-section pay-box">
          <p className="field-label" style={{ margin: 0 }}>
            Transfer tepat
          </p>
          <div className="order-row">
            <strong className="mono pay-amount">{formatIDR(o.total_idr)}</strong>
            <CopyButton text={String(o.total_idr)} label="jumlah transfer" />
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            {formatIDR(o.unit_price_idr)} × {o.quantity} + kode unik {o.unique_code}. Transfer sampai 3 digit terakhir
            agar pesananmu cepat terverifikasi. Belum termasuk ongkos kirim.
          </p>

          {o.payment ? (
            <dl className="facts">
              <dt>Bank</dt>
              <dd>{o.payment.bank_name}</dd>
              <dt>No. rekening</dt>
              <dd>
                <span className="mono">{o.payment.account_number}</span>{" "}
                <CopyButton text={o.payment.account_number} label="nomor rekening" />
              </dd>
              <dt>Atas nama</dt>
              <dd>{o.payment.account_holder}</dd>
            </dl>
          ) : (
            <p className="form-note" role="status">
              <span aria-hidden="true">i</span> Detail rekening akan dikirim admin melalui WhatsApp.
            </p>
          )}

          <ProofUpload orderId={o.id} hasProof={o.has_payment_proof} />

          {o.whatsapp_url && (
            <a className="btn btn-primary btn-block" href={o.whatsapp_url} target="_blank" rel="noopener noreferrer">
              Konfirmasi via WhatsApp
            </a>
          )}
        </section>
      )}

      <section className="dash-panel checkout-section">
        <h2 className="card-title">Pengiriman</h2>
        <dl className="facts">
          <dt>Penerima</dt>
          <dd>{o.recipient_name}</dd>
          <dt>WhatsApp</dt>
          <dd>{o.phone}</dd>
          <dt>Alamat</dt>
          <dd style={{ whiteSpace: "pre-line" }}>{o.address_text}</dd>
          {o.lat !== null && (
            <>
              <dt>Peta</dt>
              <dd>
                <a href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=18/${o.lat}/${o.lng}`} target="_blank" rel="noopener noreferrer">
                  Lihat titik lokasi
                </a>
              </dd>
            </>
          )}
          {!pending && o.has_payment_proof && (
            <>
              <dt>Bukti transfer</dt>
              <dd>
                <a href={`/api/v1/preorders/${o.id}/payment-proof`} target="_blank" rel="noopener noreferrer">
                  Lihat bukti
                </a>
              </dd>
            </>
          )}
          <dt>Dipesan</dt>
          <dd>{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })}</dd>
        </dl>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR } from "@/lib/products";
import { QtyStepper } from "./qty-stepper";

// The total here is a preview only; the server prices the order.
export function OrderCard({ price, slug }: { price: number; slug: string }) {
  const [qty, setQty] = useState(1);

  return (
    <div className="order-card">
      <div className="order-row">
        <span className="field-label" id="qty-label">
          Jumlah set
        </span>
        <QtyStepper value={qty} onChange={setQty} labelId="qty-label" />
      </div>
      <div className="order-row order-total">
        <span>Total</span>
        <strong className="mono">{formatIDR(price * qty)}</strong>
      </div>
      <Link href={`/preorder?produk=${slug}&qty=${qty}`} className="btn btn-primary btn-block">
        Pre-order sekarang
      </Link>
      <p className="field-hint" style={{ margin: 0 }}>
        Belum termasuk ongkos kirim. Pembayaran lewat transfer bank, dikonfirmasi via WhatsApp.
      </p>
    </div>
  );
}

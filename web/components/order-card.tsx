"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/products";

// Quantity limits match the planned preorders check (1–100). The total here is a
// preview only; the server computes the real price at checkout (task 7).
export function OrderCard({ price }: { price: number }) {
  const [qty, setQty] = useState(1);
  const set = (n: number) => setQty(Math.min(100, Math.max(1, n || 1)));

  return (
    <div className="order-card">
      <div className="order-row">
        <span className="field-label" id="qty-label">
          Jumlah set
        </span>
        <div className="stepper" role="group" aria-labelledby="qty-label">
          <button type="button" onClick={() => set(qty - 1)} disabled={qty <= 1} aria-label="Kurangi">
            −
          </button>
          <input
            className="mono"
            inputMode="numeric"
            value={qty}
            onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
            aria-labelledby="qty-label"
          />
          <button type="button" onClick={() => set(qty + 1)} disabled={qty >= 100} aria-label="Tambah">
            +
          </button>
        </div>
      </div>
      <div className="order-row order-total">
        <span>Total</span>
        <strong className="mono">{formatIDR(price * qty)}</strong>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled>
        Pre-order segera dibuka
      </button>
      <p className="field-hint" style={{ margin: 0 }}>
        Belum termasuk ongkos kirim. Pembayaran lewat transfer bank, dikonfirmasi via WhatsApp.
      </p>
    </div>
  );
}

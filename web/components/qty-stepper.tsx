// No "use client": only rendered inside client components (order-card, preorder-form).

// Quantity limits match the preorders check (1–100).
export function QtyStepper({ value, onChange, labelId }: { value: number; onChange: (n: number) => void; labelId: string }) {
  const set = (n: number) => onChange(Math.min(100, Math.max(1, n || 1)));
  return (
    <div className="stepper" role="group" aria-labelledby={labelId}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Kurangi">
        −
      </button>
      <input
        className="mono"
        inputMode="numeric"
        value={value}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
        aria-labelledby={labelId}
      />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= 100} aria-label="Tambah">
        +
      </button>
    </div>
  );
}

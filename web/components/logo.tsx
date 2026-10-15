import { Glyph } from "./glyph";

// Brand mark: an orange "maju" command tile beside the wordmark.
export function Logo() {
  return (
    <span className="logo">
      <svg width="32" height="32" viewBox="-32 -32 64 64" aria-hidden="true">
        <rect x={-28} y={-28} width={56} height={56} rx={15} fill="var(--orange)" stroke="var(--ink)" strokeWidth={4} />
        <Glyph k="maju" />
      </svg>
      bumilogi
    </span>
  );
}

export const SECTIONS = [
  { href: "/#daur-ulang", label: "Daur Ulang", color: "--green" },
  { href: "/#seri", label: "Seri", color: "--pink" },
  { href: "/#pelatihan", label: "Pelatihan", color: "--yellow" },
  { href: "/#testimoni", label: "Testimoni", color: "--orange" },
];

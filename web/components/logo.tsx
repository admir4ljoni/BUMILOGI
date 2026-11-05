import { Glyph } from "./glyph";

// Brand mark: an orange "maju" command tile beside the wordmark.
export function Logo() {
  return (
    <span className="logo">
      <svg width="34" height="34" viewBox="-32 -32 64 64" aria-hidden="true">
        <rect x={-28} y={-28} width={56} height={56} rx={15} fill="var(--orange)" stroke="var(--ink)" strokeWidth={4} />
        <Glyph k="maju" />
      </svg>
      bumilogi
    </span>
  );
}

export const SECTIONS = [
  { href: "/#cara-bermain", label: "Cara bermain" },
  { href: "/#seri", label: "Seri" },
  { href: "/papan-koding", label: "Papan koding" },
  { href: "/#daur-ulang", label: "Daur ulang" },
  { href: "/#pelatihan", label: "Pelatihan" },
];

import Image from "next/image";
import { Glyph } from "@/components/glyph";

// The edition's photo, or its color with an arrow tile when no photo was uploaded (as on the site).
export function EditionPicture({ name, color, imageUrl }: { name: string; color: string; imageUrl: string | null }) {
  return (
    <span className="edition-picture" style={{ background: `var(--${color})` }}>
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes="(min-width: 900px) 400px, 100vw" className="edition-picture-img" />
      ) : (
        <svg viewBox="-32 -32 64 64" width="30%" aria-hidden="true">
          <rect x={-28} y={-28} width={56} height={56} rx={14} fill="var(--white)" stroke="var(--ink)" strokeWidth={3} />
          <Glyph k="kanan" />
        </svg>
      )}
    </span>
  );
}

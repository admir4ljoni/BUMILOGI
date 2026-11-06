import type { Cmd } from "@/lib/board";

export type { Cmd };

const ANGLE: Record<Cmd, number> = { kanan: 0, bawah: 90, kiri: 180, atas: -90 };

/** Each direction tile has its own color, so children who can't read yet can still tell them apart. */
export const TILE_COLOR: Record<Cmd, string> = { kanan: "--orange", kiri: "--blue", atas: "--purple", bawah: "--pink" };

// Command-tile arrow pointing the way the tile moves, drawn in a 64-unit box centered on 0,0.
export function Glyph({ k }: { k: Cmd }) {
  return (
    <g fill="none" stroke="var(--ink)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-13 0H11M1-10 11 0 1 10" transform={`rotate(${ANGLE[k]})`} />
    </g>
  );
}

export type Cmd = "maju" | "kiri" | "kanan";

// Command-tile arrow, drawn in a 64-unit box centered on 0,0.
export function Glyph({ k, r = 0 }: { k: Cmd; r?: number }) {
  return (
    <g fill="none" stroke="var(--ink)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
      {k === "maju" ? (
        <path d="M-13 0H11M1-10 11 0 1 10" transform={`rotate(${r})`} />
      ) : (
        <path d="M-9 13V1Q-9-9 1-9H11M3-16 11-9 3-2" transform={k === "kiri" ? "scale(-1 1)" : undefined} />
      )}
    </g>
  );
}

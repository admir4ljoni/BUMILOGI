"use client";

import { usePathname } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { Glyph, type Cmd } from "./glyph";

const LOADER_TILES: [Cmd, string][] = [
  ["maju", "--orange"],
  ["maju", "--orange"],
  ["kanan", "--purple"],
  ["maju", "--orange"],
];

// Full-screen loader on the first page load: tiles click into a row until the page has
// loaded (and at least ~1.4s have passed), then it slides up. `data-loaded` on <html>
// also starts the hero's entrance. Without JS a CSS fallback hides it after 5s.
export function Preloader() {
  useEffect(() => {
    const finish = () =>
      setTimeout(() => (document.documentElement.dataset.loaded = ""), Math.max(0, 1400 - performance.now()));
    if (document.readyState === "complete") finish();
    else addEventListener("load", finish, { once: true });
  }, []);

  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader-tiles">
        {LOADER_TILES.map(([k, color], i) => (
          <svg key={i} viewBox="-32 -32 64 64" style={{ "--i": i } as CSSProperties}>
            <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${color})`} stroke="var(--ink)" strokeWidth={3.5} />
            <Glyph k={k} />
          </svg>
        ))}
      </div>
      <p>Menyiapkan papan…</p>
    </div>
  );
}

// Reveals [data-reveal] elements as they scroll into view; `--i` on an element staggers it.
// Re-scans on every route change. Skipped under reduced motion, so everything stays visible.
export function ScrollReveal() {
  const path = usePathname();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.dataset.reveal = "";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  return null;
}

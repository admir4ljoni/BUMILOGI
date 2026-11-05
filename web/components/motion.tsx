"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
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
// It doubles as the page transition: an internal link click slides it back up over the
// page (data-nav="cover"), navigates underneath, then lifts it again (data-nav="reveal").
// Next's <Link> skips its own navigation when the click is already defaultPrevented.
export function Preloader() {
  const router = useRouter();
  const path = usePathname();
  const pending = useRef(false);
  const navId = useRef(0);
  const shownPath = useRef(path);

  useEffect(() => {
    const finish = () =>
      setTimeout(() => (document.documentElement.dataset.loaded = ""), Math.max(0, 1400 - performance.now()));
    if (document.readyState === "complete") finish();
    else addEventListener("load", finish, { once: true });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
      if (a.pathname === location.pathname || pending.current) return; // same page: let #hash links just scroll
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      pending.current = true;
      html.dataset.nav = "cover";
      setTimeout(() => router.push(a.pathname + a.search + a.hash), 550);
      const id = ++navId.current;
      setTimeout(() => {
        if (pending.current && navId.current === id) reveal(); // navigation never landed: don't leave the page covered
      }, 6000);
    };
    const reveal = () => {
      pending.current = false;
      html.dataset.nav = "reveal";
      setTimeout(() => {
        if (html.dataset.nav === "reveal") delete html.dataset.nav;
      }, 900);
    };
    document.addEventListener("click", onClick, true);
    // The new page has rendered under the cover: hold the tiles a beat, then lift.
    if (pending.current && path !== shownPath.current) {
      shownPath.current = path;
      const t = setTimeout(reveal, 450);
      return () => {
        clearTimeout(t);
        document.removeEventListener("click", onClick, true);
      };
    }
    shownPath.current = path;
    return () => document.removeEventListener("click", onClick, true);
  }, [path, router]);

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

// Scroll-linked scenes: each [data-scroll] element gets, every frame it moves,
//   --in   0→1 as its top travels from the viewport bottom to 30% from the top,
//   --out  0→1 as its bottom travels from the viewport bottom to the top,
//   --p    0→1 across its whole pass through the viewport.
// The CSS turns these into the hero parallax and the zooming section stages.
export function ScrollScenes() {
  const path = usePathname();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...document.querySelectorAll<HTMLElement>("[data-scroll]")];
    if (!els.length) return;
    const clamp = (n: number) => Math.min(1, Math.max(0, n)).toFixed(3);
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--in", clamp((vh - r.top) / (vh * 0.7)));
        el.style.setProperty("--out", clamp(1 - r.bottom / vh));
        el.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height)));
      }
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [path]);
  return null;
}

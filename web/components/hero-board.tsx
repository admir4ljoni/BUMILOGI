"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { run, startPose, type Cmd } from "@/lib/board";
import { CMD, PX, TileIcon, burst, draw, lerpF, toF } from "./coding-board";
import { Glyph, TILE_COLOR } from "./glyph";

// The hero's demo: tiles click into the program one by one, then the animal walks
// the route to the star. Runs the real engine on a fixed demo layout, on a loop.
const DEMO = { start_x: 1, start_y: 4, target_x: 4, target_y: 1, obstacles: [[2, 4], [2, 3], [2, 2]] as [number, number][], color: "green" };
const PROGRAM: Cmd[] = ["atas", "atas", "atas", "kanan", "kanan", "kanan"];

export function HeroBoard() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [placed, setPlaced] = useState(PROGRAM.length);
  const [active, setActive] = useState<number | null>(null);

  // Pointer parallax: the board tilts and the loose pieces drift toward the cursor (mouse only).
  useEffect(() => {
    const hero = canvas.current!.closest<HTMLElement>(".hero");
    if (!hero || !matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const move = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    const leave = () => {
      hero.style.removeProperty("--px");
      hero.style.removeProperty("--py");
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    const result = run(DEMO, PROGRAM);
    const goal = toF(result.steps.at(-1)!.pose);
    // Reduced motion: a still picture of the finished program.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return draw(ctx, DEMO, goal);

    let alive = true;
    let raf = 0;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const tween = (ms: number, f: (k: number) => void) =>
      new Promise<void>((done) => {
        const t0 = performance.now();
        const tick = (now: number) => {
          if (!alive) return;
          const k = Math.min(1, (now - t0) / ms);
          f(k);
          if (k < 1) raf = requestAnimationFrame(tick);
          else done();
        };
        raf = requestAnimationFrame(tick);
      });

    // ponytail: keeps looping while scrolled out of view; pause with an IntersectionObserver if it shows up in battery use.
    (async () => {
      while (alive) {
        let from = toF(startPose(DEMO));
        draw(ctx, DEMO, from);
        setActive(null);
        setPlaced(0);
        for (let i = 1; i <= PROGRAM.length && alive; i++) {
          await wait(300);
          setPlaced(i);
        }
        await wait(600);
        for (const [n, s] of result.steps.entries()) {
          if (!alive) return;
          setActive(n);
          const to = toF(s.pose, from.a);
          const f = from;
          await tween(520, (k) => draw(ctx, DEMO, lerpF(f, to, 1 - (1 - k) ** 3)));
          from = to;
        }
        setActive(null);
        const at = burst(DEMO.target_x, DEMO.target_y);
        await tween(1400, (k) => draw(ctx, DEMO, from, 0, at(k)));
        draw(ctx, DEMO, from);
        await wait(2200);
      }
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <figure className="hero-board">
      <Pieces />
      <div className="board-frame">
        <canvas ref={canvas} width={PX} height={PX} role="img" aria-label="Contoh di papan 6×6: badak naik tiga kotak, lalu ke kanan tiga kotak sampai di bintang." />
      </div>
      <ol className="hero-strip" aria-label="Program contoh">
        {PROGRAM.map((c, i) => (
          <li
            key={i}
            className={"cb-tile cb-tile-sm" + (i < placed ? " is-placed" : "") + (i === active ? " is-active" : "")}
            style={{ background: `var(${CMD[c].color})`, visibility: i < placed ? "visible" : "hidden" }}
          >
            <TileIcon k={c} />
            <span className="sr-only">{CMD[c].label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

// Loose pieces floating around the board. `--d` is how far each drifts with the pointer.
function Pieces() {
  return (
    <div className="hero-pieces" aria-hidden="true">
      <svg className="piece piece-star" style={{ "--d": -18 } as CSSProperties} viewBox="-32 -32 64 64">
        <path d="M0-26 7.6-10.5 24.7-8 12.4 4 15.3 21 0 13 -15.3 21-12.4 4-24.7-8-7.6-10.5Z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth={3.5} strokeLinejoin="round" />
      </svg>
      <svg className="piece piece-kiri" style={{ "--d": 26 } as CSSProperties} viewBox="-32 -32 64 64">
        <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${TILE_COLOR.kiri})`} stroke="var(--ink)" strokeWidth={3.5} />
        <Glyph k="kiri" />
      </svg>
      <svg className="piece piece-atas" style={{ "--d": -30 } as CSSProperties} viewBox="-32 -32 64 64">
        <rect x={-28} y={-28} width={56} height={56} rx={14} fill={`var(${TILE_COLOR.atas})`} stroke="var(--ink)" strokeWidth={3.5} />
        <Glyph k="atas" />
      </svg>
      <svg className="piece piece-cap" style={{ "--d": 14 } as CSSProperties} viewBox="-32 -32 64 64">
        <circle r={24} fill="var(--pink)" stroke="var(--ink)" strokeWidth={3.5} />
        <circle r={14} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeDasharray="4 5" />
      </svg>
    </div>
  );
}

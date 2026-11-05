"use client";

import { useEffect, useRef, useState } from "react";
import { MISSIONS, run, type Cmd } from "@/lib/board";
import { CMD, PX, TileIcon, burst, draw, lerpF, toF } from "./coding-board";

// The hero's demo: tiles click into the program one by one, then the animal walks
// the route to the star. Runs the real engine on mission 3, on a loop.
const DEMO = MISSIONS[2];
const PROGRAM: Cmd[] = ["maju", "maju", "maju", "kanan", "maju", "maju", "maju"];

export function HeroBoard() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [placed, setPlaced] = useState(PROGRAM.length);
  const [active, setActive] = useState<number | null>(null);

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
        let from = toF(DEMO.start);
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
        const at = burst(DEMO.target.x, DEMO.target.y);
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
      <div className="board-frame">
        <canvas ref={canvas} width={PX} height={PX} role="img" aria-label="Contoh di papan 6×6: badak berjalan maju tiga langkah, belok kanan, lalu maju tiga langkah sampai di bintang." />
      </div>
      <ol className="hero-strip" aria-label="Program contoh">
        {PROGRAM.map((c, i) => (
          <li
            key={i}
            className={"cb-tile cb-tile-sm" + (i === active ? " is-active" : "")}
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

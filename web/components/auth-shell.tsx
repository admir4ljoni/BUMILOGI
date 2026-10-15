"use client";

import { createContext, use, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Glyph, type Cmd } from "./glyph";

gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

// The board is a klik-klak program: a track of command tiles the pawn drives
// along. Each auth page is a station on it; the star is "done".
const TRACK = "M60 500 H300 V300 H540 V100 H180"; // 1240 units long
const STATIONS: Record<string, number> = {
  "/login": 240 / 1240,
  "/register": 440 / 1240,
  "/forgot-password": 680 / 1240,
  "/reset-password": 880 / 1240,
  "/verify-email": 1040 / 1240,
};
const TILES: { x: number; y: number; k: Cmd; r?: number }[] = [
  { x: 180, y: 500, k: "maju" },
  { x: 300, y: 500, k: "kiri" },
  { x: 300, y: 400, k: "maju", r: -90 },
  { x: 300, y: 300, k: "kanan" },
  { x: 420, y: 300, k: "maju" },
  { x: 540, y: 300, k: "kiri" },
  { x: 540, y: 200, k: "maju", r: -90 },
  { x: 540, y: 100, k: "kiri" },
  { x: 420, y: 100, k: "maju", r: 180 },
  { x: 300, y: 100, k: "maju", r: 180 },
];
const STAR = "0,-30 7.6,-10.5 28.5,-9.3 12.4,4 17.6,24.3 0,13 -17.6,24.3 -12.4,4 -28.5,-9.3 -7.6,-10.5";
const CONFETTI = ["--pink", "--purple", "--green", "--yellow", "--orange"];

type Fx = { error: () => void; success: () => Promise<void> };

// Next keeps visited layouts alive (hidden) and re-runs their effects when shown
// again; the full intro plays once per page load, later shows jump to its end.
let introPlayed = false;

const FxContext = createContext<{ current: Fx }>({ current: { error() {}, success: async () => {} } });

// Lets the form trigger the board's reactions; reads the ref at call time, after the scene set it.
export function useAuthFx(): Fx {
  const ref = use(FxContext);
  return { error: () => ref.current.error(), success: () => ref.current.success() };
}

function LooseTile({ k, color, style }: { k: Cmd; color: string; style: React.CSSProperties }) {
  return (
    <div className="loose" style={style}>
      <div className="loose-tile" style={{ background: `var(${color})` }}>
        <svg viewBox="-32 -32 64 64" width="100%" height="100%">
          <Glyph k={k} r={-90} />
        </svg>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const fx = useRef<Fx>({ error() {}, success: async () => {} });
  const goTo = useRef<(p: number) => void>(null);
  const station = useRef(0);
  const ready = useRef(false);
  const target = STATIONS[usePathname()] ?? 0;

  useGSAP(
    (_, contextSafe) => {
      const q = gsap.utils.selector(root);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [pawn] = q(".pawn");
      const track = root.current!.querySelector<SVGPathElement>(".track-guide")!;

      // One linear tween along the whole track; stations are seeks into it.
      const drive = gsap.to(pawn, {
        motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5], autoRotate: true },
        ease: "none",
        duration: 1,
        paused: true,
      });
      drive.progress(1).progress(0);
      const to = (p: number) =>
        gsap.to(drive, { progress: p, duration: reduce ? 0 : 0.5 + Math.abs(p - drive.progress()) * 2.4, ease: "power2.inOut", overwrite: true });
      goTo.current = to;

      const start = () => {
        if (ready.current) return;
        ready.current = true;
        to(station.current);
      };
      gsap.set(q(".auth-scene"), { autoAlpha: 1 });
      const intro = gsap
        .timeline({ defaults: { ease: "power3.out" }, onComplete: start })
        .from(q(".scene-blob"), { scale: 0.6, autoAlpha: 0, duration: 0.8, stagger: 0.12 })
        .from(q(".scene-board"), { y: 30, autoAlpha: 0, duration: 0.6 }, "<0.1")
        .from(q(".track"), { drawSVG: 0, duration: 1, ease: "power2.inOut" }, "-=0.2")
        .from(q(".track-guide"), { autoAlpha: 0, duration: 0.4 }, "-=0.2")
        .from(q(".tile"), {
          scale: 0,
          rotation: () => gsap.utils.random(-35, 35),
          transformOrigin: "50% 50%",
          duration: 0.45,
          stagger: 0.07,
          ease: "back.out(2.4)",
        }, "<0.25")
        .from(q(".loop"), { drawSVG: 0, duration: 0.6 }, "-=0.3")
        .from(q(".loop-badge, .target"), { scale: 0, transformOrigin: "50% 50%", duration: 0.6, stagger: 0.12, ease: "back.out(3)" }, "<0.2")
        .from(q(".loose"), { y: 80, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, "<")
        .fromTo(pawn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "-=0.5")
        .from(q(".pawn-body"), { scale: 0, rotation: -90, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(3)" }, "<");
      if (reduce || introPlayed) {
        intro.progress(1);
        start();
      }
      introPlayed = true;
      if (!reduce) {
        gsap.to(q(".loose-tile"), {
          y: "random(-12, 12)",
          rotation: "random(-5, 5)",
          duration: "random(2.2, 3.4)",
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
        });
      }

      fx.current = {
        error: contextSafe!(() => {
          if (reduce) return;
          gsap.to(q(".auth-card"), { keyframes: { x: [0, -10, 9, -6, 4, 0] }, duration: 0.45, ease: "power1.inOut" });
          gsap.to(q(".pawn-body"), { keyframes: { rotation: [0, -18, 15, -10, 6, 0] }, duration: 0.6, transformOrigin: "50% 50%" });
        }),
        success: () =>
          new Promise<void>((resolve) =>
            contextSafe!(() => {
              // Submitted mid-intro (or verify-email on load): finish the intro now and
              // mark ready, so its onComplete can't send the pawn back to the station.
              ready.current = true;
              intro.progress(1);
              const done = gsap
                .timeline({ onComplete: resolve })
                .add(to(1))
                .to(q(".target"), { scale: 1.4, rotation: 72, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(3)" })
                .fromTo(q(".confetti"), { x: 0, y: 0, scale: 1, autoAlpha: 1 }, {
                  x: () => gsap.utils.random(-100, 100),
                  y: () => gsap.utils.random(-90, 80),
                  rotation: () => gsap.utils.random(-200, 200),
                  scale: 0.3,
                  autoAlpha: 0,
                  duration: 1,
                  ease: "power3.out",
                  stagger: 0.012,
                }, "<")
                .to(q(".target"), { scale: 1, rotation: 0, duration: 0.4, ease: "power2.out" }, "-=0.6");
              if (reduce) done.progress(1);
            })(),
          ),
      };

      // Parallax: three depth layers. Scroll everywhere, pointer on desktop mice.
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 900px)", mouse: "(min-width: 900px) and (pointer: fine)" },
        (ctx) => {
          const { motion, wide, mouse } = ctx.conditions!;
          if (!motion) return;
          const layers = [
            [q(".scene-back")[0], 0.3],
            [q(".scene-mid")[0], 0.55],
            [q(".scene-front")[0], 1],
          ] as const;
          for (const [el, depth] of layers) {
            gsap.to(el, {
              yPercent: -(wide ? 8 : 22) * depth,
              ease: "none",
              scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
            });
          }
          if (!mouse) return;
          const movers = layers.map(([el, depth]) => ({
            depth,
            x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3" }),
          }));
          const onMove = (e: PointerEvent) => {
            const nx = e.clientX / innerWidth - 0.5;
            const ny = e.clientY / innerHeight - 0.5;
            for (const m of movers) {
              m.x(nx * -40 * m.depth);
              m.y(ny * -30 * m.depth);
            }
          };
          addEventListener("pointermove", onMove);
          return () => removeEventListener("pointermove", onMove);
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  // Navigating between auth pages drives the pawn to the new station.
  useGSAP(() => {
    station.current = target;
    if (ready.current) goTo.current?.(target);
  }, { dependencies: [target] });

  return (
    <FxContext value={fx}>
      <section ref={root} className="container auth">
        <div className="auth-scene" aria-hidden="true">
          <div className="scene-layer scene-back">
            <div className="scene-blob" style={{ top: "2%", left: "4%", width: "44%", background: "var(--pink)" }} />
            <div className="scene-blob" style={{ bottom: "0%", right: "2%", width: "52%", background: "var(--yellow)" }} />
          </div>

          <div className="scene-layer scene-mid">
            <div className="scene-board" />
            <svg className="scene-svg" viewBox="0 0 600 600">
              <path className="track" d={TRACK} fill="none" stroke="var(--sand)" strokeWidth={78} strokeLinecap="round" strokeLinejoin="round" />
              <path className="track-guide" d={TRACK} fill="none" stroke="var(--line)" strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" />
              <circle cx={60} cy={500} r={30} fill="var(--paper)" stroke="var(--ink-soft)" strokeWidth={2} strokeDasharray="4 6" />

              <rect className="loop" x={250} y={52} width={220} height={96} rx={26} fill="none" stroke="var(--green)" strokeWidth={6} />
              <g className="loop-badge" transform="translate(470 52)">
                <circle r={20} fill="var(--green)" stroke="var(--ink)" strokeWidth={2.5} />
                <text textAnchor="middle" dy={5} fontSize={15} fontWeight={600} fontFamily="var(--font-mono)" fill="var(--ink)">
                  ×2
                </text>
              </g>

              {TILES.map((t, i) => (
                <g key={i} className="tile" transform={`translate(${t.x} ${t.y})`}>
                  <rect x={-30} y={-30} width={60} height={60} rx={15} fill={t.k === "maju" ? "var(--orange)" : "var(--purple)"} stroke="var(--ink)" strokeWidth={2.5} />
                  <Glyph k={t.k} r={t.r} />
                </g>
              ))}

              <g transform="translate(180 100)">
                <circle r={40} fill="var(--paper)" stroke="var(--line)" strokeWidth={2} />
                {Array.from({ length: 15 }, (_, i) => (
                  <rect key={i} className="confetti" x={-5} y={-5} width={10} height={10} rx={i % 2 ? 5 : 2} fill={`var(${CONFETTI[i % 5]})`} />
                ))}
                <polygon className="target" points={STAR} fill="var(--yellow)" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
              </g>

              <g className="pawn">
                <g className="pawn-body">
                  <rect x={-24} y={-24} width={48} height={48} rx={16} fill="var(--white)" stroke="var(--ink)" strokeWidth={3} />
                  <circle cx={8} cy={-8} r={4} fill="var(--ink)" />
                  <circle cx={8} cy={8} r={4} fill="var(--ink)" />
                  <path d="M21-7 31 0 21 7Z" fill="var(--orange)" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
                </g>
              </g>
            </svg>
          </div>

          <div className="scene-layer scene-front">
            <LooseTile k="maju" color="--orange" style={{ top: "3%", right: "4%", rotate: "12deg" }} />
            <LooseTile k="kanan" color="--purple" style={{ bottom: "4%", left: "3%", rotate: "-9deg" }} />
            <div className="loose" style={{ bottom: "14%", right: "2%", rotate: "-6deg" }}>
              <div className="loose-tile loose-chip">Ulangi ×2</div>
            </div>
          </div>
        </div>

        <div className="auth-card">{children}</div>
      </section>
    </FxContext>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { LOOP_TIMES, MAX_TILES, MISSIONS, SIZE, run, tileCount, type At, type Block, type Cmd, type Loop, type Mission, type Pose } from "@/lib/board";
import { Glyph } from "./glyph";

const CMDS: { k: Cmd; label: string; color: string }[] = [
  { k: "maju", label: "Maju", color: "--orange" },
  { k: "mundur", label: "Mundur", color: "--orange" },
  { k: "kiri", label: "Belok Kiri", color: "--purple" },
  { k: "kanan", label: "Belok Kanan", color: "--purple" },
];
export const CMD = Object.fromEntries(CMDS.map((c) => [c.k, c])) as Record<Cmd, (typeof CMDS)[number]>;
const PAWN = { rimba: "--green", samudra: "--pink" } as const;
const CONFETTI = ["--orange", "--purple", "--green", "--yellow", "--pink"];

const TOAST = {
  collision: { text: "Ups, ada rintangan! Debug & coba lagi.", bg: "--pink" },
  success: { text: "Hore! Misi selesai.", bg: "--green" },
  incomplete: { text: "Belum sampai bintang. Tambah perintahnya, lalu coba lagi.", bg: "--sand" },
} as const;

// ---------- canvas drawing ----------

export const PX = 960; // fixed backing size; CSS scales it to the card
export const CELL = PX / SIZE;
export type FPose = { x: number; y: number; a: number }; // a = degrees, 0 = facing up
export type Particle = { x: number; y: number; vx: number; vy: number; c: string; r: number };

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

// Keeps the angle continuous so a turn from left (270°) to up (0°) rotates 90°, not 270°.
export const toF = (p: Pose, prevA = p.dir * 90): FPose => ({ x: p.x, y: p.y, a: prevA + ((((p.dir * 90 - prevA) % 360) + 540) % 360) - 180 });

export const lerpF = (f: FPose, t: FPose, e: number): FPose => ({ x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e, a: f.a + (t.a - f.a) * e });

/** Confetti burst from a cell; call the result with k in 0..1 to get that frame's particles. */
export function burst(cellX: number, cellY: number) {
  const cx = (cellX + 0.5) * CELL;
  const cy = (cellY + 0.5) * CELL;
  const ps = Array.from({ length: 90 }, (_, i) => {
    const t = Math.random() * Math.PI * 2;
    const v = 8 + Math.random() * 14;
    return { x: cx, y: cy, vx: Math.cos(t) * v, vy: Math.sin(t) * v - 10, c: css(CONFETTI[i % 5]), r: Math.random() * 6 };
  });
  return (k: number): Particle[] => {
    const t = k * 60; // frames at 60fps
    return ps.map((p) => ({ ...p, x: p.x + p.vx * t, y: p.y + p.vy * t + 0.35 * t * t, r: p.r + t * 0.2 }));
  };
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const t = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(cx + r * Math.cos(t), cy + r * Math.sin(t));
  }
  ctx.closePath();
}

export function draw(ctx: CanvasRenderingContext2D, m: Mission, p: FPose, wobble = 0, confetti: Particle[] = []) {
  const ink = css("--ink");
  const inset = 6;
  const cell = (x: number, y: number, dy = 0) => {
    ctx.beginPath();
    ctx.roundRect(x * CELL + inset, y * CELL + inset + dy, CELL - inset * 2, CELL - inset * 2, 22);
  };
  ctx.clearRect(0, 0, PX, PX);
  ctx.lineWidth = 2;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      cell(x, y);
      ctx.fillStyle = css("--cream");
      ctx.fill();
      ctx.strokeStyle = css("--line");
      ctx.stroke();
    }

  cell(m.target.x, m.target.y);
  ctx.fillStyle = css("--yellow");
  ctx.fill();
  star(ctx, (m.target.x + 0.5) * CELL, (m.target.y + 0.5) * CELL, CELL * 0.28);
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  ctx.stroke();

  for (const [x, y] of m.obstacles) {
    cell(x, y, 10); // the block's side, for a 3D-ish look
    ctx.fillStyle = "rgba(43, 38, 34, 0.28)";
    ctx.fill();
    cell(x, y, -4);
    ctx.fillStyle = css("--sand");
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(43, 38, 34, 0.35)";
    ctx.stroke();
  }

  // Pawn: an animal token in the edition color, nose pointing where it faces.
  const R = CELL * 0.32;
  ctx.save();
  ctx.translate((p.x + 0.5) * CELL, (p.y + 0.5) * CELL);
  ctx.rotate(((p.a + wobble) * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-R * 0.45, -R * 0.8);
  ctx.lineTo(0, -R * 1.35);
  ctx.lineTo(R * 0.45, -R * 0.8);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = css(PAWN[m.edition]);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.fillStyle = ink;
  for (const ex of [-R * 0.36, R * 0.36]) {
    ctx.beginPath();
    ctx.arc(ex, -R * 0.3, R * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const c of confetti) {
    ctx.fillStyle = c.c;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.r);
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
}

// ---------- program strip ----------

export function TileIcon({ k }: { k: Cmd }) {
  return (
    <svg viewBox="-32 -32 64 64" width="30" height="30" aria-hidden="true">
      <Glyph k={k === "mundur" ? "maju" : k} r={k === "mundur" ? 180 : 0} />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg viewBox="-32 -32 64 64" width="30" height="30" aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 -6A15 15 0 1 0 12 10M14 -18V-5H1" />
      </g>
    </svg>
  );
}

const key = (at: At) => `${at.i}-${at.j ?? ""}`;
const same = (a: At | null, b: At) => !!a && a.i === b.i && a.j === b.j;

/** `head` is the page title; on desktop it sits beside the board so the board starts right under the header. */
export function CodingBoard({ head }: { head: ReactNode }) {
  const [mi, setMi] = useState(0);
  const [program, setProgram] = useState<Block[]>([]);
  const [open, setOpen] = useState(false); // the last block is a loop still taking tiles
  const [active, setActive] = useState<At | null>(null);
  const [toast, setToast] = useState<keyof typeof TOAST | null>(null);
  const [running, setRunning] = useState(false);
  const [fast, setFast] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const runId = useRef(0); // bumping it cancels the animation in flight
  const focusKey = useRef<string | null>(null);
  const mission = MISSIONS[mi];
  const full = tileCount(program) >= MAX_TILES;

  const paint = (p: FPose, wobble?: number, confetti?: Particle[]) => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, mission, p, wobble, confetti);
  };

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, MISSIONS[mi], toF(MISSIONS[mi].start));
  }, [mi]);

  // After a keyboard move, keep focus on the tile that moved.
  useEffect(() => {
    if (focusKey.current) strip.current?.querySelector<HTMLElement>(`[data-tile="${focusKey.current}"]`)?.focus();
    focusKey.current = null;
  }, [program]);

  function stop() {
    runId.current++;
    setRunning(false);
    setActive(null);
    setToast(null);
    paint(toF(mission.start));
  }

  function edit(next: Block[], keepOpen = false) {
    stop();
    setProgram(next);
    if (!keepOpen) setOpen(false);
  }

  function add(c: Cmd) {
    if (full) return;
    const last = program.at(-1);
    if (open && last && typeof last !== "string") edit([...program.slice(0, -1), { ...last, body: [...last.body, c] }], true);
    else edit([...program, c]);
  }

  function toggleLoop() {
    if (open) return setOpen(false);
    if (full) return;
    edit([...program, { times: LOOP_TIMES[0], body: [] }]);
    setOpen(true);
  }

  const withLoop = (i: number, f: (l: Loop) => Loop) => program.map((b, k) => (k === i && typeof b !== "string" ? f(b) : b));

  function remove(at: At) {
    if (at.j === undefined) return edit(program.filter((_, k) => k !== at.i));
    edit(withLoop(at.i, (l) => ({ ...l, body: l.body.filter((_, k) => k !== at.j) })), open && at.i === program.length - 1);
  }

  function move(at: At, d: -1 | 1) {
    const swap = <T,>(xs: T[], i: number) => {
      const ys = [...xs];
      [ys[i], ys[i + d]] = [ys[i + d], ys[i]];
      return ys;
    };
    if (at.j === undefined) {
      if (at.i + d < 0 || at.i + d >= program.length) return;
      focusKey.current = key({ i: at.i + d });
      return edit(swap(program, at.i));
    }
    const body = (program[at.i] as Loop).body;
    if (at.j + d < 0 || at.j + d >= body.length) return;
    focusKey.current = key({ i: at.i, j: at.j + d });
    edit(withLoop(at.i, (l) => ({ ...l, body: swap(l.body, at.j!) })), open && at.i === program.length - 1);
  }

  const onTileKey = (at: At) => (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      move(at, e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(at);
    }
  };

  function frames(id: number, ms: number, onFrame: (k: number) => void) {
    return new Promise<boolean>((done) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        if (runId.current !== id) return done(false);
        const k = Math.min(1, (now - t0) / ms);
        onFrame(k);
        if (k < 1) requestAnimationFrame(tick);
        else done(true);
      };
      requestAnimationFrame(tick);
    });
  }

  async function play() {
    const id = ++runId.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = fast ? 220 : 450;
    const r = run(mission, program);
    setOpen(false);
    setToast(null);
    setRunning(true);

    let from = toF(mission.start);
    paint(from);
    for (const s of r.steps) {
      setActive(s.at);
      const to = toF(s.pose, from.a);
      const f = from;
      // Reduced motion: the pawn snaps to each cell instead of sliding.
      const ok = await frames(id, ms, (k) => paint(lerpF(f, to, reduce ? Math.floor(k) : 1 - (1 - k) ** 3)));
      if (!ok) return;
      from = to;
    }

    const end = from;
    if (r.outcome === "collision") {
      setActive(r.at); // leave the failing tile ringed, to debug
      setToast("collision");
      if (!reduce && !(await frames(id, 600, (k) => paint(end, Math.sin(k * Math.PI * 6) * 14 * (1 - k))))) return;
    } else {
      setActive(null);
      setToast(r.outcome);
      if (r.outcome === "success" && !reduce) {
        const at = burst(mission.target.x, mission.target.y);
        const ok = await frames(id, 1400, (k) => paint(end, 0, at(k)));
        if (ok) paint(end);
        else return;
      }
    }
    setRunning(false);
  }

  function pickMission(k: number) {
    runId.current++;
    setMi(k);
    setProgram([]);
    setOpen(false);
    setActive(null);
    setToast(null);
    setRunning(false);
  }

  const tile = (c: Cmd, at: At) => (
    <button
      key={key(at)}
      type="button"
      data-tile={key(at)}
      className={"cb-tile cb-tile-sm" + (same(active, at) ? " is-active" : "")}
      style={{ background: `var(${CMD[c].color})` }}
      aria-label={`Hapus ${CMD[c].label}`}
      onClick={() => remove(at)}
      onKeyDown={onTileKey(at)}
    >
      <TileIcon k={c} />
    </button>
  );

  return (
    <div className="cb">
      <div className="cb-head">{head}</div>
        <div className="board-frame cb-board">
          <canvas
            ref={canvas}
            width={PX}
            height={PX}
            role="img"
            aria-label={`Papan ${SIZE}×${SIZE}: pion di kolom ${mission.start.x + 1} baris ${mission.start.y + 1}, bintang di kolom ${mission.target.x + 1} baris ${mission.target.y + 1}, ${mission.obstacles.length} rintangan.`}
          />
          <p className="cb-toast" role="status" style={{ background: `var(${toast ? TOAST[toast].bg : "--cream"})` }}>
            {toast ? TOAST[toast].text : running ? "Program berjalan…" : "Susun program, lalu tekan Jalankan Program."}
          </p>
        </div>

        <div className="cb-side">
          <div className="cb-missions" role="group" aria-label="Pilih misi">
            {MISSIONS.map((m, k) => (
              <button key={k} type="button" className="cb-mission" aria-pressed={k === mi} aria-label={`Misi ${k + 1}: ${m.title}`} onClick={() => pickMission(k)}>
                {k + 1}
              </button>
            ))}
          </div>
          <div className="cb-brief">
            <span className="chip" style={{ background: `var(${PAWN[mission.edition]})` }}>
              Seri {mission.edition}
            </span>
            <h2 className="card-title">
              Misi {mi + 1}: {mission.title}
            </h2>
            <p className="muted">{mission.hint}</p>
          </div>

          <div className="cb-palette" role="group" aria-label="Perintah">
            {CMDS.map((c) => (
              <button key={c.k} type="button" className="cb-cmd" disabled={full} onClick={() => add(c.k)}>
                <span className="cb-tile" style={{ background: `var(${c.color})` }}>
                  <TileIcon k={c.k} />
                </span>
                <span>{c.label}</span>
              </button>
            ))}
            <button type="button" className="cb-cmd" disabled={full && !open} aria-pressed={open} onClick={toggleLoop}>
              <span className="cb-tile" style={{ background: "var(--green)" }}>
                <LoopIcon />
              </span>
              <span>{open ? "Tutup Ulangi" : "Ulangi"}</span>
            </button>
          </div>

          <div ref={strip} className="cb-strip" role="group" aria-label="Program">
            {program.length === 0 && <span className="muted">Ketuk perintah di atas untuk menyusun program.</span>}
            {program.map((b, i) =>
              typeof b === "string" ? (
                tile(b, { i })
              ) : (
                <div key={i} className={"cb-loop" + (open && i === program.length - 1 ? " is-open" : "")}>
                  <button
                    type="button"
                    data-tile={key({ i })}
                    className={"cb-loop-head" + (same(active, { i }) ? " is-active" : "")}
                    aria-label="Hapus Ulangi"
                    onClick={() => remove({ i })}
                    onKeyDown={onTileKey({ i })}
                  >
                    Ulangi
                  </button>
                  <button
                    type="button"
                    className="cb-loop-times"
                    aria-label={`Ulangi ${b.times} kali, ketuk untuk mengubah`}
                    onClick={() => edit(withLoop(i, (l) => ({ ...l, times: LOOP_TIMES[(LOOP_TIMES.indexOf(l.times) + 1) % LOOP_TIMES.length] })), open)}
                  >
                    ×{b.times}
                  </button>
                  {b.body.map((c, j) => tile(c, { i, j }))}
                  {open && i === program.length - 1 && <span className="cb-loop-slot" aria-hidden="true">+</span>}
                </div>
              ),
            )}
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            {full ? `Maksimal ${MAX_TILES} keping. ` : ""}Ketuk keping di program untuk menghapus. Keyboard: panah kiri/kanan untuk memindah.
          </p>

          <div className="cb-controls">
            <button type="button" className="btn btn-primary" disabled={running || program.length === 0} onClick={play}>
              Jalankan Program
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => edit([])}>
              Reset
            </button>
            <button type="button" className="icon-btn cb-speed" aria-pressed={fast} aria-label={fast ? "Kecepatan: cepat" : "Kecepatan: normal"} onClick={() => setFast(!fast)}>
              {fast ? "2×" : "1×"}
            </button>
          </div>
        </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MAX_TILES, SIZE, run, startPose, type Cmd, type Layout, type Pose } from "@/lib/board";
import type { SiteLevel } from "@/lib/db/site";
import { Glyph, TILE_COLOR } from "./glyph";

const CMDS: { k: Cmd; label: string; color: string }[] = (
  [
    ["atas", "Atas"],
    ["bawah", "Bawah"],
    ["kiri", "Kiri"],
    ["kanan", "Kanan"],
  ] as const
).map(([k, label]) => ({ k, label, color: TILE_COLOR[k] }));
export const CMD = Object.fromEntries(CMDS.map((c) => [c.k, c])) as Record<Cmd, (typeof CMDS)[number]>;
const CONFETTI = ["--orange", "--purple", "--green", "--yellow", "--pink", "--blue"];

const TOAST = {
  collision: { text: "Ups, ada rintangan! Debug & coba lagi.", bg: "--pink" },
  success: { text: "Hore! Misi selesai.", bg: "--green" },
  incomplete: { text: "Belum sampai bintang. Tambah perintahnya, lalu coba lagi.", bg: "--sand" },
  passed: { text: "Kelewatan! Satwa harus berhenti tepat di bintang.", bg: "--sand" },
} as const;

// ---------- canvas drawing ----------

export const PX = 960; // fixed backing size; CSS scales it to the card
export const CELL = PX / SIZE;
export type FPose = { x: number; y: number; a: number }; // a = degrees, 0 = facing up
export type Particle = { x: number; y: number; vx: number; vy: number; c: string; r: number };

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

// Keeps the angle continuous so the pawn turning from left (270°) to up (0°) rotates 90°, not 270°.
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

/** `m.color` is the edition's palette token, used for the pawn. */
export function draw(ctx: CanvasRenderingContext2D, m: Layout & { color: string }, p: FPose, wobble = 0, confetti: Particle[] = []) {
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

  cell(m.target_x, m.target_y);
  ctx.fillStyle = css("--yellow");
  ctx.fill();
  star(ctx, (m.target_x + 0.5) * CELL, (m.target_y + 0.5) * CELL, CELL * 0.28);
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
  ctx.fillStyle = css(`--${m.color}`);
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
    // Tighter box than the decorative tiles: the arrow is the whole message, so it fills the tile.
    <svg viewBox="-19 -19 38 38" width="30" height="30" aria-hidden="true">
      <Glyph k={k} />
    </svg>
  );
}

/**
 * `head` is the page title. The play area (board, tiles, program, buttons) is sized to fit one
 * screen, so you never scroll between the tiles and the board. `levels` must not be empty.
 */
export function CodingBoard({ head, levels }: { head: ReactNode; levels: SiteLevel[] }) {
  const [mi, setMi] = useState(0);
  const [program, setProgram] = useState<Cmd[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [toast, setToast] = useState<keyof typeof TOAST | null>(null);
  const [running, setRunning] = useState(false);
  const [fast, setFast] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const runId = useRef(0); // bumping it cancels the animation in flight
  const focusIndex = useRef<number | null>(null);
  const mission = levels[mi];
  const full = program.length >= MAX_TILES;

  const paint = (p: FPose, wobble?: number, confetti?: Particle[]) => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, mission, p, wobble, confetti);
  };

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, levels[mi], toF(startPose(levels[mi])));
  }, [levels, mi]);

  // After a keyboard move, keep focus on the tile that moved.
  useEffect(() => {
    if (focusIndex.current !== null) strip.current?.querySelector<HTMLElement>(`[data-tile="${focusIndex.current}"]`)?.focus();
    focusIndex.current = null;
  }, [program]);

  function stop() {
    runId.current++;
    setRunning(false);
    setActive(null);
    setToast(null);
    paint(toF(startPose(mission)));
  }

  function edit(next: Cmd[]) {
    stop();
    setProgram(next);
  }

  function add(c: Cmd) {
    if (!full) edit([...program, c]);
  }

  function remove(i: number) {
    edit(program.filter((_, k) => k !== i));
  }

  function move(i: number, d: -1 | 1) {
    if (i + d < 0 || i + d >= program.length) return;
    const next = [...program];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    focusIndex.current = i + d;
    edit(next);
  }

  const onTileKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      move(i, e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(i);
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
    setToast(null);
    setRunning(true);

    let from = toF(startPose(mission));
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
      // Ended off the star but stood on it on the way: tell the child they went too far.
      const passed = r.outcome === "incomplete" && r.steps.some((s) => s.pose.x === mission.target_x && s.pose.y === mission.target_y);
      setToast(passed ? "passed" : r.outcome);
      if (r.outcome === "success" && !reduce) {
        const at = burst(mission.target_x, mission.target_y);
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
    setActive(null);
    setToast(null);
    setRunning(false);
  }

  return (
    <div className="cb">
      <div className="cb-head">{head}</div>
      <div className="board-frame cb-board">
        <canvas
          ref={canvas}
          width={PX}
          height={PX}
          role="img"
          aria-label={`Papan ${SIZE}×${SIZE}: pion di kolom ${mission.start_x + 1} baris ${mission.start_y + 1}, bintang di kolom ${mission.target_x + 1} baris ${mission.target_y + 1}, ${mission.obstacles.length} rintangan.`}
        />
        <p className="cb-toast" role="status" style={{ background: `var(${toast ? TOAST[toast].bg : "--cream"})` }}>
          {toast ? TOAST[toast].text : running ? "Program berjalan…" : "Susun program, lalu tekan Jalankan Program."}
        </p>
      </div>

      <div className="cb-pick">
        <div className="cb-missions" role="group" aria-label="Pilih misi">
          {levels.map((m, k) => (
            <button key={m.id} type="button" className="cb-mission" aria-pressed={k === mi} aria-label={`Misi ${k + 1}: ${m.title}`} onClick={() => pickMission(k)}>
              {k + 1}
            </button>
          ))}
        </div>
        <div className="cb-brief">
          <span className="chip" style={{ background: `var(--${mission.color})` }}>
            {mission.edition_name}
          </span>
          <h2 className="card-title">
            Misi {mi + 1}: {mission.title}
          </h2>
          <p className="muted">{mission.hint}</p>
        </div>
      </div>

      <div className="cb-tools">
        <div className="cb-palette" role="group" aria-label="Perintah">
          {CMDS.map((c) => (
            <button key={c.k} type="button" className="cb-cmd" disabled={full} onClick={() => add(c.k)}>
              <span className="cb-tile" style={{ background: `var(${c.color})` }}>
                <TileIcon k={c.k} />
              </span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div ref={strip} className="cb-strip" role="group" aria-label="Program">
          {program.length === 0 && <span className="muted">Ketuk perintah di atas untuk menyusun program.</span>}
          {program.map((c, i) => (
            <button
              key={i}
              type="button"
              data-tile={i}
              className={"cb-tile cb-tile-sm" + (active === i ? " is-active" : "")}
              style={{ background: `var(${CMD[c].color})` }}
              aria-label={`Hapus ${CMD[c].label}`}
              onClick={() => remove(i)}
              onKeyDown={onTileKey(i)}
            >
              <TileIcon k={c} />
            </button>
          ))}
        </div>
        <p className="field-hint cb-hint">
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

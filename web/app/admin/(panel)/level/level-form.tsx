"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { TileIcon } from "@/components/coding-board";
import { TILE_COLOR } from "@/components/glyph";
import { MAX_TILES, SIZE, solve, type Cmd } from "@/lib/board";
import type { Edition, Level } from "@/lib/db/schema";

type Cell = [number, number];
type Piece = "start" | "target" | "obstacle";
type Draft = Pick<Level, "edition_id" | "title" | "hint" | "start_x" | "start_y" | "target_x" | "target_y" | "obstacles" | "published_at" | "on_site" | "sort_order">;

const PIECES: { k: Piece; label: string }[] = [
  { k: "start", label: "Mulai" },
  { k: "target", label: "Bintang" },
  { k: "obstacle", label: "Rintangan" },
];
const STEP: Record<Cmd, Cell> = { atas: [0, -1], bawah: [0, 1], kiri: [-1, 0], kanan: [1, 0] };
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/**
 * `level` is the level being edited (null for a new one); `template` prefills a new level (a copy).
 * `locked`: children already played it, so only the text fields, date and toggles can change.
 */
export function LevelForm({ level, template, editions, locked }: { level: Level | null; template: Draft; editions: Pick<Edition, "id" | "name" | "color">[]; locked: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [start, setStart] = useState<Cell>([template.start_x, template.start_y]);
  const [target, setTarget] = useState<Cell>([template.target_x, template.target_y]);
  const [obstacles, setObstacles] = useState<Cell[]>(template.obstacles);
  const [editionId, setEditionId] = useState(template.edition_id);
  const [tool, setTool] = useState<Piece>("obstacle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragging = useRef<{ piece: Piece; from: Cell | null } | null>(null);

  const color = editions.find((e) => e.id === editionId)?.color ?? "green";
  const isObstacle = (c: Cell) => obstacles.some((o) => same(o, c));
  const solution = solve({ start_x: start[0], start_y: start[1], target_x: target[0], target_y: target[1], obstacles });

  // Cells the shortest route walks through, numbered by the tile that enters them.
  const route = new Map<string, number>();
  if (solution) {
    let [x, y] = start;
    solution.forEach((cmd, i) => {
      x += STEP[cmd][0];
      y += STEP[cmd][1];
      route.set(`${x},${y}`, i + 1);
    });
  }

  // Puts a piece on a cell. `from` is where a dragged piece came from (null = a new obstacle or a click).
  function place(piece: Piece, cell: Cell, from: Cell | null) {
    if (locked) return;
    if (piece === "obstacle") {
      if (same(cell, start) || same(cell, target)) return;
      const rest = obstacles.filter((o) => !(from && same(o, from)));
      if (from) setObstacles(isObstacle(cell) ? obstacles : [...rest, cell]); // dropped on another obstacle: leave both
      else setObstacles(isObstacle(cell) ? rest.filter((o) => !same(o, cell)) : [...rest, cell]); // click toggles
      return;
    }
    if (same(cell, piece === "start" ? target : start)) return; // start and target can't share a cell
    setObstacles(obstacles.filter((o) => !same(o, cell))); // a piece placed on an obstacle replaces it
    if (piece === "start") setStart(cell);
    else setTarget(cell);
  }

  function pieceAt(cell: Cell): Piece | null {
    if (same(cell, start)) return "start";
    if (same(cell, target)) return "target";
    return isObstacle(cell) ? "obstacle" : null;
  }

  function onDragStart(event: React.DragEvent, piece: Piece, from: Cell | null) {
    event.dataTransfer.setData("text/plain", piece); // Firefox only starts a drag that carries data
    event.dataTransfer.effectAllowed = "move";
    dragging.current = { piece, from };
  }

  // An obstacle dragged off the board is removed.
  function onDragEnd(event: React.DragEvent) {
    const drag = dragging.current;
    dragging.current = null;
    if (drag?.piece === "obstacle" && drag.from && event.dataTransfer.dropEffect === "none" && !locked) {
      const from = drag.from;
      setObstacles((all) => all.filter((o) => !same(o, from)));
    }
  }

  async function send(method: string, url: string, body?: object) {
    setSaving(true);
    setError(null);
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body) }).catch(() => null);
    if (response?.ok) {
      if (!level) {
        // Next keeps this page's state; start the next new level from the template again.
        formRef.current?.reset();
        setStart([template.start_x, template.start_y]);
        setTarget([template.target_x, template.target_y]);
        setObstacles(template.obstacles);
        setEditionId(template.edition_id);
      }
      router.push("/admin/level");
      router.refresh();
    } else {
      const data = await response?.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan. Periksa koneksi internet, lalu coba lagi.");
    }
    setSaving(false);
  }

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      edition_id: editionId,
      title: form.get("title"),
      hint: form.get("hint"),
      start_x: start[0],
      start_y: start[1],
      target_x: target[0],
      target_y: target[1],
      obstacles,
      published_at: form.get("published_at") || null,
      on_site: form.get("on_site") === "on",
      sort_order: Number(form.get("sort_order")),
    };
    if (level) send("PUT", `/api/v1/levels/${level.id}`, body);
    else send("POST", "/api/v1/levels", body);
  }

  function onDelete() {
    if (level && confirm(`Hapus level "${level.title}"? Tindakan ini tidak bisa dibatalkan.`)) send("DELETE", `/api/v1/levels/${level.id}`);
  }

  const status = !solution
    ? "Bintang tidak bisa dicapai. Buka jalan dengan memindah rintangan."
    : solution.length > MAX_TILES
      ? `Jalan terpendek butuh ${solution.length} keping, lebih dari ${MAX_TILES} slot papan.`
      : `Jalan terpendek: ${solution.length} keping.`;
  const solvable = solution !== null && solution.length <= MAX_TILES;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="admin-form level-form">
      <div className="level-editor">
        <div>
          {locked ? (
            <p className="level-note">Level ini sudah dimainkan anak, jadi papannya terkunci. Salin level untuk membuat versi baru.</p>
          ) : (
            <div className="level-pieces" role="group" aria-label="Pilih yang mau diletakkan">
              {PIECES.map((p) => (
                <button
                  key={p.k}
                  type="button"
                  className="level-piece"
                  aria-pressed={tool === p.k}
                  draggable
                  onDragStart={(e) => onDragStart(e, p.k, null)}
                  onDragEnd={onDragEnd}
                  onClick={() => setTool(p.k)}
                >
                  <span className={`level-token is-${p.k}`} style={p.k === "start" ? { background: `var(--${color})` } : undefined} />
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="board-frame level-board" role="grid" aria-label={`Papan ${SIZE}×${SIZE}`} aria-disabled={locked}>
            {Array.from({ length: SIZE }, (_, y) => (
              <div key={y} role="row" className="level-row">
                {Array.from({ length: SIZE }, (_, x) => {
                  const cell: Cell = [x, y];
                  const piece = pieceAt(cell);
                  const step = route.get(`${x},${y}`);
                  const label = piece === "start" ? "mulai" : piece === "target" ? "bintang" : piece === "obstacle" ? "rintangan" : step ? `langkah ${step}` : "kosong";
                  return (
                    <button
                      key={x}
                      type="button"
                      role="gridcell"
                      className={"level-cell" + (step && piece !== "target" ? " is-route" : "")}
                      aria-label={`Kolom ${x + 1}, baris ${y + 1}: ${label}`}
                      disabled={locked}
                      draggable={!locked && piece !== null}
                      onDragStart={(e) => piece && onDragStart(e, piece, cell)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragging.current) place(dragging.current.piece, cell, dragging.current.from);
                      }}
                      onClick={() => place(tool, cell, null)}
                    >
                      {piece ? (
                        <span className={`level-token is-${piece}`} style={piece === "start" ? { background: `var(--${color})` } : undefined} />
                      ) : (
                        step && <span className="level-step">{step}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {!locked && <p className="field-hint">Seret Mulai, Bintang, atau Rintangan ke papan, atau pilih lalu ketuk kotaknya. Ketuk rintangan atau seret keluar papan untuk menghapusnya.</p>}
        </div>

        <div className="level-solution" role="status">
          <p className={solvable ? "level-ok" : "form-error"}>{status}</p>
          {solvable && (
            <div className="cb-strip" aria-label="Jalan terpendek">
              {solution.map((cmd, i) => (
                <span key={i} className="cb-tile cb-tile-sm" style={{ background: `var(${TILE_COLOR[cmd]})` }}>
                  <TileIcon k={cmd} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <label className="field">
        Edisi
        <select value={editionId} onChange={(e) => setEditionId(Number(e.target.value))}>
          {editions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Judul
        <input name="title" defaultValue={template.title} maxLength={80} required />
      </label>
      <label className="field">
        Petunjuk
        <textarea name="hint" defaultValue={template.hint} rows={2} maxLength={200} required />
      </label>
      <label className="field">
        Tanggal terbit
        <input name="published_at" type="date" defaultValue={template.published_at ?? ""} />
        <span className="field-hint">Kosongkan untuk draf. Guru melihat level mulai tanggal ini.</span>
      </label>
      <label className="check">
        <input name="on_site" type="checkbox" defaultChecked={template.on_site} />
        Tampilkan di papan koding situs
      </label>
      <label className="field">
        Urutan
        <input name="sort_order" type="number" step={1} defaultValue={template.sort_order} required />
        <span className="field-hint">Angka kecil tampil lebih dulu.</span>
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !solvable}>
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        {level && (
          <Link href={`/admin/level/baru?salin=${level.id}`} className="btn">
            Salin level
          </Link>
        )}
        {level && !locked && (
          <button type="button" className="btn" onClick={onDelete} disabled={saving}>
            Hapus level
          </button>
        )}
      </div>
    </form>
  );
}

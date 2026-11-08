// Checks a level sent to the admin API (POST/PUT /api/v1/levels) and works out its shortest
// solution, so the server, not the browser, decides `optimal_tiles` and `solution`.
import { MAX_TILES, SIZE, solve, type Layout } from "./board";
import type { Level } from "./db/schema";

export type LevelInput = Omit<Level, "id" | "created_at" | "updated_at">;

type Result = { data: LevelInput; error: null } | { data: null; error: string };

const isCell = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < SIZE;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() !== "" && value.trim().length <= maxLength ? value.trim() : null;
}

// "YYYY-MM-DD" that is a real calendar day (rejects 2026-02-30).
function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = new Date(value + "T00:00:00Z");
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

export function parseLevel(body: unknown): Result {
  if (typeof body !== "object" || body === null) return { data: null, error: "Data level tidak valid." };
  const b = body as Record<string, unknown>;

  const edition_id = b.edition_id;
  if (typeof edition_id !== "number" || !Number.isInteger(edition_id) || edition_id <= 0) return { data: null, error: "Pilih edisinya." };

  const title = text(b.title, 80);
  if (!title) return { data: null, error: "Judul wajib diisi (maks. 80 karakter)." };
  const hint = text(b.hint, 200);
  if (!hint) return { data: null, error: "Petunjuk wajib diisi (maks. 200 karakter)." };

  const { start_x, start_y, target_x, target_y } = b;
  if (!isCell(start_x) || !isCell(start_y) || !isCell(target_x) || !isCell(target_y))
    return { data: null, error: "Mulai dan bintang harus ada di papan 6×6." };
  if (start_x === target_x && start_y === target_y) return { data: null, error: "Mulai dan bintang tidak boleh di kotak yang sama." };

  if (!Array.isArray(b.obstacles) || !b.obstacles.every((o) => Array.isArray(o) && o.length === 2 && isCell(o[0]) && isCell(o[1])))
    return { data: null, error: "Rintangan harus ada di papan 6×6." };
  const obstacles = b.obstacles as [number, number][];
  const keys = obstacles.map(([x, y]) => `${x},${y}`);
  if (new Set(keys).size !== keys.length) return { data: null, error: "Ada rintangan ganda di kotak yang sama." };
  if (keys.includes(`${start_x},${start_y}`) || keys.includes(`${target_x},${target_y}`))
    return { data: null, error: "Mulai dan bintang tidak boleh di atas rintangan." };

  const layout: Layout = { start_x, start_y, target_x, target_y, obstacles };
  const solution = solve(layout);
  if (!solution) return { data: null, error: "Bintang tidak bisa dicapai. Buka jalan dengan memindah rintangan." };
  if (solution.length > MAX_TILES)
    return { data: null, error: `Jalan terpendek butuh ${solution.length} keping, lebih dari ${MAX_TILES} slot papan.` };

  const published_at = b.published_at ?? null;
  if (published_at !== null && !isDate(published_at)) return { data: null, error: "Tanggal terbit tidak valid." };

  if (typeof b.on_site !== "boolean") return { data: null, error: "Pilih tampil di situs atau tidak." };

  const sort = b.sort_order;
  if (typeof sort !== "number" || !Number.isInteger(sort) || Math.abs(sort) > 1000) return { data: null, error: "Urutan harus angka bulat." };

  return {
    data: { edition_id, title, hint, ...layout, optimal_tiles: solution.length, solution, published_at, on_site: b.on_site, sort_order: sort },
    error: null,
  };
}

/** True if both levels have the same start, target and obstacles (in any order). */
export function sameLayout(a: Layout, b: Layout) {
  const cells = (m: Layout) =>
    m.obstacles
      .map(([x, y]) => `${x},${y}`)
      .sort()
      .join(" ");
  return a.start_x === b.start_x && a.start_y === b.start_y && a.target_x === b.target_x && a.target_y === b.target_y && cells(a) === cells(b);
}

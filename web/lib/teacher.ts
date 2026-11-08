// Input checks and grading for the teacher API (classrooms, students, assignments, attempts).
import { MAX_TILES, run, type Cmd, type Layout } from "./board";

const CMDS: Cmd[] = ["atas", "bawah", "kiri", "kanan"];

/** A positive whole number from a URL segment or JSON field, or null. */
export function parseId(value: unknown) {
  const id = typeof value === "string" ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}

/** A trimmed, non-empty name of at most `maxLength` characters, or null. */
export function parseName(body: unknown, maxLength: number) {
  const name = (body as { name?: unknown } | null)?.name;
  return typeof name === "string" && name.trim() !== "" && name.trim().length <= maxLength ? name.trim() : null;
}

/** 1–18 direction tiles, or null. */
export function parseProgram(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TILES) return null;
  return value.every((cmd) => CMDS.includes(cmd)) ? (value as Cmd[]) : null;
}

/**
 * The server's verdict on a child's program. Optimal = solved with as few tiles as the shortest
 * route, so any shortest route counts, not only the one solve() picked.
 */
export function grade(level: Layout & { optimal_tiles: number }, program: Cmd[]) {
  const result = run(level, program);
  return {
    outcome: result.outcome,
    tiles_used: program.length,
    optimal_tiles: level.optimal_tiles,
    is_optimal: result.outcome === "success" && program.length === level.optimal_tiles,
    result, // the steps, so the app can replay the run
  };
}

/** The calendar day in Indonesia (WIB) as "YYYY-MM-DD"; levels are published from that day. */
export function dateInIndonesia(when: Date) {
  return when.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // en-CA formats as YYYY-MM-DD
}

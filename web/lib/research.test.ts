import { expect, test } from "bun:test";
import { attemptsCsv, progress, type ExportRow } from "./research";

let nextId = 1;
const at = (student_id: number, level_id: number, outcome: string, tiles_used: number, optimal_tiles: number, iso: string) => ({
  id: nextId++,
  student_id,
  level_id,
  outcome,
  tiles_used,
  optimal_tiles,
  created_at: new Date(iso),
});

const students = [
  { id: 1, name: "Ani" },
  { id: 2, name: "Budi" },
  { id: 3, name: "Citra" }, // no attempts yet
];
const attempts = [
  // Ani, level 10: fails, then solves in 6 (optimal 4), on day 1; level 11 optimal on day 2.
  at(1, 10, "collision", 3, 4, "2026-11-02T02:00:00Z"),
  at(1, 10, "success", 6, 4, "2026-11-02T02:05:00Z"),
  at(1, 11, "success", 5, 5, "2026-11-03T02:00:00Z"),
  // Budi, level 10: optimal at once on day 1.
  at(2, 10, "success", 4, 4, "2026-11-02T03:00:00Z"),
];

test("per-student summaries, first vs latest", () => {
  const p = progress(students, attempts);
  const ani = p.students[0];
  expect(ani.overall).toEqual({ attempts: 3, solved_rate: 2 / 3, efficiency: (4 / 6 + 1) / 2 });
  expect(ani.first).toEqual({ attempts: 2, solved_rate: 0.5, efficiency: 1 }); // level 10 collision, level 11 optimal
  expect(ani.latest).toEqual({ attempts: 2, solved_rate: 1, efficiency: (4 / 6 + 1) / 2 });
  expect(ani.by_day.map((d) => d.date)).toEqual(["2026-11-02", "2026-11-03"]);
  expect(p.students[2].overall).toEqual({ attempts: 0, solved_rate: null, efficiency: null });
});

test("class is the average of its students, skipping students without attempts", () => {
  const p = progress(students, attempts);
  expect(p.class.overall.attempts).toBe(4);
  expect(p.class.overall.solved_rate).toBeCloseTo((2 / 3 + 1) / 2);
  expect(p.class.first.solved_rate).toBeCloseTo((0.5 + 1) / 2);
  expect(p.class.by_day).toEqual([
    { date: "2026-11-02", attempts: 3, solved_rate: (0.5 + 1) / 2, efficiency: (4 / 6 + 1) / 2 },
    { date: "2026-11-03", attempts: 1, solved_rate: 1, efficiency: 1 },
  ]);
});

test("empty classroom", () => {
  expect(progress([], []).class.overall).toEqual({ attempts: 0, solved_rate: null, efficiency: null });
});

test("CSV: header, attempt numbers, efficiency, escaping", () => {
  const rows: ExportRow[] = attempts.map((a) => ({
    ...a,
    classroom: 'TK "Melati", B',
    student: a.student_id === 1 ? "=HYPERLINK()" : "Budi",
    level: "Awas karang!",
    program: ["atas", "kanan"],
    is_optimal: a.outcome === "success" && a.tiles_used === a.optimal_tiles,
  }));
  const lines = attemptsCsv(rows.reverse()).trimEnd().split("\r\n");
  expect(lines[0]).toBe("classroom,student,level,attempt_no,date,program,tiles_used,optimal_tiles,outcome,is_optimal,efficiency");
  expect(lines[1]).toBe(`"TK ""Melati"", B","'=HYPERLINK()","Awas karang!",1,2026-11-02 09:00,"atas kanan",3,4,collision,false,`);
  expect(lines[2]).toContain(",2,2026-11-02 09:05,");
  expect(lines[2].endsWith(",success,false,0.667")).toBe(true);
  expect(lines[3]).toContain('"Budi","Awas karang!",1,');
  expect(lines).toHaveLength(5);
});

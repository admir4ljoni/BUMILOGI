import { expect, test } from "bun:test";
import { MAX_TILES, MISSIONS, run, tileCount, type Block, type Mission } from "./board";

const open: Mission = { title: "", hint: "", edition: "rimba", start: { x: 0, y: 0, dir: 1 }, target: { x: 5, y: 5 }, obstacles: [[2, 0]] };

test("each arrow moves one cell its own way and faces where it went", () => {
  const r = run(open, ["kanan", "bawah", "kanan", "bawah", "kiri"]);
  expect(r.outcome).toBe("incomplete");
  expect(r.steps.map((s) => s.pose)).toEqual([
    { x: 1, y: 0, dir: 1 },
    { x: 1, y: 1, dir: 2 },
    { x: 2, y: 1, dir: 1 },
    { x: 2, y: 2, dir: 2 },
    { x: 1, y: 2, dir: 3 },
  ]);
});

test("collides with obstacles and the board edge, naming the tile", () => {
  const hit = run(open, ["kanan", "kanan", "bawah"]);
  expect(hit).toEqual({ outcome: "collision", steps: [{ pose: { x: 1, y: 0, dir: 1 }, at: { i: 0 } }], at: { i: 1 } });
  expect(run(open, ["kiri"]).outcome).toBe("collision");
  expect(run(open, ["atas"]).outcome).toBe("collision");
});

test("loops expand with body indexes", () => {
  const r = run(open, ["bawah", { times: 3, body: ["kanan"] }]);
  expect(r.steps.map((s) => s.at)).toEqual([{ i: 0 }, { i: 1, j: 0 }, { i: 1, j: 0 }, { i: 1, j: 0 }]);
  expect(r.steps.at(-1)!.pose).toEqual({ x: 3, y: 1, dir: 1 });
});

test("stops at the target", () => {
  const r = run({ ...open, target: { x: 0, y: 2 } }, ["bawah", "bawah", "bawah"]);
  expect(r.outcome).toBe("success");
  expect(r.steps).toHaveLength(2);
});

// One known solution per mission, so a typo in mission data can't ship an unsolvable level.
const SOLUTIONS: Block[][] = [
  ["kanan", "kanan", "kanan"],
  ["atas", "atas", "atas", "atas"],
  ["atas", "atas", "atas", "kanan", "kanan", "kanan"],
  ["kanan", "atas", "kanan", "kanan", "kanan", "bawah", "kanan"],
  [{ times: 3, body: ["atas", "kanan"] }],
  [{ times: 5, body: ["kanan", "bawah"] }],
];

test("every mission is solvable within the tile limit", () => {
  expect(SOLUTIONS).toHaveLength(MISSIONS.length);
  MISSIONS.forEach((m, k) => {
    expect(tileCount(SOLUTIONS[k])).toBeLessThanOrEqual(MAX_TILES);
    expect([k, run(m, SOLUTIONS[k]).outcome]).toEqual([k, "success"]);
    expect(m.obstacles.some(([x, y]) => (x === m.target.x && y === m.target.y) || (x === m.start.x && y === m.start.y))).toBe(false);
  });
});

// Fewest tiles needed without Ulangi, by breadth-first search over cells.
// A child who hasn't discovered loops yet must still be able to finish every mission.
function shortestWithoutLoops(m: Mission): number {
  const seen = new Set<string>();
  let frontier: Block[][] = [[]];
  for (let len = 1; len <= 30; len++) {
    const next: Block[][] = [];
    for (const prog of frontier)
      for (const c of ["atas", "bawah", "kiri", "kanan"] as const) {
        const p = [...prog, c];
        const r = run(m, p);
        if (r.outcome === "success") return len;
        if (r.outcome === "collision") continue;
        const end = r.steps.at(-1)!.pose;
        const k = `${end.x},${end.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(p);
      }
    frontier = next;
  }
  return Infinity;
}

test("every mission fits the tile limit even without loops", () => {
  const need = MISSIONS.map(shortestWithoutLoops);
  expect(need).toEqual([3, 4, 6, 7, 6, 10]);
  need.forEach((n, k) => expect([k, n <= MAX_TILES]).toEqual([k, true]));
});

import { expect, test } from "bun:test";
import { MAX_TILES, MISSIONS, run, tileCount, type Block, type Mission } from "./board";

const open: Mission = { title: "", hint: "", edition: "rimba", start: { x: 0, y: 0, dir: 1 }, target: { x: 5, y: 5 }, obstacles: [[2, 0]] };

test("moves, turns and reports incomplete", () => {
  const r = run(open, ["maju", "kanan", "maju", "mundur"]);
  expect(r.outcome).toBe("incomplete");
  expect(r.steps.map((s) => s.pose)).toEqual([
    { x: 1, y: 0, dir: 1 },
    { x: 1, y: 0, dir: 2 },
    { x: 1, y: 1, dir: 2 },
    { x: 1, y: 0, dir: 2 },
  ]);
});

test("collides with obstacles and the board edge, naming the tile", () => {
  const hit = run(open, ["maju", "maju", "kanan"]);
  expect(hit).toEqual({ outcome: "collision", steps: [{ pose: { x: 1, y: 0, dir: 1 }, at: { i: 0 } }], at: { i: 1 } });
  expect(run(open, ["kiri", "maju"]).outcome).toBe("collision");
  expect(run(open, ["mundur"]).outcome).toBe("collision");
});

test("loops expand with body indexes", () => {
  const r = run(open, ["kanan", { times: 3, body: ["maju"] }]);
  expect(r.steps.map((s) => s.at)).toEqual([{ i: 0 }, { i: 1, j: 0 }, { i: 1, j: 0 }, { i: 1, j: 0 }]);
  expect(r.steps.at(-1)!.pose).toEqual({ x: 0, y: 3, dir: 2 });
});

test("stops at the target", () => {
  const r = run({ ...open, obstacles: [], target: { x: 2, y: 0 } }, ["maju", "maju", "maju"]);
  expect(r.outcome).toBe("success");
  expect(r.steps).toHaveLength(2);
});

// One known solution per mission, so a typo in mission data can't ship an unsolvable level.
const SOLUTIONS: Block[][] = [
  ["maju", "maju", "maju"],
  ["mundur", "mundur", "mundur"],
  ["maju", "maju", "maju", "kanan", "maju", "maju", "maju"],
  ["kiri", "maju", "kanan", "maju", "maju", "maju", "maju", "kanan", "maju", "kiri", "maju"],
  [{ times: 3, body: ["maju", "kanan", "maju", "kiri"] }],
  [{ times: 5, body: ["maju", "kanan", "maju", "kiri"] }],
];

test("every mission is solvable within the tile limit", () => {
  expect(SOLUTIONS).toHaveLength(MISSIONS.length);
  MISSIONS.forEach((m, k) => {
    expect(tileCount(SOLUTIONS[k])).toBeLessThanOrEqual(MAX_TILES);
    expect([k, run(m, SOLUTIONS[k]).outcome]).toEqual([k, "success"]);
    expect(m.obstacles.some(([x, y]) => (x === m.target.x && y === m.target.y) || (x === m.start.x && y === m.start.y))).toBe(false);
  });
});

// Fewest tiles needed without Ulangi, by breadth-first search over (x, y, dir).
// A child who hasn't discovered loops yet must still be able to finish every mission.
function shortestWithoutLoops(m: Mission): number {
  const seen = new Set<string>();
  let frontier: Block[][] = [[]];
  for (let len = 1; len <= 30; len++) {
    const next: Block[][] = [];
    for (const prog of frontier)
      for (const c of ["maju", "mundur", "kiri", "kanan"] as const) {
        const p = [...prog, c];
        const r = run(m, p);
        if (r.outcome === "success") return len;
        if (r.outcome === "collision") continue;
        const end = r.steps.at(-1)!.pose;
        const k = `${end.x},${end.y},${end.dir}`;
        if (!seen.has(k)) seen.add(k), next.push(p);
      }
    frontier = next;
  }
  return Infinity;
}

test("every mission fits the tile limit even without loops", () => {
  const need = MISSIONS.map(shortestWithoutLoops);
  need.forEach((n, k) => expect([k, n <= MAX_TILES]).toEqual([k, true]));
});

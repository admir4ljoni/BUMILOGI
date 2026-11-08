import { expect, test } from "bun:test";
import { run, solve, type Layout } from "./board";

const open: Layout = { start_x: 0, start_y: 0, target_x: 5, target_y: 5, obstacles: [[2, 0]] };

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
  expect(hit).toEqual({ outcome: "collision", steps: [{ pose: { x: 1, y: 0, dir: 1 }, at: 0 }], at: 1 });
  expect(run(open, ["kiri"]).outcome).toBe("collision");
  expect(run(open, ["atas"]).outcome).toBe("collision");
});

test("stops at the target", () => {
  const r = run({ ...open, target_x: 0, target_y: 2 }, ["bawah", "bawah", "bawah"]);
  expect(r.outcome).toBe("success");
  expect(r.steps).toHaveLength(2);
});

test("solve finds a shortest route around obstacles", () => {
  const path = solve(open)!;
  expect(path).toHaveLength(10);
  expect(run(open, path).outcome).toBe("success");
});

test("solve returns null when the target is walled off", () => {
  const walled = { ...open, obstacles: [[4, 5], [5, 4]] as [number, number][] };
  expect(solve(walled)).toBeNull();
});

test("a longer route still succeeds but isn't the shortest", () => {
  const detour = run(open, ["bawah", "bawah", "bawah", "bawah", "bawah", "kanan", "kanan", "kanan", "kanan", "atas", "bawah", "kanan"]);
  expect(detour.outcome).toBe("success");
  expect(detour.steps.length).toBeGreaterThan(solve(open)!.length);
});

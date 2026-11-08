import { expect, test } from "bun:test";
import { parseLevel, sameLayout } from "./levels";

const valid = {
  edition_id: 1,
  title: " Lewat tikungan ",
  hint: "Naik dulu, lalu ke kanan.",
  start_x: 1,
  start_y: 4,
  target_x: 4,
  target_y: 1,
  obstacles: [
    [2, 4],
    [2, 3],
  ],
  published_at: null,
  on_site: true,
  sort_order: 0,
};

test("accepts a valid level and works out its shortest solution", () => {
  const { data, error } = parseLevel(valid);
  expect(error).toBeNull();
  expect(data?.title).toBe("Lewat tikungan");
  expect(data?.optimal_tiles).toBe(6);
  expect(data?.solution).toHaveLength(6);
  expect(parseLevel({ ...valid, published_at: "2026-11-09" }).data?.published_at).toBe("2026-11-09");
});

test("ignores optimal_tiles and solution sent by the browser", () => {
  const { data } = parseLevel({ ...valid, optimal_tiles: 1, solution: ["kanan"] });
  expect(data?.optimal_tiles).toBe(6);
});

test("rejects unreachable targets and routes longer than 18 tiles", () => {
  // Target in the corner, walled in.
  const walled = { ...valid, start_x: 0, start_y: 0, target_x: 5, target_y: 5, obstacles: [[4, 5], [5, 4]] };
  expect(parseLevel(walled).error).toContain("tidak bisa dicapai");

  // A snake: column 1 open only at the bottom, column 3 only at the top. Shortest route is 20 tiles.
  const snake = {
    ...valid,
    start_x: 0,
    start_y: 0,
    target_x: 5,
    target_y: 5,
    obstacles: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
  };
  expect(parseLevel(snake).error).toContain("butuh 20 keping");
});

test("rejects bad input", () => {
  expect(parseLevel(null).error).not.toBeNull();
  expect(parseLevel({ ...valid, edition_id: "1" }).error).not.toBeNull();
  expect(parseLevel({ ...valid, title: "  " }).error).not.toBeNull();
  expect(parseLevel({ ...valid, start_x: 6 }).error).not.toBeNull();
  expect(parseLevel({ ...valid, start_y: -1 }).error).not.toBeNull();
  expect(parseLevel({ ...valid, target_x: 1.5 }).error).not.toBeNull();
  expect(parseLevel({ ...valid, target_x: 1, target_y: 4 }).error).toContain("sama");
  expect(parseLevel({ ...valid, obstacles: [[1, 4]] }).error).toContain("rintangan");
  expect(parseLevel({ ...valid, obstacles: [[3, 3], [3, 3]] }).error).toContain("ganda");
  expect(parseLevel({ ...valid, obstacles: [[3, 9]] }).error).not.toBeNull();
  expect(parseLevel({ ...valid, obstacles: "[]" }).error).not.toBeNull();
  expect(parseLevel({ ...valid, published_at: "2026-02-30" }).error).not.toBeNull();
  expect(parseLevel({ ...valid, published_at: "besok" }).error).not.toBeNull();
  expect(parseLevel({ ...valid, on_site: "true" }).error).not.toBeNull();
  expect(parseLevel({ ...valid, sort_order: 1.5 }).error).not.toBeNull();
});

test("sameLayout ignores obstacle order", () => {
  const a = { start_x: 0, start_y: 0, target_x: 5, target_y: 5, obstacles: [[1, 1], [2, 2]] as [number, number][] };
  expect(sameLayout(a, { ...a, obstacles: [[2, 2], [1, 1]] })).toBe(true);
  expect(sameLayout(a, { ...a, obstacles: [[1, 1]] })).toBe(false);
  expect(sameLayout(a, { ...a, target_x: 4 })).toBe(false);
});

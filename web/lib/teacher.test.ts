import { expect, test } from "bun:test";
import { dateInIndonesia, grade, parseId, parseName, parseProgram } from "./teacher";

// Start bottom-left, star top-right of a 3×3 corner, one obstacle: shortest route is 4 tiles.
const level = { start_x: 0, start_y: 2, target_x: 2, target_y: 0, obstacles: [[1, 1]] as [number, number][], optimal_tiles: 4 };

test("grading: any shortest route is optimal", () => {
  expect(grade(level, ["atas", "atas", "kanan", "kanan"])).toMatchObject({ outcome: "success", tiles_used: 4, optimal_tiles: 4, is_optimal: true });
  expect(grade(level, ["kanan", "kanan", "atas", "atas"]).is_optimal).toBe(true);
});

test("grading: a longer route is solved but not optimal", () => {
  const g = grade(level, ["kanan", "kanan", "kanan", "atas", "atas", "kiri"]);
  expect(g).toMatchObject({ outcome: "success", tiles_used: 6, is_optimal: false });
});

test("grading: going past the star is not solved", () => {
  const g = grade(level, ["atas", "atas", "kanan", "kanan", "bawah"]);
  expect(g).toMatchObject({ outcome: "incomplete", tiles_used: 5, is_optimal: false });
});

test("grading: collision and incomplete", () => {
  expect(grade(level, ["atas", "kanan"])).toMatchObject({ outcome: "collision", is_optimal: false });
  expect(grade(level, ["atas"])).toMatchObject({ outcome: "incomplete", is_optimal: false });
});

test("parseProgram accepts 1–18 direction tiles only", () => {
  expect(parseProgram(["atas", "kanan"])).toEqual(["atas", "kanan"]);
  expect(parseProgram(Array(18).fill("atas"))).not.toBeNull();
  expect(parseProgram(Array(19).fill("atas"))).toBeNull();
  expect(parseProgram([])).toBeNull();
  expect(parseProgram(["ulangi"])).toBeNull();
  expect(parseProgram("atas")).toBeNull();
  expect(parseProgram(["toString"])).toBeNull();
});

test("parseId and parseName", () => {
  expect(parseId("12")).toBe(12);
  expect(parseId(12)).toBe(12);
  for (const bad of ["0", "-1", "1.5", "abc", "", null, "99999999999"]) expect(parseId(bad)).toBeNull();
  expect(parseName({ name: "  Ani " }, 40)).toBe("Ani");
  expect(parseName({ name: " " }, 40)).toBeNull();
  expect(parseName({ name: "x".repeat(41) }, 40)).toBeNull();
  expect(parseName(null, 40)).toBeNull();
});

test("dates are Indonesian (UTC+7) days", () => {
  expect(dateInIndonesia(new Date("2026-11-08T16:59:00Z"))).toBe("2026-11-08");
  expect(dateInIndonesia(new Date("2026-11-08T17:00:00Z"))).toBe("2026-11-09");
});

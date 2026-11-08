// Virtual board engine: pure, no DOM. The canvas only animates the steps it returns.
// Same rules as the physical toy (PLAN.md "The board rules"): four arrow tiles, no loop tile.
// Each arrow tile moves the pawn one cell in its own direction; there is no turning.
// `dir` only records which way the pawn last moved, so it can face that way on screen.

export type Cmd = "atas" | "bawah" | "kiri" | "kanan";
export type Dir = 0 | 1 | 2 | 3; // up, right, down, left (y grows downward)
export type Pose = { x: number; y: number; dir: Dir };
/** `at` is the index of the tile that made the move. */
export type Step = { pose: Pose; at: number };
export type Result =
  | { outcome: "success" | "incomplete"; steps: Step[] }
  | { outcome: "collision"; steps: Step[]; at: number };

/** A level's layout, in the same shape as the `levels` table columns. */
export type Layout = {
  start_x: number;
  start_y: number;
  target_x: number;
  target_y: number;
  obstacles: [number, number][];
};

export const SIZE = 6; // the physical board is 6×6
export const MAX_TILES = 18; // the physical board's instruction row has 18 slots

const CMDS: Cmd[] = ["atas", "bawah", "kiri", "kanan"];
const DIR: Record<Cmd, Dir> = { atas: 0, kanan: 1, bawah: 2, kiri: 3 };
const DELTA: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function blocked(m: Layout, x: number, y: number) {
  return x < 0 || y < 0 || x >= SIZE || y >= SIZE || m.obstacles.some(([ox, oy]) => ox === x && oy === y);
}

/** Where the pawn stands before the first tile: on the start cell, facing up. */
export function startPose(m: Layout): Pose {
  return { x: m.start_x, y: m.start_y, dir: 0 };
}

/**
 * Runs every tile; stops early only at a collision. Like the physical toy, the pawn must end
 * exactly on the target: passing over it and moving on is not a success.
 */
export function run(m: Layout, program: Cmd[]): Result {
  let pose = startPose(m);
  const steps: Step[] = [];
  for (const [at, cmd] of program.entries()) {
    const dir = DIR[cmd];
    const x = pose.x + DELTA[dir][0];
    const y = pose.y + DELTA[dir][1];
    if (blocked(m, x, y)) return { outcome: "collision", steps, at };
    pose = { x, y, dir };
    steps.push({ pose, at });
  }
  const onTarget = pose.x === m.target_x && pose.y === m.target_y;
  return { outcome: onTarget ? "success" : "incomplete", steps };
}

/**
 * One shortest program from start to target, or null if the target can't be reached.
 * Without loops the fewest tiles is the shortest path, so a breadth-first search over
 * the cells finds it: cells are visited in order of distance from the start.
 */
export function solve(m: Layout): Cmd[] | null {
  const seen = new Set([`${m.start_x},${m.start_y}`]);
  const queue = [{ x: m.start_x, y: m.start_y, path: [] as Cmd[] }];
  for (let i = 0; i < queue.length; i++) {
    const { x, y, path } = queue[i];
    if (x === m.target_x && y === m.target_y) return path;
    for (const cmd of CMDS) {
      const nx = x + DELTA[DIR[cmd]][0];
      const ny = y + DELTA[DIR[cmd]][1];
      if (blocked(m, nx, ny) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push({ x: nx, y: ny, path: [...path, cmd] });
    }
  }
  return null;
}

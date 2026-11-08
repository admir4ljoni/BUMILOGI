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

export type Mission = {
  title: string;
  hint: string;
  edition: "rimba" | "samudra";
  start: Pose;
  target: { x: number; y: number };
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

function blocked(m: Mission, x: number, y: number) {
  return x < 0 || y < 0 || x >= SIZE || y >= SIZE || m.obstacles.some(([ox, oy]) => ox === x && oy === y);
}

/** Runs the program; stops at the first collision or as soon as the pawn reaches the target. */
export function run(m: Mission, program: Cmd[]): Result {
  let pose = m.start;
  const steps: Step[] = [];
  for (const [at, cmd] of program.entries()) {
    const dir = DIR[cmd];
    const x = pose.x + DELTA[dir][0];
    const y = pose.y + DELTA[dir][1];
    if (blocked(m, x, y)) return { outcome: "collision", steps, at };
    pose = { x, y, dir };
    steps.push({ pose, at });
    if (x === m.target.x && y === m.target.y) return { outcome: "success", steps };
  }
  return { outcome: "incomplete", steps };
}

/**
 * One shortest program from start to target, or null if the target can't be reached.
 * Without loops the fewest tiles is the shortest path, so a breadth-first search over
 * the cells finds it: cells are visited in order of distance from the start.
 */
export function solve(m: Mission): Cmd[] | null {
  const seen = new Set([`${m.start.x},${m.start.y}`]);
  const queue = [{ x: m.start.x, y: m.start.y, path: [] as Cmd[] }];
  for (let i = 0; i < queue.length; i++) {
    const { x, y, path } = queue[i];
    if (x === m.target.x && y === m.target.y) return path;
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

// ponytail: missions are hardcoded; move to a JSON file if non-developers need to edit them.
export const MISSIONS: Mission[] = [
  {
    title: "Ke kanan menuju bintang",
    hint: "Tekan Kanan sampai badak tiba di bintang.",
    edition: "rimba",
    start: { x: 1, y: 3, dir: 1 },
    target: { x: 4, y: 3 },
    obstacles: [],
  },
  {
    title: "Naik ke atas",
    hint: "Bintangnya ada di atas ikan badut. Coba tekan Atas!",
    edition: "samudra",
    start: { x: 2, y: 5, dir: 0 },
    target: { x: 2, y: 1 },
    obstacles: [],
  },
  {
    title: "Lewat tikungan",
    hint: "Naik dulu, lalu ke kanan.",
    edition: "rimba",
    start: { x: 1, y: 4, dir: 0 },
    target: { x: 4, y: 1 },
    obstacles: [[2, 4], [2, 3], [2, 2]],
  },
  {
    title: "Awas karang!",
    hint: "Ada karang di jalan. Cari jalan memutar.",
    edition: "samudra",
    start: { x: 0, y: 3, dir: 1 },
    target: { x: 5, y: 3 },
    obstacles: [[2, 3], [3, 3]],
  },
  {
    title: "Naik tangga",
    hint: "Seperti naik tangga: Atas, lalu Kanan, begitu terus.",
    edition: "rimba",
    start: { x: 0, y: 5, dir: 0 },
    target: { x: 3, y: 2 },
    obstacles: [[0, 3], [1, 2], [2, 1]],
  },
  {
    title: "Menyelam ke dasar",
    hint: "Jalan zig-zag sampai pojok bawah. Hitung langkahnya!",
    edition: "samudra",
    start: { x: 0, y: 0, dir: 1 },
    target: { x: 5, y: 5 },
    obstacles: [[3, 0], [5, 1], [0, 2], [0, 5], [2, 5], [5, 3]],
  },
];

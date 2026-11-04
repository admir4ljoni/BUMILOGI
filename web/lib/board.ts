// Virtual board engine: pure, no DOM. The canvas only animates the steps it returns.
// Rules are frozen (PLAN.md risk 9): one loop level, fixed repeat count.

export type Cmd = "maju" | "mundur" | "kiri" | "kanan";
export type Loop = { times: number; body: Cmd[] };
export type Block = Cmd | Loop;
export type Dir = 0 | 1 | 2 | 3; // up, right, down, left (y grows downward)
export type Pose = { x: number; y: number; dir: Dir };
/** Which tile is executing: top-level index, plus index inside a loop body. */
export type At = { i: number; j?: number };
export type Step = { pose: Pose; at: At };
export type Result =
  | { outcome: "success" | "incomplete"; steps: Step[] }
  | { outcome: "collision"; steps: Step[]; at: At };

export type Mission = {
  title: string;
  hint: string;
  edition: "rimba" | "samudra";
  start: Pose;
  target: { x: number; y: number };
  obstacles: [number, number][];
};

export const SIZE = 6; // the physical board is 6×6
export const MAX_TILES = 12;
export const LOOP_TIMES = [2, 3, 4, 5];

const DELTA: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const tileCount = (program: Block[]) =>
  program.reduce((n, b) => n + (typeof b === "string" ? 1 : 1 + b.body.length), 0);

/** Runs the program; stops at the first collision or as soon as the pawn reaches the target. */
export function run(m: Mission, program: Block[]): Result {
  const flat: [Cmd, At][] = program.flatMap((b, i): [Cmd, At][] =>
    typeof b === "string"
      ? [[b, { i }]]
      : Array.from({ length: b.times }, () => b.body.map((c, j): [Cmd, At] => [c, { i, j }])).flat(),
  );

  let pose = m.start;
  const steps: Step[] = [];
  for (const [cmd, at] of flat) {
    if (cmd === "kiri" || cmd === "kanan") {
      pose = { ...pose, dir: ((pose.dir + (cmd === "kanan" ? 1 : 3)) % 4) as Dir };
      steps.push({ pose, at });
      continue;
    }
    const s = cmd === "maju" ? 1 : -1;
    const x = pose.x + DELTA[pose.dir][0] * s;
    const y = pose.y + DELTA[pose.dir][1] * s;
    const blocked = x < 0 || y < 0 || x >= SIZE || y >= SIZE || m.obstacles.some(([ox, oy]) => ox === x && oy === y);
    if (blocked) return { outcome: "collision", steps, at };
    pose = { ...pose, x, y };
    steps.push({ pose, at });
    if (x === m.target.x && y === m.target.y) return { outcome: "success", steps };
  }
  return { outcome: "incomplete", steps };
}

// ponytail: missions are hardcoded; move to a JSON file if non-developers need to edit them.
export const MISSIONS: Mission[] = [
  {
    title: "Maju ke bintang",
    hint: "Tekan Maju sampai badak tiba di bintang.",
    edition: "rimba",
    start: { x: 1, y: 3, dir: 1 },
    target: { x: 4, y: 3 },
    obstacles: [],
  },
  {
    title: "Mundur pelan-pelan",
    hint: "Ikan badut menghadap ke kanan, tapi bintangnya di belakang. Coba Mundur!",
    edition: "samudra",
    start: { x: 4, y: 2, dir: 1 },
    target: { x: 1, y: 2 },
    obstacles: [],
  },
  {
    title: "Belok di tikungan",
    hint: "Maju dulu, lalu belok ke kanan.",
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
    hint: "Langkahnya berulang: Maju, Belok Kanan, Maju, Belok Kiri. Pakai Ulangi!",
    edition: "rimba",
    start: { x: 0, y: 5, dir: 0 },
    target: { x: 3, y: 2 },
    obstacles: [[0, 3], [1, 2], [2, 1]],
  },
  {
    title: "Menyelam ke dasar",
    hint: "Jalan zig-zag sampai pojok bawah. Berapa kali harus diulang?",
    edition: "samudra",
    start: { x: 0, y: 0, dir: 1 },
    target: { x: 5, y: 5 },
    obstacles: [[3, 0], [5, 1], [0, 2], [0, 5], [2, 5], [5, 3]],
  },
];

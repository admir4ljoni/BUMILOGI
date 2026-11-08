import { SIZE, type Cmd } from "@/lib/board";
import type { Level } from "@/lib/db/schema";

const STEP: Record<Cmd, [number, number]> = { atas: [0, -1], bawah: [0, 1], kiri: [-1, 0], kanan: [1, 0] };

type Props = Pick<Level, "start_x" | "start_y" | "target_x" | "target_y" | "obstacles" | "solution"> & { color: string };

// A small picture of a level for the level list: pawn, star, obstacles and the shortest route.
export function MiniBoard({ start_x, start_y, target_x, target_y, obstacles, solution, color }: Props) {
  const route = new Set<string>();
  let [x, y] = [start_x, start_y];
  for (const cmd of solution) {
    x += STEP[cmd][0];
    y += STEP[cmd][1];
    route.add(`${x},${y}`);
  }
  const blocked = new Set(obstacles.map(([ox, oy]) => `${ox},${oy}`));

  const cells = [];
  for (let cy = 0; cy < SIZE; cy++) {
    for (let cx = 0; cx < SIZE; cx++) {
      const key = `${cx},${cy}`;
      let piece = null;
      if (cx === start_x && cy === start_y) piece = <span className="level-token is-start" style={{ background: `var(--${color})` }} />;
      else if (cx === target_x && cy === target_y) piece = <span className="level-token is-target" />;
      else if (blocked.has(key)) piece = <span className="level-token is-obstacle" />;
      const isTarget = cx === target_x && cy === target_y;
      cells.push(
        <span key={key} className={"mini-cell" + (isTarget ? " is-goal" : route.has(key) ? " is-route" : "")}>
          {piece}
        </span>,
      );
    }
  }
  return (
    <span className="mini-board" aria-hidden="true">
      {cells}
    </span>
  );
}

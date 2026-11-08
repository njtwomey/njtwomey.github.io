import { scoreLocation, situation, SIZE } from "./model";

type Cell = { x: number; y: number; score: number };
type Level = { size: number; cells: Cell[] };
type Update = {
  phase: "coarse" | "refine" | "done";
  progress: number;
  cells?: Cell[];
  levels?: Level[];
  best?: Cell;
  errorM?: number;
};

const worker = self as unknown as {
  onmessage:
    | ((
        event: MessageEvent<{
          seed: number;
          gridN: number;
          microphone?: { x: number; y: number };
          secondPath?: "crossing" | "parallel";
        }>,
      ) => void)
    | null;
  postMessage: (message: Update) => void;
};
worker.onmessage = (
  event: MessageEvent<{
    seed: number;
    gridN: number;
    microphone?: { x: number; y: number };
    secondPath?: "crossing" | "parallel";
  }>,
) => {
  const scene = situation(event.data.seed, event.data.microphone, event.data.secondPath);
  const cells: Cell[] = [];
  let best: Cell = { x: 0, y: 0, score: Infinity };
  const n = event.data.gridN;
  let row = 0;
  const coarse = () => {
    const until = Math.min(n, row + 3);
    for (; row < until; row++) {
      for (let col = 0; col < n; col++) {
        const x = ((col + 0.5) / n) * SIZE,
          y = ((row + 0.5) / n) * SIZE;
        const cell = { x, y, score: scoreLocation(x, y, scene) };
        cells.push(cell);
        if (cell.score < best.score) best = cell;
      }
    }
    worker.postMessage({
      phase: "coarse",
      progress: (row / n) * 0.8,
      cells: cells.slice(-3 * n),
      best,
    } satisfies Update);
    if (row < n) setTimeout(coarse, 0);
    else setTimeout(refine, 0);
  };
  const refine = () => {
    const levels: Level[] = [];
    let size = SIZE / n;
    let parents = [...cells].sort((a, b) => a.score - b.score).slice(0, 8);
    levels.push({ size, cells: parents });
    for (let level = 1; level <= 3; level++) {
      const children: Cell[] = [];
      for (const parent of parents) {
        for (const dy of [-1, 1])
          for (const dx of [-1, 1]) {
            const x = parent.x + (dx * size) / 4;
            const y = parent.y + (dy * size) / 4;
            if (x < 0 || x > SIZE || y < 0 || y > SIZE) continue;
            const cell = { x, y, score: scoreLocation(x, y, scene) };
            children.push(cell);
            if (cell.score < best.score) best = cell;
          }
      }
      size /= 2;
      parents = children.sort((a, b) => a.score - b.score).slice(0, 8);
      levels.push({ size, cells: parents });
      worker.postMessage({ phase: "refine", progress: 0.8 + level * 0.04 } satisfies Update);
    }
    const centre = parents[0] ?? best;
    const fine: Cell[] = [];
    for (let yi = -12; yi <= 12; yi++)
      for (let xi = -12; xi <= 12; xi++) {
        const x = centre.x + (xi * size) / 12,
          y = centre.y + (yi * size) / 12;
        if (x < 0 || x > SIZE || y < 0 || y > SIZE) continue;
        const cell = { x, y, score: scoreLocation(x, y, scene) };
        fine.push(cell);
        if (cell.score < best.score) best = cell;
      }
    worker.postMessage({ phase: "refine", progress: 0.95, cells: fine, best } satisfies Update);
    const errorM = Math.hypot(best.x - scene.truth.x, best.y - scene.truth.y);
    worker.postMessage({ phase: "done", progress: 1, best, errorM, levels } satisfies Update);
  };
  coarse();
};

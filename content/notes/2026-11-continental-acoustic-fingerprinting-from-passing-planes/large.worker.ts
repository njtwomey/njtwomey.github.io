import {
  generateLargeScenario,
  scoreLargeLocation,
  scoreLargePlaceAndTime,
  type LargeCandidate,
  type LargeCell,
  type LargeConfig,
  type LargeScenario,
} from "./large-model";

export type LargeSearchSettings = { gridKm?: number; refineLevels?: number; keep?: number };
export type LargeWorkerRun = { type: "run"; config: Partial<LargeConfig>; settings?: LargeSearchSettings };
export type LargeWorkerMessage = {
  phase: "generated" | "coarse" | "refine" | "done";
  progress: number;
  scenario?: LargeScenario;
  cells?: LargeCell[];
  level?: number;
  candidates?: LargeCandidate[];
  elapsedSeconds?: number;
};

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<LargeWorkerRun>) => void) | null;
  postMessage: (message: LargeWorkerMessage) => void;
};
const rankDistinct = (cells: LargeCell[], count: number, separation: number): LargeCell[] => {
  const ranked = [...cells].sort((a, b) => b.score - a.score);
  const chosen: LargeCell[] = [];
  for (const cell of ranked) {
    if (
      chosen.every(
        (other) =>
          Math.hypot(cell.x - other.x, cell.y - other.y) >= separation || Math.abs(cell.timeS - other.timeS) >= 900,
      )
    )
      chosen.push(cell);
    if (chosen.length >= count) break;
  }
  return chosen;
};

worker.onmessage = ({ data }) => {
  if (data.type !== "run") return;
  const started = performance.now();
  const scenario = generateLargeScenario(data.config);
  worker.postMessage({ phase: "generated", progress: 0.02, scenario });
  if (!scenario.events.length) {
    worker.postMessage({
      phase: "done",
      progress: 1,
      candidates: [],
      elapsedSeconds: (performance.now() - started) / 1000,
    });
    return;
  }
  const settings = data.settings ?? {};
  const grid = Math.max(1_000, Math.min(20_000, (settings.gridKm ?? 2) * 1000));
  const levels = Math.max(0, Math.min(5, Math.round(settings.refineLevels ?? 3)));
  const keep = Math.max(2, Math.min(100, Math.round(settings.keep ?? 20)));
  const n = Math.ceil(scenario.sizeM / grid);
  const all: LargeCell[] = [];
  let row = 0;
  const coarse = () => {
    const chunk: LargeCell[] = [];
    const until = Math.min(n, row + 2);
    for (; row < until; row++)
      for (let col = 0; col < n; col++) {
        const x = Math.min(scenario.sizeM, (col + 0.5) * grid);
        const y = Math.min(scenario.sizeM, (row + 0.5) * grid);
        const cell = scoreLargePlaceAndTime(scenario, x, y);
        all.push(cell);
        chunk.push(cell);
      }
    worker.postMessage({ phase: "coarse", progress: 0.02 + (0.68 * row) / n, cells: chunk, level: 0 });
    if (row < n) setTimeout(coarse, 0);
    else setTimeout(() => refine(1, grid), 0);
  };
  const refine = (level: number, spacing: number) => {
    if (level > levels) return finish();
    const parents = rankDistinct(all, keep, spacing * 0.8);
    const step = spacing / 3;
    const cells: LargeCell[] = [];
    const seen = new Set<string>();
    for (const parent of parents)
      for (let iy = -2; iy <= 2; iy++)
        for (let ix = -2; ix <= 2; ix++) {
          const x = parent.x + ix * step,
            y = parent.y + iy * step;
          if (x < 0 || x > scenario.sizeM || y < 0 || y > scenario.sizeM) continue;
          const id = `${Math.round(x)}:${Math.round(y)}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const cell = scoreLargePlaceAndTime(scenario, x, y);
          cells.push(cell);
          all.push(cell);
        }
    worker.postMessage({ phase: "refine", progress: 0.7 + (0.25 * level) / Math.max(1, levels), cells, level });
    setTimeout(() => refine(level + 1, step), 0);
  };
  const finish = () => {
    const winners = rankDistinct(all, 5, Math.max(1200, grid * 0.55));
    const candidates = winners.map((c) => scoreLargeLocation(scenario, c.x, c.y, true, c.timeS));
    worker.postMessage({
      phase: "done",
      progress: 1,
      candidates,
      elapsedSeconds: (performance.now() - started) / 1000,
    });
  };
  coarse();
};

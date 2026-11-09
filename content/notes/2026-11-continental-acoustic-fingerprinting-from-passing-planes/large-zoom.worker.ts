import { generateLargeScenario, scoreLargeLocation, type LargeCell, type LargeConfig } from "./large-model";

type Request = { config: LargeConfig; x: number; y: number; spanM: number; timeS: number };
type Update = { progress: number; cells?: LargeCell[]; best?: LargeCell; done?: boolean };
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: Update) => void;
};

worker.onmessage = ({ data }) => {
  const scene = generateLargeScenario(data.config);
  const n = 21;
  const half = data.spanM / 2;
  const x0 = Math.max(0, Math.min(scene.sizeM - data.spanM, data.x - half));
  const y0 = Math.max(0, Math.min(scene.sizeM - data.spanM, data.y - half));
  const cells: LargeCell[] = [];
  let best: LargeCell = { x: data.x, y: data.y, score: -Infinity, timeS: data.timeS };
  let row = 0;
  const step = () => {
    const until = Math.min(n, row + 3);
    for (; row < until; row++)
      for (let col = 0; col < n; col++) {
        const x = x0 + ((col + 0.5) / n) * data.spanM;
        const y = y0 + ((row + 0.5) / n) * data.spanM;
        const cell = scoreLargeLocation(scene, x, y, false, data.timeS);
        cells.push(cell);
        if (cell.score > best.score) best = cell;
      }
    worker.postMessage({ progress: row / n } satisfies Update);
    if (row < n) setTimeout(step, 0);
    else worker.postMessage({ progress: 1, cells, best, done: true } satisfies Update);
  };
  step();
};

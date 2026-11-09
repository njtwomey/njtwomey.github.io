import { scoreLocation, situation, SIZE } from "./model";

type Candidate = { x: number; y: number; time: number; score: number };
type Cell = { x: number; y: number; score: number };
type Update = {
  phase: "coarse" | "refine" | "done";
  progress: number;
  best?: Candidate;
  timeScores?: { time: number; score: number }[];
  mapCells?: Cell[];
  positionError?: number;
  timeError?: number;
};

// Catalogue flight paths are timed around 23 s; the clip's start is unknown to the search.
const TRUE_START = 23;
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<{ seed: number }>) => void) | null;
  postMessage: (message: Update) => void;
};

worker.onmessage = (event: MessageEvent<{ seed: number }>) => {
  const scene = situation(event.data.seed);
  const n = 20;
  const cell = SIZE / n;
  const allTimes = Array.from({ length: 11 }, (_, i) => i * 5);
  const timeScores: { time: number; score: number }[] = [];
  let best: Candidate = { x: 0, y: 0, time: 0, score: Infinity };
  let bestMap: Cell[] = [];
  let ti = 0;

  const coarse = () => {
    const time = allTimes[ti]!;
    const mapCells: Cell[] = [];
    let bestAtTime = Infinity;
    for (let row = 0; row < n; row++)
      for (let col = 0; col < n; col++) {
        const x = (col + 0.5) * cell;
        const y = (row + 0.5) * cell;
        const score = scoreLocation(x, y, scene, time - TRUE_START, 4);
        mapCells.push({ x, y, score });
        if (score < bestAtTime) bestAtTime = score;
        if (score < best.score) {
          best = { x, y, time, score };
          bestMap = mapCells;
        }
      }
    timeScores.push({ time, score: bestAtTime });
    if (best.time === time) bestMap = mapCells;
    ti++;
    worker.postMessage({ phase: "coarse", progress: (ti / allTimes.length) * 0.7 } satisfies Update);
    if (ti < allTimes.length) setTimeout(coarse, 0);
    else setTimeout(refine, 0);
  };

  const refine = () => {
    const rough = best;
    let middle: Candidate = { ...best, score: Infinity };
    for (let dt = -5; dt <= 5; dt++)
      for (let iy = -4; iy <= 4; iy++)
        for (let ix = -4; ix <= 4; ix++) {
          const x = rough.x + ix * (cell / 4);
          const y = rough.y + iy * (cell / 4);
          const time = rough.time + dt;
          if (x < 0 || x > SIZE || y < 0 || y > SIZE || time < 0 || time > 50) continue;
          const score = scoreLocation(x, y, scene, time - TRUE_START, 2);
          if (score < middle.score) middle = { x, y, time, score };
        }
    worker.postMessage({ phase: "refine", progress: 0.85 } satisfies Update);
    let fine: Candidate = { ...middle, score: Infinity };
    for (let dt = -4; dt <= 4; dt++)
      for (let iy = -4; iy <= 4; iy++)
        for (let ix = -4; ix <= 4; ix++) {
          const x = middle.x + ix * (cell / 16);
          const y = middle.y + iy * (cell / 16);
          const time = middle.time + dt * 0.25;
          if (x < 0 || x > SIZE || y < 0 || y > SIZE || time < 0 || time > 50) continue;
          const score = scoreLocation(x, y, scene, time - TRUE_START);
          if (score < fine.score) fine = { x, y, time, score };
        }
    worker.postMessage({
      phase: "done",
      progress: 1,
      best: fine,
      timeScores,
      mapCells: bestMap,
      positionError: Math.hypot(fine.x - scene.truth.x, fine.y - scene.truth.y),
      timeError: Math.abs(fine.time - TRUE_START),
    } satisfies Update);
  };
  coarse();
};

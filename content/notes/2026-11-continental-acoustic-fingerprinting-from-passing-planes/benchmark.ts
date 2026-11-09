/** Run the exact large-search worker in Node against 100 fixed-sky microphone/time samples.
 * Build with esbuild, then run the bundle outside the browser.
 */
import {
  DEFAULT_LARGE_CONFIG,
  generateLargeScenario,
  largeHeardEvents,
  scoreLargeLocation,
  scoreLargePlaceAndTime,
  type LargeCandidate,
  type LargeCell,
  type LargeConfig,
} from "./large-model";

type Result = {
  sample: number;
  xKm: number;
  yKm: number;
  startHour: number;
  events: number;
  estimate: boolean;
  errorM: number | null;
  timeErrorMin: number | null;
  score: number | null;
  elapsedMs: number;
};
type Done = { phase: string; level?: number; cells?: LargeCell[]; candidates?: LargeCandidate[] };
const mock = {
  onmessage: null as null | ((event: { data: unknown }) => void),
  postMessage: (_message: Done) => {},
};
Object.defineProperty(globalThis, "self", { value: mock, configurable: true });
await import("./large.worker");

let randomState = 20261106;
const random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
};
const configs: LargeConfig[] = Array.from({ length: 100 }, () => ({
  ...DEFAULT_LARGE_CONFIG,
  observerXKm: 5 + random() * 90,
  observerYKm: 5 + random() * 90,
  startHour: random() * (24 - DEFAULT_LARGE_CONFIG.clipMinutes / 60),
}));
const summary = configs.map((config) => generateLargeScenario(config).events.length);
const counts = new Map<number, number>();
for (const count of summary) counts.set(count, (counts.get(count) ?? 0) + 1);
console.log(
  "Detected events in 100 fixed-sky random clips:",
  [...counts].sort((a, b) => a[0] - b[0]),
);

if (process.argv.includes("--sample-only")) process.exit(0);
const requestedEvent = process.argv.find((arg) => arg.startsWith("--event="));
const onlyEvent = requestedEvent ? Number(requestedEvent.slice(8)) : null;
const minEvents = Number(process.argv.find((arg) => arg.startsWith("--min-events="))?.slice(13) ?? 0);
const requestedLimit = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = requestedLimit ? Number(requestedLimit.slice(8)) : configs.length;
const diagnose = process.argv.includes("--diagnose");
const requestedSamples = process.argv.find((arg) => arg.startsWith("--samples="));
const onlySamples = requestedSamples ? new Set(requestedSamples.slice(10).split(",").map(Number)) : null;
const fromSample = Number(process.argv.find((arg) => arg.startsWith("--from="))?.slice(7) ?? 1);
const toSample = Number(process.argv.find((arg) => arg.startsWith("--to="))?.slice(5) ?? configs.length);
const gridKm = Number(process.argv.find((arg) => arg.startsWith("--grid="))?.slice(7) ?? 2);
const keep = Number(process.argv.find((arg) => arg.startsWith("--keep="))?.slice(7) ?? 20);
const refineLevels = Number(process.argv.find((arg) => arg.startsWith("--levels="))?.slice(9) ?? 3);

let lastCoarse: LargeCell[] = [];
const run = (config: LargeConfig): Promise<Done> =>
  new Promise((resolve) => {
    lastCoarse = [];
    mock.postMessage = (message) => {
      if (message.phase === "coarse" && message.level === 0 && message.cells) lastCoarse.push(...message.cells);
      if (message.phase === "done") resolve(message);
    };
    mock.onmessage?.({ data: { type: "run", config, settings: { gridKm, refineLevels, keep } } });
  });
const rows: Result[] = [];
for (let i = 0; i < configs.length; i++) {
  if (onlyEvent !== null && summary[i] !== onlyEvent) continue;
  if (summary[i]! < minEvents) continue;
  if (onlySamples && !onlySamples.has(i + 1)) continue;
  if (i + 1 < fromSample || i + 1 > toSample) continue;
  if (rows.length >= limit) break;
  const config = configs[i]!;
  const started = performance.now();
  const update = await run(config);
  const best = update.candidates?.[0];
  if (diagnose && summary[i]! >= 2) {
    const scenario = generateLargeScenario(config);
    const truth = scoreLargeLocation(scenario, scenario.observer.x, scenario.observer.y, true);
    const freeAtTruth = scoreLargePlaceAndTime(scenario, scenario.observer.x, scenario.observer.y);
    const gridM = gridKm * 1000;
    const cx = (Math.floor(scenario.observer.x / gridM) + 0.5) * gridM;
    const cy = (Math.floor(scenario.observer.y / gridM) + 0.5) * gridM;
    const coarseNear = scoreLargePlaceAndTime(scenario, cx, cy);
    const coarseRank = 1 + lastCoarse.filter((cell) => cell.score > coarseNear.score).length;
    const tileSize = 10_000;
    const nearTile = lastCoarse.filter(
      (cell) =>
        Math.floor(cell.x / tileSize) === Math.floor(scenario.observer.x / tileSize) &&
        Math.floor(cell.y / tileSize) === Math.floor(scenario.observer.y / tileSize),
    );
    const curveRms = (match: LargeCandidate["matches"][number]) =>
      Math.sqrt(
        match.observed.f.reduce((sum, f, j) => sum + (f - match.predicted.f[j]!) ** 2, 0) / match.observed.f.length,
      );
    console.log(
      `DIAG ${JSON.stringify({
        sample: i + 1,
        truthScore: truth.score,
        truthFlights: truth.matches.map((match) => match.flightId),
        freeAtTruthScore: freeAtTruth.score,
        freeAtTruthTimeErrorMin: freeAtTruth.timeErrorMin,
        coarseNearScore: coarseNear.score,
        coarseRank,
        tileBestScore: Math.max(...nearTile.map((cell) => cell.score)),
        coarseNearTimeErrorMin: coarseNear.timeErrorMin,
        bestScore: best?.score,
        bestXKm: best && best.x / 1000,
        bestYKm: best && best.y / 1000,
        bestStartHour: best && best.timeS / 3600,
        bestFlights: best?.matches.map((match) => match.flightId),
        bestAudibleFlights:
          best &&
          largeHeardEvents(scenario, best.x / 1000, best.y / 1000, best.timeS / 3600).map(
            (event) => event.truthFlightId,
          ),
        bestCurveRmsHz: best?.matches.map(curveRms),
      })}`,
    );
  }
  rows.push({
    sample: i + 1,
    xKm: config.observerXKm!,
    yKm: config.observerYKm!,
    startHour: config.startHour!,
    events: summary[i]!,
    estimate: !!best,
    errorM: best?.errorM ?? null,
    timeErrorMin: best?.timeErrorMin ?? null,
    score: best?.score ?? null,
    elapsedMs: Math.round(performance.now() - started),
  });
  console.log(`RESULT ${JSON.stringify(rows[rows.length - 1])}`);
  if ((i + 1) % 10 === 0) console.log(`Completed ${i + 1}/100`);
}
console.log(`SUMMARY ${JSON.stringify({ cases: rows.length, gridKm, keep, refineLevels })}`);

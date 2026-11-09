import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { elevation, pathSamples, situation, SIZE } from "./model";
import { SCORE_COLOURS, scoreColour } from "./score-colours";
import { renderTerrainRelief } from "./terrain-relief";

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
const orange = "#e47538";
const cyan = "#00a6a6";
const muted = "var(--muted-foreground, #71717a)";

/** Construct a known two-flight observation, then search for its listener on a coarse-to-fine grid. */
export function LocateLab() {
  const [seed, setSeed] = useState(7);
  const [microphone, setMicrophone] = useState<{ x: number; y: number } | null>(null);
  const [secondPath, setSecondPath] = useState<"crossing" | "parallel">("crossing");
  const [gridN, setGridN] = useState(46);
  const [phase, setPhase] = useState<"idle" | Update["phase"]>("idle");
  const [progress, setProgress] = useState(0);
  const [cells, setCells] = useState<Cell[]>([]);
  const [best, setBest] = useState<Cell | null>(null);
  const [errorM, setErrorM] = useState<number | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [shownLevel, setShownLevel] = useState(3);
  const workerRef = useRef<Worker | null>(null);
  const pendingCells = useRef<Cell[]>([]);
  const scene = useMemo(() => situation(seed, microphone ?? undefined, secondPath), [seed, microphone, secondPath]);
  const relief = useMemo(
    () => renderTerrainRelief((x, y) => elevation(x, y, seed), { x: 0, y: 0, span: SIZE }),
    [seed],
  );

  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );
  const run = () => {
    workerRef.current?.terminate();
    pendingCells.current = [];
    setCells([]);
    setBest(null);
    setErrorM(null);
    setLevels([]);
    setProgress(0);
    setPhase("coarse");
    const worker = new Worker(new URL("./locate.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<Update>) => {
      if (workerRef.current !== worker) return;
      const update = event.data;
      setPhase(update.phase);
      setProgress(update.progress);
      if (update.cells) pendingCells.current.push(...update.cells);
      if (update.phase === "done") {
        setCells(pendingCells.current);
        if (update.best) setBest(update.best);
        if (update.errorM !== undefined) setErrorM(update.errorM);
        if (update.levels) setLevels(update.levels);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      }
    };
    worker.postMessage({ seed, gridN, microphone, secondPath });
  };
  useEffect(() => {
    run();
  }, [seed, gridN, microphone, secondPath]);
  const newSituation = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingCells.current = [];
    setSeed((s) => s + 1);
    setMicrophone(null);
    setCells([]);
    setBest(null);
    setErrorM(null);
    setLevels([]);
    setProgress(0);
    setPhase("idle");
  };
  const placeMicrophone = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingCells.current = [];
    setCells([]);
    setBest(null);
    setErrorM(null);
    setLevels([]);
    setProgress(0);
    setPhase("idle");
    setMicrophone({
      x: Math.max(0, Math.min(SIZE, ((event.clientX - rect.left) / rect.width) * SIZE)),
      y: Math.max(0, Math.min(SIZE, ((event.clientY - rect.top) / rect.height) * SIZE)),
    });
  };
  const tracks = scene.flights.map((f) => pathSamples(f, 90));
  const scale = (v: number) => (v / SIZE) * 400;
  const coarseCells = cells.slice(0, gridN * gridN);
  const scores = coarseCells
    .filter((c) => c.score > 0)
    .map((c) => c.score)
    .sort((a, b) => a - b);
  const bestCoarse = scores[0] ?? 0;
  const weakCoarse = scores[Math.floor(scores.length * 0.7)] ?? 1;
  const bestLog = Math.log1p(bestCoarse);
  const weakLog = Math.log1p(weakCoarse);
  return (
    <figure
      style={{
        border: "1px solid var(--border, #d4d4d8)",
        borderRadius: 12,
        overflow: "hidden",
        margin: "1.5rem 0",
        background: "var(--background, white)",
      }}
    >
      <div style={{ padding: "16px 18px" }}>
        <strong style={{ fontSize: 18 }}>Location search with two flights</strong>
        <p style={{ margin: "5px 0 0", color: muted, fontSize: 14 }}>
          Two constructed flyovers arrive 100 seconds apart. Click the map to move the microphone; the location search
          runs automatically.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 16,
          padding: "0 16px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <svg
            viewBox="0 0 400 400"
            role="img"
            aria-label="Synthetic terrain, two flight paths and location search results"
            onPointerDown={placeMicrophone}
            style={{ width: "100%", display: "block", cursor: "crosshair" }}
          >
            <image href={relief} x="0" y="0" width="400" height="400" preserveAspectRatio="none" />
            {coarseCells.map((c, i) => {
              const quality = Math.max(
                0,
                Math.min(1, (weakLog - Math.log1p(c.score)) / Math.max(1e-8, weakLog - bestLog)),
              );
              return (
                <rect
                  key={i}
                  x={scale(c.x) - 200 / gridN}
                  y={scale(c.y) - 200 / gridN}
                  width={400 / gridN + 0.2}
                  height={400 / gridN + 0.2}
                  fill={scoreColour(quality)}
                  opacity={0.52 + quality * 0.3}
                />
              );
            })}
            {levels[shownLevel]?.cells.map((cell, i) => {
              const size = levels[shownLevel]!.size;
              return (
                <rect
                  key={`level-${i}`}
                  x={scale(cell.x - size / 2)}
                  y={scale(cell.y - size / 2)}
                  width={scale(size)}
                  height={scale(size)}
                  fill="none"
                  stroke={i === 0 ? "#fff" : "#f9e0ce"}
                  strokeWidth={i === 0 ? 2.5 : 1.5}
                />
              );
            })}
            {tracks.map((points, j) => (
              <path
                key={j}
                d={points.map((p, i) => `${i ? "L" : "M"}${scale(p.x).toFixed(1)},${scale(p.y).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={j ? cyan : "#223e58"}
                strokeWidth="3"
                strokeDasharray={j ? "7 4" : undefined}
              />
            ))}
            {best && (
              <g>
                <circle cx={scale(best.x)} cy={scale(best.y)} r="10" fill="none" stroke="#fff" strokeWidth="5" />
                <circle cx={scale(best.x)} cy={scale(best.y)} r="10" fill="none" stroke={orange} strokeWidth="2.5" />
              </g>
            )}
            <g>
              <path
                d={`M${scale(scene.truth.x) - 9},${scale(scene.truth.y)}h18 M${scale(scene.truth.x)},${scale(scene.truth.y) - 9}v18`}
                stroke="white"
                strokeWidth="5"
              />
              <path
                d={`M${scale(scene.truth.x) - 9},${scale(scene.truth.y)}h18 M${scale(scene.truth.x)},${scale(scene.truth.y) - 9}v18`}
                stroke="#23334a"
                strokeWidth="2"
              />
            </g>
            <text
              x="10"
              y="20"
              fill="white"
              stroke="#1c3440"
              strokeWidth="1.2"
              paintOrder="stroke"
              fontSize="12"
              fontWeight="700"
            >
              20 × 20 km search region
            </text>
          </svg>
          <div style={{ color: muted, fontSize: 12, paddingTop: 5 }}>
            Click to move the dark cross. Blue means a weak curve match and red a strong match; the outlined circle
            marks the best estimate.
          </div>
          {coarseCells.length > 0 && (
            <div style={{ marginTop: 10, color: muted, fontSize: 12 }}>
              <div
                aria-label="Location fit, from weak blue to strong red"
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${SCORE_COLOURS.join(", ")})`,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span>Weaker fit</span>
                <span>Stronger fit</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "grid", alignContent: "center", gap: 18, padding: "12px 4px" }}>
          <div>
            <div style={{ color: muted, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Generated recording
            </div>
            <div style={{ fontSize: 26, fontWeight: 650 }}>2 flights · 100 s apart</div>
            <p style={{ color: muted, fontSize: 14, margin: "5px 0" }}>
              The search sees their flight paths and received Doppler curves. The cross shows the constructed answer to
              you; the worker does not receive its coordinate as a search hint.
            </p>
          </div>
          <label style={{ display: "grid", gap: 5, color: muted, fontSize: 13 }}>
            <span>Flight path geometry</span>
            <select
              value={secondPath}
              onChange={(event) => setSecondPath(event.target.value as "crossing" | "parallel")}
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border, #ccc)",
                borderRadius: 7,
                background: "var(--background, white)",
                color: "var(--foreground, #18181b)",
              }}
            >
              <option value="crossing">Crossing curved paths</option>
              <option value="parallel">Straight parallel paths</option>
            </select>
          </label>
          <div>
            <div style={{ color: muted, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Search</div>
            <div style={{ fontSize: 26, fontWeight: 650 }}>
              {phase === "idle" ? "Ready" : phase === "done" ? "Complete" : `${Math.round(progress * 100)}%`}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              style={{ height: 8, background: "var(--muted, #e4e4e7)", borderRadius: 5, overflow: "hidden" }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  background: orange,
                  transition: "width .1s linear",
                }}
              />
            </div>
            <p style={{ color: muted, fontSize: 14, margin: "7px 0 0" }}>
              {phase === "idle"
                ? "A coarse grid scores the full terrain. A fine grid then searches around the winner."
                : phase === "coarse"
                  ? `${Math.round((progress / 0.8) * gridN * gridN).toLocaleString()} coarse cells scored`
                  : phase === "refine"
                    ? "Splitting the best cells, then fitting locally"
                    : `Recovered position is ${Math.round(errorM ?? 0)} m from the constructed listener.`}
            </p>
          </div>
          <label style={{ display: "grid", gap: 5, color: muted, fontSize: 13 }}>
            <span>
              Coarse grid: <strong>{Math.round(SIZE / gridN)} m cells</strong> · {gridN * gridN} locations
            </span>
            <input
              type="range"
              min="24"
              max="70"
              step="2"
              value={gridN}
              disabled={phase === "coarse" || phase === "refine"}
              onChange={(event) => {
                setGridN(Number(event.target.value));
                setPhase("idle");
                setProgress(0);
                setCells([]);
                setBest(null);
                setErrorM(null);
                setLevels([]);
              }}
              style={{ accentColor: orange }}
            />
          </label>
          {levels.length > 0 && (
            <div style={{ display: "grid", gap: 5, color: muted, fontSize: 13 }}>
              <span>
                Promising cells after split {shownLevel}: <strong>{Math.round(levels[shownLevel]!.size)} m</strong> wide
              </span>
              <input
                type="range"
                min="0"
                max={levels.length - 1}
                step="1"
                value={shownLevel}
                onChange={(event) => setShownLevel(Number(event.target.value))}
                style={{ accentColor: orange }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={newSituation}
              style={{
                border: "1px solid var(--border, #ccc)",
                borderRadius: 7,
                background: "transparent",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              New terrain
            </button>
          </div>
          {phase === "done" && (
            <div style={{ color: muted, fontSize: 12 }}>
              Orange circle: recovered point · Dark cross: constructed listener. This idealized example omits detection
              errors and missing flight data.
              <div style={{ marginTop: 5 }}>
                Constructed listener: ({Math.round(scene.truth.x)}, {Math.round(scene.truth.y)}) m · Recovered: (
                {Math.round(best?.x ?? 0)}, {Math.round(best?.y ?? 0)}) m
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption style={{ padding: "14px 18px 16px", color: muted, fontSize: 13 }}>
        For each cell, the model predicts both received curves from the known paths. It removes each aircraft’s unknown
        base pitch, but keeps the flights’ time separation locked. The coarse grid covers the whole region. Three rounds
        split the eight best cells, and a final local search samples 25 × 25 points around the winner. Smaller coarse
        cells take longer to score; the split slider shows how the promising cells shrink.
      </figcaption>
    </figure>
  );
}

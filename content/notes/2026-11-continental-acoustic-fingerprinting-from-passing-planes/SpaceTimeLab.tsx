import { useEffect, useMemo, useRef, useState } from "react";
import { elevation, flightState, pathSamples, situation, SIZE, type Flight } from "./model";
import { scoreColour } from "./score-colours";
import { renderTerrainRelief } from "./terrain-relief";

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
const orange = "#e47538";
const muted = "var(--muted-foreground, #71717a)";

/** Jointly fit a synthetic clip's position and start time against a timed two-flight catalogue. */
export function SpaceTimeLab() {
  const [seed, setSeed] = useState(7);
  const [phase, setPhase] = useState<"idle" | Update["phase"]>("idle");
  const [progress, setProgress] = useState(0);
  const [best, setBest] = useState<Candidate | null>(null);
  const [timeScores, setTimeScores] = useState<{ time: number; score: number }[]>([]);
  const [mapCells, setMapCells] = useState<Cell[]>([]);
  const [errors, setErrors] = useState<{ place: number; time: number } | null>(null);
  const [clock, setClock] = useState(23);
  const [clockPlaying, setClockPlaying] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const scene = useMemo(() => situation(seed), [seed]);
  const relief = useMemo(
    () => renderTerrainRelief((x, y) => elevation(x, y, seed), { x: 0, y: 0, span: SIZE }),
    [seed],
  );
  const otherFlight = useMemo<Flight>(
    () => ({
      points: [
        { x: -900, y: 16900 },
        { x: 4300, y: 15600 },
        { x: 9700, y: 14900 },
        { x: 15300, y: 12400 },
        { x: 21000, y: 10600 },
      ],
      altitude: 3900,
      speed: 108,
      f0: 125,
      cpaArrival: 0,
    }),
    [],
  );
  const tracks = useMemo(
    () => [...scene.flights, otherFlight].map((flight) => pathSamples(flight, 80)),
    [scene, otherFlight],
  );
  const markers = [
    { name: "Flight A", color: "#223e58", at: flightState(scene.flights[0], clock - 23).position },
    { name: "Flight B", color: "#00a6a6", at: flightState(scene.flights[1], clock - 23 - scene.offset).position },
    { name: "Other flight", color: "#8064aa", at: flightState(otherFlight, clock - 10).position },
  ];
  useEffect(() => () => workerRef.current?.terminate(), []);
  useEffect(() => {
    if (!clockPlaying) return;
    const id = window.setInterval(() => setClock((t) => (t >= 50 ? 0 : Math.min(50, t + 0.5))), 50);
    return () => window.clearInterval(id);
  }, [clockPlaying]);
  const clear = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setPhase("idle");
    setProgress(0);
    setBest(null);
    setTimeScores([]);
    setMapCells([]);
    setErrors(null);
  };
  const run = () => {
    clear();
    setPhase("coarse");
    const worker = new Worker(new URL("./time-locate.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<Update>) => {
      const update = event.data;
      setPhase(update.phase);
      setProgress(update.progress);
      if (update.phase === "done") {
        setBest(update.best ?? null);
        setTimeScores(update.timeScores ?? []);
        setMapCells(update.mapCells ?? []);
        setErrors({ place: update.positionError ?? NaN, time: update.timeError ?? NaN });
        setClock(update.best?.time ?? 23);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      }
    };
    worker.postMessage({ seed });
  };
  const scale = (v: number) => (v / SIZE) * 400;
  const ordered = mapCells.map((c) => c.score).sort((a, b) => a - b);
  const lo = ordered[Math.floor(ordered.length * 0.02)] ?? 0;
  const hi = ordered[Math.floor(ordered.length * 0.75)] ?? 1;
  const chartLo = Math.min(...timeScores.map((s) => Math.log10(s.score + 1e-8)));
  const chartHi = Math.max(...timeScores.map((s) => Math.log10(s.score + 1e-8)));
  const bestCoarseTime = timeScores.reduce((a, b) => (b.score < a.score ? b : a), { time: -1, score: Infinity }).time;
  const chartY = (score: number) =>
    174 - ((Math.log10(score + 1e-8) - chartLo) / Math.max(0.0001, chartHi - chartLo)) * 120;
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
        <strong style={{ fontSize: 18 }}>Searching location and start time</strong>
        <p style={{ margin: "5px 0 0", color: muted, fontSize: 14 }}>
          The catalogue times its two flights. The clip has no start timestamp. Search start times from 0 to 50 seconds
          and a whole terrain, then refine both together.
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
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label="Map of joint position and time search"
          style={{ width: "100%" }}
        >
          <image href={relief} x="0" y="0" width="400" height="400" preserveAspectRatio="none" />
          {mapCells.map((c, i) => {
            const quality = Math.max(0, Math.min(1, (hi - c.score) / Math.max(1e-9, hi - lo)));
            return (
              <rect
                key={i}
                x={scale(c.x) - 10}
                y={scale(c.y) - 10}
                width="20.2"
                height="20.2"
                fill={scoreColour(quality)}
                opacity={0.08 + quality * 0.42}
              />
            );
          })}
          {tracks.map((points, i) => (
            <path
              key={i}
              d={points.map((p, j) => `${j ? "L" : "M"}${scale(p.x).toFixed(1)},${scale(p.y).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={["#223e58", "#00a6a6", "#8064aa"][i]}
              strokeWidth="2.5"
              strokeDasharray={i === 1 ? "7 4" : i === 2 ? "3 5" : undefined}
            />
          ))}
          {markers.map((marker) =>
            marker.at.x >= 0 && marker.at.x <= SIZE && marker.at.y >= 0 && marker.at.y <= SIZE ? (
              <g key={marker.name}>
                <circle
                  cx={scale(marker.at.x)}
                  cy={scale(marker.at.y)}
                  r="7"
                  fill="white"
                  stroke={marker.color}
                  strokeWidth="3"
                />
                <circle cx={scale(marker.at.x)} cy={scale(marker.at.y)} r="2" fill={marker.color} />
              </g>
            ) : null,
          )}
          {best && <circle cx={scale(best.x)} cy={scale(best.y)} r="9" fill="none" stroke={orange} strokeWidth="3" />}
          {phase === "done" && (
            <path
              d={`M${scale(scene.truth.x) - 8},${scale(scene.truth.y)}h16 M${scale(scene.truth.x)},${scale(scene.truth.y) - 8}v16`}
              stroke="#1b2d3a"
              strokeWidth="3"
            />
          )}
          <text x="10" y="20" fill="#1c3440" fontSize="12" fontWeight="700">
            Search scores at best coarse time
          </text>
        </svg>
        <div style={{ display: "grid", gap: 16, alignContent: "center", padding: "8px 3px" }}>
          <div>
            <div style={{ color: muted, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Joint search
            </div>
            <div style={{ fontSize: 25, fontWeight: 650 }}>
              {phase === "idle" ? "Ready" : phase === "done" ? "Complete" : `${Math.round(progress * 100)}%`}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              style={{ height: 8, background: "var(--muted, #e4e4e7)", borderRadius: 5, overflow: "hidden" }}
            >
              <div style={{ width: `${progress * 100}%`, height: "100%", background: orange }} />
            </div>
            <p style={{ color: muted, fontSize: 13, margin: "7px 0" }}>
              {phase === "idle"
                ? "The clip's start could be anywhere from 0 to 50 s on the catalogue clock."
                : phase === "done"
                  ? `Found start time ${best?.time.toFixed(2)} s (constructed: 23 s) · position error ${Math.round(errors?.place ?? 0)} m · time error ${(errors?.time ?? 0).toFixed(2)} s.`
                  : phase === "coarse"
                    ? "Scoring the time × place lattice"
                    : "Refining time and place around the best cell"}
            </p>
          </div>
          <svg
            viewBox="0 0 390 205"
            role="img"
            aria-label="Best location score at each candidate recording time"
            style={{ width: "100%", background: "var(--muted, #f4f4f5)", borderRadius: 8 }}
          >
            <text x="16" y="22" fill="var(--foreground, #18181b)" fontSize="12" fontWeight="700">
              Best location at each start time
            </text>
            <line x1="28" x2="374" y1="174" y2="174" stroke="var(--muted-foreground, #777)" />
            {timeScores.length === 0 && (
              <text x="68" y="105" fill="var(--muted-foreground, #777)" fontSize="13">
                Run the search to see time scores
              </text>
            )}
            <line
              x1={41 + (clock / 5) * 31}
              x2={41 + (clock / 5) * 31}
              y1="30"
              y2="174"
              stroke="#8064aa"
              strokeWidth="2"
              opacity=".85"
            />
            {phase === "done" && (
              <line
                x1={41 + (23 / 5) * 31}
                x2={41 + (23 / 5) * 31}
                y1="30"
                y2="174"
                stroke={orange}
                strokeDasharray="4 3"
                opacity=".75"
              />
            )}
            {timeScores.map((s, i) => (
              <g key={s.time}>
                <rect
                  x={32 + i * 31}
                  y={chartY(s.score)}
                  width="18"
                  height={174 - chartY(s.score)}
                  fill={s.time === bestCoarseTime ? orange : "#6f95a3"}
                />
                <text x={31 + i * 31} y="192" fontSize="10" fill="var(--foreground, #18181b)">
                  {s.time}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ display: "grid", gap: 5, color: muted, fontSize: 13 }}>
            <span>
              Catalogue clock: <strong>{clock.toFixed(1)} s</strong> · flight positions at a possible clip start
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setClockPlaying((p) => !p)}
                style={{
                  border: "1px solid var(--border, #ccc)",
                  borderRadius: 7,
                  padding: "4px 8px",
                  background: "transparent",
                }}
              >
                {clockPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={clock}
                onChange={(event) => {
                  setClockPlaying(false);
                  setClock(Number(event.target.value));
                }}
                style={{ flex: 1, accentColor: orange }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {markers.map((marker) => (
                <span key={marker.name}>
                  <span style={{ color: marker.color }}>●</span> {marker.name}
                  {marker.name === "Other flight" ? " (context only)" : ""}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={run}
              disabled={phase === "coarse" || phase === "refine"}
              style={{
                border: 0,
                borderRadius: 7,
                background: orange,
                color: "white",
                padding: "8px 12px",
                opacity: phase === "coarse" || phase === "refine" ? 0.5 : 1,
              }}
            >
              Search place and time
            </button>
            <button
              type="button"
              onClick={() => {
                clear();
                setSeed((s) => s + 1);
              }}
              style={{
                border: "1px solid var(--border, #ccc)",
                borderRadius: 7,
                background: "transparent",
                padding: "8px 12px",
              }}
            >
              New situation
            </button>
          </div>
        </div>
      </div>
      <figcaption style={{ padding: "14px 18px 16px", color: muted, fontSize: 13 }}>
        Each time bar takes the best position at that time. Lower bars fit better. The purple line follows the clock
        slider; the dashed orange line marks the constructed start after the search. The map shows coarse candidate
        scores at the best time slot, from blue weak matches to red strong matches. The orange circle is the recovered
        place; the dark cross marks constructed truth.
      </figcaption>
    </figure>
  );
}

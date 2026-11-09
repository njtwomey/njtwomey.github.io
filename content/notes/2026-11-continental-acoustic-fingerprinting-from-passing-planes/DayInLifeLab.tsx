import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  AUDIBLE_M,
  DEFAULT_LARGE_CONFIG,
  generateLargeScenario,
  largeElevation,
  largeFlightState,
  type LargeCandidate,
  type LargeCell,
  type LargeConfig,
  type LargeMatch,
} from "./large-model";
import { renderTerrainRelief } from "./terrain-relief";
import { SCORE_COLOURS, scoreColour } from "./score-colours";

type Settings = { gridKm: number; refineLevels: number; keep: number };
const SEARCH_OPTIONS = [
  { name: "Quick · 2 km / 20 cells", gridKm: 2, refineLevels: 3, keep: 20 },
  { name: "Fine · 1 km / 32 cells", gridKm: 1, refineLevels: 3, keep: 32 },
  { name: "Thorough · 1 km / 80 cells", gridKm: 1, refineLevels: 3, keep: 80 },
] as const;
type Update = {
  phase: "generated" | "coarse" | "refine" | "done";
  progress?: number;
  cells?: LargeCell[];
  level?: number;
  candidates?: LargeCandidate[];
  elapsedSeconds?: number;
};
type SearchLevel = { level: number; cells: LargeCell[] };
type Focus = {
  x: number;
  y: number;
  spanM: number;
  timeS: number;
  cells: LargeCell[];
  best: LargeCell | null;
  progress: number;
  busy: boolean;
};
const colors = ["#d46a32", "#168f99", "#7763ad", "#b74875", "#659b38"];
const muted = "var(--muted-foreground, #71717a)";
const clockText = (seconds: number) => {
  const s = Math.round(seconds);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function CurvePair({ match, colour }: { match: LargeMatch; colour: string }) {
  const times = [...match.observed.t, ...match.predicted.t];
  const freqs = [...match.observed.f, ...match.predicted.f];
  const loT = Math.min(...times),
    hiT = Math.max(...times);
  const loF = Math.min(...freqs) - 5,
    hiF = Math.max(...freqs) + 5;
  const x = (t: number) => 36 + ((t - loT) / Math.max(1, hiT - loT)) * 460;
  const y = (f: number) => 117 - ((f - loF) / Math.max(1, hiF - loF)) * 92;
  const line = (t: number[], f: number[]) =>
    t.map((v, i) => `${i ? "L" : "M"}${x(v).toFixed(1)},${y(f[i]!).toFixed(1)}`).join(" ");
  return (
    <div style={{ border: "1px solid var(--border, #ddd)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", fontSize: 13, gap: 8 }}>
        <strong style={{ color: colour }}>
          {match.eventId} · {match.flightId}
        </strong>
        <span style={{ color: muted }}>
          +{(loT / 60).toFixed(1)}–{(hiT / 60).toFixed(1)} min · heard solid · predicted dashed
        </span>
      </div>
      <svg
        viewBox="0 0 520 136"
        role="img"
        aria-label={`${match.eventId} observed and predicted frequencies`}
        style={{ width: "100%", display: "block", background: "#111d28" }}
      >
        {[0, 0.5, 1].map((q) => (
          <line key={q} x1="36" x2="496" y1={25 + q * 92} y2={25 + q * 92} stroke="#8093a0" opacity=".2" />
        ))}
        <path d={line(match.observed.t, match.observed.f)} fill="none" stroke={colour} strokeWidth="3" />
        <path
          d={line(match.predicted.t, match.predicted.f)}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <text x="7" y="15" fill="#cbd5db" fontSize="10">
          Hz
        </text>
        <text x="456" y="132" fill="#cbd5db" fontSize="10">
          clip s
        </text>
      </svg>
    </div>
  );
}

/** A constructed day, a chosen clip, and a ranked end-to-end location search. */
export function DayInLifeLab() {
  const [config, setConfig] = useState<LargeConfig>(DEFAULT_LARGE_CONFIG);
  const [settings, setSettings] = useState<Settings>({ gridKm: 2, refineLevels: 3, keep: 20 });
  const [clock, setClock] = useState(12.17);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<"idle" | Update["phase"]>("idle");
  const [progress, setProgress] = useState(0);
  const [searchSeconds, setSearchSeconds] = useState<number | null>(null);
  const [cells, setCells] = useState<LargeCell[]>([]);
  const [levels, setLevels] = useState<SearchLevel[]>([]);
  const [shownLevel, setShownLevel] = useState(0);
  const [hoverCell, setHoverCell] = useState<LargeCell | null>(null);
  const [candidates, setCandidates] = useState<LargeCandidate[]>([]);
  const [selected, setSelected] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [heatOpacity, setHeatOpacity] = useState(0.75);
  const worker = useRef<Worker | null>(null);
  const zoomWorker = useRef<Worker | null>(null);
  const pendingCells = useRef<LargeCell[]>([]);
  const pendingLevels = useRef<Map<number, LargeCell[]>>(new Map());
  const scene = useMemo(() => generateLargeScenario(config), [config]);
  const clockS = clock * 3600;
  const active = scene.flights.filter((f) => f.startS <= clockS && f.endS >= clockS);
  const eventColors = new Map(scene.events.map((event, i) => [event.truthFlightId, colors[i % colors.length]!]));
  const flightColor = (id: string) =>
    id === "A001" ? colors[0]! : id === "A002" ? colors[1]! : (eventColors.get(id) ?? "#617182");
  useEffect(
    () => () => {
      worker.current?.terminate();
      zoomWorker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setClock((t) => (t >= 23.95 ? 0 : t + 0.08)), 70);
    return () => window.clearInterval(id);
  }, [playing]);
  const reset = () => {
    worker.current?.terminate();
    zoomWorker.current?.terminate();
    worker.current = null;
    zoomWorker.current = null;
    pendingCells.current = [];
    pendingLevels.current = new Map();
    setPhase("idle");
    setProgress(0);
    setSearchSeconds(null);
    setCells([]);
    setLevels([]);
    setShownLevel(0);
    setHoverCell(null);
    setCandidates([]);
    setSelected(0);
    setFocus(null);
  };
  const configure = (part: Partial<LargeConfig>) => {
    reset();
    setConfig((old) => ({ ...old, ...part }));
  };
  const tune = (part: Partial<Settings>) => {
    reset();
    setSettings((old) => ({ ...old, ...part }));
  };
  const searchOption = SEARCH_OPTIONS.findIndex(
    (option) =>
      option.gridKm === settings.gridKm &&
      option.refineLevels === settings.refineLevels &&
      option.keep === settings.keep,
  );
  const run = () => {
    reset();
    setPhase("generated");
    const job = new Worker(new URL("./large.worker.ts", import.meta.url), { type: "module" });
    worker.current = job;
    job.onmessage = (event: MessageEvent<Update>) => {
      const update = event.data;
      setPhase(update.phase);
      setProgress(update.progress ?? 0);
      if (update.cells && update.level !== undefined) {
        const atLevel = pendingLevels.current.get(update.level) ?? [];
        atLevel.push(...update.cells);
        pendingLevels.current.set(update.level, atLevel);
        if (update.level === 0) pendingCells.current.push(...update.cells);
      }
      if (update.phase === "done") {
        setSearchSeconds(update.elapsedSeconds ?? null);
        setCells(pendingCells.current);
        setLevels(
          [...pendingLevels.current].map(([level, cells]) => ({ level, cells })).sort((a, b) => a.level - b.level),
        );
        setShownLevel(0);
        setCandidates(update.candidates ?? []);
        setSelected(0);
        job.terminate();
        if (worker.current === job) worker.current = null;
      }
    };
    job.postMessage({ type: "run", config, settings });
  };
  const inspect = (x: number, y: number, spanM: number, timeS: number) => {
    zoomWorker.current?.terminate();
    setHoverCell(null);
    const span = Math.max(500, Math.min(scene.sizeM, spanM));
    setFocus({ x, y, spanM: span, timeS, cells: [], best: null, progress: 0, busy: true });
    const job = new Worker(new URL("./large-zoom.worker.ts", import.meta.url), { type: "module" });
    zoomWorker.current = job;
    job.onmessage = (
      event: MessageEvent<{ progress: number; cells?: LargeCell[]; best?: LargeCell; done?: boolean }>,
    ) => {
      if (zoomWorker.current !== job) return;
      const update = event.data;
      setFocus(
        (old) =>
          old && {
            ...old,
            progress: update.progress,
            cells: update.done ? (update.cells ?? []) : old.cells,
            best: update.done ? (update.best ?? null) : old.best,
            busy: !update.done,
          },
      );
      if (update.done) {
        job.terminate();
        if (zoomWorker.current === job) zoomWorker.current = null;
      }
    };
    job.postMessage({ config, x, y, spanM: span, timeS });
  };
  const inspectCandidate = (index: number) => {
    const candidate = candidates[index];
    if (!candidate) return;
    setSelected(index);
    inspect(candidate.x, candidate.y, 10_000, candidate.timeS);
  };
  const scale = (v: number) => (v / scene.sizeM) * 430;
  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    configure({
      observerXKm: (viewX + ((event.clientX - rect.left) / rect.width) * viewSpanM) / 1000,
      observerYKm: (viewY + ((event.clientY - rect.top) / rect.height) * viewSpanM) / 1000,
    });
  };
  const shownCells = focus ? focus.cells : (levels.find((entry) => entry.level === shownLevel)?.cells ?? cells);
  const spacingM = focus ? focus.spanM / 21 : (settings.gridKm * 1000) / 3 ** shownLevel;
  const globalBestScore = Math.max(1, candidates[0]?.score ?? 100);
  const fullMapBestScore = Math.max(
    1,
    cells.reduce((best, cell) => Math.max(best, cell.score), 0),
  );
  const bestCell = shownCells.reduce<LargeCell | null>(
    (best, cell) => (!best || cell.score > best.score ? cell : best),
    null,
  );
  const zoomed = focus !== null || shownLevel > 0;
  const colourLimit = zoomed ? globalBestScore : fullMapBestScore;
  const labelledCells = zoomed ? [...shownCells].sort((a, b) => b.score - a.score).slice(0, 12) : [];
  const viewSpanM = focus?.spanM ?? (shownLevel === 0 ? scene.sizeM : Math.min(scene.sizeM, spacingM * 9));
  const viewX = Math.max(
    0,
    Math.min(scene.sizeM - viewSpanM, (focus?.x ?? bestCell?.x ?? scene.sizeM / 2) - viewSpanM / 2),
  );
  const viewY = Math.max(
    0,
    Math.min(scene.sizeM - viewSpanM, (focus?.y ?? bestCell?.y ?? scene.sizeM / 2) - viewSpanM / 2),
  );
  const markerScale = viewSpanM / scene.sizeM;
  const relief = useMemo(
    () => renderTerrainRelief((x, y) => largeElevation(x, y, config), { x: viewX, y: viewY, span: viewSpanM }),
    [viewX, viewY, viewSpanM, config],
  );
  const chosen = candidates[selected];
  return (
    <figure
      style={{
        border: "1px solid var(--border, #ddd)",
        borderRadius: 12,
        overflow: "hidden",
        margin: "1.5rem 0",
        background: "var(--background, white)",
      }}
    >
      <div style={{ padding: "16px 18px" }}>
        <strong style={{ fontSize: 18 }}>Searching a full day of flights</strong>
        <p style={{ color: muted, fontSize: 14, margin: "5px 0 0" }}>
          {config.nFlights} background flights and two fixed constructed passes over {config.sizeKm} × {config.sizeKm}{" "}
          km. Place the microphone, set the clip start, then search the known flight catalogue.
        </p>
        <p style={{ color: muted, fontSize: 13, margin: "9px 0 0" }}>
          <strong>Recovery does not know the clip start.</strong> It tests place and time across the whole constructed
          day. The chosen clip start below is the hidden answer used to make the recording.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
          gap: 16,
          padding: "0 16px",
        }}
      >
        <div>
          <svg
            viewBox={`${scale(viewX)} ${scale(viewY)} ${scale(viewSpanM)} ${scale(viewSpanM)}`}
            role="img"
            aria-label="Synthetic day of aircraft and listener"
            onPointerDown={zoomed ? undefined : pick}
            style={{ width: "100%", display: "block", cursor: zoomed ? "default" : "crosshair" }}
          >
            <image
              href={relief}
              x={scale(viewX)}
              y={scale(viewY)}
              width={scale(viewSpanM)}
              height={scale(viewSpanM)}
              preserveAspectRatio="none"
            />
            {shownCells.map((cell, i) => {
              const quality = Math.max(0, Math.min(1, cell.score / colourLimit));
              return (
                <rect
                  key={i}
                  x={scale(cell.x) - scale(spacingM) / 2}
                  y={scale(cell.y) - scale(spacingM) / 2}
                  width={scale(spacingM) + 0.2}
                  height={scale(spacingM) + 0.2}
                  fill={scoreColour(quality)}
                  opacity={heatOpacity * (0.55 + 0.45 * quality)}
                  stroke="none"
                  onPointerEnter={() => setHoverCell(cell)}
                >
                  <title>{`${focus ? "Local probe" : `Level ${shownLevel}`} · (${(cell.x / 1000).toFixed(2)}, ${(cell.y / 1000).toFixed(2)}) km · ${clockText(cell.timeS)} · score ${cell.score.toFixed(2)}`}</title>
                </rect>
              );
            })}
            {!zoomed && (
              <circle
                cx={scale(scene.observer.x)}
                cy={scale(scene.observer.y)}
                r={scale(AUDIBLE_M)}
                fill="rgba(255,255,255,.07)"
                stroke="rgba(255,255,255,.9)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                pointerEvents="none"
              />
            )}
            {labelledCells.map((cell, i) => (
              <text
                key={`score-${i}`}
                x={scale(cell.x)}
                y={scale(cell.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11 * markerScale}
                fontWeight="700"
                fill="white"
                stroke="#213141"
                strokeWidth={1.4 * markerScale}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {Math.round(cell.score)}
              </text>
            ))}
            {!zoomed &&
              active.slice(0, 45).map((flight) => {
                const tailStart = Math.max(flight.startS, clockS - 420);
                const points = Array.from(
                  { length: 11 },
                  (_, i) => largeFlightState(flight, tailStart + ((clockS - tailStart) * i) / 10).position,
                );
                const at = largeFlightState(flight, clockS).position;
                const colour = flightColor(flight.id);
                return (
                  <g key={flight.id}>
                    {points.slice(1).map((p, i) => (
                      <line
                        key={i}
                        x1={scale(points[i]!.x)}
                        y1={scale(points[i]!.y)}
                        x2={scale(p.x)}
                        y2={scale(p.y)}
                        stroke={colour}
                        strokeWidth={(flight.anchor ? 2.8 : 1.7) * markerScale}
                        strokeLinecap="round"
                        opacity={(flight.anchor ? 0.13 : 0.06) + ((i + 1) / 10) * (flight.anchor ? 0.78 : 0.4)}
                      />
                    ))}
                    {at.x >= 0 && at.x <= scene.sizeM && at.y >= 0 && at.y <= scene.sizeM && (
                      <circle
                        cx={scale(at.x)}
                        cy={scale(at.y)}
                        r={(flight.anchor ? 5 : 3) * markerScale}
                        fill={colour}
                        stroke="white"
                        strokeWidth={markerScale}
                      />
                    )}
                  </g>
                );
              })}
            {candidates.map((candidate, i) => (
              <circle
                key={i}
                cx={scale(candidate.x)}
                cy={scale(candidate.y)}
                r={(i === selected ? 8 : 5) * markerScale}
                fill={i === selected ? "none" : colors[i % colors.length]}
                stroke="#223e58"
                strokeWidth={2 * markerScale}
              />
            ))}
            <path
              d={`M${scale(scene.observer.x) - 9 * markerScale},${scale(scene.observer.y)}h${18 * markerScale} M${scale(scene.observer.x)},${scale(scene.observer.y) - 9 * markerScale}v${18 * markerScale}`}
              stroke="white"
              strokeWidth={3 * markerScale}
            />
            <path
              d={`M${scale(scene.observer.x) - 9 * markerScale},${scale(scene.observer.y)}h${18 * markerScale} M${scale(scene.observer.x)},${scale(scene.observer.y) - 9 * markerScale}v${18 * markerScale}`}
              stroke="#1e3442"
              strokeWidth={1.5 * markerScale}
            />
            {!zoomed && bestCell && (
              <g pointerEvents="none">
                <rect
                  x={scale(bestCell.x) - scale(spacingM) / 2}
                  y={scale(bestCell.y) - scale(spacingM) / 2}
                  width={scale(spacingM)}
                  height={scale(spacingM)}
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                />
                <rect
                  x={scale(bestCell.x) - scale(spacingM) / 2}
                  y={scale(bestCell.y) - scale(spacingM) / 2}
                  width={scale(spacingM)}
                  height={scale(spacingM)}
                  fill="none"
                  stroke="#cf352d"
                  strokeWidth="1.5"
                />
              </g>
            )}
            {!zoomed && (
              <text x="10" y="20" fontSize="12" fontWeight="700" fill="#1e3442">
                Click to place microphone
              </text>
            )}
          </svg>
          <div style={{ marginTop: 9, display: "grid", gap: 5, color: muted, fontSize: 12 }}>
            <div>
              <strong>Map key:</strong> green low ground → brown high ground, with hillshade and contours. Coloured dots
              are aircraft at the day clock; their fading tails point back along the last seven minutes of flight. Grey
              dots and tails are other flights. The cross is the microphone; its dashed circle shows the 12 km maximum
              tonal hearing radius. After recovery, blue-to-red cells show each location’s best fit across the day; the
              outlined square marks the strongest coarse cell.
            </div>
            <div>
              <strong>Search grid</strong> · {settings.gridKm} km coarse →{" "}
              {Math.round((settings.gridKm * 1000) / 3 ** settings.refineLevels)} m at level {settings.refineLevels}
            </div>
            {focus && (
              <div style={{ display: "grid", gap: 7 }}>
                <strong>
                  Candidate #{selected + 1} at {clockText(focus.timeS)} · {(focus.spanM / 1000).toFixed(1)} km view
                </strong>
                <span>
                  {focus.busy
                    ? `Recomputing local scores: ${Math.round(focus.progress * 100)}%`
                    : `${focus.cells.length} local scores · ${Math.round(spacingM)} m spacing · best ${focus.best?.score.toFixed(2) ?? "—"}`}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={focus.busy || focus.spanM <= 500}
                    onClick={() =>
                      inspect(focus.best?.x ?? focus.x, focus.best?.y ?? focus.y, focus.spanM / 2, focus.timeS)
                    }
                    style={{
                      border: "1px solid var(--border, #ccc)",
                      borderRadius: 6,
                      background: "transparent",
                      padding: "4px 8px",
                    }}
                  >
                    Zoom in + rescore
                  </button>
                  <button
                    type="button"
                    disabled={focus.busy || focus.spanM >= scene.sizeM}
                    onClick={() => inspect(focus.x, focus.y, focus.spanM * 2, focus.timeS)}
                    style={{
                      border: "1px solid var(--border, #ccc)",
                      borderRadius: 6,
                      background: "transparent",
                      padding: "4px 8px",
                    }}
                  >
                    Zoom out + rescore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      zoomWorker.current?.terminate();
                      zoomWorker.current = null;
                      setFocus(null);
                      setShownLevel(0);
                    }}
                    style={{
                      border: "1px solid var(--border, #ccc)",
                      borderRadius: 6,
                      background: "transparent",
                      padding: "4px 8px",
                    }}
                  >
                    Full search map
                  </button>
                </div>
              </div>
            )}
            {levels.length > 0 && !focus && (
              <label style={{ display: "grid", gap: 3 }}>
                <span>
                  Zoom through search levels: {shownLevel} of {levels.length - 1} · {Math.round(spacingM)} m cells ·{" "}
                  {shownCells.length} scored positions
                </span>
                <input
                  type="range"
                  aria-label="Zoom through search levels"
                  min="0"
                  max={levels.length - 1}
                  step="1"
                  value={shownLevel}
                  onChange={(event) => {
                    setShownLevel(Number(event.target.value));
                    setHoverCell(null);
                  }}
                  style={{ accentColor: colors[0] }}
                />
              </label>
            )}
            {shownCells.length > 0 && (
              <span>
                The 12 strongest visible cells show rounded values. Cell (
                {(((hoverCell ?? bestCell)?.x ?? 0) / 1000).toFixed(2)},{" "}
                {(((hoverCell ?? bestCell)?.y ?? 0) / 1000).toFixed(2)}) km · score{" "}
                {(hoverCell ?? bestCell)?.score.toFixed(2)} at {clockText((hoverCell ?? bestCell)?.timeS ?? 0)}
              </span>
            )}
            {shownCells.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Weaker fit</span>
                <span
                  style={{
                    width: 86,
                    height: 8,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${SCORE_COLOURS.join(", ")})`,
                  }}
                />
                <span>Stronger fit</span>
              </div>
            )}
            {shownCells.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Overlay opacity: {Math.round(heatOpacity * 100)}%
                <input
                  type="range"
                  aria-label="Score overlay opacity"
                  min="0"
                  max="1"
                  step="0.05"
                  value={heatOpacity}
                  onChange={(event) => setHeatOpacity(Number(event.target.value))}
                  style={{ flex: 1, accentColor: colors[0] }}
                />
              </label>
            )}
            {shownCells.length > 0 && (
              <span>
                On the full map, red is the highest coarse-grid score ({fullMapBestScore.toFixed(1)}). Zoomed views use
                the search's best score ({globalBestScore.toFixed(1)}) so a weak region stays blue. A score of 100 is a
                perfect curve match; 0 means no matching flight.
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 15, alignContent: "start" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>Day clock preview: {clockText(clockS)}</strong>
              <span style={{ color: muted, fontSize: 12 }}>{active.length} aircraft aloft</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7 }}>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                style={{
                  border: "1px solid var(--border, #ccc)",
                  borderRadius: 7,
                  background: "transparent",
                  padding: "5px 8px",
                }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                aria-label="Day clock"
                min="0"
                max="23.95"
                step="0.05"
                value={clock}
                onChange={(e) => {
                  setPlaying(false);
                  setClock(Number(e.target.value));
                }}
                style={{ flex: 1, accentColor: colors[0] }}
              />
            </div>
            <button
              type="button"
              onClick={() => configure({ startHour: clock })}
              style={{
                marginTop: 8,
                border: "1px solid var(--border, #ccc)",
                borderRadius: 7,
                background: "transparent",
                padding: "5px 8px",
              }}
            >
              Set clip start to {clockText(clockS)}
            </button>
            <p style={{ color: muted, fontSize: 12, margin: "7px 0 0" }}>
              The day clock only previews aircraft positions. Set the clip start to use this hour for the recording. The
              flights stay fixed when you move the microphone or change the clip.
            </p>
          </div>
          <div style={{ borderTop: "1px solid var(--border, #ddd)", paddingTop: 12 }}>
            <strong>Generated clip · start hidden from recovery</strong>
            <div style={{ color: muted, fontSize: 13, marginTop: 5 }}>
              Truth: starts at {clockText(scene.clipStartS)} · {config.clipMinutes} min · Listener (
              {(scene.observer.x / 1000).toFixed(1)}, {(scene.observer.y / 1000).toFixed(1)}) km
            </div>
            <div style={{ fontSize: 13, marginTop: 8 }}>{scene.events.length} audible tonal flights</div>
            <div style={{ display: "grid", gap: 5, marginTop: 5 }}>
              {scene.events.length ? (
                scene.events.map((event) => (
                  <div
                    key={event.id}
                    style={{ display: "flex", justifyContent: "space-between", gap: 8, color: muted, fontSize: 12 }}
                  >
                    <span>
                      <span style={{ color: flightColor(event.truthFlightId) }}>●</span> {event.truthFlightId} ·{" "}
                      {(event.slantM / 1000).toFixed(1)} km slant
                    </span>
                    <span>+{((event.cpaS - scene.clipStartS) / 60).toFixed(1)} min</span>
                  </div>
                ))
              ) : (
                <span style={{ color: muted, fontSize: 12 }}>No detectable flight in this clip.</span>
              )}
            </div>
            {scene.events.length > 0 && (
              <svg
                viewBox="0 0 430 34"
                role="img"
                aria-label="Arrival times of audible flights within the chosen clip"
                style={{ width: "100%", display: "block", marginTop: 8 }}
              >
                <line x1="12" x2="418" y1="16" y2="16" stroke="var(--border, #aaa)" strokeWidth="2" />
                {scene.events.map((event) => (
                  <circle
                    key={event.id}
                    cx={12 + ((event.cpaS - scene.clipStartS) / (config.clipMinutes * 60)) * 406}
                    cy="16"
                    r="5"
                    fill={flightColor(event.truthFlightId)}
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <title>{`${event.truthFlightId}: +${((event.cpaS - scene.clipStartS) / 60).toFixed(1)} min`}</title>
                  </circle>
                ))}
                <text x="12" y="32" fill="currentColor" fontSize="10">
                  start
                </text>
                <text x="418" y="32" fill="currentColor" fontSize="10" textAnchor="end">
                  {config.clipMinutes} min
                </text>
              </svg>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--border, #ddd)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: muted, textTransform: "uppercase" }}>Search</div>
            <div style={{ fontSize: 23, fontWeight: 650 }}>
              {phase === "idle" ? "Ready" : phase === "done" ? "Complete" : `${Math.round(progress * 100)}%`}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              style={{ height: 8, background: "var(--muted, #e4e4e7)", borderRadius: 5, overflow: "hidden" }}
            >
              <div style={{ width: `${progress * 100}%`, height: "100%", background: colors[0] }} />
            </div>
            <p style={{ margin: "6px 0 10px", color: muted, fontSize: 12 }}>
              {phase === "idle"
                ? "Search possible microphone positions and clip starts across the full day."
                : phase === "done"
                  ? `${candidates.length} distinct candidates ranked${searchSeconds === null ? "" : ` in ${searchSeconds.toFixed(1)} s`}`
                  : phase === "generated"
                    ? "Constructing the day's flights"
                    : phase === "coarse"
                      ? "Scoring the full region and proposing clip times from flight arrivals"
                      : "Refining promising place-time hypotheses"}
            </p>
            <p style={{ margin: "0 0 10px", color: muted, fontSize: 12 }}>
              Search the whole map at {Math.round(settings.gridKm * 1000)} m spacing. A single tone proposes starts from
              individual flight arrivals; two or more tones also constrain the gap between flights. Score full curves at
              those starts, then refine promising cells. Select a result to rescore nearby terrain at its time.
            </p>
            {scene.events.length === 0 && (
              <p style={{ margin: "0 0 10px", color: muted, fontSize: 12 }}>
                This clip has no detectable tonal flight, so this curve-based search has no arrival to match. Move the
                microphone or choose another clip before searching.
              </p>
            )}
            {scene.events.length === 1 && (
              <p style={{ margin: "0 0 10px", color: muted, fontSize: 12 }}>
                One tone leaves many possible places and start times. The top score can be high even when the answer is
                far away; compare the ranked alternatives before treating it as a location.
              </p>
            )}
            <label style={{ display: "grid", gap: 4, margin: "0 0 10px", fontSize: 13 }}>
              Search detail
              <select
                value={searchOption < 0 ? "custom" : searchOption}
                onChange={(event) => {
                  const option = SEARCH_OPTIONS[Number(event.target.value)];
                  if (option) tune(option);
                }}
                style={{
                  padding: "7px 9px",
                  borderRadius: 6,
                  border: "1px solid var(--border, #ccc)",
                  background: "var(--background, white)",
                  color: "var(--foreground, #18181b)",
                }}
              >
                {SEARCH_OPTIONS.map((option, index) => (
                  <option value={index} key={option.name}>
                    {option.name}
                  </option>
                ))}
                {searchOption < 0 && <option value="custom">Custom settings</option>}
              </select>
            </label>
            <button
              type="button"
              onClick={run}
              disabled={scene.events.length === 0 || (phase !== "idle" && phase !== "done")}
              style={{
                border: 0,
                borderRadius: 7,
                padding: "8px 12px",
                color: "white",
                background: colors[0],
                opacity: scene.events.length === 0 || (phase !== "idle" && phase !== "done") ? 0.45 : 1,
              }}
            >
              Recover the listener
            </button>
          </div>
        </div>
      </div>
      <details
        style={{ margin: "16px 18px", border: "1px solid var(--border, #ddd)", borderRadius: 8, padding: "10px 12px" }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>World and search parameters</summary>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Terrain width: {config.sizeKm} km
            <input
              type="range"
              min="50"
              max="150"
              step="10"
              value={config.sizeKm}
              onChange={(e) =>
                configure({ sizeKm: Number(e.target.value), observerXKm: undefined, observerYKm: undefined })
              }
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Background flights: {config.nFlights}
            <input
              type="range"
              min="100"
              max="700"
              step="50"
              value={config.nFlights}
              onChange={(e) => configure({ nFlights: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Clip length: {config.clipMinutes} min
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={config.clipMinutes}
              onChange={(e) => configure({ clipMinutes: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Coarse cell: {settings.gridKm} km
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={settings.gridKm}
              onChange={(e) => tune({ gridKm: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Refinement levels: {settings.refineLevels}
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={settings.refineLevels}
              onChange={(e) => tune({ refineLevels: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Cells kept per level: {settings.keep}
            <input
              type="range"
              min="4"
              max="80"
              step="2"
              value={settings.keep}
              onChange={(e) => tune({ keep: Number(e.target.value) })}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => configure({ seed: config.seed + 1 })}
          style={{
            marginTop: 12,
            border: "1px solid var(--border, #ccc)",
            borderRadius: 7,
            background: "transparent",
            padding: "5px 8px",
          }}
        >
          New synthetic day
        </button>
      </details>
      {candidates.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
            gap: 18,
            padding: "0 18px 16px",
          }}
        >
          <div>
            <strong>Top five location and time matches</strong>
            <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
              {candidates.map((candidate, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => inspectCandidate(i)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    textAlign: "left",
                    border: `1px solid ${i === selected ? colors[0] : "var(--border, #ddd)"}`,
                    borderRadius: 8,
                    background: i === selected ? "var(--muted, #f4f4f5)" : "transparent",
                    padding: "9px 10px",
                  }}
                >
                  <span>
                    <strong>#{i + 1}</strong> · ({(candidate.x / 1000).toFixed(1)}, {(candidate.y / 1000).toFixed(1)})
                    km · {clockText(candidate.timeS)}
                  </span>
                  <span style={{ color: muted }}>
                    {Math.round(candidate.errorM)} m, {candidate.timeErrorMin.toFixed(1)} min off · score{" "}
                    {candidate.score.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
            <p style={{ color: muted, fontSize: 12 }}>
              Each row is a different place-time explanation of the same recording. Select one to zoom into its terrain
              and recompute a local score grid at that row’s proposed time. Place and time errors use the constructed
              truth and are shown only for this experiment.
            </p>
          </div>
          <div style={{ display: "grid", gap: 9, alignContent: "start" }}>
            <strong>
              Candidate #{selected + 1} at {chosen ? clockText(chosen.timeS) : "—"}
            </strong>
            {chosen?.matches.length ? (
              chosen.matches.map((match, i) => (
                <CurvePair key={match.eventId} match={match} colour={colors[i % colors.length]!} />
              ))
            ) : (
              <p style={{ color: muted, fontSize: 13 }}>No flight matched the detected tones here.</p>
            )}
          </div>
        </div>
      )}
      <figcaption style={{ padding: "0 18px 16px", color: muted, fontSize: 13 }}>
        This is a constructed day with clean tonal curves and a known flight catalogue. Moving the listener or clip
        changes what is heard from one fixed flight schedule. The two constructed passes cross the same reference area
        near noon; elsewhere or at another hour there may be too few audible tones to recover a place. Recovery proposes
        clip times from timed flight arrivals throughout the day, scores every place-time hypothesis, and refines
        promising cells. Select a ranked result to zoom and recompute a local grid at its proposed time.
      </figcaption>
    </figure>
  );
}

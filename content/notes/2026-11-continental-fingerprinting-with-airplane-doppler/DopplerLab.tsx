import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  curve,
  elevation,
  flightOnPath,
  flightState,
  makeFlight,
  observerAt,
  pathSamples,
  SIZE,
  type Point,
} from "./model";
import { renderTerrainRelief } from "./terrain-relief";

const frame = { border: "1px solid var(--border, #d4d4d8)", borderRadius: 12, overflow: "hidden" as const };
const ink = "var(--foreground, #18181b)";
const muted = "var(--muted-foreground, #71717a)";
const orange = "#e47538";

function Terrain({
  seed,
  points,
  controlPoints,
  observer,
  emitted,
  now,
  onMove,
  onControlMove,
}: {
  seed: number;
  points: { x: number; y: number }[];
  controlPoints: Point[];
  observer: { x: number; y: number };
  emitted: { x: number; y: number };
  now: { x: number; y: number } | null;
  onMove: (x: number, y: number) => void;
  onControlMove: (index: number, x: number, y: number) => void;
}) {
  const dragging = useRef<number | null>(null);
  const relief = useMemo(
    () => renderTerrainRelief((x, y) => elevation(x, y, seed), { x: 0, y: 0, span: SIZE }),
    [seed],
  );
  const position = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE, ((event.clientX - rect.left) / rect.width) * SIZE)),
      y: Math.max(0, Math.min(SIZE, ((event.clientY - rect.top) / rect.height) * SIZE)),
    };
  };
  const scale = (x: number) => (x / SIZE) * 400;
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Synthetic terrain, aircraft path and movable microphone"
      onPointerDown={(event) => {
        const target = event.target instanceof Element ? event.target.closest("[data-control-index]") : null;
        const index = target?.getAttribute("data-control-index");
        event.currentTarget.setPointerCapture(event.pointerId);
        const p = position(event);
        if (index !== null && index !== undefined) {
          dragging.current = Number(index);
          onControlMove(dragging.current, p.x, p.y);
        } else onMove(p.x, p.y);
      }}
      onPointerMove={(event) => {
        if (!event.buttons) return;
        const p = position(event);
        if (dragging.current !== null) onControlMove(dragging.current, p.x, p.y);
        else onMove(p.x, p.y);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
      style={{ display: "block", width: "100%", touchAction: "none", cursor: "crosshair" }}
    >
      <defs>
        <marker id="heard-plane-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={orange} />
        </marker>
      </defs>
      <image href={relief} x="0" y="0" width="400" height="400" preserveAspectRatio="none" />
      <path
        d={controlPoints.map((p, i) => `${i ? "L" : "M"}${scale(p.x).toFixed(1)},${scale(p.y).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="4 5"
        opacity=".8"
      />
      <path
        d={points.map((p, i) => `${i ? "L" : "M"}${scale(p.x).toFixed(1)},${scale(p.y).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        opacity=".85"
      />
      <path
        d={points.map((p, i) => `${i ? "L" : "M"}${scale(p.x).toFixed(1)},${scale(p.y).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#2b4452"
        strokeWidth="2.5"
      />
      <circle
        cx={scale(emitted.x)}
        cy={scale(emitted.y)}
        r={scale(Math.hypot(emitted.x - observer.x, emitted.y - observer.y))}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeDasharray="5 5"
        opacity=".95"
      />
      <circle cx={scale(observer.x)} cy={scale(observer.y)} r="11" fill="#fff" stroke={orange} strokeWidth="3" />
      <circle cx={scale(observer.x)} cy={scale(observer.y)} r="3.5" fill={orange} />
      {now && (
        <path
          d={`M${scale(emitted.x)},${scale(emitted.y)} L${scale(now.x)},${scale(now.y)}`}
          stroke={orange}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#heard-plane-arrow)"
        />
      )}
      <circle cx={scale(emitted.x)} cy={scale(emitted.y)} r="6" fill={orange} stroke="white" strokeWidth="2" />
      {now && <circle cx={scale(now.x)} cy={scale(now.y)} r="7" fill="white" stroke="#223e58" strokeWidth="2.5" />}
      {controlPoints.map((p, i) => (
        <g key={i} data-control-index={i} style={{ cursor: "grab" }}>
          <circle cx={scale(p.x)} cy={scale(p.y)} r="10" fill="white" stroke="#223e58" strokeWidth="2.5" />
          <text
            x={scale(p.x)}
            y={scale(p.y) + 3.5}
            textAnchor="middle"
            fill="#223e58"
            fontSize="10"
            fontWeight="700"
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}
      <text x="11" y="23" fill="#27383e" fontSize="13" fontWeight="700">
        20 × 20 km synthetic terrain
      </text>
      <text x="11" y="385" fill="#27383e" fontSize="12">
        Drag numbered points to change the flight path · click elsewhere to move the microphone
      </text>
    </svg>
  );
}

function Spectrogram({
  samples,
  active,
  sourceHz,
}: {
  samples: ReturnType<typeof curve>;
  active: ReturnType<typeof curve>[number];
  sourceHz: number;
}) {
  const low = 65,
    high = 235,
    left = 44,
    right = 390,
    top = 24,
    bottom = 322;
  const x = (t: number) => left + ((t + 80) / 160) * (right - left);
  const y = (f: number) => bottom - ((f - low) / (high - low)) * (bottom - top);
  const path = (multiple: number) =>
    samples
      .map((s, i) => `${i ? "L" : "M"}${x(s.arrival).toFixed(1)},${y(s.frequency * multiple).toFixed(1)}`)
      .join(" ");
  return (
    <svg
      viewBox="0 0 410 400"
      role="img"
      aria-label="Synthetic time-frequency spectrogram of the received propeller tone"
      style={{ display: "block", width: "100%", background: "#111923" }}
    >
      {[80, 120, 160, 200].map((f) => (
        <g key={f}>
          <line x1={left} x2={right} y1={y(f)} y2={y(f)} stroke="#60717d" opacity=".24" />
          <text x="8" y={y(f) + 4} fill="#c2cbd1" fontSize="11">
            {f}
          </text>
        </g>
      ))}
      {[-60, 0, 60].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={bottom} stroke="#60717d" opacity=".24" />
          <text x={x(t) - 8} y="344" fill="#c2cbd1" fontSize="11">
            {t}
          </text>
        </g>
      ))}
      {Array.from({ length: 48 }, (_, i) => {
        const yy = top + ((i * 37) % 291);
        return <line key={i} x1={left} x2={right} y1={yy} y2={yy} stroke="#9bb4bf" opacity={0.025 + (i % 5) * 0.006} />;
      })}
      <line
        x1={left}
        x2={right}
        y1={y(sourceHz)}
        y2={y(sourceHz)}
        stroke="#d9e1e5"
        strokeWidth="1.4"
        strokeDasharray="6 4"
        opacity=".85"
      />
      <text x={right - 5} y={y(sourceHz) - 7} fill="#d9e1e5" fontSize="11" textAnchor="end">
        emitted {sourceHz} Hz
      </text>
      {[1, 1.5].map((m, i) => (
        <g key={m}>
          <path
            d={path(m)}
            fill="none"
            stroke={i ? "#f0ac78" : orange}
            strokeWidth={i ? 7 : 12}
            opacity={i ? 0.1 : 0.13}
          />
          <path
            d={path(m)}
            fill="none"
            stroke={i ? "#f0ac78" : "#ffc289"}
            strokeWidth={i ? 1.5 : 2.4}
            opacity={i ? 0.46 : 0.94}
          />
        </g>
      ))}
      <line
        x1={x(active.arrival)}
        x2={x(active.arrival)}
        y1={top}
        y2={bottom}
        stroke="#fff"
        opacity=".6"
        strokeDasharray="4 4"
      />
      <circle cx={x(active.arrival)} cy={y(active.frequency)} r="5" fill="#fff" stroke={orange} strokeWidth="2.5" />
      <text x="44" y="16" fill="#d9e1e5" fontSize="12" fontWeight="700">
        received tone and harmonic
      </text>
      <text x="178" y="377" fill="#c2cbd1" fontSize="12">
        arrival time from centre (s)
      </text>
      <text transform="translate(10 256) rotate(-90)" fill="#c2cbd1" fontSize="12">
        frequency (Hz)
      </text>
    </svg>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4, minWidth: 130, flex: "1 1 140px", color: muted, fontSize: 13 }}>
      <span>
        {label}{" "}
        <strong style={{ color: ink }}>
          {value} {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: orange, width: "100%" }}
      />
    </label>
  );
}

/** Move the observer or flight settings and see the received, delayed Doppler ridge change. */
export function DopplerLab() {
  const [seed, setSeed] = useState(3);
  const [point, setPoint] = useState({ x: 10_200, y: 7_800 });
  const [speed, setSpeed] = useState(92);
  const [altitude, setAltitude] = useState(2700);
  const [pitch, setPitch] = useState(135);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [controlPoints, setControlPoints] = useState<Point[] | null>(null);
  const baseFlight = useMemo(() => {
    const made = makeFlight(seed, { speed, altitude, f0: pitch });
    return {
      ...made,
      points: made.points.map((p, i) => ({
        ...p,
        x: i === 0 ? 600 : i === made.points.length - 1 ? SIZE - 600 : p.x,
      })),
    };
  }, [seed, speed, altitude, pitch]);
  const flight = useMemo(
    () => ({ ...baseFlight, points: controlPoints ?? baseFlight.points }),
    [baseFlight, controlPoints],
  );
  const observer = useMemo(() => observerAt(point.x, point.y, seed), [point, seed]);
  const samples = useMemo(() => curve(flight, observer, -80, 80, 1), [flight, observer]);
  const start = samples[0]!.arrival;
  const end = samples[samples.length - 1]!.arrival;
  const selectedTime = Math.max(start, Math.min(end, time));
  const active = samples.reduce((a, b) =>
    Math.abs(b.arrival - selectedTime) < Math.abs(a.arrival - selectedTime) ? b : a,
  );
  const now = flightOnPath(flight, active.arrival) ? flightState(flight, active.arrival).position : null;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTime((t) => (t >= end ? start : Math.min(end, t + 1.5))), 50);
    return () => window.clearInterval(id);
  }, [playing, start, end]);
  const nearest = samples.reduce((a, b) => (b.slant < a.slant ? b : a));
  const drop = samples[0]!.frequency - samples[samples.length - 1]!.frequency;
  return (
    <figure style={{ ...frame, margin: "1.5rem 0", background: "var(--background, white)", color: ink }}>
      <div style={{ padding: "16px 18px 12px" }}>
        <strong style={{ fontSize: 18 }}>Flight path and received pitch</strong>
        <p style={{ margin: "5px 0 0", fontSize: 14, color: muted }}>
          The horizontal dashed line is the plane's emitted frequency. The curve shows the pitch received at the
          microphone as the flight path changes. Drag a numbered point or move the microphone to compare them.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 10,
          padding: "0 10px",
        }}
      >
        <Terrain
          seed={seed}
          points={pathSamples(flight)}
          controlPoints={flight.points}
          observer={point}
          emitted={active}
          now={now}
          onMove={(x, y) => setPoint({ x, y })}
          onControlMove={(index, x, y) =>
            setControlPoints((old) => {
              const next = [...(old ?? baseFlight.points)];
              next[index] = { x, y };
              return next;
            })
          }
        />
        <Spectrogram samples={samples} active={active} sourceHz={pitch} />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px 0" }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          style={{
            border: "1px solid var(--border, #ccc)",
            borderRadius: 7,
            padding: "5px 9px",
            background: "transparent",
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label style={{ display: "grid", gap: 3, flex: 1, color: muted, fontSize: 13 }}>
          Heard time: {active.arrival.toFixed(0)} s
          <input
            type="range"
            min={start}
            max={end}
            step="1"
            value={selectedTime}
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
            style={{ width: "100%", accentColor: orange }}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, padding: "16px 18px" }}>
        <Range label="speed" value={speed} min={45} max={155} step={1} unit="m/s" onChange={setSpeed} />
        <Range label="altitude" value={altitude} min={1200} max={6000} step={100} unit="m" onChange={setAltitude} />
        <Range label="source tone" value={pitch} min={100} max={170} step={1} unit="Hz" onChange={setPitch} />
        <button
          type="button"
          onClick={() => {
            setControlPoints(null);
            setSeed((s) => s + 1);
          }}
          style={{
            alignSelf: "end",
            border: "1px solid var(--border, #ccc)",
            borderRadius: 7,
            padding: "5px 9px",
            background: "transparent",
            color: ink,
            cursor: "pointer",
          }}
        >
          New path and terrain
        </button>
        <button
          type="button"
          onClick={() => setControlPoints(null)}
          style={{
            alignSelf: "end",
            border: "1px solid var(--border, #ccc)",
            borderRadius: 7,
            padding: "5px 9px",
            background: "transparent",
            color: ink,
          }}
        >
          Reset path points
        </button>
      </div>
      <figcaption style={{ padding: "0 18px 16px", fontSize: 13, color: muted }}>
        Closest slant range: {(nearest.slant / 1000).toFixed(2)} km · Frequency drop: {drop.toFixed(1)} Hz · Ground
        elevation at microphone: {Math.round(elevation(point.x, point.y, seed))} m. The orange point emitted the
        selected sound {Math.round(active.arrival - active.emission)} s earlier. The dashed ring is its wavefront at
        microphone height.{" "}
        {now
          ? "The arrow reaches the plane at the heard time."
          : "The plane has left the constructed path by the heard time."}{" "}
        The curve ends when the plane leaves its constructed path.
      </figcaption>
    </figure>
  );
}

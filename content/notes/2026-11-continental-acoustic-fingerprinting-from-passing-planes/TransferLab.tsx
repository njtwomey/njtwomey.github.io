import { useMemo, useRef, useState, type PointerEvent } from "react";
import {
  elevation,
  flightOnPath,
  observerAt,
  pathSamples,
  receivedAt,
  SIZE,
  translatedAt,
  type Flight,
  type Point,
} from "./model";
import { renderTerrainRelief } from "./terrain-relief";

const orange = "#d8662e";
const blue = "#1686b0";
const muted = "var(--muted-foreground, #71717a)";
const frame = { border: "1px solid var(--border, #d4d4d8)", borderRadius: 10, overflow: "hidden" as const };

export function TransferLab() {
  const [points, setPoints] = useState<Point[]>([
    { x: 1000, y: 3500 },
    { x: 5000, y: 6500 },
    { x: 10000, y: 11000 },
    { x: 15000, y: 13500 },
    { x: 19000, y: 17000 },
  ]);
  const [microphone, setMicrophone] = useState<Point>({ x: 12500, y: 6500 });
  const [speed, setSpeed] = useState(90);
  const [altitude, setAltitude] = useState(3000);
  const [sourceHz, setSourceHz] = useState(135);
  const [microphoneHeight, setMicrophoneHeight] = useState(2);
  const drag = useRef<number | "microphone" | null>(null);
  const relief = useMemo(() => renderTerrainRelief((x, y) => elevation(x, y, 3), { x: 0, y: 0, span: SIZE }), []);
  const flight = useMemo<Flight>(
    () => ({ points, speed, altitude, f0: sourceHz, cpaArrival: 0 }),
    [points, speed, altitude, sourceHz],
  );
  const observer = useMemo(() => {
    const ground = observerAt(microphone.x, microphone.y, 3);
    return { ...ground, z: ground.z - 2 + microphoneHeight };
  }, [microphone, microphoneHeight]);
  const { direct, backward, maxDifference } = useMemo(() => {
    let lo = 0,
      hi = 1000;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (flightOnPath(flight, mid)) lo = mid;
      else hi = mid;
    }
    const half = lo;
    const direct = Array.from({ length: 161 }, (_, i) => translatedAt(flight, observer, -half + (2 * half * i) / 160));
    const first = direct[0]!.arrival,
      last = direct[direct.length - 1]!.arrival;
    const backward = Array.from({ length: 41 }, (_, i) =>
      receivedAt(flight, observer, first + ((last - first) * (i + 0.5)) / 41),
    );
    const maxDifference = Math.max(
      ...backward.map((sample) =>
        Math.abs(sample.frequency - translatedAt(flight, observer, sample.emission).frequency),
      ),
    );
    return { direct, backward, maxDifference };
  }, [flight, observer]);

  const mapScale = (v: number) => (v / SIZE) * 350;
  const mapPosition = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE, ((event.clientX - rect.left) / rect.width) * SIZE)),
      y: Math.max(0, Math.min(SIZE, ((event.clientY - rect.top) / rect.height) * SIZE)),
    };
  };
  const move = (point: Point) => {
    const target = drag.current;
    if (target === "microphone") setMicrophone(point);
    else if (typeof target === "number") setPoints((old) => old.map((p, i) => (i === target ? point : p)));
  };
  const mapPath = pathSamples(flight, 121)
    .map((p, i) => `${i ? "L" : "M"}${mapScale(p.x).toFixed(1)},${mapScale(p.y).toFixed(1)}`)
    .join(" ");
  const left = 48,
    right = 405,
    top = 24,
    bottom = 295;
  const firstArrival = direct[0]!.arrival,
    lastArrival = direct[direct.length - 1]!.arrival;
  const minFrequency = Math.min(sourceHz, ...direct.map((sample) => sample.frequency)) - 6;
  const maxFrequency = Math.max(sourceHz, ...direct.map((sample) => sample.frequency)) + 6;
  const chartX = (t: number) => left + ((t - firstArrival) / (lastArrival - firstArrival)) * (right - left);
  const chartY = (f: number) => bottom - ((f - minFrequency) / (maxFrequency - minFrequency)) * (bottom - top);
  const chartPath = direct
    .map((sample, i) => `${i ? "L" : "M"}${chartX(sample.arrival).toFixed(2)},${chartY(sample.frequency).toFixed(2)}`)
    .join(" ");

  return (
    <div style={{ ...frame, padding: 16, background: "var(--background, #fff)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 650, marginBottom: 7 }}>Flight path and microphone</div>
          <svg
            viewBox="0 0 350 350"
            role="img"
            aria-label="Flight path with draggable waypoints and microphone"
            onPointerDown={(event) => {
              const target = event.target instanceof Element ? event.target.closest("[data-drag]") : null;
              const value = target?.getAttribute("data-drag");
              drag.current = value === "microphone" ? "microphone" : value ? Number(value) : "microphone";
              event.currentTarget.setPointerCapture(event.pointerId);
              move(mapPosition(event));
            }}
            onPointerMove={(event) => {
              if (event.buttons) move(mapPosition(event));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            style={{ display: "block", width: "100%", touchAction: "none", cursor: "crosshair" }}
          >
            <image href={relief} x="0" y="0" width="350" height="350" preserveAspectRatio="none" />
            <path d={mapPath} fill="none" stroke="white" strokeWidth="5" opacity=".9" />
            <path d={mapPath} fill="none" stroke="#284653" strokeWidth="2.5" />
            {points.map((point, i) => (
              <g key={i} data-drag={String(i)} style={{ cursor: "grab" }}>
                <circle
                  cx={mapScale(point.x)}
                  cy={mapScale(point.y)}
                  r="11"
                  fill="white"
                  stroke="#284653"
                  strokeWidth="2.5"
                />
                <text
                  x={mapScale(point.x)}
                  y={mapScale(point.y) + 3.5}
                  fill="#284653"
                  fontSize="10"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {i + 1}
                </text>
              </g>
            ))}
            <g data-drag="microphone" style={{ cursor: "grab" }}>
              <circle
                cx={mapScale(microphone.x)}
                cy={mapScale(microphone.y)}
                r="12"
                fill="white"
                stroke={orange}
                strokeWidth="3"
              />
              <circle cx={mapScale(microphone.x)} cy={mapScale(microphone.y)} r="4" fill={orange} />
            </g>
            <text x="10" y="20" fill="#243b41" fontWeight="700" fontSize="12">
              20 × 20 km terrain
            </text>
            <text x="10" y="337" fill="#243b41" fontSize="11">
              Drag a numbered point or the microphone
            </text>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 650, marginBottom: 7 }}>Received frequency at the microphone</div>
          <svg
            viewBox="0 0 430 350"
            role="img"
            aria-label="Directly translated and backward-calculated received frequencies"
            style={{ display: "block", width: "100%" }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
              const frequency = minFrequency + fraction * (maxFrequency - minFrequency);
              return (
                <g key={fraction}>
                  <line
                    x1={left}
                    x2={right}
                    y1={chartY(frequency)}
                    y2={chartY(frequency)}
                    stroke="var(--border, #d4d4d8)"
                  />
                  <text x={left - 7} y={chartY(frequency) + 4} textAnchor="end" fill="currentColor" fontSize="10">
                    {Math.round(frequency)}
                  </text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <text
                key={fraction}
                x={left + fraction * (right - left)}
                y="316"
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
              >
                {Math.round(fraction * (lastArrival - firstArrival))}
              </text>
            ))}
            <line
              x1={left}
              x2={right}
              y1={chartY(sourceHz)}
              y2={chartY(sourceHz)}
              stroke="var(--muted-foreground, #71717a)"
              strokeDasharray="5 4"
            />
            <path d={chartPath} fill="none" stroke={orange} strokeWidth="2.5" />
            {backward.map((sample, i) => (
              <circle
                key={i}
                cx={chartX(sample.arrival)}
                cy={chartY(sample.frequency)}
                r="3"
                fill={blue}
                stroke="var(--background, white)"
                strokeWidth=".6"
              />
            ))}
            <text x="5" y="13" fill="currentColor" fontSize="11">
              Hz
            </text>
            <text x={right} y="340" textAnchor="end" fill="currentColor" fontSize="11">
              seconds after first arrival
            </text>
          </svg>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 15px", fontSize: 12, color: muted }}>
            <span>
              <span style={{ color: orange }}>━━</span> Analytical translation from flight path
            </span>
            <span>
              <span style={{ color: blue }}>●</span> Solved backward from arrival time
            </span>
            <span>Largest difference: {maxDifference < 0.001 ? "<0.001" : maxDifference.toFixed(3)} Hz</span>
          </div>
        </div>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 16 }}
      >
        {(
          [
            ["Aircraft speed", speed, setSpeed, 55, 140, 1, "m/s"],
            ["Aircraft altitude", altitude, setAltitude, 1000, 4000, 100, "m"],
            ["Emitted tone", sourceHz, setSourceHz, 90, 180, 1, "Hz"],
            ["Microphone above ground", microphoneHeight, setMicrophoneHeight, 0, 50, 1, "m"],
          ] as const
        ).map(([label, value, setValue, min, max, step, unit]) => (
          <label key={label} style={{ display: "grid", gap: 3, fontSize: 12, color: muted }}>
            <span>
              {label}: {value} {unit}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Plane as PlaneIcon } from "lucide-react";
import { elevation, SOUND_SPEED } from "./model";

const TOP = 4_000;
// Keep the same metres-per-pixel scale on both axes so sound fronts appear circular.
const WORLD = (652 * TOP) / 306;
const Y_SLICE = 8_000;
const A = { x: 1_000, z: 3_000, speed: 88, colour: "var(--foreground, #18181b)" };
const B = { x: 7_700, z: 3_600, speed: -76, colour: "var(--muted-foreground, #71717a)" };
const sx = (x: number) => 34 + (x / WORLD) * 652;
const sy = (z: number) => 350 - (z / TOP) * 306;
const xScale = 652 / WORLD;
const ground = (x: number) => elevation(x, Y_SLICE, 3);
const PULSE_INTERVAL = 1.5;
const PULSE_TIMES = Array.from({ length: 20 }, (_, i) => i * PULSE_INTERVAL);

type Point = { x: number; z: number };
function intersections(p: Point, q: Point, radius: number): Point[] {
  const dx = q.x - p.x,
    dz = q.z - p.z,
    distance = Math.hypot(dx, dz);
  if (distance > 2 * radius || distance === 0) return [];
  const half = distance / 2,
    h = Math.sqrt(Math.max(0, radius * radius - half * half));
  const mx = (p.x + q.x) / 2,
    mz = (p.z + q.z) / 2;
  return [
    { x: mx - (dz / distance) * h, z: mz + (dx / distance) * h },
    { x: mx + (dz / distance) * h, z: mz - (dx / distance) * h },
  ];
}
const sourceAt = (plane: typeof A, emission: number): Point => ({ x: plane.x + plane.speed * emission, z: plane.z });
function lowerCrossing(emission: number, arrival: number, planeA: typeof A): Point | undefined {
  const p = sourceAt(planeA, emission),
    q = sourceAt(B, emission);
  return intersections(p, q, SOUND_SPEED * (arrival - emission))
    .filter((point) => point.x >= 0 && point.x <= WORLD && point.z >= ground(point.x) && point.z <= TOP)
    .sort((a, b) => a.z - b.z)[0];
}
function crossingHistory(emission: number, now: number, planeA: typeof A): Point[] {
  const p = sourceAt(planeA, emission),
    q = sourceAt(B, emission);
  const first = emission + Math.hypot(p.x - q.x, p.z - q.z) / (2 * SOUND_SPEED);
  if (first >= now) return [];
  const out: Point[] = [];
  for (let i = 0; i <= 40; i++) {
    const at = first + ((now - first) * i) / 40;
    const crossing = lowerCrossing(emission, at, planeA);
    if (!crossing) break;
    out.push(crossing);
  }
  return out;
}

function Plane({ x, z, colour, label }: { x: number; z: number; colour: string; label: string }) {
  return (
    <g transform={`translate(${sx(x)} ${sy(z)})`}>
      <circle r="15" fill="var(--background, white)" opacity=".92" />
      <PlaneIcon x={-13} y={-13} width={26} height={26} color={colour} strokeWidth={2.5} />
      <text x="18" y="4" fontSize="12" fontWeight="700" fill={colour}>
        {label}
      </text>
    </g>
  );
}

/** An acoustic cross-section: moving sources, expanding spherical wavefronts, and one slant-range triangle. */
export function WavefrontLab() {
  const [time, setTime] = useState(0);
  const [listenerX, setListenerX] = useState(7_050);
  const [speed, setSpeed] = useState(A.speed);
  const [altitude, setAltitude] = useState(A.z);
  const [micHeight, setMicHeight] = useState(2);
  const [two, setTwo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hitPulse, setHitPulse] = useState<number | null>(null);
  const timeRef = useRef(time);
  const planeA = { ...A, speed, z: altitude };
  useEffect(() => {
    timeRef.current = time;
  }, [time]);
  useEffect(() => {
    if (!playing) return;
    const listener = { x: listenerX, z: ground(listenerX) + micHeight };
    const id = window.setInterval(() => {
      const current = timeRef.current;
      const next = current >= 28 ? 0 : Math.min(28, current + 0.12);
      if (next > current) {
        const arrival = PULSE_TIMES.map((emission) => {
          const origin = sourceAt(planeA, emission);
          return { emission, time: emission + Math.hypot(listener.x - origin.x, listener.z - origin.z) / SOUND_SPEED };
        })
          .filter((pulse) => pulse.time > current + 1e-5 && pulse.time <= next)
          .sort((a, b) => a.time - b.time)[0];
        if (arrival) {
          timeRef.current = arrival.time;
          setTime(arrival.time);
          setHitPulse(arrival.emission);
          setPlaying(false);
          return;
        }
      }
      timeRef.current = next;
      setTime(next);
    }, 33);
    return () => window.clearInterval(id);
  }, [playing, listenerX, micHeight, speed, altitude]);
  const terrain = useMemo(
    () =>
      Array.from({ length: 131 }, (_, i) => {
        const x = (i / 130) * WORLD;
        return { x, z: ground(x) };
      }),
    [],
  );
  const listener = { x: listenerX, z: ground(listenerX) + micHeight };
  const selectedEmission = hitPulse ?? 0;
  const selectedSource = sourceAt(planeA, selectedEmission);
  const horizontal = Math.abs(listener.x - selectedSource.x);
  const vertical = Math.abs(selectedSource.z - listener.z);
  const slant = Math.hypot(horizontal, vertical);
  const delay = slant / SOUND_SPEED;
  const radial = (speed * (selectedSource.x - listener.x)) / Math.max(1, slant);
  const pitchFactor = 1 / (1 + radial / SOUND_SPEED);
  const aheadSpacing = (SOUND_SPEED - speed) * PULSE_INTERVAL;
  const behindSpacing = (SOUND_SPEED + speed) * PULSE_INTERVAL;
  const radius = SOUND_SPEED * time;
  const lower = two ? lowerCrossing(0, time, planeA) : undefined;
  const nearListener = Math.abs(time - selectedEmission - delay) < 0.12;
  const otherSource = sourceAt(B, selectedEmission);
  const otherDelay = Math.hypot(listener.x - otherSource.x, listener.z - otherSource.z) / SOUND_SPEED;
  const bothNear = two && nearListener && Math.abs(time - selectedEmission - otherDelay) < 0.12;
  const terrainPath = terrain.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.z).toFixed(1)}`).join(" ");
  const moveListener = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((((event.clientX - box.left) / box.width) * 720 - 34) / 652) * WORLD;
    setListenerX(Math.max(0, Math.min(WORLD, x)));
    setPlaying(false);
    setTime(0);
    timeRef.current = 0;
    setHitPulse(null);
  };
  const pulses = PULSE_TIMES.filter((t) => t <= time);
  const histories = two
    ? pulses
        .map((emission) => ({ emission, points: crossingHistory(emission, time, planeA) }))
        .filter((h) => h.points.length > 1)
    : [];
  const currentCrossings = two
    ? pulses
        .map((emission) => ({ emission, point: lowerCrossing(emission, time, planeA) }))
        .filter((h) => h.point !== undefined)
    : [];
  return (
    <figure
      style={{
        border: "1px solid var(--border, #d4d4d8)",
        borderRadius: 12,
        overflow: "hidden",
        margin: "1.5rem 0",
        color: "var(--foreground, #18181b)",
        background: "var(--background, white)",
      }}
    >
      <div style={{ padding: "16px 18px 10px" }}>
        <strong style={{ fontSize: 18 }}>Sound travel from plane to microphone</strong>
        <p style={{ margin: "5px 0 0", color: "var(--muted-foreground, #71717a)", fontSize: 14 }}>
          Each ring starts at the aircraft's position when it emits a pulse. The first pulse leaves at time zero; the
          next follows 1.5 seconds later.
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox="0 0 720 410"
          role="img"
          aria-label="Side view of two aircraft, expanding sound wavefronts, terrain and a slant-distance triangle"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            moveListener(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons) moveListener(event);
          }}
          style={{
            display: "block",
            width: "100%",
            minWidth: 600,
            cursor: "crosshair",
            touchAction: "none",
            background: "var(--background, white)",
          }}
        >
          <defs>
            <clipPath id="wavefront-clip">
              <rect x="34" y="36" width="652" height="314" />
            </clipPath>
          </defs>
          {[0, 2_000, 4_000].map((z) => (
            <g key={z}>
              <line x1="34" x2="686" y1={sy(z)} y2={sy(z)} stroke="var(--border, #d4d4d8)" opacity=".5" />
              <text x="3" y={sy(z) + 4} fill="var(--muted-foreground, #71717a)" fontSize="11">
                {z / 1000}
              </text>
            </g>
          ))}
          <text x="37" y="28" fill="var(--muted-foreground, #71717a)" fontSize="11">
            height above sea level (km)
          </text>
          {two && (
            <g>
              <line x1="470" x2="495" y1="25" y2="25" stroke="var(--foreground, #18181b)" strokeWidth="3" />
              <text x="502" y="29" fill="var(--foreground, #18181b)" fontSize="11">
                matched-pulse crossings
              </text>
            </g>
          )}
          <g clipPath="url(#wavefront-clip)">
            {pulses
              .filter((t) => t !== 0)
              .map((t) => (
                <circle
                  key={`a-${t}`}
                  cx={sx(planeA.x + planeA.speed * t)}
                  cy={sy(planeA.z)}
                  r={(time - t) * SOUND_SPEED * xScale}
                  fill="none"
                  stroke={A.colour}
                  strokeWidth="1.5"
                  opacity=".36"
                />
              ))}
            {two &&
              pulses
                .filter((t) => t !== 0)
                .map((t) => (
                  <circle
                    key={`b-${t}`}
                    cx={sx(B.x + B.speed * t)}
                    cy={sy(B.z)}
                    r={(time - t) * SOUND_SPEED * xScale}
                    fill="none"
                    stroke={B.colour}
                    strokeWidth="1.5"
                    opacity=".36"
                  />
                ))}
            <circle
              cx={sx(planeA.x)}
              cy={sy(planeA.z)}
              r={radius * xScale}
              fill="none"
              stroke={A.colour}
              strokeWidth="4"
              opacity=".85"
            />
            {two && (
              <circle
                cx={sx(B.x)}
                cy={sy(B.z)}
                r={radius * xScale}
                fill="none"
                stroke={B.colour}
                strokeWidth="4"
                opacity=".85"
              />
            )}
          </g>
          <path d={`${terrainPath} L686,352 L34,352 Z`} fill="var(--muted, #f4f4f5)" opacity=".65" />
          <path d={terrainPath} fill="none" stroke="var(--muted-foreground, #71717a)" strokeWidth="2" />
          {histories.map(({ emission, points }) => (
            <path
              key={`history-${emission}`}
              d={points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.z).toFixed(1)}`).join(" ")}
              fill="none"
              stroke="var(--foreground, #18181b)"
              strokeWidth={emission === 0 ? 3.2 : 2.2}
              opacity={emission === 0 ? 0.9 : 0.58}
            />
          ))}
          {currentCrossings
            .filter(({ emission }) => emission !== 0)
            .map(({ emission, point }) => (
              <circle
                key={`crossing-${emission}`}
                cx={sx(point!.x)}
                cy={sy(point!.z)}
                r="3.5"
                fill="var(--foreground, #18181b)"
                stroke="var(--background, white)"
                strokeWidth="1"
              />
            ))}
          {pulses
            .filter((_, i) => i % 3 === 0)
            .map((t) => (
              <circle
                key={`origin-a-${t}`}
                cx={sx(planeA.x + planeA.speed * t)}
                cy={sy(planeA.z)}
                r="2"
                fill={A.colour}
                opacity=".75"
              />
            ))}
          {two &&
            pulses
              .filter((_, i) => i % 3 === 0)
              .map((t) => (
                <circle
                  key={`origin-b-${t}`}
                  cx={sx(B.x + B.speed * t)}
                  cy={sy(B.z)}
                  r="2"
                  fill={B.colour}
                  opacity=".75"
                />
              ))}
          <circle
            cx={sx(planeA.x)}
            cy={sy(planeA.z)}
            r="5"
            fill="var(--background, white)"
            stroke={A.colour}
            strokeWidth="2"
          />
          {hitPulse !== null && (
            <circle
              cx={sx(selectedSource.x)}
              cy={sy(selectedSource.z)}
              r={(time - hitPulse) * SOUND_SPEED * xScale}
              fill="none"
              stroke="var(--foreground, #18181b)"
              strokeWidth="5"
              opacity=".9"
              clipPath="url(#wavefront-clip)"
            />
          )}
          {hitPulse !== null && (
            <circle
              cx={sx(selectedSource.x)}
              cy={sy(selectedSource.z)}
              r="6"
              fill="var(--foreground, #18181b)"
              stroke="var(--background, white)"
              strokeWidth="2"
            />
          )}
          {two && (
            <circle cx={sx(B.x)} cy={sy(B.z)} r="5" fill="var(--background, white)" stroke={B.colour} strokeWidth="2" />
          )}
          <Plane x={planeA.x + planeA.speed * time} z={planeA.z} colour={A.colour} label="plane now" />
          {two && <Plane x={B.x + B.speed * time} z={B.z} colour={B.colour} label="plane 2 now" />}
          <path
            d={`M${sx(selectedSource.x)},${sy(selectedSource.z)} L${sx(listener.x)},${sy(listener.z)}`}
            fill="none"
            stroke="var(--foreground, #18181b)"
            strokeWidth="2"
          />
          <path
            d={`M${sx(selectedSource.x)},${sy(selectedSource.z)} L${sx(listener.x)},${sy(selectedSource.z)} L${sx(listener.x)},${sy(listener.z)}`}
            fill="none"
            stroke="var(--foreground, #18181b)"
            strokeDasharray="5 4"
            opacity=".8"
          />
          <text
            x={(sx(selectedSource.x) + sx(listener.x)) / 2 + 60}
            y={sy(selectedSource.z) - 7}
            fontSize="11"
            fill="var(--foreground, #18181b)"
          >
            horizontal
          </text>
          <text
            x={sx(listener.x) + 8}
            y={(sy(selectedSource.z) + sy(listener.z)) / 2}
            fontSize="11"
            fill="var(--foreground, #18181b)"
          >
            vertical
          </text>
          <text
            x={(sx(selectedSource.x) + sx(listener.x)) / 2 - 15}
            y={(sy(selectedSource.z) + sy(listener.z)) / 2 + 18}
            fontSize="11"
            fill="var(--foreground, #18181b)"
          >
            slant
          </text>
          <rect
            x={sx(listener.x) - 5}
            y={sy(selectedSource.z) - 5}
            width="10"
            height="10"
            fill="none"
            stroke="var(--foreground, #18181b)"
            strokeWidth="1.5"
          />
          <circle
            cx={sx(listener.x)}
            cy={sy(listener.z)}
            r="8"
            fill={bothNear ? "var(--foreground, #18181b)" : "var(--background, white)"}
            stroke="var(--foreground, #18181b)"
            strokeWidth="2.5"
          />
          <text
            x={sx(listener.x) + 12}
            y={sy(listener.z) - 12}
            fontSize="12"
            fill="var(--foreground, #18181b)"
            fontWeight="700"
          >
            listener
          </text>
          {lower && (
            <g>
              <circle
                cx={sx(lower.x)}
                cy={sy(lower.z)}
                r="8"
                fill="var(--background, white)"
                stroke="var(--foreground, #18181b)"
                strokeWidth="2.5"
              />
              <text x={sx(lower.x) - 90} y={sy(lower.z) - 14} fontSize="11" fill="var(--foreground, #18181b)">
                ring crossing
              </text>
            </g>
          )}
          <text x="34" y="386" fontSize="12" fill="var(--muted-foreground, #71717a)">
            Drag the listener · thin rings begin at successive aircraft positions
          </text>
        </svg>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", padding: "14px 18px" }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          style={{
            border: "1px solid var(--border, #ccc)",
            background: "transparent",
            borderRadius: 7,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label style={{ display: "grid", gap: 3, flex: "1 1 240px", fontSize: 13 }}>
          Time: {time.toFixed(1)} s
          <input
            type="range"
            min="0"
            max="28"
            step="0.1"
            value={time}
            onChange={(e) => {
              setPlaying(false);
              setHitPulse(null);
              setTime(Number(e.target.value));
            }}
            style={{ width: "100%", accentColor: A.colour }}
          />
        </label>
        <label style={{ display: "grid", gap: 3, flex: "1 1 150px", fontSize: 13 }}>
          Plane speed: {speed} m/s
          <input
            type="range"
            min="40"
            max="200"
            step="5"
            value={speed}
            onChange={(e) => {
              setPlaying(false);
              setHitPulse(null);
              setTime(0);
              timeRef.current = 0;
              setSpeed(Number(e.target.value));
            }}
            style={{ accentColor: A.colour }}
          />
        </label>
        <label style={{ display: "grid", gap: 3, flex: "1 1 150px", fontSize: 13 }}>
          Plane altitude: {altitude} m
          <input
            type="range"
            min="1000"
            max="4000"
            step="100"
            value={altitude}
            onChange={(e) => {
              setPlaying(false);
              setHitPulse(null);
              setTime(0);
              timeRef.current = 0;
              setAltitude(Number(e.target.value));
            }}
            style={{ accentColor: A.colour }}
          />
        </label>
        <label style={{ display: "grid", gap: 3, flex: "1 1 150px", fontSize: 13 }}>
          Microphone above ground: {micHeight} m
          <input
            type="range"
            min="0"
            max="500"
            step="1"
            value={micHeight}
            onChange={(e) => {
              setPlaying(false);
              setHitPulse(null);
              setTime(0);
              timeRef.current = 0;
              setMicHeight(Number(e.target.value));
            }}
            style={{ accentColor: A.colour }}
          />
        </label>
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={two}
            onChange={(e) => setTwo(e.target.checked)}
            style={{ accentColor: B.colour }}
          />{" "}
          Show second plane
        </label>
      </div>
      <p style={{ margin: "0 18px 12px", color: "var(--muted-foreground, #71717a)", fontSize: 13 }}>
        At {speed} m/s, successive wavefronts are {Math.round(aheadSpacing)} m apart ahead of the plane and{" "}
        {Math.round(behindSpacing)} m apart behind it. The closer spacing ahead means a higher arriving frequency.
      </p>
      {hitPulse !== null && (
        <p style={{ margin: "0 18px 12px", color: "var(--muted-foreground, #71717a)", fontSize: 13 }}>
          Paused as a pulse emitted at {hitPulse.toFixed(1)} s reaches the listener at {time.toFixed(1)} s. The plane is
          now {Math.round(speed * (time - hitPulse))} m beyond the point where it emitted that pulse. At emission, its
          motion toward or away from the listener gives a frequency factor of {pitchFactor.toFixed(2)}×. Press Play for
          the next pulse.
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          padding: "0 18px 16px",
          fontSize: 13,
        }}
      >
        <div style={{ background: "var(--muted, #f4f4f5)", borderRadius: 8, padding: "8px 10px" }}>
          Horizontal <strong>{(horizontal / 1000).toFixed(2)} km</strong>
        </div>
        <div style={{ background: "var(--muted, #f4f4f5)", borderRadius: 8, padding: "8px 10px" }}>
          Vertical <strong>{(vertical / 1000).toFixed(2)} km</strong>
        </div>
        <div style={{ background: "var(--muted, #f4f4f5)", borderRadius: 8, padding: "8px 10px" }}>
          Slant √(h² + v²) <strong>{(slant / 1000).toFixed(2)} km</strong>
        </div>
        <div style={{ background: "var(--muted, #f4f4f5)", borderRadius: 8, padding: "8px 10px" }}>
          Arrival delay <strong>{delay.toFixed(1)} s</strong>
        </div>
      </div>
      <figcaption style={{ padding: "0 18px 16px", color: "var(--muted-foreground, #71717a)", fontSize: 13 }}>
        The thick ring left plane one at time zero. Every thin ring has a distinct origin along the plane's path.
        Playback pauses when a pulse reaches the listener. The outlined ring marks that pulse; the triangle shows its
        travel distance through this vertical slice.{" "}
        {two
          ? "Trails follow crossings of matched pulses as they expand; dots show crossings at the selected time. The large dot is the time-zero pair."
          : "Turn on the second plane to see where two same-age wavefronts cross."}
      </figcaption>
    </figure>
  );
}

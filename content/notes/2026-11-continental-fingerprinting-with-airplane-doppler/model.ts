/** A small, deterministic browser port of the synthetic geometry and acoustics in air-tracking.
 * Coordinates are metres. Positive radial speed means the aircraft is receding.
 */
import { key, uniform } from "omai-engine/random";
export type Vec3 = { x: number; y: number; z: number };
export type Point = { x: number; y: number };
export type Flight = { points: Point[]; altitude: number; speed: number; f0: number; cpaArrival: number };
export type Sample = {
  arrival: number;
  emission: number;
  onPath: boolean;
  frequency: number;
  slant: number;
  radial: number;
  x: number;
  y: number;
  amplitude: number;
};
export const SIZE = 20_000;
export const SOUND_SPEED = 343;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x + seed * 17, 374761393) + Math.imul(y - seed * 29, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const fade = (t: number) => t * t * (3 - 2 * t);
const noise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = fade(x - ix),
    v = fade(y - iy);
  const a = hash(ix, iy, seed),
    b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed),
    d = hash(ix + 1, iy + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};
export function elevation(x: number, y: number, seed = 3): number {
  const broad = noise(x / 8500, y / 8500, seed);
  const middle = noise(x / 3100, y / 3100, seed + 1);
  const detail = noise(x / 1100, y / 1100, seed + 2);
  return Math.pow(clamp(0.48 * broad + 0.34 * middle + 0.18 * detail, 0, 1), 1.5) * 1100;
}
export function terrainGrid(seed = 3, n = 65): number[][] {
  return Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => elevation((col / (n - 1)) * SIZE, (row / (n - 1)) * SIZE, seed)),
  );
}

/** Catmull-Rom spline through waypoints, with an analytic derivative for radial velocity. */
function spline(points: Point[], u: number): { p: Point; dp: Point } {
  const m = points.length - 1;
  const s = clamp(u, 0, 1) * m,
    k = Math.min(m - 1, Math.floor(s)),
    t = s - k;
  const a = points[Math.max(0, k - 1)]!,
    b = points[k]!,
    c = points[k + 1]!,
    d = points[Math.min(m, k + 2)]!;
  const value = (v0: number, v1: number, v2: number, v3: number) => {
    const A = 2 * v1,
      B = -v0 + v2,
      C = 2 * v0 - 5 * v1 + 4 * v2 - v3;
    const D = -v0 + 3 * v1 - 3 * v2 + v3;
    return { p: 0.5 * (A + B * t + C * t * t + D * t * t * t), dp: 0.5 * m * (B + 2 * C * t + 3 * D * t * t) };
  };
  const x = value(a.x, b.x, c.x, d.x),
    y = value(a.y, b.y, c.y, d.y);
  return { p: { x: x.p, y: y.p }, dp: { x: x.dp, y: y.dp } };
}
function pathLength(points: Point[]): number {
  let length = 0,
    prev = spline(points, 0).p;
  for (let i = 1; i <= 160; i++) {
    const p = spline(points, i / 160).p;
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return length;
}
const durations = new WeakMap<Flight, number>();
function flightDuration(flight: Flight): number {
  let duration = durations.get(flight);
  if (duration === undefined) {
    duration = pathLength(flight.points) / flight.speed;
    durations.set(flight, duration);
  }
  return duration;
}
export function flightOnPath(flight: Flight, time: number): boolean {
  return Math.abs(time) <= flightDuration(flight) / 2;
}
export function flightState(flight: Flight, emission: number): { position: Vec3; velocity: Vec3 } {
  const duration = flightDuration(flight);
  const u = clamp(emission / duration + 0.5, 0, 1);
  const { p, dp } = spline(flight.points, u);
  const scale = 1 / duration;
  return { position: { ...p, z: flight.altitude }, velocity: { x: dp.x * scale, y: dp.y * scale, z: 0 } };
}
function rangeAndRate(flight: Flight, observer: Vec3, emission: number) {
  const { position, velocity } = flightState(flight, emission);
  const dx = position.x - observer.x,
    dy = position.y - observer.y,
    dz = position.z - observer.z;
  const slant = Math.hypot(dx, dy, dz);
  return { slant, radial: (dx * velocity.x + dy * velocity.y + dz * velocity.z) / slant, position };
}
export function arrivalAt(flight: Flight, observer: Vec3, emission: number): number {
  return emission + rangeAndRate(flight, observer, emission).slant / SOUND_SPEED;
}
/** Map an emission time directly to its arrival time and received frequency. */
export function translatedAt(flight: Flight, observer: Vec3, emission: number): Sample {
  const { slant, radial, position } = rangeAndRate(flight, observer, emission);
  return {
    arrival: emission + slant / SOUND_SPEED,
    emission,
    onPath: flightOnPath(flight, emission),
    frequency: flight.f0 / (1 + radial / SOUND_SPEED),
    slant,
    radial,
    x: position.x,
    y: position.y,
    amplitude: Math.min(1, 2300 / Math.max(slant, 200)),
  };
}
/** Invert t_arrival = t_emission + r(t_emission)/c, as in tracking.acoustics.emission_time. */
export function receivedAt(flight: Flight, observer: Vec3, arrival: number): Sample {
  let emission = arrival - rangeAndRate(flight, observer, arrival).slant / SOUND_SPEED;
  for (let k = 0; k < 7; k++) {
    const { slant, radial } = rangeAndRate(flight, observer, emission);
    emission -= (emission + slant / SOUND_SPEED - arrival) / (1 + radial / SOUND_SPEED);
  }
  const { slant, radial, position } = rangeAndRate(flight, observer, emission);
  const frequency = flight.f0 / (1 + radial / SOUND_SPEED);
  const amplitude = Math.min(1, 2300 / Math.max(slant, 200));
  const onPath = flightOnPath(flight, emission);
  return { arrival, emission, onPath, frequency, slant, radial, x: position.x, y: position.y, amplitude };
}
export function observerAt(x: number, y: number, seed = 3): Vec3 {
  return { x, y, z: elevation(x, y, seed) + 2 };
}

export function makeFlight(seed: number, options: Partial<Pick<Flight, "speed" | "altitude" | "f0">> = {}): Flight {
  const wobble = (i: number) => (hash(i, seed, 71) - 0.5) * 2000;
  return {
    points: [
      { x: -1200, y: 4800 + wobble(1) },
      { x: 3900, y: 6100 + wobble(2) },
      { x: 9500, y: 10200 + wobble(3) },
      { x: 15100, y: 12000 + wobble(4) },
      { x: 21400, y: 15900 + wobble(5) },
    ],
    altitude: options.altitude ?? 2700,
    speed: options.speed ?? 92,
    f0: options.f0 ?? 135,
    cpaArrival: 0,
  };
}
export function pathSamples(flight: Flight, n = 121): Point[] {
  return Array.from({ length: n }, (_, i) => spline(flight.points, i / (n - 1)).p);
}
export function curve(flight: Flight, observer: Vec3, start: number, end: number, step = 1): Sample[] {
  const out: Sample[] = [];
  for (let t = start; t <= end + 1e-9; t += step) {
    const sample = receivedAt(flight, observer, t);
    if (sample.onPath) out.push(sample);
  }
  return out;
}

/** A constructed two-flight situation. The second closest approach is heard 100 seconds after the first. */
export function situation(
  seed = 7,
  microphone?: { x: number; y: number },
  secondPath: "crossing" | "parallel" = "crossing",
) {
  const draw = uniform(key(seed), [2]).data;
  const truth = observerAt(
    microphone?.x ?? 9_500 + (draw[0] ?? 0.5) * 3800,
    microphone?.y ?? 6_800 + (draw[1] ?? 0.5) * 3400,
    seed,
  );
  const first = makeFlight(seed);
  if (secondPath === "parallel") {
    first.points = first.points.map((p) => ({ x: p.x, y: 5600 + p.x * 0.48 }));
  }
  const second: Flight = {
    points:
      secondPath === "parallel"
        ? first.points.map((p) => ({ x: p.x, y: p.y - 1500 }))
        : [
            { x: 1500, y: 19700 },
            { x: 5200, y: 15000 },
            { x: 9600, y: 9700 },
            { x: 15100, y: 5100 },
            { x: 20100, y: 500 },
          ],
    altitude: 3300,
    speed: 78,
    f0: 158,
    cpaArrival: 0,
  };
  const raw1 = curve(first, truth, -95, 95, 5);
  const raw2 = curve(second, truth, -95, 95, 5);
  const cpa1 = raw1.reduce((a, b) => (b.slant < a.slant ? b : a)).arrival;
  const cpa2 = raw2.reduce((a, b) => (b.slant < a.slant ? b : a)).arrival;
  const offset = 100 + cpa1 - cpa2;
  return {
    seed,
    truth,
    flights: [first, second] as const,
    offset,
    observed: [
      curve(first, truth, -75, 75, 3),
      curve(second, truth, -75, 75, 3).map((s) => ({ ...s, arrival: s.arrival + offset })),
    ] as const,
  };
}

/** Compare curve shapes and their locked temporal separation; profile out an unknown emitted pitch per flight. */
export function scoreLocation(
  x: number,
  y: number,
  scene: ReturnType<typeof situation>,
  recordingShift = 0,
  stride = 1,
): number {
  const observer = observerAt(x, y, scene.seed);
  let error = 0;
  for (let j = 0; j < 2; j++) {
    const flight = scene.flights[j]!;
    const observed = scene.observed[j]!;
    const flightShift = j === 0 ? 0 : scene.offset;
    const residuals = observed
      .filter((_, i) => i % stride === 0)
      .map((s) => {
        const predicted = receivedAt(flight, observer, s.arrival - flightShift + recordingShift);
        return predicted.onPath ? Math.log(s.frequency / predicted.frequency) : NaN;
      });
    if (residuals.some((r) => Number.isNaN(r))) return 1e3;
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    for (const r of residuals) error += Math.min(0.025, (r - mean) ** 2);
  }
  return error;
}

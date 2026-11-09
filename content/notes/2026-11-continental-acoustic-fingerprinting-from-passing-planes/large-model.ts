/** A browser-sized day of synthetic aircraft tracks and received Doppler ridges.
 * The forward acoustics follow air-tracking's retarded-time model, with quadratic
 * paths in place of its full spline and flight-performance generator.
 */
import { key, uniform } from "omai-engine/random";
import { elevation, SOUND_SPEED } from "./model";

export type LargeConfig = {
  seed: number;
  sizeKm: number;
  nFlights: number;
  clipMinutes: number;
  observerXKm?: number;
  observerYKm?: number;
  startHour?: number;
};
export type LargePoint = { x: number; y: number; z: number };
export type LargeFlight = {
  id: string;
  startS: number;
  endS: number;
  p0: LargePoint;
  control: LargePoint;
  p1: LargePoint;
  f0Hz: number;
  speedMps: number;
  anchor?: boolean;
};
export type LargeRidge = { t: number[]; f: number[] };
export type LargeEvent = {
  id: string;
  truthFlightId: string;
  cpaS: number;
  slantM: number;
  observed: LargeRidge;
};
export type LargeScenario = {
  config: LargeConfig;
  sizeM: number;
  terrain: number[][];
  flights: LargeFlight[];
  observer: LargePoint;
  clipStartS: number;
  events: LargeEvent[];
};
export type LargeCell = { x: number; y: number; score: number; timeS: number };
export type LargeMatch = {
  eventId: string;
  flightId: string;
  observed: LargeRidge;
  predicted: LargeRidge;
  plausible: boolean;
};
export type LargeCandidate = {
  x: number;
  y: number;
  score: number;
  timeS: number;
  errorM: number;
  timeErrorMin: number;
  matches: LargeMatch[];
};

export const DEFAULT_LARGE_CONFIG: LargeConfig = {
  seed: 12,
  sizeKm: 100,
  nFlights: 420,
  clipMinutes: 20,
  observerXKm: 53,
  observerYKm: 47,
  startHour: 12,
};
const DAY_S = 86_400;
export const AUDIBLE_M = 12_000;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const distance = (a: LargePoint, b: LargePoint) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function largeElevation(x: number, y: number, config: LargeConfig): number {
  const sizeM = config.sizeKm * 1000;
  const broad = elevation((x / sizeM) * 20_000, (y / sizeM) * 20_000, config.seed);
  const detail = elevation((x / sizeM) * 62_000 + 1900, (y / sizeM) * 62_000 + 2700, config.seed + 31);
  return clamp(2.6 * broad + 0.75 * detail - 700, 0, 2100);
}
export function largeObserver(config: LargeConfig): LargePoint {
  const sizeM = config.sizeKm * 1000;
  const x = clamp((config.observerXKm ?? config.sizeKm * 0.53) * 1000, 0, sizeM);
  const y = clamp((config.observerYKm ?? config.sizeKm * 0.47) * 1000, 0, sizeM);
  return { x, y, z: largeElevation(x, y, config) + 2 };
}
/** Position and velocity along a quadratic Bezier path at an absolute day time. */
export function largeFlightState(
  flight: LargeFlight,
  atSeconds: number,
): { position: LargePoint; velocity: LargePoint } {
  const span = flight.endS - flight.startS;
  const u = clamp((atSeconds - flight.startS) / span, 0, 1),
    v = 1 - u;
  const part = (a: number, b: number, c: number) => ({
    position: v * v * a + 2 * v * u * b + u * u * c,
    velocity: (2 * v * (b - a) + 2 * u * (c - b)) / span,
  });
  const x = part(flight.p0.x, flight.control.x, flight.p1.x);
  const y = part(flight.p0.y, flight.control.y, flight.p1.y);
  const z = part(flight.p0.z, flight.control.z, flight.p1.z);
  return {
    position: { x: x.position, y: y.position, z: z.position },
    velocity: { x: x.velocity, y: y.velocity, z: z.velocity },
  };
}
function rangeAndRate(flight: LargeFlight, observer: LargePoint, emission: number) {
  const { position, velocity } = largeFlightState(flight, emission);
  const dx = position.x - observer.x,
    dy = position.y - observer.y,
    dz = position.z - observer.z;
  const range = Math.hypot(dx, dy, dz);
  const radial = (dx * velocity.x + dy * velocity.y + dz * velocity.z) / Math.max(1, range);
  return { range, radial };
}
/** The observed frequency at an arrival time, solving the time-of-flight equation. */
export function largeReceived(
  flight: LargeFlight,
  observer: LargePoint,
  arrival: number,
): { f: number; range: number } {
  let emission = arrival - rangeAndRate(flight, observer, arrival).range / SOUND_SPEED;
  for (let i = 0; i < 5; i++) {
    const { range, radial } = rangeAndRate(flight, observer, emission);
    emission = clamp(
      emission - (emission + range / SOUND_SPEED - arrival) / (1 + radial / SOUND_SPEED),
      flight.startS,
      flight.endS,
    );
  }
  const { range, radial } = rangeAndRate(flight, observer, emission);
  return { f: flight.f0Hz / (1 + radial / SOUND_SPEED), range };
}
function closestInClip(flight: LargeFlight, observer: LargePoint, startS: number, endS: number) {
  const lo = Math.max(flight.startS, startS - 90),
    hi = Math.min(flight.endS, endS + 90);
  if (hi <= lo) return null;
  let bestT = lo,
    bestR = Infinity;
  for (let i = 0; i <= 18; i++) {
    const at = lo + ((hi - lo) * i) / 18;
    const r = distance(largeFlightState(flight, at).position, observer);
    if (r < bestR) {
      bestT = at;
      bestR = r;
    }
  }
  const step = (hi - lo) / 18;
  let left = Math.max(lo, bestT - step),
    right = Math.min(hi, bestT + step);
  for (let i = 0; i < 16; i++) {
    const a = left + (right - left) / 3,
      b = right - (right - left) / 3;
    if (
      distance(largeFlightState(flight, a).position, observer) <
      distance(largeFlightState(flight, b).position, observer)
    )
      right = b;
    else left = a;
  }
  bestT = (left + right) / 2;
  bestR = distance(largeFlightState(flight, bestT).position, observer);
  const arrival = bestT + bestR / SOUND_SPEED;
  return { arrival, range: bestR };
}
function ridgeFor(
  flight: LargeFlight,
  observer: LargePoint,
  cpaS: number,
  clipStartS: number,
  clipEndS: number,
): LargeRidge {
  const t: number[] = [],
    f: number[] = [];
  for (let k = -7; k <= 7; k++) {
    const at = cpaS + k * 7;
    if (at < clipStartS || at > clipEndS) continue;
    t.push(at - clipStartS);
    f.push(largeReceived(flight, observer, at).f);
  }
  return { t, f };
}

/** The same catalogue can be heard from a moved microphone or another hour. */
export function largeHeardEvents(
  scenario: LargeScenario,
  observerXKm: number,
  observerYKm: number,
  startHour: number,
): LargeEvent[] {
  const config = { ...scenario.config, observerXKm, observerYKm, startHour };
  const observer = largeObserver(config);
  const clipStartS = clamp(startHour * 3600, 0, DAY_S - config.clipMinutes * 60);
  const clipEndS = clipStartS + config.clipMinutes * 60;
  const found: LargeEvent[] = [];
  for (const flight of scenario.flights) {
    const cpa = closestInClip(flight, observer, clipStartS, clipEndS);
    if (!cpa || cpa.range > AUDIBLE_M || cpa.arrival < clipStartS + 50 || cpa.arrival > clipEndS - 50) continue;
    const observed = ridgeFor(flight, observer, cpa.arrival, clipStartS, clipEndS);
    if (observed.t.length < 8) continue;
    found.push({
      id: `tone-${found.length + 1}`,
      truthFlightId: flight.id,
      cpaS: cpa.arrival,
      slantM: cpa.range,
      observed,
    });
  }
  found.sort((a, b) => a.cpaS - b.cpaS);
  return found.map((event, i) => ({ ...event, id: `tone-${i + 1}` }));
}

function anchorFlight(
  id: string,
  observer: LargePoint,
  sizeM: number,
  arrival: number,
  angle: number,
  offset: number,
  speed: number,
  altitude: number,
  f0Hz: number,
): LargeFlight {
  const dx = Math.cos(angle),
    dy = Math.sin(angle),
    nx = -dy,
    ny = dx;
  const foot = { x: observer.x + nx * offset, y: observer.y + ny * offset };
  const half = sizeM * 0.75;
  const p0 = { x: foot.x - dx * half, y: foot.y - dy * half, z: altitude };
  const p1 = { x: foot.x + dx * half, y: foot.y + dy * half, z: altitude };
  const control = { x: foot.x, y: foot.y, z: altitude };
  const duration = (2 * half) / speed;
  const slant = Math.hypot(offset, altitude - observer.z);
  const startS = arrival - duration / 2 - slant / SOUND_SPEED;
  return { id, startS, endS: startS + duration, p0, control, p1, f0Hz, speedMps: speed, anchor: true };
}

/** Construct one fixed sky. Moving the listener or clip never moves a flight. */
export function generateLargeScenario(input: Partial<LargeConfig> = {}): LargeScenario {
  const raw = { ...DEFAULT_LARGE_CONFIG, ...input };
  const config: LargeConfig = {
    ...raw,
    seed: Math.trunc(Number.isFinite(raw.seed) ? raw.seed : DEFAULT_LARGE_CONFIG.seed),
    sizeKm: clamp(Number.isFinite(raw.sizeKm) ? raw.sizeKm : DEFAULT_LARGE_CONFIG.sizeKm, 20, 300),
    nFlights: Math.round(clamp(Number.isFinite(raw.nFlights) ? raw.nFlights : DEFAULT_LARGE_CONFIG.nFlights, 0, 1500)),
    clipMinutes: clamp(Number.isFinite(raw.clipMinutes) ? raw.clipMinutes : DEFAULT_LARGE_CONFIG.clipMinutes, 5, 60),
  };
  const sizeM = config.sizeKm * 1000;
  const observer = largeObserver(config);
  const clipStartS = clamp((config.startHour ?? 12) * 3600, 0, DAY_S - config.clipMinutes * 60);
  const reference = largeObserver({ ...config, observerXKm: config.sizeKm * 0.53, observerYKm: config.sizeKm * 0.47 });
  const referenceClipS = 12 * 3600;
  const draws = uniform(key(config.seed), [Math.max(0, config.nFlights) * 9]).data;
  const flights: LargeFlight[] = [];
  for (let i = 0; i < config.nFlights; i++) {
    const u = (j: number) => draws[i * 9 + j] ?? 0.5;
    const angle = 2 * Math.PI * u(0),
      dx = Math.cos(angle),
      dy = Math.sin(angle);
    const cx = sizeM * u(1),
      cy = sizeM * u(2);
    const half = sizeM * (0.5 + 0.42 * u(3));
    const speed = 60 + 75 * u(4),
      altitude = 2300 + 4700 * u(5);
    const bend = (u(6) - 0.5) * sizeM * 0.18;
    const startS = u(7) * (DAY_S - (2 * half) / speed);
    const duration = (2 * half) / speed;
    flights.push({
      id: `F${String(i + 1).padStart(3, "0")}`,
      startS,
      endS: startS + duration,
      p0: { x: cx - dx * half, y: cy - dy * half, z: altitude },
      control: { x: cx - dy * bend, y: cy + dx * bend, z: altitude + (u(8) - 0.5) * 300 },
      p1: { x: cx + dx * half, y: cy + dy * half, z: altitude },
      f0Hz: 100 + 85 * u(8),
      speedMps: speed,
    });
  }
  flights.push(
    anchorFlight(
      "A001",
      reference,
      sizeM,
      referenceClipS + 20 * 60 * 0.31,
      0.36,
      2800,
      96,
      Math.max(reference.z + 1800, 3000),
      132,
    ),
  );
  flights.push(
    anchorFlight(
      "A002",
      reference,
      sizeM,
      referenceClipS + 20 * 60 * 0.72,
      2.07,
      -4200,
      82,
      Math.max(reference.z + 2300, 3600),
      157,
    ),
  );
  const terrain = Array.from({ length: 49 }, (_, row) =>
    Array.from({ length: 49 }, (_, col) => largeElevation((col / 48) * sizeM, (row / 48) * sizeM, config)),
  );
  const scenario: LargeScenario = { config, sizeM, terrain, flights, observer, clipStartS, events: [] };
  scenario.events = largeHeardEvents(scenario, observer.x / 1000, observer.y / 1000, clipStartS / 3600);
  return scenario;
}

/** Every heard event chooses its best flight; the complete synthetic clip also constrains the audible count. */
export function scoreLargeLocation(
  scenario: LargeScenario,
  x: number,
  y: number,
  includeCurves = false,
  candidateStartS = scenario.clipStartS,
): LargeCandidate {
  const observer = { x, y, z: largeElevation(x, y, scenario.config) + 2 };
  const clipEndS = candidateStartS + scenario.config.clipMinutes * 60;
  const active = scenario.flights.filter((f) => f.endS >= candidateStartS - 120 && f.startS <= clipEndS + 120);
  const passes = active.map((flight) => ({ flight, cpa: closestInClip(flight, observer, candidateStartS, clipEndS) }));
  const expectedAudible = passes.filter(
    ({ cpa }) => cpa && cpa.range <= AUDIBLE_M && cpa.arrival >= candidateStartS + 50 && cpa.arrival <= clipEndS - 50,
  ).length;
  // These generated clips contain every tonal pass within the model's hearing range.
  let total = 12 * Math.abs(expectedAudible - scenario.events.length);
  const matches: LargeMatch[] = [];
  for (const event of scenario.events) {
    let bestCost = 50,
      bestFlight: LargeFlight | undefined,
      bestPredicted: LargeRidge | undefined;
    let fallbackFlight: LargeFlight | undefined,
      fallbackCost = Infinity;
    for (const { flight, cpa } of passes) {
      if (!cpa) continue;
      const targetArrival = candidateStartS + (event.cpaS - scenario.clipStartS);
      const miss = Math.abs(cpa.arrival - targetArrival) + Math.max(0, cpa.range - AUDIBLE_M) / 100;
      if (miss < fallbackCost) {
        fallbackCost = miss;
        fallbackFlight = flight;
      }
      if (cpa.range > AUDIBLE_M || Math.abs(cpa.arrival - targetArrival) > 65) continue;
      const predictedF = event.observed.t.map((t) => largeReceived(flight, observer, candidateStartS + t).f);
      const residual = predictedF.map((f, i) => Math.log(event.observed.f[i]! / f));
      const mean = residual.reduce((a, b) => a + b, 0) / residual.length;
      const shape = residual.reduce((a, b) => a + (b - mean) ** 2, 0) / residual.length;
      const timing = ((cpa.arrival - targetArrival) / 20) ** 2;
      const cost = shape * 50_000 + timing;
      if (cost < bestCost) {
        bestCost = cost;
        bestFlight = flight;
        if (includeCurves) bestPredicted = { t: event.observed.t, f: predictedF.map((f) => f * Math.exp(mean)) };
      }
    }
    total += bestCost;
    if (includeCurves && !bestFlight && fallbackFlight) {
      bestFlight = fallbackFlight;
      const predictedF = event.observed.t.map((t) => largeReceived(fallbackFlight, observer, candidateStartS + t).f);
      const mean = predictedF.reduce((sum, f, i) => sum + Math.log(event.observed.f[i]! / f), 0) / predictedF.length;
      bestPredicted = { t: event.observed.t, f: predictedF.map((f) => f * Math.exp(mean)) };
    }
    if (includeCurves && bestFlight && bestPredicted)
      matches.push({
        eventId: event.id,
        flightId: bestFlight.id,
        observed: event.observed,
        predicted: bestPredicted,
        plausible: bestCost < 50,
      });
  }
  const score = scenario.events.length ? 100 / (1 + total / scenario.events.length) : 0;
  return {
    x,
    y,
    score,
    timeS: candidateStartS,
    errorM: Math.hypot(x - scenario.observer.x, y - scenario.observer.y),
    timeErrorMin: Math.abs(candidateStartS - scenario.clipStartS) / 60,
    matches,
  };
}

/** Propose clip times from catalogue flyovers, then score their full curves.
 * The observed clip time is deliberately absent from this calculation.
 */
export function scoreLargePlaceAndTime(scenario: LargeScenario, x: number, y: number): LargeCandidate {
  const observer = { x, y, z: largeElevation(x, y, scenario.config) + 2 };
  const heard = scenario.events;
  if (!heard.length)
    return {
      x,
      y,
      score: 0,
      timeS: 0,
      errorM: Math.hypot(x - scenario.observer.x, y - scenario.observer.y),
      timeErrorMin: 0,
      matches: [],
    };
  const passes = scenario.flights
    .flatMap((flight) => {
      const cpa = closestInClip(flight, observer, flight.startS, flight.endS);
      return cpa && cpa.range <= AUDIBLE_M ? [{ arrival: cpa.arrival, flight }] : [];
    })
    .sort((a, b) => a.arrival - b.arrival);
  const offset1 = heard[0]!.cpaS - scenario.clipStartS;
  const offset2 = heard.length > 1 ? heard[1]!.cpaS - scenario.clipStartS : 0;
  const gap = offset2 - offset1;
  const lastStart = DAY_S - scenario.config.clipMinutes * 60;
  let best: LargeCandidate = {
    x,
    y,
    score: 0,
    timeS: 0,
    errorM: Math.hypot(x - scenario.observer.x, y - scenario.observer.y),
    timeErrorMin: 0,
    matches: [],
  };
  if (heard.length === 1) {
    for (const pass of passes) {
      const start = pass.arrival - offset1;
      if (start < 0 || start > lastStart) continue;
      const result = scoreLargeLocation(scenario, x, y, false, start);
      if (result.score > best.score) best = result;
    }
    return best;
  }
  for (let i = 0; i < passes.length; i++) {
    const first = passes[i]!;
    for (let j = i + 1; j < passes.length; j++) {
      const second = passes[j]!;
      const separation = second.arrival - first.arrival;
      if (separation > gap + 110) break;
      if (Math.abs(separation - gap) > 110) continue;
      const start = (first.arrival - offset1 + (second.arrival - offset2)) / 2;
      if (start < 0 || start > lastStart) continue;
      const result = scoreLargeLocation(scenario, x, y, false, start);
      if (result.score > best.score) best = result;
    }
  }
  return best;
}

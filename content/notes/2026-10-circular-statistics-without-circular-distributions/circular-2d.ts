/**
 * The same idea in two dimensions, on a surface that wraps both ways.
 *
 * Both coordinates are circular, so the sample space is a torus. The periods
 * are both one, which costs nothing and spares the figure a pair of units it
 * does not need: what matters is that each axis comes back to where it started.
 * Nothing about the method changes from the line. The copies are a three by
 * three grid rather than a row of three, the loss is a log-sum-exp over nine
 * terms instead of three, and the model underneath is an ordinary bivariate
 * normal with a full covariance.
 *
 * The covariance is carried as its Cholesky factor, lower triangular, with the
 * diagonal held in logs. That keeps it positive definite for free under an
 * unconstrained optimiser, and the quadratic form is a forward substitution
 * rather than an inverse.
 */
import {
  type Tensor,
  type Value,
  add,
  div,
  exp,
  log,
  logsumexp,
  mean,
  mul,
  neg,
  reshape,
  shapeOfValue,
  square,
  sub,
  tensor,
  toArray,
} from "aifn-compute";
import { adamRule, applyUpdates } from "aifn-compute/optim";
import { valueAndGrad } from "aifn-compute";
import { normals, stream, uniform } from "aifn-compute/foundation/random";

/** Both axes wrap at one, so the surface is the unit square joined at its edges. */
export const PERIOD: readonly [number, number] = [1, 1];

/** Copies either side, in both directions: nine in all. */
export const K = 1;

const LOG_2PI = Math.log(2 * Math.PI);

/**
 * The smallest a component may be along each axis.
 *
 * Without it a component collapses onto a ridge through a few points, where the
 * likelihood is unbounded, and the optimiser finds that long before it finds
 * the answer. A hundredth of a period is far below anything the data has, so
 * the floor rules out the singularity and nothing else.
 */
export const FLOOR: readonly [number, number] = [0.01, 0.01];

/** One component: a mean, a Cholesky factor `[[a, 0], [b, c]]`, and a weight. */
export type Component = { w: number; mu: [number, number]; a: number; b: number; c: number };

export type Params = {
  mu1: Tensor;
  mu2: Tensor;
  logA: Tensor;
  b: Tensor;
  logC: Tensor;
  logits: Tensor;
};

/**
 * Two components that both wrap.
 *
 * The first sits in the middle of the surface and anything would fit it. The
 * second sits in a corner, so it crosses both edges at once: the case a model
 * on the plane cannot hold together.
 */
export const TRUTH: readonly Component[] = [
  { w: 0.6, mu: [0.35, 0.35], a: 0.09, b: 0.03, c: 0.07 },
  { w: 0.4, mu: [0.97, 0.95], a: 0.1, b: -0.03, c: 0.05 },
];

/**
 * Where the other axis tip has to be once one of them has been dragged.
 *
 * Principal axes are perpendicular, so a pair of tips left wherever a pointer
 * dropped them is not a pair of axes. The dragged tip is taken as given and
 * this swings the other round to meet it at a right angle, keeping its own
 * length and the side it was already on.
 */
export function perpendicularTip(
  mean: readonly [number, number],
  driver: readonly [number, number],
  follower: readonly [number, number],
): [number, number] {
  const v = [driver[0] - mean[0], driver[1] - mean[1]] as const;
  const len = Math.hypot(v[0], v[1]);
  if (len < 1e-6) return [follower[0], follower[1]];
  const u = [v[0] / len, v[1] / len] as const;
  const w = [follower[0] - mean[0], follower[1] - mean[1]] as const;
  const keep = Math.max(0.02, Math.hypot(w[0], w[1]));
  const side = Math.sign(w[0] * -u[1] + w[1] * u[0]) || 1;
  return [mean[0] + keep * side * -u[1], mean[1] + keep * side * u[0]];
}

/**
 * A component from its mean and the two tips of its principal axes.
 *
 * Dragging a shape is a better control than three numbers for it, and the
 * principal axes are the shape: the tips sit one standard deviation from the
 * mean along each. They are orthogonal by definition, so the second tip is
 * projected onto the perpendicular of the first rather than taken as given,
 * which keeps the pair a covariance rather than a pair of arrows.
 *
 * The covariance is then `s1² u1 u1ᵀ + s2² u2 u2ᵀ`, and the Cholesky factor of
 * that is what the rest of this file works in.
 */
export function componentFromAxes(
  w: number,
  mu: readonly [number, number],
  first: readonly [number, number],
  second: readonly [number, number],
): Component {
  const v1 = [first[0] - mu[0], first[1] - mu[1]] as [number, number];
  const s1 = Math.max(0.01, Math.hypot(v1[0], v1[1]));
  const u1 = [v1[0] / s1, v1[1] / s1] as [number, number];

  // Gram-Schmidt: only the part of the second tip across the first counts.
  const v2 = [second[0] - mu[0], second[1] - mu[1]] as [number, number];
  const along = v2[0] * u1[0] + v2[1] * u1[1];
  const across = [v2[0] - along * u1[0], v2[1] - along * u1[1]] as [number, number];
  const s2 = Math.max(0.01, Math.hypot(across[0], across[1]));
  const u2 = s2 > 1e-9 ? ([across[0] / s2, across[1] / s2] as [number, number]) : ([-u1[1], u1[0]] as [number, number]);

  const s11 = s1 * s1 * u1[0] * u1[0] + s2 * s2 * u2[0] * u2[0];
  const s12 = s1 * s1 * u1[0] * u1[1] + s2 * s2 * u2[0] * u2[1];
  const s22 = s1 * s1 * u1[1] * u1[1] + s2 * s2 * u2[1] * u2[1];

  const a = Math.sqrt(Math.max(1e-9, s11));
  const b = s12 / a;
  const c = Math.sqrt(Math.max(1e-9, s22 - b * b));
  return { w, mu: [mu[0], mu[1]], a, b, c };
}

export const wrap2 = (x: number, i: 0 | 1) => {
  const g = PERIOD[i] as number;
  return ((x % g) + g) % g;
};

/** The shifts, as a grid: nine pairs for K = 1. */
export const shifts = (k = K): [number, number][] => {
  const range = Array.from({ length: 2 * k + 1 }, (_, i) => i - k);
  return range.flatMap((i) => range.map((j) => [i, j] as [number, number]));
};

/**
 * `log w + log N` for every point, copy and component: shape (n, copies, M).
 *
 * `diagonal` drops the off-diagonal term, which restricts every component to a
 * covariance aligned with the axes. The parameter stays in the tree and is
 * simply not read, so its gradient is zero and the optimiser leaves it where it
 * started, which is nought.
 */
export function logJoint(x1: Value, x2: Value, p: Params, ks: readonly [number, number][], diagonal = false): Value {
  const n = shapeOfValue(x1)[0] ?? 0;
  const m = shapeOfValue(p.mu1)[0] ?? 0;
  const at = (t: Value) => reshape(t, [1, 1, m]);
  const k1 = reshape(tensor(ks.map(([i]) => i * (PERIOD[0] as number))), [1, ks.length, 1]);
  const k2 = reshape(tensor(ks.map(([, j]) => j * (PERIOD[1] as number))), [1, ks.length, 1]);

  // The data moves, which is the whole point. Shifting the means instead gives
  // the same number, as `circular-2d.test.ts` checks.
  const d1 = sub(sub(reshape(x1, [n, 1, 1]), k1), at(p.mu1));
  const d2 = sub(sub(reshape(x2, [n, 1, 1]), k2), at(p.mu2));

  const a = add(exp(at(p.logA)), FLOOR[0] as number);
  const c = add(exp(at(p.logC)), FLOOR[1] as number);
  // y = L⁻¹ d by forward substitution, so the quadratic form is |y|².
  const y1 = div(d1, a);
  const y2 = diagonal ? div(d2, c) : div(sub(d2, mul(at(p.b), y1)), c);
  const quad = add(square(y1), square(y2));

  const logW = reshape(sub(p.logits, logsumexp(p.logits)), [1, 1, m]);
  const logDet = add(log(a), log(c));
  return add(logW, sub(sub(mul(-0.5, quad), logDet), LOG_2PI));
}

export const loss = (x1: Tensor, x2: Tensor, p: Params, ks: readonly [number, number][], diagonal = false): Value =>
  neg(mean(logsumexp(logJoint(x1, x2, p, ks, diagonal), [1, 2])));

/** The parameters as components, for drawing. */
export function readOut(p: Params, diagonal = false): Component[] {
  const mu1 = toArray(p.mu1) as number[];
  const mu2 = toArray(p.mu2) as number[];
  const a = (toArray(exp(p.logA)) as number[]).map((v) => v + (FLOOR[0] as number));
  const c = (toArray(exp(p.logC)) as number[]).map((v) => v + (FLOOR[1] as number));
  const b = diagonal ? (toArray(p.b) as number[]).map(() => 0) : (toArray(p.b) as number[]);
  const logits = toArray(p.logits) as number[];
  const top = Math.max(...logits);
  const raw = logits.map((v) => Math.exp(v - top));
  const total = raw.reduce((x, y) => x + y, 0);
  return mu1.map((_, i) => ({
    w: (raw[i] as number) / total,
    mu: [wrap2(mu1[i] as number, 0), wrap2(mu2[i] as number, 1)] as [number, number],
    a: a[i] as number,
    b: b[i] as number,
    c: c[i] as number,
  }));
}

/**
 * The one-sigma ellipse of a component, as a closed curve.
 *
 * The points of the unit circle through the Cholesky factor, which is the set
 * at one Mahalanobis unit from the mean. Drawn once per tile by the figure, so
 * the part that wraps round an edge comes back on the other side.
 */
export function ellipse(g: Component, points = 64): [number[], number[]] {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i <= points; i++) {
    const t = (2 * Math.PI * i) / points;
    x.push(g.mu[0] + g.a * Math.cos(t));
    y.push(g.mu[1] + g.b * Math.cos(t) + g.c * Math.sin(t));
  }
  return [x, y];
}

/** The density of a mixture at one point, summing enough copies to be exact. */
export function density(mix: readonly Component[], x: number, y: number, k = 4): number {
  let total = 0;
  for (let i = -k; i <= k; i++) {
    for (let j = -k; j <= k; j++) {
      for (const g of mix) {
        const d1 = x - i * (PERIOD[0] as number) - g.mu[0];
        const d2 = y - j * (PERIOD[1] as number) - g.mu[1];
        const y1 = d1 / g.a;
        const y2 = (d2 - g.b * y1) / g.c;
        total += (g.w * Math.exp(-0.5 * (y1 * y1 + y2 * y2))) / (2 * Math.PI * g.a * g.c);
      }
    }
  }
  return total;
}

/** Draws from a mixture on the torus, folded into one period of each. */
export function sample(mix: readonly Component[], n: number, seed: number): [number[], number[]] {
  const s = stream(seed);
  const u = toArray(uniform(s, 0, 1, { shape: [n] })) as number[];
  const z1 = toArray(normals(s, n)) as number[];
  const z2 = toArray(normals(s, n)) as number[];
  const cuts = mix.map((_, i) => mix.slice(0, i + 1).reduce((t, g) => t + g.w, 0));
  const x1: number[] = [];
  const x2: number[] = [];
  for (let i = 0; i < n; i++) {
    const found = cuts.findIndex((cut) => (u[i] as number) < cut);
    const g = mix[found < 0 ? mix.length - 1 : found] as Component;
    const d1 = g.a * (z1[i] as number);
    const d2 = g.b * (z1[i] as number) + g.c * (z2[i] as number);
    x1.push(wrap2(g.mu[0] + d1, 0));
    x2.push(wrap2(g.mu[1] + d2, 1));
  }
  return [x1, x2];
}

/**
 * Where a fit starts: the means at points the data actually contains.
 *
 * The line's trick of spreading the means evenly does not carry over. On a
 * surface, evenly spaced means sit along the diagonal, which is exactly where
 * the thin diagonal ridge lives, and the fit walks straight into it.
 */
export function start(m: number, draws?: readonly [number[], number[]], seed = 0): Params {
  const picks: (readonly [number, number])[] = [];
  const n = draws?.[0].length ?? 0;
  if (!draws || n === 0) {
    for (let i = 0; i < m; i++) {
      picks.push([((i + 0.5) * (PERIOD[0] as number)) / m, ((i + 0.5) * (PERIOD[1] as number)) / m]);
    }
  } else {
    // Farthest point first, measured round the torus: take one draw, then the
    // draw furthest from everything taken so far. Two points of the same blob
    // leave a component with nothing of its own to fit and the pair never comes
    // apart, which is what picking evenly through the sample kept doing.
    const first = (seed * 37) % n;
    picks.push([draws[0][first] as number, draws[1][first] as number]);
    while (picks.length < m) {
      let best = 0;
      let bestD = -1;
      for (let i = 0; i < n; i++) {
        let nearest = Infinity;
        for (const [px, py] of picks) {
          const dx = Math.abs((draws[0][i] as number) - px);
          const dy = Math.abs((draws[1][i] as number) - py);
          const d = Math.hypot(
            Math.min(dx, (PERIOD[0] as number) - dx) / (PERIOD[0] as number),
            Math.min(dy, (PERIOD[1] as number) - dy) / (PERIOD[1] as number),
          );
          nearest = Math.min(nearest, d);
        }
        if (nearest > bestD) {
          bestD = nearest;
          best = i;
        }
      }
      picks.push([draws[0][best] as number, draws[1][best] as number]);
    }
  }
  return {
    mu1: tensor(picks.map(([h]) => h)),
    mu2: tensor(picks.map(([, d]) => d)),
    logA: tensor(Array.from({ length: m }, () => Math.log((PERIOD[0] as number) / 8))),
    b: tensor(Array.from({ length: m }, () => 0)),
    logC: tensor(Array.from({ length: m }, () => Math.log((PERIOD[1] as number) / 8))),
    logits: tensor(Array.from({ length: m }, () => 0)),
  };
}

export type Trainer = {
  step: (n?: number) => number;
  steps: () => number;
  fit: () => Component[];
};

/** One fit, stepped by the figure that owns it. */
export function trainer(
  draws: readonly [number[], number[]],
  options: { components?: number; lr?: number; seed?: number; diagonal?: boolean } = {},
): Trainer {
  const ks = shifts();
  const x1 = tensor([...draws[0]]);
  const x2 = tensor([...draws[1]]);
  const rule = adamRule({ stepSize: options.lr ?? 0.05 });

  let params = start(options.components ?? 2, draws, options.seed ?? 0);
  let state = rule.init(params);
  let taken = 0;
  const diagonal = options.diagonal ?? false;
  const graded = valueAndGrad((p: Params) => loss(x1, x2, p, ks, diagonal));

  return {
    step(n = 1) {
      let value = 0;
      for (let i = 0; i < n; i++) {
        const { value: v, grad } = graded(params);
        const next = rule.update(grad as Params, state, params);
        params = applyUpdates(params, next.updates);
        state = next.state;
        value = v as number;
        taken += 1;
      }
      return value;
    },
    steps: () => taken,
    fit: () => readOut(params, diagonal),
  };
}

/** Mean log density of a sample under a mixture, for scoring a fit. */
export const logLik = (x1: readonly number[], x2: readonly number[], mix: readonly Component[]): number =>
  x1.reduce((total, x, i) => total + Math.log(density(mix, x, x2[i] as number)), 0) / x1.length;

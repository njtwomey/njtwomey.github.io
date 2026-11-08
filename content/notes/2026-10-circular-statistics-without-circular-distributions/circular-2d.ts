/**
 * The same idea in two dimensions, on a surface that wraps both ways.
 *
 * Both coordinates are circular, so the sample space is a torus. The periods
 * are both one, which costs nothing and spares the figure a pair of units it
 * does not need: what matters is that each axis comes back to where it started.
 * Nothing about the method changes from the line. The copies are a three by
 * three grid rather than a row of three, the loss is a log-sum-exp over nine
 * terms instead of three, and the model underneath is an ordinary bivariate
 * normal with a full covariance, which is the engine's `multivariateNormal`.
 *
 * The covariance is carried as its Cholesky factor, lower triangular, with the
 * diagonal held in logs. That keeps it positive definite for free under an
 * unconstrained optimiser, and is the form `multivariateNormal` takes directly.
 */
import { valueAndGrad } from "omai-engine/autodiff";
import { multivariateNormal } from "omai-engine/dists";
import { adam, applyUpdates } from "omai-engine/optim";
import { type Key, categorical, key, normal as normalNoise, split } from "omai-engine/random";
import {
  type Value,
  add,
  exp,
  item,
  log,
  logSoftmax,
  logsumexp,
  mean,
  mod,
  mul,
  neg,
  reshape,
  softmax,
  stack,
  sub,
  take,
  tensor,
  toFlat,
} from "omai-engine/tensor";
import type { Algorithm } from "omai-engine/trace";

/** Both axes wrap at one, so the surface is the unit square joined at its edges. */
export const PERIOD: readonly [number, number] = [1, 1];

/** Copies either side, in both directions: nine in all. */
export const K = 1;

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
  mu1: Value;
  mu2: Value;
  logA: Value;
  b: Value;
  logC: Value;
  logits: Value;
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

export const wrap2 = (x: number, i: 0 | 1) => item(mod(x, PERIOD[i] as number));

/** The shifts, as a grid: nine pairs for K = 1. */
export const shifts = (k = K): [number, number][] => {
  const range = Array.from({ length: 2 * k + 1 }, (_, i) => i - k);
  return range.flatMap((i) => range.map((j) => [i, j] as [number, number]));
};

/** The points `(x1, x2)` as one `[n, 2]` tensor, which is the shape a bivariate normal scores. */
const pointsOf = (x1: Value, x2: Value): Value => stack([x1, x2], -1);

/** The shifts as the `[1, copies, 2]` offsets that are taken off a point before it is scored. */
const offsets = (ks: readonly [number, number][]): Value =>
  reshape(tensor(ks.map(([i, j]) => [i * (PERIOD[0] as number), j * (PERIOD[1] as number)])), [1, ks.length, 2]);

/**
 * One bivariate normal per component, from a mean and a lower Cholesky factor.
 *
 * `diagonal` drops the off-diagonal term, which restricts every component to a
 * covariance aligned with the axes. The parameter stays in the tree and is
 * simply not read, so its gradient is zero and the optimiser leaves it where it
 * started, which is nought.
 *
 * Each component is its own distribution over every point at once, rather than
 * one batched distribution over components, because the engine solves a single
 * triangular system for all the rows of a batch and that is several times
 * faster than solving one system per row.
 */
function components(p: Params, diagonal: boolean) {
  const m = p.mu1.shape[0] ?? 0;
  const a = add(exp(p.logA), FLOOR[0] as number);
  const c = add(exp(p.logC), FLOOR[1] as number);
  const b = diagonal ? mul(p.b, 0) : p.b;
  return Array.from({ length: m }, (_, i) => {
    const at = (t: Value) => take(t, [i]);
    const scaleTril = reshape(stack([at(a), mul(at(a), 0), at(b), at(c)], -1), [2, 2]);
    return multivariateNormal(reshape(stack([at(p.mu1), at(p.mu2)], -1), [2]), { scaleTril });
  });
}

/**
 * `log w + log N` for every point, copy and component: shape (n, copies, M).
 *
 * The data moves, which is the whole point. Shifting the means instead gives
 * the same number, as `circular-2d.test.ts` checks.
 */
export function logJoint(x1: Value, x2: Value, p: Params, ks: readonly [number, number][], diagonal = false): Value {
  const m = p.mu1.shape[0] ?? 0;
  const n = x1.shape[0] ?? 0;
  const moved = sub(reshape(pointsOf(x1, x2), [n, 1, 2]), offsets(ks));
  const lp = stack(
    components(p, diagonal).map((d) => d.logProb(moved)),
    -1,
  );
  return add(reshape(logSoftmax(p.logits), [1, 1, m]), lp);
}

export const loss = (x1: Value, x2: Value, p: Params, ks: readonly [number, number][], diagonal = false): Value =>
  neg(mean(logsumexp(logJoint(x1, x2, p, ks, diagonal), [1, 2])));

/** The parameters as components, for drawing. */
export function readOut(p: Params, diagonal = false): Component[] {
  const mu1 = toFlat(p.mu1);
  const mu2 = toFlat(p.mu2);
  const a = toFlat(add(exp(p.logA), FLOOR[0] as number));
  const c = toFlat(add(exp(p.logC), FLOOR[1] as number));
  const b = diagonal ? mu1.map(() => 0) : toFlat(p.b);
  const w = toFlat(softmax(p.logits));
  return mu1.map((_, i) => ({
    w: w[i] as number,
    mu: [wrap2(mu1[i] as number, 0), wrap2(mu2[i] as number, 1)] as [number, number],
    a: a[i] as number,
    b: b[i] as number,
    c: c[i] as number,
  }));
}

/**
 * The log density of a mixture of components at each of the points, summing
 * enough copies (`k` either way) to be exact.
 *
 * The points are two parallel arrays so a figure can ask for a whole grid of
 * cells in one call, which is one tensor pass rather than a call per cell.
 */
function logMixture(mix: readonly Component[], x1: readonly number[], x2: readonly number[], k: number): Value {
  const moved = sub(reshape(pointsOf(tensor([...x1]), tensor([...x2])), [x1.length, 1, 2]), offsets(shifts(k)));
  const lp = stack(
    mix.map((g) =>
      multivariateNormal([...g.mu], {
        scaleTril: [
          [g.a, 0],
          [g.b, g.c],
        ],
      }).logProb(moved),
    ),
    -1,
  );
  const logW = reshape(log(tensor(mix.map((g) => g.w))), [1, 1, mix.length]);
  return logsumexp(add(logW, lp), [1, 2]);
}

/** The density of a mixture at each of the points. */
export const densities = (mix: readonly Component[], x1: readonly number[], x2: readonly number[], k = 4): number[] =>
  toFlat(exp(logMixture(mix, x1, x2, k)));

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

/** Draws from a mixture on the torus, folded into one period of each. */
export function sample(mix: readonly Component[], n: number, seed: number): [number[], number[]] {
  const [pick, noise1, noise2] = split(key(seed), 3) as [Key, Key, Key];
  const comp = toFlat(
    categorical(
      pick,
      mix.map((g) => g.w),
      [n],
    ),
  );
  const at = (f: (g: Component) => number) => tensor(comp.map((i) => f(mix[i] as Component)));
  const z1 = normalNoise(noise1, [n]);
  const z2 = normalNoise(noise2, [n]);
  const d1 = mul(
    at((g) => g.a),
    z1,
  );
  const d2 = add(
    mul(
      at((g) => g.b),
      z1,
    ),
    mul(
      at((g) => g.c),
      z2,
    ),
  );
  const fold = (centre: (g: Component) => number, d: Value, i: 0 | 1) =>
    toFlat(mod(add(at(centre), d), PERIOD[i] as number));
  return [fold((g) => g.mu[0], d1, 0), fold((g) => g.mu[1], d2, 1)];
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

/** What a torus fit records every `ROUND` steps. */
export type Row = { step: number; loss: number };

/** The whole of a fit at one step, which is all that a figure needs to draw it and a scrub needs to return to it. */
export type FitState = {
  params: Params;
  optimiser: unknown;
  /** Steps taken so far. */
  steps: number;
  /** The training loss of the last step taken. */
  loss: number;
  diagonal: boolean;
  trail: readonly Row[];
};

/** Steps between the points of the loss trace. */
export const ROUND = 20;

/** One fit, as an engine `Algorithm` so the figure can play, pause and scrub it. */
export function trainer(
  draws: readonly [number[], number[]],
  options: { components?: number; lr?: number; seed?: number; diagonal?: boolean } = {},
): Algorithm<FitState> {
  const ks = shifts();
  const x1 = tensor([...draws[0]]);
  const x2 = tensor([...draws[1]]);
  const rule = adam({ learningRate: options.lr ?? 0.05 });
  const diagonal = options.diagonal ?? false;
  const components = options.components ?? 2;
  const seed = options.seed ?? 0;

  return {
    name: "torus-fit",
    config: { components, lr: options.lr ?? 0.05, seed, diagonal },
    init: () => {
      const params = start(components, draws, seed);
      return { params, optimiser: rule.init(params), steps: 0, loss: Number.NaN, diagonal, trail: [] };
    },
    step: (s) => {
      const { value, grad } = valueAndGrad((p: Params) => loss(x1, x2, p, ks, diagonal))(s.params);
      const { updates, state } = rule.update(grad, s.optimiser as unknown[], s.params);
      const steps = s.steps + 1;
      const now = item(value);
      return {
        ...s,
        params: applyUpdates(s.params, updates) as Params,
        optimiser: state,
        steps,
        loss: now,
        trail: steps % ROUND === 0 ? [...s.trail, { step: steps, loss: now }] : s.trail,
      };
    },
    observe: (s) => ({ metrics: { loss: s.loss } }),
  };
}

/** Mean log density of a sample under a mixture, for scoring a fit. */
export const logLik = (x1: readonly number[], x2: readonly number[], mix: readonly Component[], k = 2): number =>
  item(mean(logMixture(mix, x1, x2, k)));

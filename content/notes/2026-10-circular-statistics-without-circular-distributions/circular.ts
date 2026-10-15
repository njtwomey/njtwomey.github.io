/**
 * Wrapped normals on a circle, fitted by gradient descent in the browser.
 *
 * This is `circular.py` from the draft, rewritten against `aifn-compute` so the
 * figures in the note fit their own models while a reader watches. The numbers
 * it produces are checked against the PyTorch run in `circular.test.ts`.
 *
 * The density that wrapping a normal round a circle of period G gives is
 *
 *     p(x) = sum_k N(x; mu + kG, sigma^2) = sum_k N(x - kG; mu, sigma^2)
 *
 * and the two forms are the same number, because a normal depends on x and mu
 * only through x - mu. The first shifts the component, which is what the paper
 * does. The second shifts the data. Everything here is a way of using that sum
 * as a training loss, and the point of the note is that the two give the same
 * fit while the obvious third way, treating the copies as extra examples, does
 * not.
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
  sum,
  tensor,
  toArray,
} from "aifn-compute";
import { adamRule, applyUpdates } from "aifn-compute/optim";
import { valueAndGrad } from "aifn-compute";
import { normals, stream, uniform } from "aifn-compute/foundation/random";

/** The period: hours in a day. Everything here is in hours. */
export const G = 24;

/** Shifts run -K..K, so three copies, which is enough while mu and x both sit in [0, G). */
export const K = 1;

/** The reference density, which nothing here comes close to truncating. */
const K_EXACT = 10;

const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);

export const METHODS = ["raw", "offset", "shift", "uniform", "posterior"] as const;
export type Method = (typeof METHODS)[number];

/**
 * What each loss does, in the words the figures use.
 *
 * The three the note compares are `raw`, `offset` and `shift`: a conventional
 * mixture that ignores the circle, the paper's way, and this note's way. The last two give the same fit,
 * which is the point. `uniform` and `posterior` score one copy per step rather
 * than summing, and are kept for their tests: the first is what you get by
 * adding the copies to the dataset and training as usual, and the second is the
 * sampled version that works.
 */
export const METHOD_LABEL: Record<Method, string> = {
  raw: "a conventional mixture",
  offset: "shift the means",
  shift: "shift the data",
  uniform: "one copy per step, drawn evenly",
  posterior: "one copy per step, drawn from p(k | x)",
};

/** The three the note compares, in the order it compares them. */
export const SHOWN: readonly Method[] = ["raw", "offset", "shift"];

/** The free parameters of a mixture, as a pytree for `valueAndGrad` and the optimiser. */
export type Params = { mu: Tensor; logSigma: Tensor; logits: Tensor };

/** A mixture read off as numbers, which is what the figures draw. */
export type Mixture = { w: number[]; mu: number[]; sigma: number[] };

/** The generating truths the note fits. */
export const SCENARIOS: Record<string, Mixture> = {
  // One component whose mass straddles the seam between 23:59 and 00:00.
  single: { w: [1], mu: [23], sigma: [3] },
  // Two components, one of them across the seam.
  mixture: { w: [0.6, 0.4], mu: [22, 9], sigma: [2.5, 2] },
};

/**
 * The numbers behind a reduction.
 *
 * `logsumexp` and the rest type as `Value`, since reducing every axis gives a
 * plain number, and every call here leaves axes standing.
 */
export const numbers = <T extends number[] | number[][]>(v: Value): T => toArray(v as Tensor) as T;

/** Positive remainder, which `%` is not for a negative left-hand side. */
export const wrap = (x: number) => ((x % G) + G) % G;

/** The shorter way round the circle between two angles. */
export const circDist = (a: number, b: number) => {
  const d = wrap(a - b);
  return Math.min(d, G - d);
};

const logNormal = (x: Value, mu: Value, sigma: Value): Value =>
  sub(sub(mul(-0.5, square(div(sub(x, mu), sigma))), log(sigma)), LOG_SQRT_2PI);

/**
 * `log w_m + log N(.)` for every example, copy and component: shape (n, |ks|, M).
 *
 * The two modes are the whole argument of the note. `offset` moves the
 * component and is the paper's construction; `shift` moves the data. They are
 * the same number term by term, which `circular.test.ts` checks.
 */
export function logJoint(x: Value, p: Params, ks: readonly number[], mode: "offset" | "shift"): Value {
  // Through `shapeOfValue` rather than `.shape`, because inside `valueAndGrad`
  // the parameters are traced values standing for tensors rather than tensors.
  const n = shapeOfValue(x)[0] ?? 0;
  const m = shapeOfValue(p.mu)[0] ?? 0;
  const xs = reshape(x, [n, 1, 1]);
  const k = reshape(tensor([...ks]), [1, ks.length, 1]);
  const mu = reshape(p.mu, [1, 1, m]);
  const sigma = reshape(exp(p.logSigma), [1, 1, m]);
  // log-softmax, spelled out: the logits less their own logsumexp.
  const logW = reshape(sub(p.logits, logsumexp(p.logits)), [1, 1, m]);
  const lp =
    mode === "offset"
      ? logNormal(xs, add(mu, mul(k, G)), sigma) // the component moves
      : logNormal(sub(xs, mul(k, G)), mu, sigma); // the data moves
  return add(logW, lp);
}

/** Mean negative log density under the wrapped mixture, with enough copies to be exact. */
export function exactNll(x: Tensor, p: Params): number {
  const ks = Array.from({ length: 2 * K_EXACT + 1 }, (_, i) => i - K_EXACT);
  return -(mean(logsumexp(logJoint(x, p, ks, "shift"), [1, 2])) as number);
}

/**
 * How many periods each mean has drifted from [0, G), read off plain numbers.
 *
 * A wrapped density is periodic in mu, so only [0, G) is a distinct answer, and
 * holding the means there is what makes three copies enough. This is counted
 * before the traced pass rather than inside it: the parameters are traced
 * there, so they cannot be read as numbers, and `mod` has a derivative of one
 * wherever it is defined, so subtracting a constant number of periods is the
 * same operation to the gradient and needs no new primitive.
 */
const periodsOf = (p: Params): number[] => (toArray(p.mu) as number[]).map((v) => Math.floor(v / G));

/** Subtract those periods, inside the traced pass, where they are constants. */
function fold(p: Params, periods: readonly number[] | undefined): Params {
  if (!periods || periods.every((q) => q === 0)) return p;
  return { ...p, mu: sub(p.mu, tensor(periods.map((q) => q * G))) as Tensor };
}

/** The parameters read as a wrapped mixture, whichever loss produced them. */
export function readOut(p: Params): Mixture {
  const mu = (toArray(p.mu) as number[]).map(wrap);
  const sigma = (toArray(exp(p.logSigma)) as number[]).map(Number);
  const logits = toArray(p.logits) as number[];
  const top = Math.max(...logits);
  const raw = logits.map((v) => Math.exp(v - top));
  const total = raw.reduce((a, b) => a + b, 0);
  return { mu, sigma, w: raw.map((v) => v / total) };
}

/** A mixture as parameters, for scoring a fit or a truth with the same code. */
export const asParams = (m: Mixture): Params => ({
  mu: tensor([...m.mu]),
  logSigma: tensor(m.sigma.map(Math.log)),
  logits: tensor(m.w.map(Math.log)),
});

/** The wrapped density of a mixture at each of `xs`, for drawing it. */
export function density(m: Mixture, xs: readonly number[]): number[] {
  return xs.map((x) => {
    let total = 0;
    for (let k = -K_EXACT; k <= K_EXACT; k++) {
      for (let i = 0; i < m.mu.length; i++) {
        const z = (x - k * G - (m.mu[i] as number)) / (m.sigma[i] as number);
        total += ((m.w[i] as number) * Math.exp(-0.5 * z * z)) / ((m.sigma[i] as number) * Math.sqrt(2 * Math.PI));
      }
    }
    return total;
  });
}

/**
 * The density the truncated loss actually sees: the copies kept, and no others.
 *
 * Distinct from `density`, which sums enough copies to be exact. Keeping them
 * apart matters: a figure showing what the loss sees has to fall off the end of
 * the day when the copies are taken away, and one drawn with `density` would
 * quietly stay periodic however few copies it was given.
 */
export function keptDensity(mu: number, sigma: number, ks: readonly number[], xs: readonly number[]): number[] {
  return xs.map((x) => {
    let total = 0;
    for (const k of ks) {
      const z = (x - k * G - mu) / sigma;
      total += Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    }
    return total;
  });
}

/**
 * Standard normal draws, unwrapped, for data that has to follow a distribution
 * as the reader moves it. Drawing `mu + sigma * z` from a fixed `z` keeps the
 * sample the same shape while it slides, where resampling on every change makes
 * the picture flicker and nothing can be read off it.
 */
export const standardDraws = (n: number, seed: number): number[] => toArray(normals(stream(seed), n)) as number[];

/** Draws from a wrapped mixture, already folded into [0, G). */
export function sample(m: Mixture, n: number, seed: number): number[] {
  const s = stream(seed);
  const u = toArray(uniform(s, 0, 1, { shape: [n] })) as number[];
  const cuts = m.w.map((_, i) => m.w.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const comp = u.map((v) => cuts.findIndex((c) => v < c)).map((i) => (i < 0 ? m.w.length - 1 : i));
  const mu = tensor(comp.map((i) => m.mu[i] as number));
  const sd = tensor(comp.map((i) => m.sigma[i] as number));
  return (toArray(normals(s, n, mu, sd)) as number[]).map(wrap);
}

/**
 * The copy each example is scored at, for the two sampled losses, as a 0/1 mask.
 *
 * A mask rather than a gather, because it multiplies into the loss as a
 * constant and needs no new primitive to differentiate. The draw itself is not
 * differentiated in either method, which is why the probabilities are read off
 * the current parameters as plain numbers before the traced pass begins.
 */
function pickCopy(x: Tensor, p: Params, ks: readonly number[], method: Method, s: ReturnType<typeof stream>): Tensor {
  const n = (x.shape as readonly number[])[0] ?? 0;
  const lj = numbers<number[][]>(logsumexp(logJoint(x, p, ks, "shift"), 2));
  const u = toArray(uniform(s, 0, 1, { shape: [n] })) as number[];
  const rows = lj.map((row, i) => {
    let probs: number[];
    if (method === "uniform") {
      probs = row.map(() => 1 / row.length);
    } else {
      const top = Math.max(...row);
      const w = row.map((v) => Math.exp(v - top));
      const total = w.reduce((a, b) => a + b, 0);
      probs = w.map((v) => v / total);
    }
    let acc = 0;
    let chosen = probs.length - 1;
    for (let k = 0; k < probs.length; k++) {
      acc += probs[k] as number;
      if ((u[i] as number) < acc) {
        chosen = k;
        break;
      }
    }
    return probs.map((_, k) => (k === chosen ? 1 : 0));
  });
  return tensor(rows);
}

/**
 * The loss one step minimises.
 *
 * `mask` carries the copy already drawn for the sampled methods and `periods`
 * the fold, both decided from the current parameters as numbers before this is
 * traced, which is what makes them constants to the gradient.
 */
export function loss(
  method: Method,
  x: Tensor,
  p: Params,
  extra: { mask?: Tensor; periods?: readonly number[] } = {},
): Value {
  const ks = Array.from({ length: 2 * K + 1 }, (_, i) => i - K);
  const folded = method === "raw" || method === "uniform" ? p : fold(p, extra.periods);
  if (method === "raw") return neg(mean(logsumexp(logJoint(x, folded, [0], "shift"), [1, 2])));
  if (method === "offset" || method === "shift") return neg(mean(logsumexp(logJoint(x, folded, ks, method), [1, 2])));
  // The sampled losses keep the components summed and sample only the copy.
  const lj = logsumexp(logJoint(x, folded, ks, "shift"), 2);
  return neg(mean(sum(mul(lj, extra.mask as Tensor), 1)));
}

/** Where a fit starts: means spread evenly round the circle, as the paper breaks symmetry. */
export function start(m: number): Params {
  return {
    mu: tensor(Array.from({ length: m }, (_, i) => ((i + 0.5) * G) / m)),
    logSigma: tensor(Array.from({ length: m }, () => Math.log(4))),
    logits: tensor(Array.from({ length: m }, () => 0)),
  };
}

/**
 * When a round counts as quiet, which is the paper's own convergence criterion:
 * no component mean has moved by more than thirty seconds of the day.
 */
export const QUIET = G / 1800;

/** Steps between convergence checks. One check on its own says very little. */
const ROUND = 25;

/**
 * How little the training loss may fall over `PATIENCE` steps for a fit to
 * count as finished.
 *
 * The movement criterion alone is not enough, and the note says why: a single
 * component started at the far side of the clock sits on a symmetric plateau
 * where the means barely move for a thousand steps and the loss is still
 * falling. Quiet means stopped only when both are true.
 *
 * The loss is compared as a running mean rather than as the value at a step,
 * because two of the five losses score one drawn copy per example and their
 * per-step values jump about by more than the trend they are being asked
 * about. Even smoothed they are the noisiest signal here, which the note says.
 */
const IMPROVEMENT = 1e-4;
const PATIENCE = 400;
/** Weight on the newest loss in the running mean: about a 20-step window. */
const SMOOTHING = 0.1;
/**
 * Rounds the test must pass in a row before a fit counts as finished.
 *
 * One round is not enough under a sampled loss, where a quiet round happens by
 * chance often enough to latch on the plateau: the posterior-draw fit reported
 * itself converged at step 500 while it was still a thousand steps from the
 * answer. Four in a row does not happen by accident.
 */
const CONSECUTIVE = 4;

export type Trainer = {
  /** Take `n` optimiser steps, and return the training loss after the last. */
  step: (n?: number) => number;
  /** Steps taken so far. */
  steps: () => number;
  /** The fit as a mixture, folded into one period. */
  fit: () => Mixture;
  /** Held-out nats per example above the generating density. */
  gap: () => number;
  /**
   * The step at which the means went quiet and the loss stopped falling, or
   * undefined while either is still moving.
   */
  settledAt: () => number | undefined;
};

/**
 * One fit, stepped by the figure that owns it.
 *
 * Adam with the optax-style rule rather than the `adam` algorithm, because the
 * objective changes at every step for the sampled losses and a figure wants to
 * take one step at a time anyway.
 */
export function trainer(
  method: Method,
  train: readonly number[],
  test: readonly number[],
  truth: Mixture,
  options: { components?: number; lr?: number; seed?: number } = {},
): Trainer {
  const m = options.components ?? truth.mu.length;
  const x = tensor([...train]);
  const xTest = tensor([...test]);
  const ks = Array.from({ length: 2 * K + 1 }, (_, i) => i - K);
  const s = stream(options.seed ?? 0);
  const rule = adamRule({ stepSize: options.lr ?? 0.03 });

  let params = start(m);
  let state = rule.init(params);
  let taken = 0;
  const oracle = exactNll(xTest, asParams(truth));

  // Convergence, checked once a round against the previous round's means and
  // against the loss `PATIENCE` steps ago.
  let settled: number | undefined;
  let lastMeans = readOut(params).mu;
  let lastCheck = 0;
  let smoothed: number | undefined;
  let inARow = 0;
  const losses = new Map<number, number>();

  // Both are set from the plain parameters before each traced pass, and are
  // constants inside it.
  let extra: { mask?: Tensor; periods?: readonly number[] } = {};
  const graded = valueAndGrad((p: Params) => loss(method, x, p, extra));

  return {
    step(n = 1) {
      let value = 0;
      for (let i = 0; i < n; i++) {
        extra = {
          periods: periodsOf(params),
          mask: method === "uniform" || method === "posterior" ? pickCopy(x, params, ks, method, s) : undefined,
        };
        const { value: v, grad } = graded(params);
        const next = rule.update(grad as Params, state, params);
        params = applyUpdates(params, next.updates);
        state = next.state;
        value = v as number;
        taken += 1;
        smoothed = smoothed === undefined ? value : smoothed + SMOOTHING * (value - smoothed);

        if (taken - lastCheck >= ROUND) {
          lastCheck = taken;
          losses.set(taken, smoothed);
          const means = readOut(params).mu;
          const moved = Math.max(...means.map((mu, j) => circDist(mu, lastMeans[j] ?? mu)));
          lastMeans = means;
          const before = losses.get(taken - PATIENCE);
          const falling = before === undefined || before - smoothed > IMPROVEMENT;
          inARow = moved < QUIET && !falling ? inARow + 1 : 0;
          if (settled === undefined && inARow >= CONSECUTIVE) settled = taken;
        }
      }
      return value;
    },
    steps: () => taken,
    settledAt: () => settled,
    fit: () => readOut(params),
    gap: () => exactNll(xTest, asParams(readOut(params))) - oracle,
  };
}

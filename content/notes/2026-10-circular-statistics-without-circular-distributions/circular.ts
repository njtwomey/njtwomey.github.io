/**
 * Wrapped normals on a circle, fitted by gradient descent in the browser.
 *
 * This is `circular.py` from the draft, rewritten against `omai-engine` so the
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
 *
 * The normal itself is the engine's, and so are the optimiser, the gradient and
 * the random draws. What lives here is the one thing the engine does not have,
 * the sum over copies as a loss, and the stepping of a fit as an `Algorithm` so
 * that a figure can play, pause and scrub it like any other run.
 */
import { valueAndGrad } from "omai-engine/autodiff";
import { normal } from "omai-engine/dists";
import { adam, applyUpdates } from "omai-engine/optim";
import { type Key, categorical, key, normal as normalNoise, split, uniform } from "omai-engine/random";
import {
  type Value,
  add,
  argmax,
  exp,
  item,
  log,
  logSoftmax,
  logsumexp,
  mean,
  mod,
  mul,
  neg,
  oneHot,
  reshape,
  softmax,
  sub,
  sum,
  tensor,
  toFlat,
} from "omai-engine/tensor";
import type { Algorithm } from "omai-engine/trace";

/** The period: hours in a day. Everything here is in hours. */
export const G = 24;

/** Shifts run -K..K, so three copies, which is enough while mu and x both sit in [0, G). */
export const K = 1;

/** The reference density, which nothing here comes close to truncating. */
const K_EXACT = 10;

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
export type Params = { mu: Value; logSigma: Value; logits: Value };

/** A mixture read off as numbers, which is what the figures draw. */
export type Mixture = { w: number[]; mu: number[]; sigma: number[] };

/** The generating truths the note fits. */
export const SCENARIOS: Record<string, Mixture> = {
  // One component whose mass straddles the seam between 23:59 and 00:00.
  single: { w: [1], mu: [23], sigma: [3] },
  // Two components, one of them across the seam.
  mixture: { w: [0.6, 0.4], mu: [22, 9], sigma: [2.5, 2] },
};

/** Positive remainder, which `%` is not for a negative left-hand side. */
export const wrap = (x: number): number => item(mod(x, G));

/** The same remainder over a whole array. */
export const wrapAll = (xs: readonly number[]): number[] => toFlat(mod(xs, G));

/** The shorter way round the circle between two angles. */
export const circDist = (a: number, b: number) => {
  const d = wrap(a - b);
  return Math.min(d, G - d);
};

/** The shifts -k..k, as the copies a loss scores. */
export const copies = (k: number): number[] => Array.from({ length: 2 * k + 1 }, (_, i) => i - k);

/**
 * `log w_m + log N(.)` for every example, copy and component: shape (n, |ks|, M).
 *
 * The two modes are the whole argument of the note. `offset` moves the
 * component and is the paper's construction; `shift` moves the data. They are
 * the same number term by term, which `circular.test.ts` checks.
 */
export function logJoint(x: Value, p: Params, ks: readonly number[], mode: "offset" | "shift"): Value {
  const n = x.shape[0] ?? 0;
  const m = p.mu.shape[0] ?? 0;
  const xs = reshape(x, [n, 1, 1]);
  const k = reshape(tensor([...ks]), [1, ks.length, 1]);
  const mu = reshape(p.mu, [1, 1, m]);
  const sigma = reshape(exp(p.logSigma), [1, 1, m]);
  const logW = reshape(logSoftmax(p.logits), [1, 1, m]);
  const lp =
    mode === "offset"
      ? normal(add(mu, mul(k, G)), sigma).logProb(xs) // the component moves
      : normal(mu, sigma).logProb(sub(xs, mul(k, G))); // the data moves
  return add(logW, lp);
}

/** Mean negative log density under the wrapped mixture, with enough copies to be exact. */
export function exactNll(x: Value, p: Params): number {
  return -item(mean(logsumexp(logJoint(x, p, copies(K_EXACT), "shift"), [1, 2])));
}

/**
 * How many periods each mean has drifted from [0, G), read off plain numbers.
 *
 * A wrapped density is periodic in mu, so only [0, G) is a distinct answer, and
 * holding the means there is what makes three copies enough. This is counted
 * before the traced pass rather than inside it: the parameters are traced
 * there, so they cannot be read as numbers, and subtracting a constant number
 * of periods is the same operation to the gradient as not subtracting them.
 */
const periodsOf = (p: Params): number[] => toFlat(p.mu).map((v) => Math.floor(v / G));

/** Subtract those periods, inside the traced pass, where they are constants. */
function fold(p: Params, periods: readonly number[] | undefined): Params {
  if (!periods || periods.every((q) => q === 0)) return p;
  return { ...p, mu: sub(p.mu, tensor(periods.map((q) => q * G))) };
}

/** The parameters read as a wrapped mixture, whichever loss produced them. */
export function readOut(p: Params): Mixture {
  return { mu: toFlat(mod(p.mu, G)), sigma: toFlat(exp(p.logSigma)), w: toFlat(softmax(p.logits)) };
}

/** A mixture as parameters, for scoring a fit or a truth with the same code. */
export const asParams = (m: Mixture): Params => ({
  mu: tensor([...m.mu]),
  logSigma: log(tensor([...m.sigma])),
  logits: log(tensor([...m.w])),
});

/**
 * The density of a mixture whose components are copied at the shifts `ks`,
 * at each of `xs`: the sum over copies and components, written once.
 */
function copiedDensity(m: Mixture, ks: readonly number[], xs: readonly number[]): number[] {
  const n = xs.length;
  const width = m.mu.length;
  const x = reshape(tensor([...xs]), [n, 1, 1]);
  const k = reshape(tensor([...ks]), [1, ks.length, 1]);
  const component = normal(reshape(tensor([...m.mu]), [1, 1, width]), reshape(tensor([...m.sigma]), [1, 1, width]));
  const w = reshape(tensor([...m.w]), [1, 1, width]);
  return toFlat(sum(mul(w, component.prob(sub(x, mul(k, G)))), [1, 2]));
}

/** The wrapped density of a mixture at each of `xs`, for drawing it. */
export const density = (m: Mixture, xs: readonly number[]): number[] => copiedDensity(m, copies(K_EXACT), xs);

/**
 * The density the truncated loss actually sees: the copies kept, and no others.
 *
 * Distinct from `density`, which sums enough copies to be exact. Keeping them
 * apart matters: a figure showing what the loss sees has to fall off the end of
 * the day when the copies are taken away, and one drawn with `density` would
 * quietly stay periodic however few copies it was given.
 */
export const keptDensity = (mu: number, sigma: number, ks: readonly number[], xs: readonly number[]): number[] =>
  copiedDensity({ w: [1], mu: [mu], sigma: [sigma] }, ks, xs);

/**
 * Standard normal draws, unwrapped, for data that has to follow a distribution
 * as the reader moves it. Drawing `mu + sigma * z` from a fixed `z` keeps the
 * sample the same shape while it slides, where resampling on every change makes
 * the picture flicker and nothing can be read off it.
 */
export const standardDraws = (n: number, seed: number): number[] => toFlat(normalNoise(key(seed), [n]));

/** Draws from a wrapped mixture, already folded into [0, G). */
export function sample(m: Mixture, n: number, seed: number): number[] {
  const [pick, noise] = split(key(seed), 2) as [Key, Key];
  const comp = toFlat(categorical(pick, m.w, [n]));
  const mu = tensor(comp.map((i) => m.mu[i] as number));
  const sd = tensor(comp.map((i) => m.sigma[i] as number));
  return toFlat(mod(add(mu, mul(sd, normalNoise(noise, [n]))), G));
}

/**
 * The copy each example is scored at, for the two sampled losses, as a 0/1 mask.
 *
 * A mask rather than a gather, because it multiplies into the loss as a
 * constant. The draw is not differentiated in either method, which is why it is
 * made from the current parameters as plain numbers before the traced pass
 * begins. The draw is a Gumbel-max over the copies: adding Gumbel noise to the
 * log probabilities and taking the largest picks a copy with exactly those
 * probabilities, so `uniform` is the same draw with no log probabilities.
 */
function pickCopy(x: Value, p: Params, ks: readonly number[], method: Method, k: Key): Value {
  const n = x.shape[0] ?? 0;
  const gumbel = neg(log(neg(log(uniform(k, [n, ks.length])))));
  const scores = method === "uniform" ? gumbel : add(logsumexp(logJoint(x, p, ks, "shift"), 2), gumbel);
  return oneHot(argmax(scores, 1), ks.length);
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
  x: Value,
  p: Params,
  extra: { mask?: Value; periods?: readonly number[] } = {},
): Value {
  const ks = copies(K);
  const folded = method === "raw" || method === "uniform" ? p : fold(p, extra.periods);
  if (method === "raw") return neg(mean(logsumexp(logJoint(x, folded, [0], "shift"), [1, 2])));
  if (method === "offset" || method === "shift") return neg(mean(logsumexp(logJoint(x, folded, ks, method), [1, 2])));
  // The sampled losses keep the components summed and sample only the copy.
  const lj = logsumexp(logJoint(x, folded, ks, "shift"), 2);
  return neg(mean(sum(mul(lj, extra.mask as Value), 1)));
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

/** Steps between convergence checks, and between the rows of a fit's trail. One check on its own says very little. */
export const ROUND = 25;

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

/** What a fit records every `ROUND` steps: the fit itself, because a figure that draws the parameters over the run needs them. */
export type Row = { step: number; gap: number; loss: number; fit: Mixture };

/** The whole of a fit at one step, which is all that a figure needs to draw it and a scrub needs to return to it. */
export type FitState = {
  params: Params;
  optimiser: unknown;
  /** Steps taken so far. */
  steps: number;
  /** The training loss of the last step taken. */
  loss: number;
  smoothed: number | undefined;
  /** The smoothed loss at each round, for the patience test. */
  rounds: readonly number[];
  lastMeans: readonly number[];
  inARow: number;
  /** The step at which the means went quiet and the loss stopped falling, or undefined while either is still moving. */
  settled: number | undefined;
  trail: readonly Row[];
};

/** Held-out nats per example above the generating density, for a fit scored on `test`. */
export function heldOut(test: readonly number[], truth: Mixture): (fit: Mixture) => number {
  const x = tensor([...test]);
  const oracle = exactNll(x, asParams(truth));
  return (fit) => exactNll(x, asParams(fit)) - oracle;
}

/**
 * One fit as an engine `Algorithm`, so a figure can play it, pause it and scrub
 * it, and a test can run it with `runAlgorithm`.
 *
 * Adam is the engine's `adam` rather than the `adam` algorithm in `omai-engine/optim`,
 * because the objective changes at every step for the sampled losses. The
 * sampled losses draw from the step's own key, so a run is the same however it
 * was paused or scrubbed.
 */
export function trainer(
  method: Method,
  train: readonly number[],
  test: readonly number[],
  truth: Mixture,
  options: { components?: number; lr?: number } = {},
): Algorithm<FitState> {
  const m = options.components ?? truth.mu.length;
  const lr = options.lr ?? 0.03;
  const x = tensor([...train]);
  const ks = copies(K);
  const rule = adam({ learningRate: lr });
  const gap = heldOut(test, truth);
  const sampled = method === "uniform" || method === "posterior";

  return {
    name: "circular-fit",
    config: { method, components: m, lr },
    init: () => {
      const params = start(m);
      return {
        params,
        optimiser: rule.init(params),
        steps: 0,
        loss: Number.NaN,
        smoothed: undefined,
        rounds: [],
        lastMeans: readOut(params).mu,
        inARow: 0,
        settled: undefined,
        trail: [],
      };
    },
    step: (s, ctx) => {
      const mask = sampled ? pickCopy(x, s.params, ks, method, ctx.key) : undefined;
      const { value, grad } = valueAndGrad((p: Params) => loss(method, x, p, { mask, periods: periodsOf(s.params) }))(
        s.params,
      );
      const { updates, state } = rule.update(grad, s.optimiser as unknown[], s.params);
      const params = applyUpdates(s.params, updates) as Params;
      const now = item(value);
      const steps = s.steps + 1;
      const smoothed = s.smoothed === undefined ? now : s.smoothed + SMOOTHING * (now - s.smoothed);
      const next: FitState = { ...s, params, optimiser: state, steps, loss: now, smoothed };
      if (steps % ROUND !== 0) return next;

      // Convergence, checked once a round against the previous round's means and
      // against the loss `PATIENCE` steps ago.
      const fit = readOut(params);
      const rounds = [...s.rounds, smoothed];
      const moved = Math.max(...fit.mu.map((mu, j) => circDist(mu, s.lastMeans[j] ?? mu)));
      const before = rounds[rounds.length - 1 - PATIENCE / ROUND];
      const falling = before === undefined || before - smoothed > IMPROVEMENT;
      const inARow = moved < QUIET && !falling ? s.inARow + 1 : 0;
      return {
        ...next,
        rounds,
        lastMeans: fit.mu,
        inARow,
        settled: s.settled === undefined && inARow >= CONSECUTIVE ? steps : s.settled,
        trail: [...s.trail, { step: steps, gap: gap(fit), loss: now, fit }],
      };
    },
    observe: (s) => ({ metrics: { loss: s.loss } }),
  };
}

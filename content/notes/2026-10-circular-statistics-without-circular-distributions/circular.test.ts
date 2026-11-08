import { describe, expect, it } from "vitest";
import { item, logsumexp, mean, tensor, toFlat } from "omai-engine/tensor";
import { runAlgorithm } from "omai-engine/trace";
import {
  G,
  K,
  QUIET,
  SCENARIOS,
  asParams,
  circDist,
  copies,
  exactNll,
  heldOut,
  logJoint,
  sample,
  trainer,
  wrap,
  readOut,
  type FitState,
  type Mixture,
  type Method,
} from "./circular";

/**
 * The claim the note makes is an identity, so it is worth a test rather than a
 * paragraph. These also pin the fitted numbers the prose quotes, which were
 * produced by the PyTorch run in the draft: a change to the engine that moves
 * them should fail here rather than quietly contradict the note.
 */

const ks = copies;

const nll = (x: ReturnType<typeof tensor>, p: Parameters<typeof exactNll>[1], k: number, mode: "offset" | "shift") =>
  -item(mean(logsumexp(logJoint(x, p, ks(k), mode), [1, 2])));

/** Run a fit for `steps` and read it back, the way a figure reads the state it is shown. */
function fitted(method: Method, train: number[], test: number[], truth: Mixture, steps: number, components?: number) {
  const run = runAlgorithm(trainer(method, train, test, truth, components === undefined ? {} : { components }), {
    maxSteps: steps,
    seed: 0,
  });
  const state: FitState = run.state;
  const fit = readOut(state.params);
  return { state, fit, gap: heldOut(test, truth)(fit) };
}

describe("shifting the data and shifting the means", () => {
  const p = asParams({ w: [0.5, 0.5], mu: [3, 17.5], sigma: [2, 5] });
  const x = tensor(Array.from({ length: 500 }, (_, i) => (i * G) / 500));

  it("give the same loss, to machine precision", () => {
    const a = toFlat(logsumexp(logJoint(x, p, ks(K), "offset"), [1, 2]));
    const b = toFlat(logsumexp(logJoint(x, p, ks(K), "shift"), [1, 2]));
    const worst = Math.max(...a.map((v, i) => Math.abs(v - (b[i] as number))));
    expect(worst).toBeLessThan(1e-12);
  });

  it("need only three copies at the scales this note uses", () => {
    const wide = asParams({ w: [1], mu: [3], sigma: [3] });
    expect(Math.abs(nll(x, wide, K, "shift") - exactNll(x, wide))).toBeLessThan(1e-9);
  });
});

/**
 * The bound the note states for keeping three copies.
 *
 * With x and mu both in [0, G) the dropped terms sit at least one period from
 * the mean and the nearest kept one at most half a period, so the relative
 * error is at most 2 exp(-3a/4) / (1 - exp(-3a)) with a = G^2 / 2 sigma^2.
 * This checks the bound holds and that it is not so loose as to be useless.
 */
describe("the cost of keeping three copies", () => {
  const bound = (sigma: number) => {
    const a = (G * G) / (2 * sigma * sigma);
    return (2 * Math.exp((-3 * a) / 4)) / (1 - Math.exp(-3 * a));
  };
  const x = tensor(Array.from({ length: 400 }, (_, i) => (i * G) / 400));

  it.each([3, 4, 6, 8])("holds at sigma = %i hours", (sigma) => {
    const p = asParams({ w: [1], mu: [7.5], sigma: [sigma] });
    const error = nll(x, p, K, "shift") - exactNll(x, p);
    // Truncating drops mass, so the truncated density is smaller and its
    // negative log larger: the error has a sign, and the bound is on its size.
    expect(error).toBeGreaterThanOrEqual(0);
    expect(error).toBeLessThanOrEqual(bound(sigma));
  });

  it("is small enough to ignore at the scales the note fits, and not at twice them", () => {
    expect(bound(3)).toBeLessThan(1e-9);
    expect(bound(G / 4)).toBeLessThan(0.005);
    expect(bound(G / 2)).toBeGreaterThan(0.4);
  });
});

/**
 * 1600 steps, because a single component starts at 12:00 by the paper's
 * even spacing, which is the antipode of the truth, and the fit sits on that
 * plateau for about 1400 of them before it falls off. The draft reports the
 * same plateau from PyTorch.
 */
describe("fitting a normal that straddles midnight", () => {
  const truth = SCENARIOS.single!;
  const train = sample(truth, 500, 0);
  const test = sample(truth, 4000, 1);

  it("draws land in one period", () => {
    expect(Math.min(...train)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...train)).toBeLessThan(G);
    expect(train.map(wrap)).toEqual(train);
  });

  it("recovers the parameters when the data is shifted", () => {
    const { fit, gap } = fitted("shift", train, test, truth, 1600);
    expect(circDist(fit.mu[0] as number, 23)).toBeLessThan(0.5);
    expect(fit.sigma[0]).toBeCloseTo(3, 0);
    expect(gap).toBeLessThan(0.02);
  });

  it("does not recover them without the shift, and widens to cover the seam", () => {
    const { fit, gap } = fitted("raw", train, test, truth, 1600);
    expect(fit.sigma[0]).toBeGreaterThan(6);
    expect(gap).toBeGreaterThan(0.4);
  });

  it("widens further when a copy is drawn evenly, as the draft reports", () => {
    const { fit } = fitted("uniform", train, test, truth, 1600);
    expect(fit.sigma[0]).toBeGreaterThan(10);
  });

  it("recovers them when the copy is drawn from the posterior over copies", () => {
    const { fit, gap } = fitted("posterior", train, test, truth, 1600);
    expect(circDist(fit.mu[0] as number, 23)).toBeLessThan(0.5);
    expect(gap).toBeLessThan(0.05);
  });

  it("draws its copies from the run's key, so a seed names the run", () => {
    const run = (seed: number) =>
      readOut(runAlgorithm(trainer("posterior", train, test, truth), { maxSteps: 200, seed }).state.params);
    expect(run(0)).toEqual(run(0));
    expect(run(0)).not.toEqual(run(1));
  });
});

/**
 * The convergence test, and the plateau it has to survive.
 *
 * The paper's criterion is movement alone: a round is quiet when no component
 * mean has moved by more than thirty seconds of the day. On its own that is
 * fooled here, because a single component started at the far side of the clock
 * sits for a thousand steps barely moving while the loss falls. The guard is
 * that the loss must have stopped falling as well.
 */
describe("knowing when a fit has finished", () => {
  it("does not call a quiet plateau converged", () => {
    // One component on the two-component truth: it settles between the two and
    // the means stop moving long before the scale has finished growing.
    const truth = SCENARIOS.mixture!;
    // Seed 2 is a sample on which the lone mean has stopped drifting by step 300;
    // on seeds 0 and 1 it is still creeping a little faster than thirty seconds a round.
    const train = sample(truth, 300, 2);
    const test = sample(truth, 1000, 1);
    const at = (steps: number) => fitted("shift", train, test, truth, steps, 1);
    const before = at(300);
    const after = at(325);
    // Quiet by the paper's criterion, which is movement alone.
    expect(circDist(after.fit.mu[0] as number, before.fit.mu[0] as number)).toBeLessThan(QUIET);
    // And not finished, because the loss is still falling.
    expect(after.state.settled).toBeUndefined();
  });

  it("calls a fit converged once it has found the answer", () => {
    const truth = SCENARIOS.single!;
    const { state, fit } = fitted("shift", sample(truth, 500, 0), sample(truth, 2000, 1), truth, 2400);
    expect(state.settled).toBeDefined();
    expect(state.settled).toBeGreaterThan(1400);
    expect(circDist(fit.mu[0] as number, 23)).toBeLessThan(0.5);
  });
});

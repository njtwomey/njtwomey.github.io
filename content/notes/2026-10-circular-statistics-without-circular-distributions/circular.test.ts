import { describe, expect, it } from "vitest";
import { logsumexp, mean, tensor } from "aifn-compute";
import {
  G,
  K,
  QUIET,
  SCENARIOS,
  asParams,
  circDist,
  exactNll,
  logJoint,
  numbers,
  sample,
  trainer,
  wrap,
} from "./circular";

/**
 * The claim the note makes is an identity, so it is worth a test rather than a
 * paragraph. These also pin the fitted numbers the prose quotes, which were
 * produced by the PyTorch run in the draft: a change to the engine that moves
 * them should fail here rather than quietly contradict the note.
 */

const ks = (k: number) => Array.from({ length: 2 * k + 1 }, (_, i) => i - k);

const nll = (x: ReturnType<typeof tensor>, p: Parameters<typeof exactNll>[1], k: number, mode: "offset" | "shift") =>
  -(mean(logsumexp(logJoint(x, p, ks(k), mode), [1, 2])) as number);

describe("shifting the data and shifting the means", () => {
  const p = asParams({ w: [0.5, 0.5], mu: [3, 17.5], sigma: [2, 5] });
  const x = tensor(Array.from({ length: 500 }, (_, i) => (i * G) / 500));

  it("give the same loss, to machine precision", () => {
    const a = numbers<number[]>(logsumexp(logJoint(x, p, ks(K), "offset"), [1, 2]));
    const b = numbers<number[]>(logsumexp(logJoint(x, p, ks(K), "shift"), [1, 2]));
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
    const t = trainer("shift", train, test, truth, { seed: 0 });
    t.step(1600);
    const fit = t.fit();
    expect(circDist(fit.mu[0] as number, 23)).toBeLessThan(0.5);
    expect(fit.sigma[0]).toBeCloseTo(3, 0);
    expect(t.gap()).toBeLessThan(0.02);
  });

  it("does not recover them without the shift, and widens to cover the seam", () => {
    const t = trainer("raw", train, test, truth, { seed: 0 });
    t.step(1600);
    expect(t.fit().sigma[0]).toBeGreaterThan(6);
    expect(t.gap()).toBeGreaterThan(0.4);
  });

  it("widens further when a copy is drawn evenly, as the draft reports", () => {
    const t = trainer("uniform", train, test, truth, { seed: 0 });
    t.step(1600);
    expect(t.fit().sigma[0]).toBeGreaterThan(10);
  });

  it("recovers them when the copy is drawn from the posterior over copies", () => {
    const t = trainer("posterior", train, test, truth, { seed: 0 });
    t.step(1600);
    expect(circDist(t.fit().mu[0] as number, 23)).toBeLessThan(0.5);
    expect(t.gap()).toBeLessThan(0.05);
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
    const t = trainer("shift", sample(truth, 300, 0), sample(truth, 1000, 1), truth, {
      components: 1,
      seed: 0,
    });
    t.step(300);
    const before = t.fit().mu[0] as number;
    t.step(25);
    // Quiet by the paper's criterion, which is movement alone.
    expect(circDist(t.fit().mu[0] as number, before)).toBeLessThan(QUIET);
    // And not finished, because the loss is still falling.
    expect(t.settledAt()).toBeUndefined();
  });

  it("calls a fit converged once it has found the answer", () => {
    const truth = SCENARIOS.single!;
    const t = trainer("shift", sample(truth, 500, 0), sample(truth, 2000, 1), truth, { seed: 0 });
    t.step(2400);
    expect(t.settledAt()).toBeDefined();
    expect(t.settledAt()).toBeGreaterThan(1400);
    expect(circDist(t.fit().mu[0] as number, 23)).toBeLessThan(0.5);
  });
});

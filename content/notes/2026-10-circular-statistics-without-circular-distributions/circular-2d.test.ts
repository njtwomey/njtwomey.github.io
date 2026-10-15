import { describe, expect, it } from "vitest";
import { logsumexp, tensor } from "aifn-compute";
import { numbers } from "./circular";
import {
  FLOOR,
  PERIOD,
  TRUTH,
  density,
  logJoint,
  logLik,
  sample,
  shifts,
  start,
  trainer,
  wrap2,
  perpendicularTip,
} from "./circular-2d";

/**
 * The two-dimensional case, which the note offers as the generalisation. The
 * identity is the same one: a normal depends on x and mu through x - mu, in any
 * number of dimensions, so the grid of shifted means and the grid of shifted
 * data are the same sum.
 */
describe("on a torus", () => {
  it("has nine copies for one step either way", () => {
    expect(shifts()).toHaveLength(9);
    expect(shifts(2)).toHaveLength(25);
  });

  it("gives the same loss whether the data or the means are shifted", () => {
    const p = start(2);
    const [x1, x2] = sample(TRUTH, 200, 3);
    const ks = shifts();
    const moved = numbers<number[]>(logsumexp(logJoint(tensor(x1), tensor(x2), p, ks), [1, 2]));

    // Shifting the means instead: the same sum, written the other way round.
    const byHand = x1.map((x, i) => {
      const terms = ks.flatMap(([k1, k2]) =>
        [0, 1].map((m) => {
          const mu1 = (numbers<number[]>(p.mu1)[m] as number) + k1 * (PERIOD[0] as number);
          const mu2 = (numbers<number[]>(p.mu2)[m] as number) + k2 * (PERIOD[1] as number);
          const a = Math.exp(numbers<number[]>(p.logA)[m] as number) + (FLOOR[0] as number);
          const c = Math.exp(numbers<number[]>(p.logC)[m] as number) + (FLOOR[1] as number);
          const b = numbers<number[]>(p.b)[m] as number;
          const y1 = (x - mu1) / a;
          const y2 = ((x2[i] as number) - mu2 - b * y1) / c;
          return -0.5 * (y1 * y1 + y2 * y2) - Math.log(a) - Math.log(c) - Math.log(2 * Math.PI) - Math.log(2);
        }),
      );
      const top = Math.max(...terms);
      return top + Math.log(terms.reduce((t, v) => t + Math.exp(v - top), 0));
    });

    const worst = Math.max(...moved.map((v, i) => Math.abs(v - (byHand[i] as number))));
    expect(worst).toBeLessThan(1e-10);
  });

  it("draws land inside one period of each", () => {
    const [x1, x2] = sample(TRUTH, 500, 1);
    expect(Math.min(...x1)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...x1)).toBeLessThan(PERIOD[0] as number);
    expect(Math.max(...x2)).toBeLessThan(PERIOD[1] as number);
    expect(x1.map((v) => wrap2(v, 0))).toEqual(x1);
  });

  it("integrates to one over the surface", () => {
    const n = 120;
    const [g1, g2] = PERIOD as [number, number];
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        total += density(TRUTH, ((i + 0.5) * g1) / n, ((j + 0.5) * g2) / n);
      }
    }
    expect((total * g1 * g2) / (n * n)).toBeCloseTo(1, 3);
  });

  it("recovers a mixture that wraps in both directions", () => {
    const train = sample(TRUTH, 800, 0);
    const test = sample(TRUTH, 2000, 1);
    const t = trainer(train, { components: 2 });
    t.step(1200);
    const fit = t.fit();

    // Matched to the truth by which mean each fitted component landed nearest.
    const near = (c: (typeof fit)[number], truth: (typeof TRUTH)[number]) => {
      const d1 = Math.min(Math.abs(c.mu[0] - truth.mu[0]), (PERIOD[0] as number) - Math.abs(c.mu[0] - truth.mu[0]));
      const d2 = Math.min(Math.abs(c.mu[1] - truth.mu[1]), (PERIOD[1] as number) - Math.abs(c.mu[1] - truth.mu[1]));
      return Math.hypot(d1, d2);
    };
    for (const truth of TRUTH) {
      expect(Math.min(...fit.map((c) => near(c, truth)))).toBeLessThan(0.08);
    }
    // And it scores close to the density that made the draws.
    expect(logLik(test[0], test[1], TRUTH) - logLik(test[0], test[1], fit)).toBeLessThan(0.05);
    // Nine copies and a full covariance: slower than the line, still seconds.
  }, 60_000);
});

describe("dragging a principal axis", () => {
  const mean = [0.5, 0.5] as const;

  it("puts the other tip at a right angle", () => {
    const moved = perpendicularTip(mean, [0.7, 0.6], [0.5, 0.62]);
    const v: [number, number] = [0.7 - mean[0], 0.6 - mean[1]];
    const w: [number, number] = [moved[0] - mean[0], moved[1] - mean[1]];
    expect(v[0] * w[0] + v[1] * w[1]).toBeCloseTo(0, 12);
  });

  it("keeps the follower's length and the side it was on", () => {
    const before = [0.5, 0.62] as const;
    const moved = perpendicularTip(mean, [0.7, 0.6], before);
    expect(Math.hypot(moved[0] - mean[0], moved[1] - mean[1])).toBeCloseTo(
      Math.hypot(before[0] - mean[0], before[1] - mean[1]),
      12,
    );
    // Still above the driving axis rather than flipped below it.
    expect(moved[1]).toBeGreaterThan(mean[1]);
  });

  it("leaves a tip alone when the axis it answers to has no length", () => {
    expect(perpendicularTip(mean, mean, [0.5, 0.62])).toEqual([0.5, 0.62]);
  });
});

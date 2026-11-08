import { useCallback, useMemo } from "react";
import { Undo2 } from "lucide-react";
import { linspace, logsumexp, tensor, toFlat } from "omai-engine/tensor";
import { cartesian } from "omai-render/charts";
import type { Figure } from "omai-render/figure";
import { Button } from "@/components/ui/button";
import { G, asParams, copies, keptDensity, logJoint, standardDraws, wrapAll } from "./circular";
import { ChartPanel, Controls, FigureBox, Readouts, useParams, type Layers, Num, Switch } from "./figure-kit";

/**
 * The identity the note turns on, drawn twice.
 *
 * Moving the component and moving the data are the same sum term by term, so
 * the two pictures are different and the density they add up to is one curve.
 * The readout computes both losses on the spot rather than asserting it, which
 * is the only honest way to show an equality in a figure a reader can move.
 *
 * Three periods across, because the copies are the point and cropping them to
 * one period would hide the thing being explained.
 */

const xs = toFlat(linspace(-G, 2 * G, 721));
const inPeriod = toFlat(linspace(0, G, 361));

/**
 * Bars for a subset of the draws, scaled by the whole sample.
 *
 * Binning a subset on its own normalises it to its own size, so splitting the
 * copies into the nearest and the rest and drawing each as a histogram made the
 * small half as tall as the large one. Weighting every draw by one over the
 * whole sample keeps a single denominator, so the highlighted bars are a part
 * of the picture rather than a picture of their own.
 */
const BIN = 1;
function bars(
  L: Layers,
  values: readonly number[],
  total: number,
  options: { name: string; colour: string; opacity: number },
) {
  if (values.length === 0) return [];
  return [
    L.histogram(values, {
      bins: Math.round((3 * G) / BIN),
      range: [-G, 2 * G],
      weights: values.map(() => 1 / (total * BIN)),
      ...options,
    }),
  ];
}

/** A vertical dashed line, which is how the charts here mark midnight. */
const midnight = (L: Layers, at: number, top: number) =>
  L.lines([{ x: [at, at], y: [0, top], dash: "dashed", colour: "muted", width: 1.5, name: "__midnight" }]);

const INITIAL = { mu: 23, sigma: 3, copies: 1, offset: false, log: false };

export function Shifts() {
  const { values: state, set, reset, isDefault } = useParams(INITIAL);

  // The data is drawn from the distribution as it stands rather than fixed in
  // place, because a sample that stays put while the mean slides away from it
  // is asking the reader to ignore half of what they can see. The draws are
  // one fixed set of standard normals put through the current parameters, so
  // they follow the mean and the scale without the sample changing shape.
  const z = useMemo(() => standardDraws(400, 4), []);
  const draws = useMemo(() => wrapAll(z.map((v) => state.mu + state.sigma * v)), [z, state.mu, state.sigma]);
  const ks = useMemo(() => copies(state.copies), [state.copies]);

  // The sum over the copies kept, which is the density the day sees. Shown as
  // itself by default, since the point is that it is a bump like any other, and
  // as a log on the toggle, where the cliff at the seam is legible.
  const kept = useMemo(() => keptDensity(state.mu, state.sigma, ks, inPeriod), [ks, state.mu, state.sigma]);

  // The loss itself, on the draws: the mean of that curve read at the data.
  const meanLogDensity = useMemo(() => {
    const at = keptDensity(state.mu, state.sigma, ks, draws).map((v) => Math.log(v));
    return at.reduce((a, b) => a + b, 0) / at.length;
  }, [draws, ks, state.mu, state.sigma]);

  /**
   * Which copy of each point is the one the loss is really paying for.
   *
   * The sum over copies is dominated by the nearest one to the mean, so that is
   * the copy worth picking out: in the shifted-data picture it is scattered
   * across all three tiles, one per point, and a reader can see the model
   * reaching for whichever copy is closest rather than for a whole tile. In the
   * shifted-mean picture the data never moves, so the highlight is simply
   * everything inside the day.
   */
  const nearest = useMemo(
    () =>
      draws.map((v) => {
        let best = 0;
        let far = Infinity;
        for (const k of ks) {
          const d = Math.abs(v + k * G - state.mu);
          if (d < far) {
            far = d;
            best = k;
          }
        }
        return best;
      }),
    [draws, ks, state.mu],
  );

  // Both losses at these parameters, computed rather than asserted.
  const agreement = useMemo(() => {
    const x = tensor(draws);
    const p = asParams({ w: [1], mu: [state.mu], sigma: [state.sigma] });
    const a = toFlat(logsumexp(logJoint(x, p, ks, "offset"), [1, 2]));
    const b = toFlat(logsumexp(logJoint(x, p, ks, "shift"), [1, 2]));
    return Math.max(...a.map((v, i) => Math.abs(v - (b[i] as number))));
  }, [draws, ks, state.mu, state.sigma]);

  const shifting = !state.offset;
  const bump = useMemo(() => keptDensity(state.mu, state.sigma, [0], xs), [state.mu, state.sigma]);
  const peak = Math.max(...bump);
  const keptTop = Math.max(...kept) * 1.1;
  // The log is floored, because with no copies it reaches -40 at the far side of the day and an axis fitted to
  // that leaves the rest of the curve flat.
  const LOG_FLOOR = -12;

  const buildTop = useCallback(
    (fig: Figure, L: Layers) => {
      const total = draws.length;
      const far = draws.flatMap((v, i) => ks.filter((k) => k !== nearest[i]).map((k) => v + k * G));
      const near = draws.map((v, i) => v + (nearest[i] as number) * G);
      const layers = shifting
        ? [
            ...bars(L, far, total, { name: "the copies", colour: "muted", opacity: 0.45 }),
            ...bars(L, near, total, { name: "the copy nearest the mean", colour: "tab0", opacity: 0.7 }),
            L.lines([{ x: xs, y: bump, name: "the model", colour: "fg", width: 2.5 }]),
          ]
        : [
            // The data never moves here, so the highlight is the day it sits
            // in, and the model's copies reach into it from outside.
            L.band([
              {
                x: [0, G],
                lower: [0, 0],
                upper: [peak, peak],
                colour: "accent",
                opacity: 0.1,
                name: "the day the data is in",
              },
            ]),
            ...ks.map((k) =>
              L.lines([
                {
                  x: xs,
                  y: keptDensity(state.mu + k * G, state.sigma, [0], xs),
                  name: k === 0 ? "the model" : "its copies",
                  colour: k === 0 ? "fg" : "muted",
                  width: k === 0 ? 2.5 : 1.5,
                },
              ]),
            ),
            ...bars(L, draws, total, { name: "the data", colour: "tab0", opacity: 0.6 }),
          ];
      return cartesian(
        [
          ...layers,
          midnight(L, 0, peak),
          midnight(L, G, peak),
          L.annotations({
            labels: [
              { at: [0, peak], text: "midnight" },
              { at: [G, peak], text: "midnight" },
            ],
          }),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "hours", limits: [-G, 2 * G] },
          y: { label: "density" },
          tooltip: false,
        },
      );
    },
    [bump, draws, ks, nearest, peak, shifting, state.mu, state.sigma],
  );

  const buildDay = useCallback(
    (fig: Figure, L: Layers) => {
      const curve = state.log ? kept.map((v) => Math.max(Math.log(v), LOG_FLOOR)) : kept;
      return cartesian(
        [
          L.lines([
            {
              x: inPeriod,
              y: curve,
              name: state.log ? "log of the copies kept" : "the copies, added up",
              colour: "fg",
              width: 2.5,
            },
          ]),
          ...(state.log ? [] : bars(L, draws, draws.length, { name: "the data", colour: "muted", opacity: 0.35 })),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "hour of the day", limits: [0, G] },
          y: {
            label: state.log ? "log of the copies kept" : "density the day sees",
            limits: state.log ? [LOG_FLOOR, Math.log(keptTop)] : [0, keptTop],
          },
          tooltip: false,
        },
      );
    },
    [draws, kept, keptTop, state.log],
  );

  // The mean is one value with two ways to set it: the field above and a line dragged across either chart.
  const mean = {
    axis: "x" as const,
    value: state.mu,
    onChange: (mu: number) => set({ mu }),
    min: 0,
    max: G,
    step: 0.05,
  };

  return (
    <FigureBox
      title="Shifting the mean, or shifting the data"
      purpose="Both do the same arithmetic. The top plot changes when you switch; the sum underneath does not."
      caption="Shifting the means, the data never moves and the shaded day is what gets scored. Shifting the data, each point is copied and the solid bars are the copy nearest the mean, which is the one the sum is really paying for. Drag μ in either chart, or set it on the slider. Turn the copies off and the bump runs off the end of the day, so a bedtime at 00:10 is scored as if it were twenty-three hours from the mean. The log makes that easier to see. The readout is the loss on these draws."
      controls={
        <Controls>
          <Num label="mean μ, hours" value={state.mu} min={0} max={G} step={0.5} onChange={(mu) => set({ mu })} />
          <Num
            label="scale σ, hours"
            value={state.sigma}
            min={0.5}
            max={6}
            step={0.1}
            onChange={(sigma) => set({ sigma })}
          />
          <Num
            label="copies K either side"
            value={state.copies}
            min={0}
            max={3}
            integer
            onChange={(c) => set({ copies: c })}
          />
          <Switch label="shift the means, not the data" value={state.offset} onChange={(offset) => set({ offset })} />
          <Switch label="show it as a log" value={state.log} onChange={(log) => set({ log })} />
          <Button size="sm" variant="ghost" onClick={reset} disabled={isDefault}>
            <Undo2 /> Reset
          </Button>
        </Controls>
      }
      readouts={
        <Readouts
          items={[
            ["mean log density of the draws", meanLogDensity.toFixed(3)],
            ["largest difference between the two losses", `${agreement.toExponential(1)} nats`],
            ["copies scored per point", ks.length],
          ]}
        />
      }
    >
      <ChartPanel
        label="The model and the draws over three periods of the day"
        build={buildTop}
        ratio={2.6}
        rules={[{ ...mean, label: "mean μ" }]}
      />
      <ChartPanel
        label="The density the day sees, with the copies added up"
        build={buildDay}
        ratio={2.6}
        rules={[{ ...mean, label: "mean μ" }]}
      />
    </FigureBox>
  );
}

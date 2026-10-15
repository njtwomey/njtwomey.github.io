import { useMemo } from "react";
import { logsumexp, tensor } from "aifn-compute";
import { Figure, Providers } from "aifn-render/layout";
import { slider, toggle, useFigureState } from "aifn-render/state";
import { Annotation, Area, Bars, Curve, Handle, Plot, Readout, useAxis } from "aifn-render/viz";
import { G, asParams, keptDensity, logJoint, numbers, standardDraws, wrap } from "./circular";
import { useTheme } from "@/hooks/use-theme";

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

const xs = Array.from({ length: 721 }, (_, i) => -G + (i * 3 * G) / 720);
const inPeriod = xs.filter((x) => x >= 0 && x <= G);

/**
 * Bars for a subset of the draws, scaled by the whole sample.
 *
 * `Histogram` normalises whatever it is given, so splitting the copies into
 * the nearest and the rest and handing each to its own layer made the small
 * half as tall as the large one. Binning here instead keeps one denominator,
 * so the highlighted bars are a part of the picture rather than a picture of
 * their own.
 */
const BIN = 1;
function bars(values: readonly number[], total: number) {
  const counts = new Map<number, number>();
  for (const v of values) {
    const bin = Math.floor(v / BIN);
    counts.set(bin, (counts.get(bin) ?? 0) + 1);
  }
  const centres: number[] = [];
  const heights: number[] = [];
  for (const [bin, count] of [...counts].sort((a, b) => a[0] - b[0])) {
    centres.push((bin + 0.5) * BIN);
    heights.push(count / (total * BIN));
  }
  return { x: centres, y: heights };
}

/**
 * One component on its own, unwrapped, so a reader can see which copy is which.
 * `density` sums the copies, which is the thing being taken apart here.
 */
const bump = (mu: number, sigma: number) =>
  xs.map((x) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)));

export function Shifts() {
  const { resolved } = useTheme();

  const state = useFigureState({
    mu: slider(0, G, 23, { step: 0.5, label: "mean μ, hours" }),
    sigma: slider(0.5, 6, 3, { step: 0.1, label: "scale σ, hours" }),
    copies: slider(0, 3, 1, { step: 1, label: "copies K either side" }),
    // Toggles rather than a menu: there are two of each, and a button that is
    // visibly in or out says what is happening to the picture beside it where a
    // closed dropdown only names it.
    offset: toggle(false, "shift the means, not the data"),
    log: toggle(false, "show it as a log"),
  });

  // The data is drawn from the distribution as it stands rather than fixed in
  // place, because a sample that stays put while the mean slides away from it
  // is asking the reader to ignore half of what they can see. The draws are
  // one fixed set of standard normals put through the current parameters, so
  // they follow the mean and the scale without the sample changing shape.
  const z = useMemo(() => standardDraws(400, 4), []);
  const draws = useMemo(() => z.map((v) => wrap(state.mu + state.sigma * v)), [z, state.mu, state.sigma]);
  const ks = useMemo(() => Array.from({ length: 2 * state.copies + 1 }, (_, i) => i - state.copies), [state.copies]);

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
    const a = numbers<number[]>(logsumexp(logJoint(x, p, ks, "offset"), [1, 2]));
    const b = numbers<number[]>(logsumexp(logJoint(x, p, ks, "shift"), [1, 2]));
    return Math.max(...a.map((v, i) => Math.abs(v - (b[i] as number))));
  }, [draws, ks, state.mu, state.sigma]);

  const shifting = !state.offset;
  // The band marking the day is drawn to the height of the tallest thing on the
  // plot, so shading the domain cannot drag the axis up on its own.
  const dayTop = useMemo(() => Math.max(...bump(state.mu, state.sigma)) * 1.05, [state.mu, state.sigma]);
  // Hoisted: these are hooks, and calling them inside the JSX below ties their
  // order to how the elements happen to be nested.
  const x = useAxis({ label: "hours", range: [-G, 2 * G] });
  const y = useAxis({ label: "density", range: [0, undefined] });
  const dayX = useAxis({ label: "hour of the day", range: [0, G] });
  // The log is floored, because with no copies it reaches -40 at the far side
  // of the day and an axis fitted to that leaves the rest of the curve flat.
  const dayY = useAxis({
    label: state.log ? "log of the copies kept" : "density the day sees",
    range: state.log ? [-12, undefined] : [0, undefined],
  });

  return (
    <Providers key={resolved} theme={resolved}>
      <Figure
        hoverReadout={false}
        // Small: two plots in one frame, and the top one is a bump with a lot
        // of empty sky over it at any larger size.
        defaultSize="S"
        title="Shifting the mean, or shifting the data"
        purpose="Both do the same arithmetic. The top plot changes when you switch; the sum underneath does not."
        state={state}
        readouts={[
          <Readout key="loss" label="mean log density of the draws" value={meanLogDensity.toFixed(3)} />,
          <Readout
            key="agree"
            label="largest difference between the two losses"
            value={`${agreement.toExponential(1)} nats`}
          />,
          <Readout key="copies" label="copies scored per point" value={ks.length} />,
        ]}
        caption="Shifting the means, the data never moves and the shaded day is what gets scored. Shifting the data, each point is copied and the solid bars are the copy nearest the mean, which is the one the sum is really paying for. Drag μ in either chart, or set it on the slider. Turn the copies off and the bump runs off the end of the day, so a bedtime at 00:10 is scored as if it were twenty-three hours from the mean. The log makes that easier to see. The readout is the loss on these draws."
      >
        <Plot x={x} y={y} scale={0.55}>
          {shifting ? (
            <>
              <Curve name="the model" x={xs} y={bump(state.mu, state.sigma)} emphasis />
              {ks.map((k) => {
                const far = bars(
                  draws.filter((_, i) => nearest[i] !== k).map((v) => v + k * G),
                  draws.length,
                );
                return <Bars key={`far-${k}`} name="the copies" {...far} width={BIN} muted opacity={0.35} />;
              })}
              {ks.map((k) => {
                const near = bars(
                  draws.filter((_, i) => nearest[i] === k).map((v) => v + k * G),
                  draws.length,
                );
                return (
                  <Bars
                    key={`near-${k}`}
                    name="the copy nearest the mean"
                    {...near}
                    width={BIN}
                    slot={0}
                    opacity={0.55}
                  />
                );
              })}
            </>
          ) : (
            <>
              {ks.map((k) => (
                <Curve
                  key={k}
                  name={k === 0 ? "the model" : "its copies"}
                  x={xs}
                  y={bump(state.mu + k * G, state.sigma)}
                  emphasis={k === 0}
                  muted={k !== 0}
                />
              ))}
              {/* The data never moves here, so the highlight is the day it
                  sits in, and the model's copies reach into it from outside. */}
              <Area name="the day the data is in" x={[0, G]} y={[dayTop, dayTop]} muted opacity={0.08} line={false} />
              <Bars name="the data" {...bars(draws, draws.length)} width={BIN} slot={0} opacity={0.55} />
            </>
          )}
          <Annotation x={0} text="midnight" dashed />
          <Annotation x={G} text="midnight" dashed />
          {/* The mean has a place on the chart, so it can be dragged there as
              well as set on the slider. */}
          <Handle {...state.handle("mu", { label: "μ" })} />
        </Plot>

        <Plot x={dayX} y={dayY} scale={0.55}>
          <Curve
            name={state.log ? "log of the copies kept" : "the copies, added up"}
            x={inPeriod}
            y={state.log ? kept.map(Math.log) : kept}
            emphasis
          />
          {!state.log && <Bars name="the data" {...bars(draws, draws.length)} width={BIN} muted opacity={0.35} />}
          {/* The same handle as above, so the mean can be dragged wherever it
              is visible and both charts and the slider follow. */}
          <Handle {...state.handle("mu", { label: "μ" })} />
        </Plot>
      </Figure>
    </Providers>
  );
}

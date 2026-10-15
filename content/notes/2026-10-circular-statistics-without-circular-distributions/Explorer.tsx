import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Undo2 } from "lucide-react";
import { Button, StatusText } from "aifn-render/controls";
import { ControlGroup } from "aifn-render/layout";
import { Figure, Providers } from "aifn-render/layout";
import { choice, slider, toggle, useFigureState, when } from "aifn-render/state";
import { Annotation, Area, Curve, Histogram, Plot, Readout, useAxis } from "aifn-render/viz";
import { G, METHOD_LABEL, SCENARIOS, SHOWN, density, sample, trainer } from "./circular";
import { useTraining } from "./use-training";
import { useTheme } from "@/hooks/use-theme";

/**
 * One loss at a time, with the data and the model both in the reader's hands.
 *
 * This one is here to be broken. Give a one-component truth four components and
 * the spare ones have to go somewhere; choose the plain normal and the fit
 * slides off midnight; draw a copy evenly and the scale grows until one normal
 * covers the whole day.
 *
 * The fitted curve is read off the optimiser every frame rather than at the
 * end, so the components are visibly walking round the circle while it runs.
 */

const STEPS = 1500;
const xs = Array.from({ length: 241 }, (_, i) => (i * G) / 240);

export function Explorer() {
  const { resolved } = useTheme();

  const state = useFigureState({
    method: choice(
      SHOWN.map((m) => ({ value: m, label: METHOD_LABEL[m] })),
      "shift",
      { label: "the loss" },
    ),
    // A button rather than a menu: there are two of them, and the picture
    // beside it says which one is on.
    two: toggle(true, "two components in the data"),
    // Only meaningful with two components, so it is hidden with one rather than
    // sitting there doing nothing.
    weight: slider(0.05, 0.95, 0.8, { step: 0.05, label: "weight on the first", when: when("two", true) }),
    components: slider(1, 4, 2, { step: 1, label: "components fitted" }),
    n: slider(100, 2000, 500, { step: 100, label: "training draws n" }),
    seed: slider(0, 9, 0, { step: 1, label: "seed" }),
    parts: toggle(true, "show each component"),
  });

  // The scenario with the reader's weights, since the mixture's shape is as
  // much a thing to play with as the model fitted to it.
  const truth = useMemo(() => {
    const base = SCENARIOS[state.two ? "mixture" : "single"] as (typeof SCENARIOS)[string];
    return state.two ? { ...base, w: [state.weight, 1 - state.weight] } : base;
  }, [state.two, state.weight]);
  const train = useMemo(() => sample(truth, state.n, state.seed), [truth, state.n, state.seed]);

  const build = useCallback(() => {
    const test = sample(truth, 2000, 1000 + state.seed);
    return [trainer(state.method, train, test, truth, { components: state.components, seed: state.seed })];
  }, [state.components, state.method, state.seed, train, truth]);

  const run = useTraining(build, { steps: STEPS, perFrame: 6, every: 25, auto: true });

  // A step the reader has clicked on one of the traces, which the charts then
  // show instead of the latest one. Null follows the run.
  const [pinned, setPinned] = useState<number | null>(null);
  useEffect(() => setPinned(null), [run.trainers]);

  const live = run.trainers[0]?.fit();
  const held = run.traces[0] ?? [];
  const at =
    pinned === null
      ? undefined
      : held.reduce(
          (best, row) => (Math.abs(row.step - pinned) < Math.abs(best.step - pinned) ? row : best),
          held[0] ?? { step: 0, gap: 0, loss: 0, fit: { w: [], mu: [], sigma: [] } },
        );
  const fit = at?.fit ?? live;
  const gap = at?.gap ?? held.at(-1)?.gap;

  const x = useAxis({ label: "hour of the day", range: [0, G] });
  const y = useAxis({ label: "density", range: [0, undefined] });
  const stepX = useAxis({ label: "optimiser step", range: [0, STEPS] });
  const muY = useAxis({ label: "component means", range: [0, G] });
  const lossY = useAxis({ label: "training loss" });

  // The parameters over the run, one series per component. A mean that crosses
  // midnight comes back on the other side, and a line drawn straight through
  // that would cross the whole chart, so the series is broken with a NaN where
  // it wraps rather than drawn as a jump that means nothing.
  const trace = held;
  const paths = useMemo(() => {
    const m = trace.at(-1)?.fit.mu.length ?? 0;
    return Array.from({ length: m }, (_, i) => {
      const steps: number[] = [];
      const mu: number[] = [];
      const lo: number[] = [];
      const hi: number[] = [];
      let last: number | undefined;
      for (const row of trace) {
        const here = row.fit.mu[i];
        const sd = row.fit.sigma[i];
        if (here === undefined || sd === undefined) continue;
        if (last !== undefined && Math.abs(here - last) > G / 2) {
          steps.push(row.step);
          mu.push(Number.NaN);
          lo.push(Number.NaN);
          hi.push(Number.NaN);
        }
        steps.push(row.step);
        mu.push(here);
        lo.push(here - sd);
        hi.push(here + sd);
        last = here;
      }
      return { steps, mu, lo, hi };
    });
  }, [trace]);

  return (
    <Providers key={resolved} theme={resolved}>
      <Figure
        hoverReadout={false}
        title="Watching it fit"
        purpose="Change anything and it refits. The dashed line is the density the draws came from."
        state={state}
        controls={
          // A group of its own, titled, because a Figure labels hand-placed
          // controls "Configuration" as well and two panels under one word
          // reads as a mistake.
          <ControlGroup title="fitting">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex shrink-0 items-center gap-3">
                <Button size="sm" variant="outline" onClick={run.running ? run.pause : run.start} disabled={run.done}>
                  {run.running ? <Pause /> : <Play />}
                  {run.running ? "Pause" : "Continue"}
                </Button>
                <Button size="sm" variant="ghost" onClick={run.reset}>
                  <RotateCcw /> Again
                </Button>
                <Button size="sm" variant="ghost" onClick={() => state.reset()} disabled={state.isDefault}>
                  <Undo2 /> Reset
                </Button>
              </div>
              {pinned !== null && (
                <Button size="sm" variant="ghost" onClick={() => setPinned(null)}>
                  <SkipForward /> Back to the end
                </Button>
              )}
              <StatusText tone="muted">
                {at
                  ? `showing step ${at.step}`
                  : run.done
                    ? `fitted, ${STEPS} steps`
                    : `fitting, step ${run.step} of ${STEPS}`}
              </StatusText>
            </div>
          </ControlGroup>
        }
        readouts={[
          <Readout key="gap" label="held-out nats above the truth" value={gap === undefined ? "–" : gap.toFixed(4)} />,
          <Readout key="mu" label="means, hours" value={fit ? fit.mu.map((v) => v.toFixed(1)).join(", ") : "–"} />,
          <Readout
            key="sigma"
            label="scales, hours"
            value={fit ? fit.sigma.map((v) => v.toFixed(2)).join(", ") : "–"}
          />,
          <Readout key="w" label="weights" value={fit ? fit.w.map((v) => v.toFixed(2)).join(", ") : "–"} />,
          <Readout
            key="settled"
            label="converged"
            value={
              !run.step
                ? "–"
                : (run.trainers[0]?.settledAt() ?? undefined) === undefined
                  ? "no, still moving"
                  : `at step ${run.trainers[0]?.settledAt()}`
            }
          />,
        ]}
        caption="The middle chart is where each component sat as the fit went on, with a band a scale either side. A low-weight component can take a long time to find the mass it belongs to, and the loss below barely moves while it does. Click either of those charts to see the model as it was at that step. Fit one component to two, or four to one, to see where the spare mass goes."
      >
        <Plot x={x} y={y}>
          <Histogram name="the draws" values={train} bins={{ width: G / 48 }} normalize="density" muted />
          <Curve name="the truth" x={xs} y={density(truth, xs)} dashed emphasis />
          {fit && <Curve name="the fit" x={xs} y={density(fit, xs)} live slot={1} />}
          {fit &&
            state.parts &&
            fit.mu.map((mu, i) => (
              <Curve
                key={i}
                name="its components"
                x={xs}
                y={density({ w: [fit.w[i] as number], mu: [mu], sigma: [fit.sigma[i] as number] }, xs)}
                thin
                silent
                slot={2}
                live
              />
            ))}
        </Plot>

        {/* Half the height each: the fit above is the thing being watched, and
            these two say how it got there. */}
        <Plot x={stepX} y={muY} scale={0.5} onPlotClick={([step]) => setPinned(step)}>
          {at && <Annotation x={at.step} text={`step ${at.step}`} dashed />}
          {paths.map((path, i) => (
            <Area
              key={`band-${i}`}
              name="give or take a scale"
              x={path.steps}
              y={path.hi}
              base={path.lo}
              line={false}
              // The band takes its component's colour, so two of them crossing
              // can be told apart.
              slot={i}
              opacity={0.15}
              live
            />
          ))}
          {paths.map((path, i) => (
            <Curve key={i} name={`mean ${i + 1}`} x={path.steps} y={path.mu} slot={i} live />
          ))}
        </Plot>

        <Plot x={stepX} y={lossY} scale={0.5} onPlotClick={([step]) => setPinned(step)}>
          {at && <Annotation x={at.step} dashed />}
          <Curve name="training loss" x={trace.map((row) => row.step)} y={trace.map((row) => row.loss)} slot={3} live />
        </Plot>
      </Figure>
    </Providers>
  );
}

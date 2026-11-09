import { useCallback, useMemo } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import { cartesian } from "omai-render/charts";
import type { Figure } from "omai-render/figure";
import { Choice, Player, useLiveRun } from "omai-render/react";
import { Button } from "@/components/ui/button";
import { G, METHOD_LABEL, type Method, SCENARIOS, SHOWN, density, readOut, sample, trainer } from "./circular";
import { ChartPanel, Controls, FigureBox, Readouts, useParams, type Layers, Num, Switch } from "./figure-kit";

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
 * The fit is an engine `Algorithm` played by `useLiveRun`, which keeps every
 * state, so the player's scrubber returns the charts to any step of the run.
 */

const STEPS = 1500;
const xs = Array.from({ length: 241 }, (_, i) => (i * G) / 240);

const INITIAL = { method: "shift" as Method, two: true, weight: 0.8, components: 2, n: 500, seed: 0, parts: true };

export function Explorer() {
  const { values: state, set, reset, isDefault } = useParams(INITIAL);

  // The scenario with the reader's weights, since the mixture's shape is as
  // much a thing to play with as the model fitted to it.
  const truth = useMemo(() => {
    const base = SCENARIOS[state.two ? "mixture" : "single"] as (typeof SCENARIOS)[string];
    return state.two ? { ...base, w: [state.weight, 1 - state.weight] } : base;
  }, [state.two, state.weight]);
  const train = useMemo(() => sample(truth, state.n, state.seed), [truth, state.n, state.seed]);

  const algorithm = useMemo(
    () => trainer(state.method, train, sample(truth, 2000, 1000 + state.seed), truth, { components: state.components }),
    [state.components, state.method, state.seed, train, truth],
  );
  // Nothing is computed until the reader presses play or steps: changing a setting starts a new fit from its
  // beginning and waits there.
  const run = useLiveRun(algorithm, {
    maxSteps: STEPS,
    seed: state.seed,
    // As many steps a frame as the frame can afford, measured, so a slow fit slows the cursor and not the page.
    stepsPerFrame: "auto",
    frameBudgetMs: 8,
    maxStepsPerFrame: 12,
    fps: 60,
    history: STEPS + 1,
  });

  const fit = useMemo(() => readOut(run.state.params), [run.state]);
  const trail = run.state.trail;
  const gap = trail.at(-1)?.gap;
  const settled = run.state.settled;
  const step = run.state.steps;

  // The parameters over the run, one series per component. A mean that crosses
  // midnight comes back on the other side, and a line drawn straight through
  // that would cross the whole chart, so the series is broken with a NaN where
  // it wraps rather than drawn as a jump that means nothing.
  const paths = useMemo(() => {
    const m = trail.at(-1)?.fit.mu.length ?? 0;
    return Array.from({ length: m }, (_, i) => {
      const steps: number[] = [];
      const mu: number[] = [];
      const lo: number[] = [];
      const hi: number[] = [];
      let last: number | undefined;
      for (const row of trail) {
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
  }, [trail]);

  // The truth's curve only changes with the truth, so it is not redrawn for
  // every step of the fit.
  const truthDensity = useMemo(() => density(truth, xs), [truth]);
  const fitDensity = useMemo(() => density(fit, xs), [fit]);
  const parts = useMemo(
    () =>
      state.parts
        ? fit.mu.map((mu, i) => density({ w: [fit.w[i] as number], mu: [mu], sigma: [fit.sigma[i] as number] }, xs))
        : [],
    [fit, state.parts],
  );

  // The step the charts are showing, which is the head of the run unless the
  // reader has scrubbed back.
  const cursor = (L: Layers, top: number, bottom: number) =>
    L.lines([{ x: [step, step], y: [bottom, top], dash: "dashed", colour: "muted", width: 1, name: "__cursor" }]);

  const buildFit = useCallback(
    (fig: Figure, L: Layers) =>
      cartesian(
        [
          L.histogram(train, {
            bins: 48,
            range: [0, G],
            density: true,
            name: "the draws",
            colour: "muted",
            opacity: 0.5,
          }),
          L.lines([{ x: xs, y: truthDensity, name: "the truth", colour: "fg", dash: "dashed", width: 2 }]),
          L.lines([{ x: xs, y: fitDensity, name: "the fit", colour: "tab1", width: 2.5 }]),
          ...parts.map((y) => L.lines([{ x: xs, y, name: "its components", colour: "tab2", width: 1, opacity: 0.8 }])),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "hour of the day", limits: [0, G] },
          y: { label: "density" },
          tooltip: false,
        },
      ),
    [fitDensity, parts, train, truthDensity],
  );

  const buildMeans = useCallback(
    (fig: Figure, L: Layers) =>
      cartesian(
        [
          ...paths.map((p, i) =>
            L.band([
              { x: p.steps, lower: p.lo, upper: p.hi, colour: `tab${i}`, opacity: 0.15, name: "give or take a scale" },
            ]),
          ),
          ...paths.map((p, i) =>
            L.lines([{ x: p.steps, y: p.mu, name: `mean ${i + 1}`, colour: `tab${i}`, width: 2 }]),
          ),
          cursor(L, G, 0),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "optimiser step", limits: [0, STEPS] },
          y: { label: "component means", limits: [0, G] },
          tooltip: false,
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paths, step],
  );

  const losses = useMemo(() => trail.map((row) => row.loss), [trail]);
  const buildLoss = useCallback(
    (fig: Figure, L: Layers) =>
      cartesian(
        [
          L.lines([{ x: trail.map((row) => row.step), y: losses, name: "training loss", colour: "tab3", width: 2 }]),
          ...(losses.length > 0 ? [cursor(L, Math.max(...losses), Math.min(...losses))] : []),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "optimiser step", limits: [0, STEPS] },
          y: { label: "training loss" },
          tooltip: false,
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [losses, trail, step],
  );

  const status =
    run.status !== undefined
      ? `fitted, ${STEPS} steps`
      : step === 0
        ? "press play to fit"
        : `fitting, step ${step} of ${STEPS}`;

  return (
    <FigureBox
      title="Watching it fit"
      purpose="Change anything, then press play to fit it. The dashed line is the density the draws came from."
      caption="The middle chart is where each component sat as the fit went on, with a band a scale either side. A low-weight component can take a long time to find the mass it belongs to, and the loss below barely moves while it does. Drag the scrubber to see the model as it was at any step. Fit one component to two, or four to one, to see where the spare mass goes."
      controls={
        <Controls>
          <Choice
            label="the loss"
            value={state.method}
            options={SHOWN.map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
            onChange={(method) => set({ method })}
            className="w-full max-w-none"
          />
          <Switch label="two components in the data" value={state.two} onChange={(two) => set({ two })} />
          {state.two && (
            <Num
              label="weight on the first"
              value={state.weight}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={(weight) => set({ weight })}
            />
          )}
          <Num
            label="components fitted"
            value={state.components}
            min={1}
            max={4}
            integer
            onChange={(components) => set({ components })}
          />
          <Num label="training draws n" value={state.n} min={100} max={2000} step={100} onChange={(n) => set({ n })} />
          <Num label="seed" value={state.seed} min={0} max={9} integer onChange={(seed) => set({ seed })} />
          <Switch label="show each component" value={state.parts} onChange={(parts) => set({ parts })} />
        </Controls>
      }
      readouts={
        <Readouts
          items={[
            ["held-out nats above the truth", gap === undefined ? "–" : gap.toFixed(4)],
            ["means, hours", fit.mu.map((v) => v.toFixed(1)).join(", ")],
            ["scales, hours", fit.sigma.map((v) => v.toFixed(2)).join(", ")],
            ["weights", fit.w.map((v) => v.toFixed(2)).join(", ")],
            ["converged", step === 0 ? "–" : settled === undefined ? "no, still moving" : `at step ${settled}`],
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Player controller={run.controller} className="basis-full" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            run.controller.reset();
            run.controller.play();
          }}
        >
          <RotateCcw /> Again
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={isDefault}>
          <Undo2 /> Reset
        </Button>
        <span className="text-muted-foreground text-sm">{status}</span>
      </div>
      <ChartPanel
        label="The draws, the generating density and the fitted density over the day"
        build={buildFit}
        ratio={1.7}
      />
      <ChartPanel label="Where each component's mean sat over the run" build={buildMeans} ratio={4} />
      <ChartPanel label="The training loss over the run" build={buildLoss} ratio={4} />
    </FigureBox>
  );
}

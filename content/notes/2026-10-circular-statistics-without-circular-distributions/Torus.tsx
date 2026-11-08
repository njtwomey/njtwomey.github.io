import { useCallback, useMemo } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import type { Point2 } from "omai-engine/numerics/geometry";
import { cartesian } from "omai-render/charts";
import type { Figure } from "omai-render/figure";
import { Player, inBox, useLiveRun } from "omai-render/react";
import { Button } from "@/components/ui/button";
import {
  PERIOD,
  type Component,
  componentFromAxes,
  densities,
  ellipse,
  logLik,
  perpendicularTip,
  readOut,
  sample,
  shifts,
  trainer,
} from "./circular-2d";
import { ChartPanel, Controls, FigureBox, Readouts, useParams, type Layers, Num, Switch } from "./figure-kit";
import { useSettled } from "./use-settled";

/**
 * The same method on a surface that wraps both ways.
 *
 * Hour of the day against day of the week, so both axes are circular and the
 * sample space is a torus. The copies are a three by three grid, the loss is a
 * log-sum-exp over nine terms, and the model is an ordinary bivariate normal
 * with a full covariance. That is the whole change.
 *
 * The density the draws come from is set by dragging rather than by dials. Each
 * component has a handle on its mean and one on the tip of each principal axis,
 * so stretching and turning a shape is done to the shape itself. Nothing here
 * asks for a correlation, which is a number almost nobody can picture.
 *
 * The raster is drawn over one period only, because that is where the model is:
 * the tiling toggle shows copies of the data around it rather than copies of
 * the model, which is the shape of the argument.
 */

const STEPS = 900;
const [G1, G2] = PERIOD as [number, number];

/**
 * Two grids: a coarse one that can be redrawn every frame while the fit moves,
 * and a fine one drawn once it has stopped. A raster is cells, so the only way
 * to make it less blocky is more of them, and ten thousand cells a frame is
 * more than the fit can afford while it is still moving.
 */
const COARSE = 48;
const FINE = 120;

/**
 * The six handles, in order: a mean and the tips of the two principal axes for
 * each of the two generating components. Two tilted components, a broad one
 * across the middle and a narrower one in the top corner, which wraps round all
 * four edges. Both are off the axes, so the covariance is doing something, and
 * every handle sits inside the square where it can be taken hold of.
 */
const HANDLES: readonly Point2[] = [
  [0.275, 0.49],
  [0.5, 0.355],
  [0.33, 0.58],
  [0.845, 0.905],
  [0.985, 0.985],
  [0.87, 0.86],
];
const INITIAL = { handles: HANDLES, weight: 0.6, components: 2, diagonal: false, n: 500, seed: 0, tiles: false };

/**
 * Keep each component's handles honest.
 *
 * Principal axes are perpendicular, so a pair of tips dragged freely is not a
 * pair of axes: the figure would draw two arms at whatever angle the pointer
 * left them while the ellipse underneath used the orthogonalised version, and
 * the two would not agree. Whichever tip was moved is taken as given here and
 * the other is swung round to meet it at a right angle, keeping its own length.
 * Dragging the mean carries both tips with it rather than reshaping the
 * component.
 */
function reconcile(before: readonly Point2[], after: readonly Point2[]): Point2[] {
  const next = after.map((p) => [...p] as Point2);
  const moved = next.findIndex((p, i) => p[0] !== (before[i] as Point2)[0] || p[1] !== (before[i] as Point2)[1]);
  if (moved < 0) return next;
  const c = Math.floor(moved / 3) * 3;
  const mean = next[c] as Point2;
  if (moved === c) {
    const dx = mean[0] - (before[c] as Point2)[0];
    const dy = mean[1] - (before[c] as Point2)[1];
    for (const t of [c + 1, c + 2]) next[t] = [(next[t] as Point2)[0] + dx, (next[t] as Point2)[1] + dy];
  } else {
    const other = moved === c + 1 ? c + 2 : c + 1;
    next[other] = perpendicularTip(mean, next[moved] as Point2, next[other] as Point2);
  }
  return next;
}

/** The unit axis cells are centred on, which is a grid from edge to edge so the periodic ends agree. */
const nodes = (n: number, period: number) => Array.from({ length: n }, (_, i) => (i * period) / (n - 1));

export function Torus() {
  const { values: state, set, reset, isDefault } = useParams(INITIAL);
  const h = state.handles;

  const truth = useMemo(
    () => [
      componentFromAxes(state.weight, h[0] as Point2, h[1] as Point2, h[2] as Point2),
      componentFromAxes(1 - state.weight, h[3] as Point2, h[4] as Point2, h[5] as Point2),
    ],
    [h, state.weight],
  );

  const draws = useMemo(() => sample(truth, state.n, state.seed), [truth, state.n, state.seed]);
  // Scored on draws it was not fitted on, so a fit that has memorised its
  // sample cannot come out ahead of the density that produced it.
  const test = useMemo(() => sample(truth, 2000, 1000 + state.seed), [truth, state.seed]);

  // The charts follow the pointer; the fit waits until it has stopped.
  const toFit = useSettled(draws);
  const algorithm = useMemo(
    () => trainer(toFit, { components: state.components, seed: state.seed, diagonal: state.diagonal }),
    [toFit, state.components, state.diagonal, state.seed],
  );
  const run = useLiveRun(algorithm, {
    maxSteps: STEPS,
    seed: state.seed,
    stepsPerFrame: 4,
    fps: 60,
    history: STEPS + 1,
  });

  const running = run.controller.playing;
  const step = run.state.steps;
  const fit = useMemo(() => readOut(run.state.params, run.state.diagonal), [run.state]);
  const trail = run.state.trail;

  // The grid the fitted density is drawn on, as rows of y and columns of x.
  const cells = running ? COARSE : FINE;
  const z = useMemo(() => {
    const gx = nodes(cells, G1);
    const gy = nodes(cells, G2);
    const flat = densities(
      fit,
      gy.flatMap(() => gx),
      gy.flatMap((y) => gx.map(() => y)),
      1,
    );
    return gy.map((_, i) => flat.slice(i * cells, (i + 1) * cells));
  }, [cells, fit]);

  // Contours at fractions of the peak, which keeps them where the mass is
  // whatever the density happens to be worth.
  const levels = useMemo(() => {
    const peak = Math.max(...z.flat());
    return [0.1, 0.3, 0.6].map((f) => f * peak);
  }, [z]);

  // Every tile, so a shape that runs off one edge comes back on the other.
  const tiled = (mix: readonly Component[]) =>
    mix.flatMap((g) => shifts().map(([i, j]) => ellipse({ ...g, mu: [g.mu[0] + i * G1, g.mu[1] + j * G2] })));
  const rings = useMemo(() => tiled(fit), [fit]);
  const truthRings = useMemo(() => tiled(truth), [truth]);

  // The score is read every forty steps rather than every frame: it is the
  // held-out sample against every copy, which costs more than drawing does.
  const scoreAt = run.status !== undefined ? "done" : Math.floor(step / 40);
  const truthScore = useMemo(() => logLik(test[0], test[1], truth), [test, truth]);
  // Scored on that schedule, with whatever fit is current when it comes round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fitScore = useMemo(() => logLik(test[0], test[1], fit), [test, scoreAt]);

  const span = state.tiles;
  const lo = span ? -G1 : 0;
  const hi = span ? 2 * G1 : G1;

  const buildSurface = useCallback(
    (fig: Figure, L: Layers) =>
      cartesian(
        [
          L.heatmap(z, {
            x: [0, G1],
            y: [0, G2],
            smooth: "bicubic",
            ramp: "blues",
            colourBar: false,
            name: "fitted density",
          }),
          L.contours(z, { x: [0, G1], y: [0, G2], levels, labels: false, colour: "tab1", opacity: 0.5, width: 1 }),
          ...(span
            ? [
                L.points(
                  shifts()
                    .filter(([i, j]) => i !== 0 || j !== 0)
                    .map(([i, j]) => ({
                      x: draws[0].map((v) => v + i * G1),
                      y: draws[1].map((v) => v + j * G2),
                      name: "the copies",
                      colour: "muted",
                      size: 3,
                      opacity: 0.6,
                      outline: false,
                    })),
                ),
                L.lines([
                  ...[0, G1].map((x) => ({
                    x: [x, x],
                    y: [-G2, 2 * G2],
                    dash: "dashed" as const,
                    colour: "muted",
                    name: "__edge",
                  })),
                  ...[0, G2].map((y) => ({
                    x: [-G1, 2 * G1],
                    y: [y, y],
                    dash: "dashed" as const,
                    colour: "muted",
                    name: "__edge",
                  })),
                ]),
              ]
            : []),
          L.lines(
            truthRings.map(([x, y]) => ({
              x,
              y,
              name: "where the draws came from",
              colour: "fg",
              dash: "dashed" as const,
              width: 1.5,
            })),
          ),
          L.lines(rings.map(([x, y]) => ({ x, y, name: "one scale of the fit", colour: "tab1", width: 2.5 }))),
          L.points([{ x: draws[0], y: draws[1], name: "the draws", colour: "fg", size: 4, opacity: 0.85 }]),
          L.lines(
            [0, 3].flatMap((c) =>
              [c + 1, c + 2].map((t) => ({
                x: [(h[c] as Point2)[0], (h[t] as Point2)[0]],
                y: [(h[c] as Point2)[1], (h[t] as Point2)[1]],
                name: "its principal axes",
                colour: "fg",
                width: 1,
              })),
            ),
          ),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "x", limits: [lo, hi] },
          y: { label: "y", limits: [lo, hi] },
          aspect: "equal",
          // On a phone the legend wraps to several rows and takes the height
          // the square plot was given, so the plot stops being square.
          legend: fig.width >= 560,
          tooltip: false,
        },
      ),
    [draws, h, hi, levels, lo, rings, span, truthRings, z],
  );

  const buildLoss = useCallback(
    (fig: Figure, L: Layers) =>
      cartesian(
        [
          L.lines([
            {
              x: trail.map((row) => row.step),
              y: trail.map((row) => row.loss),
              name: "training loss",
              colour: "tab3",
              width: 2,
            },
          ]),
        ],
        {
          figure: fig,
          mode: fig.mode,
          x: { label: "optimiser step", limits: [0, STEPS] },
          y: { label: "training loss" },
          tooltip: false,
        },
      ),
    [trail],
  );

  const gap = truthScore - fitScore;
  const labels = ["first mean", "first axis", "second axis", "second mean", "third axis", "fourth axis"];
  const status =
    run.status !== undefined
      ? `fitted, ${STEPS} steps`
      : step === 0
        ? "press play to fit"
        : `fitting, step ${step} of ${STEPS}`;

  return (
    <FigureBox
      title="The same thing on a torus"
      purpose="Both axes wrap, so the surface is a square joined at its edges. Nine copies instead of three, and the model is still an ordinary normal."
      caption="Restricting the fit to axis-aligned components is a restriction on the model, not on the data: the generating shapes keep whatever tilt you give them, and a tilted truth is then something the fit cannot match. The dashed ellipses are the density the draws came from, and their handles are the mean and one standard deviation along each principal axis: drag them to stretch and turn a component, and the sample follows. Drag one into a corner to see it wrap. The solid ellipses are the fit, which learns a covariance of its own for each component. Turn on the copies to see what the loss is scoring: the data repeated in nine tiles around one model that never moves."
      controls={
        <Controls>
          <Num
            label="weight on the first"
            value={state.weight}
            min={0.05}
            max={0.95}
            step={0.05}
            onChange={(weight) => set({ weight })}
          />
          <Num
            label="components fitted"
            value={state.components}
            min={1}
            max={4}
            integer
            onChange={(components) => set({ components })}
          />
          <Num label="draws n" value={state.n} min={100} max={1500} step={100} onChange={(n) => set({ n })} />
          <Num label="seed" value={state.seed} min={0} max={9} integer onChange={(seed) => set({ seed })} />
          <Switch
            label="fit axis-aligned components only"
            value={state.diagonal}
            onChange={(diagonal) => set({ diagonal })}
          />
          <Switch label="show the nine copies" value={state.tiles} onChange={(tiles) => set({ tiles })} />
        </Controls>
      }
      readouts={
        <Readouts
          items={[
            ["held-out nats above the generating density", gap.toFixed(4)],
            ["held-out log density", fitScore.toFixed(4)],
            ["copies scored per point", shifts().length],
            ["means", fit.map((c) => `(${c.mu[0].toFixed(2)}, ${c.mu[1].toFixed(2)})`).join("  ")],
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
        {/* `Again` refits what is on screen; this puts the controls back where
            they started, which a figure with six draggable handles needs rather
            more than most. */}
        <Button size="sm" variant="ghost" onClick={reset} disabled={isDefault}>
          <Undo2 /> Reset
        </Button>
        <span className="text-muted-foreground text-sm">{status}</span>
      </div>
      <ChartPanel
        label="The fitted density on the torus, the draws, and the handles that shape the generating density"
        build={buildSurface}
        square
        handles={{
          points: h,
          onChange: (next) => set({ handles: reconcile(h, next) }),
          constrain: inBox([lo, hi], [lo, hi]),
          labels,
          colour: (i) => (i % 3 === 0 ? "var(--wb-fg)" : "var(--wb-muted)"),
        }}
      />
      <ChartPanel label="The training loss over the run" build={buildLoss} ratio={5} />
    </FigureBox>
  );
}

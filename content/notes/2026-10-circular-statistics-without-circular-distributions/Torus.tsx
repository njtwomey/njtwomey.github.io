import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Undo2 } from "lucide-react";
import { Button, StatusText } from "aifn-render/controls";
import { ControlGroup, Figure, Providers } from "aifn-render/layout";
import { slider, toggle, useFigureState } from "aifn-render/state";
import { Annotation, Contours, Curve, Handle, Plot, Points, Raster, Readout, Segments, useAxis } from "aifn-render/viz";
import {
  PERIOD,
  type Component,
  componentFromAxes,
  density,
  ellipse,
  logLik,
  perpendicularTip,
  sample,
  shifts,
  trainer,
} from "./circular-2d";
import { chrome } from "aifn-render/design";
import { useSettled } from "./use-training";
import { useTheme } from "@/hooks/use-theme";

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
const axisCells = (n: number, period: number) => Array.from({ length: n }, (_, i) => ((i + 0.5) * period) / n);

/** A tip may sit outside the period: the shape it belongs to wraps anyway. */
const tip = (initial: number, label: string, period: number) =>
  slider(-period / 2, 1.5 * period, initial, { step: 0.005, onChart: true, label });

export function Torus() {
  const { resolved } = useTheme();

  const state = useFigureState({
    // Everything about the two generating components is dragged on the chart,
    // so none of these draws a control of its own.
    // Two tilted components: a broad one across the middle and a narrower one
    // in the top corner, which wraps round all four. Both are off the axes, so
    // the covariance is doing something, and every handle sits inside the
    // square where it can be taken hold of.
    m1h: slider(0, G1, 0.275, { step: 0.005, onChart: true, label: "first mean, x" }),
    m1d: slider(0, G2, 0.49, { step: 0.005, onChart: true, label: "first mean, y" }),
    a1h: tip(0.5, "first axis, x", G1),
    a1d: tip(0.355, "first axis, y", G2),
    b1h: tip(0.33, "second axis, x", G1),
    b1d: tip(0.58, "second axis, y", G2),

    m2h: slider(0, G1, 0.845, { step: 0.005, onChart: true, label: "second mean, x" }),
    m2d: slider(0, G2, 0.905, { step: 0.005, onChart: true, label: "second mean, y" }),
    a2h: tip(0.985, "third axis, x", G1),
    a2d: tip(0.985, "third axis, y", G2),
    b2h: tip(0.87, "fourth axis, x", G1),
    b2d: tip(0.86, "fourth axis, y", G2),

    weight: slider(0.05, 0.95, 0.6, { step: 0.05, label: "weight on the first" }),
    components: slider(1, 4, 2, { step: 1, label: "components fitted" }),
    // A restriction on the model being learnt, not on the data: the generating
    // components keep whatever shape the handles give them.
    diagonal: toggle(false, "fit axis-aligned components only"),
    n: slider(100, 1500, 500, { step: 100, label: "draws n" }),
    seed: slider(0, 9, 0, { step: 1, label: "seed" }),
    tiles: toggle(false, "show the nine copies"),
  });

  /**
   * Keep each component's handles honest.
   *
   * Principal axes are perpendicular, so a pair of tips dragged freely is not a
   * pair of axes: the figure was drawing two arms at whatever angle the pointer
   * left them while the ellipse underneath used the orthogonalised version, and
   * the two did not agree. Whichever tip was moved is taken as given here and
   * the other is swung round to meet it at a right angle, keeping its own
   * length. Dragging the mean carries both tips with it rather than reshaping
   * the component.
   *
   * The reconciled values are remembered, so the pass that applies them sees
   * nothing left to do and stops.
   */
  const settled = useRef<Record<string, number> | null>(null);
  useEffect(() => {
    const now: Record<string, number> = {
      m1h: state.m1h,
      m1d: state.m1d,
      a1h: state.a1h,
      a1d: state.a1d,
      b1h: state.b1h,
      b1d: state.b1d,
      m2h: state.m2h,
      m2d: state.m2d,
      a2h: state.a2h,
      a2d: state.a2d,
      b2h: state.b2h,
      b2d: state.b2d,
    };
    const prev = settled.current;
    settled.current = now;
    if (!prev) return;

    const moved = (a: string, b: string) =>
      Math.abs((now[a] as number) - (prev[a] as number)) > 1e-9 ||
      Math.abs((now[b] as number) - (prev[b] as number)) > 1e-9;

    for (const c of ["1", "2"]) {
      const [mh, md, ah, ad, bh, bd] = [`m${c}h`, `m${c}d`, `a${c}h`, `a${c}d`, `b${c}h`, `b${c}d`];
      const mean = [now[mh] as number, now[md] as number] as const;

      // A drag moves one handle. Anything that moves several at once is a
      // reset or a value read back from the URL, and reconciling it would
      // carry the old positions into the new ones: reset used to put the means
      // back and then shift the tips by how far the means had come.
      const parts = [moved(mh, md), moved(ah, ad), moved(bh, bd)].filter(Boolean).length;
      if (parts !== 1) continue;

      if (moved(mh, md)) {
        const dh = (now[mh] as number) - (prev[mh] as number);
        const dd = (now[md] as number) - (prev[md] as number);
        for (const [h, d] of [
          [ah, ad],
          [bh, bd],
        ] as const) {
          settled.current[h] = (now[h] as number) + dh;
          settled.current[d] = (now[d] as number) + dd;
          state.set(h, settled.current[h]);
          state.set(d, settled.current[d]);
        }
      } else if (moved(ah, ad) || moved(bh, bd)) {
        const drivenByFirst = moved(ah, ad);
        const driver = drivenByFirst
          ? ([now[ah] as number, now[ad] as number] as const)
          : ([now[bh] as number, now[bd] as number] as const);
        const follower = drivenByFirst
          ? ([now[bh] as number, now[bd] as number] as const)
          : ([now[ah] as number, now[ad] as number] as const);
        const [fh, fd] = drivenByFirst ? [bh, bd] : [ah, ad];
        const next = perpendicularTip(mean, driver, follower);
        settled.current[fh] = next[0];
        settled.current[fd] = next[1];
        state.set(fh, next[0]);
        state.set(fd, next[1]);
      }
    }
    // The state object is new on every render; the values are the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.a1d,
    state.a1h,
    state.a2d,
    state.a2h,
    state.b1d,
    state.b1h,
    state.b2d,
    state.b2h,
    state.m1d,
    state.m1h,
    state.m2d,
    state.m2h,
  ]);

  const truth = useMemo(
    () => [
      componentFromAxes(state.weight, [state.m1h, state.m1d], [state.a1h, state.a1d], [state.b1h, state.b1d]),
      componentFromAxes(1 - state.weight, [state.m2h, state.m2d], [state.a2h, state.a2d], [state.b2h, state.b2d]),
    ],
    [
      state.a1d,
      state.a1h,
      state.a2d,
      state.a2h,
      state.b1d,
      state.b1h,
      state.b2d,
      state.b2h,
      state.m1d,
      state.m1h,
      state.m2d,
      state.m2h,
      state.weight,
    ],
  );

  const draws = useMemo(() => sample(truth, state.n, state.seed), [truth, state.n, state.seed]);
  // Scored on draws it was not fitted on, so a fit that has memorised its
  // sample cannot come out ahead of the density that produced it.
  const test = useMemo(() => sample(truth, 2000, 1000 + state.seed), [truth, state.seed]);

  // The charts follow the pointer; the fit waits until it has stopped.
  const toFit = useSettled(draws);
  const build = useCallback(
    () => trainer(toFit, { components: state.components, seed: state.seed, diagonal: state.diagonal }),
    [toFit, state.components, state.diagonal, state.seed],
  );

  const [fitter, setFitter] = useState(build);
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(true);
  const [fit, setFit] = useState<Component[]>(() => fitter.fit());
  const [trace, setTrace] = useState<{ step: number; loss: number }[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const fresh = build();
    setFitter(fresh);
    setFit(fresh.fit());
    setTrace([]);
    setSteps(0);
    setRunning(true);
  }, [build]);

  useEffect(() => {
    if (!running) return;
    let live = true;
    const tick = () => {
      if (!live) return;
      if (fitter.steps() >= STEPS) {
        setRunning(false);
        return;
      }
      const loss = fitter.step(4);
      setSteps(fitter.steps());
      setFit(fitter.fit());
      if (fitter.steps() % 20 < 4) setTrace((old) => [...old, { step: fitter.steps(), loss }]);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(frame.current);
    };
  }, [fitter, running]);

  const cells = running ? COARSE : FINE;
  const cellsX = useMemo(() => axisCells(cells, G1), [cells]);
  const cellsY = useMemo(() => axisCells(cells, G2), [cells]);

  // Only the copies that reach into the picture, so the raster stays cheap.
  const z = useMemo(() => cellsY.map((y) => cellsX.map((x) => density(fit, x, y, 1))), [cellsX, cellsY, fit]);

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

  // A line from each mean out to its two tips, so a handle reads as the end of
  // an axis rather than as a loose point near an ellipse.
  const spokes = useMemo(
    () => [
      { from: [state.m1h, state.m1d] as const, to: [state.a1h, state.a1d] as const },
      { from: [state.m1h, state.m1d] as const, to: [state.b1h, state.b1d] as const },
      { from: [state.m2h, state.m2d] as const, to: [state.a2h, state.a2d] as const },
      { from: [state.m2h, state.m2d] as const, to: [state.b2h, state.b2d] as const },
    ],
    [
      state.a1d,
      state.a1h,
      state.a2d,
      state.a2h,
      state.b1d,
      state.b1h,
      state.b2d,
      state.b2h,
      state.m1d,
      state.m1h,
      state.m2d,
      state.m2h,
    ],
  );

  // The theme's ink, one entry per point, which is how `Points` takes a colour.
  const ink = useMemo(() => draws[0].map(() => chrome(resolved === "dark" ? "dark" : "light").ink), [draws, resolved]);

  const span = state.tiles;
  // Equal units, so a circle is drawn as a circle and an ellipse's tilt means
  // what it looks like it means.
  const x = useAxis({ label: "x", range: span ? [-G1, 2 * G1] : [0, G1] });
  const y = useAxis({ label: "y", range: span ? [-G2, 2 * G2] : [0, G2], equal: x });
  const stepX = useAxis({ label: "optimiser step", range: [0, STEPS] });
  const lossY = useAxis({ label: "training loss" });

  const gap = logLik(test[0], test[1], truth) - logLik(test[0], test[1], fit);

  return (
    <Providers key={resolved} theme={resolved}>
      <Figure
        hoverReadout={false}
        title="The same thing on a torus"
        purpose="Both axes wrap, so the surface is a square joined at its edges. Nine copies instead of three, and the model is still an ordinary normal."
        state={state}
        controls={
          <ControlGroup title="fitting">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* The buttons stay on one line together: letting them wrap
                  individually left Reset stranded on a line of its own. */}
              <div className="flex shrink-0 items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => setRunning(!running)} disabled={steps >= STEPS}>
                  {running ? <Pause /> : <Play />}
                  {running ? "Pause" : "Continue"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFitter(build())}>
                  <RotateCcw /> Again
                </Button>
                {/* `Again` refits what is on screen; this puts the controls
                    back where they started, which a figure with six draggable
                    handles needs rather more than most. */}
                <Button size="sm" variant="ghost" onClick={() => state.reset()} disabled={state.isDefault}>
                  <Undo2 /> Reset
                </Button>
              </div>
              <StatusText tone="muted">
                {steps >= STEPS ? `fitted, ${STEPS} steps` : `fitting, step ${steps} of ${STEPS}`}
              </StatusText>
            </div>
          </ControlGroup>
        }
        readouts={[
          <Readout key="gap" label="held-out nats above the generating density" value={gap.toFixed(4)} />,
          <Readout key="ll" label="held-out log density" value={logLik(test[0], test[1], fit).toFixed(4)} />,
          <Readout key="copies" label="copies scored per point" value={shifts().length} />,
          <Readout
            key="means"
            label="means"
            value={fit.map((c) => `(${c.mu[0].toFixed(2)}, ${c.mu[1].toFixed(2)})`).join("  ")}
          />,
        ]}
        caption="Restricting the fit to axis-aligned components is a restriction on the model, not on the data: the generating shapes keep whatever tilt you give them, and a tilted truth is then something the fit cannot match. The dashed ellipses are the density the draws came from, and their handles are the mean and one standard deviation along each principal axis: drag them to stretch and turn a component, and the sample follows. Drag one into a corner to see it wrap. The solid ellipses are the fit, which learns a covariance of its own for each component. Turn on the copies to see what the loss is scoring: the data repeated in nine tiles around one model that never moves."
      >
        <Plot x={x} y={y} fitHeight>
          <Raster
            name="fitted density"
            x={cellsX}
            y={cellsY}
            z={z}
            scale="sequential"
            valueLabel="density"
            colorBar={false}
            live
          />
          <Contours name="the fit" x={cellsX} y={cellsY} z={z} levels={levels} labels={false} opacity={0.5} slot={1} />
          {span &&
            shifts()
              .filter(([i, j]) => i !== 0 || j !== 0)
              .map(([i, j]) => (
                <Points
                  key={`${i},${j}`}
                  name="the copies"
                  x={draws[0].map((v) => v + i * G1)}
                  y={draws[1].map((v) => v + j * G2)}
                  muted
                  size={2}
                />
              ))}
          {truthRings.map((ring, i) => (
            // `emphasis` is ink rather than a category, so eighteen rings do
            // not consume eighteen of the eight palette slots.
            <Curve
              key={`truth-${i}`}
              name="where the draws came from"
              x={ring[0]}
              y={ring[1]}
              dashed
              width={1.5}
              emphasis
            />
          ))}
          {rings.map((ring, i) => (
            <Curve key={`fit-${i}`} name="one scale of the fit" x={ring[0]} y={ring[1]} slot={1} live />
          ))}
          {/* `emphasis` fills a marker with the page colour, which leaves the
              draws white on a light background. These take the theme's ink
              instead, so they are dark on light and white on dark. */}
          <Points name="the draws" x={draws[0]} y={draws[1]} size={2.5} colors={ink} />
          <Segments name="its principal axes" segments={spokes} emphasis width={1} />
          {/* Six handles: a mean and two axis tips for each component. */}
          <Handle {...state.handle(["m1h", "m1d"], { label: "first" })} />
          <Handle {...state.handle(["a1h", "a1d"])} />
          <Handle {...state.handle(["b1h", "b1d"])} />
          <Handle {...state.handle(["m2h", "m2d"], { label: "second" })} />
          <Handle {...state.handle(["a2h", "a2d"])} />
          <Handle {...state.handle(["b2h", "b2d"])} />
          {span && (
            <>
              <Annotation x={0} dashed />
              <Annotation x={G1} dashed />
              <Annotation y={0} dashed />
              <Annotation y={G2} dashed />
            </>
          )}
        </Plot>

        <Plot x={stepX} y={lossY} scale={0.4}>
          <Curve name="training loss" x={trace.map((row) => row.step)} y={trace.map((row) => row.loss)} slot={3} live />
        </Plot>
      </Figure>
    </Providers>
  );
}

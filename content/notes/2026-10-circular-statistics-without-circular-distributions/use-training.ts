import { useCallback, useEffect, useRef, useState } from "react";
import type { Mixture, Trainer } from "./circular";

/**
 * Run fits in the page, a few steps per animation frame.
 *
 * The training is on the main thread on purpose. A worker would keep the page
 * smoother, but it would also put a serialisation boundary between the figure
 * and the model, and a reader moving a slider mid-run is the thing these
 * figures are for. A step on 500 points costs well under a millisecond, so a
 * small batch per frame leaves the frame budget alone.
 *
 * Traces are kept in a ref and copied into state once a frame, because every
 * step appending to React state would re-render the chart a thousand times for
 * a run a reader experiences as one animation.
 */

/**
 * What is kept per recorded round.
 *
 * The fit is taken along with the gap because a figure that draws the
 * parameters over the run needs them, and reading them off the optimiser costs
 * nothing next to the held-out score computed beside it.
 */
/**
 * A value that lags its input until the input has been still for a moment.
 *
 * Dragging a handle changes the generating density on every pointer move, and
 * starting a fit on each of those throws away the one before it after a few
 * steps. Waiting for the drag to settle means the shapes follow the pointer
 * while only the last of them is fitted.
 */
export function useSettled<T>(value: T, ms = 120): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [ms, value]);
  return settled;
}

export type Trace = { step: number; gap: number; loss: number; fit: Mixture }[];

export type Run = {
  running: boolean;
  done: boolean;
  step: number;
  traces: Trace[];
  start: () => void;
  pause: () => void;
  reset: () => void;
  /** Run to the end without drawing, for a reader who does not want to watch. */
  finish: () => void;
};

export function useTraining(
  /** Fresh trainers. Reset calls it again, so a run always starts where the last one did. */
  build: () => Trainer[],
  options: { steps: number; perFrame?: number; every?: number; auto?: boolean } = { steps: 1500 },
): Run & { trainers: readonly Trainer[] } {
  // `auto` starts a run as soon as there is something to run, so changing a
  // control fits the new thing rather than asking to be told to.
  const { steps, perFrame = 4, every = 20, auto = false } = options;
  const [trainers, setTrainers] = useState<Trainer[]>(build);
  const [running, setRunning] = useState(auto);
  const [step, setStep] = useState(0);
  const [traces, setTraces] = useState<Trace[]>(() => trainers.map(() => []));
  const held = useRef(traces);
  const frame = useRef(0);

  // A new factory means new data or a new model: start again on it.
  useEffect(() => {
    const fresh = build();
    setTrainers(fresh);
    held.current = fresh.map(() => []);
    setTraces(held.current);
    setStep(0);
    setRunning(auto);
  }, [auto, build]);

  // The training loss of the last step taken, which `step` returns.
  const loss = useRef<number[]>([]);

  const record = useCallback(() => {
    held.current = trainers.map((t, i) => [
      ...(held.current[i] ?? []),
      { step: t.steps(), gap: t.gap(), loss: loss.current[i] ?? Number.NaN, fit: t.fit() },
    ]);
    setTraces(held.current);
  }, [trainers]);

  const advance = useCallback(
    (n: number) => {
      loss.current = trainers.map((t) => t.step(n));
      setStep(trainers[0]?.steps() ?? 0);
    },
    [trainers],
  );

  useEffect(() => {
    if (!running) return;
    let live = true;
    const tick = () => {
      if (!live) return;
      const at = trainers[0]?.steps() ?? 0;
      if (at >= steps) {
        setRunning(false);
        return;
      }
      advance(Math.min(perFrame, steps - at));
      if ((trainers[0]?.steps() ?? 0) % every < perFrame) record();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(frame.current);
    };
  }, [advance, every, perFrame, record, running, steps, trainers]);

  return {
    trainers,
    running,
    done: step >= steps,
    step,
    traces,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => {
      const fresh = build();
      setTrainers(fresh);
      held.current = fresh.map(() => []);
      setTraces(held.current);
      setStep(0);
      setRunning(auto);
    },
    finish: () => {
      setRunning(false);
      const at = trainers[0]?.steps() ?? 0;
      for (let k = at; k < steps; k += every) {
        advance(Math.min(every, steps - k));
        record();
      }
    },
  };
}

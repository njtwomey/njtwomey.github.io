import { type ComponentProps, type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import type { ECharts as EChartsInstance } from "echarts/core";
import type { Point2 } from "omai-engine/numerics/geometry";
import { annotations, band, contours, heatmap, histogram, lines, points } from "omai-render/charts";
import { type Figure, figure } from "omai-render/figure";
import type { ColourMode } from "omai-render/theme";
import {
  type Constraint,
  Chart,
  DraggableLine,
  DraggablePoints,
  NumberField,
  Toggle,
  InteractionOverlay,
  Overlaid,
  type PlotBox,
  type Projection,
  useColourMode,
} from "omai-render/react";

/**
 * The few pieces every figure in this note shares, over omai-render.
 *
 * omai-render gives a chart, controls, a player and drag handles, and leaves
 * the frame around them to the page. That frame is here: a title, a row of
 * controls, the charts, a row of readouts and a caption, with the site's own
 * tokens doing the colouring.
 */

/** A set of figure parameters with a reset, which is all the state a figure's controls need. */
export function useParams<T extends object>(initial: T) {
  const start = useRef(initial);
  const [values, setValues] = useState(initial);
  return {
    values,
    set: (patch: Partial<T>) => setValues((old) => ({ ...old, ...patch })),
    reset: () => setValues(start.current),
    isDefault: JSON.stringify(values) === JSON.stringify(start.current),
  };
}

export function FigureBox(props: {
  title: string;
  purpose: string;
  caption: string;
  controls?: ReactNode;
  readouts?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-8 space-y-4 rounded-lg border p-4">
      <header>
        <h3 className="text-base font-semibold">{props.title}</h3>
        <p className="text-muted-foreground text-sm">{props.purpose}</p>
      </header>
      {props.controls}
      <div className="space-y-2">{props.children}</div>
      {props.readouts}
      <figcaption className="text-muted-foreground text-sm">{props.caption}</figcaption>
    </figure>
  );
}

/** Controls in a row that wraps. */
export function Controls(props: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-x-5 gap-y-3">{props.children}</div>;
}

/** A number field at the width the row gives it, where omai's own fills whatever it is given. */
export function Num(props: ComponentProps<typeof NumberField>) {
  return <NumberField {...props} className="w-44!" />;
}

/** A switch whose label is shown whole. */
export function Switch(props: ComponentProps<typeof Toggle>) {
  return <Toggle {...props} className="max-w-none" />;
}

export function Readouts(props: { items: readonly (readonly [label: string, value: ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-4 gap-y-2 border-t pt-3">
      {props.items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="font-mono text-sm tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Points a reader drags on a chart, and the rule for where each may go. */
export type Handles = {
  points: readonly Point2[];
  onChange: (points: Point2[]) => void;
  constrain?: Constraint;
  labels?: readonly string[];
  /** A CSS colour for each handle by index. */
  colour?: (index: number) => string;
};

/** A line a reader drags across a chart, bound to the same value as a control. */
export type Rule = {
  axis: "x" | "y";
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
};

/**
 * The stretch of the other axis a dragged line covers: the plotting box, in data units, so that the line
 * stops at the axes and does not run through their labels. Without a box it spans the figure.
 */
function spanOf(axis: "x" | "y", projection: Projection): { span?: readonly [number, number] } {
  const box = projection.rect;
  if (!box) return {};
  const corners = [projection.toData([box.x, box.y + box.height]), projection.toData([box.x + box.width, box.y])];
  const k = axis === "x" ? 1 : 0;
  return { span: [corners[0]?.[k] ?? 0, corners[1]?.[k] ?? 0] };
}

/**
 * A chart that fills the width it is given.
 *
 * omai-render sizes a chart in pixels from a `Figure`, so the width is
 * measured and the figure made from it. The builder takes the figure and gives
 * the option, and has to be stable between renders, since building one is the
 * expensive part of drawing it.
 *
 * `square` sizes the figure so that the plotting area, not the figure, is a
 * square, which is what a surface drawn in equal units needs.
 */
export function ChartPanel(props: {
  build: (fig: Figure, layers: Layers) => EChartsOption;
  ratio?: number;
  square?: boolean;
  handles?: Handles;
  rules?: readonly Rule[];
  label: string;
}) {
  const { build, ratio = 2.2, square = false, handles, rules, label } = props;
  const mode = useColourMode();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fig = useMemo(() => {
    if (width <= 0) return null;
    // A wide, short chart is unreadable on a phone, where it is a few dozen
    // pixels tall, so the narrow case takes a taller box.
    const base = figure({ width, aspect: width < 520 ? Math.min(ratio, 1.8) : ratio, mode });
    if (!square) return base;
    const { top, bottom, left, right } = base.padding;
    return figure({ width, height: width - left - right + top + bottom, mode });
  }, [width, ratio, square, mode]);

  const option = useMemo(
    () => (fig ? { ...build(fig, layersFor(fig.mode)), backgroundColor: "transparent" } : null),
    [build, fig],
  );
  // The overlay needs the chart's own map between data and pixels, and the
  // chart only has one once it has drawn. omai-render's `useChartProjection`
  // asks the chart on every React render, which is often before ECharts has
  // flushed the option set a moment ago, and ECharts answers each handle with
  // a console warning. This reads the map when the chart reports it has
  // finished drawing instead, so it is only ever asked when it can answer.
  const [map, setMap] = useState<{ origin: Point2; scale: Point2; box: PlotBox | null } | null>(null);
  const made = useCallback((chart: EChartsInstance) => {
    const finder = { gridIndex: 0 };
    const learn = () => {
      const a = chart.convertToPixel(finder, [0, 0]);
      const b = chart.convertToPixel(finder, [1, 1]);
      if (!Array.isArray(a) || !Array.isArray(b)) return;
      const origin: Point2 = [a[0] as number, a[1] as number];
      const scale: Point2 = [(b[0] as number) - origin[0], (b[1] as number) - origin[1]];
      if (!scale.every((v) => Number.isFinite(v) && v !== 0)) return;
      // The plotting box, read from the option as omai's own projection does (its charts place the grid with
      // numbers), so that a dragged line spans the axes and not the labels around them.
      const grids = chart.getOption().grid as readonly Record<string, unknown>[] | undefined;
      const g = grids?.[0];
      const num = (k: string) => (typeof g?.[k] === "number" ? (g[k] as number) : undefined);
      const [bx, by, bw, bh] = [num("left"), num("top"), num("width"), num("height")];
      const box: PlotBox | null =
        bx === undefined || by === undefined || bw === undefined || bh === undefined
          ? null
          : { x: bx, y: by, width: bw, height: bh };
      setMap((old) =>
        old &&
        [0, 1].every(
          (i) =>
            Math.abs((old.origin[i] as number) - (origin[i] as number)) < 1e-6 &&
            Math.abs((old.scale[i] as number) - (scale[i] as number)) < 1e-9,
        ) &&
        old.box?.x === box?.x &&
        old.box?.y === box?.y &&
        old.box?.width === box?.width &&
        old.box?.height === box?.height
          ? old
          : { origin, scale, box },
      );
    };
    chart.on("finished", learn);
  }, []);
  const projection = useMemo<Projection | null>(
    () =>
      map && {
        toPixel: (p) => [map.origin[0] + map.scale[0] * p[0], map.origin[1] + map.scale[1] * p[1]],
        toData: (p) => [(p[0] - map.origin[0]) / map.scale[0], (p[1] - map.origin[1]) / map.scale[1]],
        rect: map.box,
      },
    [map],
  );

  return (
    <div ref={box} className="w-full">
      {fig && option && (
        <Overlaid
          width={fig.width}
          height={fig.height}
          overlay={
            (handles || rules) && projection ? (
              <InteractionOverlay projection={projection} width={fig.width} height={fig.height}>
                {rules?.map((rule) => (
                  <DraggableLine key={rule.axis + (rule.label ?? "")} {...rule} {...spanOf(rule.axis, projection)} />
                ))}
                {handles && (
                  <DraggablePoints
                    points={handles.points}
                    onChange={handles.onChange}
                    {...(handles.constrain ? { constrain: handles.constrain } : {})}
                    {...(handles.labels ? { labels: handles.labels } : {})}
                    {...(handles.colour ? { colour: handles.colour } : {})}
                    radius={6}
                  />
                )}
              </InteractionOverlay>
            ) : null
          }
        >
          <Chart option={option} figure={fig} label={label} onInit={made} mode={mode} />
        </Overlaid>
      )}
    </div>
  );
}

/**
 * omai-render's layer builders, each already told which theme it draws in.
 *
 * A layer resolves its colour names (`fg`, `muted`, `tab1`) when it is built,
 * and a builder not told the mode builds for light. A chart that is legible in
 * light and invisible in dark is what that gives, and it is invisible to anyone
 * testing in one theme, so the mode is bound once here rather than passed at
 * every call.
 */
export function layersFor(mode: ColourMode) {
  return {
    annotations: (notes: Parameters<typeof annotations>[0]) => annotations(notes, { mode }),
    band: (bands: Parameters<typeof band>[0]) => band(bands, { mode }),
    contours: (z: Parameters<typeof contours>[0], options: Parameters<typeof contours>[1] = {}) =>
      contours(z, { ...options, mode }),
    heatmap: (z: Parameters<typeof heatmap>[0], options: Parameters<typeof heatmap>[1] = {}) =>
      heatmap(z, { ...options, mode }),
    histogram: (values: Parameters<typeof histogram>[0], options: Parameters<typeof histogram>[1] = {}) =>
      histogram(values, { ...options, mode }),
    lines: (curves: Parameters<typeof lines>[0]) => lines(curves, { mode }),
    points: (sets: Parameters<typeof points>[0]) => points(sets, { mode }),
  };
}

/** The builders of one theme. */
export type Layers = ReturnType<typeof layersFor>;

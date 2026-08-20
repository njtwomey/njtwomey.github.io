import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import * as React from "react";
import { darkgrid, palette } from "@/lib/chart-theme";
import { useTheme } from "@/hooks/use-theme";
import sweep from "./sweep.json";

// Only what this chart draws. The full ECharts bundle is about a megabyte and
// registering pieces individually costs a fraction of it, which matters because
// this ships inside one note's chunk.
echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

type Point = {
  dataset: string;
  retriever: string;
  depth: number;
  metric: string;
  system: string;
  mean: number;
  ci_low: number;
  ci_high: number;
};

/**
 * The three first stages, weakest first. Colours come from the shared palette by
 * position, so the order here is what fixes them and a reader learns them once.
 */
const ARMS = [
  { key: "dense", label: "all-MiniLM-L6-v2" },
  { key: "bm25", label: "BM25" },
  { key: "dense_strong", label: "bge-small-en-v1.5" },
] as const;

const points = sweep.points as Point[];

/**
 * Every depth that was swept, in order. Used as the x categories so each one is
 * labelled rather than left to an axis algorithm choosing round numbers that are
 * not the depths anybody ran.
 */
const DEPTHS = [...new Set(points.filter((p) => p.metric === "ndcg@10").map((p) => p.depth))].sort((a, b) => a - b);

function series(retriever: string, system: string) {
  return points
    .filter((p) => p.retriever === retriever && p.system === system && p.metric === "ndcg@10")
    .sort((a, b) => a.depth - b.depth);
}

/**
 * nDCG@10 against the number of candidates re-ranked, one line per first stage,
 * with each first stage's own score as a flat dashed line.
 *
 * The distance between a solid line and its own dashed line is what re-ranking
 * bought, which is the quantity the note is about. Drawing the baseline rather
 * than describing it means the reader can see the strongest retriever's solid
 * line sitting below its dashed one.
 *
 * The x axis is log, because the depths are log-spaced and a linear axis would
 * put four of the six points in the leftmost fifth of the plot.
 */
export function DepthPlot() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  React.useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });

    // Colours, gridlines and the panel all come from the shared theme, keyed on
    // the resolved mode. Nothing in this file knows a hex value.
    const t = darkgrid(resolved);
    const colours = palette(resolved);

    chart.setOption({
      ...t,
      legend: { ...t.legend, data: ARMS.map((a) => a.label) },
      tooltip: {
        ...t.tooltip,
        valueFormatter: (v: number) => (typeof v === "number" ? v.toFixed(4) : String(v)),
      },
      // Category rather than log. The depths are already roughly 3x apart, so
      // even spacing is log spacing, and a category axis puts a labelled tick on
      // every depth that was actually run instead of at round numbers that were
      // not.
      xAxis: {
        ...t.xAxis,
        type: "category",
        data: DEPTHS.map(String),
        boundaryGap: false,
        name: "candidates re-ranked",
        // Every depth labelled, rather than the round numbers an axis algorithm
        // would pick, none of which were run.
        axisLabel: { ...t.xAxis.axisLabel, interval: 0 },
      },
      yAxis: {
        ...t.yAxis,
        type: "value",
        name: "nDCG@10",
        scale: true,
        axisLabel: { ...t.yAxis.axisLabel, formatter: (v: number) => v.toFixed(2) },
      },
      series: ARMS.flatMap((arm, i) => {
        const colour = colours[i]!;
        const reranked = series(arm.key, "rerank");
        const baseline = series(arm.key, "no_rerank").at(-1);
        return [
          {
            name: arm.label,
            type: "line",
            symbol: "circle",
            symbolSize: 6,
            lineStyle: { width: 2, color: colour },
            itemStyle: { color: colour },
            // Indexed by depth rather than zipped, so a missing point leaves a
            // gap at the right place instead of shifting the whole line left.
            data: DEPTHS.map((d) => reranked.find((p) => p.depth === d)?.mean ?? null),
            // The first stage on its own, flat by construction: it does not
            // depend on how many of its candidates get re-scored.
            markLine: baseline
              ? {
                  silent: true,
                  symbol: "none",
                  label: { show: false },
                  lineStyle: { color: colour, type: "dashed", width: 1, opacity: 0.7 },
                  data: [{ yAxis: baseline.mean }],
                }
              : undefined,
          },
        ];
      }),
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [resolved]);

  return (
    <figure className="my-6">
      <div
        ref={ref}
        className="h-80 w-full"
        role="img"
        aria-label="nDCG at 10 against candidate depth, per first stage"
      />
      <figcaption className="text-muted-foreground mt-2 text-center text-xs">
        SciFact, 300 queries. Solid lines are re-ranked with the same cross-encoder; dashed lines are each first stage
        on its own, which does not vary with depth. A solid line below its own dashed line means re-ranking cost
        quality, which is where <code>bge-small-en-v1.5</code> sits at every depth on the chart.
      </figcaption>
    </figure>
  );
}

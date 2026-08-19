/**
 * One place for what every chart on this site looks like.
 *
 * ECharts paints its own canvas and knows nothing about the CSS tokens in
 * `index.css`, so a chart that is legible in light and invisible in dark is the
 * standing failure mode here, and it is invisible to anyone testing in one
 * theme. Every colour a chart uses therefore comes from this file, keyed on the
 * resolved theme, rather than from hex values typed into the chart itself.
 *
 * The palettes are seaborn's, copied verbatim, because a house palette invented
 * from scratch would be one more thing to maintain and would not match the
 * figures that come out of the Python side of this repo. The grid style is
 * seaborn's `darkgrid`: a tinted panel with light gridlines and no axis spines,
 * which is the one people recognise.
 */

export type Mode = "light" | "dark";

/**
 * seaborn's `deep`, its default qualitative palette, in its own order: blue,
 * orange, green, red, purple, brown, pink, grey, yellow, cyan.
 *
 * Ten is deliberate. A chart needing an eleventh series has too many series.
 */
export const DEEP = [
  "#4c72b0",
  "#dd8452",
  "#55a868",
  "#c44e52",
  "#8172b3",
  "#937860",
  "#da8bc3",
  "#8c8c8c",
  "#ccb974",
  "#64b5cd",
] as const;

/** seaborn's `colorblind`, same order, for charts where the distinction has to survive. */
export const COLORBLIND = [
  "#0173b2",
  "#de8f05",
  "#029e73",
  "#d55e00",
  "#cc78bc",
  "#ca9161",
  "#fbafe4",
  "#949494",
  "#ece133",
  "#56b4e9",
] as const;

export type PaletteName = "deep" | "colorblind";

const PALETTES: Record<PaletteName, readonly string[]> = { deep: DEEP, colorblind: COLORBLIND };

/**
 * Lighten a hex colour towards white by `amount`.
 *
 * seaborn's palettes are chosen against a light panel, and on a dark one the
 * mid-tone blues and browns go muddy. Deriving the dark variant rather than
 * hand-typing a second set of hexes keeps one source of truth: correcting a
 * palette means correcting it once, and the two can never drift apart.
 */
function lighten(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** The series colours for a chart, in order, already adjusted for the theme. */
export function palette(mode: Mode, name: PaletteName = "deep"): string[] {
  const base = PALETTES[name];
  return mode === "dark" ? base.map((c) => lighten(c, 0.3)) : [...base];
}

/**
 * Everything that is not a series colour: ink, gridlines and the panel behind
 * the plot. `panel` is seaborn's `axes.facecolor` in light, and its dark
 * counterpart is a lift off the page rather than a drop, since the page itself
 * is already near black.
 */
export function tokens(mode: Mode) {
  return mode === "dark"
    ? {
        ink: "#e5e7eb",
        muted: "#9ca3af",
        panel: "#22252d",
        grid: "#3a3f4b",
        surface: "#111827",
      }
    : {
        ink: "#1f2937",
        muted: "#6b7280",
        panel: "#eaeaf2",
        grid: "#ffffff",
        surface: "#ffffff",
      };
}

/**
 * The parts of an ECharts option that every chart shares, ready to spread.
 *
 * A chart adds its own `series`, and merges axis specifics such as `name` and
 * `data` into `xAxis`/`yAxis`. Spreading rather than deep-merging is deliberate:
 * a chart that needs a different axis says so in one place, and nothing here
 * silently overrides it.
 *
 * ```ts
 * const t = darkgrid(resolved);
 * chart.setOption({ ...t, xAxis: { ...t.xAxis, type: "category", data }, series });
 * ```
 */
export function darkgrid(mode: Mode, name: PaletteName = "deep") {
  const c = tokens(mode);
  const label = { color: c.muted, fontSize: 11 };

  return {
    animation: false,
    color: palette(mode, name),
    textStyle: { color: c.ink },
    grid: {
      left: 52,
      right: 16,
      top: 40,
      bottom: 44,
      show: true,
      backgroundColor: c.panel,
      borderWidth: 0,
    },
    legend: { top: 0, itemWidth: 18, itemHeight: 2, textStyle: label },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: c.surface,
      borderColor: c.grid,
      textStyle: { color: c.ink, fontSize: 12 },
    },
    // No spines and no ticks, which is what makes a seaborn panel read as a
    // panel rather than as a boxed plot. The gridlines carry the scale instead,
    // and they are solid and faint on purpose: a chart that marks a baseline
    // with a dashed series line cannot also rule its axes in dashes without the
    // reader having to work out which dashes mean something.
    xAxis: {
      nameLocation: "middle" as const,
      nameGap: 28,
      nameTextStyle: label,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: label,
      splitLine: { show: true, lineStyle: { color: c.grid, width: 1, opacity: 0.55 } },
    },
    yAxis: {
      nameLocation: "middle" as const,
      nameGap: 38,
      nameTextStyle: label,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: label,
      splitLine: { show: true, lineStyle: { color: c.grid, width: 1, opacity: 0.55 } },
    },
  };
}

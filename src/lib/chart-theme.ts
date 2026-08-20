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
 * The three channels of a `#rrggbb` string, 0 to 255.
 *
 * Exported because a chart drawing a continuous surface has to write pixels
 * rather than hand ECharts a colour, and the alternative is every such chart
 * parsing hex for itself.
 */
export function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A colour `t` of the way from `a` to `b`, both `#rrggbb`.
 *
 * Straight sRGB interpolation, which is not perceptually uniform and is right
 * anyway: the endpoints here are always palette colours, and a fancier space
 * would shift the hues away from the ones the rest of the site uses.
 */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[channel(ar, br), channel(ag, bg), channel(ab, bb)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Lighten a hex colour towards white by `amount`.
 *
 * seaborn's palettes are chosen against a light panel, and on a dark one the
 * mid-tone blues and browns go muddy. Deriving the dark variant rather than
 * hand-typing a second set of hexes keeps one source of truth: correcting a
 * palette means correcting it once, and the two can never drift apart.
 */
function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

/** The series colours for a chart, in order, already adjusted for the theme. */
export function palette(mode: Mode, name: PaletteName = "deep"): string[] {
  const base = PALETTES[name];
  return mode === "dark" ? base.map((c) => lighten(c, 0.3)) : [...base];
}

/**
 * The same colours as seaborn wrote them, for a filled region rather than a mark.
 *
 * `palette()` lightens by a third for dark, which is right for a line or a point on a
 * dark page and wrong for a fill: a fill lightened that way lands at nearly the lightness
 * of the marks sitting on top of it, and the obvious correction, mixing back towards the
 * panel, drags the chroma out and turns the orange into mud. Neither is a colour anybody
 * chose.
 *
 * A fill wants the colour unadjusted in either theme. It is already mid-toned, so it
 * reads against a pale panel and against a dark one, and only the mark on top of it has
 * to move with the theme. The nth fill is then the nth seaborn colour in both themes and
 * in any figure from the Python side, which is the whole reason the palettes are copied
 * verbatim.
 */
export function fills(name: PaletteName = "deep"): string[] {
  return [...PALETTES[name]];
}

/**
 * Everything that is not a series colour: ink, gridlines and the panel behind
 * the plot. `panel` is seaborn's `axes.facecolor` in light, and its dark
 * counterpart is a lift off the page rather than a drop, since the page itself
 * is already near black.
 *
 * `neutral` is the middle of a diverging scale, and it is light in both themes.
 * It reads as the panel in light and is a separate value in dark, which is the
 * whole point of it: a scale that runs from one colour through the panel to
 * another works on a pale panel and fails on a dark one, where it drops into
 * near black at the midpoint and puts a dirty valley through every transition.
 * A diverging scale passes through a light neutral whatever the page is, which
 * is what `RdBu` and every scale like it does, and it is what makes the middle
 * read as "no evidence either way" rather than as a hole.
 *
 * `contour` is a line marking a level on such a scale, and it is the one value
 * here that does not change with the theme. It has no need to: a level line sits
 * where the scale is at its middle, and the middle is light in both, so a dark
 * line is legible in both and a line following the ink would go white on dark and
 * disappear into the neutral it is drawn on.
 */
export function tokens(mode: Mode) {
  return mode === "dark"
    ? {
        ink: "#e5e7eb",
        muted: "#9ca3af",
        panel: "#22252d",
        grid: "#3a3f4b",
        surface: "#111827",
        neutral: "#e5e7eb",
        contour: "#1f2937",
      }
    : {
        ink: "#1f2937",
        muted: "#6b7280",
        panel: "#eaeaf2",
        grid: "#ffffff",
        surface: "#ffffff",
        neutral: "#eaeaf2",
        contour: "#1f2937",
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

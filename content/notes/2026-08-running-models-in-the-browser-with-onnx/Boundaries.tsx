import { CustomChart, ScatterChart } from "echarts/charts";
import { GridComponent, TitleComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from "echarts/types/dist/shared";
import * as React from "react";
import { useAsset } from "@/components/mdx";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/hooks/use-theme";
import { darkgrid, fills, mix, palette, rgb, tokens, type Mode } from "@/lib/chart-theme";
import demo from "./demo.json";
// The runtime is fetched rather than inlined. `onnxruntime-web/wasm` resolves to a
// 73 kB loader that expects to find its WebAssembly binary at a URL, and `?url` hands
// that job to vite: the file is emitted into the build with a content hash and this is
// the path it landed at. The alternative export inlines the binary as base64 inside the
// JavaScript, which would put 18 MB in a note's chunk.
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

// Only what these charts draw. The full ECharts bundle is about a megabyte and
// registering pieces individually costs a fraction of it, which matters because
// this ships inside one note's chunk.
echarts.use([CustomChart, ScatterChart, GridComponent, TitleComponent, CanvasRenderer]);

/**
 * The four models, in the order the note discusses them: a linear model, a kernel
 * machine, a tree ensemble and a neural network. The slug is the filename, so this list
 * is also what gets fetched.
 */
const MODELS = ["logistic-regression", "svm-rbf", "random-forest", "mlp"] as const;

type Slug = (typeof MODELS)[number];

/**
 * Points per side of the grid, so N² forward passes per model. The reader picks, and the
 * range is chosen so both ends are informative: 20 is coarse enough to see the sampling
 * itself, and 260 is about the width of a panel, past which there is nothing more to
 * resolve.
 */
const GRID = { min: 20, max: 260, step: 10, initial: 160 };

/**
 * How far in to crop, as slider positions rather than as a factor.
 *
 * The useful range runs from a tenth to ten, and on a linear slider nine tenths of the
 * travel would be spent between 1 and 10 while everything below 1 crowded into the first
 * few pixels. The position is therefore the exponent: 0 is 0.1x, 50 is 1x, 100 is 10x, and
 * one step is the same proportional change wherever the thumb happens to be.
 */
const ZOOM = { min: 0, max: 100, step: 1, initial: 50 };

/** The factor a slider position stands for. */
function zoomOf(position: number): number {
  return 10 ** ((position - 50) / 50);
}

/**
 * Where to crop about. The range is wider than the data on every side, so the window can
 * be walked off the moons entirely and out into the region where each model is
 * extrapolating, which is where the four stop looking alike.
 */
const CENTRE = { min: -2, max: 2, step: 0.1 };

/**
 * How long the controls wait after the last movement before spending a run.
 *
 * A slider fires on every pixel it is dragged across, and a run at the coarse end takes
 * long enough that firing on each one would queue dozens of them. Long enough to mean the
 * drag has stopped, short enough that it does not feel like the control is ignoring you.
 */
const SETTLE = 200;

/** Roughly the widest either chart column gets, so the painted image is never upscaled. */
const PAINTED = 480;

/**
 * How far a point is pulled away from the shading it sits on, per theme.
 *
 * The shading is `fills()`, the palette unadjusted, in both themes. The point is
 * `palette()`, which already lightens by a third for dark, and that lift is the whole of
 * the separation it needs there. In light the palette is the same mid-toned colour as the
 * fill, so the point has to be darkened or it disappears into the region that agrees with
 * it, and the only points you can see are the misclassified ones.
 */
const POINT_TOWARDS_INK = { light: 0.45, dark: 0 } as const;

const { extent, points, labels, models } = demo;
const [baseXMin, baseXMax, baseYMin, baseYMax] = extent as [number, number, number, number];

type Extent = { xMin: number; xMax: number; yMin: number; yMax: number };

/** The middle of the data, which is where the window starts before anybody moves it. */
const HOME = { x: (baseXMin + baseXMax) / 2, y: (baseYMin + baseYMax) / 2 };

/** The window the grid covers: the full extent scaled by the zoom, about a chosen centre. */
function windowAt(zoom: number, cx: number, cy: number): Extent {
  const [halfX, halfY] = [(baseXMax - baseXMin) / (2 * zoom), (baseYMax - baseYMin) / (2 * zoom)];
  return { xMin: cx - halfX, xMax: cx + halfX, yMin: cy - halfY, yMax: cy + halfY };
}

/** The same format the Python script prints, so a size in the note reads as a size here. */
function sizeLabel(bytes: number): string {
  return bytes < 10_000 ? `${bytes.toLocaleString()} B` : `${Math.round(bytes / 1024).toLocaleString()} kB`;
}

/**
 * The grid, as one `[N², 2]` batch in the order a canvas scans pixels: left to right,
 * top row first. Scanning order rather than `meshgrid` order means the nth probability
 * that comes back is the nth pixel, and nothing has to be flipped afterwards.
 */
function gridBatch(n: number, at: Extent): Float32Array {
  const batch = new Float32Array(n * n * 2);
  for (let row = 0; row < n; row++) {
    // Top row is the largest y, because canvas rows count down the screen and the axis
    // counts up.
    const y = at.yMax - (row * (at.yMax - at.yMin)) / (n - 1);
    for (let col = 0; col < n; col++) {
      const i = (row * n + col) * 2;
      batch[i] = at.xMin + (col * (at.xMax - at.xMin)) / (n - 1);
      batch[i + 1] = y;
    }
  }
  return batch;
}

/**
 * Paint one probability surface as a PNG data URL.
 *
 * Two things are drawn. The shading is the model's probability of the second class,
 * ramped from the first class's colour through the panel to the second class's, so a
 * point the model is unsure about disappears into the background. The line is where that
 * probability crosses a half, found by looking for a sign change against the neighbour to
 * the right or below, which is a marching-squares boundary at grid resolution and is what
 * a contour of the same field would draw. It is dark in both themes, because it only ever
 * lands where the scale is at its light middle.
 *
 * Alpha is per pixel rather than a single opacity on the whole image, because the line
 * has to stay full strength while the shading is washed enough to read gridlines through.
 *
 * The upscale is nearest neighbour and deliberate. The forest's surface is piecewise
 * constant and its blocks are the point of looking at it, so the image has to reach the
 * canvas at least as large as it will be drawn; letting the canvas smooth a 40 px grid up
 * to a 400 px panel would round off exactly the corners the note is pointing at.
 */
function paint(surface: Float32Array, n: number, mode: Mode): string {
  const c = tokens(mode);
  // Unadjusted in either theme: this is a filled region rather than a mark.
  const region = fills();
  const [low, high] = [region[0]!, region[1]!];

  // A lookup rather than a mix per pixel: up to 57,600 pixels against 256 entries.
  const ramp = Array.from({ length: 256 }, (_, i) => {
    const p = i / 255;
    // Through `neutral` rather than the panel. On a pale panel the two are the same value
    // and this is the scale it always was; on a dark one the panel would put a near-black
    // valley everywhere the model is unsure, which is most of the interesting area.
    return rgb(p < 0.5 ? mix(low, c.neutral, p * 2) : mix(c.neutral, high, (p - 0.5) * 2));
  });
  const contour = rgb(c.contour);

  const source = document.createElement("canvas");
  source.width = n;
  source.height = n;
  const sourceContext = source.getContext("2d")!;
  const image = sourceContext.createImageData(n, n);

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const at = row * n + col;
      const p = surface[at]!;
      const right = col + 1 < n ? surface[at + 1]! : p;
      const below = row + 1 < n ? surface[at + n]! : p;
      const onBoundary = (p - 0.5) * (right - 0.5) < 0 || (p - 0.5) * (below - 0.5) < 0;

      const [r, g, b] = onBoundary ? contour : ramp[Math.round(p * 255)]!;
      const px = at * 4;
      image.data[px] = r;
      image.data[px + 1] = g;
      image.data[px + 2] = b;
      // Washed shading, solid line. 200 leaves the gridlines faintly visible underneath,
      // which is what makes the panel still read as a panel.
      image.data[px + 3] = onBoundary ? 255 : 200;
    }
  }
  sourceContext.putImageData(image, 0, 0);

  const scale = Math.max(1, Math.ceil(PAINTED / n));
  const scaled = document.createElement("canvas");
  scaled.width = n * scale;
  scaled.height = n * scale;
  const context = scaled.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, scaled.width, scaled.height);
  return scaled.toDataURL();
}

type Ort = typeof import("onnxruntime-web/wasm");
type Session = Awaited<ReturnType<Ort["InferenceSession"]["create"]>>;

type Runtime = { ort: Ort; sessions: Map<Slug, Session> };

/**
 * Fetch the runtime and open a session per model, once.
 *
 * The sessions stay open for the life of the component rather than being created per
 * run, because every control on this chart and every mouse move over it is another
 * forward pass, and reloading four graphs to answer one of them would make the thing feel
 * like a page load when it is a function call.
 */
async function start(url: (file: string) => string): Promise<Runtime> {
  // Imported here rather than at the top of the file so the runtime is only fetched by a
  // reader who actually opened this note.
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  // Threads need cross-origin isolation, which needs response headers, which a static
  // host does not give you. One thread is the honest setting rather than a fallback.
  ort.env.wasm.numThreads = 1;

  const sessions = new Map<Slug, Session>();
  for (const slug of MODELS) sessions.set(slug, await ort.InferenceSession.create(url(`${slug}.onnx`)));
  return { ort, sessions };
}

/** The probability of the second class, for a batch of rows, from the exported graph. */
async function predict({ ort, sessions }: Runtime, slug: Slug, batch: Float32Array): Promise<Float32Array> {
  const rows = batch.length / 2;
  const input = new ort.Tensor("float32", batch, [rows, 2]);
  const output = await sessions.get(slug)!.run({ [models[slug].input]: input });
  // `zipmap=False` at export is what makes this a plain [N, 2] tensor rather than a
  // sequence of maps. Column 1 is the probability of the second class.
  const probabilities = output.probabilities!.data as Float32Array;
  const second = new Float32Array(rows);
  for (let i = 0; i < rows; i++) second[i] = probabilities[i * 2 + 1]!;
  return second;
}

/**
 * The four surfaces and the grid they were computed on, in one value.
 *
 * They were two, and painting read the arrays from state alongside the resolution from the
 * slider. Those disagree for exactly one render whenever the grid changes, because the
 * slider lands during render and the effect that clears the old arrays only runs after the
 * commit. Turning the grid down was survivable, since painting then read a prefix of a
 * longer array. Turning it up walked off the end, and an out-of-range read on a
 * `Float32Array` is `undefined` rather than a throw, so it travelled as far as a `NaN`
 * index into the colour ramp before taking the page down. Holding the pair together makes
 * the mismatched state unrepresentable.
 */
type Surfaces = { n: number; data: Partial<Record<Slug, Float32Array>> };

type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * Where the cursor is, in data coordinates, and what all four models say about that point.
 *
 * Held in data coordinates rather than pixels because the crosshair is drawn on every
 * panel at once. The four share an extent, so one pair of coordinates locates the same
 * point on all of them, and reading four probabilities off one position is the comparison
 * the four charts exist to support: the shapes show where each model changes its mind, and
 * this shows what each of them thinks at a place you picked.
 */
type Hover = {
  /** Which panel the cursor is actually over, so only that one carries the readout. */
  chart: number;
  x: number;
  y: number;
  probabilities: Partial<Record<Slug, number>>;
};

/** Where a data point falls inside one panel, given that panel's plotting rectangle. */
function project(x: number, y: number, at: Extent, rect: Rect): { px: number; py: number } {
  return {
    px: rect.left + ((x - at.xMin) / (at.xMax - at.xMin)) * (rect.right - rect.left),
    py: rect.top + ((at.yMax - y) / (at.yMax - at.yMin)) * (rect.bottom - rect.top),
  };
}

/**
 * The four decision boundaries, drawn from the four `.onnx` files in this directory by
 * `onnxruntime-web` while the page is open.
 *
 * The note's claim is that nothing here was precomputed, so nothing here is precomputed,
 * and the controls exist to make that checkable rather than to be useful: changing the
 * zoom or the grid throws away every pixel on screen and asks the four models for a new
 * set, and the time it took is printed underneath. A picture would not be able to do
 * that. Hovering goes one further and runs a single row through the model under the
 * cursor, so the number in the readout is a forward pass and not a lookup into anything
 * drawn earlier.
 *
 * Inference and painting are deliberately separate. Colour comes from the resolved theme,
 * so a reader switching to dark has to get four repainted charts, and repainting is a
 * loop over an array rather than four more model runs.
 */
export function Boundaries() {
  const url = useAsset();
  const { resolved } = useTheme();

  // Two values per control: what the slider shows, which follows the thumb, and what the
  // models have been asked for, which follows it once the dragging stops.
  const [zoom, settledZoom] = useDebounced(ZOOM.initial);
  const [centreX, settledCentreX] = useDebounced(round(HOME.x, CENTRE.step));
  const [centreY, settledCentreY] = useDebounced(round(HOME.y, CENTRE.step));
  const [resolution, settledResolution] = useDebounced(GRID.initial);
  const [surfaces, setSurfaces] = React.useState<Surfaces>({ n: GRID.initial, data: {} });
  const [elapsed, setElapsed] = React.useState<number | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<Hover | null>(null);

  const runtime = React.useRef<Runtime | null>(null);
  const [ready, setReady] = React.useState(false);
  const containers = React.useRef<(HTMLDivElement | null)[]>([]);
  // The plotting rectangle of each panel, so a hover on one can be drawn on all four
  // without asking four charts to convert coordinates on every mouse move.
  const [rects, setRects] = React.useState<(Rect | null)[]>([]);
  // One probe at a time. A mouse crossing a panel fires far more moves than there are
  // frames, and queueing a forward pass for each would build a backlog that arrives
  // after the cursor has gone.
  const probing = React.useRef(false);

  const at = React.useMemo(
    () => windowAt(zoomOf(settledZoom), settledCentreX, settledCentreY),
    [settledZoom, settledCentreX, settledCentreY],
  );

  React.useEffect(() => {
    let live = true;
    start(url)
      .then((loaded) => {
        if (!live) return;
        runtime.current = loaded;
        setReady(true);
      })
      .catch((error: unknown) => live && setFailure(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [url]);

  // Every model, every time the window or the grid changes. Clearing first is the
  // demonstration: the charts go blank and come back, which a picture cannot do.
  React.useEffect(() => {
    if (!ready || !runtime.current) return;
    let live = true;
    const loaded = runtime.current;
    setSurfaces({ n: settledResolution, data: {} });
    setElapsed(null);
    setHover(null);

    (async () => {
      const started = performance.now();
      const batch = gridBatch(settledResolution, at);
      for (const slug of MODELS) {
        const surface = await predict(loaded, slug, batch);
        if (!live) return;
        setSurfaces((previous) => ({ n: settledResolution, data: { ...previous.data, [slug]: surface } }));
      }
      setElapsed(performance.now() - started);
    })().catch((error: unknown) => live && setFailure(error instanceof Error ? error.message : String(error)));

    return () => {
      live = false;
    };
  }, [ready, settledResolution, at]);

  // Painted separately from the models, so switching theme costs four canvases rather
  // than four forward passes.
  const painted = React.useMemo(() => {
    const images: Partial<Record<Slug, string>> = {};
    for (const slug of MODELS) {
      const surface = surfaces.data[slug];
      // `surfaces.n` rather than the slider, so the grid used here is always the one these
      // arrays were filled at.
      if (surface) images[slug] = paint(surface, surfaces.n, resolved);
    }
    return images;
  }, [surfaces, resolved]);

  React.useEffect(() => {
    const c = tokens(resolved);
    const colours = palette(resolved);
    const label = { color: c.muted, fontSize: 11 };

    const charts = MODELS.map((slug, index) => {
      const container = containers.current[index];
      const image = painted[slug];
      if (!container || !image) return null;

      const chart = echarts.getInstanceByDom(container) ?? echarts.init(container, undefined, { renderer: "canvas" });
      const t = darkgrid(resolved);

      chart.setOption(
        {
          animation: false,
          textStyle: t.textStyle,
          title: {
            text: `${models[slug].label} · ${sizeLabel(models[slug].bytes)}`,
            left: 0,
            top: 0,
            textStyle: { color: c.muted, fontSize: 11, fontWeight: "normal" as const },
          },
          // Four small panels, so the axes carry scale and nothing else. Names and a
          // legend would be four copies of the same two words.
          grid: { ...t.grid, left: 34, right: 10, top: 26, bottom: 24 },
          xAxis: {
            ...t.xAxis,
            type: "value" as const,
            min: at.xMin,
            max: at.xMax,
            // Otherwise the two ends print the extent to six decimal places, which is
            // the float that came out of the data rather than a number anybody reads.
            axisLabel: { ...label, formatter: (v: number) => v.toFixed(1) },
          },
          yAxis: {
            ...t.yAxis,
            type: "value" as const,
            min: at.yMin,
            max: at.yMax,
            axisLabel: { ...label, formatter: (v: number) => v.toFixed(1) },
          },
          series: [
            {
              // One image stretched across the axes, rather than a heatmap of tens of
              // thousands of rectangles. The surface is already a bitmap by the time it
              // gets here and asking ECharts to draw it cell by cell would be slower and
              // no more exact.
              type: "custom",
              silent: true,
              data: [0],
              renderItem: (_params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
                const [left, top] = api.coord([at.xMin, at.yMax]) as [number, number];
                const [right, bottom] = api.coord([at.xMax, at.yMin]) as [number, number];
                return {
                  type: "image" as const,
                  style: { image, x: left, y: top, width: right - left, height: bottom - top },
                };
              },
            },
            ...[0, 1].map((klass) => ({
              type: "scatter" as const,
              symbol: "circle" as const,
              symbolSize: 7,
              silent: true,
              // The window can be walked off the data, and a point outside the axes
              // belongs outside the panel rather than floating in the margin.
              clip: true,
              data: points.filter((_, i) => labels[i] === klass),
              itemStyle: {
                // Pulled towards the ink, which darkens in light and lightens in dark,
                // and in both cases away from the panel the field is washed towards. A
                // point in the plain palette colour sits at the saturated end of its own
                // shading and vanishes into the region that agrees with it, so the only
                // points you could see were the misclassified ones.
                color: mix(colours[klass]!, c.ink, POINT_TOWARDS_INK[resolved]),
                // No border. At a symbol this small ECharts strokes the path heavily
                // enough that a nominal 1 px border swallowed most of the disc, and every
                // point that agreed with the region under it read as a white ring. The
                // separation the border was there for comes from the colour instead.
                borderWidth: 0,
                // ECharts defaults scatter to 0.8, which fades the points into the field
                // they have to be told apart from.
                opacity: 1,
              },
            })),
          ],
        },
        { replaceMerge: ["series"] },
      );

      // Hover is handled here rather than through the ECharts tooltip because what the
      // reader wants the value of is the surface, which is an image and carries no data
      // points to trigger on.
      const zr = chart.getZr();
      zr.off("mousemove");
      zr.off("globalout");
      zr.on("mousemove", (event) => {
        const pixel: [number, number] = [event.offsetX, event.offsetY];
        if (!chart.containPixel({ gridIndex: 0 }, pixel)) {
          setHover((previous) => (previous?.chart === index ? null : previous));
          return;
        }
        const [x, y] = chart.convertFromPixel({ gridIndex: 0 }, pixel) as [number, number];
        if (probing.current || !runtime.current) return;
        probing.current = true;
        const loaded = runtime.current;
        const row = Float32Array.from([x, y]);
        // Every model, because the crosshair goes on every panel. One row through four
        // graphs costs less than the mouse move that asked for it.
        Promise.all(MODELS.map((each) => predict(loaded, each, row).then(([p]) => [each, p ?? 0] as const)))
          .then((answers) => setHover({ chart: index, x, y, probabilities: Object.fromEntries(answers) }))
          .finally(() => {
            probing.current = false;
          });
      });
      zr.on("globalout", () => setHover((previous) => (previous?.chart === index ? null : previous)));

      return chart;
    });

    const measure = () =>
      setRects(
        charts.map((chart) => {
          if (!chart) return null;
          const [left, top] = chart.convertToPixel({ gridIndex: 0 }, [at.xMin, at.yMax]) as [number, number];
          const [right, bottom] = chart.convertToPixel({ gridIndex: 0 }, [at.xMax, at.yMin]) as [number, number];
          return { left, top, right, bottom };
        }),
      );
    measure();

    const resize = () => {
      setHover(null);
      charts.forEach((chart) => chart?.resize());
      measure();
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [painted, resolved, at]);

  React.useEffect(() => {
    const current = containers.current;
    return () => current.forEach((container) => container && echarts.getInstanceByDom(container)?.dispose());
  }, []);

  const cells = settledResolution * settledResolution;
  const busy = !failure && elapsed === null;

  return (
    <figure className="my-6">
      <div className="mb-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <Control label="Zoom" min={ZOOM.min} max={ZOOM.max} step={ZOOM.step} bind={zoom}>
          {zoomOf(zoom.value) < 1 ? zoomOf(zoom.value).toFixed(2) : zoomOf(zoom.value).toFixed(1)}&times;
        </Control>
        <Control label="Grid" min={GRID.min} max={GRID.max} step={GRID.step} bind={resolution}>
          {resolution.value}&sup2; = {(resolution.value * resolution.value).toLocaleString()} pts
        </Control>
        <Control label="Centre x" min={CENTRE.min} max={CENTRE.max} step={CENTRE.step} bind={centreX}>
          {centreX.value.toFixed(1)}
        </Control>
        <Control label="Centre y" min={CENTRE.min} max={CENTRE.max} step={CENTRE.step} bind={centreY}>
          {centreY.value.toFixed(1)}
        </Control>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODELS.map((slug, index) => (
          <div key={slug} className="relative">
            <div
              ref={(node) => {
                containers.current[index] = node;
              }}
              className="bg-muted/40 h-64 w-full rounded-lg"
              role="img"
              aria-label={`${models[slug].label} decision boundary on two moons`}
            />
            {hover && rects[index] && (
              <Crosshair
                hover={hover}
                at={at}
                rect={rects[index]!}
                p={hover.probabilities[slug]}
                readout={hover.chart === index}
              />
            )}
          </div>
        ))}
      </div>

      <figcaption className="text-muted-foreground mt-2 text-center text-xs">
        Two moons with each model&rsquo;s decision boundary and the size of the ONNX file it came from. Shading is the
        probability of the second class and the line is where that crosses a half. No two families draw the same shape:
        one straight line, a smooth curve, axis-aligned rectangles, and straight segments meeting at creases.{" "}
        <span className="block pt-1">
          {failure ? (
            <>Your browser could not start the ONNX runtime, so nothing above was drawn. It reported: {failure}</>
          ) : busy ? (
            <>
              Scoring {cells.toLocaleString()} points through each of the four models
              {ready ? "" : ", once the runtime has loaded"}
              &hellip;
            </>
          ) : (
            <>
              {cells.toLocaleString()} points through each of the four in {Math.round(elapsed!)} ms, on the machine you
              are reading this on. Hover a panel and every panel gets the crosshair, each carrying its own model&rsquo;s
              answer at that point, which is four more forward passes. The four models are{" "}
              {sizeLabel(Object.values(models).reduce((n, m) => n + m.bytes, 0))} between them, and{" "}
              <a href={url("train.py")}>the script that made them</a> is at the foot of this note. The WebAssembly build
              of onnxruntime that runs them is 3.4 MB gzipped, fetched once and then cached.
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

/** To the nearest `step`, so a slider's initial position is one it can return to. */
function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

type Bound = { value: number; set: (value: number) => void };

/**
 * A value that follows the control immediately and the work it triggers only once the
 * control has been still for a moment.
 *
 * Returns the live value for the label and the settled one for everything expensive, so
 * the reading under the thumb never lags the thumb while the four models are not asked
 * for a surface per pixel dragged.
 */
function useDebounced(initial: number): [Bound, number] {
  const [value, set] = React.useState(initial);
  const [settled, setSettled] = React.useState(initial);

  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SETTLE);
    return () => clearTimeout(timer);
  }, [value]);

  return [{ value, set }, settled];
}

/** A labelled slider with its current reading, since both controls here are the same shape. */
function Control({
  label,
  min,
  max,
  step,
  bind,
  children,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  bind: Bound;
  /** The reading, which follows the thumb rather than the work the thumb sets off. */
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-muted-foreground w-16 shrink-0 text-xs">{label}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[bind.value]}
        onValueChange={([next]) => next !== undefined && bind.set(next)}
        aria-label={label}
        className="min-w-24 flex-1"
      />
      <span className="text-muted-foreground w-32 shrink-0 text-right text-xs tabular-nums">{children}</span>
    </label>
  );
}

/**
 * The crosshair and its readout, drawn over the canvas rather than into it.
 *
 * ECharts would repaint the whole panel to move a line, which on the largest grid means
 * handing it a 480 px image again on every mouse move. Two absolutely positioned divs cost
 * nothing and take their colour from the same tokens as the page around them.
 *
 * Every panel gets the crosshair and only the hovered one gets the readout, so the cursor
 * still has one obvious home while the other three answer the same question at the same
 * point. The value under each line is that panel's own model, which is the comparison the
 * four charts are for.
 */
function Crosshair({
  hover,
  at,
  rect,
  p,
  readout,
}: {
  hover: Hover;
  at: Extent;
  rect: Rect;
  /** This panel's model, at the hovered point. */
  p: number | undefined;
  /** Whether the cursor is over this panel, rather than one of the other three. */
  readout: boolean;
}) {
  const { px, py } = project(hover.x, hover.y, at, rect);
  // A window can be moved so that the cursor sits outside another panel's data range, and
  // a line ruled through the margin points at nothing.
  if (px < rect.left || px > rect.right || py < rect.top || py > rect.bottom) return null;

  // Flip the readout to the other side of the cursor near the right edge, so it is never
  // clipped by the panel it belongs to.
  const flip = px > (rect.left + rect.right) / 2;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={`absolute w-px ${readout ? "bg-foreground/45" : "bg-foreground/25"}`}
        style={{ left: px, top: rect.top, height: rect.bottom - rect.top }}
      />
      <div
        className={`absolute h-px ${readout ? "bg-foreground/45" : "bg-foreground/25"}`}
        style={{ top: py, left: rect.left, width: rect.right - rect.left }}
      />
      <div
        className="bg-background/90 text-foreground absolute rounded-md border px-1.5 py-1 font-mono text-[0.65rem] leading-tight tabular-nums shadow-sm"
        style={{
          left: flip ? undefined : px + 8,
          right: flip ? rect.right - px + 8 : undefined,
          top: Math.min(py + 8, rect.bottom - (readout ? 34 : 22)),
        }}
      >
        {/* The coordinates are the same on all four, so printing them four times would be
            three copies of one fact. They go on the panel the cursor is actually over. */}
        {readout && (
          <div className="text-muted-foreground">
            {hover.x.toFixed(2)}, {hover.y.toFixed(2)}
          </div>
        )}
        <div>p = {p === undefined ? "\u2026" : p.toFixed(3)}</div>
      </div>
    </div>
  );
}

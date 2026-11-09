/** Browser relief renderer adapted from air-tracking/web/src/lib/terrain.ts.
 * Elevation tint, north-west hillshade and index contours share one image layer.
 */
type ElevationAt = (x: number, y: number) => number;
type View = { x: number; y: number; span: number };

const ramp: [number, [number, number, number]][] = [
  [0, [49, 91, 62]],
  [0.34, [95, 135, 76]],
  [0.64, [147, 139, 84]],
  [0.82, [164, 115, 75]],
  [1, [117, 77, 55]],
];

function tint(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < ramp.length; i++) {
    const [end, b] = ramp[i]!;
    const [start, a] = ramp[i - 1]!;
    if (x <= end) {
      const q = (x - start) / (end - start);
      return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
    }
  }
  return ramp[ramp.length - 1]![1];
}

export function renderTerrainRelief(elevationAt: ElevationAt, view: View, pixels = 224): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const step = view.span / pixels;
  const heights = new Float32Array(pixels * pixels);
  let low = Infinity;
  let high = -Infinity;
  for (let y = 0; y < pixels; y++) {
    for (let x = 0; x < pixels; x++) {
      const z = elevationAt(view.x + (x + 0.5) * step, view.y + (y + 0.5) * step);
      heights[y * pixels + x] = z;
      low = Math.min(low, z);
      high = Math.max(high, z);
    }
  }
  const range = Math.max(1, high - low);
  const interval = range > 600 ? 75 : range > 250 ? 40 : range > 100 ? 20 : 10;
  const at = (x: number, y: number) =>
    heights[Math.max(0, Math.min(pixels - 1, y)) * pixels + Math.max(0, Math.min(pixels - 1, x))]!;
  const image = ctx.createImageData(pixels, pixels);
  for (let y = 0; y < pixels; y++) {
    for (let x = 0; x < pixels; x++) {
      const z = at(x, y);
      const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * step);
      const dy = (at(x, y + 1) - at(x, y - 1)) / (2 * step);
      const norm = Math.hypot(dx, dy, 1);
      const shade = (0.6 * dx - 0.6 * dy + 0.55) / norm;
      const light = Math.max(0.55, Math.min(1.3, 0.86 + (shade - 0.55) * 1.1));
      const [r, g, b] = tint((z - low) / range);
      const level = Math.floor(z / interval);
      const contour = level !== Math.floor(at(x + 1, y) / interval) || level !== Math.floor(at(x, y + 1) / interval);
      const contourLight = contour ? (level % 5 === 0 ? 0.62 : 0.82) : 1;
      const i = (y * pixels + x) * 4;
      image.data[i] = r * light * contourLight;
      image.data[i + 1] = g * light * contourLight;
      image.data[i + 2] = b * light * contourLight;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/**
 * Capture the Projects page previews from the live sites.
 *
 * The four cards on /projects each show a screenshot of the thing they link to,
 * which is what stops the page being four paragraphs in the same register. The
 * screenshots go stale whenever one of those sites changes, so the way they
 * were made is here rather than in somebody's shell history.
 *
 *   node scripts/project-previews.mjs            # every site
 *   node scripts/project-previews.mjs dpc        # just one
 *
 * Playwright is not a dependency of this repo. It is a browser download for a
 * script run a couple of times a year, which is not a thing to put in front of
 * everyone running `npm ci`, and CI never runs this. Install it when you need
 * it:
 *
 *   npm i -D playwright && npx playwright install chromium-headless-shell
 *
 * Dark variants are captured through `prefers-color-scheme`, so a site without
 * a dark mode produces a second copy of its light page. That is not worth
 * shipping: leave `imageDark` off that project in `src/content/projects.ts` and
 * the card falls back to the light one, which is what the site actually looks
 * like. This script therefore refuses to write a dark file that came out the
 * same colour as the light one, and says so.
 */
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "public/projects");

/**
 * Keyed by the `image` basename in `src/content/projects.ts`, so a name here
 * and a name there cannot drift apart without the page showing a broken image.
 */
const SITES = {
  "ai-field-notes": "https://www.nialltwomey.com/ai-field-notes/",
  // The render gallery rather than the landing page, because the figures are what
  // the engine is for and the front door is three boxes of prose. The card still
  // links to the root: this URL is the picture, not the destination.
  "aifn-engine": "https://www.nialltwomey.com/aifn-engine/render",
  dpc: "https://www.nialltwomey.com/dpc/",
  whazzon: "https://www.nialltwomey.com/whazzon/",
  chess: "https://www.nialltwomey.com/chess/",
};

// 16:10 at 2x, which is the aspect the card crops to and is crisp at the 320px
// the image is actually drawn at. Anything larger is bytes nobody sees.
const VIEWPORT = { width: 800, height: 500 };
const SCALE = 2;
// The sites are React apps that finish laying out after `networkidle`, and a
// screenshot taken too early catches a half-drawn grid.
const SETTLE = 1800;

/** JPEG rather than PNG: these are screenshots of photographs and gradients. */
function toJpeg(png, jpg) {
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", jpg], { stdio: "ignore" });
  rmSync(png);
}

/**
 * How light the page is, 0 to 255, for telling a real dark mode from a copy.
 *
 * Asked of the live page rather than measured off the saved screenshot. An
 * image read back from `file://` taints a canvas, so `getImageData` throws, and
 * throwing inside an `onload` handler leaves the promise around it unsettled:
 * the first version of this hung forever on the first site it checked instead
 * of failing. Painting a colour the page already resolved involves no foreign
 * pixels and cannot taint anything, and it lets the browser parse whatever
 * colour syntax the site happens to use.
 */
const pageLuma = (page) =>
  page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  });

const wanted = process.argv.slice(2);
const targets = Object.entries(SITES).filter(([name]) => wanted.length === 0 || wanted.includes(name));
if (targets.length === 0) {
  console.error(`no such project. known: ${Object.keys(SITES).join(", ")}`);
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("playwright is not installed. See the header of this file.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [name, url] of targets) {
  let darkIsReal = false;

  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: scheme });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(SETTLE);

    // Read it before the page closes. Anything above mid-grey is a light page,
    // whatever scheme it was asked for.
    if (scheme === "dark") darkIsReal = (await pageLuma(page)) < 128;

    const stem = scheme === "dark" ? `${name}-dark` : name;
    const png = resolve(OUT, `${stem}.png`);
    await page.screenshot({ path: png });
    await page.close();
    toJpeg(png, resolve(OUT, `${stem}.jpg`));
  }

  if (darkIsReal) {
    console.log(`${name.padEnd(16)} light and dark`);
  } else {
    rmSync(resolve(OUT, `${name}-dark.jpg`), { force: true });
    console.log(`${name.padEnd(16)} light only (no dark mode; leave \`imageDark\` off this one)`);
  }
}

await browser.close();

if (!existsSync(resolve(OUT, "dpc-dark.jpg"))) {
  console.log("\nNote: dpc has no dark preview, so its card shows the light one in both themes.");
}

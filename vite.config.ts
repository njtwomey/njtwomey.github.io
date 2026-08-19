import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
// @ts-expect-error — plain .mjs build scripts, deliberately untyped.
import { buildNotesIndex, NOTES_DIR } from "./scripts/notes-index.mjs";
// @ts-expect-error — as above.
import remarkCodeFile from "./scripts/remark-code-file.mjs";
// @ts-expect-error — as above.
import bibtex from "./scripts/vite-plugin-bibtex.mjs";

/**
 * Syntax highlighting, done by Shiki at build time.
 *
 * Highlighting in the browser would mean shipping a grammar bundle and a flash
 * of unstyled code on every note. Shiki runs during the MDX transform instead,
 * so what reaches the reader is plain spans with colours already on them and no
 * JavaScript involved.
 *
 * Both themes are resolved in the same pass. Shiki writes each token's two
 * colours as `--shiki-light` and `--shiki-dark` custom properties, and
 * `src/index.css` picks between them — so switching theme recolours code
 * without re-highlighting anything.
 *
 * `keepBackground: false` because the site already gives `pre` a background
 * from its own tokens; taking Shiki's would put a GitHub-coloured slab in the
 * middle of a neutral page.
 */
const prettyCode: PrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark-dimmed" },
  keepBackground: false,
  defaultLang: { block: "text", inline: "text" },
  // A blank line inside a fence otherwise collapses and the block loses its
  // paragraphing.
  bypassInlineCode: true,
};

/**
 * Static hosts serve a file per path. This app routes client-side, so a direct
 * hit on /publications asks for a file that does not exist and gets a 404 — the
 * index is only served at /.
 *
 * GitHub Pages falls back to 404.html for unknown paths, so making it a copy of
 * index.html hands those URLs to the router instead. Without it, every link into
 * the site except the root is broken — which is invisible in dev, because vite's
 * own server already falls back.
 */
function spaFallback(): Plugin {
  let outDir = "dist";
  return {
    name: "site:spa-fallback",
    apply: "build",
    // `enforce: "post"` so this runs after vite's own html plugin has emitted
    // index.html; writeBundle rather than closeBundle because under vite's
    // environment API the files are not on disk when closeBundle fires.
    enforce: "post",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const index = resolve(outDir, "index.html");
      if (!existsSync(index)) {
        this.warn("no index.html was written — skipping the 404 fallback");
        return;
      }
      copyFileSync(index, resolve(outDir, "404.html"));
      this.info?.("wrote 404.html for client-side routing");
    },
  };
}

/**
 * Keep src/content/posts.json in step with content/posts/*.mdx while the dev
 * server is running, so adding or retitling a post shows up without a restart.
 * The same index is written by `npm run content` before a build.
 */
function notesIndex(): Plugin {
  const regenerate = (log: (message: string) => void) => {
    try {
      buildNotesIndex();
    } catch (error) {
      log(error instanceof Error ? error.message : String(error));
    }
  };

  return {
    name: "site:notes-index",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(NOTES_DIR);
      const onChange = (file: string) => {
        if (file.startsWith(NOTES_DIR) && file.endsWith(".mdx")) {
          regenerate((message) => server.config.logger.error(message));
        }
      };
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
      server.watcher.on("change", onChange);
    },
  };
}

export default defineConfig({
  // A user site served from a custom domain lives at the root. VITE_BASE is the
  // escape hatch for previewing under a subpath.
  base: process.env.VITE_BASE ?? "/",
  plugins: [
    // Before the MDX transform, so a note's `import "./references.bib"` is a
    // real module by the time MDX resolves it.
    bibtex(),
    // MDX must run before the react plugin so the JSX it emits gets transformed.
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [
          // Before anything else, so an inlined file is highlighted like any
          // other fence rather than needing a path of its own.
          remarkCodeFile,
          remarkGfm,
          remarkMath,
          remarkFrontmatter,
          // Frontmatter becomes an exported `meta` binding, so a post's
          // metadata and its prose stay in one file.
          [remarkMdxFrontmatter, { name: "meta" }],
        ],
        rehypePlugins: [rehypeKatex, [rehypePrettyCode, prettyCode]],
        providerImportSource: "@mdx-js/react",
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    notesIndex(),
    spaFallback(),
  ],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
  build: {
    // The PDF archive is large and already in public/; keep the JS budget honest.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Every note is `<slug>/index.mdx`, so rollup names all of their chunks
        // `index-<hash>.js` and the build output stops telling you anything.
        // Name them after the directory instead.
        chunkFileNames(chunk) {
          const note = chunk.facadeModuleId?.match(/content\/notes\/([^/]+)\/index\.mdx$/);
          return note ? `assets/note-${note[1]}-[hash].js` : "assets/[name]-[hash].js";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});

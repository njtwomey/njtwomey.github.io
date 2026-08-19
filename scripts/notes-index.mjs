/**
 * Compile content/notes/ into src/content/notes.json, and copy each note's
 * co-located assets into public/notes/<slug>/.
 *
 * A note is a directory: `index.mdx` plus whatever images, notebooks and
 * archives belong to it. Everything about one note lives in one place, and a
 * note is referenced by its own filenames — `<Figure src="moons.gif" />` — with
 * no repeated path prefix to get wrong.
 *
 * Two things have to happen for that to work:
 *
 * 1. The frontmatter index has to be separate from the notes themselves. A
 *    note's prose is only wanted when someone opens it, but the notes list
 *    needs every title and date up front — and importing frontmatter from the
 *    MDX module drags the compiled prose into the same chunk, because a module
 *    that is both statically and dynamically imported gets inlined into its
 *    static importer.
 *
 * 2. Vite only serves `public/`, so the assets are copied there. That makes
 *    `public/notes/` generated output, and it is gitignored accordingly.
 */
import { parse } from "yaml";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const NOTES_DIR = resolve(root, "content/notes");
const OUT = resolve(root, "src/content/notes.json");
const ASSETS_OUT = resolve(root, "public/notes");

const REQUIRED = ["title", "description", "date"];

export function buildNotesIndex({ write = true } = {}) {
  const problems = [];

  const slugs = readdirSync(NOTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const notes = slugs
    .map((slug) => {
      const dir = resolve(NOTES_DIR, slug);

      // A note is `index.mdx` for prose, or `index.tsx` where the note is
      // mostly a thing rather than mostly words and is easier written as a
      // component. A TSX note cannot carry YAML frontmatter, so it puts the
      // same fields in `meta.yaml` beside it; everything downstream is
      // identical either way.
      const mdx = resolve(dir, "index.mdx");
      const tsx = resolve(dir, "index.tsx");
      const sidecar = resolve(dir, "meta.yaml");

      let frontmatter;
      if (existsSync(mdx)) {
        const source = readFileSync(mdx, "utf8");
        const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) {
          problems.push(`${slug}: no frontmatter block`);
          return null;
        }
        frontmatter = match[1];
      } else if (existsSync(tsx)) {
        if (!existsSync(sidecar)) {
          problems.push(`${slug}: index.tsx needs a meta.yaml beside it, since TSX carries no frontmatter`);
          return null;
        }
        frontmatter = readFileSync(sidecar, "utf8");
      } else {
        problems.push(`${slug}/: no index.mdx or index.tsx — a note is a directory containing one of them`);
        return null;
      }

      const match = [null, frontmatter];

      let meta;
      try {
        meta = parse(match[1]) ?? {};
      } catch (error) {
        problems.push(`${slug}: frontmatter is not valid YAML — ${error.message}`);
        return null;
      }

      for (const field of REQUIRED) {
        if (!meta[field]) problems.push(`${slug}: missing \`${field}\` in frontmatter`);
      }
      if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) {
        // An unquoted YAML date parses to a Date and serialises with a time
        // zone, which then shifts the displayed day.
        problems.push(`${slug}: date must be a quoted "YYYY-MM-DD" string`);
      }
      // A hero naming a file that is not there is a broken image at the top of
      // the note, which is the most visible thing on the page.
      if (meta.hero && !existsSync(resolve(dir, meta.hero))) {
        problems.push(`${slug}: hero "${meta.hero}" is not in content/notes/${slug}/`);
      }

      return {
        slug,
        title: meta.title ?? slug,
        description: meta.description ?? "",
        date: String(meta.date ?? ""),
        tags: meta.tags ?? [],
        // Stored as a site-absolute path so nothing downstream has to know
        // where a note's assets are published.
        hero: meta.hero ? `/notes/${slug}/${meta.hero}` : undefined,
        heroAlt: meta.heroAlt ?? "",
        published: meta.published === true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (problems.length > 0) {
    const error = new Error(`notes have ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
    error.problems = problems;
    throw error;
  }

  if (write) {
    writeFileSync(OUT, `${JSON.stringify(notes, null, 2)}\n`);

    // Staged in a sibling directory and swapped in by one rename.
    //
    // Rebuilding in place meant deleting the whole tree and copying back into
    // it, which fails intermittently while a dev or preview server is serving
    // out of that same tree: the copy chmods a path the server has an open
    // handle on and the build dies on ENOENT. Two builds were lost to it before
    // the cause was clear, both of them with a preview running.
    //
    // Building a complete tree first and renaming it over the old one removes
    // the window entirely. A rename is atomic, so a request is served either the
    // previous assets or the new ones, never a half-copied directory.
    const staging = `${ASSETS_OUT}.staging`;
    rmSync(staging, { recursive: true, force: true });
    for (const slug of slugs) {
      const dir = resolve(NOTES_DIR, slug);
      const INPUTS = /^(index\.(mdx|tsx)|meta\.yaml|.*\.bib)$/;
      if (readdirSync(dir).every((name) => INPUTS.test(name))) continue;
      // One recursive copy of the whole note directory, filtered, rather than a
      // call per file: the per-file form races with its own mkdir on macOS.
      cpSync(dir, resolve(staging, slug), {
        recursive: true,
        // Everything beside a note is an asset to be served, except the prose
        // itself and any TypeScript. A figure component living next to the note
        // it belongs to is a build input, and copying it would publish the
        // source verbatim under public/. It is also outside `tsconfig.json`,
        // whose include list is `src`, so it would escape `make check` as well.
        // Everything beside a note is an asset to be served, except its build
        // inputs: the prose itself, any TypeScript, the frontmatter sidecar and
        // the note's own bibliography. Copying those would publish the source
        // verbatim under public/. They are compiled, not served: `content` is in
        // tsconfig's include list, so a component beside a note is typechecked
        // by `make check` exactly like one under src.
        filter: (source) => !/\/index\.(mdx|tsx)$|\.tsx?$|\/meta\.yaml$|\.bib$/.test(source),
      });
    }
    mkdirSync(staging, { recursive: true });
    rmSync(ASSETS_OUT, { recursive: true, force: true });
    renameSync(staging, ASSETS_OUT);
  }

  return notes;
}

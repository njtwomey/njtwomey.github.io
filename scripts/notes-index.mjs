/**
 * Compile content/notes/ into src/content/notes.json, and copy each note's
 * co-located assets into public/notes/<slug>/.
 *
 * A note is a directory: `index.mdx` plus whatever images, notebooks and
 * archives belong to it. Everything about one note lives in one place, and a
 * note is referenced by its own filenames — `<Figure src="moons.gif" />` — with
 * no repeated path prefix to get wrong.
 *
 * The directory is named `YYYY-MM-<slug>` and the slug is that with the date
 * dropped. Two different jobs: the prefix makes `ls content/notes` chronological,
 * which is how anybody looking for a note actually looks for it, and the slug is
 * the published URL, which is a promise to everyone who has linked to one. Deriving
 * the second from the first rather than storing it means a note cannot be filed
 * under one date and served under another, and renaming the directory to correct a
 * date does not move the page.
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
// Counts alone, so anything needing only "are there notes" can have that
// without importing the index. The site header is on every page, so importing
// the index there put every title and description in the main bundle, growing
// with each note written, to decide whether to show one nav item.
const SUMMARY_OUT = resolve(root, "src/content/notes-summary.json");
const ASSETS_OUT = resolve(root, "public/notes");

const REQUIRED = ["title", "description", "date"];

/** `2026-08-` at the front of a note directory: the filing date, not part of the URL. */
const DATED = /^(\d{4})-(\d{2})-(?=.)/;

export function buildNotesIndex({ write = true } = {}) {
  const problems = [];

  const directories = readdirSync(NOTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const notes = directories
    .map((name) => {
      const dir = resolve(NOTES_DIR, name);
      const slug = name.replace(DATED, "");

      if (!DATED.test(name)) {
        problems.push(`${name}/: directories are named YYYY-MM-<slug>, so this one sorts wrong`);
      }

      const mdx = resolve(dir, "index.mdx");
      if (!existsSync(mdx)) {
        problems.push(`${name}/: no index.mdx — a note is a directory containing one`);
        return null;
      }

      const block = readFileSync(mdx, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!block) {
        problems.push(`${slug}: no frontmatter block`);
        return null;
      }

      let meta;
      try {
        meta = parse(block[1]) ?? {};
      } catch (error) {
        problems.push(`${slug}: frontmatter is not valid YAML — ${error.message}`);
        return null;
      }

      for (const field of REQUIRED) {
        if (!meta[field]) problems.push(`${name}: missing \`${field}\` in frontmatter`);
      }
      if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) {
        // An unquoted YAML date parses to a Date and serialises with a time
        // zone, which then shifts the displayed day.
        problems.push(`${name}: date must be a quoted "YYYY-MM-DD" string`);
      }
      // The prefix is filing and the frontmatter date is what the page says, so
      // they have to be the same fact. Left unchecked the two drift the first
      // time a date is corrected in one of them.
      if (meta.date && !String(meta.date).startsWith(name.slice(0, 7))) {
        problems.push(
          `${name}: is dated "${meta.date}", so the directory should start "${String(meta.date).slice(0, 7)}"`,
        );
      }
      // A hero naming a file that is not there is a broken image at the top of
      // the note, which is the most visible thing on the page.
      if (meta.hero && !existsSync(resolve(dir, meta.hero))) {
        problems.push(`${name}: hero "${meta.hero}" is not in content/notes/${name}/`);
      }

      return {
        slug,
        // Where the prose is, which is not where it is served from. Everything
        // that loads a note's module needs this and nothing else does.
        dir: name,
        title: meta.title ?? slug,
        description: meta.description ?? "",
        date: String(meta.date ?? ""),
        tags: meta.tags ?? [],
        // Stored as a site-absolute path so nothing downstream has to know
        // where a note's assets are published.
        hero: meta.hero ? `/notes/${slug}/${meta.hero}` : undefined,
        heroAlt: meta.heroAlt ?? "",
        // The index thumbnail and the banner on the note itself are the same
        // file doing two jobs, and a picture that works as a 96px square does
        // not always work five times as wide. Opting out of the second keeps
        // the first, which is the one a note cannot do without.
        heroOnPage: meta.heroOnPage !== false,
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
    const summary = { total: notes.length, published: notes.filter((note) => note.published).length };
    writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);

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
    for (const note of notes) {
      const dir = resolve(NOTES_DIR, note.dir);
      const INPUTS = /^(index\.mdx|README\.md|.*\.(tsx?|bib))$/;
      if (readdirSync(dir).every((name) => INPUTS.test(name))) continue;
      // Published under the slug rather than the directory name, because the
      // date prefix files the note and does not appear in any URL.
      //
      // One recursive copy of the whole note directory, filtered, rather than a
      // call per file: the per-file form races with its own mkdir on macOS.
      cpSync(dir, resolve(staging, note.slug), {
        recursive: true,
        // Everything beside a note is an asset to be served, except its build
        // inputs: the prose itself, any TypeScript, the note's own bibliography,
        // and the README saying how its assets were generated. Copying those
        // would publish the source verbatim under public/. They are compiled or
        // read in the repo rather than served, and `content` is in tsconfig's
        // include list, so a component beside a note is typechecked by
        // `make check` exactly like one under src.
        filter: (source) => !/\/index\.mdx$|\/README\.md$|\.tsx?$|\.bib$/.test(source),
      });
    }
    mkdirSync(staging, { recursive: true });
    rmSync(ASSETS_OUT, { recursive: true, force: true });
    renameSync(staging, ASSETS_OUT);
  }

  return notes;
}

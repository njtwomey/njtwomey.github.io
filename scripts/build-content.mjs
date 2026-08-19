/**
 * Compile everything under content/ into the JSON the app imports.
 *
 * Run by `npm run content`, and by prebuild/predev so a build can never use a
 * stale index. `--check` validates without writing, which is what CI runs.
 *
 * Both compilers live here rather than in separate npm scripts. They were
 * separate, which meant `npm run content` built the notes and left the
 * publications stale, while the Makefile target of the same name built both.
 */
import { buildNotesIndex } from "./notes-index.mjs";
import { buildPublications } from "./build-publications.mjs";

const check = process.argv.includes("--check");

try {
  const publications = buildPublications({ write: !check });
  const notes = buildNotesIndex({ write: !check });
  const published = notes.filter((note) => note.published).length;
  console.log(`${publications.length} publications`);
  console.log(`${notes.length} notes (${published} published, ${notes.length - published} unpublished)`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

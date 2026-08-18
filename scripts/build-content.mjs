/**
 * Compile everything under content/ into the JSON the app imports.
 * Run by `npm run content`, and by prebuild/predev so a build can never use a
 * stale index. `--check` validates without writing, which is what CI runs.
 */
import { buildNotesIndex } from "./notes-index.mjs";

const check = process.argv.includes("--check");

try {
  const notes = buildNotesIndex({ write: !check });
  const published = notes.filter((note) => note.published).length;
  console.log(`${notes.length} notes (${published} published, ${notes.length - published} unpublished)`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

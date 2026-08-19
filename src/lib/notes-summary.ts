import summary from "@/content/notes-summary.json";

/**
 * Whether this build has any notes to link to.
 *
 * Separate from `@/lib/notes` on purpose. That module imports the whole index,
 * which is right for anything rendering notes and wrong for the site header:
 * the header is on every page, so importing the index there put every title and
 * description into the main bundle, for every reader, to decide whether to show
 * one nav item. The index grows with every note written and the answer here
 * never does.
 *
 * The dev/production split matches `notes` in `@/lib/notes`, and is repeated
 * rather than shared because sharing it would mean importing the thing this
 * module exists to avoid importing.
 */
export const hasNotes: boolean = (import.meta.env.DEV ? summary.total : summary.published) > 0;

/**
 * Things that are written and kept in the repo but not on the live site yet.
 *
 * A flag rather than a deleted file or a commented-out route, so the work stays
 * compiled, typechecked and readable on the dev server instead of rotting in
 * git history. This is the same bargain `published: false` strikes for a note.
 */

/**
 * The per-capability write-ups behind the domains matrix.
 *
 * The prose exists and is current; there is simply more of it than the page
 * wants right now, so `/domains` ships the matrix alone and the detail page is
 * reachable only in development. Flipping this to `true` publishes the detail
 * route and turns every matrix row into a link to it, which is the whole of what
 * turning it on involves.
 */
export const DOMAINS_DETAIL = import.meta.env.DEV;

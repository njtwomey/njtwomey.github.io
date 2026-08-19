/**
 * The registry other people's papers land in, and the helpers that render them.
 *
 * There is no bibliography in this file. A note that cites external work keeps
 * its own `references.bib` in its own directory and imports it:
 *
 * ```mdx
 * import "./references.bib";
 *
 * As <Ref id="meng2024ranked" /> showed, …
 * ```
 *
 * `scripts/vite-plugin-bibtex.mjs` turns that import into a call to
 * `registerReferences` below, so the entries are in place before anything in
 * the note's chunk renders, and they are bundled into that chunk rather than
 * shipped to every reader of the site.
 *
 * The point is that writing a note touches only the note's own directory. This
 * file used to hold the entries themselves, so citing a paper meant editing
 * `src/`, and the blast radius of writing a note was the whole codebase.
 *
 * `content/publications.bib` remains the source for Niall's own work, which
 * `<Paper>` and `<Cite>` read. That one is site-wide because the publications
 * page lists all of it.
 */

export type Reference = {
  /** The BibTeX entry type, so a generated record is honest about what it is. */
  type: string;
  /** Every author, "Last, First", in order, as BibTeX wants them. */
  authors: string[];
  year: number;
  title: string;
  /** The full booktitle or journal, for the BibTeX record. */
  venue: string;
  /** An acronym and year for the card, where the full venue is a paragraph. */
  venueShort: string;
  url: string;
};

const registry = new Map<string, Reference>();

/**
 * Called by the generated module behind a `.bib` import. A later registration
 * of the same key wins, which only happens when two notes cite one paper, and
 * their entries should agree anyway.
 */
export function registerReferences(entries: Record<string, Reference>) {
  for (const [key, entry] of Object.entries(entries)) registry.set(key, entry);
}

export function reference(key: string): Reference | undefined {
  return registry.get(key);
}

/**
 * "Meng et al." from the full list, which is what a citation shows inline.
 * Two authors are both named because "and" is shorter than "et al." is vague;
 * three or more collapse.
 */
export function citeAuthors(ref: Reference): string {
  const surnames = ref.authors.map((author) => author.split(",")[0]!.trim());
  if (surnames.length === 0) return "Anon.";
  if (surnames.length === 1) return surnames[0]!;
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`;
  return `${surnames[0]} et al.`;
}

/**
 * "Maarten de Rijke" from "Rijke, Maarten de", for the card, where the whole
 * list is shown and BibTeX's surname-first order reads as a database dump.
 */
export function displayAuthors(ref: Reference): string {
  return ref.authors
    .map((author) => {
      const [last, first] = author.split(",").map((part) => part.trim());
      return first ? `${first} ${last}` : last!;
    })
    .join(", ");
}

/**
 * A BibTeX record generated from the fields rather than stored beside them.
 *
 * Storing the raw entry as well would be the same facts written twice, and the
 * copy somebody pastes into a paper would be the one nobody was maintaining.
 */
export function bibtex(key: string, ref: Reference): string {
  const field = ref.type === "article" ? "journal" : "booktitle";
  const rows: [string, string][] = [
    ["title", ref.title],
    ["author", ref.authors.join(" and ")],
    [field, ref.venue],
    ["year", String(ref.year)],
    ["url", ref.url],
  ];
  // A field the note's .bib did not supply is left out rather than emitted empty.
  const present = rows.filter(([, value]) => value);
  const width = Math.max(...present.map(([name]) => name.length));
  const lines = present.map(([name, value]) => `  ${name.padEnd(width)} = {${value}},`);
  return `@${ref.type}{${key},\n${lines.join("\n")}\n}`;
}

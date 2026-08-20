import type { ComponentType } from "react";
import index from "@/content/notes.json";

/** The frontmatter every note in `content/notes/` must carry. */
export type NoteMeta = {
  title: string;
  /** One or two sentences. Used on the index and as the page description. */
  description: string;
  /** ISO date, quoted in the frontmatter so it stays a string. */
  date: string;
  tags?: string[];
  /**
   * Site-absolute path to the note's header image, derived by the build step
   * from a bare filename in the frontmatter (`hero: moons.gif`).
   */
  hero?: string;
  heroAlt?: string;
  /**
   * Whether the hero also runs full width at the top of the note. Defaults to
   * true; set `heroOnPage: false` where the image earns its place as a thumbnail
   * but not as a banner, such as a grid of small panels that goes unreadable
   * when it is cropped to a letterbox.
   */
  heroOnPage?: boolean;
  /**
   * Notes are written and kept whether or not they go up. Only `true` reaches
   * the built site — an old note that has gone stale is set back to false
   * rather than deleted, so the writing survives without being published.
   */
  published?: boolean;
};

export type Note = NoteMeta & {
  /** The published path segment: the directory name with its date prefix dropped. */
  slug: string;
  /** The directory the prose lives in, `YYYY-MM-<slug>`, which is not the URL. */
  dir: string;
  /** Fetches the note's own chunk. */
  load: () => Promise<{ default: ComponentType }>;
};

/**
 * Frontmatter comes from the generated index; the prose is fetched on demand.
 * See scripts/notes-index.mjs for why the two are separate.
 */
const modules = import.meta.glob<{ default: ComponentType }>("../../content/notes/*/index.mdx");

/** Every note in the repo, newest first, published or not. */
export const allNotes: Note[] = (index as (NoteMeta & { slug: string; dir: string })[])
  .map((meta) => ({
    ...meta,
    load: modules[`../../content/notes/${meta.dir}/index.mdx`],
  }))
  // An index entry with no MDX file behind it means the index is stale. Drop it
  // rather than throwing: one bad entry should not take the whole site down.
  .filter((note): note is Note => Boolean(note.load));

/**
 * What the site shows.
 *
 * In dev that is everything, so a draft can be written and read without being
 * published first — the notes index marks the unpublished ones. A production
 * build only ever carries `published: true`, which is what keeps a stale note
 * off the live site.
 */
export const notes: Note[] = import.meta.env.DEV ? allNotes : allNotes.filter((note) => note.published);

/** True when a note is only visible because this is the dev server. */
export function isDraft(note: Note): boolean {
  return !note.published;
}

export function note(slug: string): Note | undefined {
  return notes.find((item) => item.slug === slug);
}

export const tags: string[] = [...new Set(notes.flatMap((note) => note.tags ?? []))].sort();

/**
 * Group into year buckets, newest first, so the index reads as an archive
 * rather than one undifferentiated list. Same treatment as the publications
 * page, and for the same reason.
 */
export function groupByYear(items: Note[]): [number, Note[]][] {
  const groups = new Map<number, Note[]>();
  for (const item of items) {
    const year = Number(item.date.slice(0, 4));
    const bucket = groups.get(year);
    if (bucket) bucket.push(item);
    else groups.set(year, [item]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Titles are authored in sentence case and displayed in title case.
 *
 * Sentence case is what the writing skill asks an author for, because a title
 * being drafted is a sentence and capitalising it as you type gets in the way.
 * Title case is what a heading should look like on the page. Doing the
 * conversion here means one representation in the source and the other on
 * screen, rather than every author remembering the house style.
 *
 * Two things it has to get right, and an earlier version got neither. Minor
 * words stay lowercase: "What a Better Retriever Does to Re-Ranking", not "What
 * A Better Retriever Does To Re-Ranking", which is the tell of a naive
 * capitalise-every-word. And a word the source already capitalised is left
 * alone, which is what protects SAM2, mIoU, arXiv and BERT without a list of
 * them.
 *
 * The first and last word are always capitalised however minor, as is the word
 * after a colon, which are the standard exceptions.
 */
const MINOR = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "as",
  "at",
  "by",
  "in",
  "of",
  "off",
  "on",
  "per",
  "to",
  "up",
  "via",
  "from",
  "into",
  "like",
  "near",
  "onto",
  "over",
  "than",
  "vs",
  "versus",
  "upon",
  "with",
]);

export function titleCase(title: string): string {
  const words = title.split(/(\s+)/);
  const lastIndex = words.length - 1;

  let startsClause = true;
  return words
    .map((word, index) => {
      if (/^\s+$/.test(word)) return word;

      const isEdge = index === 0 || index === lastIndex;
      const opensClause = startsClause;
      startsClause = /[:.?!]$/.test(word);

      // Any existing capital means the source cased this word deliberately:
      // SAM2, mIoU, arXiv, a paper's own title.
      if (/[A-Z]/.test(word)) return word;

      const bare = word.replace(/[^a-z-]/g, "");
      if (!isEdge && !opensClause && MINOR.has(bare)) return word;

      return word.replace(/(^|-)([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
    })
    .join("");
}

/**
 * Every note as a rail row, newest first, grouped by year.
 *
 * The same list serves the index and each individual note, which is the point:
 * a reader who has opened one note can move to the next without going back, and
 * the rail is the only thing on the page that knows what else exists. Rows carry
 * a route rather than an anchor, so the index rail navigates into a note rather
 * than scrolling to its card. Titles are shown whole, prefix included, so a row
 * reads the same as the heading it leads to.
 */
export function noteRailItems(): { id: string; label: string; group: string; to: string }[] {
  return groupByYear(notes).flatMap(([year, items]) =>
    items.map((note) => ({
      id: note.slug,
      label: titleCase(note.title),
      group: String(year),
      to: `/notes/${note.slug}`,
    })),
  );
}

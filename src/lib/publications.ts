import data from "@/content/publications.json";

/**
 * The shape `scripts/build-publications.mjs` emits. The JSON is generated, so
 * this type is the contract between the build step and the app — if the script
 * changes what it writes, the typecheck is what notices.
 */
export type Author = {
  first: string;
  last: string;
  /** True for the site's owner, who is emphasised in an author list. */
  isMe: boolean;
};

export type PublicationKind = "journal" | "conference" | "workshop" | "preprint" | "thesis" | "other";

export type Publication = {
  key: string;
  type: string;
  kind: PublicationKind;
  title: string;
  authors: Author[];
  /** The bibliography said "and others" — print "et al." after the list. */
  etAl: boolean;
  year: number;
  venue: string;
  /** An acronym where the venue has one, for places that list several at once. */
  venueShort: string;
  /** Whether a `details` fetch will yield an abstract for this entry. */
  hasAbstract: boolean;
  /**
   * A short plain-English take on the paper, from
   * the `notes={...}` field of its `publications.bib` entry. Null where none has been written —
   * the card then falls back to the abstract.
   */
  summary: string | null;
  pdf?: string;
  doi?: string;
  url?: string;
  arxiv?: string;
  code?: string;
  slides?: string;
};

/** The heavy half, fetched on demand. See scripts/build-publications.mjs. */
export type PublicationDetails = { abstract?: string; bibtex: string };

export const publications = data as Publication[];

/** Reader-facing labels. `other` has none — nothing should be classified into it. */
export const KIND_LABEL: Record<PublicationKind, string> = {
  journal: "Journal",
  conference: "Conference",
  workshop: "Workshop",
  preprint: "Preprint",
  thesis: "Thesis",
  other: "Other",
};

export const years = [...new Set(publications.map((p) => p.year))].sort((a, b) => b - a);

/**
 * The kinds worth offering as a filter, which is not the same as the kinds that
 * exist. A control that narrows sixty-one entries to one is a link to that entry
 * wearing a filter's clothes, and it costs a slot in a segmented control that a
 * reader scans as a set of real choices. Thesis is the case in point, at one
 * entry. The threshold is data-driven rather than a hardcoded exclusion, so a
 * second thesis would put the filter back without anyone remembering to.
 *
 * `KIND_LABEL` still carries every kind, because a card still has to print the
 * badge for a paper the filter no longer offers.
 */
export const kinds = (Object.keys(KIND_LABEL) as PublicationKind[]).filter(
  (kind) => publications.filter((p) => p.kind === kind).length > 1,
);

const byKey = new Map(publications.map((p) => [p.key, p]));

/** Look up one paper by citation key — how MDX notes and projects refer to them. */
export function publication(key: string): Publication | undefined {
  return byKey.get(key);
}

let detailsCache: Record<string, PublicationDetails> | undefined;
let inFlight: Promise<Record<string, PublicationDetails>> | undefined;

/**
 * Fetch abstracts and BibTeX records once per session.
 *
 * Routes that render full paper cards await this as part of their own lazy
 * import, so the data is in hand before the first render and `details()` can
 * stay synchronous — no per-card loading states for something that arrives in
 * one request.
 */
export function loadDetails(): Promise<Record<string, PublicationDetails>> {
  if (detailsCache) return Promise.resolve(detailsCache);
  inFlight ??= fetch(`${import.meta.env.BASE_URL}publications-details.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`publications-details.json: ${response.status}`);
      return response.json() as Promise<Record<string, PublicationDetails>>;
    })
    .then((data) => {
      detailsCache = data;
      return data;
    })
    .catch((error) => {
      // A failed fetch costs abstracts and BibTeX buttons, not the page.
      console.error(error);
      detailsCache = {};
      return detailsCache;
    });
  return inFlight;
}

/** Details for one paper, if `loadDetails` has resolved. */
export function details(key: string): PublicationDetails | undefined {
  return detailsCache?.[key];
}

/**
 * "N. Twomey" rather than "Niall Twomey": an author list is scanned, not read,
 * and initials keep a six-author paper on two lines instead of four.
 */
export function initialise(author: Author): string {
  const initials = author.first
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join(" ");
  return initials ? `${initials} ${author.last}` : author.last;
}

/**
 * Publications matching a free-text query, over title, authors and venue.
 * Every term must match somewhere, so "twomey ode" narrows rather than widens.
 */
export function search(items: Publication[], query: string): Publication[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((p) => {
    const haystack = [p.title, p.venue, String(p.year), ...p.authors.map((a) => `${a.first} ${a.last}`)]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Group into year buckets, newest first, for a sectioned list. */
export function groupByYear(items: Publication[]): [number, Publication[]][] {
  const groups = new Map<number, Publication[]>();
  for (const item of items) {
    const bucket = groups.get(item.year);
    if (bucket) bucket.push(item);
    else groups.set(item.year, [item]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

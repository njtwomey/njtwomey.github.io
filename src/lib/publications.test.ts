import { describe, expect, it } from "vitest";
import {
  groupByYear,
  initialise,
  KIND_LABEL,
  kinds,
  publications,
  search,
  type Author,
  type Publication,
} from "@/lib/publications";

const author = (first: string, last: string, isMe = false): Author => ({ first, last, isMe });

const paper = (overrides: Partial<Publication> = {}): Publication => ({
  key: "k",
  type: "article",
  kind: "journal",
  title: "A title",
  authors: [author("Niall", "Twomey", true)],
  etAl: false,
  year: 2020,
  venue: "A venue",
  venueShort: "AV",
  hasAbstract: false,
  summary: null,
  ...overrides,
});

describe("initialise", () => {
  it("reduces a first name to an initial", () => {
    expect(initialise(author("Niall", "Twomey"))).toBe("N. Twomey");
  });

  it("keeps every initial of a multi-part first name", () => {
    expect(initialise(author("Luis M", "Vaquero"))).toBe("L. M. Vaquero");
    expect(initialise(author("Jean-Paul", "Sartre"))).toBe("J. P. Sartre");
  });

  it("falls back to the surname when there is no first name", () => {
    expect(initialise(author("", "Twomey"))).toBe("Twomey");
  });
});

describe("search", () => {
  const items = [
    paper({ key: "a", title: "Neural ODEs", venue: "ECAI", year: 2020 }),
    paper({ key: "b", title: "Ordinal regression", venue: "arXiv", year: 2019 }),
    paper({ key: "c", title: "Recipe ranking", authors: [author("Kentaro", "Takiguchi")], year: 2021 }),
  ];

  it("returns everything for an empty query", () => {
    expect(search(items, "")).toHaveLength(3);
    expect(search(items, "   ")).toHaveLength(3);
  });

  it("matches on title, venue, year and author", () => {
    expect(search(items, "neural").map((p) => p.key)).toEqual(["a"]);
    expect(search(items, "arxiv").map((p) => p.key)).toEqual(["b"]);
    expect(search(items, "2021").map((p) => p.key)).toEqual(["c"]);
    expect(search(items, "takiguchi").map((p) => p.key)).toEqual(["c"]);
  });

  it("requires every term to match, so more words narrow the result", () => {
    expect(search(items, "neural ecai").map((p) => p.key)).toEqual(["a"]);
    expect(search(items, "neural arxiv")).toEqual([]);
  });

  it("ignores case", () => {
    expect(search(items, "NEURAL")).toHaveLength(1);
  });
});

describe("groupByYear", () => {
  it("buckets by year, newest first, preserving order within a year", () => {
    const grouped = groupByYear([
      paper({ key: "a", year: 2019 }),
      paper({ key: "b", year: 2021 }),
      paper({ key: "c", year: 2019 }),
    ]);

    expect(grouped.map(([year]) => year)).toEqual([2021, 2019]);
    expect(grouped[1]?.[1].map((p) => p.key)).toEqual(["a", "c"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupByYear([])).toEqual([]);
  });
});

/**
 * These run against the real generated bibliography rather than fixtures — the
 * point is to catch a bad record in content/publications.bib, which is the file
 * that actually changes.
 */
describe("the generated bibliography", () => {
  it("is not empty", () => {
    expect(publications.length).toBeGreaterThan(0);
  });

  it("has a unique citation key for every entry", () => {
    const keys = publications.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every entry a title, a plausible year and at least one author", () => {
    for (const item of publications) {
      expect(item.title, item.key).not.toBe("");
      expect(item.year, item.key).toBeGreaterThan(1990);
      expect(item.year, item.key).toBeLessThan(2100);
      expect(item.authors.length, item.key).toBeGreaterThan(0);
    }
  });

  it("credits Niall Twomey on every entry", () => {
    for (const item of publications) {
      expect(
        item.authors.some((a) => a.isMe),
        item.key,
      ).toBe(true);
    }
  });

  it("never carries the BibTeX `others` placeholder as a person", () => {
    for (const item of publications) {
      for (const a of item.authors) expect(a.last.toLowerCase(), item.key).not.toBe("others");
    }
  });

  it("classifies every entry into a labelled kind", () => {
    for (const item of publications) {
      expect(KIND_LABEL[item.kind], item.key).toBeTruthy();
      expect(item.kind, item.key).not.toBe("other");
    }
  });

  it("points every PDF at the public archive", () => {
    for (const item of publications) {
      if (item.pdf) expect(item.pdf, item.key).toMatch(/^\/pdf\/[\w.-]+\.pdf$/);
    }
  });

  it("does not repeat the year inside the venue", () => {
    for (const item of publications) {
      expect(item.venue, item.key).not.toMatch(new RegExp(`${item.year}\\s*$`));
    }
  });

  it("offers a filter for each kind actually present", () => {
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) expect(publications.some((p) => p.kind === kind)).toBe(true);
  });
});

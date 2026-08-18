import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publication } from "@/lib/publications";

/**
 * Notes refer to papers by citation key. A key that no longer resolves renders
 * as nothing at all in production, which is exactly the kind of quiet breakage
 * nobody notices, so these tests turn a renamed or deleted bib entry into a
 * failing build instead.
 */
const NOTES_DIR = resolve(import.meta.dirname, "../../content/notes");

const slugs = readdirSync(NOTES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const sourceOf = (slug: string) => readFileSync(resolve(NOTES_DIR, slug, "index.mdx"), "utf8");

function citationKeysIn(source: string): string[] {
  return [...source.matchAll(/<(?:Paper|Cite)\s[^>]*id="([^"]+)"/g)].map((match) => match[1]!);
}

describe("citation keys", () => {
  it("resolve for every <Paper> and <Cite> used in a note", () => {
    for (const slug of slugs) {
      for (const key of citationKeysIn(sourceOf(slug))) {
        expect(publication(key), `${slug} cites "${key}"`).toBeDefined();
      }
    }
  });
});

describe("notes", () => {
  it("are directories containing an index.mdx", () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(existsSync(resolve(NOTES_DIR, slug, "index.mdx")), `${slug} has no index.mdx`).toBe(true);
    }
  });

  it("all carry frontmatter with a quoted date", () => {
    for (const slug of slugs) {
      const frontmatter = sourceOf(slug).match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatter, `${slug} has no frontmatter`).not.toBeNull();
      expect(frontmatter![1], `${slug} date must be a quoted YYYY-MM-DD string`).toMatch(
        /^date: "\d{4}-\d{2}-\d{2}"$/m,
      );
    }
  });

  it("carry no leftover Liquid tags from the Jekyll site", () => {
    for (const slug of slugs) {
      expect(sourceOf(slug), `${slug} still contains a Liquid tag`).not.toMatch(/\{%|\{\{/);
    }
  });

  it("reference their own co-located files rather than a repeated path prefix", () => {
    for (const slug of slugs) {
      for (const [, src] of sourceOf(slug).matchAll(/<Figures?\s[^>]*src="([^"]+)"/g)) {
        // A note is a directory, so its figures are bare filenames resolved
        // against it. A leading slash means someone reintroduced a prefix.
        expect(src, `${slug} figure "${src}" should be a bare filename`).toMatch(/^[^/]+$/);
        expect(existsSync(resolve(NOTES_DIR, slug, src!)), `${slug} figure "${src}" is missing`).toBe(true);
      }
    }
  });

  it("name a hero image that exists", () => {
    for (const slug of slugs) {
      const hero = sourceOf(slug).match(/^hero:\s*(.+)$/m);
      if (!hero) continue;
      const file = hero[1]!.trim().replace(/^["']|["']$/g, "");
      expect(existsSync(resolve(NOTES_DIR, slug, file)), `${slug} hero "${file}" is missing`).toBe(true);
    }
  });
});

/**
 * Tags are three slots in a fixed order: the kind of note, then the venue for a
 * note about a paper, then one or two topics. The shape is checked here and the
 * topic list itself is not, because the shape is mechanical and the choice of
 * topic is editorial. `.claude/skills/draft-note` carries the topics in use.
 */
describe("note tags", () => {
  const tagsOf = (slug: string) =>
    [...(sourceOf(slug).match(/^tags:\s*\[(.*)\]$/m)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map((match) => match[1]!);

  it("open with research where the note is about a paper, and carry one to four tags in all", () => {
    for (const slug of slugs) {
      const tags = tagsOf(slug);
      // `research` marks a note built on a paper, which is a fact about the note
      // rather than a label: it is exactly the set that cites one. A note with no
      // paper carries topics alone, since a second kind would only ever restate
      // the absence of the first.
      if (/<Paper id=/.test(sourceOf(slug))) {
        expect(tags[0], `${slug} cites a paper so should open with "research"`).toBe("research");
      } else {
        expect(tags, `${slug} cites no paper so should not claim a kind`).not.toContain("research");
      }
      expect(tags.length, `${slug} has ${tags.length} tags`).toBeGreaterThanOrEqual(1);
      expect(tags.length, `${slug} has ${tags.length} tags`).toBeLessThanOrEqual(4);
    }
  });

  it("take the venue and year from the bibliography rather than the keyboard", () => {
    for (const slug of slugs) {
      // A venue tag is the one ending in a year. It has to agree with the bib
      // entry for a paper the note cites: hand-typing a venue is how a note
      // ends up still saying "preprint" two years after the paper appeared,
      // and nothing about the rendered badge gives that away.
      const venues = tagsOf(slug).filter((tag) => /\s(19|20)\d{2}$/.test(tag));
      if (venues.length === 0) continue;
      expect(venues.length, `${slug} should carry at most one venue tag`).toBe(1);

      const cited = citationKeysIn(sourceOf(slug))
        .map((key) => publication(key))
        .filter((paper) => paper !== undefined)
        .map((paper) => `${paper.venueShort} ${paper.year}`);
      expect(cited, `${slug} tags "${venues[0]}", which no paper it cites was published in`).toContain(venues[0]);
    }
  });

  it("are lowercase topics after the kind and the venue", () => {
    for (const slug of slugs) {
      for (const tag of tagsOf(slug).filter((tag) => !/\s(19|20)\d{2}$/.test(tag))) {
        // Casing is the venue's only privilege, since an acronym printed as
        // "Ecml Pkdd" is wrong in a way "Sensors" is merely inconsistent.
        expect(tag, `${slug} tag "${tag}" should be lowercase and hyphenated`).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    }
  });
});

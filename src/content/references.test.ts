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

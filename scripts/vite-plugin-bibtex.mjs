import { parse } from "@retorquere/bibtex-parser";

/**
 * Import a `.bib` file from a note and have its entries register themselves.
 *
 * A note is a directory, and the point of that is self-containment: its images,
 * its notebooks, its own components, and now its bibliography. Citing somebody
 * else's paper used to mean editing a file under `src/`, which put a note's
 * references in the core of the app and made the blast radius of writing a note
 * the whole codebase.
 *
 * ```mdx
 * import "./references.bib";
 *
 * As <Ref id="meng2024ranked" /> showed, …
 * ```
 *
 * The import is for its side effect. The transform turns the file into a module
 * that calls `registerReferences`, so the entries land in the registry as the
 * note's chunk loads, which is before anything in that chunk renders. That is
 * what lets `<Ref>` stay a bare `id` with no provider to thread through the
 * prose and no import to name in every citation.
 *
 * Entries are bundled into the chunk of the note that imported them, so a
 * reference read by one note is not downloaded by a reader of another.
 */
export default function bibtex() {
  return {
    name: "site:bibtex",
    enforce: "pre",

    async transform(code, id) {
      if (!id.endsWith(".bib")) return null;

      // `sentenceCase: false` for the same reason build-publications.mjs sets
      // it: the parser otherwise lowercases a title into sentence case, and
      // "Passage Re-ranking with BERT" comes back as "Passage re-ranking with
      // BERT". The .bib holds the title the authors gave it.
      const parsed = parse(code, { sentenceCase: false });
      const entries = {};

      for (const entry of parsed.entries) {
        const fields = entry.fields ?? {};
        const authors = (fields.author ?? []).map((name) =>
          // The parser splits a name into parts; BibTeX order is "Last, First"
          // and that is what is kept, because `displayAuthors` reverses it for
          // the card and `bibtex()` needs it back in this order anyway.
          [name.lastName, name.firstName].filter(Boolean).join(", "),
        );

        const venue = fields.booktitle ?? fields.journal ?? fields.publisher ?? "";
        const year = Number.parseInt(String(fields.year ?? ""), 10);

        if (!entry.key) continue;
        entries[entry.key] = {
          type: entry.type ?? "misc",
          authors,
          year: Number.isFinite(year) ? year : 0,
          title: fields.title ?? "",
          venue,
          // `venueshort` is not standard BibTeX. It is read where an author has
          // supplied it, because "SIGIR 2024" fits a hover card and the full
          // booktitle is a paragraph.
          venueShort: fields.venueshort ?? venue,
          url: fields.url ?? (fields.doi ? `https://doi.org/${fields.doi}` : ""),
        };
      }

      return {
        code: [
          `import { registerReferences } from "@/content/references";`,
          `registerReferences(${JSON.stringify(entries)});`,
        ].join("\n"),
        map: null,
      };
    },
  };
}

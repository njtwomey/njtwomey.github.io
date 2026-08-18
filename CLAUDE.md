# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

The personal site of Niall Twomey at **www.nialltwomey.com**: publications, domains of work, and
notes. A static React app built by Vite and published to GitHub Pages by GitHub Actions on every
push to `main`. It replaces a Jekyll site whose source has been deleted, so nothing here refers to
it.

## The stack, which is not negotiable

**React + TypeScript** built with **Vite**, **Tailwind CSS v4** for all styling, **shadcn/ui** for
every UI component, **lucide-react** for every icon. No second component library, no second icon
set, no CSS-in-JS.

- **shadcn/ui exclusively.** Never a bare `<button>`, `<input>` or `<select>`; use `Button`,
  `Input`, `Select` from `@/components/ui`. Style with Tailwind utilities over the semantic tokens
  (`bg-background`, `text-muted-foreground`), never raw palette values like `bg-neutral-100`.
- **Add components with `npx shadcn@latest add <component>`, never by hand.** The CLI pulls the
  current canonical source, so a hand-written equivalent is wrong even when it looks identical.
  Config is `components.json`. Files under `src/components/ui/` are generated, excluded from
  prettier, and not edited.
- **Icons from `lucide-react`.** Google Scholar and ORCID are the two exceptions lucide does not
  carry; they live in `src/components/icons.tsx` on lucide's 24×24 grid. Check lucide before adding
  a third.

## Content is compiled, not hand-written into the app

Everything a human writes lives under `content/`. A build step compiles it into JSON the app
imports. Nothing in `src/content/*.json` is edited by hand.

```
content/publications.bib             →  src/content/publications.json     (bundled: titles, authors, venues, summaries)
                                     →  public/publications-details.json  (fetched: abstracts, BibTeX)
                                     →  public/publications.bib           (the download link)
content/publications/<key>/index.md  →  the `summary` on that paper's card
content/notes/<slug>/index.mdx       →  src/content/notes.json            (frontmatter index)
content/notes/<slug>/*               →  public/notes/<slug>/              (copied)
src/content/site.ts                      bio, role, focus areas, social links — plain TS
src/content/domains.ts                   the domains page — plain TS
```

`scripts/build-publications.mjs` is the only thing that understands BibTeX, and it is **strict on
purpose**: a `pdf={...}` naming a file absent from `public/pdf/` fails the build, as does a missing
year or title, or an entry that does not credit Niall. A dead download link on a live site is worse
than a failed build.

**BibTeX stays the source of truth for publications**, because it is what Scholar, arXiv and every
publisher export. Abstracts and BibTeX records are ~80% of its bytes and are only read on the
publications page, so they are split into a fetched file that routes rendering paper cards pull in
alongside their own chunk (`withPaperDetails` in `App.tsx`).

## Papers are referenced by citation key, everywhere

`<Paper id="twomey2019neural" />` renders a publication; `<Cite id="..." />` is the inline-prose
form. Referring to a paper by key rather than copying its details means a corrected venue or a new
PDF appears everywhere at once. `src/content/references.test.ts` fails the build if a key used in a
note or the front page's `SELECTED` list stops resolving.

## Publication summaries

`content/publications/<citation-key>/index.md` holds a short plain-English take, shown on the card
above the abstract toggle. It is Niall's framing rather than the venue's, which is why it is
separate from the `.bib`. Where a key has no directory the card falls back to the abstract, so there
is no obligation to write one for every paper. A directory whose name is not a citation key fails
the build, otherwise a summary goes quietly unread the moment a key is renamed.

## Notes

**A note is a directory**: `content/notes/<slug>/index.mdx` plus every image, notebook and archive
belonging to it, copied at build time to `public/notes/<slug>/`.

**The slug is the title slugified**, and for a note about a paper the title is the paper's own, so
`A note on Low-Count Time Series Anomaly Detection` lives in
`content/notes/low-count-time-series-anomaly-detection/` with the `A note on` prefix dropped. Name
and title are one string in two shapes, which is what stops them drifting apart. Long paper titles
make long directory names and that is accepted.

That is what lets a note refer to its own files by bare name, resolved against its own directory by
`NoteSlugContext` and `useAsset` in `src/components/mdx.tsx`. A leading `/` still means the site
root. Never write `/notes/<slug>/moons.gif` by hand, since removing that prefix is the point.

```mdx
<Figure src="moons.gif" caption="..." />
<CodeFile path="python/demos/torch_dataclass.py" lines="20-45" />
```

`CodeFile` inlines a real file during the MDX transform, so a quoted snippet cannot drift from the
file it came from, and an unreadable path fails the build. Code fences are highlighted by Shiki at
build time in both themes, so always declare a language and use ```text for program output. `Paper`,
`Cite`, `Figure`, `Figures` and `CodeFile` need no import. Maths is KaTeX.

**`published: false` is the default and means the note is not on the live site.** It is on the dev
server badged "Draft". Keep stale notes in the repo set back to `false` rather than deleting them.
The Notes nav item only appears once at least one note is published. The `hero` doubles as the index
thumbnail, so a note needs one image rather than two.

The vocabulary is **notes** throughout, in files, routes, identifiers and UI. Not "posts", not
"blog". Frontmatter fields and the house shape of a note are in the `draft-note` skill.

## Commands

Prefer the Makefile; `make help` lists everything.

```bash
make install      # npm install
make dev          # compile content, then run the dev server
make check        # content + typecheck + format-check + test — what CI runs
make build        # static site into dist/
make preview      # build, then serve it locally
make content      # recompile content/ into src/content/*.json
```

Prettier is configured at **120 columns**. Run `make format` before committing; CI fails on anything
unformatted.

## Deployment

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`. There is no
deploy script and no `source` branch; built output is never committed.

This is a **user** site on a custom domain, so the Vite base is `/` and `public/CNAME` carries
`www.nialltwomey.com` into the build. `VITE_BASE` exists for previewing under a subpath; never
hard-code a base. Because routing is client-side, the build writes `404.html` as a copy of
`index.html`, which is what makes a direct hit on `/domains` work on Pages.

## Skills

| skill              | e.g.                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| `add-publications` | "add my new papers", "check Scholar for anything missing", "add this PDF" |
| `draft-note`       | "draft a note about the ordinal regression paper", "rewrite this note"    |
| `writing`          | any user-facing prose                                                     |

`add-publications` reconciles `content/publications.bib` against Google Scholar and PDFs dropped in
`inbox/`. It must **never invent a field**: an entry with a guessed venue or a fabricated DOI is
worse than one that is missing them.

## Writing

**Load the `writing` skill before writing or editing any user-facing prose**, meaning the bio, the
domains page, publication summaries, note prose and page ledes. Two rules outrank the rest: every
sentence must be a complete sentence, and em dashes are banned in favour of a comma, a colon, a
semicolon or a full stop. `uv run python/tools/prose_stats.py <file>` measures a draft against the
voice. Code comments are exempt and should explain why at whatever length it takes.

## Conventions

- **Never invent a citation, a venue, a year or a DOI.** If a field is unknown, omit it and say so.
  A wrong citation on an academic site is the most damaging thing that can go wrong here.
- **Filter state lives in the URL** (`useFilters` in `routes/publications.tsx`), so a filtered view
  can be linked to and reloaded.
- **Assets go through `import.meta.env.BASE_URL`**, never a bare `/path` in JSX.
- **Light and dark are both real.** Tokens are defined once in `src/index.css`, `:root` for light and
  `.dark` for dark, and a colour must never be defined in only one of them.
- **Do not commit generated files.** `src/content/*.json`, `public/publications-details.json`,
  `public/publications.bib` and `public/notes/` are gitignored and rebuilt by `make content`.

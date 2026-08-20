# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

The personal site of Niall Twomey at **www.nialltwomey.com**: publications, ML practice, and
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
- **Charts are Apache ECharts**, and it is the one exception to the rule above, because shadcn has
  no chart that does what a result plot needs. Import from `echarts/core` and register only the
  pieces a chart uses, since the full bundle is about a megabyte and the modular one is a fraction
  of it. Import it from a component inside the note that needs it, so it lands in that note's chunk
  rather than in the bundle every reader downloads.
- **Every chart takes its look from `src/lib/chart-theme.ts`, and a hex value never appears in a
  chart.** `darkgrid(resolved)` returns the shared option fragment to spread, and `palette(resolved)`
  the series colours in order, both keyed on what `useTheme` resolved to. ECharts paints its own
  canvas and knows nothing about the CSS tokens, so a chart that is legible in light and invisible in
  dark is the failure mode here, and it is invisible to anyone testing in one theme. The palettes are
  seaborn's, copied verbatim and lightened for dark by a shared helper, so the nth series is the same
  hue it would be in a figure from the Python side and there is one place to correct.

## Content is compiled, not hand-written into the app

Everything a human writes lives under `content/`. A build step compiles it into JSON the app
imports. Nothing in `src/content/*.json` is edited by hand.

```
content/publications.bib             →  src/content/publications.json     (bundled: titles, authors, venues, summaries)
                                     →  public/publications-details.json  (fetched: abstracts, BibTeX)
                                     →  public/publications.bib           (published whole, no longer linked from the UI)
content/notes/<yyyy>-<mm>-<slug>/index.mdx  →  src/content/notes.json     (frontmatter index)
content/notes/<yyyy>-<mm>-<slug>/*          →  public/notes/<slug>/       (copied, prefix dropped)
src/content/site.ts                      bio, role, focus areas, social links — plain TS
src/content/practice.ts                  the ML Practice page — plain TS
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
form. `<Ref id="..." />` is the same for **other people's** papers, keyed off
`src/content/references.ts` and linking out rather than to the publications page; it shows the full
record on hover, with the BibTeX. Which of its two forms to use is a grammar question and is settled
in the `writing` skill. Referring to a paper by key rather than copying its details means a corrected venue or a new
PDF appears everywhere at once. `src/content/references.test.ts` fails the build if a key used in a
note or the front page's `SELECTED` list stops resolving.

## Publication summaries

`notes={...}` in a `publications.bib` entry holds a short plain-English take, shown on the card
above the abstract toggle. It is Niall's framing rather than the venue's, and it sits in the entry
rather than in a file beside it so that renaming a key cannot leave it behind. An entry without one
falls back to the abstract, so there is no obligation to write one for every paper.

## Notes

**A note is a directory**: `content/notes/<yyyy>-<mm>-<slug>/index.mdx` plus every image, notebook
and archive belonging to it, copied at build time to `public/notes/<slug>/`.

**The date prefix files the note and is not part of any URL.** It is there so that
`ls content/notes` is chronological, which is how anyone looks for a note, and it has to agree with
the note's own `date` or the build fails. The slug is the directory with the prefix dropped, and it
is the published path, so renaming a directory to correct a date does not move the page.

**The slug is the title slugified**, and for a note about a paper the title is the paper's own, so
`A note on Low-Count Time Series Anomaly Detection` lives in
`content/notes/2023-09-low-count-time-series-anomaly-detection/` with the `A note on` prefix
dropped. Name and title are one string in two shapes, which is what stops them drifting apart. Long
paper titles make long directory names and that is accepted.

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

**Tags are three slots in a fixed order**, one to four in all: `research` where the note is built on
a paper, then the venue and year for that paper, then one or two lowercase topics in alphabetical
order. A note that cites no paper carries topics alone, because a second kind would only restate the
absence of the first. The venue tag is copied from the bibliography entry for the key the note cites,
because that is the fact and a hand-typed venue is how a note ends up still saying "preprint" two
years after the paper appeared. `src/content/references.test.ts` fails the build when a tag
disagrees with the bib, and the topics in use are listed in the `draft-note` skill.

**`hero` is the index thumbnail and, by default, a banner at the top of the note.** `heroOnPage:
false` keeps the thumbnail and drops the banner, for a picture that survives being small and does
not survive being cropped wide.

**A full source listing goes in `<SourceCode path="..." />`**, which folds it away behind a bar
carrying the filename, a copy button, a link to the file on GitHub and an optional download. The one
`path` is repo-relative and does everything: `scripts/remark-code-file.mjs` reads the file at build
time and injects the fence, numbers its lines, and suppresses the block's own furniture so the panel
reads as one component rather than a box inside a box. Import it like any other component, since a
reader of the MDX should be able to see where it came from.

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
`index.html`, which is what makes a direct hit on `/practice` work on Pages.

## Skills

| skill              | e.g.                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| `add-publications` | "add my new papers", "check Scholar for anything missing", "add this PDF"    |
| `note-draft`       | "draft a note about the ordinal regression paper", "write something about X" |
| `note-revise`      | any correction to note prose                                                 |
| `note-review`      | "review this note", "does this read", "actually read the thing"              |
| `persona-read`     | "read this as a generalist", "how does this land for a recruiter"            |
| `voice-check`      | "does this sound like me", "any banned phrases"                              |

**The note skills live in `repositories/note-authoring`** and are symlinked into `.claude/skills/` so
they are discoverable here. That repository is where notes are drafted and reviewed. It holds the
reference the skills operate over: sentence patterns with a verdict, the two note templates, six
reader personas, catalogues of constructions that work and that do not, a definition of complexity,
and the measured voice profile. A finished note is copied into `content/notes/<slug>/`.

There is no longer a `writing` skill. Prose rules for the rest of the site live in that reference
too, and `voice-check` is what applies them.

`add-publications` reconciles `content/publications.bib` against Google Scholar and PDFs dropped in
`inbox/`. It must **never invent a field**: an entry with a guessed venue or a fabricated DOI is
worse than one that is missing them.

## Writing

**Load the `writing` skill before writing or editing any user-facing prose**, meaning the bio, the
ML Practice page, publication summaries, note prose and page ledes. Two rules outrank the rest: every
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

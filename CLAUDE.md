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

## Figures and compute are omai, and only omai

**omai** (Observable Methods in Machine Learning, `github.com/njtwomey/omai`) is the figure and compute library
for every interactive figure in a note. `omai-engine` is the compute (`omai-engine/<domain>`) and `omai-render` the
figures, views and React bindings (`omai-render/<area>`); there is no second library and nothing hand-writes numerics
the engine provides. **To use omai, read the two `llms.txt` files, then the `index/<domain>.md` they point to**:
`node_modules/omai-engine/llms.txt` for compute and `node_modules/omai-render/llms.txt` for figures, views and the
React bindings, then the source only if an index is not enough.

- **Installed from GitHub release tarballs, never from a registry.** `omai.lock.json` pins each package by sha256 and
  `scripts/fetch-omai.mjs` (the `preinstall` hook, or `npm run omai:fetch`) downloads it over HTTPS into the
  git-ignored `vendor/omai/`, verifies the hash and refuses on a mismatch. `package.json` depends on
  `file:vendor/omai/<name>.tgz`. The repository is public, so no sign-in is needed.
- **Moving to a new release is one command.** `npm run omai:lock -- v<version> && npm run omai:fetch && npm install`
  takes the release's asset hashes into the lock, downloads and verifies the tarballs, and unpacks them. Use one
  version for both packages. The site is on 0.1.6, installed from the release assets, so CI can run `npm ci`.
- **The API in one paragraph.** Randomness is explicit: an immutable `key` from `omai-engine/random`. Iterative
  methods are traced `Algorithm`s run as sessions (`useSession`, `useLiveRun`, `SessionPlayer`). Numeric functions take
  a `TensorLike` and return tensors (`toFlat` and `toVector` read them back), and fixed-size tuples are `Vec2`, `Vec3`
  and `Vec4` from `omai-engine/base`. Invalid arguments throw `OmaiError('value')`; non-convergence does not throw, so
  check the run's status. `omai-render` follows the `dark` class on `<html>` and stores its session preferences in
  `localStorage` under `omai-session-preferences`.
- **If omai lacks something, say so rather than working around it.** A figure that needs a domain, function or
  behaviour omai does not have becomes a marked placeholder and the gap is reported upstream, not hand-rolled.
- **Standing order: nothing in a figure plays or computes until the reader asks.** No `autoplay`, no run started on
  mount, no worker fitting in the background when the page loads. An animated or iterative figure opens paused at its
  first state (step 0) and says what to press ("press play to fit"). Pressing play, stepping or dragging the scrubber
  starts the computation, and changing a setting starts a fresh run from the beginning and waits there for another
  press. A figure whose first picture needs a heavy run shows a fixed start (cosines, the initial parameters) instead,
  and the heavy run starts when the reader chooses it. Cheap, one-shot results that are drawn at once, such as a
  histogram or a closed-form curve, are not animations and compute normally. A page that deliberately differs says so
  in the note. Check it with no interaction at all: no worker started, and the step counter still at 0.

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
record on hover, with the BibTeX. Which of its two forms to use is a grammar question: `Ref` is the
subject of the sentence, and `Ref` with `paren` is support at the end of a clause. Referring to a paper by key rather than copying its details means a corrected venue or a new
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

**An inline `<Cite>` or `<Ref>` must never start a line.** MDX reads a JSX element at the start of a
line as a block, so prettier puts a blank line in front of it and the paragraph splits in two around
the citation. Wrap the prose so the tag sits mid-line; the linter's "paragraph does not end in a
complete sentence" is pointing at exactly this.

`CodeFile` inlines a real file during the MDX transform, so a quoted snippet cannot drift from the
file it came from, and an unreadable path fails the build. Code fences are highlighted by Shiki at
build time in both themes, so always declare a language and use ```text for program output. `Paper`,
`Cite`, `Figure`, `Figures` and `CodeFile` need no import. Maths is KaTeX, and the `katex` dependency is
pinned to the version `rehype-katex` renders with, because the two number their size steps under
different class names and a mismatch sets every subscript and superscript at full size without
erroring anywhere.

**Tags are three slots in a fixed order**, one to four in all: `research` where the note is built on
a paper, then the venue and year for that paper, then one or two lowercase topics in alphabetical
order. A note that cites no paper carries topics alone, because a second kind would only restate the
absence of the first. The venue tag is copied from the bibliography entry for the key the note cites,
because that is the fact and a hand-typed venue is how a note ends up still saying "preprint" two
years after the paper appeared. `src/content/references.test.ts` fails the build when a tag
disagrees with the bib, and the topics in use are the ones already on the notes in `content/notes/`.

**`hero` is the index thumbnail and, by default, a banner at the top of the note.** `heroOnPage:
false` keeps the thumbnail and drops the banner, for a picture that survives being small and does
not survive being cropped wide.

**A full source listing goes in `<SourceCode path="..." />`**, which folds it away behind a bar
carrying the filename, a copy button, a link to the file on GitHub and an optional download. The one
`path` is repo-relative and does everything: `scripts/remark-code-file.mjs` reads the file at build
time and injects the fence, and suppresses the block's own furniture so the panel reads as one component
rather than a box inside a box. Line numbers are drawn beside the listing rather than by a CSS counter on
it, because generated content follows a selection into the clipboard and a reader copying ten lines was
getting ten line numbers with them. Import it like any other component, since a
reader of the MDX should be able to see where it came from.

**A link off the site goes in `<ExternalLink href="..." title="...">`**, a full-width card carrying the
title, the host and a sentence on what is there, opening in a new tab. `<ExternalLinks>` wraps several
into one bordered block with divided rows, and a card inside a group drops its own border and margins
so three links read as one list rather than three interruptions. The host is shown deliberately: a
reader is entitled to know where a link goes before spending a click on it. Import both like any other
component.

**`published: false` is the default and means the note is not on the live site.** It is on the dev
server badged "Draft". Keep stale notes in the repo set back to `false` rather than deleting them.
The Notes nav item only appears once at least one note is published. The `hero` doubles as the index
thumbnail, so a note needs one image rather than two.

The vocabulary is **notes** throughout, in files, routes, identifiers and UI. Not "posts", not
"blog". Frontmatter fields and the house shape of a note are in `repositories/note-authoring/harness/note-pattern.md`.

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

| skill              | e.g.                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| `add-publications` | "add my new papers", "check Scholar for anything missing", "add this PDF"             |
| `note`             | "write a note about X", "plan this note", "review this note", "revise this note"      |
| `plain-writer`     | "rewrite this in plain English", "simplify this", "ASD-STE100", "controlled language" |

**`plain-writer` is adapted from ASD-STE100's skill, and is short on purpose.** It keeps the rules that
make explanatory prose easier to read: active voice, one term for one thing, ordinary words, articles,
related words kept together, and no noun stack longer than three. It drops the rules for procedures,
warnings, the approved dictionary and the sentence caps, because they push the text towards staccato.
`.claude/skills/plain-writer/SOURCE.md` says where the skill came from, under what licence, and what was
dropped.

**The note harness lives in `repositories/note-authoring`.** `note` and `plain-writer` are symlinked into
`.claude/skills/` from there, so they are discoverable here. That repository is where notes are planned,
drafted, reviewed and revised, and where `make dev` serves a local viewer for them. A finished note is
copied into `content/notes/<slug>/`. The old skills and the reference they ran on are in that
repository's `legacy/` directory and are not loaded.

`add-publications` reconciles `content/publications.bib` against Google Scholar and PDFs dropped in
`inbox/`. It must **never invent a field**: an entry with a guessed venue or a fabricated DOI is
worse than one that is missing them.

## Writing

**Read `repositories/note-authoring/harness/style.md` before writing or editing any user-facing prose**,
meaning the bio, the ML Practice page, publication summaries, note prose and page ledes. The goal is
human, straightforward, succinct writing that is precise, sharp and informative. Every sentence must be a
complete sentence, and em dashes are banned in favour of a comma, a colon, a semicolon or a full stop.

`uv run tools/lint_prose.py <file>`, **run from `repositories/note-authoring/`**, catches the mechanical
rules including those two. Code comments are exempt and should explain why at whatever length it takes.

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

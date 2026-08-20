# nialltwomey.com

Personal site — publications, work history and notes. React + Vite + Tailwind + shadcn/ui, published
to GitHub Pages by GitHub Actions on every push to `main`.

```bash
make install     # once
make dev         # http://localhost:5173
make check       # what CI runs: content + typecheck + format + tests
make build       # static site into dist/
```

If you only remember one thing: **everything you write lives in `content/`**, and a build step
compiles it into what the app reads. You never edit anything in `src/content/*.json` — those are
generated and gitignored.

---

## Add a publication

The bibliography is `content/publications.bib`. Paste in the BibTeX the publisher, arXiv or DBLP
gives you, name the key `<surname><year><word>`, and put it under the right year banner:

```bibtex
@inproceedings{twomey2020towards,
  title={Towards Multi-Language Recipe Personalisation and Recommendation},
  author={Twomey, Niall and Fain, Mikhail and Ponikar, Andrey and Sarraf, Nadine},
  booktitle={Fourteenth ACM Conference on Recommender Systems (RecSys '20)},
  year={2020},
  abstract={...},
  pdf={twomey2020towards.pdf}
}
```

The PDF goes in `public/pdf/` named after the citation key. `pdf={...}` naming a file that is not
there **fails the build** — deliberately, so a dead download link never reaches the site.

Fields that get used: `title`, `author`, `year`, `journal`/`booktitle`/`school`, `abstract`, `pdf`,
`doi`, `url`, `arxiv`, `code`, `slides`.

### Or let Claude do it

Drop PDFs into `inbox/` and say **"add my new papers"**. The `add-publications` skill reconciles
the bibliography against Google Scholar, DBLP and OpenAlex, moves the PDFs into place, and reports
what it could not verify. It is under instruction never to invent a field — a missing DOI is fine,
a plausible wrong one is not.

## Add a short summary to a paper

Optional, and worth doing for the papers you care about:

```bibtex
@article{twomey2019ordinal,
  ...
  notes={One or two sentences in plain English.},
}
```

One or two sentences in plain English, saying what the paper does and why it is interesting. It
shows on the card above the abstract toggle. Where there is no summary the card falls back to the
abstract, so there is no need to write 60 of them.

The directory name must be a citation key that exists, or the build fails.

## Write a note

**A note is a directory**: `content/notes/<yyyy>-<mm>-<slug>/index.mdx`, plus every image that
belongs to it. The date prefix keeps the listing chronological and has to match the note's own
`date`; it is dropped to make the URL, so the note below is served at `/notes/my-note`.

```
content/notes/2026-08-my-note/
  index.mdx
  hero.png
  result.gif
```

```mdx
---
title: "Sentence case, no full stop"
description: "One or two sentences — this is what shows on the index and in link previews."
date: "2026-08-17" # quoted, or the day shifts
tags: ["research"]
hero: hero.png # a bare filename from this directory
heroAlt: "What the image shows."
published: false
---

Prose. Images are referenced by bare filename, because they live right here:

<Figure src="result.gif" caption="What to notice." />

Cite a paper inline with <Cite id="twomey2019neural" />, or drop the whole card in:

<Paper id="twomey2019neural" />
```

Available without importing anything: `Paper`, `Cite`, `Figure`, `Figures`. Maths is KaTeX
(`$inline$`, `$$display$$`). Code fences are highlighted by Shiki at build time in both light and
dark, so always declare the language — `python, `bash — and use ```text for output.

If a note contains code, put a runnable version in `python/` and check it before quoting the
output. See `python/README.md`.

**`published: false` means it is not on the live site**, but it _is_ on `make dev`, badged "Draft".
That is the point: write and read it before deciding. Set a stale note back to `false` rather than
deleting it — the five migrated from the old Jekyll site are all unpublished for exactly that
reason, and the Notes nav item only appears once something is published.

### Or let Claude draft it

Say **"draft a note about the ordinal regression paper"**. The `draft-note` skill reads the paper,
matches the house style, and leaves it unpublished for you to check. It will
not invent a figure.

## Change the bio, the focus areas or a social link

`src/content/site.ts`. Plain TypeScript, edited directly.

## Add to the ML Practice page

`src/content/practice.ts`. The rows are capabilities rather than employers, filed under nine themes
and three families, and `coverage` records how deeply each row ran at each organisation. Papers
deliberately do not appear here; the publications page is where they live.

## Add a UI component

Always through the CLI, never by hand:

```bash
npx shadcn@latest add <component>
```

Icons come from `lucide-react`. Styling is Tailwind utilities over the shadcn semantic tokens
(`bg-background`, `text-muted-foreground`) — never raw palette values, or dark mode breaks.

---

## How it fits together

```
content/publications.bib             the bibliography — source of truth
content/notes/<slug>/index.mdx       a note, with its images beside it
src/content/site.ts                  bio, role, focus areas, socials
src/content/practice.ts              the ML Practice page, by capability
public/pdf/                          paper PDFs, named by citation key
inbox/                               staging area for PDFs to be filed
```

Generated at build time and gitignored: `src/content/*.json`, `public/notes/`,
`public/publications/`, `public/publications-details.json`, `public/publications.bib`.

## Deployment

Push to `main`. `.github/workflows/deploy.yml` compiles the content, typechecks, format-checks,
tests, builds, and publishes `dist/` as a Pages artifact. There is no deploy script and no build
output in the repo.

The custom domain comes from `public/CNAME`. Because routing is client-side, the build writes
`404.html` as a copy of `index.html` — that is what makes a direct hit on `/publications` work.

> **One-time setting:** the repo used to deploy from a branch. In _Settings → Pages_, set the
> source to **GitHub Actions**. The workflow attempts this itself via `configure-pages`, but the
> setting is worth confirming after the first run.

## Conventions worth knowing

- **Never invent a citation, venue, year or DOI.** Omit the field instead. This is the one thing
  on an academic site that is both damaging and invisible.
- Papers are referenced by **citation key** everywhere — notes, the front page — so a
  correction propagates in one edit.
- Prettier at **120 columns**; `make format` before committing.
- Light and dark are both real. Check both.

`CLAUDE.md` carries the same rules in the form Claude Code reads.

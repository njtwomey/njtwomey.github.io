---
name: add-publications
description: Add papers to the bibliography, or reconcile it against Google Scholar. Use when asked to add a publication, check for missing papers, ingest PDFs, or update the publication list (e.g. "add my new papers", "check Scholar for anything missing", "add these three PDFs", "my publication list is out of date").
---

# Add publications

`content/publications.bib` is the single source of truth for every paper on the site. This skill
puts new records into it correctly, and finds the ones that are missing.

Run it a few times a year, or whenever a PDF lands in `inbox/`.

## The one rule

**Never invent a field.** Not a year, not a venue, not a DOI, not a page range, and above all not
an abstract. A fabricated citation on an academic site is the most damaging thing that can go
wrong here, and it is invisible — it looks exactly like a correct one.

If a field is not in a source you actually read, leave it out and say so in your report. An entry
missing its DOI is fine. An entry with a plausible-looking wrong DOI is not.

The same applies to PDFs: `pdf={foo.pdf}` may only be written if `public/pdf/foo.pdf` exists.
`npm run publications` fails the build otherwise, which is the backstop, not the plan.

## 1. Settle what is being asked

Three jobs, and they behave differently:

| ask                                 | job                                          |
| ----------------------------------- | -------------------------------------------- |
| "check Scholar for missing papers"  | reconcile the whole bibliography — §2 onward |
| "add this paper" / "add these PDFs" | add named records only — skip to §4          |
| "fix the venue on X"                | edit one entry, rebuild, done                |

Say which one you are doing, and how many entries the bibliography holds today, before starting.

## 2. Read what is already there

```bash
grep -c '^@' content/publications.bib          # how many entries
grep -oE '^@\w+\{[^,]+' content/publications.bib   # every citation key
```

Read the titles too, not just the keys. Scholar's title for a paper is often not the one in the
bib — a preprint that later appeared at a venue is the same work under two records, and the same
paper can be listed with different capitalisation and subtitle punctuation.

Note also that a preprint and its published version are **both** legitimately in this
bibliography (see `twomey2019neural` and `twomey2020neural`). Do not "deduplicate" them.

## 3. Find what is missing

The profile is <https://scholar.google.com/citations?user=bRN8Y34AAAAJ&hl=en>.

Fetch it, and expect this to be the unreliable step: Scholar blocks automated fetching and will
often return a consent wall, a CAPTCHA page or nothing useful. **Do not fake it.** If the fetch
does not return a real publication list, say so plainly and fall back:

- **arXiv** — `https://arxiv.org/a/twomey_n_1` and a search for the author
- **DBLP** — the best structured source for CS venues, and it exports BibTeX directly
- **Semantic Scholar / OpenAlex** — both have open APIs that return structured records
- **Ask** — the user offered to supply PDFs. A PDF in hand beats a scraped listing.

Compare by normalised title (lowercase, punctuation stripped), not by key. Report the candidates
as a list **before** writing anything, so the user can strike out anything that is not theirs or
is a duplicate under another name.

## 4. Get an authoritative record for each new paper

In order of preference:

1. The publisher's or arXiv's own BibTeX export
2. DBLP's BibTeX export
3. A record assembled from a page you actually read, with any unknown field omitted

Never assemble a record from a search-result snippet.

The abstract must be **verbatim** from the paper or its landing page. Do not summarise it, do not
tidy it, do not write one. If there is no abstract to be had, omit the field — the site handles
an entry without one.

## 5. Write the entry

Citation key: `<first author surname><year><first distinctive word of title>`, lowercase, no
punctuation — `twomey2020towards`, `poyiadzi2021statistical`. Check the key is not already taken.

Place it in the file under the right `%%% PAPERS FROM <year> %%%` banner, newest year first,
adding a banner if the year is new. Match the surrounding formatting.

```bibtex
@inproceedings{twomey2020towards,
  title={Towards Multi-Language Recipe Personalisation and Recommendation},
  author={Twomey, Niall and Fain, Mikhail and Ponikar, Andrey and Sarraf, Nadine},
  booktitle={Fourteenth ACM Conference on Recommender Systems (RecSys '20)},
  year={2020},
  abstract={...verbatim...},
  pdf={twomey2020towards.pdf}
}
```

Fields the site uses: `title`, `author`, `year`, `journal` / `booktitle` / `school`, `abstract`,
`pdf`, `doi`, `url`, `arxiv`, `code`, `slides`. Anything else is carried in the raw BibTeX that
the site offers for copying, but is not displayed.

Use `@inproceedings` for conference and workshop papers, `@article` for journals **and for
arXiv-only preprints** — the build classifies a preprint by its venue string, so an arXiv record
should keep `journal={arXiv preprint arXiv:NNNN.NNNNN}`.

## 6. PDFs

If the user supplied PDFs, or there are files in `inbox/`:

```bash
ls inbox/
git mv inbox/<file>.pdf public/pdf/<citation-key>.pdf
```

Rename to match the citation key — that is the convention every existing entry follows. Then add
`pdf={<citation-key>.pdf}` to the record.

Do not add a `pdf` field for a paper whose PDF you do not have, and do not download one from a
publisher's site without being asked to.

## 7. Verify and report

```bash
npm run publications   # strict — fails on a missing year, title, author or PDF
make check             # typecheck, format, tests
```

Then report:

- what was added, by key and title
- what was found but **not** added, and why (already present, not his, no reliable record)
- any field deliberately left out, and which
- whether the Scholar fetch actually worked, or which fallback was used

The last two matter most. A silent gap is the failure mode this whole skill exists to prevent.

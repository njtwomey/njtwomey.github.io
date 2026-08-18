# Publication summaries

One directory per citation key, named exactly as the key appears in
`../publications.bib`:

```
content/publications/twomey2019ordinal/
  index.md          the summary — plain markdown, no frontmatter needed
  figure.png        optional; published to /publications/<key>/figure.png
```

`index.md` holds a **short, plain-English take on the paper** — one or two
sentences saying what it does and why it is interesting. It appears on the
publications card above the abstract toggle.

It is deliberately not the abstract. The abstract is what the venue printed and
lives in the `.bib`; this is your own framing, rewritable at any time, and the
site falls back to the abstract wherever no summary exists. So there is no need
to write one for every paper — add them where you have something to say.

A directory whose name is not a citation key in `publications.bib` fails the
build, which is what stops a summary going quietly unread after a key is
renamed.

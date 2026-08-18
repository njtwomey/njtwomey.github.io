# python

The environment for code that appears in notes.

```bash
uv sync                                       # once
uv run python/demos/torch_dataclass.py        # run a demo
uv run ruff check python/ && uv run ruff format python/
```

Python 3.12, with numpy, scipy, pandas, matplotlib, seaborn and torch. Configured in the root
`pyproject.toml`. Nothing here is imported by the site — it exists so that code quoted in a note
can be run before it is quoted, and so the output shown to a reader is the output they will get.

## Convention

One file per note, named after it. Put the note's slug in the module docstring and say that the
printed output is quoted verbatim, so whoever changes one knows to rerun the other.

Keep the demos runnable end to end with no arguments and no downloads. A note is not worth much if
its example needs a dataset the reader does not have.

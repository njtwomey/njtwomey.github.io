"""Measure the shape of prose against the reference numbers below.

    uv run python/tools/prose_stats.py                  # the reference corpus
    uv run python/tools/prose_stats.py path/to/file.mdx # something you have written

The house style asks for complete, often subordinated sentences, and the easiest
way to tell whether a draft has drifted into clipped LinkedIn cadence is to
count. The reference corpus averages about 25 words per sentence, with only a
twentieth of them under eight words. A draft sitting well below that is being
chopped up rather than written.

The bound runs the other way too. A draft averaging well above the reference,
with most of its sentences past thirty words, has stopped varying its rhythm and
reads as uniformly as a chopped-up one does, so both ends are warned about.

This measures shape, not quality. Passing it does not make the writing good, but
failing it reliably means something has gone wrong.
"""

import argparse
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / "content" / "notes"


def prose(markdown: str) -> str:
    """Strip everything that is not the author writing sentences."""
    body = markdown.split("---", 2)[-1] if markdown.lstrip().startswith("---") else markdown
    body = re.sub(r"```.*?```", " ", body, flags=re.S)  # fenced code
    body = re.sub(r"\$\$.*?\$\$", " X ", body, flags=re.S)  # display maths
    body = re.sub(r"\{%.*?%\}", " ", body, flags=re.S)  # leftover liquid
    body = re.sub(r"<[^>]+>", " ", body)  # jsx and inline html
    body = re.sub(r"^\s*\d+\.\s", " ", body, flags=re.M)  # list markers
    body = re.sub(r"^\s*[-*]\s", " ", body, flags=re.M)
    return body


def sentences(text: str) -> list[int]:
    lengths = []
    for candidate in re.split(r"(?<=[.!?])\s+(?=[A-Z(])", text):
        words = candidate.split()
        if len(words) >= 3 and not candidate.lstrip().startswith(("#", "|")):
            lengths.append(len(words))
    return lengths


def report(label: str, lengths: list[int]) -> None:
    if not lengths:
        print(f"{label}: no prose found")
        return

    lengths = sorted(lengths)
    n = len(lengths)
    short = sum(1 for length in lengths if length < 8) / n
    long_ = sum(1 for length in lengths if length > 30) / n

    print(f"{label}")
    print(f"  sentences   {n}")
    print(f"  mean        {statistics.mean(lengths):.1f} words")
    print(f"  median      {statistics.median(lengths):.0f}")
    print(f"  p10 / p90   {lengths[int(n * 0.10)]} / {lengths[int(n * 0.90)]}")
    print(f"  under 8     {short:.0%}   (reference: 5%)")
    print(f"  over 30     {long_:.0%}   (reference: 25%)")

    mean = statistics.mean(lengths)

    if short > 0.15:
        print("  WARNING: too many very short sentences. This is the clipped LinkedIn cadence")
        print("           the house style bans. Join the thoughts into real sentences rather")
        print("           than stringing fragments together.")

    if mean > 30 or long_ > 0.35:
        print("  WARNING: the sentences run long and uniform. Uniform length reads as mechanical")
        print("           whichever length you pick, so break some of the clauses out and let")
        print("           the shorter ones stand rather than shortening everything.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path, help="files to measure; default is the reference corpus")
    args = parser.parse_args()

    if not args.paths:
        lengths = [length for f in sorted(REFERENCE.glob("*/index.mdx")) for length in sentences(prose(f.read_text()))]
        report("content/notes (the shipped voice)", lengths)
        return 0

    for path in args.paths:
        report(str(path), sentences(prose(path.read_text())))
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())

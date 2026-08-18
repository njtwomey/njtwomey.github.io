import { Search, X } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "@/components/page";
import { Paper } from "@/components/paper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { groupByYear, KIND_LABEL, kinds, publications, search, type PublicationKind } from "@/lib/publications";

/**
 * Filter state lives in the URL, so a filtered view can be linked to, bookmarked
 * and reloaded — "everything I have published at a workshop" is a URL rather
 * than a sequence of clicks someone has to repeat.
 */
function useFilters() {
  const [params, setParams] = useSearchParams();

  const query = params.get("q") ?? "";
  const kind = (params.get("kind") ?? "") as PublicationKind | "";

  const update = React.useCallback(
    (next: { q?: string; kind?: string }) => {
      setParams(
        (current) => {
          const draft = new URLSearchParams(current);
          for (const [key, value] of Object.entries(next)) {
            if (value) draft.set(key, value);
            else draft.delete(key);
          }
          return draft;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { query, kind, update, active: Boolean(query || kind) };
}

export function Publications() {
  const { query, kind, update, active } = useFilters();

  // The field is local and commits to the URL after a pause: filter state in the
  // URL is right for linkability, but re-running the search on every keystroke
  // through fifty entries and their abstracts is visible as lag while typing.
  const [draft, setDraft] = React.useState(query);
  React.useEffect(() => setDraft(query), [query]);
  React.useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(() => update({ q: draft }), 150);
    return () => clearTimeout(timer);
  }, [draft, query, update]);

  const results = React.useMemo(() => {
    const byKind = kind ? publications.filter((p) => p.kind === kind) : publications;
    return search(byKind, query);
  }, [kind, query]);

  const grouped = React.useMemo(() => groupByYear(results), [results]);

  // No contents rail. It listed the years, which is the one thing the page
  // already says in a heading every few papers, so it was a second copy of the
  // scroll position rather than a way of finding anything. A rail earns its
  // margin where the sections are named things a reader is choosing between;
  // a column of numbers is neither.
  return (
    <Page title="Publications" lede="These papers cover the range of areas I have worked in firsthand.">
      {/*
        The lede says what a list of papers cannot say about itself, which is
        that the spread of subjects across it is firsthand range rather than a
        wandering interest. It replaced a sentence explaining that the page was
        a searchable list of publications, which was a fold's worth of height
        spent telling people what they could already see.

        The controls stick under the site header, because the page is sixty
        entries long and a search field that has scrolled off the top is a
        search field you have to scroll back to before you can use it. `top-14`
        is the header's own 56px height, and `z-30` puts the bar above the cards
        passing under it while leaving the header's `z-40` above everything. The
        translucent background and the blur are the header's, so the two read as
        one stack rather than as two bars that happen to be adjacent, and the
        bar is opaque enough that nothing ghosts through it.

        The negative inset is the page's own horizontal padding, which makes the
        bar the full width of the column. It has to be at least as wide as the
        paper rows below, and those bleed past the text column by `-mx-4
        sm:-mx-5` of their own so that a hover background is not boxed in.
      */}
      <div className="bg-background/80 sticky top-14 z-30 -mx-5 mb-6 border-b px-5 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        {/* Two controls, search then kind. There was a third, a BibTeX download
            button on the end, and it was furniture: the whole bibliography is
            still published at `publications.bib` for anyone who wants it, and a
            reader who wants one entry's record has the BibTeX toggle on the card
            itself. `flex-1` on the field means it takes the width the button was
            using rather than leaving a hole where it stood. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search titles, authors, venues…"
              aria-label="Search publications"
              className="h-9 pl-9"
            />
          </div>

          {/* `spacing={0}` turns the group into a segmented control: the items
              share their borders and only the two ends are rounded. Five separate
              pills read as five unrelated buttons, whereas one joined bar reads as
              a single choice, which is what it is. Heights are pinned to match the
              search field beside it. */}
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(value) => update({ kind: value })}
            variant="outline"
            size="sm"
            spacing={0}
            className="h-9 *:h-9"
            aria-label="Filter by kind"
          >
            {kinds.map((option) => (
              <ToggleGroupItem key={option} value={option} className="px-3 text-xs">
                {KIND_LABEL[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Inside the bar rather than under it. It appears only while a filter
            is on, and while one is on, Clear is the counterpart of the field
            that set it: carrying the search down the page and leaving the way
            out of it at the top would be half a job. It costs the bar no height
            the rest of the time, because "61 of 61" is not information and the
            row is absent. */}
        {active && (
          <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs" role="status" aria-live="polite">
            <span className="tabular-nums">
              {results.length} of {publications.length} {publications.length === 1 ? "entry" : "entries"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-6 gap-1 px-1.5 text-xs"
              onClick={() => update({ q: "", kind: "" })}
            >
              <X className="size-3" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          Nothing matches those filters.
        </p>
      ) : (
        <div className="space-y-9">
          {/* Two offsets decide where `#year-2019` lands, and they add up:
              `scroll-padding-top: 5rem` on `html` in index.css, plus the
              `scroll-mt` below. 80px + 96px used to put a heading 176px down a
              page whose only sticky thing was the 57px header, which is a hole
              rather than a margin. The stack is now that header and the 61px
              controls bar, so 80px + 56px puts the heading 19px clear of the
              bar's bottom edge: enough to read as a gap, too little for the
              tail of the previous year to show through it. */}
          {grouped.map(([year, items]) => (
            <section key={year} id={`year-${year}`} className="scroll-mt-14">
              <h2 className="text-muted-foreground mb-1 border-b pb-1.5 text-sm font-medium tracking-wide tabular-nums">
                {year}
              </h2>
              {/* Negative inset so a paper's hover background bleeds past the
                  text column rather than boxing it in. */}
              <div className="-mx-4 sm:-mx-5">
                {items.map((paper) => (
                  <Paper key={paper.key} id={paper.key} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

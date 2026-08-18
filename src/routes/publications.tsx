import { Download, Search, X } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "@/components/page";
import { ContentsRail } from "@/components/contents-rail";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
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
  const sections = React.useMemo(
    () => grouped.map(([year, items]) => ({ id: `year-${year}`, label: String(year), meta: items.length })),
    [grouped],
  );
  // Named apart from the `active` above, which is about the filters.
  const currentYear = useScrollSpy(React.useMemo(() => sections.map((section) => section.id), [sections]));

  return (
    <Page title="Publications" left={<ContentsRail items={sections} active={currentYear} label="Jump to year" />}>
      {/*
        One row, no explanatory lede. The page is a list of papers with a search
        box on it, which is legible without being told, and the sentence
        describing it was costing a fold's worth of height on the thing people
        came for. The controls read left to right as narrow, narrower, take it
        away: search, then kind, then download.
      */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

        <Button asChild variant="outline" size="sm" className="text-muted-foreground h-9 gap-1 px-2.5 text-xs">
          <a href={`${import.meta.env.BASE_URL}publications.bib`} download title="Download the whole bibliography">
            <Download className="size-3.5" />
            <span className="sr-only sm:not-sr-only">BibTeX</span>
          </a>
        </Button>
      </div>

      {/* Shown only while filtering. "61 of 61" is not information, and it was
          costing a whole line to say nothing. */}
      {active && (
        <div
          className="text-muted-foreground -mt-3 mb-5 flex items-center gap-2 text-xs"
          role="status"
          aria-live="polite"
        >
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

      {grouped.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          Nothing matches those filters.
        </p>
      ) : (
        <div className="space-y-9">
          {grouped.map(([year, items]) => (
            <section key={year} id={`year-${year}`} className="scroll-mt-24">
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

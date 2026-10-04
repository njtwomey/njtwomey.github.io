import { ChevronRight } from "lucide-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { ORG_YEARS, type Depth, type Pillar, bands, orgs, pillars } from "@/content/practice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The practice matrix, as pillars that open.
 *
 * The version this replaced put 53 rows and 265 cells on one surface, four
 * screens of it, with no summary and no way in. Everything was equally
 * prominent, so a reader had to do all the aggregating themselves.
 *
 * Here a pillar is shut by default and carries its own row of dots, each one
 * the strongest rating anywhere inside it. That makes the closed page a matrix
 * in its own right: ten rows against five organisations, readable in one
 * screen, answering "what is he strongest at and where" before anything is
 * clicked. Opening a pillar exchanges that summary for the rows it was
 * computed from, under the subcategories that group them. The summary and the
 * detail use one visual language, so the closed state is not a teaser for the
 * open one. It is the same claim at lower resolution.
 *
 * A real table, one `<tbody>` per pillar.
 *
 * The first version was a CSS grid, on the reasoning that a table cannot hide
 * rows without hiding a cell's column. That was wrong: a table may hold any
 * number of `<tbody>` elements and collapsing one is a matter of not rendering
 * its rows. The grid cost the caption, the column and row scopes, and with them
 * the whole navigation model a screen reader user has for a grid of numbers,
 * and nothing was gained for it.
 *
 * An empty cell is empty. The previous version drew a hollow ring for "not
 * worked in", 109 of its 265 marks spent saying no, and at 6px against a 6px
 * filled dot that was also the weakest distinction on the page carrying the
 * most important difference. Nothing reads as nothing.
 */

const DOT: Record<Depth, string> = {
  3: "bg-primary size-3",
  2: "bg-primary size-2",
  1: "bg-primary size-1.5",
};

/**
 * The key, and the words a screen reader hears in every cell.
 *
 * They read as a ladder on purpose, from a part of the job down to a thing
 * done inside it, because the thing being graded is how much of the role this
 * was rather than how well it went. "Main focus" was the old top of the scale
 * and it overclaimed: a job can have several cores and only one focus.
 */
const DEPTH_LABEL: Record<Depth, string> = {
  3: "core to the role",
  2: "a regular part of it",
  1: "worked on it",
};

/** The anchor on a pillar's header row. */
const anchor = (pillar: string) => `pillar-${pillar}`;

/**
 * Where the live page's anchors land once the themes behind them are gone.
 *
 * `/practice#theme-building-and-shipping` and nine siblings were live before
 * this cut, which dissolved every theme they name. The mapping is lossy by nature: an
 * old theme can split across two pillars and the nearest is the best on offer.
 * It still beats a link resolving to nothing and leaving the reader at the top
 * of the page wondering what it was for, which is the failure `ScrollOnNavigate`
 * was written for in the first place.
 */
const LEGACY_ANCHORS: Record<string, string> = {
  "theme-learning-signal": "limited-labels",
  "theme-what-is-modelled": "probabilistic",
  "theme-data-and-interaction": "limited-labels",
  "theme-output-structure": "probabilistic",
  "theme-search-and-language": "retrieval",
  "theme-signals-and-sensing": "multimodal",
  "theme-building-and-shipping": "shipping",
  "theme-measurement-and-evidence": "evaluation",
  "theme-developing-people": "leading",
  "theme-strategy-and-influence": "leading",
};

/** The strongest rating anywhere in a pillar, per organisation. */
function summarise(pillar: Pillar): Partial<Record<string, Depth>> {
  const out: Partial<Record<string, Depth>> = {};
  for (const sub of pillar.subcategories) {
    for (const row of sub.rows) {
      for (const [org, depth] of Object.entries(row.depths)) {
        if (depth && (out[org] ?? 0) < depth) out[org] = depth as Depth;
      }
    }
  }
  return out;
}

/** One row of dots, as table cells. */
function Cells({ depths, label }: { depths: Partial<Record<string, Depth>>; label: string }) {
  return (
    <>
      {orgs.map((org) => {
        const depth = depths[org.key];
        return (
          <td key={org.key} className="py-1 text-center">
            {depth ? <span aria-hidden className={cn("inline-block rounded-full", DOT[depth])} /> : null}
            <span className="sr-only">
              {label}, {org.short}: {depth ? DEPTH_LABEL[depth] : "not worked in"}
            </span>
          </td>
        );
      })}
    </>
  );
}

/**
 * The left column, which stays put while the table scrolls sideways.
 *
 * Below 640px five columns of dots do not fit beside a capability name, and a
 * row of dots with its label scrolled off is unreadable.
 */
const STICKY = "bg-background sticky left-0 z-10";

function PillarBody({ pillar, open, onToggle }: { pillar: Pillar; open: boolean; onToggle: (id: string) => void }) {
  const summary = summarise(pillar);

  return (
    <tbody>
      <tr>
        <th scope="row" className={cn(STICKY, "scroll-mt-28 py-1 pr-3 text-left align-middle")} id={anchor(pillar.id)}>
          <button
            type="button"
            onClick={() => onToggle(pillar.id)}
            aria-expanded={open}
            className="group hover:text-primary -ml-1 flex w-full items-center gap-1.5 py-1 text-left transition-colors"
          >
            <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
            <span className="text-sm font-medium">{pillar.label}</span>
          </button>
        </th>

        {/* The closed pillar's own dots. Dropped when open, because the rows
            below then carry the same information at full resolution and two
            sets of dots in one column reads as a total the page never claimed. */}
        {open ? (
          <td colSpan={orgs.length} />
        ) : (
          <Cells depths={summary} label={`${pillar.label}, strongest anywhere inside`} />
        )}
      </tr>

      {open &&
        pillar.subcategories.map((sub) => (
          <React.Fragment key={sub.label}>
            <tr>
              <th
                scope="colgroup"
                colSpan={orgs.length + 1}
                className={cn(
                  STICKY,
                  "text-muted-foreground/70 pt-3 pb-1 pl-5 text-left text-[0.7rem] font-medium tracking-wide uppercase",
                )}
              >
                {sub.label}
              </th>
            </tr>
            {sub.rows.map((row) => (
              <tr key={row.slug}>
                <th scope="row" className={cn(STICKY, "py-1 pr-3 pl-5 text-left align-middle font-normal")}>
                  {/* The definition is on the title rather than the whole cell,
                      so the hover target is the words it explains. A dotted
                      underline is the one convention a reader already reads as
                      "there is more here", and it costs no space in a column
                      that has none to spare. */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground decoration-muted-foreground/40 cursor-help text-sm underline decoration-dotted underline-offset-4">
                        {row.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" className="max-w-xs text-xs leading-relaxed">
                      {row.what}
                    </TooltipContent>
                  </Tooltip>
                </th>
                <Cells depths={row.depths} label={row.title} />
              </tr>
            ))}
          </React.Fragment>
        ))}
    </tbody>
  );
}

export function PracticePillars() {
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set());
  const { hash } = useLocation();

  const toggle = React.useCallback((id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  /**
   * A link to a pillar opens it.
   *
   * Without this, collapsing introduces a bug the flat page could not have:
   * following an anchor scrolls to a heading with nothing under it, which reads
   * as a broken link rather than as a shut section.
   */
  React.useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const target = LEGACY_ANCHORS[id] ?? (id.startsWith("pillar-") ? id.slice("pillar-".length) : undefined);
    if (!target || !pillars.some((pillar) => pillar.id === target)) return;
    setOpen((current) => (current.has(target) ? current : new Set(current).add(target)));
    document.getElementById(anchor(target))?.scrollIntoView();
  }, [hash]);

  return (
    <section aria-labelledby="pillars-heading">
      <h2 id="pillars-heading" className="sr-only">
        Capabilities
      </h2>

      {/* `max-sm:` rather than a plain `overflow-x-auto`. An element with
          `overflow-x: auto` is a scroll container on both axes whichever one you
          asked for, and a sticky child then sticks to it rather than to the
          page, so the floating header never floats. Confining the scroll
          container to the one width that needs it keeps the header everywhere
          else. Same call, and the same reason, as the live matrix. */}
      <div className="max-sm:overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Capabilities against the organisations they ran at, grouped into pillars that open. Each cell says how much
            of that job the capability was, from worked on it through a regular part of it to core to the role. A pillar
            that is shut shows the strongest rating anywhere inside it. An empty cell means it did not run there.
          </caption>

          {/* `top-14` is the height of the site header, which is itself sticky,
              so the two stack rather than overlap. */}
          <thead>
            <tr>
              <th scope="col" className={cn(STICKY, "top-14 z-30 w-[9rem] border-b pb-2 sm:w-64")}>
                <span className="sr-only">Capability</span>
              </th>
              {orgs.map((org) => (
                <th
                  key={org.key}
                  scope="col"
                  className="bg-background sticky top-14 z-20 w-14 border-b pb-2 align-bottom sm:w-24"
                >
                  <span className="flex flex-col items-center gap-0 px-0.5 py-1 text-center">
                    <span className="text-foreground text-[0.65rem] font-medium sm:text-xs">{org.short}</span>
                    {/* The years, because a column that says only where is a
                        claim with no date on it. */}
                    <span className="text-muted-foreground/70 text-[0.6rem] tabular-nums">{ORG_YEARS[org.key]}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {bands.map((band) => (
            <React.Fragment key={band.id}>
              <tbody>
                <tr>
                  <th scope="colgroup" colSpan={orgs.length + 1} className={cn(STICKY, "pt-7 pb-1 text-left")}>
                    <span className="text-foreground text-base font-semibold tracking-tight">{band.label}</span>
                  </th>
                </tr>
              </tbody>
              {pillars
                .filter((pillar) => pillar.band === band.id)
                .map((pillar) => (
                  <PillarBody key={pillar.id} pillar={pillar} open={open.has(pillar.id)} onToggle={toggle} />
                ))}
            </React.Fragment>
          ))}
        </table>
      </div>

      <p className="text-muted-foreground mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.7rem]">
        {([3, 2, 1] as Depth[]).map((depth) => (
          <span key={depth} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block rounded-full", DOT[depth])} />
            {DEPTH_LABEL[depth]}
          </span>
        ))}
        {/* No swatch. An invisible box beside the words reads as a gap in the
            legend rather than as the absence it is naming. */}
        <span className="border-border/70 rounded-sm border border-dashed px-1.5 py-0.5">blank: not worked in</span>
      </p>
    </section>
  );
}

import { Page } from "@/components/page";
import { ORG_YEARS, career, orgs } from "@/content/practice";

/**
 * Where the work happened, and for how long.
 *
 * The third page under Experience, and the one that orients the other two.
 * `/practice` says what the capabilities are and `/technologies` what they ran
 * on, but neither says where anybody was or when, so a reader arriving at the
 * matrix met five column headings with no idea what they were.
 *
 * Deliberately thin. One line each, no bullet lists of achievements, no job
 * titles beyond the current one. A reader wanting the detail has two pages of
 * it a click away, and a timeline that tries to carry the detail as well stops
 * being a timeline.
 *
 * The lede carries two facts and no shape. A count of years would have to be
 * corrected every January, and anything describing the arc of the thing is
 * doing a job the list under it does better.
 *
 * Most recent first, which is the opposite of the matrix's columns. The matrix
 * reads left to right because it is showing a progression across a career; this
 * page is answering "who is this and what are they doing now", and the answer
 * to that is at the top.
 */

/** The years a range covers, as a phrase. Open-ended ranges run to this year. */
function duration(span: string): string {
  const [from = "", to] = span.split("–");
  const start = Number(from);
  // "2022–" means still there. A two-digit end is the same century as the start.
  const end = to ? Number(to.length === 2 ? from.slice(0, 2) + to : to) : new Date().getFullYear();
  const years = Math.max(1, end - start);
  return years === 1 ? "1 year" : `${years} years`;
}

/** Open-ended ranges read better with a word than with a dangling dash. */
const label = (span: string) => (span.endsWith("–") ? `${span}now` : span);

/** The separator between the facts on a heading line. Hidden, because a screen
 *  reader announcing "middot" four times a row is noise rather than structure. */
function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 text-xs">
      ·
    </span>
  );
}

/** The organisation an entry belongs to, for its name and where it was. */
const where = (key: string) => orgs.find((org) => org.key === key)!;

export function Career() {
  return (
    <Page
      title="Career"
      lede="Employment history since 2008."
      description="A short history of where the work happened: University College Cork, the University of Bristol, Cookpad, KidsLoop and Amazon."
    >
      {/* A rule down the left with a marker per entry, rather than a table,
          because the entries are one sequence rather than six independent
          facts and a line is what says so.

          The spacing is even and does not encode the durations. A scale was
          considered and does not work here: four of the six spells are a year
          or four, and at any scale that keeps their text readable they come
          out the same height, so only Bristol would look different and the
          page would imply a precision it was not drawing. The years are
          written on every row instead. */}
      <ol className="border-border/70 relative ml-2 space-y-9 border-l pl-7">
        {career.map((entry) => {
          const org = where(entry.org);
          // Only a split spell carries its own dates; everything else takes the
          // organisation's, so this page and the matrix columns cannot drift.
          const span = entry.years ?? ORG_YEARS[entry.org];

          return (
            <li key={`${entry.org}-${span}`} className="relative">
              {/* Sits on the rule rather than beside it. `bg-background` is what
                  makes it a bead on the line instead of a dot next to one. */}
              <span
                aria-hidden
                className="border-primary bg-background absolute top-1.5 -left-[calc(1.75rem+5px)] size-2.5 rounded-full border-2"
              />

              {/* One line, middot-separated throughout: place, title, dates,
                  length. They are four facts of the same kind about one job,
                  and spacing alone left them reading as a heading with loose
                  annotations trailing after it. */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className="text-base font-semibold tracking-tight">{org.name}</h2>

                {/* Mono, which is the only other face this site loads and is
                    already what the dates beside it are set in. It reads as a
                    label attached to the name rather than as the second half of
                    the heading, which is what a job title is: the name is the
                    place, and the title is what it says on a badge there. */}
                {entry.role && (
                  <>
                    <Dot />
                    <span className="text-muted-foreground font-mono text-[0.8rem] tracking-tight">{entry.role}</span>
                  </>
                )}

                <Dot />
                <span className="text-muted-foreground font-mono text-xs tabular-nums">{label(span)}</span>
                <Dot />
                <span className="text-muted-foreground/70 text-xs">{duration(span)}</span>
              </div>

              <p className="text-muted-foreground/80 mt-0.5 text-xs">{org.where}</p>

              <p className="text-muted-foreground mt-2 text-sm/7">{entry.what}</p>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}

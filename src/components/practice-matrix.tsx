import {
  Activity,
  ArrowLeftRight,
  Award,
  AudioLines,
  BookOpenCheck,
  Bot,
  Boxes,
  ChartSpline,
  ClipboardCheck,
  Compass,
  Cpu,
  Dices,
  Eye,
  FileText,
  FlaskConical,
  Footprints,
  Gavel,
  Gauge,
  GraduationCap,
  Hand,
  Handshake,
  HardHat,
  Images,
  Languages,
  LayoutDashboard,
  ListTree,
  type LucideIcon,
  Microscope,
  Network,
  Presentation,
  Radio,
  Rows3,
  Scale,
  Search,
  Shapes,
  Sigma,
  Sparkles,
  Spline,
  Split,
  Tags,
  Target,
  TrendingUp,
  ThumbsUp,
  Users,
  Waypoints,
  Workflow,
} from "lucide-react";
import { Fragment } from "react";
import type { ContentsItem } from "@/components/contents-rail";
import {
  type CapabilityIcon,
  coverage,
  type Depth,
  type Depths,
  families,
  orgs,
  type OrgKey,
  type Speciality,
  specialities,
  type Theme,
  themes,
} from "@/content/practice";
import { cn } from "@/lib/utils";

/**
 * Capabilities against the organisations they ran at.
 *
 * The relationship is many to many, so a list cannot show it: one capability
 * spans several places and one place covers several capabilities. A matrix
 * answers "what, and where" in about a screen, which is why this is the whole of
 * the ML Practice page.
 *
 * It lives here rather than in the route because the constants underneath, the
 * icon mapping and the column order, are shared by anything that renders a
 * capability at all.
 *
 * The rows do not link anywhere. They used to point at a detail page holding a
 * paragraph each, and both the page and the paragraphs are gone; the prose is
 * archived in `.scratch/domains/writeups.ts` and the reason it left is written
 * up at the top of `src/content/practice.ts`.
 */

/** Icon keys live in the content; the mapping to lucide lives beside the markup. */
export const ICONS: Record<CapabilityIcon, LucideIcon> = {
  unsupervised: Shapes,
  weak: Tags,
  rl: Target,
  // Preference is a comparison rather than a score, and a thumb is the one glyph
  // that reads as "this one over that one" without a chart in it.
  preference: ThumbsUp,
  generative: Sparkles,
  // A raised hand, because active learning is the learner asking.
  active: Hand,
  // Dice, for the exploration half of the explore-exploit trade.
  bandit: Dices,
  structured: ListTree,
  graph: Waypoints,
  agents: Bot,
  retrieval: Search,
  recommendation: Rows3,
  knowledge: Network,
  multilingual: Languages,
  crossmodal: Images,
  interfaces: LayoutDashboard,
  infrastructure: Workflow,
  efficiency: Cpu,
  deployment: HardHat,
  monitoring: Gauge,
  practice: GraduationCap,
  // A lectern, for the one place a course was designed and delivered.
  teaching: Presentation,
  careers: TrendingUp,
  methodology: BookOpenCheck,
  community: Users,
  strategy: Compass,
  // Two hands rather than a compass: this row is agreement with teams that do
  // not report to him, which is a different act from setting a direction.
  handshake: Handshake,
  executive: FileText,
  // A gavel, because the row is a judgement passed on someone else's work.
  judgement: Gavel,
  funding: Award,
  evaluation: ClipboardCheck,
  signals: Activity,
  audio: AudioLines,
  vision: Eye,
  sensors: Radio,
  timeseries: ChartSpline,
  behaviour: Footprints,
  probabilistic: Sigma,
  dynamics: Spline,
  representation: Boxes,
  transfer: ArrowLeftRight,
  datascience: Microscope,
  experimentation: Split,
  simulation: FlaskConical,
  responsible: Scale,
};

/**
 * Career order, earliest first. The content orders `orgs` that way already,
 * because a matrix column has to mean the same thing on every row.
 */
export const ORG_ORDER: OrgKey[] = orgs.map((org) => org.key);

/**
 * When each place ran, for the column headers. A column already says where; the
 * years say when, which is what turns a filled cell into a period of a working
 * life rather than a bare assertion. Bristol continues as an honorary position
 * after 2020, so the employed span is what is shown.
 */
export const ORG_YEARS: Record<OrgKey, string> = {
  ucc: "2008–13",
  bristol: "2013–20",
  cookpad: "2020–21",
  kidsloop: "2021–22",
  amazon: "2022–",
};

/** Full names are too wide for a pill row or a matrix header. */
export const ORG_SHORT: Record<OrgKey, string> = Object.fromEntries(orgs.map((org) => [org.key, org.short])) as Record<
  OrgKey,
  string
>;

/**
 * Every speciality's depths, flattened out of the grouped literal.
 *
 * `coverage` is nested by theme so that a hand edit cannot file a row under the
 * wrong heading, and the rows are rendered from a flat list, so something has to
 * bridge the two. Doing it once here beats indexing a union of exact records at
 * every call site.
 */
const DEPTHS = new Map<string, Depths>(Object.values(coverage).flatMap((group) => Object.entries(group)));

export type Row = {
  theme: Theme;
  slug: Speciality;
  title: string;
  icon: CapabilityIcon;
  depths: Depths;
};

/**
 * The specialities in theme order, with their theme's label attached.
 *
 * Built by walking the content array once and grouping, which is only tidy
 * because that array is kept in theme order. A stray entry filed out of place
 * still lands under its own heading, and reading the file makes that obvious.
 */
export const GROUPED = themes
  .map((theme) => ({
    ...theme,
    items: specialities
      .filter((speciality) => speciality.theme === theme.id)
      .map((speciality): Row => ({ ...speciality, depths: DEPTHS.get(speciality.slug) ?? {} })),
  }))
  .filter((theme) => theme.items.length > 0);

/** Row order, for anything that wants a speciality without its grouping. */
export const ROWS: Row[] = GROUPED.flatMap((theme) => theme.items);

/**
 * The themes under each family, in page order.
 *
 * The families are the answer to the page reading as eight arbitrary groups.
 * Methods, applications and practice are three different kinds of claim, and
 * without a band naming them a reader met the change of kind halfway down with
 * nothing to mark it. Built here rather than in the content because it is a
 * view of `themes` and not a second thing to keep in step with it.
 */
const FAMILIES = families
  .map((family) => ({ ...family, themes: GROUPED.filter((theme) => theme.family === family.id) }))
  .filter((family) => family.themes.length > 0);

/** The id on a theme's heading row, and the anchor the index links to. */
const anchor = (theme: Theme) => `theme-${theme}`;

/**
 * The page index: three family headings over nine theme links.
 *
 * Section level rather than row level. A rail listing all thirty-nine
 * capability titles is the table again in a narrower column, which navigates
 * nothing and doubles the reading. Nine themes under three families fits in the
 * margin without scrolling and says what the page holds before any of it has
 * been read, which is the whole job.
 *
 * Built here rather than in the route because the ids it points at are written
 * by the markup below, through the same `anchor`. An index assembled somewhere
 * else is an index that breaks silently the first time the prefix changes.
 */
export const SECTIONS: ContentsItem[] = FAMILIES.flatMap((family) =>
  family.themes.map((theme) => ({ id: anchor(theme.id), label: theme.label, group: family.label })),
);

/**
 * Three sizes for the three depths, and a ring for no involvement.
 *
 * A cell used to be on or off, which made a decade of in-home sensing look
 * identical to a passing involvement. Size carries the depth and the colour is
 * held constant, because varying both at once reads as two scales rather than
 * one.
 *
 * The empty cell is a hollow ring rather than a smaller dot. It was a 4px solid
 * dot against a 6px solid dot for "worked in it", which is a two-pixel
 * difference carrying the distinction the page makes most often, and at that
 * size nobody can see it. Solid against hollow is the same distinction in a
 * channel that survives a glance, and it keeps the five scan positions a row
 * needs.
 */
const DOT: Record<Depth, string> = {
  3: "bg-primary size-3",
  2: "bg-primary size-2",
  1: "bg-primary size-1.5",
};

const NO_DOT = "border-border size-1.5 border";

const DEPTH_LABEL: Record<Depth, string> = {
  3: "main focus",
  2: "recurring",
  1: "worked in it",
};

/** Read out in the same order as the dots, largest first. */
const LEGEND: Depth[] = [3, 2, 1];

export function CapabilityMatrix() {
  return (
    <section aria-labelledby="matrix-heading">
      {/* The section keeps a heading, and the heading is not shown. It read
          "Index" in small caps above the table, which was a label for the one
          thing on a page that has nothing else on it, and once the page grew a
          real index in the margin the same word was on screen twice meaning two
          different things. The h1 and the column names say what this is.

          No blurb here either, and no gloss under the family bands. Every
          version of both was an instruction on how to read the table, which is
          a job the table does for itself, and the reasoning behind the grouping
          is kept in the doc comments on `src/content/practice.ts` where it is
          useful to whoever edits the ratings. */}
      <h2 id="matrix-heading" className="sr-only">
        Capabilities
      </h2>

      {/* `max-sm:` rather than a plain `overflow-x-auto`, and the difference is
          the sticky header below. An element with `overflow-x: auto` is a scroll
          container on both axes, whichever axis you asked for, and a sticky child
          sticks to its container rather than to the page. The container is only
          as tall as the table, so it never scrolls vertically and the header
          never comes unstuck. Confining the scroll container to the one width
          that needs it gives a floating header everywhere else, at the cost of
          not having one below 640px, where the horizontal scroll matters more. */}
      <div className="max-sm:overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Capabilities against the organisations they ran at. Each cell says how much of that role the capability was,
            on a scale from worked in it to main focus, and an empty cell means it did not run there.
          </caption>
          {/* `top-14` is the height of the site header, which is itself sticky,
              so the two stack rather than overlap. */}
          <thead>
            <tr>
              <th scope="col" className="bg-background sticky top-14 left-0 z-30 w-[8rem] border-b pb-2 sm:w-52">
                <span className="sr-only">Capability</span>
              </th>
              {ORG_ORDER.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="bg-background sticky top-14 z-20 w-14 border-b pb-2 align-bottom sm:w-24"
                >
                  <span className="text-muted-foreground flex flex-col items-center gap-0 px-0.5 py-1 text-[0.65rem] leading-tight font-medium whitespace-normal sm:text-xs">
                    <span className="text-foreground">{ORG_SHORT[column]}</span>
                    {/* The years, because a column that says only where is a
                        claim without a date on it. They replaced a bare count of
                        filled rows, which sat in the same slot and read as a
                        span of years anyway, so the column was carrying one
                        number that looked like the other. */}
                    <span className="text-muted-foreground/70 text-[0.6rem] tabular-nums">{ORG_YEARS[column]}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {FAMILIES.map((family, index) => (
            <tbody key={family.id}>
              {/* The family band. Sentence case and full contrast against the
                  uppercase theme headings under it, so the two levels are told
                  apart by weight and case rather than by size alone. */}
              <tr>
                <th
                  scope="colgroup"
                  colSpan={1 + ORG_ORDER.length}
                  className={cn("pb-1 pl-1.5 text-left", index === 0 ? "pt-8" : "pt-14")}
                >
                  <span className="text-foreground block text-base font-semibold tracking-tight">{family.label}</span>
                </th>
              </tr>

              {family.themes.map((theme) => (
                <Fragment key={theme.id}>
                  {/* A heading row rather than a `<tbody>` gap, so the themes are
                      named in the matrix as well as in the rail. Carrying the
                      only rule in the table: with the per-row rules gone, one
                      line per theme reads as structure instead of as ruling.

                      Not sticky. Only the organisation names are worth following
                      down the page, and a second floating heading would eat the
                      top of the viewport on a laptop.

                      It carries the `id` the index jumps to, and `scroll-mt`
                      here has two sticky bars to clear rather than the one every
                      other anchored heading on the site has: the site header at
                      56px, and the table's own `top-14` column names on top of
                      it, which is 100px in all. The site's `scroll-padding-top`
                      is 80px and covers the first of those, so this adds the
                      difference. 28 rather than the 24 the year headings on the
                      publications page carry, which lands this label 116px clear
                      of the sticky stack against that page's 119px, so a link
                      into either lands the same. Measured in the browser, because the label sits
                      24px into its own `pt-6` and reasoning about that from the
                      class list is how it ends up hidden. */}
                  <tr>
                    <th
                      id={anchor(theme.id)}
                      scope="colgroup"
                      colSpan={1 + ORG_ORDER.length}
                      className="text-muted-foreground scroll-mt-28 border-b pt-6 pb-1.5 pl-1.5 text-xs font-semibold tracking-wide uppercase"
                    >
                      {theme.label}
                    </th>
                  </tr>
                  {theme.items.map((row) => {
                    const Icon = ICONS[row.icon];
                    return (
                      <tr key={row.slug} className="group/row">
                        <th
                          scope="row"
                          className="bg-background group-hover/row:bg-muted/50 sticky left-0 z-10 py-0.5 pr-2 font-normal transition-colors"
                        >
                          {/* Aligned to the top rather than the middle, because
                              half these titles wrap to two lines and a centred
                              icon then floats in the gutter between them instead
                              of sitting beside the first word. `mt-0.5` puts it
                              on the cap height of the first line rather than the
                              top of its box, which is what keeps a one-line row
                              looking right too. Same treatment as the contents
                              rail. */}
                          <span className="text-foreground flex items-start gap-2 px-1.5 py-2 text-sm leading-snug">
                            <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                            {row.title}
                          </span>
                        </th>

                        {ORG_ORDER.map((column) => {
                          const depth = row.depths[column];
                          return (
                            <td key={column} className="group-hover/row:bg-muted/50 text-center transition-colors">
                              <span
                                aria-hidden
                                className={cn("inline-block rounded-full", depth ? DOT[depth] : NO_DOT)}
                              />
                              <span className="sr-only">{depth ? DEPTH_LABEL[depth] : "not worked in"}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* The legend became compulsory the moment the dots stopped being one
          size, and it has to carry the empty state as well, because that is the
          value every unfilled cell on the page is asserting. It sits in the
          register of the column headers rather than of the prose, because it is
          a key and not a sentence. */}
      <ul className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.7rem]">
        {LEGEND.map((depth) => (
          <li key={depth} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block rounded-full", DOT[depth])} />
            {DEPTH_LABEL[depth]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className={cn("inline-block rounded-full", NO_DOT)} />
          not worked in
        </li>
      </ul>
    </section>
  );
}

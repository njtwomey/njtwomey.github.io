import {
  Activity,
  AudioLines,
  Bot,
  ChartSpline,
  Cpu,
  FlaskConical,
  Footprints,
  GraduationCap,
  HardHat,
  Images,
  LayoutDashboard,
  type LucideIcon,
  Microscope,
  Network,
  Radar,
  Radio,
  Rows3,
  Scale,
  Search,
  Sigma,
  Spline,
  Tags,
  Target,
  Workflow,
  X,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { capabilities, themes, type Capability, type CapabilityIcon, type Org } from "@/content/domains";
import { cn } from "@/lib/utils";

/**
 * Capabilities against the organisations they ran at.
 *
 * The relationship is many to many, so a list cannot show it: one capability
 * spans several places and one place covers several capabilities. A matrix
 * answers "what, and where" in about a screen, which is why this is the whole of
 * the domains page rather than an index above it.
 *
 * It lives here rather than in the route because two pages need it and because
 * the constants underneath, the icon mapping and the column order, are shared by
 * anything that renders a capability at all.
 */

/** Icon keys live in the content; the mapping to lucide lives beside the markup. */
export const ICONS: Record<CapabilityIcon, LucideIcon> = {
  agents: Bot,
  retrieval: Search,
  interfaces: LayoutDashboard,
  recommendation: Rows3,
  knowledge: Network,
  crossmodal: Images,
  audio: AudioLines,
  signals: Activity,
  timeseries: ChartSpline,
  novelty: Radar,
  dynamics: Spline,
  behaviour: Footprints,
  sensors: Radio,
  deployment: HardHat,
  rl: Target,
  simulation: FlaskConical,
  probabilistic: Sigma,
  weak: Tags,
  datascience: Microscope,
  responsible: Scale,
  efficiency: Cpu,
  infrastructure: Workflow,
  practice: GraduationCap,
};

/**
 * Career order, earliest first. The content file orders `orgs` by weight within
 * an entry, which is right there and wrong for a matrix column, where a column
 * has to mean the same thing on every row.
 */
export const ORG_ORDER: Org[] = ["University College Cork", "University of Bristol", "Cookpad", "KidsLoop", "Amazon"];

/** Full names are too wide for a pill row or a matrix header. */
export const ORG_SHORT: Record<Org, string> = {
  "University College Cork": "UCC",
  "University of Bristol": "Bristol",
  Cookpad: "Cookpad",
  KidsLoop: "KidsLoop",
  Amazon: "Amazon",
};

const COUNT_BY_ORG = new Map<Org, number>(
  ORG_ORDER.map((org) => [org, capabilities.filter((capability) => capability.orgs.includes(org)).length]),
);

/**
 * The capabilities in theme order, with their theme's label attached.
 *
 * Built by walking the content array once and grouping consecutive entries,
 * which is only correct because that array is kept in theme order. A stray entry
 * filed out of place would open a second run under a heading it already had,
 * which is visible immediately and better than silently sorting it into line.
 */
export const GROUPED = themes
  .map((theme) => ({ ...theme, items: capabilities.filter((capability) => capability.theme === theme.id) }))
  .filter((theme) => theme.items.length > 0);

export function CapabilityMatrix({
  rowHref,
  active,
}: {
  /**
   * Where a row goes when clicked. Omitted while the detail page is off, in
   * which case a row is plain text: a link to nothing is worse than no link, and
   * a row that looks clickable and is not gets clicked anyway.
   */
  rowHref?: (capability: Capability) => string;
  /** The capability being read, where a caller is tracking one. */
  active?: string;
}) {
  const [org, setOrg] = React.useState<Org | null>(null);

  return (
    <section aria-labelledby="matrix-heading">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="matrix-heading" className="text-muted-foreground text-[0.7rem] font-semibold tracking-widest uppercase">
          Index
        </h2>
        <p className="text-muted-foreground text-xs">
          {rowHref ? "Pick a row to read it, or a column to hold one place." : "Pick a column to hold one place."}
        </p>
        {org && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ml-auto h-6 gap-1 px-1.5 text-xs"
            onClick={() => setOrg(null)}
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* The label column is fixed and the five organisation columns are narrow,
          which overflows a little below about 400px. The first column is pinned
          so the row being read never loses its name meanwhile. */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Capabilities against the organisations they ran at. A filled cell means the capability ran there.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="bg-background sticky left-0 z-10 w-[9.5rem] pb-2 sm:w-64">
                <span className="sr-only">Capability</span>
              </th>
              {ORG_ORDER.map((column) => (
                <th key={column} scope="col" className="w-11 pb-2 align-bottom sm:w-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={org === column}
                    onClick={() => setOrg(org === column ? null : column)}
                    className={cn(
                      "h-auto w-full flex-col gap-0 px-0.5 py-1 text-[0.65rem] leading-tight font-medium whitespace-normal sm:text-xs",
                      org === column ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span>{ORG_SHORT[column]}</span>
                    <span className="text-muted-foreground/60 text-[0.6rem] tabular-nums">
                      {COUNT_BY_ORG.get(column)}
                    </span>
                  </Button>
                </th>
              ))}
            </tr>
          </thead>

          {GROUPED.map((theme) => (
            <tbody key={theme.id}>
              {/* A heading row rather than a `<tbody>` gap, so the themes are
                  named in the matrix as well as in the rail. Set at full contrast
                  against the muted rows beneath it, and carrying the only rule in
                  the table: with the per-row rules gone, one line per theme reads
                  as structure instead of as ruling.

                  Not sticky. The table only overflows on very narrow viewports,
                  and a heading that follows you sideways is more distracting than
                  useful. */}
              <tr>
                <th
                  scope="colgroup"
                  colSpan={1 + ORG_ORDER.length}
                  className="text-foreground border-b pt-7 pb-1.5 pl-1.5 text-xs font-semibold tracking-wide uppercase"
                >
                  {theme.label}
                </th>
              </tr>
              {theme.items.map((row) => {
                const Icon = ICONS[row.icon];
                const dimmed = org !== null && !row.orgs.includes(org);
                const reading = active === row.slug;
                const href = rowHref?.(row);
                const label = (
                  <>
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {row.title}
                  </>
                );
                return (
                  <tr key={row.slug} className={cn("group/row transition-opacity", dimmed && "opacity-35")}>
                    <th
                      scope="row"
                      className={cn(
                        "bg-background group-hover/row:bg-muted/50 sticky left-0 z-10 py-0.5 pr-2 font-normal transition-colors",
                        reading && "bg-muted",
                      )}
                    >
                      {href ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-auto w-full justify-start px-1.5 py-1.5 text-left text-[0.8rem] leading-snug whitespace-normal sm:text-sm",
                            reading ? "text-foreground font-medium" : "text-muted-foreground",
                          )}
                        >
                          <Link to={href} aria-current={reading ? "true" : undefined}>
                            {label}
                          </Link>
                        </Button>
                      ) : (
                        <span
                          className={cn(
                            "text-muted-foreground flex items-center gap-2 px-1.5 py-2 text-[0.8rem] leading-snug sm:text-sm",
                            reading && "text-foreground font-medium",
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </th>

                    {ORG_ORDER.map((column) => {
                      const present = row.orgs.includes(column);
                      return (
                        <td
                          key={column}
                          className={cn(
                            "group-hover/row:bg-muted/50 text-center transition-colors",
                            reading && "bg-muted",
                            org === column && "bg-accent/40",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "inline-block rounded-full",
                              present ? "bg-primary size-2.5" : "bg-border size-1",
                            )}
                          />
                          <span className="sr-only">{present ? "yes" : "no"}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

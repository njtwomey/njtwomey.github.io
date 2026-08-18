import { ArrowLeft, ChevronDown, FileText, List } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { ContentsDisclosure, ContentsGrid, ContentsRail } from "@/components/contents-rail";
import { GROUPED, ICONS, ORG_SHORT } from "@/components/domains-matrix";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type Capability, type Org } from "@/content/domains";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { publication } from "@/lib/publications";
import { cn } from "@/lib/utils";

/**
 * The write-up behind every row of the matrix.
 *
 * Off the live site for now: `DOMAINS_DETAIL` in `src/lib/flags.ts` gates both
 * this route and the links into it. The prose is current and worth keeping
 * compiled rather than commented out, which is why this is a flag rather than a
 * deletion.
 *
 * An entry is one paragraph and one evidence line. It was three sub-headed parts
 * cut out of a longer field, which turned every capability into a small form to
 * be filled in, and the trailing part in particular read as a footnote to the
 * claim above it rather than as half of the claim.
 */

const CONTENTS = GROUPED.flatMap((theme) =>
  theme.items.map((capability) => ({
    id: capability.slug,
    label: capability.title,
    icon: ICONS[capability.icon],
    group: theme.label,
  })),
);

const SECTION_IDS = CONTENTS.map((entry) => entry.id);

function OrgPills({ orgs, className }: { orgs: Org[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {orgs.map((org) => (
        <Badge key={org} variant="secondary" className="font-normal">
          {ORG_SHORT[org]}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Not places a paper was reviewed, so they sort last whatever they hold.
 *
 * Ordering purely by how many papers each venue has put arXiv ahead of ICLR and
 * SIGIR on several entries, which reads as the weakest claim available. They
 * still appear, because dropping them would make the count disagree with the
 * venues beside it.
 */
const UNREVIEWED = new Set(["arXiv", "PhD thesis"]);

/**
 * The evidence line: how many papers a capability has behind it, and where they
 * appeared.
 *
 * Derived from citation keys rather than written out, so it cannot drift from
 * the bibliography. Venues are ordered by how many papers each holds and then
 * capped, because the point is to establish that the work was reviewed somewhere
 * real, not to reproduce the publications page.
 */
function evidence(keys: string[] | undefined, limit = 4) {
  const papers = (keys ?? []).map((key) => publication(key)).filter((paper) => paper !== undefined);
  if (papers.length === 0) return null;

  const counts = new Map<string, number>();
  for (const paper of papers) {
    if (paper.venueShort) counts.set(paper.venueShort, (counts.get(paper.venueShort) ?? 0) + 1);
  }
  const venues = [...counts.entries()]
    .sort((a, b) => Number(UNREVIEWED.has(a[0])) - Number(UNREVIEWED.has(b[0])) || b[1] - a[1])
    .map(([venue]) => venue);

  return { count: papers.length, venues: venues.slice(0, limit), more: Math.max(0, venues.length - limit) };
}

/**
 * How you can check it: how much was published, and where.
 *
 * One quiet line rather than a bordered block. Setting it off as a quotation
 * made the strongest fact on the entry look like an afterthought pinned to the
 * bottom, so it is now typeset as what it is, a citation. A capability with no
 * papers shows nothing here, which is itself informative on a page mixing
 * published research with production work that was never written up.
 */
function Evidence({ capability }: { capability: Capability }) {
  const papers = evidence(capability.papers);
  if (!papers) return null;

  return (
    <p className="text-muted-foreground mt-3 flex items-baseline gap-1.5 text-sm">
      <FileText aria-hidden className="size-3.5 shrink-0 translate-y-0.5" />
      <span>
        <span className="text-foreground font-medium tabular-nums">
          {papers.count} {papers.count === 1 ? "paper" : "papers"}
        </span>{" "}
        at {papers.venues.join(", ")}
        {papers.more > 0 && ", among others"}
      </span>
    </p>
  );
}

function MethodChips({ methods }: { methods: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {methods.map((method) => (
        <li key={method}>
          <Badge variant="outline" className="text-muted-foreground font-normal">
            {method}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** The small uppercase seam that gives a long entry somewhere to breathe. */
function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="text-muted-foreground text-[0.7rem] font-semibold tracking-widest uppercase">{label}</h4>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * The overview for viewports with no margin to put a rail in. The titles sit in
 * two columns inside a collapsible, which is why this is worth having here and
 * not on the year-grouped pages, where the headings are already visible in the
 * content.
 */
function ContentsFallback() {
  return (
    <ContentsDisclosure marginWidth="wide">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="group/toc w-full justify-start gap-2">
            <List className="size-3.5" />
            Contents
            <Badge variant="secondary" className="ml-auto font-normal tabular-nums">
              {CONTENTS.length}
            </Badge>
            <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/toc:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ContentsGrid items={CONTENTS} />
        </CollapsibleContent>
      </Collapsible>
    </ContentsDisclosure>
  );
}

export function DomainsDetail() {
  const active = useScrollSpy(SECTION_IDS);

  return (
    <Page
      title="Domains in detail"
      lede="What each capability involved, and what there is to check it against."
      left={<ContentsRail items={CONTENTS} active={active} heading="On this page" label="Capabilities" />}
      marginWidth="wide"
    >
      <Link
        to="/domains"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to the index
      </Link>

      <ContentsFallback />

      {GROUPED.map((theme) => (
        <section key={theme.id} aria-labelledby={`theme-${theme.id}`}>
          <h2
            id={`theme-${theme.id}`}
            className="text-muted-foreground mt-14 mb-8 border-b pb-2 text-[0.7rem] font-semibold tracking-widest uppercase"
          >
            {theme.label}
          </h2>

          <div className="space-y-14">
            {theme.items.map((capability) => {
              const Icon = ICONS[capability.icon];
              return (
                <section key={capability.slug} id={capability.slug} className="scroll-mt-24">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
                      {capability.title}
                    </h3>
                    {capability.period && (
                      <span className="text-muted-foreground text-xs tabular-nums">{capability.period}</span>
                    )}
                  </div>

                  <OrgPills orgs={capability.orgs} className="mt-3" />

                  <p className="text-foreground/90 mt-4 text-[0.95rem]/7">{capability.did}</p>
                  <Evidence capability={capability} />

                  <Part label="Methods">
                    <MethodChips methods={capability.methods} />
                  </Part>
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </Page>
  );
}

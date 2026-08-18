import { ChevronDown } from "lucide-react";
import * as React from "react";
import { ContentsDisclosure, ContentsGrid, ContentsRail } from "@/components/contents-rail";
import { Page } from "@/components/page";
import { CapabilityMatrix, SECTIONS } from "@/components/practice-matrix";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useScrollSpy } from "@/hooks/use-scroll-spy";

/**
 * The matrix, on its own.
 *
 * This page used to carry the matrix and then a write-up per capability
 * underneath it, which was more page than anyone reads and buried the one thing
 * that is legible at a glance. The write-ups were then moved to a detail route
 * behind a flag, which was worse: the route was unregistered and the prose
 * shipped to every visitor anyway, because the matrix imported the module it
 * lived in. It is now out of the compiled tree altogether and archived in
 * `.scratch/domains/writeups.ts`, so a row here is plain text.
 *
 * The tooling used to sit under the matrix as four rows of pills. It is a page
 * of its own now, at `/technologies`, because a claim about having used a tool
 * and a claim about having owned a capability are different claims and a reader
 * who cannot tell them apart trusts neither.
 *
 * It was called Domains until the title stopped matching what the matrix says:
 * the rows are methods, applications and delivery rather than fields of study.
 * `/domains` redirects to `/practice` in `App.tsx`.
 *
 * One line of lede, and it is not a description of the table. There was a lede
 * naming what the columns were, and under it a paragraph naming the three
 * capabilities the work centres on, and both were rejected for explaining a
 * table that explains itself. What the line says instead is the one thing the
 * grid cannot say about itself, which is that the rows are firsthand rather
 * than a reading list. That distinction is the whole difference between this
 * page and `/technologies`, where the claim is deliberately weaker.
 *
 * `description` still carries the longer sentence, because a search result has
 * no table underneath it and does need the columns explained.
 */

/** Stable across renders, because `SECTIONS` is a module constant. */
const SECTION_IDS = SECTIONS.map((section) => section.id);

export function Practice() {
  const active = useScrollSpy(SECTION_IDS);
  const [open, setOpen] = React.useState(false);

  return (
    <Page
      title="ML Practice"
      lede="Every row here is an area I have worked in firsthand."
      description="Each row is a machine learning capability, each column an organisation I worked at, and the dot says how much of that role it was."
      marginWidth="wide"
      left={<ContentsRail items={SECTIONS} active={active} label="Jump to section" />}
    >
      {/* Below 1440px there is no margin to put the rail in, and the table is
          long enough that its nine headings are the only way to see what the
          page holds without scrolling all of it. Collapsed by default, because
          on the narrower screens this appears on the matrix itself is what the
          reader came for. */}
      <ContentsDisclosure marginWidth="wide">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="text-muted-foreground group h-8 gap-1.5 px-2.5 text-xs">
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              Contents
            </Button>
          </CollapsibleTrigger>
          {/* Following a link closes the box, so a reader is not left with nine
              headings between them and the row they jumped to. */}
          <CollapsibleContent onClick={() => setOpen(false)}>
            <ContentsGrid items={SECTIONS} />
          </CollapsibleContent>
        </Collapsible>
      </ContentsDisclosure>

      <CapabilityMatrix />
    </Page>
  );
}

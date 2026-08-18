import { ChevronDown } from "lucide-react";
import * as React from "react";
import { ContentsDisclosure, ContentsGrid, ContentsRail } from "@/components/contents-rail";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type TechnologyGroup, technologies } from "@/content/technologies";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { cn } from "@/lib/utils";

/**
 * The tooling, one row per group, under a band per family.
 *
 * Filled pills against outlined ones, and nothing else. The emphasis is the
 * only reason a page of five hundred names is readable at all: it gives a
 * reader a foothold in each row without asking them to read the row. Which
 * names get one is a content decision and lives in `@/content/technologies`,
 * where it is checked against that group's own items at compile time.
 *
 * What a row shows by default is the same kind of decision and lives in the
 * same place: each group names a `core`, and everything else in it is behind a
 * per-group disclosure at the end of the pill run. Per group rather than one
 * switch for the page, because a reader expands the one row they care about and
 * a page-wide toggle would put them back in front of the wall.
 *
 * What the fill means is a legend under the table rather than a sentence above
 * it, in the same register as the matrix's dot legend on the ML Practice page.
 * A key belongs next to the thing it is a key for, and stating it in the lede
 * made the page open by explaining itself.
 *
 * No rules between the rows. They were there to separate the groups and the
 * space does that on its own, and against pills a full-width rule every few
 * lines reads as ruling rather than as structure. Same call as the matrix.
 *
 * A table rather than a definition list because the group name is a row header
 * with a value beside it, which is what `<th scope="row">` says and what a
 * screen reader announces before the pills that follow it. Each family is its
 * own `<tbody>`, so the band above it is a heading for those rows rather than a
 * row that happens to sit before them.
 */

/**
 * The anchor for a group, derived rather than written down, so renaming a group
 * moves its rail entry and its target together and cannot leave one behind.
 */
const slug = (group: string) =>
  group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * One entry per row of the table, filed under its family.
 *
 * `ContentsRail` groups consecutive entries sharing a `group`, which is the
 * same adjacency the table bands rely on, and both come from the order of the
 * content itself rather than from anything either of them decides.
 */
const SECTIONS = technologies.flatMap((family) =>
  family.groups.map((group) => ({ id: slug(group.group), label: group.group, group: family.family })),
);
const SECTION_IDS = SECTIONS.map((section) => section.id);

/**
 * The groups that have anything to reveal, by anchor.
 *
 * Derived rather than assumed, because a group whose core is all of it renders
 * no disclosure at all, and "expand all" must not then be a control that claims
 * to have opened something that was never shut.
 */
const EXPANDABLE = technologies.flatMap((family) =>
  family.groups.filter((group) => group.items.length > group.core.length).map((group) => slug(group.group)),
);

/**
 * One group's row: its name, its core pills, and the control that reveals the
 * rest of them.
 *
 * A component per row rather than a map in the table, because a row is a lot of
 * markup and reading the table is easier when it is one call. The open state is
 * *not* held here: it lives in the page, as a set of the anchors that are open,
 * so that the control at the top of the page and the control at the end of each
 * row write to the same place. With a boolean per row instead, "expand all"
 * would have had to reach into twenty-three components it cannot see, and the
 * two controls would drift apart the moment either was used.
 *
 * The tail joins the same `<ul>` rather than arriving in a container of its own,
 * so revealing it continues the pill run instead of starting a second block
 * under it. That is also why this is a `Button` and not a `Collapsible`: a
 * Radix collapsible needs a wrapper element it can measure and hide, and a
 * wrapper inside a flex-wrap run breaks the wrapping that makes the row read as
 * one list. `aria-expanded` on the button carries the state a collapsible would
 * have carried for us.
 */
function GroupRow({
  group,
  expanded,
  onToggle,
}: {
  group: TechnologyGroup;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const id = slug(group.group);

  // Sets rather than `includes`, because the largest group runs past forty
  // items and these are two lookups per pill.
  const core = new Set<string>(group.core);
  const emphasised = new Set<string>(group.emphasis);

  // Filtering `items` rather than rendering `core` keeps the pills in the order
  // Niall wrote them, which is neither alphabetical nor historical and is the
  // one thing the content file asks callers not to disturb. It also means the
  // tail appears interleaved in that order rather than appended as a lump.
  const shown = expanded ? group.items : group.items.filter((item) => core.has(item));
  const hidden = group.items.length - group.core.length;

  return (
    <tr className="align-baseline">
      {/* Fixed width, so the group names line up as a column a reader can scan
          down without reading the pills beside them.

          `py-2.5` rather than `py-4`, and the pair of it on the cell beside
          this one. The larger value was right when a group ran to five or six
          lines of pills and the rows needed keeping apart; a curated group is
          one or two lines, and at that height thirty-two points between rows
          against six inside a wrapped run put more air between two groups than
          inside either one, so a row read as loose pills rather than as a block.
          Twenty points is the value that survives a group being opened, which is
          the case that decides it: a full tail is five or six lines again, and
          the sixteen that `py-2` gives is too close to the six inside a run to
          tell the end of one group from the middle of it. There is still no rule
          between the rows. The space is the only separator, which is the whole
          reason its size matters. */}
      <th
        scope="row"
        className="text-foreground w-[7.5rem] py-2.5 pr-4 align-baseline text-[0.8rem] leading-snug font-medium sm:w-48 sm:text-sm"
      >
        {/* The anchor is the name rather than the cell, because a cell is as
            tall as its row and a row here can run to six lines of pills once it
            is open. The scroll spy takes the topmost section intersecting a band
            near the top of the viewport, so a six-line cell keeps intersecting
            long after the next group has arrived, and the rail then highlights
            the group above the one you jumped to. The 56px sticky header is
            cleared by `scroll-padding-top` in `index.css`, which is why there is
            no scroll margin here. */}
        <span id={id}>{group.group}</span>
      </th>
      <td className="py-2.5">
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((item) =>
            emphasised.has(item) ? (
              <li key={item}>
                <Badge>
                  {item}
                  {/* The fill is the whole signal and a screen reader gets none
                      of it, so it is said. */}
                  <span className="sr-only"> (leaned on most)</span>
                </Badge>
              </li>
            ) : (
              <li key={item}>
                <Badge variant="outline" className="text-muted-foreground font-normal">
                  {item}
                </Badge>
              </li>
            ),
          )}

          {hidden > 0 && (
            <li>
              <Button
                variant="ghost"
                size="xs"
                aria-expanded={expanded}
                onClick={() => onToggle(id)}
                className="text-muted-foreground h-5 rounded-4xl px-2 text-xs font-normal"
              >
                {expanded ? "Show fewer" : `+${hidden} more`}
                {/* "+14 more" is meaningless read out of the row it sits in, and
                    a screen reader reaches this button without having heard the
                    row header for some time. Naming the group here costs a
                    sighted reader nothing and is the difference between a usable
                    control and a mystery. */}
                <span className="sr-only"> in {group.group}</span>
              </Button>
            </li>
          )}
        </ul>
      </td>
    </tr>
  );
}

export function Technologies() {
  const active = useScrollSpy(SECTION_IDS);
  const [indexOpen, setIndexOpen] = React.useState(false);

  // The anchors of the groups whose tails are showing. A set rather than a
  // boolean per row, because the control above the table and the control at the
  // end of each row have to be writing to the same thing: expanding everything
  // and then closing one group has to leave the other twenty-two open, and the
  // label on the control above has to notice that it did.
  const [openGroups, setOpenGroups] = React.useState<ReadonlySet<string>>(() => new Set());

  const toggleGroup = React.useCallback((id: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  // Everything is open only when every group that *has* a tail is open, so a
  // page where some group's core is all of it can still reach "Collapse all".
  const allOpen = openGroups.size === EXPANDABLE.length;
  const toggleAll = () => setOpenGroups(allOpen ? new Set() : new Set(EXPANDABLE));

  return (
    <Page
      title="Technologies"
      lede="These are technologies I have used directly or am familiar with, grouped by what they are for."
      marginWidth="wide"
      left={<ContentsRail items={SECTIONS} active={active} label="Jump to group" />}
    >
      {/* Below 1440px there is no margin to put the rail in, and twenty-three
          groups of pills are far too long to see the shape of by scrolling.
          Collapsed by default, because the table is what the reader came for. */}
      <ContentsDisclosure marginWidth="wide">
        <Collapsible open={indexOpen} onOpenChange={setIndexOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="text-muted-foreground group h-8 gap-1.5 px-2.5 text-xs">
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              {/* "Contents" rather than "Groups", which is also what
                  `ContentsRail` calls itself by default and what the same
                  control says on the ML Practice page. The two pages had two
                  names for one control, and a reader who meets this one first on
                  a narrow screen has no way to know that "Groups" meant the
                  index of the page rather than something about the table. */}
              Contents
            </Button>
          </CollapsibleTrigger>
          {/* Following a link closes the box, so a reader is not left with the
              whole index between them and the group they jumped to. */}
          <CollapsibleContent onClick={() => setIndexOpen(false)}>
            <ContentsGrid items={SECTIONS} />
          </CollapsibleContent>
        </Collapsible>
      </ContentsDisclosure>

      {/* One control for the whole table, for the reader who wants the list
          rather than the shortlist. It sits directly above the table and shares
          the muted register of the legend under it, because it is furniture for
          the table rather than the thing the page is asking anybody to do.

          The label states what pressing it will do rather than what the table
          currently is, which is the only version that stays true: leaving it
          reading "Expand all" once everything is expanded would make it a label
          for a state and a lie about the action. The `sr-only` half of the name
          is what the changing half does not say, and it does not change, so the
          control keeps one identity across both. */}
      <div className="-mt-2 mb-3 flex">
        <Button
          variant="ghost"
          size="xs"
          onClick={toggleAll}
          className="text-muted-foreground -ml-2 h-6 px-2 text-xs font-normal"
        >
          {allOpen ? "Collapse all" : "Expand all"}
          <span className="sr-only"> technology groups</span>
        </Button>
      </div>

      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          The tooling behind the work, in seven families, each holding the groups of tools that belong to it. Each group
          shows the tools most leaned on, and a control at the end of the row reveals the rest.
        </caption>
        {technologies.map((family, index) => (
          <tbody key={family.family}>
            {/* The family band, in the same register as the one on the ML
                Practice page: full contrast and sentence case against the
                lighter group names under it.

                `pt-14` rather than `pt-12`, which gives back what the row above
                lost when its padding came down and leaves the gap above a band
                where it was. The three levels are held apart by the ratio
                between them rather than by any one measurement, so tightening
                the groups without this would have tightened the families by the
                same amount and let the bands sink into the rows they head. */}
            <tr>
              <th scope="colgroup" colSpan={2} className={cn("pb-1 text-left", index === 0 ? "pt-2" : "pt-14")}>
                <span className="text-foreground block text-base font-semibold tracking-tight">{family.family}</span>
              </th>
            </tr>

            {family.groups.map((group) => (
              <GroupRow
                key={group.group}
                group={group}
                expanded={openGroups.has(slug(group.group))}
                onToggle={toggleGroup}
              />
            ))}
          </tbody>
        ))}
      </table>

      {/* An empty pill as the swatch, so the key is coloured by the same token
          as the thing it is a key for and cannot drift from it. */}
      <p className="text-muted-foreground mt-8 flex flex-wrap items-center gap-2 text-[0.7rem]">
        <Badge aria-hidden className="h-3 w-6 p-0" />
        leaned on most
      </p>
    </Page>
  );
}

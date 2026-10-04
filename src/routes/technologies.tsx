import { Page } from "@/components/page";
import { TechnologyFamilies } from "@/components/technologies-families";

/**
 * The tooling, in seven families that open.
 *
 * This page used to be 2,600px of pills: 354 names in 23 groups, every one at
 * the same altitude, with 23 separate "+N more" controls and no summary. A
 * reader scanning for whether this person knows their stack had to read all of
 * it, and a list that long reads as padding whatever is in it.
 *
 * Shut, it is now one screen, and each family shows the names inside it that
 * are leaned on most. That is a stronger claim than the old default view, not
 * a weaker one: it says what the work actually runs on and offers the rest
 * rather than asserting all of it at once.
 *
 * The lede says what is shown and that there is more behind it, and nothing
 * else. An earlier one spent its second half explaining that this page is a
 * weaker claim than `/practice`, which is true and is the sort of thing a page
 * should demonstrate rather than announce: "tools I have used" already claims
 * less than "what I have worked on, and where".
 *
 * The hint to open a row earns its place where the practice page's did not.
 * There a chevron sat beside a heading with dots to its right, so the shape
 * said what to do; here a row of pills reads as a complete list unless
 * something says it is not.
 *
 * No contents rail and no narrow-screen index. Both existed because the page
 * was too long to see the shape of, and an index of what is already on screen
 * is furniture. No tooltips either: a capability on the practice page needs
 * saying what it is, and a tool is its own name.
 */
export function Technologies() {
  return (
    <Page
      title="Technologies"
      lede="Tools I have used. Each row shows a few; open one for the rest."
      description="The tooling behind the work, grouped by what it is for."
    >
      <TechnologyFamilies />
    </Page>
  );
}

import { Page } from "@/components/page";
import { PracticePillars } from "@/components/practice-pillars";

/**
 * The capability matrix, and nothing else.
 *
 * This page used to carry the matrix and then a write-up per capability
 * underneath it, which was more page than anyone reads. The write-ups are
 * archived in `.scratch/domains/writeups.ts` and out of the compiled tree.
 *
 * The tooling used to sit under the matrix as four rows of pills. It is a page
 * of its own now, at `/technologies`, because a claim about having used a tool
 * and a claim about having owned a capability are different claims and a reader
 * who cannot tell them apart trusts neither.
 *
 * It was called Domains until the title stopped matching what the matrix says.
 * `/domains` redirects here in `App.tsx`.
 *
 * No contents rail. The matrix carried one while it was four screens long and
 * nine headings were the only way to see what the page held; shut, it is now
 * one screen, and an index of what is already on screen is furniture.
 *
 * One line of lede, and it is not a description of the table. What it says is
 * the one thing the grid cannot say about itself, which is that the rows are
 * work rather than a reading list. That distinction is the whole difference
 * between this page and `/technologies`, where the claim is deliberately
 * weaker. `description` still carries the longer sentence, because a search
 * result has no table underneath it and does need the columns explained.
 */
export function Practice() {
  return (
    <Page
      title="ML Practice"
      lede="What I have worked on, and where."
      description="Each row is a machine learning capability, each column an organisation I worked at, and the dot says how much of that role it was."
    >
      <PracticePillars />
    </Page>
  );
}

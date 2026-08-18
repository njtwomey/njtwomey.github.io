import { CapabilityMatrix } from "@/components/domains-matrix";
import { Page } from "@/components/page";
import { DOMAINS_DETAIL } from "@/lib/flags";

/**
 * The matrix, on its own.
 *
 * This page used to carry the matrix and then twenty-three write-ups underneath
 * it, which was more page than anyone reads and buried the one thing that is
 * legible at a glance. The write-ups still exist, in `src/content/domains.ts`
 * and on the detail route beside this one, and `DOMAINS_DETAIL` decides
 * whether they are published and whether a row here links to them.
 */
export function Domains() {
  return (
    <Page title="Domains" lede="The domains I work in, and where each one has run.">
      {/* One detail page holding every write-up, so a row is an anchor into it
          rather than a page of its own: these are paragraphs, not articles. */}
      <CapabilityMatrix rowHref={DOMAINS_DETAIL ? (capability) => `/domains/detail#${capability.slug}` : undefined} />
    </Page>
  );
}

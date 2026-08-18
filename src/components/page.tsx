import * as React from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Keep the tab title and the meta description in step with the route.
 *
 * The site is a single HTML file served for every path, so without this every
 * page shares the index's title — which is what a browser history entry, a
 * bookmark and a pasted link all show.
 */
export function useDocumentMeta(title?: string, description?: string) {
  React.useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : site.name;
  }, [title]);

  React.useEffect(() => {
    if (!description) return;
    const tag = document.querySelector('meta[name="description"]');
    const previous = tag?.getAttribute("content");
    tag?.setAttribute("content", description);
    return () => {
      if (previous) tag?.setAttribute("content", previous);
    };
  }, [description]);
}

/**
 * A margin column: contents rails, jump lists, anything that accompanies the
 * page without belonging to it.
 *
 * It is absolutely positioned against the content block and spans its full
 * height, with the visible box `sticky` inside. That combination is what makes
 * a rail start beside the content rather than pinned to the top of a fresh
 * page, follow the reader down, and then stop when the content runs out instead
 * of hanging over the footer.
 *
 * Living in the margin rather than in a grid column is the point. A column
 * would push the reading measure sideways and break its alignment with the site
 * header; this leaves the content exactly where it is on every page, whether or
 * not a rail is present.
 *
 * Two widths, because the contents of a rail differ in kind.
 *
 * A list of years is four characters wide and looks absurd in a broad column.
 * A list of capability titles is a phrase each, and compressing those into the
 * same 160px wraps every one of them onto three lines, which is harder to scan
 * than the page it is meant to be indexing.
 *
 * The breakpoints are arbitrary values rather than `xl` and `2xl` because they
 * follow from arithmetic. The content is `max-w-4xl` (896px) and the layout is
 * centred, so a rail of width w needs 896 + 2(w + 32) of viewport before it
 * fits: 1280px at 160px wide, 1440px at 240px, and 1600px at 288px. Tailwind's
 * named sizes land in none of those places, and `2xl` would withhold the rail
 * from screens that have the room for it.
 */
const MARGIN = {
  narrow: {
    left: "hidden min-[1280px]:block min-[1280px]:w-40 min-[1280px]:-left-48",
    right: "hidden min-[1280px]:block min-[1280px]:w-40 min-[1280px]:-right-48",
  },
  // Two steps rather than one. A single wider size would need 1536px before it
  // could appear at all, which would take the rail away from the 1440px screens
  // that have room for the smaller one. So it appears at 240px and grows to
  // 288px once there is space for it.
  wide: {
    left: "hidden min-[1440px]:block min-[1440px]:w-60 min-[1440px]:-left-[17rem] min-[1600px]:w-72 min-[1600px]:-left-80",
    right:
      "hidden min-[1440px]:block min-[1440px]:w-60 min-[1440px]:-right-[17rem] min-[1600px]:w-72 min-[1600px]:-right-80",
  },
} as const;

export type MarginWidth = keyof typeof MARGIN;

/**
 * The inverse of each margin's breakpoint, for the in-flow fallback that has to
 * appear exactly where the rail disappears. Derived here so the two cannot
 * drift apart.
 */
export const MARGIN_HIDDEN: Record<MarginWidth, string> = {
  narrow: "min-[1280px]:hidden",
  wide: "min-[1440px]:hidden",
};

function Margin({ side, width, children }: { side: "left" | "right"; width: MarginWidth; children: React.ReactNode }) {
  return (
    <div className={cn("absolute top-0 h-full", MARGIN[width][side])}>
      <div className="sticky top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto">{children}</div>
    </div>
  );
}

/**
 * The one column everything sits in. A single max-width for every page is what
 * makes the site feel like one thing rather than a set of templates.
 */
export function Page({
  title,
  lede,
  description,
  left,
  right,
  marginWidth = "narrow",
  children,
  className,
}: {
  title?: string;
  /** Displayed under the heading. */
  lede?: React.ReactNode;
  /** For the document meta, when it differs from the lede. */
  description?: string;
  /**
   * Optional margin columns, rendered outside the reading measure and sticky
   * while the content scrolls past. Most pages want neither. Both are dropped
   * on narrower screens, so nothing may live here that is not also reachable
   * from the content itself.
   */
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * How much room the margins get. `narrow` suits a list of years, `wide` a
   * list of phrases. A wide rail needs a wider viewport before it appears.
   */
  marginWidth?: MarginWidth;
  children: React.ReactNode;
  className?: string;
}) {
  useDocumentMeta(title, description ?? (typeof lede === "string" ? lede : undefined));

  // Asymmetric padding. The header already sits below a 56px sticky bar, so a
  // matching 64px above it pushed the first real content most of the way down
  // the viewport on a page whose whole job is a list. Generous space at the
  // bottom is free, whereas generous space at the top costs the fold.
  return (
    <main className={cn("mx-auto w-full max-w-4xl flex-1 px-5 pt-8 pb-16 sm:px-6 sm:pt-10", className)}>
      {title && (
        <header className="mb-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {/* No narrower measure than the content. A lede held to 672px inside an
              896px column wraps early against an edge nothing else on the page
              shares, which reads as a bug rather than as typography. */}
          {lede && <p className="text-muted-foreground mt-2 text-[0.95rem]/7">{lede}</p>}
        </header>
      )}

      {left || right ? (
        <div className="relative">
          {left && (
            <Margin side="left" width={marginWidth}>
              {left}
            </Margin>
          )}
          {right && (
            <Margin side="right" width={marginWidth}>
              {right}
            </Margin>
          )}
          {children}
        </div>
      ) : (
        children
      )}
    </main>
  );
}

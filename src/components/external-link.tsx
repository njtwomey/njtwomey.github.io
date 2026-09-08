import { ArrowUpRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Set while rendering inside `<ExternalLinks>`, so a card knows it is one of several.
 *
 * A card on its own is a bordered block with its own margins. The same card in a group
 * has to give both up, or three of them stack into three boxes with gaps between, which
 * reads as three interruptions rather than one list.
 */
const InGroupContext = React.createContext(false);

/** The host, without the `www.`, or nothing if the href is not an absolute URL. */
function site(href: string): string | undefined {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * A link off the site, with a line saying what is at the other end.
 *
 * A bare URL in prose asks the reader to decide whether to spend a click on it with
 * nothing to go on but the words around it. This gives them the title, the host and a
 * sentence, which is enough to decide, and it shows the host on purpose: a reader is
 * entitled to know whether they are being sent to a vendor's own documentation or to
 * somebody's blog before they get there.
 *
 * Deliberately quiet. It uses the same border, the same muted background and the same
 * vertical rhythm as a figure, because it is part of the note rather than an
 * advertisement stapled to it. The only thing that moves is the arrow on hover.
 *
 * ```mdx
 * <ExternalLink href="https://example.com/post" title="How the thing works">
 *   One sentence on what is actually there.
 * </ExternalLink>
 * ```
 */
export function ExternalLink({
  href,
  title,
  children,
}: {
  href: string;
  /** The name to show. Falls back to the host, which is better than showing a raw URL. */
  title?: string;
  /** One line on what is at the other end. */
  children?: React.ReactNode;
}) {
  const grouped = React.useContext(InGroupContext);
  const host = site(href);

  const card = (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group hover:bg-muted/50 flex items-start gap-3 px-4 py-3 font-normal no-underline transition-colors",
        // The prose styles every link as primary and underlined, which is right for a
        // link inside a sentence and wrong for a block that is already obviously a link.
        "text-foreground decoration-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="group-hover:text-primary font-medium transition-colors">{title ?? host ?? href}</span>
          {host && title && <span className="text-muted-foreground font-mono text-xs">{host}</span>}
        </div>
        {children && <div className="text-muted-foreground mt-1 text-sm leading-snug">{children}</div>}
      </div>

      {/* The one moving part. It leans the way the link goes, which is the whole signal
          that this leaves the page. */}
      <ArrowUpRight className="text-muted-foreground group-hover:text-foreground mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );

  if (grouped) return card;
  return <div className="my-6 overflow-hidden rounded-xl border">{card}</div>;
}

/**
 * Several external links as one block.
 *
 * Written as a wrapper around the same card rather than as a second component with its
 * own props, so a list and a single link cannot drift apart in how they look. The border
 * and the margins move to the group and the cards become rows in it, which is the
 * difference between one list and several separate interruptions.
 *
 * ```mdx
 * <ExternalLinks title="What I read">
 *   <ExternalLink href="…" title="…">…</ExternalLink>
 *   <ExternalLink href="…" title="…">…</ExternalLink>
 * </ExternalLinks>
 * ```
 */
export function ExternalLinks({
  title,
  children,
}: {
  /**
   * An optional label on the bar, for when the list is answering a question.
   *
   * Sentence case and quiet. Set in small caps it read as a UI panel dropped into the
   * page, and the point of this component is that a list of links belongs to the note.
   */
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      {title && <div className="text-muted-foreground bg-muted/40 border-b px-4 py-2 text-xs font-medium">{title}</div>}
      {/* Divided rather than spaced. A gap between rows would reintroduce the separate
          cards this exists to avoid. */}
      <div className="divide-y">
        <InGroupContext.Provider value={true}>{children}</InGroupContext.Provider>
      </div>
    </div>
  );
}

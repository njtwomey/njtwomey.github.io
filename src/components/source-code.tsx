import { Check, ChevronRight, Copy, Download, ExternalLink } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAsset } from "@/components/mdx";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

/** Where this repository is, so a listing can link to the file it was read from. */
const REPO = "https://github.com/njtwomey/njtwomey.github.io/blob/main";

/**
 * Set while rendering inside a `<SourceCode>`, so the fence knows it is not on its own.
 *
 * A code block in prose carries its own furniture: a rounded panel, a border and a copy
 * button in the corner. All three are wrong inside a panel that already has them, and
 * the result was a box in a box with the filename printed twice and two copy buttons a
 * few pixels apart. The block reads this and renders bare.
 */
export const InSourceCodeContext = React.createContext(false);

/**
 * A whole source file at the foot of a note, folded away until somebody wants it.
 *
 * `<SourceCode path="content/notes/.../train.py" />` is the whole of it. The fence is
 * injected by `scripts/remark-code-file.mjs` at build time from that one path, so the
 * file is named once and a quoted listing cannot drift from the file it came from.
 * Passing children instead is still allowed, for a block that is not a whole file.
 *
 * Folded by default because a full listing is a note's evidence rather than part of its
 * argument, and a reader who wants to check it will click. The header carries everything
 * you can do with the file without opening it: copy it, read it on GitHub, save it.
 */
export function SourceCode({
  path,
  file,
  summary,
  download,
  defaultOpen = false,
  children,
}: {
  /** Repo-relative path, which names the file, links to it, and supplies the listing. */
  path?: string;
  /** Override the name on the bar, which is otherwise the path's last segment. */
  file?: string;
  /** One line on what it does, shown whether or not the block is open. */
  summary?: string;
  /**
   * A file to offer for download, as a bare name resolved against the note's own
   * directory or a site-absolute path. Omitted where the listing comes from somewhere in
   * the repo that is not published, such as `python/demos/`, since a button leading to a
   * 404 is worse than no button. The GitHub link works either way.
   */
  download?: string;
  /** Start expanded, for a listing that is the point rather than the appendix. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const url = useAsset();
  const [open, setOpen] = React.useState(defaultOpen);
  const body = React.useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopy();
  const [lines, setLines] = React.useState(0);

  const name = file ?? path?.split("/").pop() ?? "source";
  const digits = String(Math.max(lines, 1)).length;

  // Counted off the rendered listing rather than passed in, because the fence arrives as
  // a tree of highlighted spans and only the DOM knows how many lines it came to. The
  // content is force-mounted, so this is right even while the panel is folded.
  React.useLayoutEffect(() => {
    setLines(body.current?.querySelectorAll("[data-line]").length ?? 0);
  }, [children]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      data-slot="source-code"
      className="bg-muted/50 my-6 overflow-hidden rounded-lg border font-mono"
    >
      <div className="flex items-center gap-2 py-1.5 pr-1.5 pl-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:text-foreground flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
            aria-label={`${open ? "Hide" : "Show"} ${name}`}
          >
            <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
            <span className="truncate text-xs">{name}</span>
            {summary && (
              <span className="text-muted-foreground hidden truncate font-sans text-xs sm:inline">{summary}</span>
            )}
          </button>
        </CollapsibleTrigger>

        {/* Read off the rendered block rather than threaded down from the source, because
            by the time this component sees the listing it is a tree of coloured spans.
            `textContent` reassembles exactly what selecting the block by hand would give.
            This is why the content is force-mounted: copying has to work while folded. */}
        <Action label={copied ? "Copied" : "Copy"} onClick={() => copy(body.current?.textContent ?? "")}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Action>

        {path && (
          <Action label="View on GitHub" href={`${REPO}/${path}`}>
            <ExternalLink className="size-3.5" />
          </Action>
        )}

        {/* A real link to the published file rather than a scrape of the rendered block,
            so what gets saved is the file on disk and not the part of it that was shown. */}
        {download && (
          <Action label="Download" href={url(download)} download>
            <Download className="size-3.5" />
          </Action>
        )}
      </div>

      {/* `forceMount` keeps the listing in the DOM while folded, which is what lets the
          copy button work from the closed state. Radix stamps the state, so hiding it is
          a class rather than an unmount. */}
      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
        <div className="relative border-t" style={{ "--gutter": `${digits + 2.25}ch` } as React.CSSProperties}>
          <Gutter lines={lines} />
          {/* The ref is on the listing alone, so neither the copy button nor a selection
              can pick up the gutter sitting beside it. */}
          <div ref={body}>
            <InSourceCodeContext.Provider value={true}>{children}</InSourceCodeContext.Provider>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * The line numbers, drawn beside the listing rather than inside it.
 *
 * They were a CSS counter on each line's `::before`, which is the usual way and is wrong
 * here: generated content is copied along with the selection in WebKit and in some
 * Chrome builds whatever `user-select` says, so anybody dragging over ten lines got ten
 * line numbers interleaved with their code. Sitting outside the element the selection
 * covers, these cannot be picked up at all, by a drag or by the copy button.
 *
 * Absolutely positioned so the listing keeps its own layout, and the code is padded past
 * it. It does not scroll with the code, so a long line slides underneath it. The
 * background has to be fully opaque for that: at `bg-muted/60` the scrolled code showed
 * straight through the numbers.
 */
function Gutter({ lines }: { lines: number }) {
  if (lines === 0) return null;
  return (
    <div
      aria-hidden
      className="bg-muted text-muted-foreground/70 pointer-events-none absolute inset-y-0 left-0 z-10 w-[var(--gutter)] border-r py-3 pr-2 text-right font-mono text-[0.825rem]/6 tabular-nums select-none"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

/** One header control, as a button or a link, sized to sit in the bar. */
function Action({
  label,
  href,
  download,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  download?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className = "text-muted-foreground hover:text-foreground size-7 shrink-0";
  if (href) {
    return (
      <Button asChild variant="ghost" size="icon" className={className} title={label}>
        <a href={href} download={download} target={download ? undefined : "_blank"} rel="noreferrer">
          {children}
          <span className="sr-only">{label}</span>
        </a>
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" className={className} onClick={onClick} title={label} aria-label={label}>
      {children}
    </Button>
  );
}

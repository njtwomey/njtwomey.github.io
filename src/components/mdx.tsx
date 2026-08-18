import { Check, Copy } from "lucide-react";
import * as React from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Link } from "react-router-dom";
import { Paper } from "@/components/paper";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";
import { publication } from "@/lib/publications";
import { cn } from "@/lib/utils";

/**
 * Which note is being rendered, so a bare filename in its prose resolves to
 * that note's own assets. Set by the note route; empty everywhere else, where
 * only site-absolute paths make sense.
 */
export const NoteSlugContext = React.createContext<string | undefined>(undefined);

/**
 * Resolve an asset reference against the deployed base path.
 *
 * A note refers to its own files by bare name — `moons.gif` — because a note is
 * a directory and repeating `/notes/<slug>/` in front of every image is a path
 * to get wrong. A leading `/` still means "from the site root", and an absolute
 * URL is left alone.
 */
export function useAsset() {
  const slug = React.useContext(NoteSlugContext);
  return React.useCallback(
    (src: string) => {
      if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
      const path = src.startsWith("/") ? src.slice(1) : slug ? `notes/${slug}/${src}` : src;
      return `${import.meta.env.BASE_URL}${path}`;
    },
    [slug],
  );
}

/** Resolve a site-absolute path outside a note (the hero image, a project card). */
export function asset(src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  return `${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`;
}

/**
 * A figure with a caption — what most images in a note actually want.
 *
 * Markdown's `![alt](src)` has one slot, and notes kept using the alt text as a
 * caption, which is wrong twice: a screen reader then reads the caption as the
 * description, and sighted readers never see it.
 */
export function Figure({
  src,
  alt = "",
  caption,
  width,
  className,
}: {
  src: string;
  alt?: string;
  caption?: string;
  /** A CSS width, for figures that should not fill the column. */
  width?: string;
  className?: string;
}) {
  const resolve = useAsset();
  return (
    <figure className={cn("my-6", className)}>
      <img
        src={resolve(src)}
        alt={alt}
        loading="lazy"
        style={width ? { width, margin: "0 auto" } : undefined}
        className="mx-auto rounded-lg border"
      />
      {caption && <figcaption className="text-muted-foreground mt-2 text-center text-xs">{caption}</figcaption>}
    </figure>
  );
}

/**
 * A pair of figures side by side, collapsing to a stack on a phone.
 * Comparisons ("before and after", "hard and soft assignment") are the reason
 * most notes want two images, and they only work if the two are level.
 */
export function Figures({
  srcs,
  alts = [],
  caption,
  className,
}: {
  srcs: string[];
  alts?: string[];
  caption?: string;
  className?: string;
}) {
  const resolve = useAsset();
  return (
    <figure className={cn("my-6", className)}>
      <div className={cn("grid gap-3", srcs.length > 1 && "sm:grid-cols-2")}>
        {srcs.map((src, index) => (
          <img
            key={src}
            src={resolve(src)}
            alt={alts[index] ?? ""}
            loading="lazy"
            className="w-full rounded-lg border"
          />
        ))}
      </div>
      {caption && <figcaption className="text-muted-foreground mt-2 text-center text-xs">{caption}</figcaption>}
    </figure>
  );
}

/**
 * An inline citation — "(Twomey et al., 2019)" linking to the entry on the
 * publications page. Written as `<Cite id="twomey2019neural" />`, the same key
 * `<Paper>` takes, so prose and cards cite the one bibliography.
 */
export function Cite({ id }: { id: string }) {
  const paper = publication(id);
  if (!paper) {
    return import.meta.env.DEV ? (
      <span className="bg-destructive/10 text-destructive rounded-sm px-1 font-mono text-sm">unknown cite: {id}</span>
    ) : null;
  }

  const first = paper.authors[0];
  const label = first ? `${first.last}${paper.authors.length > 1 ? " et al." : ""}, ${paper.year}` : String(paper.year);

  return (
    <Link to={`/publications#${paper.key}`} title={paper.title} className="whitespace-nowrap">
      ({label})
    </Link>
  );
}

/** Paths that are files in `public/`, not routes — a `<Link>` to one 404s. */
const STATIC_PREFIXES = ["/pdf/", "/notes/", "/img/", "/publications.bib"];

/**
 * Three kinds of link, told apart by shape:
 *
 * - a bare filename (`notebook.ipynb`) is one of this note's own files, and is
 *   resolved against its directory — a browser would otherwise resolve it
 *   relative to `/notes/<slug>`, which lands a directory too high;
 * - a site-absolute path is a route, and routes client-side — unless it names a
 *   file in `public/`, which has no route to match;
 * - everything else is off-site and opens in a new tab.
 */
function Anchor({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const resolve = useAsset();
  const slug = React.useContext(NoteSlugContext);

  const isAbsolute = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
  const isRoot = href.startsWith("/");

  if (!isAbsolute && !isRoot && slug) {
    return (
      <a href={resolve(href)} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  if (isRoot && !STATIC_PREFIXES.some((prefix) => href.startsWith(prefix))) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a href={isRoot ? asset(href) : href} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt, ...rest }: ComponentPropsWithoutRef<"img">) {
  const resolve = useAsset();
  return <img src={typeof src === "string" ? resolve(src) : src} alt={alt ?? ""} loading="lazy" {...rest} />;
}

/**
 * A code block with a copy button in its top right corner.
 *
 * The text is read back off the rendered element rather than threaded down from
 * the source, because by the time this component sees the block it is a tree of
 * coloured spans. `textContent` reassembles exactly what a reader would get by
 * selecting the block by hand, which is the thing they wanted anyway.
 *
 * The button is invisible until the block is hovered or the button itself takes
 * focus, so it stays out of the way while reading without becoming unreachable
 * from the keyboard. On touch, where there is no hover, it is always shown.
 */
function CodeBlock({ children, className, ...rest }: ComponentPropsWithoutRef<"pre">) {
  const ref = React.useRef<HTMLPreElement>(null);
  const { copied, copy } = useCopy();

  return (
    <div className="group/code relative">
      <pre ref={ref} className={className} {...rest}>
        {children}
      </pre>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={() => copy(ref.current?.textContent ?? "")}
        className={cn(
          "bg-background/80 absolute top-2 right-2 size-7 backdrop-blur-sm transition-opacity",
          "opacity-100 md:opacity-0 md:group-hover/code:opacity-100 md:focus-visible:opacity-100",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

/**
 * A paper inside a note, highlighted unless the note says otherwise.
 *
 * Almost every note here is about one paper and opens with its card, so the
 * default is the shape that use wants. Passing `variant` explicitly still
 * works, which is what a passing reference mid-prose should do:
 * `<Paper id="twomey2016need" variant="compact" />`.
 */
function NotePaper(props: React.ComponentProps<typeof Paper>) {
  return <Paper variant="highlight" {...props} />;
}

/**
 * What a note can use without importing anything.
 *
 * `Paper` is the point of writing notes in MDX at all: a note about a paper
 * cites it with `<Paper id="twomey2019neural" />` and the card is built from
 * the same bibliography the publications page reads, so it cannot drift out of
 * date.
 */
export const mdxComponents = {
  a: Anchor,
  img: MarkdownImage,
  pre: CodeBlock,
  Paper: NotePaper,
  Figure,
  Figures,
  Cite,
} as const;

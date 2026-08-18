import { Check, ChevronDown, Code2, Copy, FileText, Link2, Presentation } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { details, initialise, KIND_LABEL, publication, type Publication } from "@/lib/publications";

/**
 * One publication, rendered from its citation key.
 *
 * This is the component the rest of the site is built around: the publications
 * list is a stack of these, a project lists the papers that came out of it with
 * these, and an MDX note drops one inline with `<Paper id="twomey2019neural" />`.
 * Referring to a paper by key everywhere means the bibliography stays the single
 * source of truth — a corrected venue or a newly added PDF appears in all three
 * places at once.
 *
 * Three densities, because those uses want different things:
 *
 * - `full` — the publications page. Everything: abstract, every link, BibTeX.
 * - `highlight` — the same card, set in a bordered panel. What a note gets by
 *   default, because a note about a paper opens with it directly under the
 *   title, where it is the subject rather than one row of a list. The list
 *   styling reads as a stray row that has wandered into the prose, and a reader
 *   arriving at the note wants the abstract and the PDF without going anywhere.
 * - `compact` — where the paper really is a passing reference. Title, authors,
 *   venue, and the way to the PDF.
 */
export function Paper({
  id,
  variant = "full",
  className,
}: {
  id: string;
  variant?: "full" | "highlight" | "compact";
  className?: string;
}) {
  const paper = publication(id);

  if (!paper) {
    // A typo in a citation key inside prose would otherwise render as nothing
    // at all, and nobody would notice the paper had gone missing.
    if (import.meta.env.DEV) {
      return (
        <span className="bg-destructive/10 text-destructive rounded-sm px-1.5 py-0.5 font-mono text-sm">
          unknown citation key: {id}
        </span>
      );
    }
    return null;
  }

  if (variant === "compact") return <CompactPaper paper={paper} className={className} />;
  return <FullPaper paper={paper} highlight={variant === "highlight"} className={className} />;
}

function AuthorList({ authors, etAl }: { authors: Publication["authors"]; etAl: boolean }) {
  return (
    <p className="text-muted-foreground text-sm">
      {authors.map((author, index) => (
        <React.Fragment key={`${author.last}-${index}`}>
          {index > 0 && ", "}
          <span className={cn(author.isMe && "text-foreground font-semibold")}>{initialise(author)}</span>
        </React.Fragment>
      ))}
      {etAl && <span className="italic"> et al.</span>}
    </p>
  );
}

/** The external links a paper has, in the order they are most likely wanted. */
function paperLinks(paper: Publication) {
  return [
    paper.pdf && { label: "PDF", href: `${import.meta.env.BASE_URL}${paper.pdf.replace(/^\//, "")}`, icon: FileText },
    paper.arxiv && { label: "arXiv", href: `https://arxiv.org/abs/${paper.arxiv}`, icon: Link2 },
    paper.doi && { label: "DOI", href: `https://doi.org/${paper.doi}`, icon: Link2 },
    !paper.doi && paper.url && { label: "Link", href: paper.url, icon: Link2 },
    paper.code && { label: "Code", href: paper.code, icon: Code2 },
    paper.slides && { label: "Slides", href: paper.slides, icon: Presentation },
  ].filter(Boolean) as { label: string; href: string; icon: typeof FileText }[];
}

function FullPaper({ paper, highlight, className }: { paper: Publication; highlight?: boolean; className?: string }) {
  const { copied, copy } = useCopy();
  const links = paperLinks(paper);
  // Resolved by the time a route that renders full cards has loaded; absent
  // only if the details fetch failed, in which case those two controls are
  // simply not offered.
  const extra = details(paper.key);

  return (
    <article
      id={paper.key}
      className={cn(
        "scroll-mt-24 rounded-xl px-4 py-4 sm:px-5",
        // A highlighted card is a single object in the flow, so it takes a
        // border and drops the hover tint: nothing is being picked out of a
        // list, and a background that reacts to the pointer implies a target.
        // `not-prose` because it lands inside MDX typography, which would
        // otherwise restyle its heading and paragraphs.
        highlight ? "not-prose bg-card border" : "hover:bg-muted/50 transition-colors",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {KIND_LABEL[paper.kind]}
        </Badge>
        <span className="text-muted-foreground text-xs tabular-nums">{paper.year}</span>
      </div>

      <h3 className="mt-2 text-base leading-snug font-semibold tracking-tight sm:text-[1.05rem]">{paper.title}</h3>

      <div className="mt-1.5 space-y-0.5">
        <AuthorList authors={paper.authors} etAl={paper.etAl} />
        {paper.venue && <p className="text-muted-foreground/85 text-sm italic">{paper.venue}</p>}
      </div>

      {/* The written summary sits in the open; the abstract stays behind the
          toggle. One is a sentence saying why the paper matters, the other is
          250 words of venue prose, and only the first is worth scanning. */}
      {paper.summary && <p className="text-foreground/85 mt-2.5 text-sm/6">{paper.summary}</p>}

      <Collapsible className="mt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {paper.hasAbstract && extra?.abstract && (
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="group/abs h-7 gap-1 px-2.5 text-xs">
                Abstract
                <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/abs:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          )}

          {links.map((link) => (
            <Button key={link.label} asChild variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs">
              <a href={link.href} target="_blank" rel="noreferrer">
                <link.icon className="size-3.5" />
                {link.label}
              </a>
            </Button>
          ))}

          {extra?.bibtex && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => copy(extra.bibtex)}
              aria-label={`Copy the BibTeX record for ${paper.title}`}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "BibTeX"}
            </Button>
          )}
        </div>

        {extra?.abstract && (
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <p className="border-border text-muted-foreground mt-3 border-l-2 pl-4 text-sm/6">{extra.abstract}</p>
          </CollapsibleContent>
        )}
      </Collapsible>
    </article>
  );
}

function CompactPaper({ paper, className }: { paper: Publication; className?: string }) {
  const primary = paperLinks(paper)[0];

  return (
    <article className={cn("not-prose bg-card rounded-lg border px-4 py-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm leading-snug font-semibold tracking-tight">{paper.title}</h4>
          <div className="mt-1 space-y-0.5">
            <AuthorList authors={paper.authors} etAl={paper.etAl} />
            <p className="text-muted-foreground/85 text-xs">{[paper.venue, paper.year].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {primary && (
          <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs">
            <a href={primary.href} target="_blank" rel="noreferrer">
              <primary.icon className="size-3.5" />
              {primary.label}
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

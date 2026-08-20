import { MDXProvider } from "@mdx-js/react";
import { ArrowLeft } from "lucide-react";
import * as React from "react";
import type { ComponentType } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { asset, mdxComponents, NoteSlugContext } from "@/components/mdx";
import { Page, useDocumentMeta } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentsRail } from "@/components/contents-rail";
import { formatDate, note as findNote, noteRailItems, titleCase, type Note as NoteMeta } from "@/lib/notes";

/**
 * The lazy component for a note, cached for the lifetime of the page.
 *
 * Each note is its own chunk, resolved on demand. The cache is module level and
 * not a `useMemo`, because React requires a lazy component to be a stable value
 * and not something built during render: a fresh `lazy()` per render carries a
 * fresh promise, and under a navigation transition React can then resolve a
 * chunk it is no longer holding a reference to. The symptom is a URL that
 * changes while the page does not, with the chunk fetched, no error thrown, and
 * nothing committed. It only appears in a production build, since in dev the
 * module is already in the graph and resolves before React can suspend.
 */
const CONTENT = new Map<string, React.LazyExoticComponent<ComponentType>>();

function contentFor(note: NoteMeta): React.LazyExoticComponent<ComponentType> {
  const cached = CONTENT.get(note.slug);
  if (cached) return cached;
  const lazy = React.lazy(note.load);
  CONTENT.set(note.slug, lazy);
  return lazy;
}

export function Note() {
  const { slug } = useParams<{ slug: string }>();
  const note = slug ? findNote(slug) : undefined;

  const Content = note ? contentFor(note) : null;

  // The note draws its own header, so `Page` is given no `title` and would
  // otherwise leave the tab reading "Niall Twomey". Passing the title through
  // `Page` instead renders a second <h1> above the article's own. Called before
  // the guard below because a hook cannot run conditionally.
  useDocumentMeta(note && titleCase(note.title), note?.description);

  // An unpublished or mistyped slug is not an error page, and the notes index
  // is more useful than telling someone what they already know.
  if (!note || !Content) return <Navigate to="/notes" replace />;

  return (
    <Page
      // The same rail as the index, with this note marked. A reader who has
      // finished one note should be able to open the next without going back to
      // the list, and the rail is the only thing on the page that knows what
      // else there is.
      left={<ContentsRail items={noteRailItems()} active={note.slug} label="Other notes" />}
      marginWidth="wide"
    >
      <Link
        to="/notes"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Notes
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titleCase(note.title)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <time dateTime={note.date} className="text-muted-foreground text-sm tabular-nums">
              {formatDate(note.date)}
            </time>
            {note.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
          {/* `description` is not printed here. It exists to sell the note on
              the index and to the search engines through `useDocumentMeta`
              above, and a reader who has already clicked through has made that
              decision: repeating the pitch delays the note by a paragraph they
              have read. The hero therefore follows the title directly, rather
              than sitting above it where a full-width image would push the
              title below the fold on a phone. */}
          {note.hero && note.heroOnPage !== false && (
            <img
              src={asset(note.hero)}
              alt={note.heroAlt ?? ""}
              className="mt-6 max-h-80 w-full rounded-xl border object-cover"
            />
          )}
        </header>

        {/* Every bare filename in the prose resolves against this note's own
            directory, so a note refers to its images as `moons.gif`. */}
        <NoteSlugContext.Provider value={note.slug}>
          <div className="prose-note">
            <React.Suspense
              fallback={
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              }
            >
              <MDXProvider components={mdxComponents}>
                <Content />
              </MDXProvider>
            </React.Suspense>
          </div>
        </NoteSlugContext.Provider>
      </article>
    </Page>
  );
}

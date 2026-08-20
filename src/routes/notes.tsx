import * as React from "react";
import { Link } from "react-router-dom";
import { asset } from "@/components/mdx";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { ContentsRail } from "@/components/contents-rail";
import { formatDate, groupByYear, isDraft, noteRailItems, notes, titleCase } from "@/lib/notes";

export function Notes() {
  const grouped = React.useMemo(() => groupByYear(notes), []);
  // The rail carries routes, so nothing on this page is a scroll target and
  // there is no active row: every row leads somewhere else.
  const sections = React.useMemo(() => noteRailItems(), []);

  return (
    <Page
      title="Notes"
      lede="Short write-ups carrying one idea each, mostly notes on papers I worked on and often looking back at them years later."
      left={<ContentsRail items={sections} active="" label="Jump to note" />}
      marginWidth="wide"
    >
      {notes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          Nothing published yet.
        </p>
      ) : (
        <div className="space-y-9">
          {grouped.map(([year, yearNotes]) => (
            <section key={year} id={`year-${year}`} className="scroll-mt-24">
              {/* The same year heading as the publications page, so the two
                    archives read as one site rather than two. */}
              <h2 className="text-muted-foreground mb-1 border-b pb-1.5 text-sm font-medium tracking-wide tabular-nums">
                {year}
              </h2>

              {/* Negative inset so a note's hover background bleeds past the
                  text column instead of boxing it in, matching a paper card. */}
              <ul className="-mx-4 sm:-mx-5">
                {yearNotes.map((note) => (
                  <li key={note.slug}>
                    <Link
                      to={`/notes/${note.slug}`}
                      className="group hover:bg-muted/50 flex gap-5 rounded-xl px-4 py-4 transition-colors sm:px-5"
                    >
                      {/* The hero doubles as the index thumbnail, so a note
                          needs one image rather than an image and a separate
                          thumbnail.

                          As tall as the row it sits in: a fixed 80px box left
                          the picture floating against a card three times its
                          height, which read as a stray icon rather than as the
                          note's picture.

                          Fixed width and a stretched height, rather than a
                          square that takes its width from its height. The
                          second is what you want and it does not work: the row
                          is only as tall as its tallest item, so an item sizing
                          itself from the row height has nothing to measure and
                          grows without bound. Pinning the width breaks that
                          loop, and `object-cover` crops whatever aspect the
                          hero happens to be to whatever shape the row ends up. */}
                      {note.hero && (
                        <div className="relative hidden w-28 shrink-0 self-stretch sm:block">
                          <img
                            src={asset(note.hero)}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full rounded-lg border object-cover"
                          />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <h3 className="group-hover:text-primary text-base font-semibold tracking-tight transition-colors">
                            {titleCase(note.title)}
                          </h3>
                          <time dateTime={note.date} className="text-muted-foreground text-xs tabular-nums">
                            {formatDate(note.date)}
                          </time>
                          {/* Only reachable on the dev server, since a
                              production build has already filtered these out. */}
                          {isDraft(note) && (
                            <Badge variant="outline" className="text-muted-foreground font-normal">
                              Draft
                            </Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground mt-1.5 line-clamp-3 text-sm/6">{note.description}</p>

                        {note.tags && note.tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {note.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

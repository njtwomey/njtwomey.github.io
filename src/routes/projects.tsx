import { ArrowUpRight } from "lucide-react";
import { Page } from "@/components/page";
import { type Project, projects } from "@/content/projects";
import { useTheme } from "@/hooks/use-theme";

/**
 * Things built outside the machine learning, one card each.
 *
 * These are all published sites, so the page shows them rather than describing
 * them. A preview says what kind of thing this is before a word is read, and it
 * makes four paragraphs that otherwise sit in the same register tellable apart
 * at a glance. They are captured from the live sites into `public/projects/`.
 *
 * One column, with the preview beside the text rather than above it. A single
 * column of full-width cards would put a 560px-tall image between every entry
 * and the next, and two columns made a grid whose cards had to be read in a
 * zigzag. Side by side, a row is one line of sight: picture, name, what it is.
 *
 * The whole card is the link. There is one destination per project, so there is
 * nothing for a second anchor to do, and a card that is entirely a target is a
 * far larger thing to hit than a line of text inside it.
 */

function ProjectCard({ project }: { project: Project }) {
  const { resolved } = useTheme();

  // Picked here rather than by rendering both behind `dark:hidden`, which would
  // have the browser fetch two screenshots to show one.
  const file = resolved === "dark" ? (project.imageDark ?? project.image) : project.image;

  return (
    <a
      href={project.href}
      target="_blank"
      rel="noreferrer"
      className="group hover:border-foreground/20 hover:bg-muted/30 flex flex-col gap-4 rounded-xl border p-4 no-underline transition-colors sm:flex-row sm:gap-5"
    >
      {/* Anchored to the top, so a preview is cropped at the fold rather than
          centred on a band of whatever happened to be halfway down the page.

          Inset from the card's edge and rounded, with no rule between it and
          the words. Run to the border with a divider beside it, the picture
          read as a second panel bolted to a text panel; sitting inside the
          padding it reads as a thumbnail belonging to the card. It keeps a
          faint border of its own because the previews are pale in light and
          near black in dark, so without one the edge disappears into the card
          in whichever theme happens to match.

          `self-start` matters more than it looks. A flex child stretches to
          the row by default, which overrides the aspect, and `object-cover`
          then scales the picture to the new height and crops the sides: the
          AIFN Engine preview lost its own name off the left edge that way. A
          preview whose whole job is to show what a site looks like cannot be
          cropped to fit a column, so the box stays 16:10 and the card grows
          around it when the text needs more. */}
      <img
        src={`${import.meta.env.BASE_URL}projects/${file}`}
        alt={project.alt}
        loading="lazy"
        className="bg-muted aspect-[16/10] w-full shrink-0 rounded-lg border object-cover object-top sm:w-60 sm:self-start md:w-72"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h2 className="group-hover:text-primary flex items-center gap-2 text-[1.05rem] font-semibold tracking-tight transition-colors">
          {project.name}
          {/* Leans the way the link goes, which is the only thing on the card
              that says it leaves the site. */}
          <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </h2>
        {project.subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{project.subtitle}</p>}

        {/* No `flex-1` under the paragraph. It pinned the figures to the bottom
            edge, which is right when something else decides the height and
            wrong now that the text does: the gap it opened was the whole of
            what made these cards look hollow. */}
        <p className="text-muted-foreground mt-2.5 text-sm/7">{project.blurb}</p>

        <p className="text-muted-foreground/80 mt-4 font-mono text-[0.7rem] tracking-tight tabular-nums">
          {project.stat}
        </p>
      </div>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function Projects() {
  return (
    <Page
      title="Projects"
      lede="I have fairly diverse interests. These are things I have built outside work, several of them for communities I am part of."
    >
      <div className="space-y-6">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
    </Page>
  );
}

import { Page } from "@/components/page";
import { SocialLinks } from "@/components/social-links";
import { Separator } from "@/components/ui/separator";
import { focusAreas, site } from "@/content/site";

export function About() {
  return (
    <Page>
      {/* Identity block: the portrait sits to the right, and beside it three
          rows, being the name, then the title, then the ways to get in touch.
          The prose runs underneath at full width, because a paragraph squeezed
          into the column left beside a portrait is harder to read than the same
          paragraph across the page. */}
      <section>
        <div className="flex items-center gap-5 sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{site.name}</h1>
            <p className="text-muted-foreground mt-1.5 text-[0.95rem]">
              {site.role} · {site.location}
            </p>
            {/* Nudged left so the first icon's optical edge lines up with the
                name above it rather than with its padding box. */}
            <SocialLinks className="mt-2 -ml-2" />
          </div>

          {/* A plain image. No frame, no crop and no rounding, because the
              photograph is already a portrait and a ring around it only adds
              furniture. `ml-auto` pins it right while the text keeps the left
              edge it shares with everything below. */}
          <img
            src={`${import.meta.env.BASE_URL}img/me.png`}
            alt={site.name}
            className="ml-auto size-24 shrink-0 object-contain sm:size-28"
          />
        </div>
      </section>

      <Separator className="my-10" />

      {/* Same heading treatment as "What I work on" below, so the page reads as
          labelled sections separated by rules rather than a block of prose
          followed by one heading. */}
      <section>
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">Who I am</h2>
        <div className="text-foreground/90 mt-4 space-y-4 text-[0.975rem]/7">
          {site.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">What I work on</h2>
        {/* A definition list rather than a row of tags, because "multimodal
            inference" on its own says almost nothing and the sentence after it
            is the part worth reading. */}
        <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {focusAreas.map((area) => (
            <div key={area.title}>
              <dt className="text-sm font-semibold tracking-tight">{area.title}</dt>
              <dd className="text-muted-foreground mt-1 text-sm/6">{area.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Page>
  );
}

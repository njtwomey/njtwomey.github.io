/**
 * The Projects page: what gets built outside the machine learning.
 *
 * The framing matters and is easy to get wrong. This is not a portfolio of ML
 * work, which is what Publications and ML Practice are for. These are the
 * things built away from it, and the page says so once in the lede rather than
 * apologising for it four times here.
 *
 * Describe each one by what it is and why it exists. Not by a question it
 * supposedly answers, not by the stack it happens to use, and never by an
 * invented quote put in a reader's mouth. Where a project has its own words for
 * itself, those are the ones to start from: AI Field Notes calls itself notes
 * from a research career, digitised, and there is no improving on that.
 *
 * No links to source. These are finished things to be looked at rather than
 * repositories to be read, and a second destination per card invites the wrong
 * one. The card goes to the site.
 *
 * `stat` is the one line of hard numbers, read off the live site. It is what
 * stops a card being three sentences of adjectives, so keep it factual and let
 * it go stale gracefully: approximate in the prose, exact here.
 */

export type Project = {
  name: string;
  /** The formal name where the short one is not enough on its own. */
  subtitle?: string;
  /** Where it is published. */
  href: string;
  /** What it is and why it exists. Two or three sentences. */
  blurb: string;
  /** Hard numbers off the live site, as a middot-separated line. */
  stat: string;
  /** Preview in `public/projects/`, captured from the live site. */
  image: string;
  /**
   * The same preview captured in dark mode, for the sites that have one.
   *
   * Omitted where the site does not, which is the honest thing to show: a
   * screenshot inverted here would advertise a dark mode the reader will not
   * find when they follow the link. All four have one at the time of writing.
   * `scripts/project-previews.mjs` decides this by reading the live page rather
   * than by being told, and deletes a dark capture that came back light.
   */
  imageDark?: string;
  /** Alt text, describing the screenshot rather than repeating the name. */
  alt: string;
};

/**
 * In the order Niall set, which runs from the most technical to the most
 * organisational rather than by date or size. Do not sort this.
 */
export const projects: readonly Project[] = [
  {
    name: "AI Field Notes",
    href: "https://www.nialltwomey.com/ai-field-notes/",
    blurb:
      "The machine learning notes I took over my research career, digitised and put online. Each page is one idea, with figures you can move and the papers it came from.",
    stat: "1,194 notes · 35 topics · 2,651 references",
    image: "ai-field-notes.jpg",
    imageDark: "ai-field-notes-dark.jpg",
    alt: "A reference site listing machine learning topics by group, each with a note count",
  },
  {
    name: "AIFN Engine",
    href: "https://www.nialltwomey.com/aifn-engine/",
    blurb:
      "The code underneath the figures in AI Field Notes, published on its own because it stands up without them. Move a slider or drag a point and the model refits and redraws where you are looking, since the numerics, the methods and the drawing all run in the browser and nothing goes to a server.",
    stat: "3 packages · 188 modules · 15 compute families",
    image: "aifn-engine.jpg",
    imageDark: "aifn-engine-dark.jpg",
    alt: "A gallery of live chart recipes, each showing the chart and the question it answers",
  },
  {
    name: "DPC Gallery",
    subtitle: "DPChallenge Award Gallery",
    href: "https://www.nialltwomey.com/dpc/",
    blurb:
      "Members of DPChallenge invented their own awards and gave them to each other in the comments under photographs. Nobody was keeping score, so I read a decade of those comments and put the winners in one gallery.",
    stat: "7,813 awards · 7,243 photographs · 1,342 recipients",
    image: "dpc.jpg",
    imageDark: "dpc-dark.jpg",
    alt: "A photography gallery showing award winners, with counts of awarders, challenges and recipients",
  },
  {
    name: "Whazzon",
    href: "https://www.nialltwomey.com/whazzon/",
    blurb:
      "What is on in a city, pulled together from the venue pages, listings sites and feeds it is otherwise scattered across. Bristol first, because I live there, then Cork and Munster.",
    stat: "3 cities · 4,756 events · 653 venues",
    image: "whazzon.jpg",
    imageDark: "whazzon-dark.jpg",
    alt: "A city listings site showing Bristol, Cork and Munster with event and venue counts",
  },
  {
    name: "Chess",
    subtitle: "Bristol & Clifton Chess Club",
    href: "https://www.nialltwomey.com/chess/",
    blurb:
      "Fixtures, availability and team selection for my chess club. Players say when they are free, and the site picks each team by the club's rule of fewest games first and shows its working.",
    stat: "Bristol & District League · divisions 5 and 6",
    image: "chess.jpg",
    imageDark: "chess-dark.jpg",
    alt: "A chess club site listing teams, their divisions and their next fixtures",
  },
] as const;

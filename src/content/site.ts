/**
 * Everything about the person, in one place.
 *
 * This is the file to edit for a new job title, a new social account or a
 * rewritten bio — none of that should mean touching a component.
 */
export const site = {
  name: "Niall Twomey",
  shortName: "Niall Twomey",
  role: "Senior Applied Scientist, Amazon",
  location: "Bristol, United Kingdom",
  url: "https://www.nialltwomey.com",
  description:
    "Applied scientist working on retrieval and ranking, recommendation, multimodal inference and agentic LLM systems. Publications, work history and notes.",

  /**
   * One paragraph, and the facts arrive in the second sentence.
   *
   * This replaced three paragraphs of about 300 words. The problem was not the
   * length on its own: it was that the first 118 words named nothing
   * checkable, so a reader skimming a personal site met a page of
   * self-characterisation before a single employer, venue or number. Claims
   * about how somebody works are the ones only the rest of a site can
   * evidence, and asserting them first spends the attention that was meant to
   * carry a reader into it.
   *
   * What is left keeps one interpretive claim, that behavioural modelling is
   * the thread, and that one is now carried by `/practice`, where it has a
   * pillar of its own rated highly at four of the five organisations.
   *
   * ---------------------------------------------------------------------------
   * THE LONGER VERSION, KEPT.
   * ---------------------------------------------------------------------------
   *
   * Three paragraphs: what the work is and how the time gets allocated, then
   * where it has happened, then the one specialisation running under all of
   * it. The third was last rather than second because it only lands once the
   * reader has seen the employers in the second, and the claim in it is
   * deliberately bounded. Every domain named is publicly evidenced, and the
   * Amazon clause is pitched at the level of a capability on purpose. See the
   * confidentiality header in `src/content/practice.ts` before restoring any
   * of it.
   *
   * Most of what the short version drops is here: the venue list, the patents,
   * "serving millions of people", and the explanation of why those domains are
   * one problem rather than four. That last is the most interesting thing in
   * it, and a middle version of about 160 words would be the short paragraph
   * plus the third of these.
   *
   * I have spent the thirteen years since my PhD building machine learning that runs in production, starting in
   * digital signal processing and health sensing and arriving at large language models, agentic systems and
   * multimodal inference. I do my best work when the problem is not yet well posed and the answer has to be
   * worked out rather than looked up. Knowing the literature is how I triage my own time: where an existing
   * method holds up under evaluation I use it and put the effort into problems that have none. Having worked
   * firsthand across enough different problems, I know early which approaches will hold, and that judgement
   * speeds up delivery for me and for the teams I lead.
   *
   * I founded a research group at the University of Bristol on an MRC Fellowship, built recommendation and
   * personalisation at Cookpad serving millions of people, then learner models and simulation for education
   * technology at KidsLoop, and now lead science initiatives across a diverse portfolio of applications at
   * Amazon (from anomaly detection, information retrieval and audio-visual AI, to agentic systems). I have
   * authored around 70 peer-reviewed papers (at top venues including ICLR, AAAI, KDD, SIGIR, ECML, RecSys, ECAI
   * and ICASSP) and several patents. Across my academic and industry roles, I have mentored around 50
   * researchers and engineers.
   *
   * Behavioural modelling is the specialisation underpinning my ML career: activity recognition from wearable
   * and in-home sensors, behavioural signatures of early-stage dementia, personalised search and recommendation,
   * and models of customer behaviour built from logged interactions. Those domains share no data and no
   * evaluation protocol, but they pose the same problem: behaviour is soft and it shifts underneath a model, so
   * I build systems that adapt to it while holding guarantees strong enough to prove in an online test, and to
   * move the numbers the business cares about.
   */
  intro: [
    "Thirteen years building machine learning that runs in production, from digital signal processing and health sensing to large language models and agentic systems. I founded a research group at Bristol on an MRC Fellowship, built recommendation at Cookpad, learner models at KidsLoop, and now lead science initiatives at Amazon. Around 70 papers and 50 people mentored along the way. Behavioural modelling is the thread running under all of it.",
  ],
} as const;

/**
 * What the work is for, read by somebody deciding whether to make contact.
 *
 * Six rather than eight, and ordered for that reader rather than by subject.
 * The list that was here opened on three method areas and closed on leadership,
 * which is the order a researcher would choose and the opposite of the order a
 * hiring manager reads in: at this level the question is whether somebody can
 * set a direction and carry a team, and that was the last thing the page said.
 *
 * Each line now names the work and then what it was worth, because a detail
 * that only lists techniques ("tool use, RAG, response routing, MCP") is a
 * keyword dump a reader has no way to weigh. Where there is a number that can
 * be checked, it is here.
 *
 * The titles match the pillars on `/practice`, so a reader moving between the
 * two pages meets the same vocabulary twice rather than two taxonomies for one
 * career. Two of the old entries went: "Interfaces and prototyping", which is
 * real but is the weakest claim on a page competing for a senior reader's
 * attention and is already evidenced on `/projects`, and "Simulation", which
 * belongs inside evaluation rather than beside it.
 *
 * The confidentiality rules in `src/content/practice.ts` apply here too.
 */
export const focusAreas: { title: string; detail: string }[] = [
  {
    title: "LLMs and agentic systems",
    detail:
      "Agents that plan, call tools and are measured piece by piece, with the retrieval, routing and protocol work under them.",
  },
  {
    title: "Retrieval, ranking and recommendation",
    detail:
      "Search and personalisation serving millions of people, from field-aware ranking to two-tower retrieval and cross-lingual matching.",
  },
  {
    title: "Behaviour, time series and anomalies",
    detail:
      "Forecasting, monitoring and anomaly detection over behaviour that shifts underneath the model, inside production latency budgets.",
  },
  {
    title: "Multimodal inference",
    detail: "Vision, language, audio and sensor streams brought into one representation that a model can use.",
  },
  {
    title: "Evaluation and evidence",
    detail:
      "Online experiments, simulation and benchmarks built so a result can be defended, including label noise, bias and drift.",
  },
  {
    title: "Research leadership",
    detail:
      "Around 50 researchers and engineers mentored, research strategy owned across teams, and publication in places that had never published.",
  },
];

export type SocialLink = {
  label: string;
  href: string;
  /** Which icon to render — resolved in `components/social-links.tsx`. */
  icon: "scholar" | "orcid" | "github" | "linkedin";
};

// No email address. It was here, assembled at runtime to keep it out of the
// committed source, and it is now gone entirely: the safest address to publish
// is the one that is not published. LinkedIn carries anyone who needs to make
// contact.
export const socials: SocialLink[] = [
  { label: "Google Scholar", href: "https://scholar.google.com/citations?user=bRN8Y34AAAAJ", icon: "scholar" },
  { label: "ORCID", href: "https://orcid.org/0000-0002-3225-2654", icon: "orcid" },
  { label: "GitHub", href: "https://github.com/njtwomey", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/nialltwomey", icon: "linkedin" },
];

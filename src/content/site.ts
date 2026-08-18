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
   * Three paragraphs: what the work is and how the time gets allocated, then
   * where it has happened, then the one specialisation running under all of it.
   *
   * The third paragraph is last rather than second because it only lands once
   * the reader has seen the list of employers in the second. "Behavioural
   * modelling" asserted before the evidence reads as a label; asserted after
   * four unrelated-looking organisations it reads as the thing they had in
   * common. It names domains rather than employers for the same reason, since
   * repeating the second paragraph's list would be the third telling of the
   * same fact.
   *
   * The claim is deliberately bounded. It is that behavioural modelling is the
   * thread through jobs that otherwise look unrelated, not that it was the
   * point of every job, and the paragraph ends by saying what the shared
   * modelling problem actually is so the claim can be checked rather than
   * taken. Every domain in it is publicly evidenced: the sensing and dementia
   * work by the Bristol papers in content/publications.bib, the learner models
   * by the EDM paper, the cooking by the Cookpad retrieval and recommendation
   * papers. The Amazon clause is pitched at the level of a capability on
   * purpose. See the confidentiality header in src/content/practice.ts.
   *
   * The literature sentence in the first paragraph is about triage. Knowing
   * what has already been answered is what decides where the effort does not
   * go, which is what sets up the sentence after it about working where there
   * is no accumulated knowledge to draw on. An earlier version ended it on
   * "spend the time elsewhere", which named no destination and read as a
   * willingness to reuse other people's work rather than as a judgement call.
   *
   * The tooling and interface work is one closing sentence on purpose. It
   * signals that the capability runs wider than modelling, and it is not the
   * subject. See .claude/skills/writing before editing.
   */
  intro: [
    "I have spent the thirteen years since my PhD building machine learning that runs in production, starting in digital signal processing and health sensing and arriving at large language models, agentic systems and multimodal inference. I do my best work when the problem is not yet well posed and the answer has to be worked out rather than looked up. Knowing the literature is how I triage my own time: where an existing method holds up under evaluation I use it and put the effort into problems that have none. Having worked firsthand across enough different problems, I know early which approaches will hold, and that judgement speeds up delivery for me and for the teams I lead.",
    "I founded a research group at the University of Bristol on an MRC Fellowship, built recommendation and personalisation at Cookpad serving millions of people, then learner models and simulation for education technology at KidsLoop, and now lead science initiatives across a diverse portfolio of applications at Amazon (from anomaly detection, information retrieval and audio-visual AI, to agentic systems). I have authored around 70 peer-reviewed papers (at top venues including ICLR, AAAI, KDD, SIGIR, ECML, RecSys, ECAI and ICASSP) and several patents. Across my academic and industry roles, I have mentored around 50 researchers and engineers.",
    "Behavioural modelling is the specialisation underpinning my ML career: activity recognition from wearable and in-home sensors, behavioural signatures of early-stage dementia, personalised search and recommendation, and models of customer behaviour built from logged interactions. Those domains share no data and no evaluation protocol, and they pose the same problem: behaviour is soft and it shifts underneath a model, so I build systems that adapt to it while holding guarantees strong enough to prove in an online test, and to move the numbers the business cares about.",
  ],
} as const;

/**
 * What the work is actually about. Broader than a tag list and narrower than a
 * CV — each line is a body of work with shipped systems or papers behind it.
 */
export const focusAreas: { title: string; detail: string }[] = [
  {
    title: "LLMs and agentic systems",
    detail: "Tool use, RAG, response routing, MCP, built so each piece can be measured on its own.",
  },
  {
    title: "Retrieval, ranking and recommendation",
    detail: "Neural and field-aware ranking, two-tower retrieval, cross-modal embeddings, multilingual search.",
  },
  {
    title: "Interfaces and prototyping",
    detail: "React front ends for lineage, pipeline visualisation and evaluation harnesses.",
  },
  {
    title: "Multimodal inference",
    detail: "Vision-language alignment, speech and audio quality, and getting continuous signals into a usable shape.",
  },
  {
    title: "Time series and anomaly detection",
    detail: "Forecasting and monitoring over sparse and dense series, under production latency budgets.",
  },
  {
    title: "Simulation",
    detail:
      "User models with economic constraints, calibrated on observed behaviour, used to predict an experiment before running it.",
  },
  {
    title: "Responsible AI",
    detail: "Label noise tests, bias audits, drift detection, fairness-aware modelling.",
  },
  {
    title: "Research leadership",
    detail: "Roadmaps, mentoring, and getting research published in places that had never published.",
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

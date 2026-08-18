/**
 * The ML Practice page: capabilities, not employers.
 *
 * Each entry is an area of work — the methods, the tooling, the literature —
 * with the organisations it spans listed alongside it. One capability usually
 * covers several places, and one place covers several capabilities, so an
 * employer-shaped list forced the same material to be written two or three
 * times and still lost the through-line.
 *
 * ---------------------------------------------------------------------------
 * CONFIDENTIALITY. READ THIS BEFORE EDITING.
 * ---------------------------------------------------------------------------
 *
 * Describe capabilities, techniques, tooling and literature. Never a named
 * project, product, codename, internal team, internal tool or internal metric.
 * This applies to everything here and to the Amazon material especially.
 *
 * Concretely, and non-exhaustively, the following must not appear on this
 * page in any form:
 *
 *   - internal tool and project names, including the lazy evaluation engine
 *     that sits behind the "infrastructure" row, which has one internally and
 *     is deliberately unnamed here
 *   - any audio-synchronisation or re-voicing workstream, by any name, and
 *     any of the quality-validation detail attached to it
 *   - internal product surfaces, internal team names, internal goal
 *     terminology, and press or media references to specific projects
 *   - internal metrics: customer counts, coverage percentages, efficiency
 *     percentages, revenue, launch timelines
 *
 * "Extensive audio and speech processing" is fine. Naming what the audio was
 * for is not. If you cannot tell whether a sentence identifies a specific
 * internal system, delete it. Leaving something out costs nothing here.
 * Putting something in cannot be undone.
 *
 * Bristol, UCC, Cookpad and KidsLoop material is published research or public
 * product and is much less sensitive, but it is written in the same register:
 * what the method was, not what the project was called.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE PROSE WENT
 * ---------------------------------------------------------------------------
 *
 * This file used to end with a `writeups` array: a paragraph per row, rendered
 * by a detail route that a flag kept off the live site. The flag gated the route
 * and the links into it, and it did nothing at all about the text, because the
 * matrix imported this module and the bundler therefore shipped every paragraph
 * to every visitor in a chunk anyone could read. Hiding a page does not hide its
 * content.
 *
 * The prose is preserved verbatim in `.scratch/domains/writeups.ts`, which is
 * outside the compiled tree and gitignored. Nothing under `src/` may import it.
 * If the write-ups are ever wanted again the honest way to do it is to publish
 * them, not to compile them in and hope the route stays unregistered.
 *
 * ---------------------------------------------------------------------------
 * THE TWO LISTS, AND WHY THERE ARE TWO
 * ---------------------------------------------------------------------------
 *
 *   `specialities`  the rows: a slug, a title and an icon, in page order
 *   `coverage`      the cells: how deeply each row ran at each organisation
 *
 * They were one list of objects until the cells acquired a depth. Keeping the
 * depths in their own nested literal is what makes them editable: a rating pass
 * is then a column of numbers to scan and correct rather than dozens of objects
 * to open, and the types below turn a mistyped group, speciality or organisation
 * into a failing `npm run typecheck` rather than a quietly missing dot.
 *
 * `papers` used to live here too, holding citation keys for the evidence line on
 * the detail page. It left with the prose. Papers live on the publications page.
 */

/**
 * Career order, earliest first.
 *
 * The keys are short because they are typed once per filled cell in `coverage`,
 * about ninety times in all, and `"University College Cork": 2` repeated that
 * often is a wall rather than a table. They are also stable: a rename here is a
 * rename in every cell.
 */
export const orgs = [
  { key: "ucc", short: "UCC", name: "University College Cork" },
  { key: "bristol", short: "Bristol", name: "University of Bristol" },
  { key: "cookpad", short: "Cookpad", name: "Cookpad" },
  { key: "kidsloop", short: "KidsLoop", name: "KidsLoop" },
  { key: "amazon", short: "Amazon", name: "Amazon" },
] as const;

export type OrgKey = (typeof orgs)[number]["key"];

/**
 * How much of the role a speciality was.
 *
 * 3 is the thing the role was about, sustained over years. 2 is a substantial
 * part of it that kept coming back. 1 is real work that the role was not about.
 * The scale stops at three on purpose, because a five-point version invites a
 * middle value that means nothing and nobody can hold five levels apart at a
 * glance anyway.
 */
export type Depth = 1 | 2 | 3;

/**
 * An omitted organisation means no involvement, which is also what an honest
 * "I am not sure" should look like: a missing dot invites a correction and a
 * guessed one never gets checked again.
 */
export type Depths = Partial<Record<OrgKey, Depth>>;

/**
 * The three kinds of thing the groups below are.
 *
 * The groups used to be presented as siblings, and they are not siblings. A
 * method is a property of a piece of work, an application is the subject that
 * work was pointed at, and practice is the craft around both. A reader
 * therefore met a change of kind halfway down the page with nothing marking it,
 * and read the whole list as arbitrary in consequence. Naming the three
 * families costs three heading rows and moves no capability.
 *
 * The labels are deliberately flat. An earlier version phrased the method
 * headings as questions, on the theory that the grammar would mark the change
 * of kind by itself, and that is exactly the kind of cleverness this page
 * cannot afford: it is a dry statement of where the work has been, and a
 * heading that performs is a heading a reader has to decode first.
 *
 * A band is a label and nothing else. Each carried a gloss underneath it for a
 * while: that the four method themes are independent axes rather than a
 * partition, that the applications are subject matter rather than technique,
 * and that delivery cuts across both. Three sentences telling a reader how to
 * read a table is more page than the table, and they were answering a question
 * the headings answer by themselves. The reasoning is kept where it is useful
 * rather than where it was read, so the axes argument is on `themes` below and
 * the difference between the three kinds of claim is in the paragraph above
 * this one. Do not put it back on the page.
 */
export const families = [
  { id: "methods", label: "Methods" },
  { id: "applications", label: "Applications" },
  // These two were one family, "Delivery and direction", holding four themes.
  // They are separated because shipping a system and moving an organisation are
  // not the same kind of claim, and a single band asked a reader to read them as
  // one. Splitting them also stops the people and strategy rows reading as an
  // appendix to the engineering rows, which is what they looked like while the
  // four sat under one heading.
  { id: "delivery", label: "Delivery" },
  { id: "influence", label: "Influence" },
] as const;

export type Family = (typeof families)[number]["id"];

/**
 * Themes, in the order the page reads them, each filed under a family.
 *
 * Thirty-nine rows is more than anyone scans as a flat list, and the
 * neighbouring ones were often unrelated: retrieval sat beside interfaces, and
 * recommendation was four rows further down. Grouping them means a reader who
 * only cares about one kind of work can find the whole of it in one place.
 *
 * The four method themes are axes rather than a partition. They are not
 * mutually exclusive members of one taxonomy: they sit on independent
 * questions, and a single piece of work answers all of them at once. A
 * diffusion model fitted to unlabelled images is generative, unsupervised and
 * probabilistic simultaneously, and asking which of the three it "really" is
 * has no answer. One row can legitimately appear under a single axis while the
 * work behind it sits on several, which is a feature of the space rather than a
 * filing error.
 *
 * The axes are not exhaustive and must not be made so. Only rows Niall has
 * actually worked in appear. Discriminative modelling has no row because it
 * would be filled at all five organisations, and roughly twenty further entries
 * from the source taxonomy have none because the work is not there.
 *
 * Supervised learning was left out on that same argument and has been put back,
 * because the argument was wrong. A reader opening a list of learning paradigms
 * on "unsupervised and self-supervised" notices what is missing before they
 * notice what is there, and being filled everywhere is what a foundation looks
 * like rather than a reason to hide it. Behavioural modelling and data science
 * are filled at all five as well and nobody reads those as padding. A syllabus of empty rows would say
 * nothing about anybody. `.scratch/domains/ratings.md` records every exclusion
 * and the argument behind it.
 *
 * "Data acquisition and adaptation" carries transfer learning alongside active
 * learning and bandits, which is a slightly wider reading of the axis than the
 * source taxonomy takes. It earns its place: all three rows answer the question
 * of where the next useful example comes from when you cannot afford to collect
 * it here, and the Bristol work is literally Bayesian active transfer learning,
 * one method sitting across two of the three rows.
 *
 * The remaining boundaries are approximate and that is fine. Efficiency and
 * compression could sit with modelling rather than with shipping; it is there
 * because the reason for doing it is almost always that something has to run
 * somewhere cheap. Nothing downstream depends on a theme being the only
 * defensible home for an entry, so prefer the reading that helps a stranger
 * navigate.
 */
export const themes = [
  { id: "learning-signal", family: "methods", label: "Learning paradigms" },
  { id: "what-is-modelled", family: "methods", label: "Modelling and inference" },
  { id: "data-and-interaction", family: "methods", label: "Data acquisition and adaptation" },
  { id: "output-structure", family: "methods", label: "Output structure" },
  { id: "search-and-language", family: "applications", label: "Search, language and recommendation" },
  { id: "signals-and-sensing", family: "applications", label: "Signals, sensing and behaviour" },
  { id: "building-and-shipping", family: "delivery", label: "Building and shipping" },
  { id: "measurement-and-evidence", family: "delivery", label: "Measurement and evaluation" },

  // Two themes rather than one, because developing people and moving an
  // organisation are different claims and doing one does not imply the other.
  // The rows under the first are a person's development; the rows under the
  // second are mostly influence without authority, which is the harder half.
  { id: "developing-people", family: "influence", label: "Developing people" },
  { id: "strategy-and-influence", family: "influence", label: "Strategy and influence" },
] as const satisfies readonly { id: string; family: Family; label: string }[];

export type Theme = (typeof themes)[number]["id"];

/**
 * Icon keys rather than components, so this file stays free of React imports
 * and the mapping to lucide lives next to the markup that renders it.
 */
export type CapabilityIcon =
  | "supervised"
  | "unsupervised"
  | "weak"
  | "rl"
  | "preference"
  | "generative"
  | "probabilistic"
  | "representation"
  | "dynamics"
  | "active"
  | "bandit"
  | "transfer"
  | "structured"
  | "graph"
  | "agents"
  | "retrieval"
  | "recommendation"
  | "knowledge"
  | "multilingual"
  | "crossmodal"
  | "interfaces"
  | "infrastructure"
  | "efficiency"
  | "deployment"
  | "monitoring"
  | "practice"
  | "teaching"
  | "careers"
  | "methodology"
  | "community"
  | "handshake"
  | "strategy"
  | "executive"
  | "judgement"
  | "funding"
  | "interpretability"
  | "roadmap"
  | "linemanagement"
  | "hiring"
  | "performance"
  | "uncertainty"
  | "agentpractice"
  | "evaluation"
  | "signals"
  | "audio"
  | "vision"
  | "sensors"
  | "timeseries"
  | "behaviour"
  | "datascience"
  | "experimentation"
  | "simulation"
  | "responsible";

export type Speciality = (typeof specialities)[number]["slug"];

/**
 * Every row of the matrix, in page order.
 *
 * Kept in theme order, so an entry's neighbours are its own kind and the page
 * can group by walking it once — no sorting, and no second list to keep in step
 * with this one. A slug is stable because people link to it and because
 * `coverage` is keyed on it. Moving a row between themes changes its group key
 * in `coverage` and nothing else, which is why the reorganisation into axes cost
 * no ratings.
 */
export const specialities = [
  // First, because the rows under this heading are all defined against it.
  { theme: "learning-signal", slug: "supervised-learning", icon: "supervised", title: "Supervised learning" },
  {
    theme: "learning-signal",
    slug: "unsupervised-and-self-supervised",
    icon: "unsupervised",
    title: "Unsupervised and self-supervised learning",
  },
  {
    theme: "learning-signal",
    slug: "weak-supervision",
    icon: "weak",
    title: "Semi-supervised and weakly supervised learning",
  },
  { theme: "learning-signal", slug: "reinforcement-learning", icon: "rl", title: "Reinforcement learning" },
  {
    theme: "learning-signal",
    slug: "preference-and-reward-modelling",
    icon: "preference",
    title: "Preference and reward modelling",
  },

  {
    theme: "what-is-modelled",
    slug: "probabilistic-modelling",
    icon: "probabilistic",
    title: "Probabilistic and Bayesian modelling",
  },
  { theme: "what-is-modelled", slug: "generative-modelling", icon: "generative", title: "Generative modelling" },
  {
    theme: "what-is-modelled",
    slug: "uncertainty-quantification",
    icon: "uncertainty",
    title: "Uncertainty quantification and calibration",
  },
  {
    theme: "what-is-modelled",
    slug: "representation-learning",
    icon: "representation",
    title: "Representation and embedding learning",
  },
  {
    theme: "what-is-modelled",
    slug: "continuous-time-dynamics",
    icon: "dynamics",
    title: "Dynamics and continuous-time models",
  },

  { theme: "data-and-interaction", slug: "active-learning", icon: "active", title: "Active learning" },
  {
    theme: "data-and-interaction",
    slug: "bandit-learning",
    icon: "bandit",
    title: "Bandits and adaptive assignment",
  },
  // Fine-tuning is named here rather than given a row of its own, because
  // parameter-efficient fine-tuning is adaptation of a pretrained model and a
  // separate row would claim the same work twice.
  {
    theme: "data-and-interaction",
    slug: "transfer-and-adaptation",
    icon: "transfer",
    title: "Transfer, domain adaptation and fine-tuning",
  },

  { theme: "output-structure", slug: "structured-prediction", icon: "structured", title: "Structured prediction" },
  { theme: "output-structure", slug: "graph-learning", icon: "graph", title: "Graph and relational learning" },

  // Retrieval-augmented generation is named in the title rather than split out.
  // It is one workstream with tool use and routing, and a row of its own would
  // double-count the same work against the retrieval row underneath it.
  { theme: "search-and-language", slug: "llm-agentic-systems", icon: "agents", title: "LLM, RAG and agentic systems" },
  {
    theme: "search-and-language",
    slug: "retrieval-and-ranking",
    icon: "retrieval",
    title: "Information retrieval and ranking",
  },
  {
    theme: "search-and-language",
    slug: "recommendation-and-personalisation",
    icon: "recommendation",
    title: "Recommendation and personalisation",
  },
  {
    theme: "search-and-language",
    slug: "knowledge-graphs",
    icon: "knowledge",
    title: "Knowledge graphs and taxonomies",
  },
  {
    theme: "search-and-language",
    slug: "multilingual-and-cross-lingual",
    icon: "multilingual",
    title: "Multilingual and cross-lingual modelling",
  },
  {
    theme: "search-and-language",
    slug: "vision-language-cross-modal",
    icon: "crossmodal",
    title: "Vision, language and cross-modal representation",
  },

  {
    theme: "building-and-shipping",
    slug: "interfaces-and-visualisation",
    icon: "interfaces",
    title: "Interfaces and visualisation",
  },
  {
    theme: "building-and-shipping",
    slug: "infrastructure",
    icon: "infrastructure",
    title: "Research and production infrastructure",
  },
  {
    theme: "building-and-shipping",
    slug: "efficiency-and-compression",
    icon: "efficiency",
    title: "Efficiency, compression and on-device inference",
  },
  {
    theme: "building-and-shipping",
    slug: "field-deployment",
    icon: "deployment",
    title: "Field deployment and operations",
  },
  // Distinct from the infrastructure row above it, which is about building the
  // pipelines. This is about what happens to a model once it is serving: the
  // latency it has to hold, what it costs to run, and how a regression is
  // noticed before a user notices it.
  // The practice rather than the tooling: how a team builds once coding agents
  // are part of the loop. The tools themselves are on the technologies page.
  {
    theme: "building-and-shipping",
    slug: "agent-assisted-engineering",
    icon: "agentpractice",
    title: "Agent-assisted engineering practice",
  },
  {
    theme: "building-and-shipping",
    slug: "monitoring-and-reliability",
    icon: "monitoring",
    title: "Monitoring, latency and reliability",
  },

  { theme: "signals-and-sensing", slug: "signal-processing", icon: "signals", title: "Digital signal processing" },
  { theme: "signals-and-sensing", slug: "audio-and-speech", icon: "audio", title: "Audio and speech processing" },
  { theme: "signals-and-sensing", slug: "computer-vision", icon: "vision", title: "Computer vision and video" },
  // "Multi-modal sensor fusion" rather than "sensing and sensor fusion", which
  // was close enough to the signal processing row above to look like the same
  // claim written twice. This row is about combining heterogeneous sensors; that
  // one is about what you do to a single stream.
  { theme: "signals-and-sensing", slug: "sensor-modelling", icon: "sensors", title: "Multi-modal sensor fusion" },
  // Novelty detection had its own row until it became clear the two rows carried
  // the same claim: every organisation was rated on both, and the novelty row
  // was the weaker reading of the pair everywhere it appeared. Merged by taking
  // the higher rating in each column, so no claim was lost.
  {
    theme: "signals-and-sensing",
    slug: "time-series-and-anomaly-detection",
    icon: "timeseries",
    title: "Time series, forecasting and anomaly detection",
  },
  { theme: "signals-and-sensing", slug: "behavioural-modelling", icon: "behaviour", title: "Behavioural modelling" },

  { theme: "measurement-and-evidence", slug: "data-science", icon: "datascience", title: "Data science" },
  {
    theme: "measurement-and-evidence",
    slug: "experimentation",
    icon: "experimentation",
    title: "Online experimentation and A/B testing",
  },
  // Designing the measurement, as against running it: what the benchmark
  // contains, what the metric rewards, and whether an offline number predicts
  // the online one. It is the row the LLM work leans on hardest.
  {
    theme: "measurement-and-evidence",
    slug: "evaluation-design",
    icon: "evaluation",
    title: "Evaluation design and benchmarking",
  },
  {
    theme: "measurement-and-evidence",
    slug: "simulation-and-experimentation",
    icon: "simulation",
    title: "Simulation and synthetic data",
  },
  {
    theme: "measurement-and-evidence",
    slug: "interpretability",
    icon: "interpretability",
    title: "Interpretability and explainability",
  },
  { theme: "measurement-and-evidence", slug: "responsible-ml", icon: "responsible", title: "Responsible ML" },

  // One "Building research practice" row became four. Establishing how a team
  // works, teaching people, standing in the wider research community and setting
  // technical direction are four separable claims that happen to correlate, and
  // for a senior CV they are among the most load-bearing rows on the page. The
  // depths below start from that single row's own ratings rather than from
  // nothing, and each one is argued in `.scratch/domains/ratings.md`.
  {
    theme: "developing-people",
    slug: "mentoring-and-supervision",
    icon: "practice",
    title: "Mentoring and supervision",
  },
  {
    theme: "developing-people",
    slug: "growing-research-careers",
    icon: "careers",
    title: "Growing research careers",
  },
  {
    theme: "developing-people",
    slug: "line-management",
    icon: "linemanagement",
    title: "Line management and team building",
  },
  { theme: "developing-people", slug: "hiring", icon: "hiring", title: "Hiring and interview design" },
  {
    theme: "developing-people",
    slug: "performance-management",
    icon: "performance",
    title: "Performance management and promotion",
  },
  { theme: "developing-people", slug: "teaching", icon: "teaching", title: "Teaching and curriculum design" },

  {
    theme: "strategy-and-influence",
    slug: "research-strategy",
    icon: "strategy",
    title: "Research strategy and prioritisation",
  },
  {
    theme: "strategy-and-influence",
    slug: "roadmapping",
    icon: "roadmap",
    title: "Roadmapping and delivery planning",
  },
  {
    theme: "strategy-and-influence",
    slug: "technical-strategy",
    icon: "handshake",
    title: "Cross-team alignment and stakeholder partnership",
  },
  {
    theme: "strategy-and-influence",
    slug: "executive-communication",
    icon: "executive",
    title: "Executive communication and design documents",
  },
  // The rarest of these and the hardest to evidence, which is why it is named
  // rather than left implicit under mentoring: judgement exercised on other
  // people's work, deciding a promising direction should stop, catching a
  // flawed result before it ships. The CV calls it "trusted cross-organisational
  // scientific authority", and peer review and programme committees are the
  // public half of it.
  {
    theme: "strategy-and-influence",
    slug: "technical-judgement",
    icon: "judgement",
    title: "Technical judgement and research review",
  },
  {
    theme: "strategy-and-influence",
    slug: "research-methodology",
    icon: "methodology",
    title: "Research methodology and standards",
  },
  {
    theme: "strategy-and-influence",
    slug: "research-community",
    icon: "community",
    title: "Research community and dissemination",
  },
  {
    theme: "strategy-and-influence",
    slug: "securing-funding",
    icon: "funding",
    title: "Securing funding and research investment",
  },
] as const satisfies readonly { theme: Theme; slug: string; icon: CapabilityIcon; title: string }[];

/** The specialities filed under one theme, which is what keys `coverage`. */
type SpecialitiesOf<G extends Theme> = Extract<(typeof specialities)[number], { theme: G }>["slug"];

/**
 * Group, then speciality, then organisation, then depth.
 *
 * Exact keys the whole way down, so a speciality filed under the wrong group is
 * a type error at both ends: missing where it belongs and unexpected where it
 * was put. That matters more than it sounds, because the failure it prevents is
 * a row silently losing its dots rather than anything visible.
 */
export type CoverageTable = { [G in Theme]: Record<SpecialitiesOf<G>, Depths> };

export const coverage: CoverageTable = {
  "learning-signal": {
    // The one row filled at 3 everywhere, which is the honest answer: biosignal
    // classification, activity recognition, ranking, learner models and
    // everything since have all had labels at the centre of them.
    "supervised-learning": { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
    "unsupervised-and-self-supervised": { ucc: 1, bristol: 2, cookpad: 2, amazon: 2 },
    "weak-supervision": { bristol: 3, amazon: 2 },
    "reinforcement-learning": { kidsloop: 2, amazon: 2 },
    "preference-and-reward-modelling": { cookpad: 2, amazon: 2 },
  },

  "what-is-modelled": {
    "probabilistic-modelling": { ucc: 2, bristol: 3, amazon: 1 },
    "generative-modelling": { amazon: 3 },
    // One of the four keywords on his own Scholar profile, which is a stronger
    // claim than the CV makes and the reason this is a row rather than being
    // folded into the Bayesian one above it.
    "uncertainty-quantification": { ucc: 1, bristol: 3, amazon: 2 },
    "representation-learning": { bristol: 2, cookpad: 3, amazon: 3 },
    "continuous-time-dynamics": { bristol: 2 },
  },

  "data-and-interaction": {
    "active-learning": { bristol: 3 },
    "bandit-learning": { bristol: 2, kidsloop: 2 },
    "transfer-and-adaptation": { ucc: 1, bristol: 3, cookpad: 1, amazon: 2 },
  },

  "output-structure": {
    "structured-prediction": { bristol: 3 },
    "graph-learning": { bristol: 2, cookpad: 1 },
  },

  "search-and-language": {
    "llm-agentic-systems": { amazon: 3 },
    "retrieval-and-ranking": { cookpad: 3, amazon: 2 },
    "recommendation-and-personalisation": { cookpad: 3, kidsloop: 2, amazon: 1 },
    "knowledge-graphs": { cookpad: 2 },
    "multilingual-and-cross-lingual": { cookpad: 3, amazon: 2 },
    "vision-language-cross-modal": { cookpad: 3, amazon: 2 },
  },

  "building-and-shipping": {
    "interfaces-and-visualisation": { ucc: 1, bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
    infrastructure: { bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
    "efficiency-and-compression": { ucc: 2, bristol: 2, amazon: 2 },
    "field-deployment": { ucc: 2, bristol: 3, amazon: 1 },
    "agent-assisted-engineering": { amazon: 3 },
    "monitoring-and-reliability": { bristol: 2, cookpad: 2, amazon: 3 },
  },

  "signals-and-sensing": {
    "signal-processing": { ucc: 3, bristol: 2, amazon: 2 },
    "audio-and-speech": { bristol: 1, amazon: 3 },
    "computer-vision": { bristol: 1, cookpad: 2, amazon: 2 },
    "sensor-modelling": { ucc: 2, bristol: 3 },
    // Absorbed the novelty detection row, taking the higher of the two ratings
    // in each column. Novelty was UCC 3 and Bristol 1, both of which this row
    // already met or beat, so the merge cost nothing.
    "time-series-and-anomaly-detection": { ucc: 3, bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
    "behavioural-modelling": { ucc: 1, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 3 },
  },

  "measurement-and-evidence": {
    "data-science": { ucc: 2, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 2 },
    experimentation: { cookpad: 3, kidsloop: 3, amazon: 2 },
    "evaluation-design": { bristol: 3, cookpad: 3, kidsloop: 2, amazon: 3 },
    "simulation-and-experimentation": { bristol: 2, kidsloop: 3, amazon: 3 },
    // The ICLR paper on inherently interpretable time series classification is
    // the strongest single piece of evidence on this page for any row, and
    // explainability tooling is named in the CV's responsible AI cluster. No
    // Bristol cell: the dementia models are interpretable by construction, which
    // is not the same as having worked on interpretability.
    interpretability: { kidsloop: 2, amazon: 3 },
    "responsible-ml": { bristol: 2, kidsloop: 3, amazon: 2 },
  },

  "developing-people": {
    "mentoring-and-supervision": { bristol: 3, cookpad: 2, kidsloop: 2, amazon: 3 },
    // 6 direct mentees promoted to senior roles, and an internship programme
    // that took a team from 0 papers to 10.
    "growing-research-careers": { bristol: 2, cookpad: 2, kidsloop: 2, amazon: 3 },
    // Bristol only, and deliberately: designing and delivering undergraduate
    // and postgraduate courses is a thing that happened in one place.
    "line-management": { bristol: 3, cookpad: 2, kidsloop: 3, amazon: 2 },
    hiring: { bristol: 2, cookpad: 2, kidsloop: 3, amazon: 3 },
    "performance-management": { bristol: 2, kidsloop: 3, amazon: 3 },
    // Bristol only, and deliberately: designing and delivering undergraduate
    // and postgraduate courses is a thing that happened in one place.
    teaching: { bristol: 3 },
  },

  "strategy-and-influence": {
    "research-strategy": { cookpad: 2, kidsloop: 2, amazon: 3 },
    // Distinct from the row above it: strategy is deciding what is worth doing,
    // this is committing to when it lands and sequencing the work to get there.
    roadmapping: { cookpad: 2, kidsloop: 2, amazon: 3 },
    "technical-strategy": { bristol: 2, cookpad: 2, kidsloop: 2, amazon: 3 },
    "executive-communication": { bristol: 2, cookpad: 2, kidsloop: 2, amazon: 3 },
    "technical-judgement": { bristol: 3, cookpad: 2, kidsloop: 2, amazon: 3 },
    "research-methodology": { bristol: 2, cookpad: 3, kidsloop: 2, amazon: 3 },
    "research-community": { bristol: 3, cookpad: 2, kidsloop: 2, amazon: 2 },
    // Academic grants are UCC (IRCSET) and Bristol (MRC fellowship, PhD
    // studentship funding, £20k of competition prize money). The industry cells
    // are the same act in a different currency: winning leadership backing for a
    // research direction, which the CV records as advocating deep scientific
    // investment where others would have taken something off the shelf.
    "securing-funding": { ucc: 1, bristol: 3, kidsloop: 2, amazon: 3 },
  },
};

// The tooling used to sit here as a `technologies` array, rendered as four rows
// of pills under the matrix. It has a page of its own now, at `/technologies`,
// backed by `src/content/technologies.ts`. A capability against an organisation
// is a claim about work and a technology against one is a claim about tooling,
// and a reader who cannot tell the two apart trusts neither, which is the
// argument for separating them rather than for stacking them.

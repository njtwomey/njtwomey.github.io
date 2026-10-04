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
 */

/**
 * ---------------------------------------------------------------------------
 * HOW THIS IS SHAPED
 * ---------------------------------------------------------------------------
 *
 * A pillar is something a job advertisement names. Under each one, subcategories
 * hold the rows, which is what lets a precise row like Anomaly detection exist
 * without being promoted to a heading with one member under it.
 *
 * This replaced a cut by kind of claim: Methods, Applications, Delivery,
 * Influence. That was a textbook grouping and it scattered the thing a reader
 * is looking for, with "multimodal" landing in three families at once and
 * "LLMs and agents" in four, so anyone hiring for either had to assemble the
 * claim themselves. The history is in git if the old shape is ever wanted.
 *
 * Two bands. The verticals say what the work is; the horizontals under them
 * apply across all of them and speak to level rather than to specialism.
 *
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
  { key: "ucc", short: "UCC", name: "University College Cork", where: "Cork, Ireland" },
  { key: "bristol", short: "Bristol", name: "University of Bristol", where: "Bristol, UK" },
  { key: "cookpad", short: "Cookpad", name: "Cookpad", where: "Bristol, UK" },
  { key: "kidsloop", short: "KidsLoop", name: "KidsLoop", where: "London, UK" },
  { key: "amazon", short: "Amazon", name: "Amazon", where: "London, UK" },
] as const;

export type OrgKey = (typeof orgs)[number]["key"];

/**
 * How much of a job this was.
 *
 * The question each dot answers is not how good the work was or how hard it
 * was. It is how much of that job it accounted for, which is the one thing a
 * reader cannot get from a list of titles and the one thing they want.
 *
 * 3 is core to the role: something the job was substantially about, sustained
 * rather than a single project. 2 is a regular part of it that kept coming
 * back without being the point of the job. 1 is real work on it that happened
 * now and then.
 *
 * The scale stops at three on purpose. A five-point version invites a middle
 * value that means nothing, and nobody can hold five levels apart at a glance.
 */
export type Depth = 1 | 2 | 3;

/**
 * An omitted organisation means no involvement, which is also what an honest
 * "I am not sure" should look like: a missing dot invites a correction and a
 * guessed one never gets checked again.
 */
export type Depths = Partial<Record<OrgKey, Depth>>;

/**
 * The years each column covers, because a column that says only where is a
 * claim with no date on it.
 */
export const ORG_YEARS: Record<OrgKey, string> = {
  ucc: "2008–13",
  bristol: "2013–20",
  cookpad: "2020–21",
  kidsloop: "2021–22",
  amazon: "2022–",
};

/**
 * The timeline on `/career`, newest first.
 *
 * High level on purpose. The page exists to say where the work happened and
 * for how long, and the two pages beside it already answer what the work
 * consisted of in detail. A third list of achievements here would be a CV
 * pasted into a website.
 *
 * A list rather than one entry per organisation, because a spell somewhere is
 * not the same thing as a column in the matrix: UCC is one column there and
 * two entries here, a doctorate and the postdoctoral year after it. Keying
 * this on `OrgKey` instead would have forced the two to be one, which is why
 * it is not.
 *
 * `years` is only given where an entry covers part of an organisation's span.
 * Everywhere else it comes from `ORG_YEARS`, so the timeline and the matrix
 * columns cannot disagree about a date.
 *
 * `role` is filled in only where the title can be sourced: the current one from
 * `site.role`, the Bristol one from the fellowship that funded it, and the two
 * at UCC from what a doctorate and the year after it are called. Cookpad and
 * KidsLoop were left blank until Niall supplied them, rather than guessed: a
 * title nobody checked is the kind of error that surfaces in an interview. The
 * heading falls back to the organisation alone, so a missing one costs nothing
 * and the next addition needs no code change.
 *
 * The confidentiality rules at the top of this file apply here, and apply
 * hardest to the first entry.
 */
export const career: readonly { org: OrgKey; years?: string; role?: string; what: string }[] = [
  {
    org: "amazon",
    role: "Senior Applied Scientist",
    what: "Leading science initiatives across a portfolio of applications: anomaly detection, information retrieval, audio-visual AI and agentic systems.",
  },
  {
    org: "kidsloop",
    role: "Principal Applied Scientist",
    what: "Learner models and simulation for education technology.",
  },
  {
    org: "cookpad",
    role: "Research Lead",
    what: "Recommendation, personalisation and search, serving millions of people across several languages.",
  },
  {
    org: "bristol",
    role: "MRC Research Fellow / Assistant Professor (Lecturer)",
    what: "Founded and led a research group on an MRC Fellowship, working on health sensing, activity recognition from wearable and in-home sensors, and behavioural signatures of early-stage dementia.",
  },
  {
    org: "ucc",
    years: "2012–13",
    role: "Postdoctoral Researcher",
    what: "Postdoctoral research on ultra-low-power machine learning for edge devices.",
  },
  {
    org: "ucc",
    years: "2008–12",
    role: "PhD Student",
    what: "Doctoral research in digital signal processing and health sensing.",
  },
];

export type Row = {
  slug: string;
  title: string;
  depths: Depths;
  /**
   * One plain sentence saying what this is, shown on hover.
   *
   * Written for somebody who knows what software is and not what this corner
   * of it is, which is most of the people the page is for. Say what the thing
   * is, not why it matters: the dots beside it already make the second claim.
   */
  what: string;
};

export type Subcategory = { label: string; rows: readonly Row[] };

export type Pillar = {
  id: string;
  label: string;
  /** `work` is a vertical and `how` a horizontal that runs across all of them. */
  band: "work" | "how";
  subcategories: readonly Subcategory[];
};

export const bands = [
  { id: "work", label: "What I work on" },
  { id: "how", label: "How I work" },
] as const;

export const pillars: readonly Pillar[] = [
  {
    id: "retrieval",
    label: "Retrieval, ranking and recommendation",
    band: "work",
    subcategories: [
      {
        label: "Retrieval",
        rows: [
          {
            slug: "information-retrieval",
            title: "Information retrieval",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Finding the documents in a large collection that answer a query.",
          },
          {
            slug: "knowledge-graphs",
            title: "Knowledge graphs and taxonomies",
            depths: { cookpad: 3, kidsloop: 3 },
            what: "Organising things and the relationships between them so a system can look them up and reason over them.",
          },
          {
            slug: "multilingual-and-cross-lingual",
            title: "Multilingual and cross-lingual modelling",
            depths: { cookpad: 3 },
            what: "Models that work across several languages, including matching a query in one language to content in another.",
          },
        ],
      },
      {
        label: "Ranking",
        rows: [
          {
            slug: "ranking",
            title: "Ranking and re-ranking",
            depths: { cookpad: 3, kidsloop: 3, amazon: 2 },
            what: "Putting a shortlist of results in the best order, and re-scoring the top of it more carefully.",
          },
        ],
      },
      {
        label: "Recommendation",
        rows: [
          {
            slug: "recommendation",
            title: "Recommendation",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Suggesting things somebody is likely to want without them having searched for it.",
          },
          {
            slug: "personalisation",
            title: "Personalisation",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Adapting what a system shows to the individual person using it.",
          },
        ],
      },
      {
        label: "Representations",
        rows: [
          {
            slug: "representation-learning",
            title: "Representation and embedding learning",
            depths: { ucc: 1, bristol: 1, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Turning text, images or behaviour into vectors so that similar things end up close together.",
          },
        ],
      },
    ],
  },
  {
    id: "multimodal",
    label: "Multimodal and signals",
    band: "work",
    subcategories: [
      {
        label: "Vision and language",
        rows: [
          {
            slug: "vision-language-models",
            title: "Vision-language models",
            depths: { cookpad: 3, amazon: 3 },
            what: "Models that read images and text together, such as answering a question about a picture.",
          },
          {
            slug: "cross-modal-representation",
            title: "Cross-modal representation",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Putting different kinds of data into one shared space so an image and a sentence can be compared directly.",
          },
        ],
      },
      {
        label: "Vision",
        rows: [
          {
            slug: "computer-vision",
            title: "Computer vision and video",
            depths: { cookpad: 3, amazon: 3 },
            what: "Getting information out of images and video, such as what is in them and where.",
          },
        ],
      },
      {
        label: "Audio and speech",
        rows: [
          {
            slug: "audio-and-speech",
            title: "Audio and speech processing",
            depths: { bristol: 3, kidsloop: 2, amazon: 3 },
            what: "Working with sound and the voice in it, including recognition, separation and synthesis.",
          },
        ],
      },
      {
        label: "Sensing",
        rows: [
          {
            slug: "signal-processing",
            title: "Digital signal processing",
            depths: { ucc: 3, bristol: 3, amazon: 3 },
            what: "Filtering, transforming and extracting structure from raw measurements over time.",
          },
          {
            slug: "sensor-modelling",
            title: "Multi-modal sensor fusion",
            depths: { ucc: 2, bristol: 3 },
            what: "Combining several sensors that each see part of the picture into one estimate.",
          },
        ],
      },
    ],
  },
  {
    id: "llms",
    label: "LLMs and agentic systems",
    band: "work",
    subcategories: [
      {
        label: "Language models",
        rows: [
          {
            slug: "llms",
            title: "Large language models",
            depths: { amazon: 3 },
            what: "Large models trained on text that generate and transform language.",
          },
          {
            slug: "generative-modelling",
            title: "Generative modelling",
            depths: { amazon: 3 },
            what: "Models that learn what data looks like well enough to produce new examples of it.",
          },
        ],
      },
      {
        label: "Retrieval-augmented generation",
        rows: [
          {
            slug: "rag",
            title: "Retrieval-augmented generation",
            depths: { amazon: 3 },
            what: "Giving a language model the documents it needs at the moment it answers, rather than relying on what it memorised.",
          },
        ],
      },
      {
        label: "Agents",
        rows: [
          {
            slug: "agentic-systems",
            title: "Agentic systems",
            depths: { kidsloop: 2, amazon: 3 },
            what: "Systems where a model plans, calls tools and acts over several steps rather than answering once.",
          },
          {
            slug: "agent-assisted-engineering",
            title: "Agent-assisted engineering practice",
            depths: { amazon: 3 },
            what: "Building and reviewing software with coding agents as part of the normal workflow.",
          },
        ],
      },
      {
        label: "Protocols",
        rows: [
          {
            slug: "agent-protocols",
            title: "Agent communication protocols",
            depths: { amazon: 3 },
            what: "The standards agents use to talk to each other and to the services around them.",
          },
          {
            slug: "tool-interfaces",
            title: "Tool and context interfaces",
            depths: { amazon: 3 },
            what: "Defining the tools and context a model is given, and how it is told to use them.",
          },
        ],
      },
      {
        label: "Alignment",
        rows: [
          {
            slug: "preference-and-reward-modelling",
            title: "Preference and reward modelling",
            depths: { cookpad: 2, kidsloop: 2, amazon: 2 },
            what: "Learning what counts as a good answer from human comparisons, and scoring against it.",
          },
        ],
      },
    ],
  },
  {
    id: "behaviour",
    label: "Behaviour, time series and anomalies",
    band: "work",
    subcategories: [
      {
        label: "Behavioural modelling",
        rows: [
          {
            slug: "behavioural-modelling",
            title: "Behavioural modelling",
            depths: { ucc: 1, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Modelling what people do over time, and how that changes.",
          },
          {
            slug: "continuous-time-dynamics",
            title: "Dynamics and continuous-time models",
            depths: { bristol: 2 },
            what: "Modelling systems that evolve continuously rather than in fixed steps.",
          },
        ],
      },
      {
        label: "Time series and forecasting",
        rows: [
          {
            slug: "time-series",
            title: "Time series modelling",
            depths: { ucc: 3, bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
            what: "Modelling measurements taken in sequence, where the order carries the meaning.",
          },
          {
            slug: "forecasting",
            title: "Forecasting",
            depths: { ucc: 3, bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
            what: "Predicting what a series will do next.",
          },
        ],
      },
      {
        label: "Anomaly detection",
        rows: [
          {
            slug: "anomaly-detection",
            title: "Anomaly detection",
            depths: { ucc: 3, bristol: 2, cookpad: 1, kidsloop: 1, amazon: 3 },
            what: "Finding the cases that do not look like the rest, usually without examples of what to look for.",
          },
        ],
      },
    ],
  },
  {
    id: "probabilistic",
    label: "Probabilistic modelling and uncertainty",
    band: "work",
    subcategories: [
      {
        label: "Bayesian methods",
        rows: [
          {
            slug: "probabilistic-modelling",
            title: "Probabilistic and Bayesian modelling",
            depths: { ucc: 2, bristol: 3, cookpad: 2, kidsloop: 3, amazon: 3 },
            what: "Modelling with explicit probabilities, so the answer comes with its own uncertainty.",
          },
        ],
      },
      {
        label: "Uncertainty",
        rows: [
          {
            slug: "uncertainty-quantification",
            title: "Uncertainty quantification and calibration",
            depths: { ucc: 1, bristol: 3, kidsloop: 3, amazon: 2 },
            what: "Saying how confident a model is, and making that confidence trustworthy.",
          },
        ],
      },
      {
        label: "Structure",
        rows: [
          {
            slug: "structured-prediction",
            title: "Structured prediction",
            depths: { bristol: 3, kidsloop: 3, amazon: 2 },
            what: "Predicting a whole structure, such as a sequence or a tree, where the parts constrain each other.",
          },
          {
            slug: "graph-learning",
            title: "Graph and relational learning",
            depths: { bristol: 2, cookpad: 1, kidsloop: 3, amazon: 3 },
            what: "Learning over data shaped as a network of connected entities.",
          },
        ],
      },
    ],
  },
  {
    id: "limited-labels",
    label: "Learning with limited labels",
    band: "work",
    subcategories: [
      {
        label: "Self-supervision",
        rows: [
          {
            slug: "unsupervised-and-self-supervised",
            title: "Unsupervised and self-supervised learning",
            depths: { ucc: 1, bristol: 2, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Learning structure from data with no labels, often by making up a task the data can answer itself.",
          },
        ],
      },
      {
        label: "Weak supervision",
        rows: [
          {
            slug: "weak-supervision",
            title: "Semi-supervised and weakly supervised learning",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Learning from a few labels, noisy labels, or rules that stand in for labels.",
          },
        ],
      },
      {
        label: "Adaptation",
        rows: [
          {
            slug: "transfer-learning",
            title: "Transfer learning",
            depths: { ucc: 1, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 2 },
            what: "Reusing what a model learned on one problem to start on another.",
          },
          {
            slug: "domain-adaptation",
            title: "Domain adaptation",
            depths: { ucc: 1, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 2 },
            what: "Making a model that works in one setting keep working when the data shifts.",
          },
          {
            slug: "fine-tuning",
            title: "Fine-tuning",
            depths: { ucc: 1, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 3 },
            what: "Training a general model further on a specific task or dataset.",
          },
        ],
      },
      {
        label: "Active selection",
        rows: [
          {
            slug: "active-learning",
            title: "Active learning",
            depths: { bristol: 3, cookpad: 1, kidsloop: 1, amazon: 2 },
            what: "Choosing which examples to label next, so the labelling budget buys the most.",
          },
        ],
      },
    ],
  },
  {
    id: "sequential",
    label: "Sequential decisions",
    band: "work",
    subcategories: [
      {
        label: "Reinforcement learning",
        rows: [
          {
            slug: "reinforcement-learning",
            title: "Reinforcement learning",
            depths: { kidsloop: 2, amazon: 2 },
            what: "Learning what to do from the consequences of doing it.",
          },
        ],
      },
      {
        label: "Bandits",
        rows: [
          {
            slug: "bandit-learning",
            title: "Bandits and adaptive assignment",
            depths: { bristol: 2, cookpad: 1, kidsloop: 2, amazon: 2 },
            what: "Deciding what to try next when every try costs something and the answers are only learned by trying.",
          },
        ],
      },
    ],
  },
  {
    id: "shipping",
    label: "Shipping and operations",
    band: "how",
    subcategories: [
      {
        label: "Infrastructure",
        rows: [
          {
            slug: "infrastructure",
            title: "Research and production infrastructure",
            depths: { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "The pipelines, training systems and serving stacks the work runs on.",
          },
          {
            slug: "interfaces-and-visualisation",
            title: "Interfaces and visualisation",
            depths: { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Building the tools and views that let people see and interrogate what a model is doing.",
          },
        ],
      },
      {
        label: "Efficiency",
        rows: [
          {
            slug: "efficiency",
            title: "Efficiency and compression",
            depths: { ucc: 3, bristol: 3, cookpad: 1, kidsloop: 1, amazon: 1 },
            what: "Making models smaller and cheaper to run without losing what matters.",
          },
          {
            slug: "on-device-inference",
            title: "On-device and edge inference",
            depths: { ucc: 2, bristol: 2, amazon: 2 },
            what: "Running models on the phone, the sensor or the device rather than in a data centre.",
          },
        ],
      },
      {
        label: "Operations",
        rows: [
          {
            slug: "field-deployment",
            title: "Field deployment and operations",
            depths: { ucc: 2, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Getting a system working outside the lab, and keeping it working.",
          },
          {
            slug: "monitoring",
            title: "Monitoring and alerting",
            depths: { bristol: 2, cookpad: 2, kidsloop: 2, amazon: 2 },
            what: "Watching a live system and noticing when it starts behaving differently.",
          },
          {
            slug: "latency-and-reliability",
            title: "Latency and reliability",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Making a system answer fast enough, and keep answering.",
          },
        ],
      },
    ],
  },
  {
    id: "evaluation",
    label: "Evaluation and evidence",
    band: "how",
    subcategories: [
      {
        label: "Experimentation",
        rows: [
          {
            slug: "experimentation",
            title: "Online experimentation and A/B testing",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Testing a change on real traffic and measuring what it did.",
          },
          {
            slug: "simulation-and-experimentation",
            title: "Simulation and synthetic data",
            depths: { ucc: 2, bristol: 2, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Standing in for data that does not exist yet, by simulating it or generating it.",
          },
        ],
      },
      {
        label: "Evaluation",
        rows: [
          {
            slug: "evaluation-design",
            title: "Evaluation design and benchmarking",
            depths: { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Deciding what to measure and building the test sets that measure it honestly.",
          },
          {
            slug: "data-science",
            title: "Data science",
            depths: { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Getting an answer out of data: the analysis, the statistics and the judgement around both.",
          },
        ],
      },
      {
        label: "Trust",
        rows: [
          {
            slug: "interpretability",
            title: "Interpretability and explainability",
            depths: { ucc: 3, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Working out why a model produced the answer it did.",
          },
          {
            slug: "responsible-ml",
            title: "Responsible ML",
            depths: { ucc: 2, bristol: 3, cookpad: 2, kidsloop: 2, amazon: 2 },
            what: "Checking a system for harm, bias and misuse before and after it ships.",
          },
        ],
      },
    ],
  },
  {
    id: "leading",
    label: "Leading and influence",
    band: "how",
    subcategories: [
      {
        label: "Developing people",
        rows: [
          {
            slug: "mentoring-and-supervision",
            title: "Mentoring and supervision",
            depths: { ucc: 1, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Guiding individual researchers and engineers through their work.",
          },
          {
            slug: "growing-research-careers",
            title: "Growing research careers",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Helping people get better over years rather than over a project.",
          },
          {
            slug: "line-management",
            title: "Line management and team building",
            depths: { bristol: 3, cookpad: 2, kidsloop: 3, amazon: 3 },
            what: "Managing people directly, and putting teams together.",
          },
          {
            slug: "hiring",
            title: "Hiring and interview design",
            depths: { ucc: 1, bristol: 3, cookpad: 2, kidsloop: 3, amazon: 3 },
            what: "Finding candidates, designing how they are assessed, and deciding.",
          },
          {
            slug: "performance-management",
            title: "Performance management and promotion",
            depths: { bristol: 2, cookpad: 2, kidsloop: 3, amazon: 3 },
            what: "Reviewing how people are doing, and making the case for promotion.",
          },
          {
            slug: "teaching",
            title: "Teaching and curriculum design",
            depths: { bristol: 3 },
            what: "Designing and giving courses and teaching material.",
          },
        ],
      },
      {
        label: "Strategy",
        rows: [
          {
            slug: "research-strategy",
            title: "Research strategy and prioritisation",
            depths: { cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Choosing which research is worth doing, and which is not.",
          },
          {
            slug: "roadmapping",
            title: "Roadmapping and delivery planning",
            depths: { bristol: 3, cookpad: 2, kidsloop: 3, amazon: 3 },
            what: "Turning a direction into a plan with dates that people can work to.",
          },
          {
            slug: "securing-funding",
            title: "Securing funding and research investment",
            depths: { ucc: 1, bristol: 3, kidsloop: 2, amazon: 3 },
            what: "Winning the grants and the internal investment that pay for the work.",
          },
        ],
      },
      {
        label: "Influence",
        rows: [
          {
            slug: "technical-strategy",
            title: "Cross-team alignment and stakeholder partnership",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Getting teams that do not report to each other pointed the same way.",
          },
          {
            slug: "executive-communication",
            title: "Executive communication and design documents",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Explaining technical work to decision makers, usually in writing.",
          },
          {
            slug: "technical-judgement",
            title: "Technical judgement and research review",
            depths: { bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Reviewing other people's technical work and saying whether it holds.",
          },
        ],
      },
      {
        label: "Research standards",
        rows: [
          {
            slug: "research-methodology",
            title: "Research methodology and standards",
            depths: { ucc: 1, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Setting how research is done here, so results can be trusted and repeated.",
          },
          {
            slug: "research-community",
            title: "Research community and dissemination",
            depths: { ucc: 1, bristol: 3, cookpad: 3, kidsloop: 3, amazon: 3 },
            what: "Publishing, reviewing, speaking, and the work of being part of the field.",
          },
        ],
      },
    ],
  },
];

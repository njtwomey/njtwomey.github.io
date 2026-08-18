/**
 * The domains page: capabilities, not employers.
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
 *     described under "infrastructure" below, which has one internally and is
 *     deliberately unnamed here
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
 *
 * Two things the page is supposed to make obvious, so do not edit them out:
 *
 *   1. Everything here shipped. Every `did` says where, in its own sentences,
 *      and an entry that never reaches a house, a clinic or production is
 *      missing the half that makes it worth reading.
 *   2. Interfaces and visualisation is a first-class capability, not a
 *      footnote on the infrastructure entry. It opens its theme on purpose,
 *      and the theme it opens is placed second.
 *
 * `papers` holds citation keys and nothing else does. There are no outbound
 * links, because papers live on the publications page and most of this has no
 * public page to point at. Figures quoted here come from published papers,
 * which is what makes them safe to quote.
 *
 * Prose rules live in .claude/skills/writing. Complete sentences, concrete
 * nouns, no closing aphorisms, no reworded CV bullets.
 */

/** Kept as a union so an organisation cannot be spelled two ways across entries. */
export type Org = "Amazon" | "KidsLoop" | "Cookpad" | "University of Bristol" | "University College Cork";

/**
 * Icon keys rather than components, so this file stays free of React imports
 * and the mapping to lucide lives next to the markup that renders it. Ordered
 * to match the entries below, so a new entry and its icon stay adjacent.
 */
export type CapabilityIcon =
  | "agents"
  | "retrieval"
  | "recommendation"
  | "knowledge"
  | "crossmodal"
  | "interfaces"
  | "infrastructure"
  | "efficiency"
  | "deployment"
  | "practice"
  | "signals"
  | "audio"
  | "sensors"
  | "timeseries"
  | "novelty"
  | "behaviour"
  | "probabilistic"
  | "dynamics"
  | "rl"
  | "weak"
  | "datascience"
  | "simulation"
  | "responsible";

/**
 * Themes, in the order the page reads them.
 *
 * Twenty-three entries is more than anyone scans as a flat list, and the
 * neighbouring ones were often unrelated: retrieval sat beside interfaces, and
 * recommendation was four rows further down. Grouping them means a reader who
 * only cares about one kind of work can find the whole of it in one place.
 *
 * The boundaries are approximate and that is fine. Efficiency and compression
 * could sit with modelling rather than with shipping; it is here because the
 * reason for doing it is almost always that something has to run somewhere
 * cheap. Nothing downstream depends on a theme being the only defensible home
 * for an entry, so prefer the reading that helps a stranger navigate.
 */
export const themes = [
  { id: "search-and-language", label: "Search, language and recommendation" },
  { id: "building-and-shipping", label: "Building and shipping" },
  { id: "signals-and-sensing", label: "Signals, sensing and behaviour" },
  { id: "modelling-and-inference", label: "Modelling and inference" },
  { id: "measurement-and-evidence", label: "Measurement and evidence" },
] as const;

export type Theme = (typeof themes)[number]["id"];

export type Capability = {
  /** Used in the URL fragment and as the React key. Stable: people link to these. */
  slug: string;
  /**
   * Which theme this belongs to. The array below is kept in theme order, so an
   * entry's neighbours are its own kind and the page can group by walking it
   * once — no sorting, and no second list to keep in step with this one.
   */
  theme: Theme;
  title: string;
  icon: CapabilityIcon;
  /** Where the work happened. Rendered as pills. Order is roughly by weight. */
  orgs: Org[];
  /** Only where a range genuinely helps. This is not a timeline. */
  period?: string;
  /**
   * The whole entry: what was built, how, and at what scale.
   *
   * Written for a technical reader scanning the page, which sets both the floor
   * and the ceiling. The floor is specifics: named methods, named architectures,
   * a number against its baseline, the size of the thing it ran on. A draft that
   * said "I build agentic pipelines as separately measurable components" was
   * rejected outright for having none of these, because it states a conclusion
   * and gives the reader nothing to check it against or recognise.
   *
   * The ceiling is that it does not teach the field. It should not explain what
   * information retrieval is, or open by defining a neural ODE, because the
   * reader either knows or is not the audience. Earn attention with density, not
   * with preamble.
   *
   * Where it ran belongs in these sentences rather than in a field of its own.
   * An earlier draft carried it separately and the page set it as a quoted line
   * under the prose, which made the production fact read as a footnote to the
   * claim when it is half of the claim.
   */
  did: string;
  /**
   * Citation keys from content/publications.bib, and the reason the page now
   * touches them at all.
   *
   * A claim about what somebody can do is worth little without a way to check
   * it, and the bibliography is the strongest check available. The keys are
   * never printed: the page derives a count and the venues from them, so the
   * evidence line cannot drift out of step with the bibliography the way a
   * hand-written "nine papers" would.
   *
   * Omitted where the work was never published, which is a real signal on a page
   * that mixes research with production, so do not reach for a loosely related
   * key to avoid an empty line.
   */
  papers?: string[];
  /** Rendered as a chip row, so the page can be skimmed for a technique. */
  methods: string[];
};

export const capabilities: Capability[] = [
  {
    slug: "llm-agentic-systems",
    theme: "search-and-language",
    title: "LLM and agentic systems",
    icon: "agents",
    orgs: ["Amazon"],
    period: "2022 – present",
    did: "A fact worth acting on is rarely in one document, and reconciling it across a contract, an email thread and a ticket that disagree is most of the work. The agentic document-understanding pipelines I have built for that use tool use and tool routing, RAG over mixed and inconsistent formats, response routing, chain of thought, MCP and A2A for interoperability, and LoRA and PEFT where a small model needs adapting. Each stage is a separately evaluated component with its own test set rather than one prompt scored end to end, because a single number over eight steps says nothing about which one to fix. These run under production latency budgets against readiness benchmarks, and I wrote the organisation's prompting and orchestration guidelines.",
    methods: [
      "tool use and routing",
      "RAG",
      "response routing",
      "chain of thought",
      "MCP",
      "A2A",
      "LoRA / PEFT",
      "LLM as judge",
      "small language models",
      "readiness benchmarking",
    ],
  },
  {
    slug: "retrieval-and-ranking",
    theme: "search-and-language",
    title: "Information retrieval and ranking",
    icon: "retrieval",
    orgs: ["Cookpad", "Amazon"],
    period: "2020 – present",
    did: "A recipe is a title, an ingredient list, a description, a country and an image, and flattening those into one text field throws away which of them the query actually matched. Field-aware neural rankers keep the fields separate and model the interactions explicitly. Restricting a field-weighted factorisation machine to query-field interactions, chosen with domain knowledge, beat exhaustive all-pairs enumeration on the platform's own search logs at 0.667 against 0.661 NDCG@20, on less data. The choice was also explainable back to product as a layout question. Subgroup discovery over a normalised multilingual taxonomy sits above the ranker and generates facets at query time, surfacing long-tail and culturally specific content. Lexical and dense retrieval fed the ranker for millions of users across many markets, with every change measured in a live A/B test.",
    papers: ["takiguchi2021multifield", "takiguchi2020nonlinear", "fain2021backretrieval", "fain2019dividing"],
    methods: [
      "field-weighted factorisation machines",
      "neural document ranking",
      "BM25",
      "FAISS / ANN indexing",
      "subgroup discovery",
      "query-time faceting",
      "long-tail exposure",
    ],
  },
  {
    slug: "recommendation-and-personalisation",
    theme: "search-and-language",
    title: "Recommendation and personalisation",
    icon: "recommendation",
    orgs: ["Cookpad", "KidsLoop", "Amazon"],
    period: "2020 – present",
    did: "Cookpad held billions of behavioural events that no model consumed, so the feed and the ranking ran on popularity and rules. I built the loop that closed it, from collaborative filtering baselines through two-tower retrieval to sequential session models, fitted on roughly seven billion interactions across five languages, eighteen million users and four million recipes. Bayesian optimisation over recipe representations selected normalised ingredients and cooking skills in every language, and full-text embeddings added nothing measurable. Cold start was a design constraint rather than an afterthought, with geography carrying enough signal for a first recommendation worth serving. The first models moved relevance more than 30% over the rules they replaced, across the home feed, search ranking and email.",
    papers: ["twomey2020towards"],
    methods: [
      "two-tower retrieval",
      "session and sequential models",
      "collaborative filtering",
      "cold start",
      "Bayesian optimisation",
      "multi-modal signals",
      "content sequencing",
      "A/B testing",
    ],
  },
  {
    slug: "knowledge-graphs",
    theme: "search-and-language",
    title: "Knowledge graphs and taxonomies",
    icon: "knowledge",
    orgs: ["Cookpad"],
    period: "2020 – 2021",
    did: "Dashi, kaldu ikan and fish stock are one ingredient carrying one set of allergen and dietary implications, and nothing in a multilingual recipe corpus says so. The cross-lingual knowledge graph I built over millions of recipes in dozens of languages resolves that, covering ingredients, techniques and dietary attributes, seeded from structured sources and then enriched by extraction from the corpus itself. This predates practical extraction with language models, so an ensemble of smaller models classified each incoming assertion as novel, known, mergeable or contradictory, and reconciling the contradictions took most of the effort. Automatic dietary tagging was the commercial case, since the largest market was predominantly halal. It fed search and recommendation one consistent semantic signal across languages.",
    methods: [
      "taxonomy construction",
      "entity resolution",
      "cross-lingual alignment",
      "conflict resolution",
      "dietary and allergen classification",
      "knowledge graphs",
      "data enrichment",
    ],
  },
  {
    slug: "vision-language-cross-modal",
    theme: "search-and-language",
    title: "Vision, language and cross-modal representation",
    icon: "crossmodal",
    orgs: ["Cookpad", "Amazon"],
    period: "2020 – present",
    did: "This was a CLIP-style joint image and text embedding, built before CLIP was published. The two encoders were trained separately under self-supervised classification objectives with a non-parametric retrieval layer on top, rather than as one end-to-end network. It set state of the art on Recipe1M by a wide margin with substantially less machinery than the methods it beat, and transferred unchanged to the Politics and GoodNews benchmarks. Decomposing it was a deployment decision, since encoders and retrieval fail differently and update on different cadences, so either can be replaced without retraining the other. It also yielded an image-pivoted metric for comparing text representations across languages, which removes the need for parallel corpora. It ran in production for multilingual visual discovery.",
    papers: ["fain2019dividing", "fain2021backretrieval"],
    methods: [
      "contrastive and self-supervised objectives",
      "triplet loss",
      "non-parametric retrieval",
      "multi-label visual prediction",
      "cross-lingual embeddings",
      "image-pivoted offline evaluation",
      "video diffusion",
    ],
  },
  {
    slug: "interfaces-and-visualisation",
    theme: "building-and-shipping",
    title: "Interfaces and visualisation",
    icon: "interfaces",
    orgs: ["Amazon", "KidsLoop", "Cookpad", "University of Bristol", "University College Cork"],
    period: "2008 – present",
    did: "An argument about whether a model is behaving ends the moment somebody can open the case they are worried about and look at it, which is why the tooling for that is worth building properly. That has meant confidence surfaces for multi-class problems, annotation and inspection tools that put a raw sensor trace beside the label a human gave it, evaluation harnesses that render a comparison rather than a table of numbers, and insight views for deciding whether a modelling direction is worth pursuing at all. The largest is a computation-graph browser where you open an invocation, read its real inputs and outputs, trace lineage across previous runs and see cache hit rates and failure patterns per task. Mostly React, rendering to SVG where the structure matters, in every role since the doctoral signal processing.",
    methods: [
      "React",
      "TypeScript",
      "interactive DAG browsing",
      "lineage and provenance views",
      "SVG rendering",
      "evaluation harnesses",
      "visual analytics",
      "Tailwind",
    ],
  },
  {
    slug: "infrastructure",
    theme: "building-and-shipping",
    title: "Research and production infrastructure",
    icon: "infrastructure",
    orgs: ["University of Bristol", "Cookpad", "KidsLoop", "Amazon"],
    period: "2013 – present",
    did: "I released HyperStream at Bristol, an open-source streaming workflow engine that kept models running in real time across the deployed houses. The current version of the problem is a lazy evaluation engine for ML pipelines, where ordinary Python composes freely and nothing runs until something is materialised. Task identity, inputs and namespace hash into a content-addressed key that doubles as a deduplication fingerprint and a provenance anchor, so repeated sub-plans across retries or parallel branches never recompute and results replay out of SQLite or Postgres with lineage intact. Around it sit codec-aware tensor and document storage, composable subgraph motifs, and adaptive mid-plan materialisation for data-dependent control flow. Shared feature stores and modelling templates took prototyping a new model from days to about an hour.",
    papers: ["diethe2019hyperstream", "diethe2018releasing"],
    methods: [
      "content-addressed DAGs",
      "lazy evaluation",
      "deduplication and provenance",
      "SQLite / PostgreSQL",
      "feature stores",
      "streaming workflow engines",
      "AWS",
      "Docker",
      "PyTorch",
    ],
  },
  {
    slug: "efficiency-and-compression",
    theme: "building-and-shipping",
    title: "Model efficiency and compression",
    icon: "efficiency",
    orgs: ["Amazon", "University of Bristol", "University College Cork"],
    period: "2010 – present",
    did: "Accuracy trades against compute, energy and bandwidth at a better rate than it usually looks. A power spectral density pipeline is a fixed composition of deterministic steps, so a two hidden layer network regressed directly onto its output produced the features up to twenty times faster with downstream accuracy never moving more than 0.04 of a percentage point. On an ARM Cortex-M3 wearable, transmitting one window of raw acceleration costs 94.38 microcoulombs against over an order of magnitude less to compute a feature, so feature group selection belongs inside the energy model rather than outside it. Multi-teacher distillation of a segmentation encoder recovers 2.3 mIoU on COCO over the single-teacher baseline, at the same size and the same 3.2 times speed-up.",
    papers: ["santos2018efficient", "elsts2018board", "elsts2020energy", "zeng2025multi"],
    methods: [
      "knowledge distillation",
      "multi-teacher distillation",
      "feature approximation networks",
      "energy modelling",
      "feature selection",
      "on-board feature extraction",
      "small language models",
      "Pareto-optimal model selection",
    ],
  },
  {
    slug: "field-deployment",
    theme: "building-and-shipping",
    title: "Field deployment and operations",
    icon: "deployment",
    orgs: ["University of Bristol", "University College Cork", "Amazon"],
    period: "2008 – present",
    did: "I ran a research sensing platform in around fifty homes, and the paper we published about it is largely a realistic appraisal of what the deployed system was doing rather than of what it had been designed to do. The dominant costs are ethics approval and the protocol it constrains, hardware that fails silently and surfaces weeks later in the data, and annotation organised around residents who never signed up to be annotators. Sensor reliability and data quality cap everything downstream, which is why the operational lessons and a guide to the dataset were published alongside the methods. A paediatric allergy clinic is the same list with a shorter fuse, since a wireless mote on a seven month old gets one attempt.",
    papers: ["diethe2018releasing", "elsts2018guide", "woznowski2017sphere", "tonkin2023multi", "zhu2015bridging"],
    methods: [
      "study protocols and ethics",
      "annotation logistics",
      "data quality monitoring",
      "hardware and sensor reliability",
      "unattended operation",
      "operational alerting",
      "field trials",
    ],
  },
  {
    slug: "research-practice",
    theme: "building-and-shipping",
    title: "Building research practice",
    icon: "practice",
    orgs: ["Amazon", "KidsLoop", "Cookpad", "University of Bristol"],
    did: "Three of the four companies I have worked for had never published a peer-reviewed paper before I arrived. At Amazon the internship programme was mine, and the team went from no publications in 2022 to ten, at ICLR, ICCV and AAAI. Cookpad's first peer-reviewed papers were mine as well, and at KidsLoop I defined the neurodivergence research stream that became the main product differentiator and started a monthly public lecture series. Bristol was five PhD students, around thirty MSc and BSc projects, and the machine learning and data science courses. The SPHERE Challenge at ECML-PKDD 2016 was mine to design and run, with $20,000 in prizes, hundreds of submissions and a multimodal activity recognition dataset still used as a benchmark. I have mentored around fifty people and six of them have been promoted into senior roles.",
    papers: ["twomey2016sphere"],
    methods: [
      "mentoring and supervision",
      "scientific roadmaps",
      "internship programmes",
      "benchmark and competition design",
      "teaching",
      "peer review",
    ],
  },
  {
    slug: "signal-processing",
    theme: "signals-and-sensing",
    title: "Digital signal processing",
    icon: "signals",
    orgs: ["University College Cork", "University of Bristol", "Amazon"],
    period: "2008 – present",
    did: "My doctoral work extracted eighteen heart rate variability features from paediatric ECG over sixty second windows sliding one second at a time, which puts the whole burden on the front end. One ectopic beat sends the instantaneous rate to about two hundred, and every downstream feature inherits it. Most QRS detectors are a filter chain plus a hand-chosen threshold, several with published parameters that depend on the subject's age. Recasting detection as the negative product of two least-squares slopes makes it linearly separable and removes the tuning. A companion study found beat detection survives compression to a ratio of about thirty, because the detector keeps firing once per beat while the sample it nominates drifts off the peak. The same work now runs on accelerometer spectra, artefact rejection and room acoustics estimated from production audio.",
    papers: ["twomey2014machine", "twomey2010effect", "twomey2013digital", "twomey2010comparison"],
    methods: [
      "QRS detection",
      "heart rate variability",
      "spectral features",
      "ECG compression",
      "artefact rejection",
      "windowing and segmentation",
      "principal component analysis",
      "impulse response estimation",
    ],
  },
  {
    slug: "audio-and-speech",
    theme: "signals-and-sensing",
    title: "Audio and speech processing",
    icon: "audio",
    orgs: ["Amazon", "University of Bristol"],
    did: "Two recordings of the same source differ mostly by the room they were made in. Estimating a room's impulse response and applying it to audio recorded elsewhere makes them match, and a self-training loop is what generalises the transfer across reverberation, equalisation and spatial placement instead of hand-tuning each pair. Perceptual quality is modelled alongside it, accurately enough to be scored automatically, which is what makes the work usable at a volume where nobody listens to every output. At Bristol the audio was speech scored against clinical severity scales, where the aphasia literature has worked on that correlation for years, and the awkwardness of an ordinal target is where the ordinal regression work came from.",
    papers: ["twomey2019ordinal"],
    methods: [
      "impulse response and room acoustics",
      "reverberation and equalisation",
      "self-training",
      "perceptual quality modelling",
      "speech feature extraction",
      "ordinal regression",
    ],
  },
  {
    slug: "sensor-modelling",
    theme: "signals-and-sensing",
    title: "Sensing and sensor fusion",
    icon: "sensors",
    orgs: ["University of Bristol", "University College Cork"],
    period: "2008 – 2020",
    did: "I spent seven years on in-home sensing across roughly fifty instrumented homes, after five in biomedical acquisition, covering wrist-worn accelerometers, environmental sensors, electricity, RGBD video and, earlier, cardiac and respiratory instrumentation in a clinic. I built probabilistic sensor fusion in which the model infers which modality carries the signal for which activity rather than fusing at fixed weights, because a kettle appears in the electricity and walking appears on the wrist. I also learned sensor topology from passive readings using information-theoretic criteria, which classified better than exhaustively evaluating sensor combinations and cost a fraction as much, and that topology then decides which sensors a classifier may combine.",
    papers: [
      "diethe2017probabilistic",
      "twomey2017unsupervised",
      "twomey2018comprehensive",
      "fafoutis2015rssi",
      "twomey2014context",
      "mcconville2018person",
      "kozlowski2020h4lo",
    ],
    methods: [
      "multi-modal sensor fusion",
      "activity recognition",
      "accelerometry",
      "information-theoretic structure learning",
      "Bayesian active transfer learning",
      "RSSI and localisation",
      "annotation protocols",
    ],
  },
  {
    slug: "time-series-and-anomaly-detection",
    theme: "signals-and-sensing",
    title: "Time series, signals and anomaly detection",
    icon: "timeseries",
    orgs: ["Amazon", "Cookpad", "KidsLoop", "University of Bristol", "University College Cork"],
    period: "2008 – present",
    did: "The metrics under operational monitoring share almost nothing: real valued, counts, binary, bounded on the unit interval, some updating every few seconds and some a handful of times a day. Modelling normality with dynamic priors and well-calibrated positive distributions covers all of them at once. Anomaly signatures look the same at the sparse end and the dense end, so signatures pulled from one regime label the other and the ground truth comes out self-supervised rather than hand-annotated. Anything flagged gets a counterfactual explanation attached automatically, usually a sports fixture or an election. It runs across the combinatorial space of markets, devices, software versions and metrics, under latency budgets, with alerting routed to whoever owns what broke. My PhD was the same shape on HRV during oral food challenges.",
    papers: [
      "renz2023low",
      "early2024inherently",
      "twomey2019application",
      "chen2018anomaly",
      "twomey2013automated",
      "twomey2013monitoring",
      "twomey2011allergy",
      "twomey2010classification",
    ],
    methods: [
      "dynamic priors",
      "meta-learning across metric types",
      "self-supervised signature extraction",
      "counterfactual explanation",
      "low-count regimes",
      "heart rate variability",
    ],
  },
  {
    slug: "novelty-detection",
    theme: "signals-and-sensing",
    title: "Novelty detection",
    icon: "novelty",
    orgs: ["University College Cork", "University of Bristol"],
    period: "2008 – 2019",
    did: "An oral food challenge yields one label per child, the allergist's verdict, with no record of when the reaction began, which rules out every two-class method and leaves the ten minutes before the first dose as the only confidently normal data. I fitted the background as a Gaussian mixture over the other twenty-three children, so that nothing about the monitored child leaks in. That child's own pre-dose window then set the likelihood scale and the threshold, which matters across a cohort running from seven months to ten years old. The astronomical version is a hierarchical Gaussian process assuming only that light curves of one star type share an underlying function, reaching 0.98 precision over 9,236 periodic variable stars from about seven examples, against 0.44 and 0.16 for two centroid baselines.",
    papers: [
      "twomey2019application",
      "chen2018anomaly",
      "twomey2011allergy",
      "twomey2010classification",
      "gutierrez2013real",
    ],
    methods: [
      "one-class modelling",
      "Gaussian mixtures",
      "hierarchical Gaussian processes",
      "marginal likelihood scoring",
      "subject-adaptive thresholds",
      "leave-one-out validation",
      "anomaly ranking",
    ],
  },
  {
    slug: "behavioural-modelling",
    theme: "signals-and-sensing",
    title: "Behavioural modelling",
    icon: "behaviour",
    orgs: ["University of Bristol", "University College Cork", "Cookpad", "KidsLoop", "Amazon"],
    period: "2008 – present",
    did: "The clinical version detects cognitive decline from drift in habit rather than from an event, where the baseline differs in every household and a population threshold is useless before you start. The consumer version is the same problem at scale, with telemetry reconciled into behavioural embeddings through autoencoder towers and transformer layers. A vector-quantised branch produces discrete segment labels a product manager can read, and per-surface adaptation fitted on historical experiments keeps an embedding tied to behaviour on that surface rather than to a global average. Cooking and learning are habits too, which is why session models beat content similarity for recommendation, and why a learner model that ignores response to format under-estimates the student. Deployed across markets in production, and in homes and classrooms before that.",
    papers: [
      "poyiadzi2020detecting",
      "kumpik2022longitudinal",
      "yang2022detecting",
      "selwood2024home",
      "diethe2015circular",
      "twomey2020towards",
    ],
    methods: [
      "sequential and session models",
      "behavioural embeddings",
      "autoencoders",
      "VQ-VAE",
      "transformers",
      "CRFs",
      "learning with label proportions",
      "circular statistics",
      "segmentation",
    ],
  },
  {
    slug: "probabilistic-modelling",
    theme: "modelling-and-inference",
    title: "Probabilistic and Bayesian modelling",
    icon: "probabilistic",
    orgs: ["University of Bristol", "University College Cork", "Amazon"],
    period: "2008 – 2020",
    did: "Hierarchical priors on dictionary learning coefficients let the sparsity and the noise levels be inferred from the data rather than swept, solved by variational message passing in Infer.NET. Bayesian active transfer learning then decides which instances in a new home are worth labelling, which is the difference between annotating fifty houses and annotating one. Ordinal regression written as structured classification encodes a K-grade label as K-1 bits, so adjacent grades share most of their encoding and a CRF over those bits pays a cost equal to the distance between the true and predicted grade rather than a flat penalty. All of this ran in health sensing, where labels are expensive, scarce and frequently wrong, and a clinician needs a calibrated confidence.",
    papers: [
      "diethe2016bdl",
      "diethe2015bayesian",
      "twomey2015bayesian",
      "twomey2019ordinal",
      "diethe2015circular",
      "diethe2015gaussian",
      "twomey2015evidence",
      "diethe2016active",
    ],
    methods: [
      "variational message passing",
      "Infer.NET",
      "Gaussian processes",
      "hierarchical priors",
      "active learning",
      "domain adaptation",
      "ordinal regression",
    ],
  },
  {
    slug: "continuous-time-dynamics",
    theme: "modelling-and-inference",
    title: "Dynamics and continuous-time models",
    icon: "dynamics",
    orgs: ["University of Bristol"],
    period: "2015 – 2020",
    did: "A neural ODE carries a point through a learned vector field rather than a stack of layers, and a single field cannot solve tasks that look trivial, however much capacity you give it, because trajectories are not allowed to cross. I fitted a mixture of fields where each point is assigned to one component and travels under that component alone, which lets two groups pass through one another. The fields are themselves probabilistic, so component uncertainty propagates across the integration interval by forward filtering, and penalising trajectory length and curvature cuts the function evaluations a solver needs. Applied to location traces from a real house it forecasts where somebody is heading with a spread of plausible routes the baselines could not produce. A companion result bounds the excess risk of ignoring sequence structure by how fast the autocorrelations decay.",
    papers: ["twomey2019neural", "twomey2020neural", "twomey2016need"],
    methods: [
      "neural ODEs",
      "stochastic vector field mixtures",
      "forward filtering",
      "trajectory regularisation",
      "behavioural forecasting",
      "autocorrelation bounds",
      "conditional random fields",
    ],
  },
  {
    slug: "reinforcement-learning",
    theme: "modelling-and-inference",
    title: "Reinforcement learning",
    icon: "rl",
    orgs: ["Amazon", "KidsLoop"],
    period: "2021 – present",
    did: "The reward is the hard part, because there is no environment to interact with and nothing hands you a number. Offline RL does the heavy lifting, fitting a policy to logged behaviour rather than to exploration, which is also what makes simulated behaviour resemble observed behaviour instead of somebody's intuition about it. Where no number exists at all, an LLM's judgement of whether behaviour looks faithful serves as the reward and is trained against adversarially. A policy over audio processing chains chooses and orders operations to maximise the match between a source and a target recording, replacing per-pair hand tuning that was blocking scale. In education the reward arrives months later and buried in noise, so contextual bandits and a simulator carry the load.",
    methods: [
      "offline reinforcement learning",
      "policy learning from logs",
      "adversarial alignment",
      "LLM as judge",
      "RL over processing chains",
      "contextual bandits",
      "adaptive treatment assignment",
    ],
  },
  {
    slug: "weak-supervision",
    theme: "modelling-and-inference",
    title: "Weak supervision and label efficiency",
    icon: "weak",
    orgs: ["University of Bristol", "Amazon"],
    period: "2013 – present",
    did: "A patient reports roughly how much of their day went one way without timestamping any of it, which makes the supervision a set of bag-level proportions. A graph-based method that preserves each bag's mass while encouraging local smoothness recovers the instance-level assignments underneath, and active learning on top requests the next bag rather than the next instance. Multiple instance learning gives the idea a second life in time series, where a deep classifier computes a representation of every time point and then averages it away. Replacing that average with a MIL pooling operator returns the localisation across three backbones and 85 UCR datasets at no cost in accuracy. Elsewhere the supervision comes out of the data, whether that is sensor topology learned unlabelled or anomaly signatures transferred between regimes.",
    papers: [
      "poyiadzi2018label",
      "poyiadzi2019active",
      "early2024inherently",
      "twomey2017unsupervised",
      "twomey2015bayesian",
    ],
    methods: [
      "learning with label proportions",
      "graph-based label propagation",
      "multiple instance learning",
      "MIL pooling",
      "active learning",
      "self-supervised signature extraction",
      "unsupervised structure learning",
      "partial annotations",
    ],
  },
  {
    slug: "data-science",
    theme: "measurement-and-evidence",
    title: "Data science",
    icon: "datascience",
    orgs: ["Amazon", "Cookpad", "KidsLoop", "University of Bristol", "University College Cork"],
    period: "2008 – present",
    did: "Most of what decides a modelling project happens before a model is fitted. The clearest case is an empirical study of activity recognition running roughly 1300 experiments over activity selection, feature extraction, window length, sampling rate, sensor placement and test-retest reliability. Most configurations performed about the same, because each is a different route to the same context. Knowing which knobs do not matter is worth more than another architecture when the sampling rate is set by the battery rather than by you. Choosing the measurement is the other half, since three learner models scored 0.734, 0.742 and 0.753 on accuracy and 0.839, 0.955 and 0.993 on recovering the ability they exist to estimate. The rest is telemetry reconciliation, ROC analysis under heavy imbalance and automated error-mode classification.",
    papers: ["twomey2018comprehensive", "twomey2022equitable", "tonkin2018talk", "woznowski2017talk"],
    methods: [
      "exploratory analysis",
      "dataset profiling",
      "error analysis",
      "experimental design",
      "ROC and threshold analysis",
      "test-retest reliability",
      "feature engineering",
      "hypothesis testing",
      "metric selection",
    ],
  },
  {
    slug: "simulation-and-experimentation",
    theme: "measurement-and-evidence",
    title: "Simulation and experiment design",
    icon: "simulation",
    orgs: ["Amazon", "KidsLoop"],
    period: "2021 – present",
    did: "Online tests are the gold standard, they are slow, and most design iterations do not deserve one. Language models stand in as user models to fill that gap, with an economic layer so that spending in one scenario constrains what the same user can do later. They are calibrated against observed behaviour with offline RL and aligned adversarially, using an LLM discriminator whose judgement is the reward, and what comes out predicts experiment outcomes by segment before the experiment runs. In education an intervention reads out in months, noisily, and a badly designed trial cannot be run on children, so I co-wrote the survey arguing for validating in simulation first and built the synthetic cohorts the fairness work required.",
    papers: ["vaquero2021towards", "twomey2022equitable"],
    methods: [
      "agent-based user models",
      "offline reinforcement learning",
      "adversarial alignment",
      "economic constraints",
      "contextual bandits",
      "synthetic cohorts",
      "A/B testing",
      "campaign-based experimentation",
    ],
  },
  {
    slug: "responsible-ml",
    theme: "measurement-and-evidence",
    title: "Responsible ML",
    icon: "responsible",
    orgs: ["University of Bristol", "KidsLoop", "Amazon"],
    did: "Class-conditional label noise is normally discovered after a model has been fitted and the budget spent. The statistical tests I built detect it beforehand, parametric under an F-distribution assumption and non-parametric by local maximum likelihood where that assumption fails, which turns an expensive late discovery into an early go or no-go. Separately, learner models under-estimate neurodivergent ability because the delivery format confounds the measurement, dyslexia and a text-heavy assessment being the obvious case. A zero-inflated term separates the two and recovers ability estimates correlating at 0.99 with the truth, where standard item response theory manages 0.84. Choosing the format actively on top of that raised effective learning opportunity for students with more than one condition. Underneath sit bias audits, drift detection, dataset profiling and interpretability wired into the dashboards people actually watch.",
    papers: [
      "poyiadzi2022hypothesis",
      "yang2024hypothesis",
      "poyiadzi2021statistical",
      "twomey2022equitable",
      "early2024inherently",
    ],
    methods: [
      "hypothesis testing for label noise",
      "local maximum likelihood",
      "zero-inflated item response theory",
      "fairness-aware modelling",
      "bias audits",
      "drift detection",
      "dataset profiling",
      "SHAP",
      "LIME",
      "interpretable multiple instance learning",
    ],
  },
];

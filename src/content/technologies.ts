/**
 * The tooling, on its own page.
 *
 * This used to be four rows under the capability matrix, and it is here instead
 * because the two answer different questions. A capability against an
 * organisation is a claim about work that has to be defensible cell by cell,
 * which is why that grid is short and every dot on it is argued somewhere. A
 * technology is a claim about having used a thing, which nobody reads as a
 * completeness claim and nobody reads as a depth claim either. Mixing the two
 * made the grid look padded and made this list look like it was hiding.
 *
 * Order is Niall's, and it is not alphabetical or historical: it runs from what
 * a model is written in, through what it is trained and evaluated with, to what
 * carries it into production and what surrounds it. Keep it that way, and add
 * to the end of a group rather than resorting one.
 *
 * The groups now cluster into seven families, which is a layer above that order
 * rather than a replacement for it: the families run in the same direction, and
 * inside each one the groups keep the order they had. Two groups moved far
 * enough to sit with their family and no further, the coding agents up to join
 * the other two agent groups and the annotation tooling down to join the other
 * two evaluation groups. The nesting is the adjacency, which matters because
 * both the table bands and the rail subheadings group consecutive entries and a
 * group filed out of sequence would quietly appear under the wrong heading.
 *
 * ---------------------------------------------------------------------------
 * CONFIDENTIALITY
 * ---------------------------------------------------------------------------
 *
 * Same rule as `practice.ts`. Name public tools only. An internal platform is
 * "in-house experimentation" and never its name, and that phrasing is
 * deliberate rather than vague.
 *
 * ---------------------------------------------------------------------------
 * THREE TIERS: EMPHASIS, CORE, TAIL
 * ---------------------------------------------------------------------------
 *
 * Five hundred names is a wall, and a reader who cannot see where to start
 * reads none of it. There are now three tiers rather than two, and the third
 * one was added because the two-tier version solved the wrong half of the
 * problem: emphasis told a reader where to start, and nothing told them where
 * to stop.
 *
 *   emphasis  one or two per group, filled pills, the names actually leaned on
 *   core      the curated default, outlined pills, roughly eight to twelve
 *   tail      everything else, behind a per-group disclosure in the page
 *
 * `emphasis ⊆ core ⊆ items`, enforced by `group()` below rather than by
 * anybody remembering.
 *
 * **Nothing is deleted.** The tail is hidden, not dropped, and that is the
 * point rather than a compromise: thirteen years of range is a real signal, so
 * Theano, Lasagne, Torch7, Caffe, CNTK, Weka, JAGS, Mercurial, Subversion and
 * Travis CI stay on the page one click away. What they must not do is stand
 * between a reader and PyTorch.
 *
 * How `core` was chosen, in order of precedence:
 *
 *   1. Evidence beats fame. `package.json`, `pyproject.toml`,
 *      `.github/workflows/`, the code fences in `content/notes/`, the software
 *      named in `content/publications.bib`, and the CV at `~/personal/cv`. That
 *      is what puts `ELAN` in core (the SPHERE Challenge note names it) and
 *      `Argilla` in the tail, and `SQLite` in core (the CV names it) over
 *      `Kafka`.
 *   2. Currency. Whether a senior researcher would reach for it today. This is
 *      what sends most of the pre-2016 frameworks to the tail.
 *   3. One representative, not six. Near-equivalents crowd each other out and
 *      inform nobody, so `ruff` carries `black`, `isort`, `flake8` and
 *      `pylint`; `uv` carries `Poetry`, `conda` and `pip`; `FAISS` and `ScaNN`
 *      carry the rest of the vector-store run.
 *   4. Distinctiveness. Prefer the item a reader could not have guessed from
 *      its neighbours. `Infer.NET`, `REDCap`, `embedded C` and `CRFsuite` are
 *      all in core because each one says something specific that the group
 *      around it does not.
 *   5. Not only the fashionable. A core that was all 2024-onward LLM tooling
 *      would misrepresent a career that started in signal processing, so the
 *      groups keep their classical and embedded entries.
 *
 * Core is a ceiling of about twelve and never more than half a group, and it is
 * not a target: `Recommendation` carries six and
 * `Version control and continuous integration` seven, because padding either
 * one would mean promoting something on the strength of nothing.
 *
 * Two is likewise a ceiling for emphasis rather than a target. Several groups
 * carry one and several carry none, because the alternative is picking the most
 * famous name in the group to fill a slot, and a famous name is exactly the
 * wrong signal here: it tells a reader what is popular rather than what this
 * person reaches for. `CLIP` is the trap in miniature. It is in the vision
 * group and it is in the CV about a dozen times, every one of them saying a
 * Cookpad model predated it, so emphasising it would advertise a tool on the
 * strength of not having used it.
 *
 * Where the choices come from, strongest first: the four-group list Niall wrote
 * and vouched for himself, which is preserved in `.scratch/domains/`; the CV at
 * `~/personal/cv`; and the papers and notes in this repository, which is what
 * puts Infer.NET and segment-anything on the list and keeps guesswork off it.
 *
 * ---------------------------------------------------------------------------
 * LABEL LENGTH
 * ---------------------------------------------------------------------------
 *
 * **Keep a label under about twenty-eight characters.** A pill is
 * `whitespace-nowrap`, so a long one cannot break and instead shoves the whole
 * flex run out of shape; one entry here used to be a hundred and three
 * characters of AWS services in brackets and it ruined the row it sat in.
 *
 * Three ways out, in order of preference, and none of them drops anything:
 *
 *   - A bracketed list becomes separate items. `AWS (S3, EC2, …)` is now `AWS`
 *     plus a pill per service, which is also what lets the four services the CV
 *     actually names sit in core while the rest fall to the tail.
 *   - An "X and Y" naming two real things becomes two items: `Neo4j` and
 *     `Cypher`, `Arrow` and `Parquet`, `Phoenix` and `Arize`.
 *   - A spelled-out phrase gets tightened rather than split, because half of
 *     one means nothing on its own: `subagents and parallel agent workflows`
 *     became `parallel subagent workflows`, not `subagents` and `workflows`.
 *
 * Pairs that name one thing under two words stay whole: `Weights and Biases`,
 * `PEFT and LoRA`, `ONNX and ONNX Runtime`, `Jupyter and JupyterLab`.
 */

export type TechnologyGroup = {
  group: string;
  items: readonly string[];
  core: readonly string[];
  emphasis: readonly string[];
};
export type TechnologyFamily = { family: string; groups: readonly TechnologyGroup[] };

/**
 * One group, its curated default, and the one or two names in it worth a
 * reader's eye.
 *
 * The two `const` type parameters are the point of the helper. `I` is inferred
 * as the tuple of literal strings that were passed, so `I[number]` is the union
 * of exactly those names and a `core` entry that is not one of them fails
 * `npm run typecheck`; `C` is then inferred the same way from `core`, so an
 * `emphasis` entry outside `core` fails too. That is the whole of
 * `emphasis ⊆ core ⊆ items`, checked at compile time.
 *
 * Without it, a rename or a typo anywhere in five hundred items produces a pill
 * that silently renders like all the others, or an item that quietly stops
 * being promoted, and nobody would ever find either by reading.
 */
function group<const I extends readonly string[], const C extends readonly I[number][]>(
  name: string,
  items: I,
  core: C,
  emphasis: readonly C[number][] = [],
) {
  return { group: name, items, core, emphasis };
}

/**
 * One family, and the groups filed under it.
 *
 * Nesting rather than a `family` field on each group, because the nesting is
 * what enforces the two things that would otherwise go wrong silently. A group
 * cannot be orphaned, since there is nowhere else to put one; and the parameter
 * is a non-empty tuple, so a family with no groups is a typecheck failure
 * rather than an empty band on the page.
 */
function family(label: string, groups: readonly [TechnologyGroup, ...TechnologyGroup[]]) {
  return { family: label, groups };
}

export const technologies = [
  family("Languages and frameworks", [
    group(
      "Languages",
      [
        "Python",
        "C",
        "C++",
        "C#",
        "MATLAB",
        "R",
        "Java",
        "JavaScript",
        "TypeScript",
        "SQL",
        "Bash",
        "LaTeX",
        "Cython",
        "Julia",
        "Perl",
      ],
      // C is in core rather than subsumed by C++ because the energy-efficiency
      // note is explicit about a C library on an ARM Cortex-M3, and C# because
      // Infer.NET is the distinctive entry two groups down and that is what it
      // is written in. JavaScript falls to the tail under TypeScript, which is
      // what this site is written in.
      ["Python", "C", "C++", "C#", "MATLAB", "R", "TypeScript", "SQL", "Bash", "LaTeX"],
      ["Python", "SQL"],
    ),
    group(
      "Deep learning frameworks",
      [
        "Theano",
        "Caffe",
        "MXNet",
        "Keras (standalone)",
        "TensorFlow",
        "TensorFlow Serving",
        "TensorFlow Lite",
        "TensorFlow.js",
        "PyTorch",
        "PyTorch Lightning",
        "fastai",
        "JAX",
      ],
      // The whole pre-2016 run goes to the tail on currency alone. JAX keeps
      // Flax and Optax beside it because those are three layers of one stack
      // rather than three of a kind, unlike Haiku, Equinox and Sonnet, which
      // are alternatives to Flax and sit behind the disclosure. TensorFlow
      // Serving and Lite are core in the two groups that are about serving and
      // about edge, so they do not need to be core here as well.
      ["Keras (standalone)", "TensorFlow", "PyTorch", "PyTorch Lightning", "fastai", "JAX"],
      // JAX and TensorFlow are on the vouched list too, and choosing between them
      // would be arbitrary where PyTorch is not: it is on that list, in the CV, a
      // dependency of `python/pyproject.toml` and the subject of its own note.
      ["PyTorch"],
    ),
    group(
      "Classical machine learning",
      [
        "scikit-learn",
        "XGBoost",
        "LightGBM",
        "CatBoost",
        "LIBSVM",
        "LIBLINEAR",
        "Vowpal Wabbit",
        "Weka",
        "RankLib",
        "imbalanced-learn",
        "HDBSCAN",
        "UMAP",
        "openTSNE",
        "gensim",
        "NLTK",
        "spaCy",
        "CoreNLP",
        "CRFsuite",
        "hmmlearn",
      ],
      // scikit-learn is the only one of these with hard evidence, in the
      // notebook behind the confidence-visualisation note. CRFsuite and
      // hmmlearn are in core on distinctiveness: sequence structure is a
      // published specialty, and a reader who sees them knows something that
      // scikit-learn beside them would not have told them. XGBoost and LightGBM
      // are the two boosting representatives and CatBoost is behind them;
      // spaCy is the one modern NLP toolkit and NLTK, CoreNLP and Mallet are
      // behind it.
      [
        "scikit-learn",
        "XGBoost",
        "LightGBM",
        "imbalanced-learn",
        "HDBSCAN",
        "UMAP",
        "gensim",
        "spaCy",
        "CRFsuite",
        "hmmlearn",
      ],
      ["scikit-learn"],
    ),
    group(
      "Probabilistic and Bayesian tooling",
      [
        "Infer.NET",
        "Stan",
        "PyMC 2, 3 and 5",
        "Pyro",
        "NumPyro",
        "TensorFlow Probability",
        "GPy",
        "GPflow",
        "GPyTorch",
        "JAGS",
        "BUGS",
        "pgmpy",
        "scikit-optimize",
      ],
      // A generous core, because this is the specialty: the MRC fellowship, the
      // Gaussian process papers and the Infer.NET work are all here. Pyro and
      // NumPyro are both in because they are the PyTorch and the JAX half of one
      // library and both of those backends are core a group above; GPy and
      // GPyTorch cover the classical and the scalable Gaussian process, with
      // GPflow behind them. ArviZ and pgmpy earn places by being different jobs
      // rather than different implementations of the sampling one.
      ["Infer.NET", "Stan", "PyMC 2, 3 and 5", "Pyro", "NumPyro", "GPy", "GPyTorch", "pgmpy"],
      // GPy would be the obvious second, given the Gaussian process papers, and it
      // is not here because the papers name the method rather than the library.
      ["Infer.NET"],
    ),
    group(
      "Graph and relational",
      [
        "PyTorch Geometric",
        "Deep Graph Library",
        "TensorFlow GNN",
        "Jraph",
        "NetworkX",
        "igraph",
        "node2vec",
        "DeepWalk",
        "Neo4j",
        "Cypher",
        "Amazon Neptune",
      ],
      // Two GNN frameworks and no more, since TensorFlow GNN, Graph Nets,
      // Spektral, StellarGraph and Jraph are all the same idea again. The
      // knowledge-graph half keeps a database, its query language and SPARQL,
      // and sends the vocabularies and the ontology editor to the tail, because
      // those say considerably less about the work than they cost to read.
      ["PyTorch Geometric", "Deep Graph Library", "NetworkX", "node2vec", "Neo4j", "Cypher", "Amazon Neptune"],
      ["PyTorch Geometric"],
    ),
  ]),
  family("Modalities", [
    // Nothing emphasised: the sensing and audio work is a decade deep and none of
    // the sources name the library it ran on, so anything chosen here would be a
    // guess dressed as a recommendation.
    group(
      "Signals, audio and speech",
      ["SciPy signal", "librosa", "torchaudio", "Kaldi", "ESPnet", "SpeechBrain", "FFmpeg", "PyWavelets", "Whisper"],
      // MNE-Python and BioSPPy are both here even though they overlap, because
      // the biosignal decade is the part of this list a reader is least likely
      // to guess. Whisper is the one speech model in core and Kaldi, HTK, ESPnet
      // and SpeechBrain are behind it, which is currency rather than a verdict
      // on any of them.
      ["SciPy signal", "librosa", "torchaudio", "FFmpeg", "PyWavelets", "Whisper"],
    ),
    group(
      "Vision",
      [
        "OpenCV",
        "scikit-image",
        "Pillow",
        "torchvision",
        "Detectron2",
        "YOLO",
        "Ultralytics",
        "dlib",
        "OpenPose",
        "MediaPipe",
        "Kornia",
        "CLIP",
        "segment-anything",
      ],
      // A short group, so the cut is light: the imaging near-duplicates and the
      // keypoint and landmark tools go behind the disclosure and everything that
      // a segmentation or detection paper would touch stays.
      ["OpenCV", "torchvision", "Detectron2", "YOLO", "CLIP", "segment-anything"],
      // The ICIP paper distils SAM2 into a lightweight encoder, which is the one
      // vision tool in this group that a publication actually names.
      ["segment-anything"],
    ),
    group(
      "Time series and streaming",
      [
        "statsmodels",
        "sktime",
        "tslearn",
        "tsfresh",
        "Prophet",
        "GluonTS",
        "Darts",
        "Kats",
        "River",
        "PyOD",
        "ADTK",
        "Merlion",
        "ruptures",
        "statsforecast",
        "neuralforecast",
        "matrix profile",
      ],
      // PyOD is in on evidence: the low-count anomaly detection note names ECOD
      // and isolation forest, which is what PyOD is. Prophet, Darts, Kats,
      // ADTK and Merlion are the tail, all five being alternatives to something
      // already in core.
      [
        "statsmodels",
        "sktime",
        "tsfresh",
        "GluonTS",
        "River",
        "PyOD",
        "ruptures",
        "statsforecast",
        "neuralforecast",
        "matrix profile",
      ],
    ),
  ]),
  family("Language models and agents", [
    // Model-level tooling only. Everything that orchestrates, evaluates or watches
    // a model moved to the group below, because the two are different jobs and
    // listing LangChain beside Megatron-LM told a reader nothing about either.
    //
    // It was called "Language models and agents", which is now the family above
    // it, and a band and a row reading the same thing look like a mistake. This
    // name is also the more accurate of the two once the agent tooling has left.
    group(
      "Foundation model tooling",
      [
        "Hugging Face transformers",
        "tokenizers",
        "datasets",
        "accelerate",
        "PEFT and LoRA",
        "sentence-transformers",
        "llama.cpp",
        "Ollama",
        "Megatron-LM",
        "Anthropic API",
        "OpenAI API",
        "Amazon Bedrock",
      ],
      // Two model providers rather than three, and which two is an evidence call
      // rather than a preference: `.claude/` in this repository and in the CV
      // repository is hard evidence for the Anthropic API, and Bedrock is the
      // employer's. The OpenAI API is one click away in the tail. vLLM carries
      // the serving runtimes and FSDP the distributed-training ones.
      [
        "Hugging Face transformers",
        "accelerate",
        "PEFT and LoRA",
        "sentence-transformers",
        "Anthropic API",
        "Amazon Bedrock",
      ],
      ["Hugging Face transformers", "PEFT and LoRA"],
    ),
    group(
      "Agent frameworks and LLM orchestration",
      [
        "LangChain",
        "LlamaIndex",
        "LlamaParse",
        "Haystack",
        "DSPy",
        "AutoGen and AG2",
        "Semantic Kernel",
        "Pydantic AI",
        "Smolagents",
        "OpenAI Agents SDK",
        "Strands Agents",
        "Bedrock Agents",
        "LiteLLM",
        "Guardrails",
        "NeMo Guardrails",
        "Langfuse",
        "RAGAS",
        "DeepEval",
        "Inspect",
        "vector store integrations",
        "tool and function calling",
        "RAG pipelines",
        "evaluation harnesses",
        "LLM-as-judge",
      ],
      // The largest group on the page and the one that most needed cutting:
      // eleven agent frameworks and nine observability and eval products, most
      // of them interchangeable. Core keeps one of each job. `LLM-as-judge` is
      // there on evidence rather than fashion, being the phrase the CV uses for
      // how the simulation work rewards faithful behaviour.
      [
        "LangChain",
        "LlamaIndex",
        "DSPy",
        "LiteLLM",
        "Guardrails",
        "Langfuse",
        "RAGAS",
        "tool and function calling",
        "RAG pipelines",
        "evaluation harnesses",
        "LLM-as-judge",
      ],
      ["RAG pipelines", "tool and function calling"],
    ),
    group(
      "Coding agents and AI development tools",
      [
        "Claude Code",
        "Cursor",
        "Windsurf",
        "GitHub Copilot",
        "Codex CLI",
        "Gemini CLI",
        "Zed",
        "Devin",
        "Amazon Q Developer",
        "Kiro",
        "Tabnine",
        "JetBrains AI Assistant",
        "agent skills",
        "slash commands",
        "CLAUDE.md",
        "repo-level agent config",
        "parallel subagent workflows",
        "MCP servers and clients",
        "sandboxed execution",
        "terminal agent harnesses",
        "A2A",
      ],
      // Twenty-odd assistants that all do the same thing, so core keeps three and
      // spends the rest of its room on the practices, which are the part with
      // hard evidence: `CLAUDE.md`, `.claude/skills/` and subagents are all in
      // this repository and in the CV repository, and none of them is a product
      // anybody can buy.
      [
        "Claude Code",
        "Cursor",
        "GitHub Copilot",
        "agent skills",
        "slash commands",
        "CLAUDE.md",
        "parallel subagent workflows",
        "MCP servers and clients",
        "sandboxed execution",
        "A2A",
      ],
      ["Claude Code", "MCP servers and clients"],
    ),
  ]),
  family("Search, ranking and recommendation", [
    group(
      "Retrieval, ranking and vector search",
      [
        "FAISS",
        "ScaNN",
        "Annoy",
        "hnswlib",
        "NMSLIB",
        "Elasticsearch",
        "OpenSearch",
        "Qdrant",
        "pgvector",
        "rank_bm25",
        "Metarank",
        "TensorFlow Ranking",
      ],
      // Ten of these twenty are an approximate nearest neighbour index and the
      // reader learns nothing from the ninth. Core keeps the two the CV names,
      // plus pgvector for the case where the index lives in the database you
      // already have. `rank_bm25` and `trec_eval` are there because the CV names
      // BM25 and because IR evaluation is a claim the retrieval papers back.
      ["FAISS", "ScaNN", "Elasticsearch", "pgvector", "rank_bm25", "TensorFlow Ranking"],
      ["FAISS", "ScaNN"],
    ),
    group(
      "Recommendation",
      ["implicit", "LightFM", "Surprise", "Cornac", "RecBole", "TorchRec", "NVIDIA Merlin", "NVTabular", "Spark ALS"],
      // Six of ten, and no padding to reach eight: Surprise and Cornac are
      // alternatives to `implicit` and `LightFM`, and the Merlin stack is a
      // hardware vendor's pipeline rather than a modelling choice. `Spark ALS`
      // is in core because Spark and EMR are in the CV.
      ["implicit", "LightFM", "RecBole", "TorchRec", "Spark ALS"],
    ),
  ]),
  family("Evaluation and experimentation", [
    group(
      "Experimentation, causal inference and statistics",
      [
        "statsmodels",
        "scipy.stats",
        "R with lme4",
        "CausalML",
        "CausalImpact",
        "scikit-uplift",
        "sequential testing",
        "always-valid inference",
        "in-house experimentation",
        "Optimizely",
      ],
      // CausalImpact is in core on the Amazon work producing counterfactual
      // explanations for anomalies, which is exactly what it does. The three
      // hosted A/B platforms are the tail, since the emphasised entry says the
      // experimentation ran somewhere else.
      [
        "statsmodels",
        "scipy.stats",
        "CausalImpact",
        "sequential testing",
        "always-valid inference",
        "in-house experimentation",
      ],
      // Emphasised because the matrix rates experimentation a main focus at two
      // organisations and it ran on the internal platform in both, which is the
      // fact here whether or not the platform can be named.
      ["in-house experimentation"],
    ),
    group(
      "Search, tuning and experiment tracking",
      [
        "Optuna",
        "Hyperopt",
        "Ray Tune",
        "Weights and Biases",
        "MLflow",
        "TensorBoard",
        "Neptune",
        "Comet",
        "Hydra",
        "DVC",
        "ClearML",
      ],
      // Seven of these are a tracker with a web page. Core keeps two of them and
      // TensorBoard, which is what a training loop writes to whether or not a
      // tracker is wrapped round it. Hydra and DVC stay because configuration
      // and data versioning are neither search nor tracking.
      ["Optuna", "Ray Tune", "Weights and Biases", "MLflow", "TensorBoard", "Hydra", "DVC"],
      ["DVC"],
    ),
    group(
      "Annotation, human data and simulation",
      [
        "ELAN",
        "SageMaker Ground Truth",
        "Mechanical Turk",
        "Snorkel",
        "REDCap",
        "Gymnasium",
        "PettingZoo",
        "Stable Baselines3",
        "MuJoCo",
        "SimPy",
      ],
      // ELAN is in core rather than Argilla because the SPHERE Challenge note
      // names it, which is the strongest evidence available in this group.
      // REDCap likewise, for the clinical side of a decade of health sensing.
      // Snorkel is the weak-supervision entry and the label-proportions and
      // label-noise papers are what it points at.
      ["ELAN", "SageMaker Ground Truth", "Snorkel", "REDCap", "Gymnasium", "Stable Baselines3", "SimPy"],
    ),
  ]),
  family("Data and infrastructure", [
    group(
      "Data engineering",
      [
        "pandas",
        "NumPy",
        "Polars",
        "Dask",
        "Apache Spark and PySpark",
        "Databricks",
        "Glue",
        "Kafka",
        "Airflow",
        "Dagster",
        "Arrow",
        "Parquet",
        "DuckDB",
        "Redshift",
        "BigQuery",
        "SQLite",
        "PostgreSQL",
        "MySQL",
        "DynamoDB",
        "Redis",
        "ElastiCache",
      ],
      // pandas and NumPy are dependencies of `pyproject.toml`; EMR, Athena,
      // Spark, SQLite and PostgreSQL are all named in the CV, the last two as
      // the backing store of a lazy execution engine built at Amazon. Airflow
      // carries Dagster, Prefect and Luigi; the three warehouses are
      // interchangeable enough to sit together in the tail.
      [
        "pandas",
        "NumPy",
        "Polars",
        "Apache Spark and PySpark",
        "Kafka",
        "Airflow",
        "Arrow",
        "Parquet",
        "SQLite",
        "PostgreSQL",
      ],
      ["pandas", "Apache Spark and PySpark"],
    ),
    group(
      "Serving, deployment and cloud",
      [
        "AWS",
        "S3",
        "EC2",
        "Lambda",
        "SageMaker",
        "ECS",
        "EKS",
        "AWS Batch",
        "Step Functions",
        "CloudWatch",
        "IAM",
        "CloudFormation",
        "AWS CDK",
        "Google Cloud",
        "Azure",
        "Docker",
        "Kubernetes",
        "Terraform",
        "Serverless Framework",
        "TorchServe",
        "TensorFlow Serving",
        "NVIDIA Triton",
        "BentoML",
        "Ray Serve",
        "FastAPI",
        "Flask",
        "gRPC and Protocol Buffers",
        "Celery",
        "NGINX",
        "Django",
      ],
      // The single hundred-and-three-character AWS pill became thirteen, and the
      // split pays for itself here: the four services the CV names sit in core
      // and the other eight fall to the tail, which the bracketed version could
      // not express at all. Google Cloud and Azure are in the tail because AWS
      // is the emphasised one and a reader can infer the rest. TorchServe and
      // Triton are the two serving runtimes; `gRPC and Protocol Buffers` stays
      // whole because low-latency serving is the claim and neither half carries
      // it alone.
      [
        "AWS",
        "S3",
        "EC2",
        "Lambda",
        "SageMaker",
        "Docker",
        "Kubernetes",
        "Terraform",
        "TorchServe",
        "NVIDIA Triton",
        "FastAPI",
        "gRPC and Protocol Buffers",
        "Django",
        "Step Functions",
        "BentoML",
      ],
      ["AWS", "Docker", "S3", "EC2", "Lambda", "SageMaker", "Step Functions", "NVIDIA Triton", "BentoML"],
    ),
    group(
      "Efficiency, compilation and edge",
      [
        "ONNX and ONNX Runtime",
        "TorchScript",
        "torch.compile",
        "TensorRT",
        "OpenVINO",
        "Core ML",
        "TensorFlow Lite",
        "quantisation and pruning",
        "knowledge distillation",
        "CUDA",
        "cuDNN",
        "Numba",
        "NVIDIA Jetson",
        "Raspberry Pi",
        "embedded C",
        "MQTT",
        "BLE",
        "Zigbee",
        "ROS",
        "systemd",
        "Yocto",
      ],
      // The distillation paper and the energy-efficiency papers are the whole
      // argument for this group, so `knowledge distillation`,
      // `quantisation and pruning` and `embedded C` are all core, the last of
      // them because a note is explicit about a C library on an ARM Cortex-M3.
      // `torch.compile` is core and TorchScript is not, which is only currency.
      [
        "ONNX and ONNX Runtime",
        "torch.compile",
        "TensorRT",
        "Core ML",
        "TensorFlow Lite",
        "quantisation and pruning",
        "knowledge distillation",
        "CUDA",
        "Raspberry Pi",
        "embedded C",
      ],
      ["knowledge distillation"],
    ),
  ]),
  family("Craft", [
    group(
      "Interfaces and visualisation",
      [
        "React",
        "TypeScript",
        "Tailwind",
        "D3",
        "Next.js",
        "Vite",
        "matplotlib",
        "seaborn",
        "plotly",
        "Bokeh",
        "Altair",
        "ggplot2",
        "Streamlit",
        "Gradio",
        "Dash",
        "Panel",
        "Jupyter and JupyterLab",
        "Figma",
      ],
      // The first half of core is this repository: React, TypeScript, Tailwind
      // and Vite are its `package.json`, and SVG is what the Fourier note draws
      // with. The second half is `pyproject.toml`: matplotlib and seaborn are
      // dependencies and Jupyter is the notebook one note ships. Streamlit
      // carries Gradio, Dash and Panel, and the four declarative plotting
      // libraries sit together in the tail.
      ["React", "TypeScript", "Tailwind", "D3", "Vite", "matplotlib", "seaborn", "Streamlit", "Jupyter and JupyterLab"],
      // One from each half of the group, which is also what the evidence gives:
      // this site is React, and every figure in the notes is matplotlib.
      ["React", "matplotlib"],
    ),
    group(
      "Version control and continuous integration",
      [
        "Git",
        "GitHub",
        "GitLab",
        "Bitbucket",
        "GitHub Actions",
        "GitLab CI",
        "pre-commit hooks",
        "Dependabot",
        "semantic versioning",
        "trunk-based and Git Flow",
      ],
      // Seven rather than eight, because the eighth would have to be a second CI
      // system and there is no honest reason to prefer one of Jenkins, CircleCI,
      // GitLab CI and CodeBuild over the others when GitHub Actions is what runs
      // this repository. Mercurial, Subversion and Travis CI are the tail by
      // definition.
      [
        "Git",
        "GitHub",
        "GitHub Actions",
        "pre-commit hooks",
        "Dependabot",
        "semantic versioning",
        "trunk-based and Git Flow",
      ],
      ["Git", "GitHub Actions"],
    ),
    group(
      "Engineering practice",
      [
        "code review and PR workflow",
        "pair programming",
        "pytest",
        "unittest",
        "Hypothesis",
        "tox",
        "coverage.py",
        "mypy",
        "ruff",
        "black",
        "isort",
        "flake8",
        "pylint",
        "Poetry",
        "conda",
        "pip",
        "setuptools",
        "Docker Compose",
        "Make",
        "OpenTelemetry",
        "design documents",
        "architecture review",
        "test-driven development",
        "agile and sprint planning",
      ],
      // The clearest case on the page for one representative: `ruff` replaced
      // black, isort, flake8 and pylint in practice as well as in core, and `uv`
      // did the same to Poetry, conda and pip. Both are emphasised because both
      // are what `pyproject.toml` here actually runs, alongside `Make`.
      // `Hypothesis` is in core on distinctiveness, property-based testing being
      // the one entry here a reader could not have guessed.
      [
        "code review and PR workflow",
        "pytest",
        "Hypothesis",
        "mypy",
        "ruff",
        "Make",
        "OpenTelemetry",
        "design documents",
        "test-driven development",
      ],
      // Both are what this repository runs on, in `python/pyproject.toml`.
      ["ruff"],
    ),
    group(
      "Writing and collaboration",
      [
        "LaTeX",
        "Overleaf",
        "BibTeX",
        "pandoc",
        "Zotero",
        "Mendeley",
        "Jira",
        "Confluence",
        "Notion",
        "Miro",
        "Slack",
        "OpenReview",
        "conference review systems",
        "Google Workspace",
      ],
      // LaTeX and BibTeX are `content/publications.bib` and every paper behind
      // it. `OpenReview` and `conference review systems` are core because
      // reviewing is part of the job being applied for; the project trackers are
      // in the tail because every candidate has used them.
      ["LaTeX", "Overleaf", "BibTeX", "Zotero", "Slack", "OpenReview", "conference review systems"],
      ["LaTeX", "BibTeX"],
    ),
  ]),
] as const satisfies readonly TechnologyFamily[];

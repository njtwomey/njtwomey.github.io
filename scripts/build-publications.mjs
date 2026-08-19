/**
 * Compile content/publications.bib into src/content/publications.json.
 *
 * BibTeX stays the source of truth: it is what Google Scholar, arXiv and every
 * publisher exports, so adding a paper is pasting one record rather than
 * translating it into a bespoke format. This script is the only thing that
 * understands BibTeX — the app reads the compiled JSON and nothing else.
 *
 * It is deliberately strict. A paper that claims a PDF the repo does not have
 * is a broken download link on a live site, so that fails the build here rather
 * than shipping. Run it with --check to verify without writing (what CI does
 * before a deploy).
 */
import { parse } from "@retorquere/bibtex-parser";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIB = resolve(root, "content/publications.bib");
/**
 * The editorial layer over the bibliography: one directory per citation key,
 * holding a short plain-English summary of what the paper actually says.
 *
 * It is separate from the .bib because the two have different lifetimes and
 * different authors — the record is what the venue published and never changes,
 * the summary is Niall's own framing and can be rewritten at will. Where a key
 * has no directory, the site falls back to the abstract.
 */
const OUT = resolve(root, "src/content/publications.json");
/**
 * Abstracts and BibTeX records are 80% of the bibliography's weight and are
 * only read on the publications page, so they are fetched rather than bundled.
 */
const OUT_DETAILS = resolve(root, "public/publications-details.json");
const PDF_DIR = resolve(root, "public/pdf");

const ME = { last: "Twomey", first: "Niall" };

/** LaTeX leaves a dotless i carrying its own accent; recompose it. */
function tidyText(value) {
  if (value == null) return "";
  return String(value)
    .replace(/ı́/g, "í")
    .replace(/ı̀/g, "ì")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[{}]/g, "")
    .trim()
    .normalize("NFC");
}

/**
 * Slice each entry's own source out of the file, so the site can offer a
 * copy-paste BibTeX record that is byte-identical to what is committed.
 * Re-serialising from parsed fields would quietly drop anything the parser
 * did not model.
 */
function rawEntries(source) {
  const raw = new Map();
  const re = /^@(\w+)\s*\{\s*([^,\s]+)\s*,/gm;
  let match;
  while ((match = re.exec(source))) {
    const start = match.index;
    let depth = 0;
    let i = source.indexOf("{", start);
    for (; i < source.length; i++) {
      const char = source[i];
      if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    raw.set(match[2], source.slice(start, i + 1).trim());
  }
  return raw;
}

/** arXiv ids hide in the journal string as often as in a field of their own. */
function arxivId(fields) {
  const direct = fields.arxiv ?? fields.eprint;
  if (direct) return tidyText(String(direct)).replace(/^arxiv:/i, "");
  const journal = String(fields.journal ?? "");
  const found = journal.match(/arxiv:\s*([\d.]+(?:v\d+)?)/i);
  return found ? found[1] : undefined;
}

/**
 * What kind of thing this is, which is what a reader scans the list by. BibTeX
 * only records the shape of the record (`@article`), so a preprint and a
 * journal paper arrive identical and have to be told apart by their venue.
 */
function classify(type, venue) {
  if (/thesis/i.test(type)) return "thesis";
  if (/arxiv|preprint/i.test(venue)) return "preprint";
  if (/workshop/i.test(venue)) return "workshop";
  if (type === "inproceedings" || type === "conference" || type === "incollection") return "conference";
  if (type === "article") return "journal";
  return "other";
}

/**
 * Strip the boilerplate a venue field accumulates, without losing the name.
 * A preprint's journal is the whole citation ("arXiv preprint arXiv:2105.04971")
 * — the identifier is carried separately, so the venue is just the archive.
 */
function tidyVenue(value, kind, year) {
  const venue = tidyText(value)
    .replace(/^(in\s+)?(the\s+)?proceedings of\s+(the\s+)?/i, "")
    .replace(/^in\s+/i, "")
    // The year is displayed beside the venue, so a venue that ends in its own
    // year reads as "ECAI '20 2020 · 2020".
    .replace(new RegExp(`[\\s,]+${year}\\s*$`), "")
    .trim();
  if (kind === "preprint" && /^arxiv/i.test(venue)) return "arXiv";
  return venue;
}

/**
 * A short venue label, for places that list several papers at once and cannot
 * spend a line on "Joint European Conference on Machine Learning and Knowledge
 * Discovery in Databases".
 *
 * Most conference entries already carry their acronym in brackets, so that is
 * tried first. The tables below cover the ones that do not, and are keyed on a
 * distinctive substring rather than the whole string, because the same venue is
 * written three different ways across this file.
 */
const VENUE_ACRONYMS = [
  [/\bSIGKDD\b|Knowledge Discovery & Data Mining/i, "KDD"],
  [/\bSIGIR\b/i, "SIGIR"],
  [/\bICASSP\b/i, "ICASSP"],
  [/\bECML\s*PKDD\b|Machine Learning and Knowledge Discovery in Databases/i, "ECML PKDD"],
  [/Artificial Neural Networks/i, "ESANN"],
  [/Machine Learning for Signal Processing/i, "MLSP"],
  [/Educational Data Mining/i, "EDM"],
  [/Image Processing/i, "ICIP"],
  [/\bAAAI\b/i, "AAAI"],
  [/Recommender Systems/i, "RecSys"],
  [/Learning Representations/i, "ICLR"],
  [/Engineering in Medicine and Biology/i, "EMBC"],
  [/Embedded Wireless Systems/i, "EWSN"],
  [/Internet of Things/i, "WF-IoT"],
  [/Complex, Intelligent and Software Intensive|\bCISIS\b/i, "CISIS"],
  [/Applied Sciences in Biomedical/i, "ISABEL"],
  [/Pervasive Computing Technologies for Healthcare/i, "PervasiveHealth"],
  [/Intelligent Signal Processing/i, "WISP"],
  [/\bICML\b/i, "ICML"],
  [/Artificial Intelligence \(ECAI|\bECAI\b/i, "ECAI"],
  [/PERCOM|Pervasive Computing'/i, "PerCom"],
  [/Learning over Multiple Contexts/i, "LMCE"],
  [/Smart Cities/i, "Smart Cities"],
  [/Advanced Health Informatics/i, "Springer IoT"],
];

const JOURNALS = [
  [/journal of biomedical and health informatics/i, "JBHI"],
  [/Journal of Network and Computer Applications/i, "JNCA"],
  [/^Machine Learning$/i, "MLJ"],
  [/^Neurocomputing$/i, "Neurocomputing"],
  [/^Informatics$/i, "Informatics"],
  [/Scientific Data/i, "Scientific Data"],
  [/BMJ Open/i, "BMJ Open"],
  [/IEEE Intelligent Systems/i, "IEEE Intelligent Systems"],
  [/IET Radar/i, "IET Radar"],
  [/^Allergy/i, "Allergy"],
  [/^Sensors$/i, "Sensors"],
];

function shortVenue(venue, kind) {
  if (kind === "preprint") return "arXiv";
  if (kind === "thesis") return "PhD thesis";
  if (!venue) return "";
  for (const [pattern, label] of JOURNALS) if (pattern.test(venue)) return label;
  for (const [pattern, label] of VENUE_ACRONYMS) if (pattern.test(venue)) return label;
  // A bracketed acronym is the venue's own abbreviation; drop any year inside it.
  const bracketed = venue.match(/\(([A-Z][A-Za-z-]{1,14})(?:\s+\d{4})?\)/);
  if (bracketed) return bracketed[1];
  return venue.split(/[,(]/)[0].trim();
}

function build() {
  const source = readFileSync(BIB, "utf8");
  // `sentenceCase` is on by default and rewrites "Image-Pivoted" to
  // "image-pivoted". Titles are stored as the venue published them.
  const parsed = parse(source, { sentenceCase: false, errorHandler: () => {} });
  const raw = rawEntries(source);

  const problems = [];
  const seen = new Set();

  const publications = parsed.entries.map((entry) => {
    const f = entry.fields;
    const key = entry.key;

    if (seen.has(key)) problems.push(`duplicate citation key: ${key}`);
    seen.add(key);

    // BibTeX spells "and the rest of them" as a final author literally named
    // `others`. Carry it as a flag so the card can print "et al." instead of
    // crediting a person called Others.
    const rawAuthors = f.author ?? [];
    const etAl = rawAuthors.some((a) => (a.lastName ?? a.name ?? "").toLowerCase() === "others");
    const authors = rawAuthors
      .filter((a) => (a.lastName ?? a.name ?? "").toLowerCase() !== "others")
      .map((a) => {
        const last = tidyText(a.lastName ?? a.name ?? "");
        const first = tidyText(a.firstName ?? "");
        return { first, last, isMe: last === ME.last && first.startsWith("N") };
      });

    const venueRaw = tidyText(f.booktitle ?? f.journal ?? f.school ?? f.publisher ?? "");
    const year = Number.parseInt(String(f.year ?? ""), 10);
    if (!Number.isFinite(year)) problems.push(`${key}: missing or unparseable year`);
    if (!f.title) problems.push(`${key}: missing title`);
    if (authors.length === 0) problems.push(`${key}: no authors`);
    if (!authors.some((a) => a.isMe)) problems.push(`${key}: no author matched ${ME.first} ${ME.last}`);

    let pdf;
    if (f.pdf) {
      const file = tidyText(String(f.pdf));
      if (existsSync(resolve(PDF_DIR, file))) pdf = `/pdf/${file}`;
      else problems.push(`${key}: pdf={${file}} but public/pdf/${file} does not exist`);
    }

    const kind = classify(entry.type, venueRaw);

    return {
      key,
      type: entry.type,
      kind,
      title: tidyText(String(f.title ?? "")),
      authors,
      etAl,
      year,
      venue: tidyVenue(venueRaw, kind, year),
      venueShort: shortVenue(tidyVenue(venueRaw, kind, year), kind),
      // The abstract itself lives in the details file; the flag is what the
      // card needs in order to decide whether to offer an Abstract button.
      hasAbstract: Boolean(f.abstract && tidyText(String(f.abstract))),
      // `notes={...}` in the .bib: Niall's own framing of the paper, shown on
      // the card in place of the abstract where it has been written. It lives in
      // the entry rather than in a file beside it, so a renamed key cannot leave
      // it behind and there is one thing to edit.
      summary: f.notes ? tidyText(String(f.notes)) : null,
      abstract: f.abstract ? tidyText(String(f.abstract)) : undefined,
      pdf,
      doi: f.doi ? tidyText(String(f.doi)).replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : undefined,
      url: f.url ? tidyText(String(f.url)) : undefined,
      arxiv: arxivId(f),
      code: f.code ? tidyText(String(f.code)) : undefined,
      slides: f.slides ? tidyText(String(f.slides)) : undefined,
      bibtex: raw.get(key) ?? "",
    };
  });

  // Newest first, and stable within a year so the file does not churn.
  publications.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  return { publications, problems };
}

/**
 * Compile the bibliography, or validate it. Throws with every problem listed
 * rather than exiting, so the orchestrator can report notes and publications
 * together instead of dying on the first of them.
 */
export function buildPublications({ write = true } = {}) {
  const { publications, problems } = build();

  if (problems.length > 0) {
    throw new Error(`publications.bib has ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
  }

  const core = publications.map(({ abstract: _abstract, bibtex: _bibtex, ...rest }) => rest);
  const details = Object.fromEntries(publications.map((p) => [p.key, { abstract: p.abstract, bibtex: p.bibtex }]));

  if (write) {
    mkdirSync(dirname(OUT), { recursive: true });
    // No timestamp in either payload: a generated file that changes on every
    // build makes every commit look like a content change.
    writeFileSync(OUT, `${JSON.stringify(core, null, 2)}\n`);
    writeFileSync(OUT_DETAILS, `${JSON.stringify(details)}\n`);
    // The whole bibliography, downloadable. Copied rather than served from
    // content/ because only public/ is published.
    copyFileSync(BIB, resolve(root, "public/publications.bib"));
  }

  return publications;
}

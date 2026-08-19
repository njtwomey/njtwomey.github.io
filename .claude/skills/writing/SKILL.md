---
name: writing
description: The writing rules for every word that ships on this site — the bio, the expertise page, publication summaries, note prose, page ledes, README and CLAUDE.md. Load before writing or editing any user-facing text, and whenever asked to tighten, rewrite, de-waffle or humanise copy.
---

# Writing

Active for all user-facing text on this site. Every sentence must conform.

Code comments are the one exemption. They explain why something is the way it is, and that
reasoning is worth spelling out at whatever length it takes.

## Calibrate on the real voice first

The voice was measured from a corpus of Niall's own writing, and the numbers below are what that
measurement produced. The corpus itself has since been deleted from the repo, deliberately, so do
not go looking for it: the table is the durable artefact and the shipped notes under
`content/notes/` are the worked examples. The shape is not the one that comes out by default:

|                         | the reference voice | what keeps getting written instead |
| ----------------------- | ------------------- | ---------------------------------- |
| mean sentence           | 25 words            | 12–14                              |
| median                  | 20 words            | 11                                 |
| sentences under 8 words | 5%                  | 25%+                               |
| sentences over 30 words | 25%                 | almost none                        |

Check a draft against it:

```bash
uv run python/tools/prose_stats.py content/notes/my-note/index.mdx
```

Real openers from the corpus, none of which are clipped:

- "This blog post relates to some recent work of mine on neural ordinary differential equations."
- "You may (quite reasonably) think that if you optimise one of these that you will surely have to
  compromise on the other."
- "It turns out that we can fairly straightforwardly penalise long and curved paths."
- "I presume anybody that's familiar with `logger.exception` will agree that this is useless code
  since it doesn't do what you'd hope it would."

The rhythm comes from subordination, from clauses that qualify and extend, and from an occasional
parenthetical aside. It never comes from chopping a thought into pieces.

## Write complete sentences. This rule outranks everything else.

The clipped punchy fragment used for rhythm is the defining texture of a LinkedIn post, and it is
banned outright. Real examples that shipped here before this rule existed:

- "Small irritation, not a crisis." — a fragment and a negative parallelism in four words.
- "Two models in, one model out." — a fragment as a punchline.
- "Everyone does this. Nobody enjoys it." — two clipped sentences paired for cadence.

**The workarounds are banned too.** Welding two fragments together with a semicolon, a dash or a
comma disguises the problem rather than fixing it, so "Small irritation; not a crisis" is the same
sentence wearing a hat. Write the actual sentence, with a subject and a verb, and let it run as
long as the thought requires.

Terse means few words per idea, not amputated grammar. A short note is still made of proper
sentences.

**Before**

> Small irritation, not a crisis. You write a base module, then a variant of it, and the variant
> has to retype every argument the base takes.

**After**

> The most consistent mild irritation in writing torch code is that a variant of a module has to
> retype every argument its parent takes, purely in order to hand them straight back up.

The second is longer and better, because length was never the target.

Semicolons and colons joining two complete clauses are welcome, and so are contractions, and so is
starting a sentence with "And" or "But" when it reads naturally. The corpus does all three.

## Fat

Every sentence has to carry a fact. The failure mode here is not length, it is sentences that
occupy the space where a fact should be, and it survives every other rule in this file because
each offending phrase is grammatical, complete and pleasant to read.

**Name the thing.** "SAM2", never "Segment Anything Model 2" spelled out where the short name is
what everyone uses, and never "a segmentation foundation model" when you know which one. A reader
who recognises the name gets the whole context free; a reader who does not can look it up. Vague
naming buys nothing and costs the recognition.

**Vague quality claims are worse than no claim.** "Segments objects about as well as anyone could
reasonably want" tells you nothing and cannot be checked. Give the number, or name what it beats,
or say nothing about how good it is.

**Do not announce a mechanism before describing it.** "The shape of it is that you train a small
encoder to reproduce what the large one produces" is the sentence "train a small encoder to
reproduce the large one's outputs" wearing four extra words. The same goes for "the way this works
is", "what this means is", and "the idea here is".

**Do not narrate the reader's situation.** "The small encoder then runs at the speed you needed all
along, and the price you pay for that speed is accuracy." Nothing there is a finding. It restates
what distillation is for, in the second person, immediately after saying it. Write "a student
distilled from a single teacher reaches 72.1 mIoU on COCO" instead.

**Cut intensifiers dressed as precision.** "every single frame you ever process" is "each frame".
"exactly this situation" is "this". "a decent part of it" is a number you already have.

The test: delete the sentence and see whether the reader loses a fact. If not, it was fat, however
well it read.

## Principles

1. **Conclusion first.** State the finding, then support it. Result, then mechanism, then evidence.

2. **Lean.** If a sentence can be deleted without the reader losing a reason to care, delete it. If
   a word can be removed without changing the meaning, remove it.

3. **Precise.** Specific numbers, dates and names. "Improved from 0.72 to 0.84", never
   "significantly improved". Give the baseline with every relative claim. Where the specific figure
   is genuinely unavailable, write `[NEED SPECIFIC]` rather than reaching for vague language.

4. **Active.** Name the actor and the action. "The fold keeps the newest observation", not "the
   newest observation is kept".

5. **Grounded.** Every claim traces to data or to a source you actually read. Anything ungrounded
   is marked as an assumption. On this site that matters twice over, because a fabricated citation
   or a guessed venue is both damaging and invisible.

6. **Accessible.** Say the complex thing simply without losing what made it complex. The reader
   should come away knowing what was done, why it was hard, and what it achieved.

## Structure

- One idea per paragraph, developed substantively.
- Lead with what the reader needs, not with what you need to explain first.
- Connect through causation ("because", "which means", "so"), never through signposting
  ("furthermore", "moreover", "let's explore").
- Front-load the result and explain the method second.
- One metric is memorable and three are noise.
- Headers for scanning, tables for comparison, lists only for genuinely parallel items.
- Stop when the idea stops. No wrap-up paragraph, no "in summary", no "looking forward".

## Titles

A note about a paper is a hook for the paper, not a summary of it. The paper is linked at the top
of the note and is the authoritative version of everything in it, so a note that condenses the
argument is competing with the source and losing. Its job is to make somebody open the paper, in
around 200 to 300 words.

That changes what goes in it. Lead on the single idea that is genuinely interesting, stated so it
lands on a reader who has never seen the work. One number, as payoff rather than as evidence,
because a results table nobody asked for reads as a digest for people who have already read it.
Then say plainly what is left in the paper, and end on the question the work did not settle, which
is usually the most interesting thing there is to say.

**"We" for the work, never "I", never "they".** Niall is an author on every paper here and so are
several other people, which rules out both of the easy options. "I" claims a collaboration as one
person's work. "The authors" or "they" write about his own paper as though it belongs to strangers,
which reads as a review rather than a note. Where no judgement is being attributed, let the paper be
the subject instead: "this paper stops assuming the shape". The `draft-note` skill has the full rule
and the exceptions.

**State a mechanism plainly, then label it.** Where the note explains why a result holds, give the
explanation as though it were obvious, and mark it as a conjecture afterwards. Opening on the hedge
instead, as in "why several teachers help is the part I would not claim to have shown", buries the
idea under a disclaimer and reads as though there is nothing to say. Compare:

> The mechanism is presumably diversity. Teachers built differently make different errors, so a
> target assembled from several sits closer to the truth on average than any one of them does.
> That is a conjecture rather than a finding, since the experiments measure the outcome.

Two failure modes, both of which shipped here before this rule existed:

- **The digest.** "A student distilled from a single teacher reaches 72.1 mIoU on COCO and 69.6 on
  LVIS." Accurate, and it lands on somebody with no reason yet to care what the number is for.
- **The walkthrough.** Sub-headings, the method, then the experiments, then the caveats. That is
  the paper's own structure at a quarter of the length, which serves nobody: too thin to rely on
  and too long to skim.

It is titled `A note on <the paper's exact title>`. Nothing else, and no editorialising:

> `A note on Low-Count Time Series Anomaly Detection`
> `A note on Evaluation of Field-Aware Neural Ranking Models for Recipe Search`

Copy the title out of `content/publications.bib` rather than retyping it, capitalisation included,
so it matches the `Paper` card rendered underneath. A long paper title makes a long note title and
that is fine.

The note's directory is that title slugified, without the `A note on` prefix, so the title and the
path are one string in two shapes and cannot drift apart. Renaming a note means renaming both.

A note that is not about a paper says plainly what it is about. `PyTorch meets dataclasses`,
`Eager exception logging in Python`, `Visualising confidence in multi-class classification
problems`. Sentence case, no full stop.

### Do not be clever

There is no figurative convention here and there used to be one. Every note was titled as a
metaphor, a colon, and an explanatory clause, giving `Halfway up the stairs: testing for label
noise before you fit a classifier` and `A bowl of soup has no language: evaluating cross-lingual
embeddings without translations`. All of them were thrown out.

They read as clickbait, they made a reader decode a riddle before learning the subject, and the
figure was frequently drawn from a detail the note barely argued. `One argument, six edits: making
a torch module a dataclass` is the clearest case, since nobody can decode it without having
already read the note.

Descriptive, dry and focused. The paper title is more useful than anything that could be invented
to replace it, and a reader scanning a list of notes is deciding whether the subject is theirs
rather than being enticed.

Where a title changes and leaves the `description` redundant or contradictory, rewrite the
description, because it renders directly underneath.

## Citations

Two forms, and which one to use is a question about grammar rather than about style. The citation is
either **the subject of the sentence** or **the evidence for it**, and the form follows.

| the citation is                                     | write                    | renders             |
| --------------------------------------------------- | ------------------------ | ------------------- |
| the subject: the authors did something              | `<Ref id="key" />`       | Meng et al. (2024)  |
| the evidence: you claimed something, they showed it | `<Ref id="key" paren />` | (Meng et al., 2024) |

```
Meng et al. (2024) swept candidate depth and found the plateau moves.
The plateau moves with the retriever in front of it (Meng et al., 2024).
```

**The test is to delete the citation.** If the sentence still has a subject and a verb, the citation
was evidence and belongs in parentheses. If the sentence collapses into a fragment, the citation was
the subject and belongs in the running text.

> ~~measured the gap at 10,700 milliseconds~~ — collapsed, so: Khattab and Zaharia (2020) measured…

> The gap has not closed since. — stands up, so: The gap has not closed since (Khattab and Zaharia, 2020).

The failure this prevents is a sentence whose only subject is inside brackets, which reads as a
document assembled rather than written. It is easy to miss, because "(Sun et al., 2023) showed that…"
scans perfectly well until you look for the subject.

`<Cite id="…" />` is the same idea for Niall's own papers and links to the publications page;
`<Ref>` is for everyone else's and links out to the paper. Keys for external work live in
`src/content/references.ts`.

## Rhythm

Vary sentence length, mixing shorter sentences with longer ones that develop an idea across a
couple of clauses. Uniform length reads as mechanical whichever length you pick.

Never use a staccato run of short declaratives as a stylistic device. Three consecutive short
sentences read as a LinkedIn post regardless of what they say. The goal is natural variation rather
than performed brevity.

## Signalling difficulty

The reader does not need to follow the technical depth, but they do need to trust that it existed.

- **Contrast.** What was tried, why it failed, and what worked instead. The delta makes the
  difficulty visible without anyone having to claim it.
- **Quantified stakes.** "Roughly fifty instrumented homes" does the work that "large-scale" cannot.
- **Process markers.** "After eliminating six candidate architectures" shows the journey.

## Layered depth

Each layer is a valid place for a reader to stop:

1. **Result**, for everyone: "Prototyping a new model went from days to about an hour."
2. **Mechanism**, for an adjacent reader: "...because the feature store and the evaluation harness
   were shared rather than rebuilt per project."
3. **Specifics**, for an expert, and optional.

## Describing function

Build on what the reader already has. Describe what a thing does and why, rather than what it is
called, and never name-drop a framework as though using it were the contribution.

## Analogies

Use one when the relational structure maps cleanly, and bound it explicitly at the point where it
breaks. If extending the analogy one step further would mislead, cut it.

**Say it once and then drop it.** A figure used once frames the idea; used four times it becomes
the subject, and the reader starts following the metaphor instead of the argument. A draft here ran
"distillation buys speed and charges accuracy", then "the obvious way to buy that accuracy back",
then "spends the speed the distillation just bought" in three consecutive clauses, by which point
the commerce was doing the thinking. The fix is not a better metaphor, it is the plain statement
underneath: a bigger student returns less speedup the larger it gets.

## Specificity discipline

Replace every vague claim with a concrete one:

- "saves time" becomes a number of hours
- "many teams" becomes a count or named examples
- "recently" becomes a month and a year
- "widely adopted" becomes who adopted it

## Read-aloud test

If a sentence would sound stiff spoken aloud, rewrite it until it does not. If it sounds like a
press release, rewrite it. If it sounds like a LinkedIn post, delete it.

## Then run `humanizer`

Invoke the `humanizer` skill on the draft, using a published note under `content/notes/` as the
voice sample. Do its
final audit step ("what makes this obviously AI generated?") rather than stopping at the first
rewrite, because the first pass removes the obvious tells and the second removes the tidiness that
replaced them.

## Review checklist

1. **Overclaiming.** Does the narrative exceed the evidence? Are the comparisons fair?
2. **Leanness.** Any deletable sentences? Any paragraphs that condense?
3. **Motivation.** Does the reader care by the first paragraph? Is the gap stated precisely?
4. **Precision.** Are claims scoped? Are the numbers there? Is the baseline given?
5. **Accessibility.** Can a non-specialist follow it?
6. **Sentence shape.** Run `prose_stats.py`. Anything above 15% short sentences is a rewrite.
7. **Slop.** Any of the banned words or structures below?

---

## Banned words

These signal generated text or hollow thinking. If one appears, rewrite the sentence.

**Verbs.** delve, leverage, utilize, facilitate, foster, harness, underscore, bolster, illuminate,
navigate (figurative), cultivate, spearhead, empower, embark, elevate, streamline, unlock,
galvanize, catalyze, orchestrate, showcase, resonate

**Adjectives.** robust (without saying which failures are handled), comprehensive, cutting-edge,
holistic, seamless, innovative, transformative, pivotal, crucial, multifaceted, nuanced (as
standalone praise), intricate, groundbreaking, unprecedented, game-changing, state-of-the-art,
mission-critical, best-in-class, world-class

**Nouns.** tapestry, landscape (figurative), realm, paradigm, synergy, ecosystem (unless literal),
journey (figurative), testament, cornerstone, myriad, plethora, nexus, pinnacle, zeitgeist

**Adverbs.** seamlessly, holistically, fundamentally, profoundly, meticulously, significantly
(without a number), dramatically (without a number), remarkably

**Bookkeeping metaphors.** cost, price, budget, bill, pay for, buys you, spend, in exchange for,
where nothing is actually being counted. "The cost is unwritten conventions" dresses a list of
gotchas as an accounting entry and adds a false precision, and the sentence underneath it is simply
"it runs on conventions nobody wrote down". The word is fine where a real resource is being spent
and named: milliseconds, joules, a forward pass per candidate, an index rebuild. The test is whether
you could put a number on it.

**Intensifiers and hedges**, maximum one hedge per claim. significant/significantly (without data),
substantial, powerful, incredible, amazing, fascinating, genuinely, honestly, simply, truly,
certainly, absolutely, undeniably

---

## Banned structures

**Negative parallelism.** "It's not X, it's Y". "Not just X, but Y". "This isn't about X. It's
about Y." "No X. No Y. Just Z."

**Hooks and signposting.** "Here's the thing:". "Here's where it gets interesting". "Let's dive in
/ break this down / explore". "Imagine a world where". "What if I told you".

**Wrap-ups and codas.** "In conclusion / In summary / Overall". "Looking forward". "At the end of
the day". Any final paragraph that restates what was already said.

**Throat-clearing and filler.** "It is worth noting that". "It's important to note". "Interestingly".
"As we know". "In today's fast-paced world". "In order to" (use "to"). "It is clear that" (state
the thing). "We believe" (state the data or the assumption).

**Performative honesty.** "To be honest". "Let's be real". "The truth is". "Let me be clear".

**Copula avoidance.** "serves as", "stands as", "represents", "marks a". Use "is" when you mean is.

**Applause lines.** Short punchy declaratives used as emotional punctuation. "Structure matters."
"That's where meaning lives." "Full stop." Delete them.

**Counted-noun openers.** "Three things limit this." "One arm runs against the literature." "Two
problems here." Announcing a fact by tallying it, when the fact itself is the sentence you were about
to write. The count is almost never what the reader needed, and where a genuine enumeration follows,
the items carry their own count. Say the thing: "Most of the chart is suggestive rather than
measured", "the BM25 arm runs against the literature".

**Tricolon abuse.** Three-part lists used for rhetorical effect rather than information.
"Innovation. Impact. Scale." Break the pattern or use a different count.

**Formatting tells.** Em dashes, at all: use a colon, a semicolon, a comma, a full stop, or
restructure. Bold-first bullets ("**Term**: explanation"). Uniform paragraph length. Numbered lists
where prose would read better. Exclamation marks in analytical prose. Title case in headings. Curly
quotes. Emoji.

**Synonym cycling.** Different words for the same concept to avoid repetition. Use consistent
terminology, because repetition is clarity.

**Fractal summaries.** Restating one point at several levels of abstraction inside a section. Say
it once, well, then move on.

---

## Tone

Plain, direct and confident. Not enthusiastic, and not hedging unless the uncertainty is real.

Write like someone who has thought carefully and is reporting what they found, rather than someone
performing thoughtfulness. Not a pitch deck, not marketing, not a TED talk, not LinkedIn. A smart
colleague explaining something clearly to another smart colleague who respects their time.

---

## Where this applies

- `src/content/site.ts`, the bio and focus areas
- `src/content/expertise.ts`, every entry
- `content/publications/<key>/index.md`, the paper summaries
- `content/notes/*/index.mdx`, note prose (see also the `draft-note` skill)
- Page ledes in `src/routes/*.tsx`
- `README.md` and `CLAUDE.md`

One further constraint specific to this site: never publish an internal project name, codename or
identifiable product workstream from Niall's employers. Describe the capability, the technique and
the tooling instead. Under-disclosing costs nothing, and over-disclosing cannot be undone.

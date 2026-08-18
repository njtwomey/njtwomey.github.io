---
name: draft-note
description: Write or rewrite a note for the site — usually a short hook for one of Niall's papers, sometimes a standalone snippet. Use when asked to draft, write, rewrite, shorten or fix a note (e.g. "draft a note about the ordinal regression paper", "rewrite the anomaly detection note", "these notes are too long").
---

# Draft a note

A note about a paper is a **hook for the paper, not a summary of it**.

The paper is linked at the top of the note, in a card carrying its title, authors, venue, abstract
and PDF. It is the authoritative version of everything the note could say, so a note that condenses
the argument is competing with the source and losing. The note's only job is to make somebody open
the paper. Everything below follows from that.

## 1. Read the paper. This is not optional.

A note assembled from a title and a guess is worthless and, on an academic site, actively harmful.

1. Find the citation key in `content/publications.bib` and read the entry, including the abstract.
2. If `public/pdf/<key>.pdf` exists, read it with the Read tool's `pages` parameter. Most entries
   have one. A note written off an abstract reads like one: it hedges, it stays general, and it
   never has the detail that makes a hook work.
3. Where there is no PDF, try the `arxiv`, `doi` or `url` field. If the paper cannot be reached at
   all, write the note without numbers rather than inventing any, and say so to the user.

Check the claim as well as the number. The obvious framing is often drawn from a contribution the
paper treats as secondary, and neighbouring notes on related papers are where that goes wrong.

## 2. The anatomy

Four paragraphs, each of roughly sixty to ninety words in two to four sentences, which lands a note
at about 280. What follows is the shape four notes settled into rather than a form to fill in. Treat
it as the floor: a paper whose argument needs a different route should take it, and a paragraph that
earns a fifth sentence should have it. What is not optional is that a reader finishes each paragraph
holding something they did not have at the start of it.

Two habits run through all four paragraphs and matter more than the beats.

**The pivot sentence is short.** Paragraphs 2 and 4 turn the note, and they turn it in a declarative
of five to twelve words that a reader cannot misread. "The mechanism is presumably diversity." "The
limit belongs to the data rather than the detector." "This paper stops assuming the shape." The long
sentences come afterwards, doing the explaining, once the reader knows what is being explained.

**Say what did not move.** The most persuasive results here are stated as a conserved quantity
alongside the gain: "at exactly the same deployed cost", "cost nothing in prediction", "harmed it in
none". A number on its own invites the question of what it cost, and answering that question in the
same sentence is what makes the result land instead of merely register.

### ¶1 The trap

Beats: **what this area of work is** → **why the hard case exists** → **the trap**.

1. What the work does, in a sentence a non-specialist could repeat. A description, not a definition,
   and it assumes no knowledge of the field, the abbreviations, or why anyone should care.
2. The situation that creates the difficulty, and where it comes from in the world. Usually a
   contrast: the easy regime, the hard one, why both exist, and which is more common than people
   assume. This is the beat that gets skipped, and skipping it is why the difficulty then lands on a
   reader with nowhere to put it.
3. The difficulty itself, concrete enough to picture.

The last sentence is a trap rather than a complaint, and it takes one of two forms. Either a closed
loop, where the obvious escape costs back what it gained, as in growing the student to recover the
accuracy that distillation lost, or checking a test's assumptions by understanding the data the test
was meant to vet. Or an indistinguishability, where two situations that need different responses
produce the same reading: no events in an hour is an outage and is equally a quiet hour.

Do not take this framing from the paper's introduction, which is written for people who have already
decided to read it.

### ¶2 The turn

Beats: **the reframe** → **the mechanism** → **the portable principle**.

1. A short declarative that resolves the trap by reframing it. "The information does not need
   recovering, because it was never missing." Not a summary of the contribution and not a claim
   about results.
2. How it works, mechanically, in one or two sentences. This is where technical language is
   welcome, and it is the only place in the note where it is.

**No results anywhere in this paragraph.** Not a number, not a comparison, not "beat", "improved" or
"scored better". Those belong in ¶3, and a note that spends them here has nothing left to deliver and
reads as though it reached its conclusion before making its argument. Two drafts failed this way at
once: one opened "Modelling fewer of those pairings scored better", which is ¶3's sentence, and the
other closed on the model trading away "a distance metric, a cluster count and a grid search",
comparing against baselines it had not yet introduced.

**Explain what it means to model that way, do not list the model's parts.** Naming the components is
not the same as conveying the idea, and a reader who cannot picture what the model is claiming about
the world is not helped by knowing it composes into a block-structured covariance matrix. Say what
the model asserts, in words: that a Gaussian process is a distribution over functions rather than one
fitted curve, so two of them stacked can say that stars of a type share a shape while each varies
around it. The machinery earns its place only after the assertion has landed, and often it is enough
to name the resulting quantity once at the end of the paragraph. 3. The principle a reader takes away and can use elsewhere, usually stated as a contrast or a trade.
"Anything a teacher contributes is free at inference, in a way that a wider backbone never is."
"An assumption about the entire function is traded for an assumption that the function is smooth."

A paper with three contributions gets one of them here. If the idea cannot be stated without the
paper's notation, it is the wrong idea for a hook.

### ¶3 The evidence

Beats: **what was compared** → **the result, with what stayed fixed** → **the handoff**.

1. What was measured against what: the baseline, the benchmark, the field of methods, or the
   demanding requirement the method turns out to have.
2. The result, as a number against its baseline, paired with the cost that did not move. Where an
   experiment is well designed, say why, because a result that could only have come out that way if
   the method works is worth more than a bigger number. The staircase in the smart home study is the
   example: it is persuasive because the answer was known in advance and the test recovered it.
3. What is left in the paper. This is the only place the note refers to the paper's contents as
   contents, and it is what stops the paragraph drifting into a digest.

### ¶4 The opening

Beats: **the boundary** → **the open question, aimed outward** → **the conjecture, labelled**.

1. A short sentence naming what is not settled, or what the whole thing depends on. "Smoothing needs
   a decay constant, and ours came from how long an anomaly lasts in the simulation."
2. The open question, pointed at the field rather than at the experiment, and at what the answer
   would decide. "Choosing that constant without knowing how long an outage lasts is the open
   problem" aims forward; "the decay rate would have been better swept" is a reviewer's note on
   somebody's methodology, and the somebody is Niall.
3. The likely explanation stated plainly as though it were obvious, then marked as conjecture, then
   the experiment that would settle it. Leading with the hedge inverts this and ruins it, because the
   reader meets the idea already discounted.

No summary, no restatement, no take-away. Name the limitation and never make it sound like a
shortcoming: an anomaly the paper reports and flags is a credit to the work, and the difference is
where the incompleteness is placed. Say what the work covers and where its scope ends, and put the
unfinished part in the field.

### What holds across all four

**The plainness has to last.** The first sentence assumes nothing, and a note that opens legibly and
then switches into the paper's register has still lost the reader, three sentences later instead of
immediately. The problem introduced in ¶1 stays visible, in the same words, through ¶4. Technical
density belongs to the mechanism in ¶2 and nowhere else.

Getting ¶1 wrong is the most common way a note fails, and it fails silently, because a sentence
written from inside the subject reads fine to anybody already inside it. "Whether a dataset's labels
carry class-conditional noise rather than uniform noise" is such a sentence: a reader who does not
know those two terms is lost by the eighth word, and the note never comes back for them. Write
instead that labels are often wrong, and rarely wrong evenly, and that the difference matters.

## 3. What did not work

Each of these shipped before it was caught, and each reads perfectly well, which is why they need
naming rather than taste.

**The digest.** Opening on results. "A student distilled from a single teacher reaches 72.1 mIoU on
COCO and 69.6 on LVIS" is accurate, and it lands on somebody with no reason yet to care what the
number is for. Numbers are payoff and never premise.

**The walkthrough.** Sub-headings, then method, then experiments, then caveats. That is the paper's
own structure at a quarter of the length, too thin to rely on and too long to skim, and it signals
that the note is a substitute for the paper.

**Hedge-first endings.** "Why several teachers help is the part I would not claim to have shown"
buries the idea under a disclaimer, so the reader meets it already discounted. Idea first, epistemic
status second.

**"I", and equally "the authors".** Both get the attribution wrong, in opposite directions. See the
person rule under Voice.

**Fat.** Sentences that occupy the space where a fact should be: vague quality claims that cannot be
checked, mechanism announcements such as "the shape of it is that", second-person narration of the
reader's situation, and intensifiers dressed as precision. The `## Fat` section of the `writing`
skill has the full list. The test is to delete a sentence and ask whether the reader lost a fact.

**Riding a metaphor.** A figure used once frames the idea; used three times it becomes the subject
and the reader follows the metaphor instead of the argument. "Distillation buys speed and charges
accuracy", then "buy that accuracy back", then "spends the speed the distillation just bought" is
the shipped example. The fix is never a better metaphor, it is the plain fact underneath. See
`## Analogies` in the `writing` skill.

**Writing from inside the paper.** The commonest way the plainness lapses. A draft described "count
level and anomaly severity" as "independent settings of the generator", ran five detectors "across
that grid", and closed on the decay rate being "set from the generator's anomaly persistence". Every
one of those is furniture that exists only for somebody who has read the paper: the generator, the
grid, the settings, our benchmark, the ablation. Name the real thing instead of the experimental
proxy for it. A quiet service, not a low count level. How far an outage suppresses traffic, not the
reduction rate. How long an outage lasts, not anomaly persistence.

**The passive voice as an escape hatch.** "Five detector families were run", "the decay rate was
set". Told to avoid "I" and "they", a draft reaches for the passive and disowns the work just as
effectively while sounding neutral about it. If we did it, write that we did it.

**Inventing a detail to make an example concrete.** A draft opened on "a service handling two events
an hour", a figure that appears nowhere in the paper and was manufactured to make the hook vivid.
Illustrative numbers are held to exactly the standard of results numbers, because a reader cannot
tell which kind they are looking at. Where the concrete case is not in the source, write the
sentence without it.

**Spelling out a name with a standard short form.** "SAM2", not "Segment Anything Model 2" written
out, and never "a segmentation foundation model" when you know which one.

## 4. Voice

- **"We" for the work, never "I", never "they".** Niall is an author on every paper here and so are
  several other people, which rules out both of the easy options. "I" claims a collaboration as one
  person's work. "The authors", "the paper's authors" or "they" write about his own paper as though
  it belongs to strangers, which is worse: it reads as a review rather than a note, and a reader who
  glances at the author list will notice.

  So: "we read that as confirmation", "the anchor points we used". Where no judgement is being
  attributed, prefer the neutral form and let the paper be the subject: "this paper stops assuming
  the shape", "the limitation this paper states". That keeps the note from turning into a
  first-person narrative while still never disowning the work.

  The one exception is a note about something Niall did alone, such as a code snippet, where "I" is
  correct and "we" would be a fiction.

- **"This paper", not "the paper", where the paper is the subject.** A note is about one specific
  piece of work and should say so, because "the paper stops assuming the shape" could be any paper
  in the field, while "this paper stops assuming the shape" is unmistakably the one in the card
  above. Use it wherever the paper is doing something: "this paper stops assuming", "the limitation
  this paper states". The bare form survives only in the handoff sentence, where "the video results
  and ablations are in the paper" has no other possible referent.

- **Plain and confident, not promotional.** No "novel", no "we are excited to". State what happened.
- **Plain at the open, technical after.** The first sentence assumes nothing and the body assumes a
  technical reader, which is not the contradiction it looks like. The opening has to be legible to
  anyone in order to earn the attention; the rest spends that attention on specifics. What is banned
  throughout is explaining the field for its own sake, and the tell is a sentence that would still be
  there if the paper did not exist.
- **Honest about limits.** Say what the experiments measure and what they do not, in the prose
  rather than in a caveats section.
- **200 to 300 words**, and no `##` headings at that length. Go longer only where the paper earns
  it, and be able to say what earned it.

The `writing` skill governs the rest and outranks this file where they disagree. Complete sentences
above all, and no em dashes.

## 5. Fact-check the draft against the paper

A separate pass, run after the draft is finished and never while writing it. Writing and checking
pull in opposite directions: drafting wants the sentence to land, checking wants it to be false, and
doing both at once means doing neither.

Go back to the paper with the draft in hand and take every checkable assertion in turn. Find where
the paper supports it, quote that source, and classify it:

- **Supported.** The paper states it. Quote the sentence, table or figure.
- **Derived.** Arithmetic over numbers the paper states, such as the gap between two rows of a
  table. Allowed when both inputs are stated and the step is one a reader could do themselves. Not
  allowed where it needs an assumption, a unit conversion or a re-run.
- **The note's own reasoning.** A consequence the note draws rather than a claim the paper makes.
  Keep it, and make sure the sentence cannot be read as the paper's finding.
- **Conjecture.** Fine, and it must be labelled as conjecture in the prose.
- **Not found.** Cut it. Do not repair it by softening the wording, because a hedge on an unverified
  claim is still an unverified claim and is now harder to spot.
- **Contradicted.** Correct it, then re-read the paragraph, since a claim that was wrong is usually
  load bearing for the sentence after it.

Traps worth checking explicitly: a figure that is the gap between a method and a baseline, attached
to the wrong pair; two datasets in one sentence with the figures transposed; a comparison against
the original model where the paper only compares against another variant; "state of the art" where
the paper scopes the claim; and a mechanism the note explains that the paper never tests.

This pass earns its keep. On the note that established this structure it caught a quantity in the
strongest sentence of the piece, saying how much accuracy distillation gives up, which the source
never states and the drafting had invented. It survived every previous read because it was plausible
and well written, which is exactly the error no amount of re-reading finds.

## 6. The mechanics

A note is a **directory**: `content/notes/<slug>/index.mdx` plus every image that belongs to it.
The slug is the title slugified, without the `A note on` prefix.

```yaml
---
title: "A note on <the paper's exact title, copied from the .bib>"
description: "One or two sentences, shown on the index and used as the page description. Not printed on the note itself."
date: "2025-10-14" # quoted, or YAML parses it as a Date and the day shifts
tags: ["research", "ICIP 2025", "distillation", "efficiency"]
published: false
---
<Paper id="zeng2025multi" />
```

**Tags are three slots in a fixed order**, giving one to four tags in all. First is `research`, and
only on a note built on a paper: a note with no paper carries topics alone, since a second kind
would only ever restate the absence of the first. Second, on that same note, is the venue and year,
which is `venueShort` and `year` from the paper's entry in `src/content/publications.json` rather
than a venue typed from memory. Last come one or two topics, lowercase and hyphenated, in
alphabetical order. `src/content/references.test.ts` fails the build when a venue tag disagrees with
the bibliography, which is what stops a note carrying a venue the paper has since outgrown.

The topics in use are `activity-recognition`, `anomaly-detection`, `distillation`, `education`,
`efficiency`, `evaluation`, `fairness`, `interpretability`, `javascript`, `label-noise`,
`probabilistic`, `python`, `pytorch`, `recommendation`, `retrieval`, `sensors`, `smart-homes`,
`structured-prediction`, `time-series` and `visualisation`. Reuse one before inventing another,
since nothing on the site filters by tag and a second word for the same idea only makes two cards
that belong together look unrelated.

`<Paper>` renders highlighted inside a note by default, so it needs no `variant`. Bare filenames in
`<Figure src="...">` resolve against the note's own directory. Maths is KaTeX. Code fences must
declare a language.

**`published: false` is the default and publishing is the user's call, not yours.** A draft is on
the dev server badged "Draft" and absent from the live site.

A note that is not about a paper has no `Paper` card and no citation-key title. It says plainly what
it is about, and the four paragraphs above still apply with the source replaced by the thing
itself.

## 7. Rewriting an existing note

Same process, with two extra steps. Re-read the paper rather than trusting what the note says about
it, because an inherited error is the one you will not notice. Then settle the opening idea and its
problem before touching the prose: a note written as a digest cannot be trimmed into a hook, and
trying only produces a shorter digest.

## 8. Before you finish

1. Section 5 run to completion, with a verdict recorded against every assertion.
2. "we" for the work, never "I", never "they" or "the authors"; "this paper" where it is the subject.
3. The first sentence is legible to somebody who knows nothing about the field.
4. Four paragraphs, no headings, 200 to 300 words.
5. The last paragraph opens a question, and names the limitation without implying the work is
   unfinished.
6. Load the `writing` skill and run its checks, including `prose_stats.py`.
7. `make check` passes and the note renders on the dev server.

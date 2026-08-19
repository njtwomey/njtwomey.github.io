---
name: review-note
description: Review a note the way a first-time reader meets it, linearly and with no forward knowledge. Use when asked to review, critique, sanity-check or "actually read" a note, when a draft is finished and before it is published, and after any substantial edit to a note that already existed (e.g. "review this note", "does this read", "semantic review of the draft", "what's wrong with this").
---

# Review a note

The meaning of prose is not what the writer intended. It is what the reader interprets, and readers
interpret by fixed expectations about where information sits, which is the finding behind Gopen and
Swan's `The Science of Scientific Writing` and the basis of most of this file.

That is why a note cannot be reviewed by re-reading it. Its author supplies every missing noun
without noticing, so the sentences that fail are exactly the ones that read best to the person who
wrote them. The passes below are mechanical for that reason.

**This skill checks. It does not compose.** Voice belongs to the author and is not transferable, so
a review reports what breaks and why, and proposes a replacement only where the fix is structural.
Rewriting somebody's prose into your own cadence is how a review makes a note worse.

The `writing` skill owns voice and the banned list. `draft-note` owns what a note is for. This file
owns whether each sentence works at the moment it is read.

## The rule everything else serves

**A sentence may depend only on what is already on the page above it.**

Three kinds of context break that rule, and every comprehension failure in a finished draft is one of
them:

| context     | what it means                                | example that shipped                                                     |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| **private** | it exists only in the author's head          | "That pattern is already in the literature", with no pattern ever stated |
| **implied** | the reader could infer it but was never told | "almost exactly the crossing point", where no crossing point was named   |
| **future**  | it is on the page, further down              | "Everything below is a case of that"                                     |

All three read perfectly to the author. None of them can be caught by care, only by checking.

The corollary is the reviewer's own discipline: **do not conclude anything from context the note does
not contain.** If a claim's support is in the author's head, in a repository, or in a section not yet
written, it is not support. Report it as unsupported rather than filling the gap yourself.

## The reader

One reader, held for the whole note.

They work in the area and do not need the field explained. They know what BM25 is, what a
cross-encoder costs, what nDCG measures. They have not read the paper, have not run the experiment,
do not know why the note exists, and have never seen the conclusion. They read forwards, once, and
they will not scroll back to repair a sentence that did not land.

The two failures arrive together. A note that assumes the reader already has the conclusion will
also, somewhere else, define a term that reader has known for years. The mix is worse than either
alone, because the reader cannot work out who the note is for and stops trusting it. The fix is never
to split the difference: hold this reader, cut the definition, add the fact.

## Pass 1: the cold read, aloud

Read the note top to bottom, once, at reading speed, and stop at the first sentence you could not
have understood from what came before it. That sentence is the bug. Note it and continue from there,
but do not read ahead to work out what it meant, because the reader cannot either.

Read it **aloud**, or through text-to-speech. Google's technical writing course recommends this and
it earns its place: a sentence that is merely clumsy survives silent re-reading indefinitely and dies
immediately when spoken. It is also the only pass that catches a sentence which is grammatical,
in-voice, and still stupid.

Do this before any other pass. Once you start auditing you are reading as an editor and the cold read
is gone for good.

## Pass 2: information order

The constructive pass, and the one that catches the most. From Gopen and Swan:

- **Topic position**, the start of a sentence, is where readers look for **old** information that
  links back and gives context.
- **Stress position**, the end of a sentence at its point of closure, is where readers look for the
  **new** information worth emphasising.
- Therefore: **old before new**, in every sentence.
- Keep a subject next to its verb.
- One unit of discourse, one point.

Three checks follow from it.

**Every topic position holds something the reader already has.** This is the referent audit and it is
mechanical. List every phrase that opens a sentence by pointing at a concept: "the pattern", "that
shape", "the check", "this", "it", "the reason", "the question". For each, find the sentence **above**
it that introduced the thing. Introduced above is fine. Introduced below or never introduced is one of
the three broken contexts, so name the thing in place or cut the sentence.

Renaming the noun does not fix it. A draft went "The shape holds", then "The ordering holds", then
"The pattern holds", and all three were the same bug, because a definite article in the topic position
promises old information whatever noun follows it.

**Every stress position holds the payoff.** Find the sentence's most important word and check it is at
the end. "At a thousand candidates the loss reaches 0.030, the only measurement here whose interval
excludes zero, and it clears zero by 0.0001" ends on the trivial number and buries the finding in the
middle. Readers emphasise what closes a sentence, so a sentence that closes on an aside has thrown its
emphasis away.

**One concept, one name.** Synonym cycling is a `writing` offence, and it is a comprehension offence
too: a definite article attached to a fresh synonym reads as a reference to something else, so
"pattern", "shape" and "ordering" for one idea manufacture two phantom concepts. Pick one word and
repeat it. Repetition is clarity.

## Pass 3: signposting

The failure to hunt hardest, because every instance is grammatical, helpful-sounding and empty. Four
kinds, all of which shipped in one draft:

**Structural.** Telling the reader where they are in the document. "Everything below", "what follows",
"at the end of this note", "as we saw", "in the next section". A note is not a report and does not need
a map of itself. This is also a future-context violation: the reader is being asked to hold a
reference to something they have not read.

**Announcing.** Telling the reader what the next sentence will do, instead of doing it. "The reason is
visible on the right-hand edge of the chart." "The way this works is." "What this means is." "The
shape of it is." Delete the announcement and check the following sentence: it will almost always stand
alone and read better.

**Counted.** "Three things limit this." "One arm runs against the literature." "Two problems with
that." A tally standing in for the fact, and a variant of announcing that survives review because it
looks like structure. Where a real enumeration follows, the items already carry their own count; where
one does not, the number was never information. Replace the count with the claim.

**Transitional.** "Furthermore", "moreover", "additionally", "importantly", "notably". Connect through
causation instead, with "because", "so", "which means".

**Meta.** Narrating the note rather than the subject. "Most of it is reading." "This note is about."
"What I found is below." One line in the opening paragraph may say what kind of thing the reader is
about to read. Everything beyond that is the author talking about their afternoon.

The general test: delete the sentence, or the clause, and see whether the reader loses a fact. A
signpost never carries one, which is why it is invisible to a proofreader and obvious to a reader.

### What is not signposting

Cutting the five kinds above tends to take the connectives that were doing real work with them, and
the result is a note where every paragraph starts from nowhere.

**A paragraph that changes register has to say so.** Moving from a general claim to a concrete
instance, from a mechanism to its consequence, or from one paper's result to a second's, the reader
needs to know how to file the paragraph before reading it, because working it out halfway through
means going back to the start. "One example is", "the same thing happens when", "what that costs is":
three or four words, then straight into the content.

The difference is what the phrase points at. A signpost points at the document, as in "everything
below is a case of that" or "the reason is visible on the right-hand edge". A connective points at
the argument, and tells the reader whether what follows is a new claim or an illustration of the last
one. The first is furniture and the second is information.

Keep it to a clause. A connective given a sentence of its own has become a signpost.

## Pass 4: standing

The most damaging thing a note can do is claim more than it did, and the author is worst placed to
notice, because they know what they meant.

Give every claim an owner: **the literature's** (cited, and say whose in the sentence), **the note's
own** (say what it measures and over what), **the note's reasoning** (a consequence drawn, and it must
not read as a finding), or **conjecture** (fine, and labelled as such in the prose).

Then check the opening against the body. An opening implying the analysis is load-bearing when the
analysis is confirmatory is the failure to look for hardest. The verb carries it, and "found",
"showed", "reproduced", "checked" and "confirmed" are five different claims, so the choice is the
author's rather than yours.

**Standing lives in the verbs and the headings, never in a disclaimer.** "None of this is my finding,
and what I ran is a check rather than a contribution" is a whole sentence spent managing expectations,
and it survives review because it looks like honesty. It is not. The honest version is an accurate
heading, an accurate verb, and then no further mention. A note that keeps apologising for its scope has
made its scope the subject.

### Nothing is settled

This is a research subject, and research subjects do not close. A note reports what somebody
measured, under what conditions, and how much it moves the question. Two registers get that wrong,
and they are opposite failures, so correcting one usually produces the other.

**False closure** is the worse of the two and the one that keeps recurring here. "X settles it." "The
decisive experiment." "This proves." "The answer is." "It is the only way to." A single paper does not
settle a live question, and writing as though it did is invisible to a reader who already agrees and
disqualifying to one who does not.

**Reflexive hedging** is the overcorrection. "may indicate", "might suggest", "could be argued",
"tends to", "somewhat". Qualifying claims that were fine reads as having nothing worth defending, and
a note that hedges everything has told the reader nothing they can use.

The fix is neither, and it is not a midpoint between them. **Precision does the work the certainty
language was faking.** "Meng et al. settle it with the decisive experiment" becomes "Meng et al. held
the re-ranker fixed and swapped only the first stage, and the depth at which re-ranking stopped
helping moved with it". The second is firmer, because it can be checked, and it claims less, because
it says what was done rather than what it proves. A specific claim carrying its own conditions needs
neither a certainty word nor a hedge.

So: state what was measured, in the past tense of what happened, and let the reader judge the weight.
Where uncertainty is real, say it once, in the sentence that carries the claim, and then stop. Where
something is genuinely beyond what the work can separate, say that plainly, which is firm rather than
hedged: "this experiment cannot separate the two" beats "this may possibly be partly explained by".

Three specifics:

- **A finding that is not one.** Reading the literature and re-running a known result is not a
  discovery.
- **Confidence declared in the wrong place.** If a result is not significant, that belongs in the
  sentence making the claim, not in a limits paragraph three paragraphs later.
- **A result that contradicts the work the note cites.** Say so in the prose, and give the likely
  reason. Leaving the reader to notice is how a note loses them completely.

## Pass 5: usefulness

Every pass above can be satisfied by a note nobody needs. McEnerney's test, blunt and applied once to
the whole piece: **clear and useless is still useless.**

Ask what the reader does differently afterwards. Not what they learned, what they do: a number they
will now measure, a default they will now distrust, a decision they will make in the other direction.
If the answer is "understands the topic slightly better", the note is a summary and its subject is the
author's reading rather than the reader's problem.

Then check the opening paragraph carries it. Cover everything else and read it alone: it should state
the answer, not promise one. "There is a pattern in the literature" is a promise. "Stronger retrievers
have been taking over the re-ranker's job, so the better the first stage, the less the second adds" is
the answer, and every later reference back to it then has something to refer to.

## Pass 6: paragraphs, numbers, sources

- **One topic per paragraph**, and the first sentence carries it. Three to five sentences is the
  usual shape.
- **Every number carries its unit and its baseline.** A section reporting 0.645 and 0.683 without
  naming the metric is asking for faith. A chart axis does not count, because prose is read separately
  from figures. And units stay consistent: `10.7 s` beside `29.77` is a defect.
- **Every quantity is the one the claim needs.** If the practical number is the peak and the
  argument's number is the converged value, give both and say which is which.
- **Every citation supports the sentence it is attached to.** Check the metric the cited paper
  actually reports and whether it claims significance or only a point estimate. A paper measuring
  Recall@10 does not support a claim about nDCG.
- **Model names are the identifiers you would pass to something**, in code formatting, consistently,
  including the short forms.

## Reporting

The review is not the rewrite. Run the passes, report, and fix on a separate turn. Drafting wants a
sentence to land and reviewing wants it to fail; doing both at once means doing neither.

Report a ranked list, worst first. For each: quote the sentence, say what a cold reader takes from it,
then give the replacement or say why it should be cut. Rank by what breaks comprehension rather than
by how easy the fix is, and put the mechanical items together at the bottom.

Two rules on the report itself:

- **Say which items change what the note argues.** Those are the author's call. The rest are not.
- **Do not soften a broken sentence as a fix.** A hedge on an unclear claim is an unclear claim that
  is now harder to find.

## Checklist

1. Cold read done first, aloud, before any auditing.
2. No sentence depends on private, implied or future context.
3. Every topic position holds old information; every stress position holds the payoff.
4. One concept, one name.
5. No structural, announcing, transitional or meta signposting.
6. Every claim has an owner, the verbs match the standing, and no sentence apologises for scope.
7. Significance stated where the claim is made, and contradictions with cited work acknowledged.
8. The opening paragraph states the answer, and the reader can say what they will do differently.
9. Every number has a unit, a baseline and a consistent form.
10. One reader, held throughout.

## Sources

- Gopen and Swan, `The Science of Scientific Writing`, American Scientist 1990. Topic and stress
  positions, old before new, reader expectation as the unit of analysis.
- McEnerney, `The Craft of Writing Effectively`, University of Chicago. Value lives in the reader,
  not in the text.
- Olah and Carter, `Research Debt`, Distill 2017. Poor exposition, undigested ideas, bad abstractions
  and noise, and the claim that distillation costs as much as discovery.
- Google, `Technical Writing One` and its self-editing unit. Paragraph mechanics and reading aloud.
- Peyton Jones, `How to Write a Great Research Paper`. Writing as the thing that exposes what you do
  not understand.

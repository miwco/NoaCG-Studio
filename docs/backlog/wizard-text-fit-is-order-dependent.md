---
v: 1
source: owner
raised: 2026-09-04
state: unstarted
asked: "When I changed the behavior to be a quiz, it made the text proper, kept the font size, and added the rows like it should. But then, when I removed the text and tried adding it again, it bugged out again, so the text became small. Then I changed the behavior to nothing and it fixed the design. When I tried it again with a new text, it bugged out again, and the text became small. Then I tried to switch the behavior. It didn't work the first time, but after switching around a few times from nothing to a quiz table, it got it right again."
---
# The wizard's text fitting is order-dependent: same input, different result

**Filed:** 2026-09-04. **Source:** owner, walking two `serves: now` items on production
(`776aa8cf`) with `e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg`.

## Why

This is the more important half of two walk failures, and it changes what those failures mean.

Both `docs/acceptance/owner-queue/2026-09-02-text-knows-its-box.md` and
`2026-09-04-the-fit-ladder-does-what-it-says.md` were refuted on the same route. Taken alone each
reads as a fit-ladder bug. But the owner also found that the SAME text in the SAME graphic renders
correctly or incorrectly depending on what was toggled beforehand, and that toggling the behaviour
back and forth eventually recovers the correct result:

> There's something funky going on with the wizard there. It seems to be very difficult to get the
> text working as it should.

An output that depends on the order of unrelated interactions is not a layout bug. It is state
that is not recomputed when its input changes. **If the fit is only recalculated when the
BEHAVIOUR changes and not when the TEXT changes, then every symptom above follows from one
cause**: type text and the old fit stands (text looks small, panel never widens); change behaviour
and it recomputes against the current text (suddenly correct); clear and retype and it goes stale
again. That reading also explains why "the panel gets wider" appeared dead - if the mode is read
from a stale pass, correct code is simply never invoked.

Stated as a hypothesis. Nobody has instrumented it yet, and the first step of this row is to
confirm or kill it, because it decides whether the fit ladder needs fixing at all.

**The gates were green for both items.** Whatever they measure is not what the owner did. A
recomputation that only fires on one of two inputs passes any test that sets both and then asserts
once. That gap is part of this row: a fix that leaves the gate blind leaves the next regression
silent too.

**It is on the critical path.** The quiz is one of the two graphics 2026-09-12 is decided by, and
this is the quiz board, with a student typing a question into it.

## What it would take

1. Reproduce and instrument: does the fit run on text change, on behaviour change, or on both?
2. Fix the recomputation, not the ladder, if the hypothesis holds.
3. A gate that changes ONE input at a time and asserts after each, since the current ones cannot
   catch this.

## The owner's own suggestion, which is a separate idea

> if the behavior of the graphic changes, the text react maybe should be above the editable text
> fields so you can start by choosing what the template is.

Put the behaviour choice ABOVE the text fields, so the user picks what the graphic IS before
typing into it. Worth taking seriously beyond this bug: it makes the dependency visible in the
layout, and a user who chooses first never meets the stale path at all. It does not replace the
fix - a graphic whose text is edited later must still recompute - but it removes the ordering that
produces the confusion.

## Evidence

- Owner walk, 2026-09-04, verbatim in the receipt above.
- The two refuted queue items, both carrying his words.
- Production was `776aa8cf`, the tip of `main`, so this is landed behaviour and not a branch.

## Where to look - from reading the code, not from a reproduction

`MapSvgFieldsStep.tsx:669` is the effect that measures the artwork and sets the default too-long
mode. Three properties of it are consistent with everything the owner saw. None of this is proof;
nobody has instrumented it.

**It measures the DOM but depends on React state.** The body reads the live stage
(`proposeBannerGrowth(stage, …)`, `panelsHoldingText(stage, …)`, `repeatsWithNewContent(stage, …)`),
while its dependency array is `[svg, draft.svgFields, boundMarkerIds, placedLines,
draft.svgBehaviour, draft.svgStretch, onDraft]`. **No entry changes when the user types.** So the
measurement can be taken against artwork whose text has since changed, and re-running it is a
matter of touching something unrelated - which is exactly the "toggle the behaviour a few times
and it comes right" the owner described.

**It stops permanently once the mode is touched by hand.** Line 671 is
`if (… || draft.svgStretch.authored) return;`. Picking a mode sets `authored`, so from then on
nothing re-measures. That is deliberate - it exists so the tool does not overrule the author - but
it means the first manual pick freezes whatever geometry was current at that moment.

**Attaching a behaviour forces the "text gets smaller" default.** `const grows = !!banner &&
!draft.svgBehaviour && !repeatsWithNewContent(stage, holders)` - any behaviour makes `grows` false,
so `want` becomes `{ on: false }`, which the panel summarises as *"the text gets smaller"*. That is
worth checking against the owner's 2026-09-03 ruling, which said a quiz board keeps its artwork
fixed and the text draws new lines, changing font size only *"when we absolutely need to do it"*.
Whether `on: false` still permits the wrap rung is the question; the ladder's ratified order puts
shrink LAST, and this default appears to skip straight to it. If it does, the ruling and the code
disagree and that is a second finding rather than a facet of the first.

**Order for the row:** confirm the staleness first, because if the fit is running against text that
has since changed, both refuted queue items may be reporting one cause and neither needs its own
fix.

---

## The decisive evidence: PREVIEW and PROGRAM disagree (owner, 2026-09-04)

The owner took the quiz board past the wizard into the control page and played it out. This is the
finding the row should start from, and it partly overturns the reading above.

> I add it to the queue, and I write a long question. In the preview, it looks good. It works as it
> should, but when I play it out, it breaks down and the text becomes small, and it doesn't follow
> the rules. The answer texts don't get contained in their boxes, etc.

**Same template, same data, two surfaces, two results.** From his screenshot, the PREVIEW pane
renders the long question large, wrapped over six lines, filling the tan plate - correct, and
exactly what the 2026-09-03 ruling asks for. The PROGRAM pane, on air, renders the identical
question at roughly a third of that size on two lines in the same plate.

That is not stale state and it is not the data. Both panes hold the same values at the same moment.
**The fit produces a different answer depending on the surface it renders in**, which points at
measurement rather than logic: a fit that reads geometry from the DOM gets different numbers in the
two contexts. Anything that changes measured dimensions between them is a candidate - a CSS
transform scale on one and not the other (`getBoundingClientRect` reports post-transform values), a
different stage size, or a fit that runs before the program surface has laid out. Whichever it is,
the ladder itself may be correct and simply fed wrong numbers.

**Three defects, and they are not the same defect.** Keeping them apart is the point of this
section:

1. **Question size differs between preview and program.** Environment-dependent. The strongest
   clue, and the one to chase first.
2. **Answer text overflows its plate in BOTH panes.** Visible on "4. Beth Harmon asdsadasdadssd a
   asd" and "Lorem ipsum adadsdas sda as asdsads ada sd", which spill outside their tan tags in the
   preview as well as on air. Not environment-dependent, so this is a real containment failure on
   the rotated answer plates and is independent of defect 1.
3. **The validator and the renderer disagree.** The control page shows *"question is too long for
   the design - shorten it"* and marks F0 *"Too long for the design"* while the preview is rendering
   that same question perfectly well inside its plate. So the check that decides "too long" is not
   using the fit the renderer applies. Whatever is fixed, these two must end up asking one question.

**What this does to the earlier hypothesis.** The dependency-array staleness at
`MapSvgFieldsStep.tsx:669` is still worth confirming, because the owner did see the wizard behave
differently after toggling. But it is a wizard-side defect at most, and it cannot explain a
disagreement between two panes of the control page that share one draft. Do not let it become the
whole diagnosis.

**The lower third is fine and is not part of this.** Walked the same day on
`effects-gradient-shadow-lower-third.svg`: *"the preview reacted nicely to everything, it made rows
when I wanted it to, and it grew the panel"*. So growth, wrapping and the ladder all work on a
graphic that grows. The failure is specific to the fixed-artwork board, which is the case the
2026-09-03 ruling is about and the case 2026-09-12 depends on.

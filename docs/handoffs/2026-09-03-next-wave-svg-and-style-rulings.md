# Next wave: three rows from the 2026-09-03 walk - his phone, then his desk

Written from a `/walk` the owner took on his phone. He answered all three `serves: now` phone
items and asked for prompts rather than work, because an Illustrator round was running at the
same time. Nothing was implemented in that session.

The prompts are below in `.agent-workflows/orchestrator/prompts.md` format. The letters are
placeholders - the orchestrator re-letters and re-routes them at plan time; the MODEL lines are a
recommendation, not a routing decision.

## What he ruled

**1. A quiz or poll board is FIXED. A lower third or a standalone text box scales.** Verbatim,
because the reasoning is the part that matters:

> I made a mistake initially when I wanted all graphics to scale with the text. However, when I
> have a quiz board, I realized that I do not want that to happen because I can't have each
> question graphic looking different when they come on the screen. This is logical. It makes
> sense, for example, when you consider a "Who Wants to Be a Millionaire" type of graphic; it
> would be crazy to have the question length and the answer option length define how the graphic
> looks. Of course, it needs to be unified.

> So, for quiz boards, let's establish this rule to keep it simple: in quiz boards, the graphic is
> fixed, and the text adapts in another way. This might not be the final solution because there
> are always exceptions, and we just have to live with that.

> Lastly, it is usually best to keep the font size the same as the design because that's how it
> was intended. This is also a good rule for us to follow: we should mimic the original design as
> closely as possible. We don't want to break it. However, sometimes we want to scale the
> background graphics, and sometimes we want to scale down the text, and this should be allowed.

Asked what "unified" costs, he loosened it himself, and this second half is the design:

> The graphic should stay the same when it's fixed. Let's not take "unified" too literally here.
> The font size can get smaller if it needs to be, but then it's also bad design from the person
> who made the question. The quiz board should have space for graphics that are multi-line, and it
> should not break the design.

> *One-Line-Questions* is in the middle of the question box. When the question gets longer, it
> fills out until the box but stays inside the box, drawing new lines and keeping the whole text
> centered all the time. So, even though the text gets longer, the graphic is fixed, and we can be
> looser with the term "unified."

> It does not mean that every graphic needs to have the same font size, but we will only change
> the font size when we absolutely need to do it. There should be a possibility for multi-line,
> and the user then makes the decision to have a long question if it doesn't fit with the same
> font.

**2. The docs read as written by a person.** Item `2026-08-30-u-svg-words` and the voice half of
`2026-09-02-docs-a-person-wrote` are settled: *"The docs are good."* The "on air" gloss in
Getting started stays. No work falls out of this.

**3. Collapse the look-alike palettes.** One word: *"Collaps them"*. Part 2 of
`docs/backlog/style-step-palettes-match-graphic.md` is now authorized on the perceptual-threshold
half.

## The tension row A has to resolve, and it is resolvable

On 2026-08-30 he ruled the growth rule must **never** depend on a category
(`docs/backlog/growth-rule-geometry-and-purpose.md`). Today he ruled quiz boards are fixed. Those
agree only if "quiz board" is known from the **behaviour attached to the graphic** - a quiz or
poll behaviour means the graphic plays as one of a SEQUENCE, and a sequence keeps its size -
rather than guessed from a catalog category or from the shape of the artwork. That is the design
constraint on row A, not an afterthought: a heuristic on the category is the thing he ruled out.

## Two things he said that are direction, not this work

- **The user gets the final say.** *"We also need to implement ways for the user to create their
  own preferences. They should have the final say on how something works."* Our defaults are
  defaults.
- **Defaults come from how television actually works.** *"If we can gather examples from real life
  regarding where and how graphics are used, we can replicate those default settings. I am not
  here to create something unique with the design styles; this should be common sense and always
  look good, as the customer desires."* Both are recorded on
  `docs/backlog/growth-rule-geometry-and-purpose.md`.

## What the desktop walk added, same day

He then walked `2026-09-02-text-knows-its-box` at his desk, on a server serving a checkout current
with main. **That item's claim does not hold**, and the walk turned up four bugs and two design
questions. All six are verbatim in the queue item. The short form:

1. **Shrink fires before wrap** on the question row. Picking "the text gets smaller" is read as
   *shrink instead of wrapping*, not *shrink after wrapping*. His words: *"The text should never
   become smaller before it fills the space it can occupy."* That is the 2026-08-26 ladder-order
   ruling, unchanged, not being honoured.
2. **The same board's ANSWER rows wrap correctly.** One file, two behaviours. That is the lead.
3. **Intermittent** - he made it wrap once by changing the dropdown and could not reproduce it. A
   behaviour that appears only after a re-measure points at the FIRST measurement.
4. **The growth rung does nothing.** "The panel gets wider", with the shape named, changes nothing
   on this file. Sweep finding 4 was recorded FIXED on 2026-08-28; either it regressed or this
   board's panel is a shape the inventory still refuses.
5. **One dropdown governs the whole graphic.** *"What if you want it to react differently between
   the question and the answer? What's our solution for that?"* Open design question.
6. **The behaviour's answer count defaults to 2** on a board with five text boxes, one of them
   plainly the question. It should be 4.

So row A grew: the ladder has to DO what it says before anything is changed about what it
defaults to. Rows A and C are split rather than merged because the second is a step's UI and
model, and chaining spends wall-clock a night already has.

## The prompts

Run order: **A and B start now. C follows on A landing.**

```
SESSION A - the ladder does what it says
BRANCH <tool>/a-fit-ladder-truth
MODEL  opus high - a measured runtime bug with a taste rule sitting on top of it
START  now
TOUCHES src/templates/importedDesign/svg.ts, src/assets/svgImport.ts,
        src/components/wizard/draft.ts, docs/SVG_AUTHORING.md,
        e2e/fixtures/svg-corpus/*, e2e/import-svg-corpus.spec.ts
MINTS  -
GOAL   On illustrator-owner-quiz-board-rotated.svg, a long question wraps into the box it was
       drawn in, at the drawn font size, and shrinks only once wrapping has run out of room -
       whichever ladder option is chosen, on the FIRST measurement, repeatably. Choosing "the
       panel gets wider" visibly widens the named shape. A graphic that plays as one of a
       sequence never DEFAULTS to growing. No corpus file defaults to growing where there is no
       room to grow.
WHY    Owner walk 2026-09-03, verbatim in docs/acceptance/owner-queue/2026-09-02-text-knows-its-
       box.md. The quiz is one of the two graphics 2026-09-12 is decided by, and today a long
       question on it goes small immediately. His rule, unchanged since 2026-08-26: shrink is the
       LAST rung "because that changes the design more".
READ   the queue item above (all six findings); docs/SVG_IMPORT_PLAN.md section 3 (THE HUG, THE
       FIT LADDER); src/templates/importedDesign/AGENTS.md; docs/backlog/svg-import-sweep-
       findings.md findings 4 and 5; docs/backlog/growth-rule-geometry-and-purpose.md.
DO     1. REPRODUCE ALL FOUR BUGS FIRST, in the browser, before changing a line. The answer rows
          on the same board wrap correctly - the difference between them and the question row is
          the whole diagnosis. Write what you find in the branch before fixing it.
       2. Fix the order: an option chosen is a CEILING on what the graphic may do, never a
          replacement for the rungs above it. "Smaller" still fills and wraps first.
       3. Fix the first-measurement bug behind finding 3. A rule that only comes right after a
          re-measure is a measurement bug, not a rule bug.
       4. Fix the growth rung on this file, or state precisely why this panel is refused by the
          inventory and file it with a fixture.
       5. Only then the defaults: a sequence graphic defaults to wrap-then-shrink, never grow;
          and stop proposing growth where there is no room (masked text, a frame-wide strip, a
          sub-artboard). "Plays as a sequence" must be known from the BEHAVIOUR attached, never
          from a category - that is the 2026-08-30 ruling and it stands.
       6. A wrapped block drawn centred in its box stays centred as it gains lines, growing from
          the middle rather than pushing down from its first baseline.
       7. Re-derive affected sidecars with the reasoning IN the sidecar, run
          e2e/import-svg-corpus.spec.ts, and pin the four bugs so they cannot come back.
CORE   Steps 1-4. They are the owner's live bug on the critical-path graphic. Steps 5 and 6 are
       the ruling; if the session is short, file them and say so rather than half-landing them.
TRAPS  The item this walk came from CLAIMED the question already stays at its drawn size, and it
       does not on his machine. Do not trust the previous handoff's claim - re-measure. The sweep
       serves the ORIGINAL checkout unless you start `npm run dev:worktree` first. The growth
       field is where every delegate went wrong in the 2026-09-02 trial.
GATE   npm run build, then push and read the CI run - check WHICH jobs ran. Commit each verified
       step. Add the owner-queue item in the same commit as the change it describes.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-a-fit-ladder-truth.md;
       3. run /queue-merge. Do not commit after queueing. Never merge into main yourself.
```

```
SESSION B - palettes you can tell apart
BRANCH <tool>/b-collapse-palettes
MODEL  sonnet high - a bounded measurement with one threshold to justify
START  now
TOUCHES src/blocks/cssVars.ts, src/components/wizard/steps/StyleStep.tsx,
        e2e/wizard-setup-fields.spec.ts
MINTS  -
GOAL   On any design, every colour package the Style step offers is visibly different from every
       other one it offers, and the count per design is measured and written down.
WHY    Owner ruling 2026-09-03: "Collaps them". On Frosted Panel, nine of the twelve surviving
       packages are a dark panel with a white text bar differing by two or three units of 255 and
       a percent of alpha. Each builds a measurably different file, so none is dead - but nobody
       can choose between them by eye, which makes the chooser show nine copies of one chip.
READ   docs/backlog/style-step-palettes-match-graphic.md (this is part 2's first half);
       src/components/wizard/AGENTS.md; docs/handoffs/2026-09-02-h-no-dead-controls.md.
DO     1. Pick a perceptual threshold and justify it in the code comment - a just-noticeable
          difference in a perceptual space, not a raw RGB distance. Compare the ROLES the design
          actually paints with (cssPaintsWith already answers that), never the whole package.
       2. Collapse below the threshold, keeping the package a person is likeliest to recognise.
       3. MEASURE the result: how many packages survive on each catalog design, printed as a
          table in the handoff. An unmeasured collapse is not done - he asked for the real count.
       4. Extend the part 1 pins in e2e/wizard-setup-fields.spec.ts: every offered package still
          builds a different document AND no two offered packages are within the threshold.
CORE   Steps 1-3. Step 4 is what stops it regressing.
TRAPS  This is NOT the second editor - if the answer starts to look like the Style panel it has
       gone wrong (the backlog row says so, in his words). The richer-options half of part 2
       (text outline, text colour) is NOT authorized and is not in this row.
GATE   npm run build, then push and read the CI run - check WHICH jobs ran. Commit each verified
       step. Add the owner-queue item in the same commit as the change it describes.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-b-collapse-palettes.md;
       3. run /queue-merge. Do not commit after queueing. Never merge into main yourself.
```

```
SESSION C - the mapping step answers per field
BRANCH <tool>/c-per-field-fit
MODEL  opus high - a model change dressed as a dropdown; the wrong shape here is expensive later
START  on <tool>/a-fit-ladder-truth landing
TOUCHES src/components/wizard/steps/MapSvgFieldsStep.tsx, src/components/wizard/draft.ts,
        src/templates/importedDesign/behaviour.ts, e2e/import-svg.spec.ts
MINTS  -
GOAL   A board's question and its answers can be given different overflow behaviour, and the quiz
       behaviour offered on a five-text-box board defaults to four answers, not two.
WHY    Owner walk 2026-09-03: "What if you want it to react differently between the question and
       the answer? What's our solution for that?" and "it defaults to two answers when you can
       clearly identify five text boxes, where one is the question. It should just default to
       four answers." He liked the rest of that step - "I like the logic of how you choose what
       the answers do when you select them" - so this is a narrowing, not a redesign.
READ   docs/acceptance/owner-queue/2026-09-02-text-knows-its-box.md; src/components/wizard/
       AGENTS.md (the Import-graphic and SVG block); docs/SVG_IMPORT_PLAN.md section 3.
DO     1. Make the overflow choice per FIELD, with the graphic-wide choice as the default every
          field inherits until it is overridden. One dropdown must still be enough for the person
          who does not care - do not make the simple case worse to serve the hard one.
       2. Derive the behaviour's answer count from the text boxes actually bound, rather than a
          fixed starting number. Five boxes, one of them the question, means four answers.
       3. Pin both in e2e/import-svg.spec.ts.
CORE   Step 2 is the cheap one and lands first. Step 1 is the one worth thinking about.
TRAPS  A per-field override shown on every field turns a two-click step into a twenty-click one.
       The default has to stay invisible until someone wants it.
GATE   npm run build, then push and read the CI run - check WHICH jobs ran. Commit each verified
       step. Add the owner-queue item in the same commit as the change it describes.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-c-per-field-fit.md;
       3. run /queue-merge. Do not commit after queueing. Never merge into main yourself.
```

## Queue items this walk moved

- `2026-08-29-svg-import-against-a-wider-corpus.md` - ruling recorded, stays open until row A
  lands.
- `2026-08-30-u-svg-words.md` - the voice test passed; narrowed to the in-app half, which needs a
  screen.
- `2026-09-02-style-step-no-dead-controls.md` - ruling recorded, stays open until row B lands.
- `2026-09-02-docs-a-person-wrote.md` - voice half settled; the beginner read-through and the
  Google Sheet question are still open.
- `2026-09-02-text-knows-its-box.md` - **walked and FAILED**. Now a bug report with six findings
  verbatim; stays open until rows A and C land.

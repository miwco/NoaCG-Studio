# Next wave: two rows the owner ruled on his phone, 2026-09-03

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

## The prompts

```
SESSION A - fixed boards, honest growth
BRANCH <tool>/a-fixed-boards
MODEL  opus high - taste rule with a measurement under it; the corpus punishes a heuristic
START  now
TOUCHES src/assets/svgImport.ts, src/templates/importedDesign/svg.ts,
        src/components/wizard/draft.ts, src/components/wizard/steps/MapSvgFieldsStep.tsx,
        docs/SVG_AUTHORING.md, e2e/fixtures/svg-corpus/*, e2e/import-svg-corpus.spec.ts
MINTS  -
GOAL   A graphic that plays as one of a sequence never defaults to growing; its text wraps inside
       the box it was drawn in and stays centred while it gains lines, at the drawn font size,
       shrinking only when wrapping has run out of room. No file in the corpus defaults to growing
       where there is no room to grow.
WHY    Owner ruling 2026-09-03, verbatim in docs/handoffs/2026-09-03-next-wave-svg-and-style-
       rulings.md. Two five-answer quiz boards in the corpus arrive on OPPOSITE defaults
       (student-illustrator-quiz grows, inkscape-hidden-state-layers-quiz shrinks) because the
       rule reads geometry alone, so a student cannot predict what their board does. The quiz is
       one of the two graphics 2026-09-12 is decided by.
READ   docs/backlog/svg-import-sweep-findings.md finding 5; docs/backlog/growth-rule-geometry-and-
       purpose.md; docs/SVG_IMPORT_PLAN.md §3 (THE HUG, THE FIT LADDER); src/templates/
       importedDesign/AGENTS.md; e2e/fixtures/svg-corpus/README.md (the sidecar schema).
DO     1. Decide how "plays as a sequence" is KNOWN, and write the decision down before coding.
          It must come from the behaviour attached to the graphic, never from a catalog category
          or a guess at the artwork's kind - that is the 2026-08-30 ruling and it stands.
       2. A sequence graphic defaults to wrap, then shrink. Never grow. The author can still
          choose growth in one click; only the DEFAULT changes.
       3. A wrapped block that was drawn centred in its box stays centred as it gains lines: it
          grows from the middle in both directions rather than pushing down from its first
          baseline. Today it pushes down (svg.ts, the mirrored-inset rule around line 792).
       4. Stop proposing growth where there is no room to grow: text inside a <mask> (widening
          past the mask paints nothing), a strip already as wide as the frame, a sub-artboard with
          its own coordinate system. That closes three of finding 5's five repros without any
          taste call.
       5. Re-derive the affected sidecars, then run e2e/import-svg-corpus.spec.ts. A sidecar that
          changes gets its reasoning written in it, in the file, not in the commit message.
       6. Update docs/SVG_AUTHORING.md §4 to state the rule in the designer's words.
CORE   Steps 1, 2 and 4. Step 3 is the one with real runtime risk; if it will not land clean,
       file it rather than half-landing it, and say so in the handoff.
TRAPS  The growth field is exactly where every delegate went wrong in the 2026-09-02 trial - the
       measurement is the corpus sidecar, never your reading of the code. The sweep serves the
       ORIGINAL checkout unless you start `npm run dev:worktree` first, so a sweep run without it
       measures main's importer and not your branch.
GATE   npm run build, then push and read the CI run - check WHICH jobs ran. Commit each verified
       step. Add the owner-queue item in the same commit as the change it describes.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-a-fixed-boards.md;
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
       src/components/wizard/AGENTS.md; the part 1 handoff docs/handoffs/2026-09-02-h-no-dead-
       controls.md.
DO     1. Pick a perceptual threshold and justify it in the code comment - a just-noticeable
          difference in a perceptual space, not a raw RGB distance. Compare the ROLES the design
          actually paints with (cssPaintsWith already answers that), never the whole package.
       2. Collapse below the threshold, keeping the package a person is likeliest to recognise.
       3. MEASURE the result: how many packages survive on each catalog design, printed as a
          table in the handoff. The owner asked for the real count before it ships, so an
          unmeasured collapse is not done.
       4. Extend the part 1 pins in e2e/wizard-setup-fields.spec.ts: every offered package still
          builds a different document AND no two offered packages are within the threshold.
CORE   Steps 1-3. Step 4 is what stops it regressing.
TRAPS  This is NOT the second editor - if the answer starts to look like the Style panel it has
       gone wrong (the backlog row says so, in the owner's words). The richer-options half of
       part 2 (text outline, text colour) is NOT authorized and is not in this row.
       claude/c-consent-over-dialog is in flight on src/styles/wizard-and-dialogs.css; take main
       before you push if you touch that file.
GATE   npm run build, then push and read the CI run - check WHICH jobs ran. Commit each verified
       step. Add the owner-queue item in the same commit as the change it describes.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-b-collapse-palettes.md;
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

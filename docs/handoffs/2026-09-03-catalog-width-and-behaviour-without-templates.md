# Three rows from the 2026-09-03 walk: catalog width, and behaviour without a template

Owner rulings from a walk of the Style step and the SVG import corpus. Neither settles the queue
item it came from; both were shelved at his request, for nightly and daily waves. The backlog rows
carry his words verbatim - read them before planning any row here.

```
SESSION E - what each kind of show actually needs
BRANCH <tool>/e-catalog-by-programme-type
MODEL  fable high - desk research plus a design judgement about what the shelf is missing, and the
       output steers every drawing session after it
START  now
TOUCHES docs/ (a new survey doc), docs/backlog/catalog-variety-by-programme-type.md
MINTS  the survey doc + a gap table
GOAL   A written survey of what graphics each kind of show runs - talk show, game show, podcast,
       sports, film/entertainment - joined to what the catalog has, so a drawing session is handed
       a named absence instead of "make something different".
WHY    Owner, 2026-09-03: "I think that we don't have the width of the template gallery that we
       need. Our competition has years in the business... Most of the graphics we have look like
       the house graphics; they are banners with an accent line." He asked for a STRATEGY before
       more drawing, because more cards drawn the same way is the thing he is complaining about.
READ   docs/backlog/catalog-variety-by-programme-type.md (his words, and the three asks the older
       variety row does not carry); docs/backlog/template-variety-and-dedup.md (the 96% strap/thin
       measurement); docs/CATALOG_VARIETY.md; docs/LOWER_THIRD_SHAPES_BRIEF.md; COMPETITORS.md.
DO     1. Survey, by desk research against what comparable products ship, what each show genre
          runs and what each graphic has to say. Derive the conventional answer - do NOT file
          questions back to the owner (docs/acceptance/OWNER_QUEUE.md, "A design default is NOT a
          taste question").
       2. Join it to the catalog as it stands and produce a GAP TABLE: genre x graphic, what
          exists, what does not. Measure look with scripts/card-look-sweep.mjs, which reads
          rendered pixels; catalog-sameness.mjs cannot see this and has been wrong about it.
       3. Propose the cadence he asked for - a recurring drawing slot fed by the gap table - and
          say what it would produce per week.
CORE   Steps 1 and 2. Step 3 is a paragraph, not a build.
TRAPS  Do NOT draw templates in this row. The row's product is the survey and the gap table; a
       session that starts drawing has skipped the thing he asked for. Do not re-argue variety
       itself - that is settled and filed.
GATE   npm run build. No product code is expected to change.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/2026-09-xx-e-catalog-by-programme-type.md;
       3. run /queue-merge. Do not commit after queueing. Never merge into main yourself.
```

```
SESSION F - the defaults stop converging
BRANCH <tool>/f-default-palette-and-entrance
MODEL  opus high - a real design decision per design, with a measurement that has to hold
START  now; independent of session E
TOUCHES src/templates/ (per-design defaults), src/templates/search.ts, a catalog gate
MINTS  a first-page defaults-spread measurement
GOAL   Each design ships with a default palette and a default entrance chosen FOR THAT DESIGN, and
       the first page of Browse is measured so the thumbnails cannot all converge again.
WHY    Owner, 2026-09-03: "the default color and default animations for different graphics should
       be different so that we don't have the same colors on every thumbnail when you look through
       the graphics. You know that's also bad." This is a separate defect from designs being
       similar, and it is much cheaper to fix - two genuinely different designs both shipping the
       house amber and the same wipe read as a set on the only page where the catalog is judged.
READ   docs/backlog/catalog-variety-by-programme-type.md section 3; spreadFirstPage in
       src/templates/search.ts, which already spreads hue and family and is the model for this;
       NoaCG-Brand-Kit/BRAND-MANUAL.md for which palette rules are brand and which are habit.
DO     1. Decide the per-design defaults. Not a random spread - a default that suits the design,
          argued in one line per design in a table.
       2. Add the measurement: the first page's defaults must spread across palette AND entrance,
          and the gate fails when they converge. Follow the five catalog gates' pattern - they
          MEASURE the rendered graphic, because every source check passes a visibly broken one.
       3. Run npm run catalog:affected; anything shared means the whole catalog.
CORE   Steps 1 and 2.
TRAPS  The one amber on-air accent is a BRAND rule for the app, not a rule that every template
       must be amber - do not "fix" convergence by breaking the brand manual, and do not read the
       manual as licence to keep them all amber either. Changing a shipped design's default is a
       change to saved-document behaviour: check whether an existing project reads its own stored
       values before assuming nothing moves.
GATE   npm run build, then npm run catalog:affected and the gates it names, then push and read the
       CI run - check WHICH jobs ran.
QUEUE  Same three closing actions as session E.
```

```
SESSION G - a graphic behaves without a ready-made template for it
BRANCH <tool>/g-behaviour-without-templates
MODEL  fable high - the owner asked for this one by name: "put fable or just think and figure out
       a solution". It is the consequential architecture call of the behaviour road.
START  now; research and design only, no product code (P2 is in DESIGN)
TOUCHES docs/ (a design doc), docs/backlog/graphics-without-a-ready-made-template.md
MINTS  the design doc
GOAL   Answer what an author DESCRIBES, and in what vocabulary, so a graphic nobody anticipated
       gets the behaviour its show needs - without a ready-made template for it.
WHY    His counting argument, and it is correct: behaviours multiply with the number of states,
       the number of optional steps and the artwork they attach to, so a shelf of ready-made
       behaviours covers a fixed number of cells in a space with no bound. Everything that misses
       a cell becomes manual work - the "Who Wants to Be a Millionaire" lock-and-reveal is the
       case he named. Adding more cells does not answer it.
READ   docs/backlog/graphics-without-a-ready-made-template.md - his words and his three
       constraints; docs/STATE_MACHINE_SCHEMA.md; docs/BEHAVIOUR_AUTHORING_RESEARCH.md round 1 and
       its M1/M4 shortlist; docs/SVG_STATES_FROM_ARTWORK.md; src/templates/importedDesign/
       behaviour.ts and proposeSvgBehaviour in src/components/wizard/draft.ts.
DO     1. Write down the special cases FIRST, as what the operator does and what the graphic shows
          - the Millionaire lock/select/reveal plus a handful more. That set is what any general
          answer has to satisfy, and without it this row becomes philosophy.
       2. Judge composition against selection: whether a graphic assembles small behaviour parts
          rather than picking a whole behaviour off a list. Say which, and why, against the set.
       3. Publish the layer contract the importer already reads (the poll's "Bar 1", the quiz's
          "Answer A") as a document a designer can draw against. Today it exists only in code,
          which means designers are drawing for a contract nobody has written down.
CORE   Steps 1 and 3. Step 3 is worth doing even if step 2 concludes nothing.
TRAPS  Three constraints he set, and they bound the answer: NO AI anywhere in the import path -
       the drawn layers are the interface and detection reads structure, never intent; "no
       expression language, ever" still stands (P2 doctrine); and the quiz and scoreboard for the
       autumn are NOT blocked on this row and must not be folded into it.
GATE   npm run build. No product code in this row - P2 is DESIGN, and implementation needs
       evidence plus a ruling (docs/PROGRAMMES.md).
QUEUE  Same three closing actions as session E.
```

```
SESSION H - the agent looks at the graphic and judges it, so he does not have to
BRANCH <tool>/h-graphic-taste-self-review
MODEL  fable high - the axes are a taste instrument and getting them wrong makes the gate worse
       than nothing. This is the row the owner cares most about.
START  now; run it FIRST if capacity is short
TOUCHES docs/ (the review instrument), .agent-workflows/ or the verification contract that fires
        it, e2e/ or scripts/ for the rendered frame
MINTS  the taste-review instrument and whatever renders the frame it reads
GOAL   A session that changes what a graphic LOOKS like renders it, looks at it, and answers a
       small written instrument before it ships - so the owner stops being the thing that notices
       a caption sitting outside its box.
WHY    Owner, 2026-09-03, after a day of doing this by hand:

       > after today, I've been giving feedback for hours on how a text should be centered and
       > look good, and how text inside a box should live inside a box and not go outside of the
       > boundaries. How a text should not be weirdly aligned to the graphic.

       > I realized that I shouldn't need to say these things because if you just look at it
       > yourself, you would notice how it should look. I know that you can do it because if I
       > were to ask you to fix it, you would fix it.

       That diagnosis is exact and it is the whole row. The capability is not missing - the
       TRIGGER is. Nothing in the contract makes a session stop, render its own output and ask
       whether it looks right, so the first eye on the graphic is his. He asked for this
       instrument once already, on 2026-08-28 (docs/backlog/visual-taste-review.md), and it has
       been unstarted since; today is what that cost.
READ   docs/backlog/visual-taste-review.md - his 2026-08-28 wording, and its "do not grow it past
       very small" constraint; docs/TASTE_RUBRIC.md, which proves clarity and function and
       explicitly NOT visual quality; docs/DESIGN_LANGUAGE.md (binding taste + motion);
       docs/TEXT_BOX_BINDING.md for the text-in-its-box model that already landed;
       NoaCG-Brand-Kit/BRAND-MANUAL.md. The owner-taste invariants are the calibration set.
DO     1. Write the instrument. Very small, per his constraint: five axes read from a RENDERED
          frame - hierarchy, composition, restraint, coherence, on-air quality - each a question
          with a concrete failing example, not an adjective.
       2. Name the text criteria he spent today on, as CHECKABLE questions rather than feelings:
          is the text centred in the shape it belongs to, on both axes; does every glyph sit
          inside its box at the longest string the field accepts; is the text aligned to the
          graphic behind it rather than to the frame; does a growing box grow the way the design
          implies. Each has a right answer that does not need him.
       3. Wire the trigger. The instrument is worth nothing as a document nobody opens - decide
          where it FIRES (the verification contract, a gate, a step in the drawing workflow) and
          make that the deliverable. Reuse what renders frames today: the catalog gates read
          rendered pixels, scripts/card-look-sweep.mjs reads look, and the screenshot verb exists.
       4. Calibrate before declaring it done: run it against graphics he has already judged, and
          show it reaches HIS verdict on those. An instrument that passes what he rejected is not
          an instrument.
CORE   Steps 1, 2 and 3. Step 4 is what makes it trustworthy; do not skip it quietly.
TRAPS  "An agent says it looks fine" is not this row - the answer must be read off a rendered
       frame, because every source-level check passes a visibly broken graphic (the five catalog
       gates exist for exactly this reason). Do not grow it past very small; he said so when he
       asked for it, and a long rubric is one nobody runs. And do NOT file the axes' wording back
       to him as a ruling request - derive it from the taste docs and his past verdicts, and let
       him overrule something that exists.
GATE   npm run build; then run the instrument on a real graphic and show its output in the
       handoff, including at least one graphic it FAILS.
QUEUE  Same three closing actions as session E.
```

```
SESSION I - nothing at night waits on a phone that cannot answer
BRANCH <tool>/i-night-permissions
MODEL  opus high - a security boundary, decided once and lived with
START  now; this one gates whether tonight's wave finishes at all
TOUCHES .claude/settings.json, docs/AGENT_WORKFLOWS.md "Permissions"
MINTS  -
GOAL   A night wave never stops on a prompt, and nothing was made permissible that should not be.
WHY    MEASURED 2026-09-03, by the owner, and it settles an open question the queue has carried
       since 2026-08-30: **he cannot approve a permission prompt from his phone.** The permissions
       note assumed he could, and wrote the still-asks list on that assumption - git push, the job
       queue wrappers, anything spending money, anything deleting, browser clicking and typing.
       Every one of those is now a dead stop at night rather than a question, and a session that
       hits one sits until morning. His standing rule: a rule whose only justification is "ask me
       first" is a missing mechanism.
READ   docs/AGENT_WORKFLOWS.md "Permissions" - it states the reasoning for every entry, including
       why git push cannot be allowlisted as a prefix without also allowing a force-push to main;
       scripts/blocked-sessions.mjs, which detects a waiting session from the transcript.
DO     1. Go through the still-asks list one entry at a time and put each in one of three boxes:
          safe to allow outright; safe behind a NARROWER mechanism than a prompt (a wrapper that
          accepts only the safe form - "git push of the current branch to its own remote" is the
          worked example, since the danger is the argument suffix, not the verb); or genuinely
          must not happen unattended, in which case a night session must DETECT it in advance and
          route around it rather than discovering it mid-run.
       2. Build the narrow wrappers box 2 needs. A wrapper that can only express the safe form is
          a mechanism; an allowlist prefix is not, and that difference is the whole reason the
          list looks like it does today.
       3. Make blocked-sessions.mjs the loop's alarm rather than its diary: a session waiting at
          night is a defect that names the exact call it waited on, so the list shrinks by
          evidence over the next few nights.
CORE   Steps 1 and 2.
TRAPS  Do NOT answer this by turning on bypass mode - it trades one prompt for every prompt, and
       the previous session considered and rejected it for that reason. Money, deletion and
       anything published past main stay questions no matter how inconvenient; they are the
       entries a mechanism must route AROUND, not through.
GATE   npm run build; then show a session performing each newly-allowed action without a prompt,
       and show one still-refused action still refusing.
QUEUE  Same three closing actions as session E.
```

## Five agent items the same walk produced

Re-kinded from `walk-p` to `agent` on 2026-09-03 because each carries a claim about the product
that nobody has driven, not a question for the owner. Each names its own route and is settled by
an agent walking it and deleting the file with what it saw:

- the ticker kicker across Market Board, Index Strip, Market Decks and News Strip;
- the live-percentage checkbox and the round that overflows its board;
- the poll status field against a reworded or Finnish count line;
- the AI door's testing notice on `/app` and the agent callout on `/docs`;
- the one-prompt bootstrap, run cold in a fresh session.

## What none of this covers

The SVG import refinement he asked about in the same breath - *"ensure that the text is actually in
the correct spot and reacts correctly to the background"* - is already scoped in
`docs/TEXT_BOX_BINDING.md` and is not part of any row here.

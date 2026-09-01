# Keeping the work - and this system - coherent

## Big projects are phased, never one-shotted

Owner, 2026-08-28, for the big roads ahead (the editor, the desktop client, broadcast-scale
control): *"they can't be one-shotted… planned out step by step and implemented with care, one
thing at a time"* - and *"we are not in a hurry. Enterprise software takes years."* The rules:

- **The owner understands it BEFORE it is built.** A big project starts with a DESIGN PICTURE the
  owner can see - the actual screens, menus and flows that will exist, end to end - and he
  ratifies that picture once. *"If I do not 100% understand what we are building then the agent
  might not either."*
- **The agent says what it does not understand.** Uncertainty is stated, never smoothed over with
  confidence - a double-check question in the plan costs a sentence; a confidently wrong phase
  costs the phase. This is not approval-gating: once the picture is ratified, phases run WITHOUT
  per-step human checks.
- **Phases chain automatically.** Each phase is its own session-sized step with its own
  verification and definition of done; the next phase starts from the landed handoff plus a
  fresh-eyes check of what the previous phase built (`night.md`, continuations). The timeline
  lives in the project's plan doc, and the wave loop or the next plan triggers the next phase - a
  human appears at phase boundaries only when the plan names a decision that is genuinely his.
- **Work smart, keep the end game in mind.** A phase that serves the deadline but bends the
  ratified picture gets flagged, not silently shipped.
- **The record of which pictures are ratified is `docs/PROGRAMMES.md`** (the register, itself
  ratified 2026-09-01). A big project IS a programme: its ratification, state, entry conditions,
  scope edges and reopen triggers live there; the argument and the acceptance claims live in
  `docs/NORTH_STAR_2027.md`. Never mark a capability complete because its implementation exists -
  a claim advances only when its evidence rung is satisfied.

## The coherence cadence

**A growing project rots its own context, and rot reads as the agents getting dumber.** The model
does not degrade; the written surface does - stale docs teach wrong things, contracts drift apart,
the big picture smears across files until no session can hold it. The standing defences are
structural (the instruction-chain byte RATCHET that only tightens, handoffs consumed not
collected, backlog items that graduate or die, memory entries with exit conditions, and this
system's own 200-line gate) - but defences that only fire locally miss global drift. GOALS.md's
~200-line budget and its archive belong in that list only in INTENTION: nothing measures the
budget, so the file drifts over and is pulled back by hand whenever a coherence round happens to
look. It was 419 lines when `docs/backlog/goals-over-its-own-budget.md` was filed, 261 after the
2026-08-30 round cut it, and over budget in both readings. **Quote the measurement, never the
number** - a line count written into prose is stale within days, which this sentence proved by
carrying 419 into 2026-09-02.

So roughly **weekly, one wave carries a COHERENCE SESSION** - fresh context, no other task:

1. **The cold-read test, first and most important:** answer, from root `AGENTS.md` +
   `docs/GOALS.md` alone, what this product is, what the current push is, and what is deliberately
   parked. Every place the answer came out wrong or slow is a doc defect to fix. **Slow counts as
   wrong**: an internal doc earns its length by what a cold reader can act on, and the public-docs
   voice rule (`src/docs/AGENTS.md` "The voice") is the standard here too, one rule short of its
   em-dash gate. Contracts keep their reasoning density, because the reason is what stops the rule
   being re-litigated - but a paragraph that argues with itself, or a section nobody can summarise
   after reading it once, is the same defect as a stale claim and is fixed the same way.
2. Contradictions between contracts (nested AGENTS.md vs root, docs vs code) - fix or file.
3. Docs nothing references and references to nothing - delete or repair; git is the archive.
4. The byte ratchet: tighten `project_doc_max_bytes` where headroom allows. It only moves down.
5. GOALS drift: does ## NOW still match what waves actually built? Report the gap - the owner
   rules on direction.

Its output is small diffs plus a one-page verdict in its handoff. When no wave has carried one for
over a week, the next plan says so in section 4.

## Every wave improves this file

Each wave is also an experiment on the orchestration itself, and this system is where the results
accrue - the same failure must never fire twice. When a wave surfaces an orchestration lesson (a
collision class the plan missed, a report section that failed its reader, a rule that was
ambiguous under pressure), the orchestrator applies it under its own-contract carve-out, lands it
through the queue like everything else, and names the change in the report. **A wave that taught
nothing says so** - a lesson is found, never invented, exactly as work is. Product lessons are not
this: they go to the taste rubric via the owner's rulings, to `docs/backlog/`, or to a prompt. The
test for which is which: would the fix change what a SESSION builds, or how a WAVE is planned?
Only the second belongs here.

**And it improves by MOVING text, not by adding it.** The 2026-09-01 rebuild exists because the
old single file reached 924 lines by obeying the first half of this rule and having no second
half. Four mechanisms replace the growth:

1. **The lesson edits the module that owns the rule.** Level 1 (`orchestrator.md`) changes only
   for a rule that must be loaded on every invocation - and only against its 200-line gate, which
   fails the build, so the budget cannot be quietly exceeded the way GOALS.md's was.
2. **The EVIDENCE leaves the rule.** A rule keeps its why in one clause and cites
   `incidents.md` for the dated story that paid for it. Narrative justification inline was the
   single largest source of the old file's length, and it is the part a session almost never needs
   while planning - it is what you read when you are about to change the rule.
3. **A new rule names what it replaced or shrank.** Budget-neutral by default. If nothing could be
   cut, say so in the report; a system that only ever grows is the failure this rebuild fixed.
4. **The module set is checked, not trusted.** `npm run check:shared-instructions` fails on Level 1 over 200
   lines, on a module nothing links to, and on a link to a module that does not exist. Orphans and
   dead links are how a modular system rots into a single file with extra steps.

---
v: 1
source: handoff
raised: 2026-09-04
state: unstarted
asked: "--max-budget-usd and CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS are both still unset, and both were the owner's call"
---
# Two harness knobs nobody has set

**Filed:** 2026-09-04, rescued from a handoff that was swept while it still had open items. The
handoff's "what is left" list had five entries; three had already landed elsewhere, and these two
had not, so deleting the file would have taken them with it.

## Why

A night wave runs unattended, on the owner's own subscription, on a laptop that is RAM-bound. Both
of these are guards against a wave doing something expensive while nobody is watching, and neither
is switched on. The first is money; the second is the difference between a wave running and a wave
thrashing. They are cheap to set and there is no reason they are not set except that the handoff
naming them was consumed.

## What it would take

**`--max-budget-usd`.** A real money guard for an unattended night. It has never been passed on any
launch path. Deciding the number is the owner's - it is money - but everything up to that is ours:
what a typical wave actually costs (`npm run harness:usage` has the per-pool figures), what the cap
should be to stop a runaway without killing an ordinary night, and where in the launch path it
belongs so every row inherits it. Bring him one recommended number with the measurement behind it,
not an open question.

**`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`.** Defaults to 20. This laptop's ceiling is three or four
live sessions - the job queue already refuses a browser job below 4 GB free, and the machine sits
near 3.6 GB with four rows running. A default of 20 is not a limit, it is an absence of one. This
half does NOT need him: the machine's real ceiling is measurable, and a value derived from it is a
design default rather than a preference. Derive it, set it, write down the measurement.

## Evidence

`npm run harness:usage` for the spend picture. The RAM ceiling is in the root `AGENTS.md`
verification section (one browser-driving job per machine) and in `docs/JOB_RUNNER_PLAN.md`. The
laptop's live figure on 2026-09-04, with four rows running, was 3967 MB free before any browser job
started.

## What the same rescue found about the sweep itself

The handoff was deleted under a blanket "work that a later wave picked up and finished", which was
true of most of the batch and not of this file. `scripts/handoff-drain.mjs` exists for exactly this
and asks for a `spent:` line tracing every open item to where it now lives; the sweep that removed
twelve handoffs wrote one for none of them. **A handoff with a "what is left" section is not spent
until each of its entries has an address.** That is worth more than either knob.

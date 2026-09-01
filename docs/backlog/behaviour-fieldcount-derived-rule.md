# The behaviour `fieldCount`-is-derived rule is owed to the importedDesign contract

**Filed:** 2026-09-01. **Source:** the retired 2026-08-30 poll-live-update handoff (branch
claude/e-poll-live-update, landed) - captured before that handoff's deletion because the owed
rule was recorded nowhere else.

## Why

The rule that belongs in `src/templates/importedDesign/AGENTS.md`:

> **A behaviour's `fieldCount` is DERIVED from the fields it emits, never typed.** It reserves
> the behaviour's `fN` ids against a designer's colliding layer id; a stale number is a silent
> on-air collision, not a lint error.

`behaviour.ts` still declares `fieldCount: number` as a plain property a module can type by
hand. The poll's was caught at `4` while emitting five fields: the unreserved `f5` would have
let an Illustrator file carrying `id="f5"` keep it, the hidden holder shared the id, and
`getElementById` handed the runtime the designer's drawing - the token `live` painting on air.
**The scoreboard behaviour wanted for 2026-09-12 would be the third module**, and a hand-typed
literal there re-opens exactly that failure.

## What it would take

One line of prose in `src/templates/importedDesign/AGENTS.md` when its directory is free (it
was held by live sessions both times this was found); the stronger fix is making the interface
derive the number (`fields().length`) so the rule needs no prose at all.

## Evidence

The retired handoff (git history of `docs/handoffs/2026-08-30-e-poll-live-update.md`), which
records the caught drift and the fix-at-altitude (`pollBehaviourFields(0).length`) both
existing modules now use.

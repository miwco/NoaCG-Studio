# Carry the legality table through an OGraf package, so greying survives a round trip

**Filed:** 2026-08-30. **Source:** the control-panel research round
(`docs/CONTROL_PANEL_RESEARCH.md` §6 row 4, §4b).

## Why

Structural legality - a button greyed because the machine has no arrow from the current state - is
the clearest thing NoaCG has that nothing else in this market has. MXMZ has no state graph. Singular
has no state graph. **OGraf v1 has no way to express one**: nothing in the spec defines which
actions are valid in which state, so every `customActions` entry is a peer of every other and always
available.

That is fine and correct for a stranger's package - `src/control/ografContract.ts` already says so
out loud, and "every button is live, the runtime decides" is the honest degradation. What is not
fine is that **our own graphic loses it too.** Export a quiz or a poll as an OGraf package, import
it back, and the operator gets three always-enabled buttons for a machine that has the whole table
precomputed. We drop our best property at a boundary we control both sides of, for no reason except
that nobody has written the field.

`v_` is the spec's own extension door, explicitly ignorable by every other renderer, and we already
use it for section, destructive and adjust - the presentation facts with no standard carrier.
Legality is exactly the same category of fact.

## What it would take

- Emit the precomputed table `eventLegality(js)` already builds into the manifest's per-action
  `v_noacg` block (or one manifest-level `v_noacg.legality` map - one place beats N, since the table
  is event → group → states and is naturally whole).
- Read it in `ografContract.ts` **before** falling back to "every button live", so a NoaCG-authored
  package re-imported into NoaCG greys exactly as the original did.
- Keep the fallback loud rather than silent: a package with no legality block is a package whose
  buttons are all live, and the surfaces should say that once rather than pretend.
- The conformance spec (`e2e/ograf-contract.spec.ts`) gets one case: the same graphic exported and
  re-imported greys the same button in the same state, and a hand-written third-party manifest
  still renders with everything enabled.

Small - the table exists, the vendor block exists, the reader exists. Half a day plus the spec case.

**What this is not.** It is not a proposal to add legality to the standard. Legality is
state-dependent and OGraf carries no state, so a static manifest field could only ever describe the
graph, not the current position - which is the other half of the problem and belongs to
`docs/backlog/ograf-graphic-state-return.md`. These two land well together and each is useful alone:
this one restores the greying map, that one restores the position to apply it at.

## Evidence

`docs/CONTROL_PANEL_RESEARCH.md` §4b (the spec defines no legality), §4a (`customActions` carry no
precondition, no order, no grouping), §6 row 4.
`docs/CONTROL_LAYER.md` (the `v_noacg.kind` hint precedent; "OGraf has no state graph, so every
button is live"; `eventLegality`/`isEventLegal` as the one editor-side implementation).
`src/export/targets/ograf.ts` (`customActions()` already writes `v_noacg` for section, destructive
and adjust - this is one more key in the same object).

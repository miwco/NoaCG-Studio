---
kind: walk
date: 2026-09-01
---
# The next orchestration architecture - a recommendation waiting on your ruling

Date: 2026-09-01

**RATIFIED 2026-09-01, with corrections.** You ruled the same day: core architecture approved,
routing corrected (two Antigravity pools, Codex availability-routed, Opus also a major worker
pool, Fable judged over meaningful engagements). The revision and Phase 1 landed on the same
branch; `docs/ORCHESTRATION_NEXT.md` is the ratified version. Nothing left to rule on here -
this item stays only as the record of what was decided.

## What changed

You asked for an investigation of how the orchestration should evolve - which model runs the
persistent orchestrator, what can be automated underneath it, how the worker pools (Codex,
Antigravity, Claude, Fable) should share the load, and how verification keeps speed from creating
bugs. The investigation is done and the recommendation is written: `docs/ORCHESTRATION_NEXT.md`.

The short version:

- **The persistent orchestrator stays `opus high`.** Fable is used as a consultant - one bounded
  plan review before a big wave, the direction-turning wave rows, the hardest reviews - never as
  the resident. The reasoning and the evidence are in §1 of the doc.
- **Observation gets cheaper, authority does not move.** A single `wave-tick.mjs` script replaces
  the several commands each watch tick costs today; launching, holding and rulings stay with the
  master.
- **Codex is the bulk delegation channel now; Antigravity reads aggressively now and writes only
  after one graded head-to-head.** Both get small wrapper fixes first.
- **Verification layers by risk**, and a machine-readable review stamp eventually lets the landing
  path refuse an unreviewed branch the way it already refuses a red one.
- **A delegation outcome ledger** makes "which model is good at what" a measured number instead of
  an impression - grades today live in prose that gets swept.

## The route (about two minutes)

Open `docs/ORCHESTRATION_NEXT.md` and read §1 (the master verdict) and §7 (the three phases and
the evidence that gates them). Everything else is supporting detail.

## What to look at

Whether you ratify: (1) Opus as the persistent master with Fable as consultant, (2) starting
Phase 1 (the mechanism branch - tick script, wrapper fixes, allowlist entries, ledger), and
(3) running Phase 2 as the next night wave's shape. Nothing in the doc starts on its own.

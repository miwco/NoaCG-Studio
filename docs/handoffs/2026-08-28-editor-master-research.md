# Handoff - the editor master research round

**Date:** 2026-08-28 · **Branch:** `claude/angry-tereshkova-3a0628` · research and writing only

## What landed

| File | What |
|---|---|
| `docs/EDITOR_RESEARCH.md` | REWRITTEN as the master editor research/direction document the owner's brief defines: hands-on audit of our editor under the three-level test (§1), ten systems researched on actual workflows (§2), per-axis bars (§3), the major authoring problems (§4), borrow/refuse (§5), five directions compared (§6), the staged path examined (§7), safe-now vs needs-evidence vs must-not-harden (§8), and the owner's next-decisions list (§9) |
| `docs/backlog/editor-master-research-brief.md` | the owner's verbatim brief, committed (it was only sitting uncommitted in another worktree) |
| `docs/backlog/control-panel-road-v2-brief.md` | same - the landed `CONTROL_PANEL_ROAD.md` references it, so the dangling ref is closed |
| `docs/acceptance/owner-queue/2026-08-28-editor-master-research.md` | the walk item routing the owner to §9; the superseded one-page item is deleted |

## How the audit was done (and its limits)

Headless Chromium drove the dev build through the wizard's own create path (a stepped lower
third, then a quiz), then probed every editor surface: selection, Inspector keyframe diamonds
(stamped into code, undone), inline text, canvas drags, timeline scrub, the machine graph
(materialize-on-edit confirmed live), the event strip's structural greying (3 enabled / 2
disabled at Question, press moved the state), the Rehearse and Content panels. Probe scripts
were scratch files, deleted; screenshots live in the session scratchpad only. Limits stated in
the doc: headless is exactly the environment where the owner's blank stage does not reproduce,
and motion was judged by document state, not by eye.

Confirmed defects now filed in §1b: Space swallowed over the stage (measured differential),
run-never-reported-finished, the unreproduced blank stage, no align/distribute, no branch-phase
scrub, catalog typography reach.

## Coordination honoured

`docs/CONTROL_PANEL_ROAD.md` (rewritten the same day by a parallel session, landed first) owns
custom control apps, operator workflow and shared data; the master doc defers to it explicitly
(§4a, §4h) and was written against the landed version - the §2/§3 cross-references between the
two documents were checked both ways. CONTROL_PANEL_ROAD.md was not edited.

## What should happen next

1. **The owner walks the new queue item** - §9's seven decisions are the round's output; 1 and
   2 (the one-model-several-surfaces frame, the behaviour ladder) shape post-09-12 editor work.
2. **Nothing builds from the doc** until the owner rules; the 2026-09-12 production owns the
   calendar (the doc says so on its own first page).
3. If a future session touches the editor before the walk: §1b's defect list is safe,
   already-reported work (the Space key fix is small and owner-reported twice).

## Safe to archive?

Yes. The research is in the document with its sources; the audit's method is recorded above;
no state lives only in this chat. The ten research passes' full notes exist only in this
session - anything not distilled into the doc was judged not decision-bearing.

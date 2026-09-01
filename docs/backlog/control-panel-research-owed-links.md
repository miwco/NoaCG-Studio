# Cross-links owed to `docs/CONTROL_PANEL_RESEARCH.md`, and one imprecise OGraf line

**Filed:** 2026-09-01. **Source:** the retired 2026-08-30 control-panel-research handoff
(branch claude/x-control-panel-research, landed) - captured before that handoff's deletion
because both tidies were recorded nowhere else. Both were outside that branch's allowed touch
list, so they were recorded rather than done.

## Why

A reader arriving from the three natural sibling documents cannot find the capability-bar
comparison (`docs/CONTROL_PANEL_RESEARCH.md`: MXMZ vs Singular.Live vs OGraf v1 across the six
links from "here is my drawing" to "here is my control panel"), and one line in the OGraf
review misstates where `status` lives - small, but it is the review people cite.

## What it would take

- One pointer each in `docs/CONTROL_PANEL_ROAD.md` §1, `docs/COMPETITOR_MXMZ.md` §3, and
  `docs/GRAPHIC_BEHAVIOUR_PLAN.md`'s Related list, next time each file is open.
- In `docs/OGRAF_FIRST_REVIEW.md` §2, correct "status is poll-only - `GET /renderers/{id}`
  reports renderer and instance status": the `status` object lives on `RendererInfo` and is the
  RENDERER's; the instance listing (`RenderTargetInfo`) carries no status field. The section's
  conclusion (no durable or push graphic-state stream) holds and is, if anything, understated.

## Evidence

The retired handoff's "Two things a later session should tidy" (git history of
`docs/handoffs/2026-08-30-x-control-panel-research.md`); the EBU's published spec files for the
`RendererInfo` / `RenderTargetInfo` shapes.

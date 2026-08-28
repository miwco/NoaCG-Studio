# Handoff - the control-panel road v2 (2026-08-28)

## What this session did

Rewrote `docs/CONTROL_PANEL_ROAD.md` against the owner's verbatim rewrite brief
(`docs/backlog/control-panel-road-v2-brief.md`, 2026-08-28 - authored in another worktree, not
yet on main when this session ran; this rewrite quotes its substance so it stands alone). Docs
only - nothing implemented, per the brief's own constraint.

The order the brief demanded, followed: (1) inspected the existing architecture first
(CONTROL_LAYER, STATE_MACHINE_SCHEMA, GRAPHIC_TYPES, GRAPHIC_BEHAVIOUR_PLAN,
CONTROL_PANEL_PARITY, PLAYOUT_DASHBOARD, CLOUD_PLAYOUT, DATA_API, PRODUCTION_DATA_PLAN,
src/control/, src/audience/); (2) researched Ross XPression/DashBoard, Vizrt (Trio + Media
Sequencer), Singular.live, MXMZ and Flowics on the CONTROL axis only - capability/workflow
separation, rundown operation, shared data, multi-operator, recovery - sources in the doc;
`docs/EDITOR_RESEARCH.md` (same date) already owns the authoring axis and was not redone;
(3) rewrote the road to the brief's "Done when" list.

## The shape of the rewrite

- **Preserved and said so:** the generated-panel invariant (§2), the 2026-08-27 owner decisions -
  gated authored machines, the wizard behaviour step, the per-type stories verbatim (§8-§9), the
  cloud-editor park (§11).
- **New decisions:** §3 the production CONTROL PROFILE (capability vs workflow - additive
  presentation state on the Show, `Show.bindings` as the precedent; direction, not schedule);
  §4 the production operator story with six architectural commitments; §7 validation re-aimed at
  deterministic-recoverable-safe with the professional failure cases as a torture table (most
  already structurally answered - the table names where).
- **Pushback the brief asked for:** §5 keeps the owner's "no universal backend" ruling while
  naming the SHIPPED production data tree as the shared-truth mechanism (the brief's fear was
  already solved by PRODUCTION_DATA_PLAN Phases 1-2, so no new machinery is proposed);
  §4.5 automation/newsroom needs NO reserved architecture - the command log is already the
  integration point; §7 declines model-checking and CI fuzzing as ceremony ahead of demand.
- **§10 - assumptions that must not become invariants** (the brief's hardest ask): eight entries,
  each with its named successor, plus the contrast list of what deliberately IS invariant.
- The two closing tests appear verbatim in the header and again at the end.

## Housekeeping in the same commit

- Old-section cross-references updated in five docs (old §2→§9, §3→§9, §4→§8, §5→§11):
  AI_LITE_BRAND_PLAN, CONTROL_PANEL_PARITY, SVG_IMPORT_PLAN,
  backlog/playout-logic-for-all-common-graphics, handoffs/2026-08-28-v-coherence.
- `docs/acceptance/owner-queue/2026-08-28-control-panel-decisions-recorded.md` deleted (it routed
  to the old version); replaced by
  `docs/acceptance/owner-queue/2026-08-28-control-road-rewritten-to-your-brief.md`, routing the
  owner to §3, §4 and §10.

## What the next session should know

- **Nothing here authorizes a build.** The 2026-09-12 production owns the calendar. The first
  build this road expects is still the credits proving round (§8), now including the §7 torture
  pass in its step 4.
- **§3's profile returns to the owner only when something wants to build it** - the doc closes no
  open decision.
- The other worktree (h-github-storefront) holds the brief file uncommitted; if its branch never
  lands, the reference in the road's header dangles - harmless, but worth landing the brief.

## Verification

`npm run build` green (docs-only change plus five one-line reference edits; no code touched).
Queued for landing via /queue-merge.

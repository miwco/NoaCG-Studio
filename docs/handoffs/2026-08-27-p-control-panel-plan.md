# Handoff: the control-panel road is planned, three decisions wait on the owner

**Branch:** `claude/control-panel-road-plan-19fa3d` (the worktree's own branch; the session brief
named `claude/p-control-panel-plan` - same work, one name). **Landed:** `aa85b3dc` (plus this
handoff). **Gate:** `npm run build` green on a docs-only tree; CI read on the pushed sha.

## What is true now

`docs/CONTROL_PANEL_ROAD.md` is a decision-ready plan and builds nothing. One recommendation per
section, alternatives one line each:

- **§1 The default follows the graphic.** Panels stay generated from the graphic's own contract;
  "customizing a panel" is defined as editing the graphic (machine + `machine.controls`), never
  authoring panel markup. Per-graphic panel HTML, a panel layout editor and category-keyed panels
  are each rejected in a line.
- **§2 The CLI road.** Type-first ("behaviour comes from a type" becomes a skill rule; the sane
  default with nothing stated is no machine at all), and agent-authored machines as a blessed,
  gated fallback - reconciled explicitly with the 2026-08-08 "AI never authors machines" rule:
  that rule binds NoaCG's own generation paths (Lite/Pro) absolutely; the agent door is the
  user's own agent writing code under the full gate. Three blessing conditions: validate passes,
  `noacg inspect` output shown to the user as the panel review, every operator arrow walked in
  the bench (named as the one real validation gap).
- **§3 The wizard's behaviour step.** Offer-by-predicate (each behaviour declares the artwork
  shape it needs, the `missingParts` pattern), default to no behaviour, never interrogate, and a
  "Something else" row that points at the node editor and the agent door and records the ask
  through `src/feedback/`.
- **§4 Playout intent.** Per-type intent is a short OPERATOR STORY (prose, not a DSL - two
  examples is too few to freeze a schema), proven by driving the generated panel through the
  story in cloud, dashboard AND offline export. End credits = paste a list is the exemplar; the
  panel and data entry come from the graphic itself - the owner rules out one backend for all.
  The five-step proving round a session runs is sketched; credits first.
- **§5 Non-goals.** The cloud editor is parked in one tracked paragraph; nothing in the doc
  authorizes building.

Also: the owner-queue item `docs/acceptance/owner-queue/2026-08-27-control-panel-road-plan.md`
(the three decisions with a route), and a pointer line in
`docs/backlog/playout-logic-for-all-common-graphics.md` at the proving-round shape.

## The one thing that needs the owner

Read the plan's last section first - three decisions: bless agent-authored machines under the
three conditions or keep type-only; confirm the wizard step's shape; confirm operator-story
proving with credits as the first type. The `/walk` queue carries it.

## What a next session might do here

Nothing until the owner answers. After that, each answer starts its own session with the doc as
the brief: the skill-text change (§2) is small and self-contained; the wizard step (§3) waits for
a second behaviour to exist; the first proving round (§4) should coordinate with the
credits/tickers/roll branch (`claude/c-credits-tickers-roll-602e6b`), which was in flight in
another worktree when this was written.

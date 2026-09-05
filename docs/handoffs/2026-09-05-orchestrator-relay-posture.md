# The relay channel and the worker posture (change 2 of the orchestrator review)

Branch `claude/orchestrator-relay-posture`, off `2953f590` (change 1's landing). Second of the four
changes in `docs/ORCHESTRATOR_SIMPLIFICATION.md` section 5.

## What landed

**The relay.** `scripts/relay.mjs` (with `relay.test.mjs`) is the durable inbox the relay rule never
had. A stray report that reaches the orchestrator instead of the row it was for is written to
`<git-common-dir>/noacg-jobs/relay/<branch>.md` marked `UNREAD` (`relay write`); the branch's QUEUE
step reads it (`relay read`, which flips the marker); and `jobs.mjs add-merge` refuses to pin a
branch whose relay is still unread. Reading is the acknowledgement and the only way past the gate,
so a review can no longer be lost between the orchestrator and the row - the 2026-09-04 failure
where row K queued without its own reviews and row J landed without its Codex review.

- `queue-merge.md` section 1 now leads with "read your relay first".
- `launch.md` names `relay write` as the channel; `incidents.md` carries "the relay that had no
  channel" as the evidence.
- Read and write commands are allowlisted, so an unattended wave never waits on a permission prompt.

**The worker posture.** `.claude/agents/wave-row.md` (the base every rung inherits) now tells a row
to own its unit end to end, decide design defaults itself, CONSULT a blocking subagent (a Fable one
for design or architecture) rather than send a technical question to the owner, and delegate a
specifiable build to Codex through `rescue`, verifying by re-deriving. The blocking-vs-background
distinction is stated because a background subagent's result routes to the launcher, not the row -
the same fact the relay exists to work around.

## What is left

- **Change 3 - the planner as a subagent and the thin common path.** Move the plan-only modules off
  the every-plan common path (which is at 640/640), add the headroom ratchet and staleness gate to
  `check-shared-instructions`, and advance owner receipts when a branch lands. This is the one that
  buys real context headroom, and it is the most delicate because the common path is at its ceiling.
- **Change 4 - structured frontier fields** (`serves`, `size`, `touches`, `covered-by`,
  `needs-owner`) on backlog and handoff items, so the candidate list and the collision check become
  script output the model confirms rather than prose it derives.

The short-brief prompt format the review discusses is deliberately NOT in this change: the review
frames it as an owner-run A/B (half the rows short, half long) and the prompt rules are heavily
pinned, so it is a measured experiment, not a unilateral rewrite. The posture that a short brief
relies on now lives in the agent definition, which is the half that can land safely.

## Verification

- `node --test` over relay, jobs-store, wave-tick, auto-merge: 167 pass.
- `npx eslint` over the changed scripts: clean.
- `node scripts/check-shared-instructions.mjs`: OK, common path 640/640, markers intact.
- Live: `relay write` then `add-merge` refuses; after `relay read`, `pending` clears. A branch with
  no relay is never blocked.
- `npm run build`: see the commit's CI run, read job by job.

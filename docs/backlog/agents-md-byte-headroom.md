---
source: owner
raised: 2026-09-01
state: unstarted
asked: "give the AGENTS.md byte budget real headroom - asked for by name; for the next few months the owner is the authority on what gets condensed or removed from any AGENTS.md: propose the cuts, he rules"
---
# Give the AGENTS.md instruction chains real headroom, then make the warning fail loudly

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row F, never launched).
**Source:** owner ask by name, 2026-09-01. **Lands ALONE, or as a wave's designated last landing** -
it tightens a gate every branch meets.

## Why

`npm run check:shared-instructions` prints the tightest Codex instruction chains against
`project_doc_max_bytes` and marks any past 80%. On 2026-09-01 seventeen chains printed that
warning, which is why nobody reads it, and it has already red-gated one branch: two siblings each
added a few hundred bytes to contracts on one chain, and the one that integrated second wore a
failure that was not its own. Headroom is bought by MOVING content off a shared ancestor into the
one nested contract whose files it describes (`docs/AGENT_WORKFLOWS.md`, "Instruction size"); a
sentence a session never needed stops loading for every sibling.

## What it would take

1. Re-measure first: run the check and quote its own numbers - never a figure from a plan.
2. Buy headroom by moving root and shared sections into the nested contracts where they fire.
   No taste ruling is needed for a move.
3. Propose deletions, do not take them: one owner-queue item listing each proposed cut and what
   is lost. The owner rules (his 2026-09-01 ruling above).
4. Only once the bought headroom is comfortable, make the warning fail at 99%. Failing the check
   before the headroom exists red-gates every branch in flight, which is the failure this row
   exists to prevent.

## Evidence

The check's own report is the measurement; on 2026-09-02 the tightest chains were the
`src/templates/*` category contracts at 84-86% of the budget, because every category loads the
67 KB `src/templates/AGENTS.md`. Memory `next-wave-candidate-rows` row 1 carried this ask until
this receipt replaced it.

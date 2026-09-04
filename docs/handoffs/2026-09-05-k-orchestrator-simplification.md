# K - a smaller orchestrator control plane

Branch `claude/k-orchestrator-simplification`, two commits off `7082f007` plus this handoff. The
proposal is `docs/ORCHESTRATOR_SIMPLIFICATION.md`; the contract was not touched.

## The recommendation, in ten lines

1. The instructions are not the weight. The master read 100 KB of contract, about a tenth of its
   420 K-token context; the modular split saved 11% because a night wave loads ten of twelve files.
2. The watch loop is the weight: 72 M of the master's 93 M tokens, 218 requests at about 320 K
   context each, 3.5 times what planning cost. The master was about 11% of the night's tokens.
3. Two of the five recorded failures were one misread: rows A and C were woken by their own
   background tasks within one to eight minutes; the "forty minutes each" never happened, yet it
   was written into five places, and row F's Stop-hook widening was designed against it.
4. Workers already own their implementation: C, B, H and F overrode a wrong premise correctly,
   none overrode wrongly, and the DO line that mattered was always "reproduce or measure first".
5. Keep centrally: choosing and refusing work, collisions and slots, routing, launching on
   triggers, the replan, and the measure-before-minting filter that dropped A's theoretical bug.
6. Push to workers: the implementation route, the shape choice, the delegation brief, the
   re-verification after integration. A prompt shrinks from about 3,600 bytes to about 1,700.
7. Fable versus Opus as planner is unmeasured and tonight's planning errors were information
   errors, not reasoning errors; a Fable review row is the cheaper way to buy that judgement.
8. The split the numbers support is planner session then a fresh watcher session, started from
   the wave-state file, never both live; the plan stays a hypothesis the watcher may overturn.
9. Tomorrow's one-variable A/B: same everything, but the planner ends after the plan check and the
   owner starts one fresh watcher with the pasted prompt in section 8. Success is under 20 M
   master tokens with no relay or trigger lost.
10. Delete or disclose later, each with its refuting evidence: the `/remote-control` prompt line,
    the QUEUE boilerplate, continuations and rewind mechanics off the live path, incidents off
    the always-read path. The 44 pinned sentences in `check-shared-instructions.mjs` make every
    cut a paired gate edit.

## For the morning

- **Row F's Stop-hook widening needs a second look**, not a revert: the transcripts show the
  wait it now refuses was woken by a live background task both times. F's own backlog item says
  to measure the miss rate first; add the other half, waits a background task did wake.
- The loop saw F, L, C and B land 45 to 65 minutes late, so J started 56 minutes after its
  trigger. A watcher that ticks on `landed.jsonl` changes is the second-largest saving on offer.
- `docs/README.md` gained one index row (the docs-index gate requires it); that is the only file
  outside `TOUCHES`.

## The check chain

- `review: inline` - the code-review skill forked and returned a promise to wait for its finders,
  not findings, so by `check.md`'s four-branch rule the leg was done here: every figure in the
  document re-derived against the transcript usage fields, the job store and `landed.jsonl`.
  Nine corrections, all in the second commit.
- `simplify: inline` - the skill returned fan-out instructions; the four angles were covered here
  over a prose diff, one change (a metaphor replaced by the mechanism's name).
- `verify: inline` - `npm run build` green over the final text, branch-stamped
  `claude/k-orchestrator-simplification`. Docs only, so no e2e is owed.
- `taste: not applicable` - nothing here can move what a graphic looks like.
- CI on `f1f2722f`: run 33927393501, green, planned `mode: none` - Build, Factory gates, E2E plan
  and CI gate ran, every shard skipped, which is the legitimate docs-only case. The second commit
  and this handoff are prose; their runs plan the same way.
- Verdict stamp: `<git-common-dir>/noacg-jobs/checks/claude-k-orchestrator-simplification.json`,
  `reviewedSha` is the second commit; this handoff is the only commit after it.

## Evidence that exists in no repo file

- The orchestrator's transcript is `~/.claude/projects/C--claude-NoaCG-Studio--claude-worktrees-
  ram-usage-investigation-de91e5/016fb452-7a9a-4219-a77a-f40b7638114c.jsonl`; the rows' are
  under its `subagents/` directory. The usage fields there are what every token figure came from.
- A worktree-isolated agent's Bash tool refuses a `node -e` that names a `.git` path and any
  `git` inside a loop; the scanners were `.mjs` files in the scratchpad run by absolute path.

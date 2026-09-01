# Session G - the day's harness and workflow rulings, written down

**Branch:** `claude/g-harness-policy` (queued for landing)
**Date:** 2026-08-30
**Shape:** documentation and contract files only. No product code. One comment block in
`scripts/agy-run.mjs`.

## What this branch did

Six owner decisions taken on 2026-08-30 stopped living in chat logs.

**`docs/HARNESS_ROUTING.md`** got one appended entry, "Model choice on the two delegate harnesses":

- **Antigravity: `gemini-3.7-flash-high` is the default.** Head-to-head with `gemini-3.1-pro-high`
  on one three-part cross-file question, ground truth established by hand first. Both 3/3; Flash was
  3.3x faster (17.6 s vs 57.3 s) and volunteered line ranges, token values and the regex where Pro
  gave the shape only. Recorded honestly as one sample - nothing shows Pro better at anything, only
  slower.
- **Codex: there is no model choice.** Ten model ids probed, all rejected with `not supported when
  using Codex with a ChatGPT account`. `gpt-5.6-sol` is what works, so effort is the only knob.
  **Owner ruling: high is the norm, medium is the floor, low only for mechanical retrieval.** The
  machine config had been `low`, which means three commits that landed through this channel today
  ran at the bottom rung; the owner set it to `medium`.
- **The absolute-path rule at full strength.** A prompt without absolute paths is reading an UNKNOWN
  checkout, every time - it reproduced again in this round's test.
- **The write grant works**, as a directory path with a trailing slash, and confinement was measured
  in both directions. The routing table's "Antigravity cannot write" row is corrected: it can; its
  diff quality is simply still ungraded.
- **The harness-verification test** is recorded as a standing check: ask a harness, with no project
  context in the prompt, what the product is / what the push is / what is parked. Both passed. A
  bare model call cannot.

**`.agent-workflows/walk.md`, `docs/acceptance/OWNER_QUEUE.md`, `AGENTS.md`, `.agent-workflows/orchestrator.md`:**

- **Nothing in the owner queue expires** (owner: he will get to all of them, 39 open at the time).
  The 7-day rule lived in four places and is gone from all four, with the reason it existed written
  where it used to be so a re-enabler knows what they are turning back on.
- **The owner queue never gates work either** (owner, same evening: *"nothing should block stuff"*).
  This reverses section 2's old throttle. Depth is still reported. Together the two rulings make the
  queue a list rather than a dependency: it neither blocks nor evaporates.
- **`/check` is permanent for night sessions**, trial framing and end date dropped. It earned it -
  nine real issues on one branch in a day.
- **Delegation:** most mechanical work goes to Codex at high effort, verified by re-derivation.
  Codex sat at 2% of its weekly window, so the capacity is bought and unused.
- **A backlog item filed by a live session is not free work** - check who filed it and whether they
  still hold the file before making it a row; and when two sessions do collide, the planner rules
  which version wins rather than leaving it to whoever merges second.

**`docs/acceptance/owner-queue/2026-08-30-b-antigravity-write-rule.md` deleted** - it asked the owner
to fix the Antigravity write grant, which he had already done and which was verified. Logged in the
Dropped list as done rather than presumed, per the rule this same branch wrote.

## Verification

- `npm run build` green on the final commit, branch stamp confirmed
  (`dist/version.json -> claude/g-harness-policy@fd94c6093b`).
- CI run 33313465106 was launched on commit `b364769b`; two further commits followed, so **read the
  run for the final sha, not that one**.
- No e2e: the branch changes no product code.
- `/check`: **review ran (mode `delegated`) and found ten issues; eight were fixed on this branch.**
  Simplify and the workflow's own verify phase were **not run** - the coordinator cut the session
  short because four finished branches were stacked behind this one in the merge queue. Prose-only
  diff, so the skipped legs are low risk, but this check did not fully pass and says so.

## Leftovers - real, none urgent

1. **The reasoning-effort floor has no in-repo mechanism.** The owner's "high for real work" ruling
   lives in `~/.codex/config.toml` on one laptop plus prose in `docs/HARNESS_ROUTING.md`, which
   nothing auto-loads. `scripts/codex-rescue.mjs` forwards `--effort` only when passed and injects
   no default, and `.claude/commands/rescue.md` names no norm. A session that reads `AGENTS.md` and
   runs `/rescue` still delegates at whatever the machine happens to say - the exact failure the new
   section documents. **This is a missing mechanism, not a rule:** the fix is a default in
   `codex-rescue.mjs` (or a line in the rescue adapter), and it needs the branch that owns that file.
2. **`docs/HARNESS_ROUTING.md` is referenced from nowhere that auto-loads.** `AGENTS.md` never
   mentions it. Everything in it is advisory until something points at it.
3. **`/rescue` still advertises `--model`**, a knob the same document now says has nothing to point
   at. Harmless, but it invites a wasted call.
4. **File overlap to be aware of:** this branch edits three lines of `AGENTS.md` rule 7. Sessions
   `a-coherence-round` and `ae-autonomous-cleanup` also hold `AGENTS.md`. Distinct hunks, but this
   is exactly the collision class the new orchestrator rule is about - if the merge is not clean,
   the ruling is that this branch's change is a single self-contained sentence and is the easy side
   to re-apply.

## Is this chat safe to archive

Yes, once the branch lands. Everything decided here is in the repo; nothing is held only in the
conversation.

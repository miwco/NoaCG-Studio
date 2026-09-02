# 2026-09-02 - the orchestrator reviewed with fresh eyes, and four mechanisms

Branch `claude/orcestrato-design-review-c599d6`, off `main` at `e1f3d37d`. The verdict, the
comparison and the evaluation are in `docs/ORCHESTRATION_REVIEW.md`; the owner-queue item is
`docs/acceptance/owner-queue/2026-09-02-orchestrator-review.md`. This file is the delta only.

## What is left, and why

1. **The first real wave on the rewritten contract is the test that matters.** The evaluation ran
   read-only dry runs; a live night wave is what shows whether `wave-plan-check` refuses the right
   plans, whether the receipts line changes what the planner starts, and whether the Stop hook
   fires on a real wait. Why: sixteen dry runs are evidence, not the night.
2. **Two design choices deliberately left as heuristics**, flagged by the review of this branch
   and not changed: owner provenance in `docs/backlog/` is inferred from prose tells (the deeper
   form is front matter on every backlog file, owner or not, a 60-file convention change); the
   plan check decides which `TOUCHES` entries are paths by shape (the deeper form is backticked
   paths only). Both are one-line rules in `docs/backlog/README.md` and the core if wanted. Why:
   each would widen the change past a review pass, and each fails visibly rather than silently.
3. **A dead-man tick for the watch loop** - a per-machine scheduled task running `wave-tick.mjs`
   every half hour while a fresh wave plan exists, observation only. The loop has died in both
   observed nights. Why: the wave lands anyway, but the event log goes dark for hours. Owner
   installs scheduled tasks; the review names the shape.
4. **A `diagnose` workflow** beside `check` and `so`, whose definition of done is one command that
   goes red on the bug. Recommendation only; `prompts.md` keeps "reproduce before fixing".
5. **The 700-line eval assertion and three non-discriminating ones** should be rewritten before
   the evaluation is re-run; the scenarios and grades are in the session scratch workspace
   (`orchestrator-workspace/iteration-1`), not in the repo.

## New evidence and traps that exist in no repo file

- Running the old contract from a worktree while its files were being committed made every
  dry run report a tree moving under it - the exact hazard the home worktree exists to remove.
  Any future dry run of the contract must run the home script or hold the tree still.
- The foreground-wait guard refused a bounded `for` loop beside a queue read during the
  evaluation; the matcher now tracks the loop instead of pattern-matching its head, pinned in
  `scripts/command-match.test.mjs`. Phase A of the review had judged that warning settled; it was
  not, and the review says so.
- Python is not installed on this laptop, so the skill-creator's aggregation and viewer scripts
  cannot run; a node script in the scratch workspace builds the same benchmark schema.
- The Bash guard hook scans a heredoc's CONTENT for `git ... commit` and the AI-mention words, so
  a script or a document written through a Bash heredoc that mentions a commit and a harness name
  is refused; write such content with the file tools and keep Bash for the command.

## Owner action

None beyond the walk item. The receipt `git-push-allow-hook` is parked on the owner starting it
himself; the review's dead-man tick is an owner-installed task if he wants it.

## Pointers

- Commits: `48ded6c2` (the review, the mechanisms, the receipts), `46d131f5` (the evaluation
  and the guard fix), plus the check-pass commit that follows this file.
- Check stamp: `<git-common-dir>/noacg-jobs/checks/claude-orcestrato-design-review-c599d6.json`.
- CI: run 33613154115 on `48ded6c2` was green with all nine E2E shards, Build, Factory gates and
  the CI gate run (read from `gh run view --json jobs`); the final push's run is named in the
  session's last message.

## `/check`

- `review: inline` - the code-review skill returned fan-out instructions; its eight angles were
  covered through read-only finder agents in this session and verified here. Ten findings
  reported: nine fixed (two planning rules moved back to every-plan modules, the poll matcher
  regression, the quoted-hash truncation, the prompt-block heading close, the wait pattern's
  missing anchor, the plan shape stated in the contract, `none` as a minted slot, byte-order-mark
  tolerance), one skipped with its reason above.
- `simplify: inline` - the simplify skill returned fan-out instructions; the four angles were
  covered by the same review pass. Applied: one front-matter parser shared with the gate, the
  newest-plan finder shared with the tick, one day-math helper, one pool-splitting helper, the
  duplicate test list dropped, the gate's doubled file read removed, the SessionStart listing
  capped. Skipped: the two heuristics above, and a structural STATUS line in place of the wait
  patterns.
- `verify: inline` - `npm run build` green on the final sha (the branch stamp read, not assumed);
  the changed scripts' tests, `eslint` on the changed files, and the plan check smoke-tested against
  three real evaluation plans after the parser changes.

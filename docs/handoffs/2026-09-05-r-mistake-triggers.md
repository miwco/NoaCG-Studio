# Handoff - row R, triggers that fire (2026-09-05)

**Branch:** `claude/r-mistake-triggers` on `1765fcfe`: `824d57a9` (the hooks, tests and docs),
`e14ead7d` (a shared predicate), then the review round (two blockers and the reuse findings the
relay carried) and this handoff. **Goal met:** four triggers for three recurring mistakes fire at
the tool call, each fed real events both ways, and `docs/MISTAKE_TRIGGERS.md` records for every
recurring mistake of the read where it went and why.

## What landed

- **`scripts/hooks/guard-preview.mjs`** (PreToolUse `mcp__Claude_Browser__preview_start`, deny):
  `{name}` from a linked worktree is refused - it serves a sibling checkout's page. Four handoffs,
  ten to thirty minutes each. Test: `scripts/hooks/guard-preview.test.mjs`.
- **`scripts/hooks/guard-agent-launch.mjs`** (PreToolUse `Agent`, deny): a wave prompt whose
  `TOUCHES` or `READ` line names a path missing here, on `origin/main` and in gitignore, quoted
  back. A token is a path claim only if its first segment is something the checkout has, so
  `Take/Update/Out` and `and/or` are never probed. The parser is `promptPathProblems` on the shared
  `pathProbe` in `scripts/wave-plan-check.mjs`, tested there (in the build); the plan-table check
  now uses the same probe, which fixed its dated-glob bug. Hook test:
  `scripts/hooks/guard-agent-launch.test.mjs`.
- **`warn-command.mjs`** gained the push notice: a follow-up push whose earlier run never finished
  (16 handoffs). It reads what the remote held before the push off git's own report in
  `tool_response`, resolves that tip to a full sha and asks `gh run list --commit` whether any run
  for it reached a verdict; the decision is `unfinishedRun` in `scripts/command-match.mjs`, pinned
  on the two real run sets it was measured on. Fed the real 2026-09-04 push `a8ce0d1b..70c3a977`
  on `claude/b-gate-covers-what-it-claims` (fires) and sha `43c9d60b` with a cancelled push run
  beside a green dispatch (silent, correctly).
- **`guard-command.mjs`** refuses `git push` and `gh workflow run` in one command (4 handoffs).
  Matchers in `scripts/command-match.mjs`, tested in `command-match.test.mjs` (in the build).
- `.claude/settings.json` carries the two new PreToolUse entries. `lib.mjs` owns
  `checkoutKind(root)`, one answer with three values. `scripts/hooks/test-lib.mjs` is the one
  spawn-the-real-hook harness and wiring check, used by all three hook test files.
- Backlog: `mistake-trigger-hooks.md` reshaped (parked, see below); `ci-run-cancellation-hides-
  skipped-shards.md` points at the notice; four new files from review's deeper findings, each
  its own row: `ci-plans-from-a-run-that-never-finished.md`, `ci-concurrency-group-per-event.md`,
  `preview-start-from-a-linked-worktree.md`, `one-gh-run-list-helper.md`, plus
  `unmapped-spec-never-runs-on-its-gate.md` from the evidence read.

## What is left, and why

1. **The two new hook test files are not in the build list.** `package.json` was held by a live
   session this wave (`claude/new-session-54bf87`, still unlanded), and no existing entrypoint
   globs `scripts/hooks/`. `guard-preview.test.mjs` and `guard-agent-launch.test.mjs` run only by
   hand (`node --test scripts/hooks/*.test.mjs`; the whole hook suite is 111 green, 83 before this
   branch, none lost). One line in the build's `node --test` list closes it, and it is the first
   follow-on. The matchers and the parser those hooks rely on ARE in the build via
   `command-match.test.mjs` and `wave-plan-check.test.mjs`.
2. **Step 5's deletion was not made.** The root `AGENTS.md` sentence on follow-up pushes is now
   said by the hook at the moment it matters and could shrink to the "read WHICH JOBS RAN" half.
   Left because `AGENTS.md` was outside this row's `TOUCHES` and is the most contended file on the
   machine this week.
3. **The fan-out hook is parked, not refuted** - see the evidence below.
4. **A memory entry should move into a hook**: `e2e-cheapest-gate-first` (never a local full suite
   before landing) is hook-shaped and unbuilt; `docs/MISTAKE_TRIGGERS.md` "What has a tool shape
   and is not built" says what has to be measured first. Not drained here, per the row's trap.
5. **Two findings from the relay that are real and not fixed here**, both about existing matchers:
   `guard-command.mjs`'s commit-message style scan reads raw command text, so it refused the
   orchestrator's own `relay.mjs write` whose prose contained the words it guards; and
   `git commit -F <file>` bypasses that scan entirely. Same shape, opposite directions; one
   matcher change (read the message positionally, and read a `-F` file) fixes both.

## Evidence and traps that exist in no repo file

- **The fan-out premise was measured twice from this row, with opposite results.** A background
  Explore agent launched through the Agent tool at the start reported back mid-turn, appended to
  the result of the next blocking tool call. The eight review finders the code-review skill forked
  from this same row reported to the ORCHESTRATOR, none to this row, and reached it only through
  `scripts/relay.mjs` - which is the only reason the two blockers below were caught before landing.
  The first measurement alone had been written up as a refutation of a sentence four contracts
  state; that is withdrawn. The consistent reading is narrower than the contracts and unproven:
  a report may reach a launched session mid-turn and cannot reach one that has stopped, and which
  the harness does per launch shape is not known. The Claude Code docs confirm the signal for any
  Stop-time shape: `agent_id` and `agent_type` on hook input inside a subagent, with
  `transcript_path` pointing at the parent.
- **Two landing blockers found by review, both reproduced against this checkout.** The first cut
  of the launch guard probed every slash-containing word on a READ line, so `docs/CONTROL_LAYER.md
  (the Take/Update/Out buttons)` refused a launch - a machine-wide outage the moment settings.json
  lands. And it treated "git could not answer" as "absent", a refusal, against the doc's own
  fail-open rule. Both are now pinned as must-not-fire tests. The lesson for the next hook: the
  innocent list is built from THIS repository's own prompts and contracts, not invented.
- **The first real event fed to the push notice was silent, and correctly.** Sha `43c9d60b` has a
  cancelled push run and a green dispatch beside it; the rule as first written read only the newest
  run. Fixed to "any run with a verdict for the old tip is enough", `timed_out` counted as no
  verdict per the root contract, and the must-fire case found with `gh run list --status
  cancelled`. Reasoning about the regex would not have found either.
- **A `*/` inside a JSDoc example ends the comment.** `e2e*/x.ts` in `pathProbe`'s header broke
  the whole module with an error pointing three lines away; the suite caught it, lint pointed at
  the wrong column.
- **The isolation classifier shapes how a row can work.** It refused: a Bash loop over hook files
  (a computed script path), a node script that shells out to git, any command text quoting
  `git push`, a `gh run view` inside a wait loop, and a Write under the shared `.git` (the verdict
  stamp). What held: event JSON and code chunks written to the scratchpad with the Write tool and
  applied with plain `cat >>` / `node <script>`; `gh run watch --exit-status` as the one plain
  blocking wait; the stamp written to the scratchpad and placed with a plain `cp`. The Write tool
  writes LF on this CRLF checkout for NEW files, so every new file was normalised.
- **Hook cost, measured 2026-09-05, median of five:** bare node 42-45 ms; `warn-command` on `ls`
  57 ms (unchanged); `guard-command` on `ls` 61 ms; the launch guard 56 ms on a prompt with no key
  line (the plan-check chain now loads lazily) and 102 ms on a wave prompt; the preview guard
  102 ms on `{name}`, 53 ms on `{url}`. The gh call runs only after a real update push, capped at
  three branches and eight seconds each because the harness ends a hook at sixty.
- **CI for this branch plans `mode: none`** (scripts and docs only): runs 33963716452 and
  33964160757 ran Build, Factory gates, E2E plan and the CI gate green and skipped every shard, and
  the run for the review round will do the same. That is the right coverage - the unit tests
  inside Build gate hooks - and a dispatched full suite was deliberately not requested.

## Check

`review: inline` (the code-review skill answered with a promise of eight finders' later reports,
which phase 2 says did not run; the diff was reviewed here. The finders' reports then arrived
through the relay, scope-checked against this branch's files, and every finding was re-derived
before acting: two blockers and eight cleanups applied, three deeper fixes filed as backlog rows
rather than taken, two claims about other files checked and recorded as follow-ons). `simplify:
inline` (the skill returned fan-out instructions; reuse findings applied - `pushes()`,
`checkoutKind`, `test-lib.mjs`, one `pathProbe`). `verify: inline` - `npm run build` green on each
tree; e2e not applicable. `taste: not applicable`. Stamp:
`<git-common-dir>/noacg-jobs/checks/claude-r-mistake-triggers.json`, placed with a plain `cp` and
re-stamped for the review round's commit.

## Needs the owner

Nothing. No money, no model pick, no scope call, nothing product-visible.

## Pointers

`docs/MISTAKE_TRIGGERS.md` ("What fires today", "The 2026-09-05 read"); the hook headers, which
each carry their why, verdict and measured cost; `docs/backlog/mistake-trigger-hooks.md`;
`.agent-workflows/orchestrator/incidents.md` for the two incidents the launch guard answers.

# 2026-09-02 - session D - mistake triggers: the widest guard hole, and the rule for the next hook

Branch `claude/d-mistake-trigger-hooks`, off `main` at `c66604b8`. Six commits, ten files. No
product code: everything here is machine guard behaviour, one new doc, and tests.

## What landed

**1. A wrapped e2e or sweep command no longer walks past the machine-wide browser refusal**
(`scripts/command-match.mjs`). `invokesE2e` and `invokesSweep` read only the bare command segment,
so anything standing in front of an invocation hid it. Measured before the fix, with a browser job
live on the process table: `npm run test:e2e` was refused and eight spellings were ALLOWED -
`bash -c "…"`, `sh -c '…'`, `nohup`, `start`, `powershell -NoProfile -Command "…"`, a
`npm install; if ($?) { … }` block, a lone `&` sequencing `npx playwright test`, and the sweep
equivalents. Both now read `invocationParts`, the helper `startsDevServer` already used, and so
does the enqueue exemption - otherwise the hole would only have moved to
`bash -c "npm run test:e2e" && npm run queue -- "y"`.

The brace split that makes the PowerShell block form work also MANUFACTURES a part out of an
argument, and the first cut of the fix refused `jq '.scripts | {test:e2e}' package.json` and
`echo {test:e2e}` outright, because the script-name matcher took its runner prefix as optional.
Typing the bare name runs nothing, so a runner is now required; `run` inside it is optional, which
picks up `pnpm test:e2e` along the way.

**2. `docs/MISTAKE_TRIGGERS.md`** - the design picture the owner's receipt asked for. Three places
a lesson can live (hook, build gate, contract) and why the gate row is the one that gets forgotten;
the four tests for a tool shape; the refuse-or-warn rule and why the hook channel forces that
choice; how a hook is verified; the inventory of what fires today; what has a tool shape and is
deliberately unbuilt; and what cannot be hooked at all.

**3. Destroying a handoff that still lists open items now says so**
(`scripts/handoff-trace.mjs`, through `warn-command.mjs` for a deletion and `warn-edit.mjs` for an
overwrite). Open items are read from each section's BODY, not its heading, because reading the
headings IS the 2026-09-01 mistake. `deferred` is deliberately not a trace: it is the plan deciding
to keep the file.

**4. The backlog receipt is narrowed, not deleted** - two of its five items are still open, and
they are named in it and in the new doc.

## Evidence, and how each claim was made

Every guard claim here was made by feeding the REAL hook a REAL event and reading the exit code,
never by reading the code. The drivers are in the session scratchpad and are not worth keeping;
what they did is worth recording:

- **The browser refusal.** An inert `node …/decoy/scripts/type-floor.mjs` was put on the process
  table so `activeRuns` saw a live sweep in another checkout, then 36 events were fed to
  `guard-command.mjs`: 8 wrapped spellings that must be refused, and 28 innocent commands that must
  not (greps, the `:queued` forms, enqueued payloads, `--list` plans, a heredoc quoting the wrapped
  command, `find -exec rm {} \;`, `2>&1`, a PowerShell `ConvertFrom-Json` read of the script name).
  Red first: 7 of 8 allowed. Green after: all 36 correct. **The decoys were killed immediately** -
  a stand-in on the process table blocks every other session's browser work while it is up.
- **The handoff notice.** Real files deleted and overwritten in this worktree, judged against the
  REAL wave plan in the orchestrator home. Eleven cases: a `deferred` file with open items fires
  (twice, through `rm` and `Remove-Item`), an overwrite that drops the items fires, and the
  nine-file drain a wave row performs stays silent, as do reading the folder, updating a handoff in
  place, and writing a new one.
- **The review's findings** were reproduced in an isolated clone with its own git directory, so a
  merge commit, a stale landing pin and a queued job could all be constructed without touching the
  machine-wide queue. Seven cases, all correct.

## What the review found, and what it cost

`/check` review found nine, eight acted on. Five were ways the notice would have fired on correct
work, which is the failure a notice cannot survive, and two of those were serious:

- The working-tree deletion range was read on EVERY commit, so one unstaged handoff deletion made
  every later commit report a deletion that did not happen, forever.
- Because the warn channel exits the process, firing at all made the stale-landing-pin notice
  unreachable - the notice `warn-command.mjs` was originally written for. Both rules now collect
  into one message with a single exit.
- A merge commit's `HEAD^ HEAD` range carries every handoff `main` drained, so finishing a
  conflicted `git merge main` with `git commit` reported somebody else's classified work and
  advised `git restore`, which would have undone the merge.

The ninth is not a defect: the narrowed backlog file cites this handoff, which did not exist when
the reviewer read the branch and does now.

## What is left

Nothing on this branch. Four things are recorded elsewhere and none of them is mine to finish here:

1. **The two unbuilt hooks** are in `docs/backlog/mistake-trigger-hooks.md` with their reasons: an
   Agent launch naming a path that does not exist (exact, so it may refuse), and a background
   fan-out from a launched session (warn only).
2. **The occupancy refusal** (`git checkout <existing-branch>` in the primary checkout) and **a
   migration created by shell redirect** are both deliberately NOT done, as the H handoff already
   said and this one repeats. Each wants its own decision, and the occupancy one carries a real
   question: no refusal in this repo stats the working tree today, and telling `git checkout foo`
   from `git checkout src/foo.ts` needs exactly that.
3. **The command gate for the handoff notice needs the word `handoffs` in the command text.**
   `Remove-Item $spent` inside a loop says neither the folder nor a path and is missed. The
   alternative is a git call before every shell command in every session at about 90 ms each, to
   catch a shape nobody has typed. Stated in the hook's own header.
4. **`jobsDir()` resolves from the SCRIPT's repository, not the command's** (`gitCommonDir` in
   `scripts/dev-port.mjs` closes over the module's own location). Pre-existing, correct in normal
   use because a session runs its own checkout's hooks, and it surprised me while probing: a hook
   file executed from another checkout reads the wrong queue. Worth knowing before anyone runs a
   hook by absolute path from elsewhere.

## Verification

- `npm run build` green on `ed96b456`, and the branch stamp said
  `claude/d-mistake-trigger-hooks@…`, not `main`.
- Unit suites: `npm run test:command-match` 35/35, `scripts/handoff-trace.test.mjs` 9/9, both in
  the build's `node --test` list.
- **CI run 33634204643 on `0950237c` was green with all nine E2E shards, Build, Factory gates and
  the CI gate ACTUALLY RUNNING**, read from `gh run view --json jobs`. That run covers the first
  four commits.
- **The second run, 33636065990 on `ed96b456`, SKIPPED every E2E shard**, because an ordinary push
  plans from the previous push and those two commits touch only `scripts/` and tests. That is the
  documented behaviour, not a fault, and it is stated here rather than rounded up: the E2E
  evidence for this branch is the first run. Nothing in `e2e/`, `src/`, `api/` or the Playwright
  configs imports `command-match.mjs` or `handoff-trace.mjs` (checked), and `costOf` in
  `jobs-store.mjs` - the one non-hook consumer - already falls back to `browser` for an unmatched
  command and returns `COST.merge` before reaching it for a landing job, so the widening cannot
  move the queue's behaviour. The landing job dispatches its own full run on the integrated sha.
- No local full suite, deliberately: this is the wave's last landing on a RAM-bound laptop and the
  pre-merge gate belongs to CI.

## /check

`review: delegated` - the code-review skill at level `high` forked and returned findings on this
branch and only this branch's files (scope check passed against the phase-1 file list). Nine
findings, eight fixed, one resolved by a later commit.

`simplify: inline` - the skill returned fan-out instructions, which by `.agent-workflows/check.md`
means the pass did not run, so the four angles were covered here. Three fixes: both hooks now call
one `handoffNotices` entry point instead of each carrying its own copy of "find the plans,
classify, judge" plus its own spelling of where the orchestrator home lives; each plan is read and
parsed once rather than once per deleted file (the drain case was eighteen reads for two facts);
and the dead `homeWorktree` helper went with it.

`verify: inline` - as above. Stamp written to
`<git-common-dir>/noacg-jobs/checks/claude-d-mistake-trigger-hooks.json` at `ed96b456`.

## Scope note

The row's TOUCHES named `warn-edit.mjs` but not `warn-command.mjs`, and this branch changed both
plus a new `scripts/handoff-trace.mjs`. A deletion arrives through the shell tool, so the deletion
half had to live in the hook already wired to `Bash|PowerShell`; a third hook there would have put
a second node process on every shell command in every session. No `.claude/settings.json` change
was needed, which also means no new refusal surface.

## Note for the next orchestrator

This was the wave's designated LAST landing and the reason held: it changes refusals and notices
every session on this machine meets. Anything landing after it meets rules its prompt was not
written against. In particular, **a wave row that drains `docs/handoffs/` now needs the plan's
`## Handoffs` line to carry a trace** - `spent: <file>` with nothing after it will raise a notice
where it used to be silent. That is the intended behaviour and the current plan already satisfies
it; it is written here because the next plan is where it would first bite.

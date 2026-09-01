# 2026-09-01 - a worktree session can drive its own build

Branch `claude/f-worktree-preview`, off `main` at `40a0b81f`. Four commits, ten files.

## The measurement this rests on

Step 1 of the row was "reproduce and MEASURE before designing anything". The result did not match
the description the row was written from, and it is worse than the memory note claimed.

From `.claude/worktrees/agent-a32e0b6091a2fe4bb`, a linked worktree:

- `node scripts/dev-port.mjs` printed **5256**. Both generated files were written and both carried
  5256 (`.claude/dev-port.json` with `livePort` 5257, `preferred` 5214 taken, ticket
  `.git/noacg-dev-ports/5256.json`; `.claude/launch.json` with `dev` and `dev-bench` on 5256).
  **That half of the machinery is correct**, and the row's suspicion about it was wrong.
- `preview_start {name: "dev"}` then returned `port: 5174`, `reused: true`.
- `preview_list` showed the truth: **`cwd` was `C:\claude\NoaCG-Studio\.claude\worktrees\new-session-64a3f6`**
  - the LAUNCHING session's checkout, not this worktree. `startedAt` was that instant, so
  `reused: true` was also false.
- `preview_logs` showed Vite's own banner: **ready on 5240**, which is `new-session-64a3f6`'s
  reservation. `vite.config.ts` resolves the port from its own location, so that part was right.
- Nothing ever answered on the reported 5174. Within about two minutes the harness **reaped the
  server**; `preview_list` went empty and the serverId became unknown.

So one call produced **three different checkouts** - the tree it served, the port it reported, the
port it bound - and ended with **no server at all**. A worktree session had no correct way to
drive its own build: the guard refused the direct route and the sanctioned route served somebody
else's tree, silently.

This is measurement, not inference. The `cwd` and the bound port were read from the harness's own
`preview_list` / `preview_logs`, not deduced.

**Verdict: shape (b) from the row.** It genuinely cannot reach the worktree, so a sanctioned
worktree-bound path was needed. Shape (a) - "the advice is wrong, the path works" - is refuted by
the `cwd` line.

Not diagnosed, and not diagnosable from this repo: **where 5174 came from**. It is neither the
spawning checkout's launch.json (5240) nor this worktree's (5256); it is the primary checkout's.
Recorded as observed harness behaviour. UNVERIFIED whether a top-level session opened directly in
a worktree (rather than an agent-isolated one) gets the right `cwd` - that case was not measured,
and the reported-port defect would still apply to it.

## What landed

**`npm run dev:worktree`** (`scripts/dev-worktree.mjs`) - the sanctioned path, working in any
checkout and the only thing that works in a linked worktree. It resolves the checkout from its own
file location rather than `process.cwd()`, binds that checkout's reservation, and **refuses when
that port is busy**, which is the hazard the refusal exists for. `--print` shows where it would
serve without starting anything.

**The guard's dev-server matcher moved into `command-match.mjs`** - the module that exists so a
matcher can be tested, since the hook reads stdin at module top and cannot be imported. The
carve-out is one script, not a category. The deny message now names the path that works in each
kind of checkout instead of pointing at one that does not.

**`node scripts/dev-port.mjs --base`** prints the server URL, so a sweep's `--base` comes from one
command.

**`scripts/svg-import-sweep.mjs`** prints the server it drove on its first line, and whether that
came from `--base` or the checkout's reservation, and refuses when nothing answers there. Its
default needed no change: it already derived this checkout's reserved port, which is exactly what
`dev:worktree` binds.

Docs: `docs/DEV_PORTS.md` gains the recipe and the measurement; `docs/VERIFICATION.md` points the
sweeps at it; `e2e/AGENTS.md` loses the byte-comparison workaround this obsoletes;
`docs/backlog/svg-import-sweep-findings.md` has its "cannot yet produce an AFTER sweep" note
marked resolved.

## Proof

Not a green gate - the thing itself, done:

- Markers placed in this worktree's `app.html` (`<title>`) and `src/main.tsx` (a `console.log`),
  then `npm run dev:worktree`. Vite bound **5256**. The browser at `http://localhost:5256/app`
  returned title **"NoaCG Studio - Editor WORKTREE-F-MARKER"** and console
  **`WORKTREE-F-MARKER served from http://localhost:5256/src/main.tsx`**. So both the static HTML
  and the compiled module graph came from this worktree. The app booted fully (screenshot taken).
  Markers reverted; `git status` clean before the first commit.
- Busy-port refusal: a second `npm run dev:worktree` while the first was up exited 1 with the
  refusal, as designed.
- Sweep: `node scripts/svg-import-sweep.mjs --only inkscape` with **no `--base` flag** drove
  `http://localhost:5256` and reported it. **5 fixtures, 4 pass, 1 partial, 0 fail** (the partial
  is the known growth-default note on `inkscape-flowed-text-card`). `inkscape-millimetre-scorebug`
  is now clean where the 2026-08-29 baseline had it as finding 3.
- No-server refusal: the same sweep with `--base http://localhost:5299` exits 1 before launching
  Chromium.
- The hook itself, not only its matcher: fed a real PreToolUse event on stdin, `npm run dev` is
  denied (exit 2) with the new message, and `npm run dev:worktree` passes (exit 0).

## /check

- **review: `delegated`** - the code-review skill at level `high` returned findings in this
  conversation, on this branch and this file set (scope-checked against phase 1). Seven findings:
  one HIGH, four MEDIUM, two LOW. Six acted on, one confirmed as not reproducing here.
- **simplify: `inline`** - the skill returned fan-out instructions rather than a result, so by the
  workflow's four-branch rule the pass had not run and was done in this context over the four
  angles. Renamed two helpers to the file's `segmentStartsX` idiom, folded an intermediate array
  into the `.some()` it fed, aligned the sweep's `repoRoot` to the house idiom, and stated why the
  wrapper-stripping loop is bounded. No behaviour change.
- **verify: build green locally on every step; CI green on both pushed shas, with the jobs read
  individually rather than the run conclusion trusted.**
  - `6bbe1d52` (run 33552223774): green, and **all nine E2E shards actually ran**, plus Build,
    Factory gates and the CI gate.
  - `4e2aab54` (run 33554524832): green, Build + Factory gates + CI gate ran, and **every E2E
    shard was `skipped`**. That is the planner working, not a hole: an ordinary push plans from
    the PREVIOUS push, and the delta `6bbe1d52..4e2aab54` is six files of tooling, tests and prose
    with nothing under `src/`, so it selects no specs. The full-suite selection seen locally is
    the plan against `main`, where `package.json` counts as an unmapped core file. Written out
    because a green run whose shards all skipped is exactly the thing AGENTS.md says not to read
    as coverage.

### What review found, and what came of it

The two that were real defects in my own work:

1. **The rewrite narrowed the refusal.** Making the matcher positional let `nohup npm run dev`,
   `start npm run dev`, `bash -c "npm run dev"` and `cd x & npm run dev` through - all caught by
   the plain regex it replaced, and each one starts a real server on a real port. Confirmed by
   direct measurement, fixed by looking for the invocation after a pass-through wrapper and after
   a lone `&`, and pinned in the tests. **This is the finding that mattered**: a guard that is
   decorative is worse than none, and I had made it decorative for four spellings.
2. **The matcher denied an ordinary grep.** `grep -n "orphan\|vite" scripts/e2e-runs.mjs` splits
   on the `|` inside the pattern, leaving a segment opening `vite"`. Pre-existing (the old regex
   did it too), but the reviewer was refused by it for real while reading this branch, so it is
   fixed here and pinned.

Three were claims in my own comments that were too strong, now corrected rather than defended:
`--orphans` is a place to look and not a verdict; the checkout it names is whichever supplied Vite,
not whichever is served; and this server is **not** the suite's server (Playwright pins the backend
vars empty for its own, this one carries the ambient `.env`), so while it runs, e2e runs in that
checkout are refused and a sweep and a suite there are mutually exclusive. All written down.

Two housekeeping: the SVG sweep joined `DEV_SERVER_DEPENDENT_SCRIPTS` so a queued one is refused at
queue time rather than burning its slot, and `e2e/AGENTS.md` lost the workaround this obsoletes.

**One finding did not reproduce and was not "fixed".** Review reported a live `dev:worktree` server
being listed by `--orphans`. Measured from this session's own backgrounding: a healthy server was
correctly **absent**. Measured from the forked review session: it **was** listed. The difference is
whether the launch chain above the process still exists, which is a property of who backgrounded
it, not of this script. Both measurements are recorded in the script header, and the advice is
written to be safe under either.

## What is left

- **UNVERIFIED: the E2E suite against the FINAL state of this branch.** The nine shards ran green
  on `6bbe1d52`; the three later commits (comments, the matcher fixes, prose) were covered only by
  Build and Factory gates, because the planner selected no specs for that delta. Nothing under
  `src/` is touched by this branch at all, so the exposure is the guard hook and the matcher, both
  covered by `npm run test:command-match` (28 tests, green) and by feeding the hook a real event.
  The landing queue plans from the fork point and gates on the integrated sha, which closes this
  properly; it is recorded because a green run with skipped shards must never be reported as a
  full one.
- **UNVERIFIED: `npm run dev:worktree` on anything but this machine and this platform.** The
  signal forwarding, the `CI=1` open-suppression and the orphan behaviour were all measured on
  Windows only.
- **Not attempted: making `preview_start` correct.** It is harness behaviour, not repo code. The
  repo's answer is now to not depend on it in a worktree, and to say so where that is read.
- **Open question for the owner, not asked in chat per the row's instruction:** `npm run dev` is
  still refused in the primary checkout, where `preview_start` genuinely works. `dev:worktree`
  works there too and is strictly safer (it refuses a busy port; `preview_start` does not). Whether
  to collapse to one entry point everywhere and retire the preview path is a taste call about how
  much the preview tools' process ownership is worth. Left as is.

## Cost

One session. `npm install` in this worktree (it had none), four `npm run build` runs, two
five-fixture sweeps, one full local matcher-test run per change, two CI runs. No paid API calls,
no rendering, no e2e suite run locally. Two background dev servers started and both closed; the
port was verified free and the orphan list empty before finishing.

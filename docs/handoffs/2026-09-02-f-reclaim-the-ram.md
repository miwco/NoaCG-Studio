# Reclaiming RAM from background apps: what it does, and the measurement that changed the answer

Branch: `claude/f-reclaim-the-ram`. Wave row F, 2026-09-02 night.

## What landed

- `scripts/reclaim.mjs` - a pure core (`classifyProcess`, `reclaimPlan`, `describePlan`, three
  exported lists) plus a CLI that enumerates through PowerShell and closes through `taskkill`.
- `scripts/reclaim.test.mjs` - 13 tests, all passing. Five of them exist only to prove the
  never-touch list is never touched.
- `npm run reclaim` and `npm run test:reclaim` in `package.json`, with the test added to the
  `node --test` list in `build`.
- `docs/backlog/ram-reclaimer.md` - the design, with an owner receipt against the 2026-08-28 ask.
- `docs/acceptance/owner-queue/2026-09-02-reclaim-ram-from-background-apps.md`.

`npm run reclaim` names what it would close and frees nothing. `--apply` closes the allowlist.
`--include-heavy` also treats the Codex app and Antigravity as closeable, and on its own, without
`--apply`, still closes nothing.

## The measured numbers, all taken on this machine on 2026-09-02

The machine: 16.2 GB total. Free RAM ranged from 5.5 GB down to 2.0 GB across the evening, with
four sessions, two Vite dev servers, the job runner and a live e2e suite in flight.

**The dry run, before anything was applied.** Twelve processes on the allowlist holding 341 MB:
Stream Deck 74 MB, WD Discovery 62 MB across five processes, the Creative Cloud UI helper 72 MB
across four, and Adobe's two bundled node servers 134 MB. Held back behind the second flag: the
Codex app at 670 MB across eleven processes and Antigravity at 78 MB. Kept: 392 processes,
including 2377 MB of Claude sessions, 1977 MB of this repository's node processes, 1072 MB of
Chrome and 366 MB of Wispr Flow.

**The apply.** Eight of twelve closed, holding 315 MB. Free memory read 4022 MB before and
4791 MB after.

**And then it came back, larger.** Within seconds WD Discovery was at 339 MB against the 60 MB it
went down with, and the Creative Cloud helper at 474 MB against 72 MB. Ten minutes later the same
set read **907 MB**, which is about **570 MB worse than before the kill**. Only Stream Deck stayed
closed. Both of the others have service watchdogs; a cold start allocates before it settles.

**So the honest figure for what this tool frees on this machine is 64 MB**, which is Stream Deck.
That is the number, and it is not the number I expected to be writing.

## What that means, and what I changed because of it

The list is worth more than the button. Every closeable entry now declares `returns:` -
`stays-closed`, `watchdog`, or `unmeasured` - the dry run prints it as a column, and both the dry
run and `--apply` report the stays-free total separately from the total closed. A tool that
reported only what it killed would have called that first attempt a 341 MB success.

The real memory on this machine is the Codex desktop app at around 700 MB, and closing it stays a
person's decision by design. After that, the watchdog services themselves - Adobe Desktop Service,
WD's discovery service - are where the several hundred megabytes actually is. That is a Windows
settings change, so it is the owner's to make and is written up as an open question in the
owner-queue item.

## The design, which is not up for re-litigation

Safety is a curated allowlist and nothing else. `MainWindowHandle` reads 0 even for apps with
visible windows, so there is no in-use signal and no graceful close. Matching is by executable
path, never by process name: thirteen `node.exe` processes were running when this was measured,
two of them Adobe's servers and eleven of them this repository's own dev servers, runners, sweeps
and MCP servers, which differ by path and by nothing else. The never-touch list is checked before
anything else, and one test proves it wins even against a name that also appears on the allowlist.

Do not replace the allowlist with a detector.

## What /check found, and it was not cosmetic

`review: delegated` (code-review at `high`, findings returned into the conversation and
scope-checked against this branch). `simplify: inline` (the skill returned fan-out instructions,
which under `.agent-workflows/check.md` means the pass did not run, so the four angles were
covered by hand). `verify: npm run build` plus CI.

The review found five defects, all in the part that touches the machine rather than in the
classifier, and one of them broke the property this row exists for.

**`taskkill /T` killed processes the classifier never saw.** The tree flag terminates every
descendant of the target, and a descendant is not something `classifyProcess` ever inspects. Open
a terminal inside the Antigravity editor, run `--apply --include-heavy`, and the `/T` on
`Antigravity.exe` takes down the node process under it - the exact
`C:\Program Files\nodejs\node.exe` the never-touch list promises in writing to keep. The flag
turned out to be unnecessary as well as unsafe: these apps run as several processes and the
enumeration sees every one of them, so each is matched and closed on its own account. Removing it
also made the "already gone with its parent" case disappear, and the next live run closed 10 of 10
with no ambiguous outcomes at all.

**A pid is not a process.** Up to a second passed between classifying a pid and killing it, on a
machine that starts node and chrome processes constantly. The machine is now read again and every
pid re-classified immediately before its kill; anything that is no longer what it was matched as
is skipped.

**Death was decided by parsing English.** `taskkill` exits 128 both for a missing pid and for
access denied, so the code told them apart by matching "not found" in stderr - wrong on a
localized Windows, and wrong again when a multi-line result's first line is not the decisive one.
It now reads the process list back, which answers it exactly, in one call, in any language.

**An entry declaring no condition matched everything**, because "all declared conditions hold" is
vacuously true of none. A typo'd key would have turned one allowlist line into "close everything
the never-list does not name". Two tests hold that shut now, and `matchesEntry` is exported so the
property is provable rather than asserted.

**An unmeasured entry was described as watchdogged** in the summary, which invents a measurement
inside the one paragraph whose job is to avoid that.

The simplify pass found one thing worth doing: free memory was read through PowerShell while
`jobs.mjs` measures its free-RAM floor with `freemem()` from `node:os`. Two sources for one number
is how this tool ends up reporting that it freed enough while the queue carries on refusing, so it
now uses the same call. One thing was reported and not done: `e2e-runs.mjs` spawns the same
`Get-CimInstance Win32_Process` shape in three places and there is no shared helper. Extracting
one would ripple outside this diff, so it stays a note.

Tests went from 11 to 15.

## The delegation, which failed twice and is recorded

Both attempts went to Antigravity's `claude-sonnet-4-6` pool and both returned zero usable lines,
for about 120 K input tokens across the two calls. Recorded in
`~/.noacg/delegation-outcomes.jsonl` under the labels `reclaim.mjs draft attempt 1 (plan mode)`
and `reclaim.mjs draft attempt 2 (one-shot prompt)`.

Attempt 1 returned a plan and two confirmation questions. `--read-only` maps to agy's `--mode
plan`, which plans by design, and my prompt did not forbid asking.

Attempt 2 pinned the exact six exports and forbade planning and questions. It returned narration
only, ending "I have everything I need from the spec", and then nothing - the documented empty
response. Two compounding errors were mine: still `--read-only`, and every path in the prompt
named the MAIN checkout, so the test file it went looking for was not there, because it lives in
this worktree.

**The lesson worth carrying, and it is about me rather than the pool:** a delegation asking for a
FILE needs `--write` and needs worktree paths. Pointing a delegate at the main checkout is wrong
twice over - the file may not be there, and that tree is mutated by the merge queue, so a read
taken there mid-integration can be wrong with nothing saying so. Opus then wrote the module in one
pass against the same spec.

## What is still open

The job queue does not call this. `jobs.mjs` reclaims orphaned processes after fifteen minutes of
starvation (`scripts/ram-reclaim.mjs`, a different module with a different safety argument) and
stops there. Wiring this in is what actually answers the owner's 2026-08-28 ask, and it needs a
decision about whether an unattended reclaim may touch the confirmed set. It should not.

`stays-closed` on the Codex app and Antigravity is a reasonable belief and not a measurement -
nothing has closed either of them yet.

The allowlist is this machine's. Every entry was measured here.

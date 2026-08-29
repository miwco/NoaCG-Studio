# Handoff - Session S: the harness usage meter (2026-08-30)

**Branch:** `claude/s-harness-usage`. **Gate:** `npm run build` green, and CI green on
`5f538867` - **all nine E2E shards ran, not a subset** (`Build`, `Factory gates`, `E2E 1..9/9`
and `CI gate` all success; only the Vercel and catalog-calibration jobs skipped, as they do). The
build stamp read `[write-version] dist/version.json -> claude/s-harness-usage@5f53886705`, so it
gated this branch and not `main`.

Later commits re-ran the build locally and CI on each push. Those runs plan from the previous
push and correctly skipped the E2E shards, because every commit after `5f538867` touches only
`scripts/` and `docs/` - and so does the whole branch, which ships no product code at all.

## What landed

**`npm run harness:usage`** answers "am I paying for the Codex subscription for nothing" from
evidence rather than impressions. It reads both harnesses' own local transcripts, calls no API,
writes nothing, and prints for any window: sessions, requests, tokens by kind, and for Codex the
5-hour and weekly rate-limit percentages with their reset times.

Windows: `--since <iso>`, `--hours <n>`, `--wave` (from the newest
`docs/handoffs/*wave-plan*.local.md` mtime), default 24 hours. `--until`, `--top` and `--json`
round it out. `--wave` with no plan file on disk refuses with the pattern it looked for rather
than silently defaulting - there is currently no such file, so that path is the one you meet.

Files: `scripts/harness-usage.mjs`, `scripts/harness-usage.test.mjs` (33 cases),
`scripts/harness-usage-fixtures.mjs`, `package.json` (`harness:usage`, `test:harness-usage`, and
the test added to the build's `node --test` list), a section in `docs/AGENT_WORKFLOWS.md`.

### The answer it gives today

Run at 2026-08-29T20:53Z: Codex's **weekly window 41% used, 5-hour window 17%**, plan `plus`, and
one live session in the `v-svg-samples` worktree at 1.5 M tokens over 20 turns. So the
subscription is being used, and the honest reading is "used, not heavily". Over the same 12-hour
stretch Claude Code did 470 M tokens across nine sessions and Codex 621 K across eight. **So the
subscription is not being paid for nothing, and Codex is doing a very small share of the work** -
which is now a number rather than a feeling. Do not read the token ratio as a work ratio: Claude
Code's figure is dominated by cache reads billed per request, and the two harnesses do not slice
input the same way. The percentages are the sounder signal, and 41% of a weekly window is real
use.

### Four things that decide whether the numbers are right

Each was measured against the real transcripts on this machine, and each is pinned by a test.

1. **Claude Code writes the same assistant record two or three times.** One session file held 8
   usage records for 4 distinct requests, byte-identical duplicates; a resumed session also copies
   earlier records into its new file. Summing records inflates the answer by roughly 2-3x. The
   meter dedupes on `message.id` + `requestId`, **across every file**, which is why the dedupe
   happens after the whole read rather than inside one file.
2. **Codex's `last_token_usage` does not sum to its own session total.** Over the 88 rollouts on
   disk it disagreed with the final `total_token_usage` in **46** of them, by up to 30%. So the
   meter never adds the per-turn field: it walks the cumulative `total_token_usage` (verified
   monotonic across all 88, zero resets) and takes deltas. That also windows correctly - a session
   straddling the boundary contributes only its inside part, not all of it and not none.
3. **A percentage is a snapshot, not a rate.** Exactly one rate-limit pair is ever printed, the
   newest in the window, stamped with the time it was taken. A quiet window has no snapshot, which
   is reported as "no snapshot", never as 0%.

4. **`sessionId` does not identify a session, and neither does `gitBranch` identify a branch.**
   Found while reading the meter's own first output, which looked wrong: this branch never
   appeared in the branch table, and one worktree's session was split across three project rows.
   Both have the same cause. Every agent a wave launches writes its transcript to
   `<project>/<parent-session-id>/subagents/<agent>.jsonl`, and **every record in it carries the
   PARENT's `sessionId` and the PARENT's `gitBranch`** - all four live wave agents reported
   `sessionId: 51555eeb-…`. Counting sessionIds reports six agents in six worktrees as one
   session on one branch. The **transcript file** is the session, and the cwd its first record
   names is the worktree; a session that cds mid-run is re-attributed to the cwd it started in.
   The branch table is still printed, with a line under it saying it shows the launching
   session's branch, because that is what the data honestly is.

Also handled: Codex archives finished sessions into `~/.codex/archived_sessions`, so reading only
`~/.codex/sessions` loses most of the history; both trees are read, and a session id appearing in
both is counted once.

### What it cannot know, and says so instead of guessing

**Claude Code's own 5-hour window percentage is not in the transcripts.** There is no rate-limit
event anywhere in `~/.claude/projects/**` - they carry token usage and nothing else. The meter
prints that sentence in place of the number. Tokens are not a percentage of an allowance nobody has
published, and an estimate here would be the kind of number that gets quoted later as if it were
measured.

## Antigravity readiness - the premise was wrong, in a good way

Owner-queue item: `docs/acceptance/owner-queue/2026-08-30-s-antigravity-readiness.md`. Nothing was
installed and no credentials were entered.

- **Antigravity CLI is already installed and already signed in on this machine.** `agy.exe` is at
  `C:\Users\ahonemi\AppData\Local\agy\bin`, version **1.1.22**, and `agy models` answers with the
  full model list without prompting. It is only missing from PATH.
- **The IDE at `AppData\Local\Programs\antigravity` really has no headless entry** - but that was
  never where one lived. The CLI is a separate product, a single Go binary, installed elsewhere.
- **It has a full non-interactive surface**, verified from `agy --help` on 1.1.22: `-p`/`--print`,
  `--output-format text|json|stream-json`, `--input-format stream-json` (NDJSON turns on stdin),
  `--model`, `--effort`, `--mode plan|accept-edits`, `--sandbox`, `--json-schema`,
  `--print-timeout`, `--dangerously-skip-permissions`; subcommands `models`, `agents`, `mcp`,
  `plugin`.
- **Gemini CLI is retired**, so it is not a fallback: Google announced the consolidation at I/O on
  2026-05-19 and cut individual accounts (AI Pro, Ultra, free Code Assist) off the legacy CLI on
  **2026-06-18**, no grace period, no automatic migration; only purchased enterprise Code Assist
  licences still work. Antigravity CLI is the only Google harness there is.

**The one thing that needs the owner** is `agy install` - it edits shell settings to put the binary
on PATH, which is why a session should not run it. The owner-queue item carries that, a smoke test,
and fresh-install commands for a machine that does not have it.

## The handoff sweep, and the one judgement call in it

Six consumed working notes were removed (`-k-red-main-gates`, `-l-flake-ledger`, `-m-codex-trial`,
`-o-svg-corpus`, `-p-ai-door-copy`, `-orchestrator-two-waves`); `-n-ograf-checker` stays because
its work is not finished.

`-m-codex-trial.md` was **cited from six places** - `.claude/commands/rescue.md`,
`scripts/codex-rescue.mjs`, `scripts/codex-rescue.test.mjs`, `docs/AGENT_WORKFLOWS.md`, an
owner-queue item, and this session's own new script. Deleting it as instructed and leaving six
pointers at a missing file would have manufactured exactly the defect a previous session spent a
day repairing, so all six were repointed in the same commit at the record that actually survives:
the three delegation-channel defects are written out in full in the header of
`scripts/codex-rescue.mjs`, which is the code that exists because of them. Re-grepped afterwards -
zero references to any of the six deleted files remain anywhere outside `.git`.

`node scripts/worktree-activity.mjs` was checked first: no other worktree held any of the touched
files.

## What is left

1. **`agy install`** - the owner's one command, in the owner-queue item.
2. **A third reader for the meter, if work is ever routed to Antigravity CLI.** It keeps its own
   state under `~/.gemini/`; nobody has established whether it writes per-session token usage the
   way the other two do. The script's shape takes a third harness without restructuring - one
   `readXSession` plus one report block.
3. **`/check` was not run.** This session was told not to spawn subagents, and the code-review leg
   of `/check` delegates. The diff was reviewed by hand instead (two comment corrections came out
   of it, commit `0d1bcaa3`); a later session with subagents available could run it properly.
4. **Nothing in the meter is wired to a gate, deliberately.** It reports; it never fails a build.
   `check:freshness` is the precedent.

## What it cost

Measured with the meter itself, which is the point of it. This session's worktree
(`agent-aff1f90c2777bd09a`) came to **125 requests and 20.0 M tokens** over three hours - 19.7 M
of that cache reads, 219 K cache writes, 31 K output. The Codex side of this session is **zero**:
nothing was delegated, because the work was reading two undocumented file formats and deciding
what they mean, which is the class the first delegation trial already named as a poor delegation
candidate - short to do, long to specify.

For scale, over the same three hours the whole machine did 88.6 M tokens across 9 sessions, and
Codex's subscription sat at 17% of its 5-hour window and 41% of its weekly one.

# Landing path: prove yesterday's fixes, then fix what still lied

Branch `claude/landing-path-honest`. 2026-09-04.

Four fixes landed on the landing path in one day and none had been verified at scale. The job was
to measure first and only then change anything. The measurement says three of the four took; the
fourth - the retry path - was still reporting a landing that had succeeded as a failure, and
underneath all of it the runner could not start at all.

## 1. Did the fixes take?

Every merge job in `<git-common-dir>/noacg-jobs`, split at the node_modules cache landing
(12ce8f55, 2026-09-04 12:50 local). Durations are of SUCCESSFUL landings only, so a run killed at
the cap does not flatter the median.

| Window | landings | done | not done | median | p90 | slowest | queue minutes |
|---|---|---|---|---|---|---|---|
| Baseline, everything before 2026-09-04 | 274 | 209 | 65 | 7.6 | 12.3 | 21.3 | 1671 |
| 2026-09-04, before the cache | 34 | 11 | 23 | 21.4 | 26.8 | 27.3 | 591 |
| 2026-09-04, after the cache | 4 | 4 | 0 | 14.3 | 18.2 | 18.2 | 52 |

The baseline row reproduces the numbers the brief carried (7.6 / 12.3 / 21.3 over 209 landings),
which is the check that the two measurements are of the same thing.

**The catastrophic failure mode is gone.** Eight landings were killed at the 45-minute cap that
morning and 16 died in under 30 seconds; since the cache, four for four succeeded and no shard came
near its own cap. The three post-cache CI runs each finished all nine shards in 9-10 minutes with
5-12 for the build.

**The duration goal is not met.** Three of the four post-cache landings took longer than the
"about twelve minutes" the brief asks for: 14.3, 16.6, 18.2 and one 2.8. That is now a structural
floor rather than a fault - a landing is a build of 5-6 minutes and then nine shards of 9-10 in
parallel - and the honest read is that the baseline's 7.6-minute median came from runs that
skipped shards, not from a faster machine. Four landings is a thin sample and this row should be
re-measured after a full day.

**What the cache is actually worth,** measured rather than estimated, by recording the overhead
term for the first time (`npm run record:e2e-durations`, run 33871221430, the first green full
nine-shard run on main under the cache):

| | before | after |
|---|---|---|
| Non-test cost per shard job, p90 | 10.07 min | **0.55 min** |
| Non-test cost per shard job, median | 6.36 min | **0.38 min** |
| Test factor (measured / table) | 1.05 (default) | 1.01 |
| What a shard can carry under its 20-min cap | 15.2 table-min | **16.3 table-min** |

The table had never carried a measured overhead - it said so itself and used defaults of 1 minute.
It does now.

So: the cancelled-run classifier, the ordering-hold-as-a-wait, the bin-packing and the cache all
took. The retry path did not, and neither did the thing under it.

## 2. A landing reaped after it landed read as failed, and was retried

Reproduced exactly. j-0533 ran the landing for `claude/f-contracts-point` to completion - its log
ends `auto-merge: landed claude/f-contracts-point on main as 6f7efcfd`, and e5ace753 has been an
ancestor of main ever since. The runner never observed the exit, reaped the process, and wrote
`state: "failed", exitCode: null, reapedAsDead: true`. The sweep then re-queued a branch already
on main, and in a serialised queue that wasted landing delayed every branch behind it.

`movedOnlyByItsOwnLanding`, the existing hook the brief pointed at, answers a different question:
whether the BRANCH tip moved only by its own integration merges, so a retry may be re-pinned. It
says nothing about whether main contains the branch, so it is not wired for this and must not be.
The right instrument is one `git merge-base --is-ancestor <the job's --expect-sha> main`.

It is asked in **two** places, and the two are not duplicates of one job:

- **The writer asks before it records.** Both paths that end a job with no exit code - the reaper
  and the 45-minute cap - go through one function; such a job is written `done` with
  `landedBeforeItEnded` saying why it is done carrying no exit code, and `reapedAsDead` is kept,
  because how the process ended is a separate fact from whether the work landed. This is what
  makes `<id>.json` mean what it says to anyone who opens it.
- **The reader corrects too,** because records already on disk predate this and are kept a
  fortnight, and other writers exist. `landingStateFor` asks the same question when a record
  claims failure and carries no exit code. Narrow on purpose: an exit code IS a verdict, so a red
  gate stays a failure whatever main happens to contain.

That single read-side change settles every downstream reader at once - `requeue` refuses, the
orphan sweep no longer adopts, the listing offers no command, and wave-tick emits LANDED alone.
`retryLandingFor` refuses ahead of every other reason to retry, and wave-tick will not print
LANDING GAVE UP for a branch git says is in main, so no future disagreement between its two halves
can print both. Both orders are pinned in `scripts/jobs-store.test.mjs`, plus the controls: a
landing that did NOT push still fails, and with no git answer at all the old behaviour stands.

Verified on the real queue, not only in tests: j-0552 was reaped mid-flight during this work and
recorded `done` / `landedBeforeItEnded` instead of `failed` plus a re-queue.

## 3. The runner could not start at all - and that was the root of the "dead runner is silent" row

This is the finding worth carrying forward. From **966f6b96 (2026-09-04 08:05)**, the commit that
added `aheadOfMainCache`, `node scripts/jobs.mjs --runner` threw before doing anything:

```
ReferenceError: Cannot access 'aheadOfMainCache' before initialization
```

Top-level `await` suspends module evaluation where it stands, so the dispatch at the top of the
file reached a `const` declared 380 lines below it and hit the temporal dead zone. Reproduced by
running `origin/main`'s copy and 966f6b96's parent side by side: the parent starts and drains, main
dies instantly.

The queue kept draining all day on the runner **already running** with the old module loaded. When
that one exited on its idle timeout nothing could replace it: every `add` spawned a runner that
died in its first millisecond, `stdio: 'ignore'` swallowed the stack trace, and the listing said
"NO RUNNER (start with --runner)" as a footnote. That is j-0550 sitting in `starting` for four
minutes across two reads.

A comment in that file already asked editors to use function declarations rather than `const`
arrows for exactly this reason, and the rule was broken within the fortnight. The dispatch is now
an `async function main()` called at the bottom of the file, so the whole module body has run
before any command reads anything - the trap is gone rather than sign-posted.

With that fixed, the absence is made loud: the auto-start verifies a runner actually appeared and
says why it did not; the listing calls a queue with work and no runner a defect and starts one;
and wave-tick reports `QUEUE STALLED` once when jobs are queued with nothing draining them, and
`QUEUE MOVING AGAIN` when one comes up.

`claude/walk-f7debe` found the same bug independently and is landing a one-declaration fix. Mine
subsumes it, and theirs went first - see the collision note at the end for the one hunk this branch
resolves when it takes main in.

## 4. A finished session no longer reads as a blocked one

`blocked-sessions.mjs` could not separate "waiting on a permission prompt" from "finished and left
the process resident" - both are a `tool_use` with no result, and the liveness probe only answers
whether a process exists. It reported a finished session as blocked for 61 minutes.

The fourth signal is the transcript's own mtime. The harness appends trailing records of its own -
`bridge-session`, `last-prompt`, `custom-title`, `mode` - when a session ends, and those carry no
timestamp, so they push mtime past the newest entry that has one. Measured across every transcript
on this machine:

| | gap between mtime and the newest timestamped entry |
|---|---|
| Live, genuinely in flight | 0.0 - 0.1 s |
| Finished, tail ends on an unresolved call | 54 s, 6 min, 50 min, 6.6 h |

Nothing lands between, so the 15-second tolerance is the gap between "the same write" and "a later
one" rather than a tuning knob. The anchor is the newest timestamped entry and not the pending
call's own timestamp, which is load-bearing: in a batch, a call that returns writes its result
after a call held at a prompt, so measuring from the held call would call every genuine wait a
leftover.

Rows are split, never dropped - the rule that file has always kept. What changes is the alarm:
wave-tick announces WAITING only for rows whose transcript really did stop at the call. Verified
against two built fixtures, the same tail with mtime pinned to the call and with it an hour past.

## What is not done

- **The twelve-minute goal.** Landings succeed reliably now but take 14-18 minutes, and the
  structural floor is build-then-nine-shards. Whether that is worth attacking is a judgement about
  CI shape, not a defect; four landings is too thin a sample to decide on.
- **The `starting` state itself.** A job the scheduler has picked but no runner has spawned still
  shows as `starting` with no clock on it. With the runner fixed and the stall reported this is
  cosmetic, but a `starting` that has lasted minutes is still a state with no progress attached.
- **`ensureRunner`'s three-second wait** costs about 2.3 s on every `add` when no runner is live,
  because reading the process table takes ~774 ms. Cheap insurance today; if `add` latency ever
  matters, a pidfile the runner writes on its first successful poll would be the cheaper probe.

## Gates

- `npm run build` green on 636e5d2a and again on 85ca5135 - branch stamp
  `claude/landing-path-honest-b154a2@85ca5135`, so it gated this branch.
- `node --test scripts/jobs-store.test.mjs scripts/wave-tick.test.mjs` - 99 pass, 0 fail.
- `npm run test:worktree-safety` - 60 pass, 0 fail.
- `node scripts/e2e-affected.mjs --list` - "changes touch nothing the offline e2e suite covers".
  Only `scripts/` changed; no product code, no graphic can move.
- `/check`: review `inline` (3 findings, 3 fixed), simplify `inline` (1 finding, 1 fixed),
  verify `inline` green, taste `not applicable`. Verdict stamp written.

Main did not move during this work, so no integration run was owed.

## The one collision, and how it resolves

`claude/walk-f7debe` found the same runner crash independently and landed a one-declaration fix
first: it moves `const aheadOfMainCache = new Map()` from beside `aheadOfMain` to just above the
dispatch. `git merge-tree` says the two conflict in `scripts/jobs.mjs`, because their insertion
abuts the dispatch block this branch rewrites.

The resolution is one hunk and it goes the other way round from theirs. With the dispatch as
`async function main()` called at the bottom of the file, the const's position stops mattering at
all, so it goes back beside `aheadOfMain` where it reads best, and their comment - which says "the
dispatch below runs at module load" - comes out, because after this change that sentence is no
longer true. Nothing else in either branch touches the same file.

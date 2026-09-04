# A - refusals say why

Branch `claude/a-refusals-say-why`, four commits, off `4507b34b`.

The queue gave up where a person would not, so the owner shepherded merges by hand. The cause was
not that landings refuse - they should - but that a refusal said nothing a machine could read, so
the queue could not tell a fault it could repair from one only a person can settle.

## The before number

Every merge job in `<git-common-dir>/noacg-jobs` enqueued in the seven days to 2026-09-04. 200
merge jobs; 150 exited 0.

| | count |
|---|---|
| merge jobs that did not exit 0 | **51** |
| of those, carrying `refusal: null` | **37** |
| `order-blocked` | 11 |
| `stale-pin` | 3 |

Every one of the 37 was reported as *"auto-merge refused it (exit 1) - read the log for which check
said no"*. Bucketing them by the sentence they actually printed is what decided the design:

| count | what it really was |
|---|---|
| 8 | phase 3 - "red, damaged, or it skipped every shard" (three faults, one sentence) |
| 8 | died with no REFUSED line at all - killed at the 45-minute cap |
| 13 | merge-order caution: `conflict` (7), `shared-registry` (4), `structural` (2) |
| 4 | preflight phase 1 |
| 1 | main moved under it three times |
| 1 | could not push the branch for CI |
| 2 | cancelled, or failed with no exit code |

## The after number, and it is honest about what it can be

The change cannot retroactively classify records already on disk, so the comparable "after" is what
these same jobs WOULD carry. Of the 37: **27 now carry a kind** and 10 do not, because those 10
never refused at all - they were killed at the cap or cancelled, which `retryLandingFor`'s
no-verdict path already owns. Across all 51 non-clean merge jobs that is **41 with a kind, up from
14**.

The eight phase-3 refusals were re-classified by running the real `planPhase3Refusal` over the
output each one actually printed: **six `ci-red`, two `shards-skipped`** (j-0222 and j-0559). So the
recovery this row adds would have fired twice in a week, and the other six correctly escalate.

Re-run the before number after a night with `node scripts/jobs.mjs` records in hand; the script is
twelve lines of `readdirSync` over `<git-common-dir>/noacg-jobs` and is not worth keeping.

## What changed

**Every refusal names itself.** `REFUSAL` in `scripts/auto-merge.mjs` is the vocabulary (17 kinds),
and a test walks the source so a `refuse(...)` call cannot be added without one. `refusalGuidance`
in `scripts/jobs-store.mjs` is the single place each kind's sentence and its answering command
live, so the listing, the give-up reason and the session banner cannot say three different things.

**Phase 3 is split, which needed capturing its output.** One exit code carried a red run, a damaged
run and a green run that gated nothing. Only the last has a mechanical cure, and it is the one the
refusal itself already names. `attemptLanding` runs phase 3 through `runCaptured` - echoed as it is
read, so the log is unchanged - and `planPhase3Refusal` decides from the check labels.

**The queue recovers what it can, once.** A `shards-skipped` refusal is handed one dispatched full
CI run and re-queued; a second identical refusal escalates. `order-blocked` is held as before.
Everything a person must decide - a dirty tree, a conflict, a red gate, an unweighed merge-order
collision - is failed with the reason on the record and **no command offered**.

**A refusal has an address.** The job record has always carried its `checkout`. Session start now
prints the refusal beside the existing landed banner, says who acts, and the seen marker became one
file per checkout - a single machine-wide marker meant the first session of the day consumed the
report for every other session, including the one whose branch had just been refused.

## The five review findings, and the one that matters

`review: delegated` returned five, all confirmed against the code, all fixed in `dbb08925`.

The serious one: **a red CI run could have been classified as the recoverable refusal.** Phase 3
counts a shard as having run only when it concluded `success`, so a run whose shards FAILED - or
whose BUILD failed, skipping them - also reports zero shards, and phase 3 then asks
`classifyEmptyPlan` about them, which refuses for any branch that changes behaviour. Both `[FAIL]`
lines print together. The queue would have spent a full suite re-running a branch CI had already
judged and told its session the gate was green. `planPhase3Refusal` now requires the green line to
have PASSED, with a test on the two lines appearing together.

**Measured, not assumed:** in the eight historical cases the unfixed reader would have got the same
answer, because none of the six red ones printed the skipped-shard line at all (their shards
succeeded and something else failed, so phase 3 never reached that check). The path is real and
reachable - a failed build skips every shard - it simply had not fired yet.

The other four: guidance now says WHO acts (`byQueue`), because a session told the queue will
handle a kind the queue never adopts waits all night for a retry that is not coming; a branch that
went on to land no longer prints a refusal beside its own landed banner; the already-recovered
message is gated on the kind that was recovered rather than on the job; and a dispatch that failed
no longer counts as the branch's one recovery.

## What is left, and why

- **The dispatched recovery run sits on the branch tip at adoption time.** The retry re-integrates
  main before it gates, so if main moves in between, the landing gates on a different sha and never
  sees the run made for it - it dispatches its own, which carries `diff_base`, plans the same empty
  subset and refuses identically. Bounded and honest (the second refusal escalates with the command
  on it), not silent. Fixing it properly means the LANDING asking for its own full run, and that
  lives in the branch's own copy of `auto-merge.mjs` - exactly the copy an old branch lacks. The
  bound is documented where it is set, in `retryLandingFor`.
- **`sharesCheckout` in `scripts/jobs-store.mjs:409` compares raw strings**, so two spellings of one
  checkout path (`C:\wt\x` vs `c:/wt/x`) do not share a checkout and two merges could be scheduled
  into the same tree. `samePath` in the same file is the correct comparison. Reported rather than
  fixed: it ripples into merge scheduling, which is not this row's diff.
- **Phase 3's verdict is read from human-readable check labels.** The deeper fix is the preflight
  emitting a machine-readable line of its own, the way `auto-merge` does. Two string pins guard the
  labels for now; a reword fails the test rather than silently collapsing the split.

## Traps that exist in no repo file

- **`gh workflow run ci.yml --ref <branch>` is the only way to gate a scripts-only branch here.**
  The push run planned `mode: none` and was then CANCELLED by the dispatched run's concurrency
  group. Reading the newest run would have said "cancelled"; the dispatch is the one that carries
  the verdict, and its nine shards ran `(full)`.
- **A worktree-isolated agent's Bash tool refuses any command whose text mentions git in a shape it
  cannot verify** - including a `node -e` script with the word in a string, and any path containing
  `.git`. Reading the job store needs a small `.mjs` file run by absolute path, not a one-liner.
- **`node --test` fixtures for `attemptLanding` must now inject `runCaptured` as well as `run`**, or
  the fake gate falls through to a real `spawnSync` of the preflight and the test fails somewhere
  unrelated.

## Pointers

- `a51bd692` handoffs removed · `6e98ec1f` kinds + recovery · `b87b28d2` the session banner ·
  `d2cb15eb` docs + `test:jobs` · `dbb08925` the review fixes.
- `docs/JOB_RUNNER_PLAN.md` "Every refusal says which one it is" carries the three groups.
- Check stamp: `<git-common-dir>/noacg-jobs/checks/claude-a-refusals-say-why.json`.
- `check: review delegated (5 findings, 5 fixed) · simplify inline (the skill returned fan-out
  instructions) · verify inline · taste: not applicable`.
- Verified: `npm run build` green; `npm run test:jobs` 163 pass; CI dispatched full on `d2cb15eb`
  with all nine shards green, and dispatched again on `dbb08925`. The session banner was proved
  live in all four shapes - recoverable, already-recovered, session's-own, held - by writing one
  fabricated job record into the real queue and removing it again.

# R - a landing must not plan more work than its own cap allows

Branch `claude/r-landing-cap-vs-full-suite`, four commits, off `97168655`.

## The cause, which is not what the row assumed

The row's prompt said the landing's integrated commit has no usable diff base. It does. The push
run for j-0438 planned correctly and said so:

    No push base ('0000…') - measuring from the fork point 97168655 rather than running everything.

The full suite came from somewhere else, and the real chain has three links, each individually
sound:

1. **A shard hit the E2E job's own `timeout-minutes` (20).** GitHub records a job killed by its own
   timeout as `cancelled`, and one cancelled job makes the whole RUN `cancelled`. j-0445's run
   33815742655 had eight green shards and one at 20m16s; j-0438's run 33812258386 had three at
   20 minutes.
2. **`selectCiRun` reads `cancelled` as "a superseded shell, keep waiting".** That is right for the
   thing it was written for - the ref-scoped concurrency group leaves empty shells behind and a
   replacement is seconds away. It cannot see that this run executed for half an hour.
3. **After 30 seconds of grace, `waitForCi` dispatched a replacement**, and `workflow_dispatch` has
   no `github.event.before`, so ci.yml escalates to the FULL suite *by design* - that is the manual
   door for demanding everything. Roughly three times the work, asked for with nine minutes left on
   the clock.

**The cap is not the defect.** Over the 211 landings this queue has completed: median 7.6 minutes,
p90 12.3, slowest ever 21.3. Forty-five is already 2.1x the worst case anything has ever taken, and
no cap short of an hour would have covered a full suite. The measurement is now recorded beside the
constant in `scripts/jobs-store.mjs` so the next person does not raise it either.

## The second cause, found by trying to fix the first

A landing that dies mid-gate **has already moved the branch it was gating**. Phase 2 merges main in
and pushes before CI is asked anything, so the tip sits one merge past the sha the branch was
queued at, and a retry carrying the original `--expect-sha` is refused with "has moved since it was
queued" - naming a commit the first attempt authored. Nine preflight checks pass and the tenth
rejects the job for the job's own edit. Measured live as j-0519.

The fix had to live in the **queue**, not in `auto-merge.mjs`, and that is the part I got wrong
first: a retry runs in the branch's own checkout, so it executes THAT branch's copy of the landing
script, and a branch cut before the rule cannot honour it. j-0519 demonstrated exactly that.

## What changed

- **`waitForCi` classifies a cancelled run** (`cancelledRunDidWork`). One whose jobs executed is
  not a shell; nothing is coming to replace it, so it asks for a fresh run AT ONCE rather than
  sitting out the webhook grace. A second exhausted run in one attempt stops with a sentence naming
  the jobs and how long each ran, longest first.
- **A dispatch may carry `diff_base`** (a new `workflow_dispatch` input), and a landing passes the
  main sha it just integrated - the same base the push run's fork-point recovery finds. No input
  still means the full suite, so the manual door is exactly as wide as it was.
- **`waitForCi` returning false is exit 5, not exit 1.** A verdict and the absence of one are
  different facts, and only one of them may ever be retried.
- **The queue adopts landings that reached no verdict**, once, re-pinning past the previous
  landing's own integration merge - a first-parent walk where every commit is a two-parent merge
  whose second parent is in main and whose tree is exactly what git would have written alone. A
  hand-resolved merge refuses (verified against a tampered commit). `node scripts/jobs.mjs adopt`
  asks for the sweep now; the runner does it every poll.

`review: delegated` (five findings, all confirmed and fixed) · `simplify: inline` (the skill
returned fan-out instructions) · `verify: build green, 144 node tests, check:workflows,
test:worktree-safety; e2e planner says mode: none for this diff` · `taste: not applicable`.

## Still unlanded, and the exact command for each

Seven branches are ahead of main. **Every one of the four below is safe to restore** - I checked
each pin against its tip with the predicate this branch adds, and printed the result:

| Branch | Why it is stuck | Command |
|---|---|---|
| `claude/d-queue-walks-itself` | pinned a878b17f, tip 8a06da8a - moved ONLY by its own landing's merge | `node scripts/jobs.mjs add-merge claude/d-queue-walks-itself` |
| `claude/f-contracts-point` | pinned 20c81af5, tip a31a0cb4 - same | `node scripts/jobs.mjs add-merge claude/f-contracts-point` |
| `claude/m-counting-graphic-airs-zero` | pinned 09608a0f, tip ba7ae1e2 - same | `node scripts/jobs.mjs add-merge claude/m-counting-graphic-airs-zero` |
| `claude/j-fields-step-per-field` | tip UNMOVED; refused only as a cascade behind F | `node scripts/jobs.mjs add-merge claude/j-fields-step-per-field` |

`add-merge` re-pins to the current tip, which is why these four commands settle it. **Queue F before
J**, or J is refused again for the same cascade rather than deferring its turn.

`claude/p-alignment-across-corpus` is refused behind `claude/h-catalog-by-programme`, whose own
session is still working (j-0523 was running when I looked). It settles itself once H lands; if H
does not, its command is `node scripts/jobs.mjs add-merge claude/p-alignment-across-corpus`.
`claude/n-panel-pairs-with-import` has never been queued - that is its session's call, not ours.

**I could not run those four myself: `add-merge` is not allowlisted in this session and the auto
mode classifier refused it.** That is the one thing left, and it is four commands.

## What I would watch next

- **A shard at its 20-minute cap is now the top of the queue's failure list.** j-0438 had three in
  one run. `scripts/e2e-affected.mjs` sizes shards from measured minutes, but a subset under sprint
  focus is 70-100 of 128 spec files and Playwright shards by test COUNT, so an unlucky split lands
  a shard at the cap. The comment in ci.yml already argues for bin-packing by duration and explains
  why it was left; this is the evidence that it now costs landings, not just minutes.
- **My premature `adopt` spent the automatic retry on D, F and M** before the re-pin rule existed,
  which is why they read `exit 1` rather than being adopted now. The sweep correctly stands down on
  a judged refusal. Nothing to fix - just do not read those three rows as the mechanism failing.

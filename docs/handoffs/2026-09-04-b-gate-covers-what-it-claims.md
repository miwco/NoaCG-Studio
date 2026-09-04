# B - the authenticated tier runs on every landing, and a graphic costs a millisecond

Branch `claude/b-gate-covers-what-it-claims` (renamed from the worktree's auto-generated
`worktree-agent-a5f8412cb672d12a1` as the row's first step).

## 1. The configured tier: the red was already fixed, and I found what fixed it

**Not reproducible, because the cause was found and fixed before this row started.** The prompt's
premise - `imported-quiz-output.spec.ts` red since 2026-09-03 - was true this morning and is not
true now.

The cause is `443924df`, "Stop corner notices from painting over the app's dialogs" (2026-09-03
11:26, after the red run's sha and before the green one's): the analytics consent banner carried a
bare `z-index: 1200` against a dialog layer of 140, so it sat over all sixteen of the app's dialogs
and took the wizard's "Add it and go there" click. That is exactly the reported symptom - the
button resolves in the DOM and never becomes actionable, identically on 426 retries. It was a
PRODUCT fault, not a spec fault, and the fix landed a named layer scale in `src/styles/base.css`
plus `e2e/overlay-layers.spec.ts`, which runs in the offline tier on every push.

**Verified green twice, not assumed:**

| run | when | result |
|---|---|---|
| 33841739638 | 2026-09-04 05:46, main | 39 tests, 4.2 min, no retries, nothing skipped |
| 33911280428 | 2026-09-04 19:27, main's tip `3fd40d15` | 42 tests, 4.3 min, no retries, `imported-quiz-output` 25 s |

## 2. It now runs on every landing, and the shape is a decision

The backlog file named two shapes and asked for the tier's duration first, because that number
decides it. It is **4.2 minutes of Playwright inside a 14.3-minute job**, and 7.7 of those minutes
were `npm ci`.

**Chosen: `push` on main.** The argument is ATTRIBUTION, and this break is the evidence for it. The
file that caused it was a stylesheet for a corner notice - no honest surface rule for "the hosted
quiz output" would ever have named it, and a per-change plan only runs what a change LOOKS like it
can break. Packing the tier in would also mean standing a Supabase stack up inside every gate job,
minutes on every change, to reach a surface a landing-time run reaches once.

Three properties that make it additive, which was this row's one unbendable rule:

- **It gates nothing.** `scripts/auto-merge.mjs` reads `ci.yml` alone (`main-health.mjs` opens no
  other workflow), so a failed Docker pull here cannot freeze the queue. No sibling branch can go
  red on it.
- **It adds latency to nothing.** Nothing waits on it; the verdict lands on the rolling issue this
  workflow already owns, minutes after the landing.
- **Each landing gets its own concurrency group.** The machine-wide group would have GitHub hold
  one pending run and cancel the rest, so on a twenty-landing day a verdict would cover an unknown
  handful of commits - the attribution thrown away again.

`hosted-latency.yml` runs the same specs, so both now install through
`./.github/actions/node-modules` instead of a bare `npm ci`. That is the 7.7 minutes.

**One consequence of the trigger, handled.** The rolling issue's repeat suppression was written for
a once-a-day cron, where "a real failure posts however many times it repeats" is a reminder. At
twenty-five landings a day it is fatigue: a break that takes five landings to fix would post five
identical comments and five emails inside an hour. So on a PUSH run any byte-identical repeat of
the latest finding is withheld - a hard failure and a stack that never came up included, since the
marker names that state too. The schedule keeps the old always-post rule, the run still goes red,
the issue stays open, and a DIFFERENT finding always posts however it arrived. That last line is
what keeps this from being "downgrade failures to warnings"; the truth table over every combination
that reaches the condition is in the comment beside it.

## 3. What one more graphic costs, as a number that prints

The owner's condition on the weekly drawing cadence, answered by `npm run check:catalog-cost`. It
measures the build-side halves live - through `prerender.mjs`'s own loader and page loop, not a
copy of them - and carries the CI slope from two real `catalog-gates` runs differing only in
scope, one design against the whole catalog on the same workflow and runner class
(33898338599/33900304138 against 33896869659). **At 502 designs:**

| what pays | when | per design | today |
|---|---|---|---|
| prerender page loop | every build | **~1 ms** | 0.5 s for 502 pages |
| rendered catalog sweeps | only a change that can move a design, and only its designs | **1.25 s wall** | one design 0.5 min; whole catalog 10.9 min wall / 15.1 runner min |
| client bundle | whoever opens a page that pulls the chunk | **7-18 KB** | see below |

**Design 503 costs a millisecond on every build and nothing on an ordinary catalog change**,
because `catalog-affected.mjs` scopes that run to the designs the change can move. The slope only
applies to a FULL sweep, which happens when a SHARED file changes: 13.0 minutes at 600 designs
against 10.9 today. That is the only line that grows, so it is the one to re-measure - two
dispatches, fifteen minutes, no laptop, and the command is in the script's header.

**The bundle half found a real defect, and my first version of the check reported the opposite.**
It looked at `index.html` and `app.html`; this is a ten-page MPA. Enumerating `dist/*.html`
instead: `/ograf` statically pulls **both** catalog chunks from its own entry script (3.7 MB, 502
design ids between them) and `/bridge` pulls one (2.3 MB). `/app` reaches its chunk through
`await import(...)` after boot and `/` reaches none. Filed as
`docs/backlog/ograf-and-bridge-ship-the-whole-catalog.md` - a chunking fault on two pages, not an
argument for a smaller gallery. The code-review leg caught this; I had already written the wrong
claim into three docs and a walk item.

**The cadence cap in `docs/CATALOG_BY_PROGRAMME.md` §10 is lifted**, on its own terms ("until that
file has an answer"), with the `/ograf` finding named beside it. The owner has both in his walk
queue and can say otherwise.

## 4. Row E's two follow-ups

**The catalog plan takes the fork point after a merge.** `merge-base HEAD main` IS main's tip once
a branch has taken main in, so the pre-land catalog gate was planning only the branch's own designs
- the silent failure, since naming too FEW designs measures a smaller slice and nothing goes red.
`catalog-affected.mjs` now resolves it from `e2e-affected.mjs`'s implementation rather than a
second copy: `branchBase`, `headIsMainMerge` and `integrationBase` are exported and take the
repository to ask, because catalog-affected pins its git calls to the repo root and a base resolved
in one repository and diffed in another is a crash rather than a smaller answer. The ordinary base
also stops hardcoding `main`, which does not exist on a CI checkout of a feature branch.

`catalog-gates.yml` passes `--integration` on the branch path rather than relying on HEAD being the
merge commit: this repo commits each verified step, so one commit after `git merge main` and the
automatic trigger stops firing. **Expect wider catalog plans after a merge.** That is the point,
and `--no-integration` is the escape.

**`nightly-drift.yml` watches the catalog-gates cron.** Its two jobs were near-copies before a
third was wanted, so they are one matrixed job now, markers kept byte-identical so open issues keep
their dedup history. Proved by dispatch (run 33915167710): all three legs ran independently, the
nightly and configured legs green, and the catalog-gates leg correctly red.

**It filed issue #54, "Catalog gates are not running on their schedule", and that is true.** That
cron landed on main around 18:00 today and first fires at 11:50 UTC tomorrow, which closes it. If
it does not close, the schedule genuinely is not firing and the issue is the report you wanted.

## 5. The duration table

Re-recorded from run **33905531739** at main's tip: 147 specs, 102.8 minutes, overhead 0.5 min per
job at p90 across nine shards. The previous recording was six hours and about a hundred commits
older, and the packer bin-packs shard assignments from these weights, so a stale table costs a
lopsided shard rather than only wall clock.

## The check chain

- `review: delegated` - code-review at `high`; the result came back into this conversation and
  passed the scope check (right branch, merge-base `3fd40d15`, all files in the diff). Six
  findings; five fixed after verifying each against the code, including the two HIGHs above, which
  were mine and were wrong in the owner-facing direction. **The one not fixed** is a dangling
  pointer to a deleted backlog file inside another session's handoff
  (`docs/handoffs/2026-09-04-v-file-todays-findings.md` names
  `docs/backlog/authenticated-e2e-tier-red-and-ungated.md`). A handoff is a dated record, and
  deleting the backlog file is the documented way such an item lands - `owner-receipts --closed`
  reads it back out of git.
- `simplify: inline` - the skill returned fan-out instructions, which per `.agent-workflows/check.md`
  means the pass did not run, so it was done here over the four angles. One finding fixed: the
  bundle check held all 135 chunks and 22 MB of minified JavaScript in a map when both its passes
  want two small facts per file; it now reads each chunk once and keeps those.
- `verify: build + CI` - `npm run build` green on every committed state, 62 planner and prerender
  unit tests, and **three CI runs read for WHICH JOBS RAN**, because a green run is not a verdict
  until you do:
  - **33917292933** on `daa58cca`, dispatched: all nine E2E shards `(full)`, the catalog
    calibration gate, Build, Factory gates, CI gate. The push run on that same sha had planned
    `mode: none` and skipped every shard - correct for a docs-and-workflow delta, and exactly the
    trap in `AGENTS.md`, so the dispatch is the verdict. It also cancelled the push run, which is
    the other half of that trap and why nothing was pushed while it ran.
  - **33919456762** on the merge commit `c72756e5`, planned from the FORK POINT - see below.
  - `catalog-gates` **33917057800** and `nightly-drift` **33917059933**, dispatched on the branch,
    because a workflow edit that no run has executed is not verified. The catalog plan step ran on
    a real CI checkout with no local `main`, printed `Planned against base 3fd40d15` and escalated
    correctly, which is the half of the `origin/main` change a laptop cannot prove.

## Taking main in

Five commits landed while this row worked, so `main` came in as `c72756e5` and the branch was
re-verified from the fork point rather than on a clean merge. `catalog-affected` announced its own
new behaviour on the real repository - `INTEGRATION base 3fd40d15 - this branch has taken main in`
- which is the change of §4 doing its job outside a test. Build green on the merged tree; CI run
**33919456762** is the fork-point verdict.
- `taste: not applicable` - nothing in this diff can move what a graphic looks like. No template,
  no fit or alignment code, no SVG import road; the only rendered thing touched is the prerendered
  marketing page's generation loop, which emits the same bytes.

## What I would do next

1. **`/ograf` and `/bridge` ship the whole catalog.** The backlog file names the entry chunk to
   start from. It is the only place in the product where a visitor pays for graphics nobody opened.
2. **`prerender.mjs` opens an HMR websocket it never uses.** Every build prints a port-in-use error
   when two run at once. `server: { middlewareMode: true, hmr: false }` is the whole fix; left
   alone here because it is outside this row and the build is green with it.
3. **Re-measure the full sweep when the catalog passes ~600.** The command is in
   `scripts/catalog-cost.mjs`'s header, and it costs two dispatches.

## Pointers

- `scripts/catalog-cost.mjs` - the check, with the measurement's provenance and how to redo it
- `docs/TEST_SELECTION.md` - "The configured tier" (the landing-run decision and its numbers) and
  "What one more graphic costs"
- `docs/acceptance/owner-queue/2026-09-04-what-one-more-graphic-costs.md` - the owner's answer
- `docs/backlog/ograf-and-bridge-ship-the-whole-catalog.md` - the defect the measurement found
- `.github/workflows/configured-suite.yml` - the header carries the shape decision in full
- `scripts/e2e-affected.mjs` - `branchBase`, `headIsMainMerge`, `integrationBase`, now shared

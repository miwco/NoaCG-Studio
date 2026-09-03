# H - what zero first-pass actually meant

Branch `claude/h-first-pass-truth`. The delegation ledger read 0 first-pass out of 6 over 24 hours
across every pool, our own Opus included, and 1 out of 11 over its whole life. The row asked which
was true: the metric is miscalibrated, or the work really is arriving defective.

## Per-line classification, all eleven

Classified by hand against each line's own notes and the handoff of the wave that produced it.
Outcome and cause are the new vocabulary this branch introduces.

| # | label | pool / model | outcome | cause | why |
|---|---|---|---|---|---|
| 1 | `svg-growth-default-audit-r2` | agy-gemini / 3.7-flash-high | repaired | worker | Wrong on 4 of 20 rows; assumed a behaviour veto the repo's own measured list contradicts. Opus repaired. A first call also died to an auto-denied permission. |
| 2 | `q-task-c-jobs-notready` | codex / gpt-5.6-sol | clean | - | Landed `02a4f722`. Reproduction built before the spec and handed over in it. The only unambiguous pass on the old flag. |
| 3 | `q-a1-jobrunner-ram-floor-dedup` | agy-gemini / 3.7-flash-high | reviewed | - | Landed `f796282f`. Its own note: "diff itself was exactly right, zero repairs". The review finding was a `file:///` citation and a miscount in its self-report - the delivery, not the work. The retry before it was our undeclared tool set. |
| 4 | `q-a2-logo-fixtures-gemini` | agy-gemini / 3.7-flash-high | repaired | worker | `growth=shrink` against the authoring doc, prompt text pasted into 2 provenance comments, an Illustrator name missing the `_x20_` escape. All 8 mechanical conditions passed. |
| 5 | `q-b-logo-fixtures-pool2-sonnet` | agy-claude-gpt / sonnet-4-6 | repaired | worker | `growth=grow-x` twice against the README, another `_x20_` miss. Attempt 1 was refused free because we passed `--effort` to a pool that takes none. |
| 6 | `landing-gate-truth` | claude-max / opus-5 | repaired | worker | Two real defects in an Opus first pass at the give-up message, found by its own `/check`. **The first pass at this table put it in the good column - see below.** |
| 7 | `reclaim.mjs draft attempt 1` | agy-claude-gpt / sonnet-4-6 | unusable | prompt | Returned a plan: `--read-only` maps to `agy --mode plan`, and the prompt did not forbid asking. Zero usable code. |
| 8 | `reclaim.mjs draft attempt 2` | agy-claude-gpt / sonnet-4-6 | unusable | prompt | Empty again. Writer's own words: "Two compounding setup errors on my side" - still plan mode, and paths naming the main checkout rather than the worktree. |
| 9 | `g-docs-a-person-wrote` | agy-claude-gpt / opus-4-6-thinking | repaired | worker | 5 of 12 passages clean; 4 needed repair; P7 was a real regression - an opener cut to a pronoun with no referent. Every mechanical condition passed. |
| 10 | `ticker-kicker-sweep` | agy-gemini / 3.8-flash-high | clean | - | The retry matched a hand-derived answer on all 22 rows in 42.5 s. The first attempt was auto-denied for a directory walk. |
| 11 | `counting-mechanism-sweep` | agy-gemini / 3.8-flash-high | unusable | prompt | Every tool call auto-denied; the question genuinely needed a traversal headless `agy` cannot do. The model never read anything. |

Totals: 2 `clean`, 1 `reviewed`, 5 `repaired`, 3 `unusable`. Eight attributable to a worker, three
of those accepted.

## Which hypothesis won, and by what margin

**Five to five, not six to four.** Of the ten rows the old flag scored as failures, five carry no
evidence of a worker shortfall (3, 7, 8, 10, 11) and five are real worker defects (1, 4, 5, 6, 9).

The metric was still the larger single fault, because the failures split by kind rather than by
degree: one row was scored a failure for a note on its own self-report, and three produced nothing
because of how we invoked them. But "the metric was wrong and the work was fine" is only half true.
**Where a delegate produces an artifact to a spec, the defects are real, they are content defects
rather than mechanical ones, and no acceptance condition we wrote caught any of them.**

**The uncomfortable finding is about us. Seven of eleven rows burned at least one call on our own
spec or invocation** - plan mode, main-checkout paths, an undeclared tool set, an `--effort` flag
the second Antigravity pool does not accept, and twice a directory walk that is auto-denied. Three
produced nothing at all. That is the biggest single source of wasted delegation on this ledger.

**And the first pass at this table was too kind to us.** It put row 6 in the good column because
that row fixed its own defects inside the session, so nothing had to be redone - a standard not
extended to any Antigravity row. That is precisely the bias the exercise was meant to catch, and it
survived until the vocabulary was applied to this row's own work. It is why the boundary now falls
where it does.

## The definition written

At `scripts/delegation-outcome.mjs`, the one writer. `--first-pass` was a free-form yes/no defined
nowhere, so three unrelated results collapsed into "no": the delegation never ran, the artifact had
to be fixed, and review noticed a typo. The third alone guaranteed a zero, because `/check` runs on
every row and finding something is what it is for.

- `--outcome clean` - accepted exactly as delivered.
- `--outcome reviewed` - landed as the worker wrote it; review notes changed nothing about the
  artifact. **A pass.**
- `--outcome repaired` - the artifact had to change after review before it could land. **Judged on
  whether the work changed, never on who changed it** - `--redone-by` already records who, and
  defining the outcome by it let a model that fixed its own defects score as a pass.
- `--outcome unusable` - no usable artifact came back.
- `--cause worker | prompt | capacity`, required on `repaired` and `unusable`. A `prompt` cause is
  evidence about the delegating session, and the reader excludes it from worker quality.

`--first-pass yes` still means `clean`. `--first-pass no` is refused outright. The eleven existing
lines are untouched: the one carrying an unambiguous `true` reads as `clean`, the other ten read as
**not classified** rather than being back-fitted into a vocabulary that did not exist.

`npm run harness:usage` no longer prints a bare `0/6`. It gives a four-way tally that sums to the
task count, an acceptance rate stated only over rows that are evidence about the worker, a named
list of what it excluded and why, a separate count of every row a prompt defect touched, and it
calls a fraction over fewer than three rows an anecdote.

## What routing changed, and what it did not

Only one line moved, and it stayed the same length so the orchestrator's common path stays inside
its 640-line budget. `routing.md` replaced an unmeasured instruction - read a low rate against the
prompts before routing away from a pool - with the measured seven-in-eleven figure and a pointer at
the reader's new `ours` column, which now does that exclusion mechanically instead of asking anyone
to remember it. `ORCHESTRATION_NEXT` §6's relaxation threshold now requires its run of accepted
outcomes to be over attributable rows.

**No routing doctrine moved.** Eight attributable rows across six task classes and five models is
one or two rows per pool per class.

## What I would need before changing routing doctrine

1. **Three or more attributable rows for a single (pool, model, task class)**, prompt defects
   stripped out. Today the largest such cell has two. That needs a run of waves under the new
   vocabulary; nothing can be back-filled, because the old flag genuinely does not carry it.
2. **A separate reading of the seven-in-eleven invocation rate after the known causes are fixed.**
   Until a prompt defect is rare, every pool's numbers understate it by an unknown amount, and the
   understatement is not uniform across pools - the two pools with the most invocation failures are
   the two we have used least, so we know their prompts least well.
3. **For fixture generation specifically, an acceptance condition that catches a content defect.**
   All five worker-defect rows passed every mechanical condition written for them. Until a
   condition exists that would have failed them, a clean delegated artifact is weak evidence, and
   raising the volume on that class raises the repair load rather than the throughput.

## State

Three commits on `claude/h-first-pass-truth`, pushed. `npm run build` green; 77/77 in
`scripts/harness-usage.test.mjs`, including regression tests for both HIGH review findings. CI run
33752215015 read by job on `6754ded7`: Build, Factory gates, E2E plan and CI gate all success;
shards skipped because the plan was `mode:none` over exactly these 7 files, which is correct for a
scripts-and-docs change and not a cancelled replan. No product code, so no e2e applies.

`/check`: review `delegated` (6 findings, all 6 confirmed and fixed - two HIGH data-loss defects in
the label merge this branch introduced), simplify `inline` (the skill returned background fan-out
instructions, which never deliver in a launched session), verify `inline`. Verdict stamp written.

This row's own outcome is on the ledger as `repaired` / `worker`, which is what applying the
definition honestly to its author produces.

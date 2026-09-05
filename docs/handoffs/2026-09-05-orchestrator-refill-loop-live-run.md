# The refilling loop's first live run - what it measured, and what it got wrong

Session of 2026-09-05, a day wave (13:44-17:30 local) whose stated point was the LOOP, not the
rows: the refilling, event-driven loop landed that morning (`main` 1765fcfe) and had never run.

The wave-state file with the full narrative is `docs/handoffs/2026-09-05-day-wave-plan.local.md`
in the orchestrator home - gitignored by design, so it is on this laptop only. This file carries
the parts that must outlive it.

## It worked

Five rows planned (Q, R, S, W, X), five launched, five landed. Two refills off
`node scripts/candidates.mjs`, both picked and both justified by the instruments rather than by a
read of the clock. The loop stopped when `wave-horizon` said so - *"Launch nothing more, let what
is running land, then report"* - with candidates Y and V never launched. Nine landings through the
queue in the day. 201 ticks, last at 15:20Z; the loop has died at the first tick on both previous
nights and did not this time.

Both watches earned their arming on the first day: `ci-watch` caught a red `main` within a minute
and again that afternoon, `wave-watch` caught every landing, both withdrawn landings and three
finished-looking flags.

## The measurement that changes the next wave

Launch-to-queued, from `node scripts/wave-launch.mjs list`, against the seeds the horizon was
using (standard 160 min, small 80):

| row | size | queued | landed |
|---|---|---|---|
| Q | standard | 42 | 45 |
| R | standard | 71 | 73 |
| S | standard | 128 | 140 |
| W | small | **76** | 105 |
| X | small | **106** | landed |

**Every standard came in under its seed; both smalls came in at or over it.** The horizon was
therefore saying "small still fits" late in the window while small units were quietly taking
longer than modelled - the optimistic direction, which is the dangerous one for an unattended
night. **Raise the small seed before the next wave trusts a late-window fit.**

## What it got wrong, filed on main

Three landed as backlog files: `candidates-relaunches-a-unit-it-already-launched.md` (the refill
pick has no memory - it named a running candidate twice, an hour apart),
`guards-fire-on-prose-they-cannot-tell-from-code.md`, and
`a-dirty-worktree-blocks-a-landing-that-never-uses-it.md`.

Two more, which are not filed anywhere and belong to whoever plans next:

**A repair launch must never record as a launch of its branch.** `wave-launch list` keeps one
record per BRANCH and takes the later one, so two repair launches against branches that already
had records replaced the real entries. The ledger then reported a standard unit that took 128
minutes as a small one that took 5 - poisoning the horizon in the optimistic direction. Found and
removed the same day (backup beside the ledger), but the guard does not exist: either
`wave-launch record` refuses a branch that already has a record, or a repair carries a distinct
kind.

**The prompt contract does not tell a ROW what `pushback.md` tells the orchestrator.** A design
default is the row's to decide and never an owner question - that rule lives where the planner
reads it and nowhere the row does, so a row filed "four judgements that are yours" into an
owner-queue item and the planner repeated it. The fix belongs in `orchestrator/prompts.md`, an
every-plan module on a common path at 640/640, so it costs a line that must be found first. It
should land beside `docs/backlog/weekly-alignment-check-is-the-only-owner-gate.md`, not duplicate
it.

## The lesson, and it is the one worth keeping

**A completion notification is not a death certificate.** Rows S and W both reported finished,
went quiet for tens of minutes, then woke and completed their own work. Repair rows were launched
against both on the premise that their sessions were dead. Neither did damage: the first refused
its own assignment on evidence it gathered itself, and the second was stopped.

The liveness rule in `orchestrator/night.md` now takes three signals - the harness inventory, the
branch tip's age, and the transcript mtime - with any one speaking meaning alive, because the
inventory alone fails open for subagents and reported a row idle while it committed every four
minutes. That correction is real but it is not the durable form.

**The durable form: every repair prompt states its premise and instructs the row to refuse if it
is false.** The one row that carried that line is the entire reason the day cost nothing, and it
carried it only because the launch looked unusual. Make it standard.

A refinement the rule still wants: an INTERACTIVE session is a person's and can sit on a clean
tree for half an hour mid-thought; the fail-open that caused both misreads is specific to
SUBAGENTS. Treating them identically is also why one branch was flagged finished-looking three
times with nothing having changed.

## Also true, and not this wave's to fix

- `docs/svg-samples/poll.svg`, the sample the practice library already calls a live vote, cannot
  be bound as one (row X). We ship a live-vote sample that does not work as a live vote.
- A finished clock refills on an unrelated update, and it reaches EVERY catalog countdown, not
  just the new behaviour (row S).
- The catalog-gates schedule drift reported on 2026-09-05 was a FALSE ALARM: the cron reached main
  late on 09-04 and the 26-hour drift window mostly predated it. It has since fired on its own.

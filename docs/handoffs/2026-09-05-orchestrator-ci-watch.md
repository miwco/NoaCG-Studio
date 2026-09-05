# Orchestrator review, continued - the CI watch, and the login that needs a person

Session of 2026-09-05, picking from `docs/handoffs/2026-09-05-orchestrator-review-next.md`. Items
1 and 2 of that list were the work; item 1 stops at the owner's keyboard, item 2 landed.

## Item 2 - the continuous CI monitor (done)

`scripts/ci-watch.mjs` is `wave-watch` pointed at GitHub. Armed as a persistent Monitor beside
the wave watch, it polls `gh run list` for the WHOLE repo every 60 s and prints one line per
event, nothing else:

- `CI RED - <workflow> on <branch> (<sha>) - <failing specs> - <url>` when a run reaches
  `failure` or `timed_out`, once per run id. The failing specs come from the run's own check
  annotations through `ci-failure-set.mjs`, so the line sends a reader to a file, not a dashboard.
- `CI GREEN - main is green again on <workflow>` when `main` flips from red to green, so the
  queue's release is seen as well as its stop.
- `WATCH ERROR` once when `gh` stops answering, `WATCH RECOVERED` once when it does again.

A cancelled run prints nothing (not a verdict, `docs/VERIFICATION.md`). The first poll is a
baseline: reds older than `--since` minutes (default 60) at arming are history. Every line is
also appended to `<git-common-dir>/noacg-jobs/ci-watch-events.log`, the same reason the wave
tick keeps its own log - stdout can be lost to compaction.

Verified: seven unit tests (`scripts/ci-watch.test.mjs`, in `test:jobs` and the build), lint
clean, one live poll against the real repo (quiet, correctly - no red in the last twelve hours),
and the failure-set path exercised on the last real red run (`33917059933`, which names its
failing job). `night.md` now says to arm both watches; the common path stays at 640/640 because
the `/loop` history sentence moved out (it lives in `docs/ORCHESTRATOR_SIMPLIFICATION.md`).

Not measured yet: a red run arriving while the Monitor is armed. This session armed it; the
first real red will say whether the line lands within a minute as designed.

## Item 1 - CLI login (needs the owner, two minutes)

`claude auth status` still says `loggedIn: false`. The login is an OAuth flow that prints a URL,
opens the browser, and then waits for a code to be PASTED into the terminal that started it. A
session's shell has no stdin, so it cannot complete the flow - this session started it, got the
URL, and the process ended on EOF without a token.

What the owner does, in any interactive terminal:

```bash
claude auth login
```

then finishes in the browser and pastes the code. After that, `claude auth status` should say
`loggedIn: true`. The test the review asked for is the re-check a day later: if it still holds,
headless `claude -p` workers survive the session and the planner/watcher split (review item 4)
becomes buildable. The known risk stays: silent expiry (`incidents.md`, "the headless auth that
died silently"), so any wave that uses headless workers runs the status check the same day.

## What is next, in order

3. The first live night wave on the new loop - the real acceptance test, needs the owner's go
   and a planned candidate table before bed.
4. The two A/B experiments (who holds the watch; short vs long brief) - the first needs item 1.
5. Bigger tasks, fewer branches, with the CORE/TAIL split kept.
6. The alignment session, with the owner in the loop.

## State

Branch `claude/orchestrator-review-continue-c0d1cf`, queued for landing from this session.

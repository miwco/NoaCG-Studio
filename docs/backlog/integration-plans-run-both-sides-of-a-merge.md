# A landing's test plan runs both sides of the merge, and main's side has already been tested

**Filed:** 2026-09-04. **Source:** the selection audit in `docs/TEST_SELECTION.md`, written for the
owner's 2026-09-04 ask for intelligent test selection rather than more runners.

## Why

An ordinary landing produces the widest plan this gate ever makes, and most of that width is
re-testing something that already has a green verdict.

A branch that has merged `main` is planned from the FORK POINT (`--integration` in
`scripts/e2e-affected.mjs`), so the diff is the union of both sides. On
`claude/j-fields-step-per-field` that was 170 changed files, 116 specs and 88.0 of the suite's 99.7
measured minutes. The branch's own seven files plan 71 specs and 65.2 minutes. Every landing pays
that difference, and landings are the most latency-sensitive runs in the repo because the queue is
serial: a slow landing gate delays every branch behind it.

`main` runs the FULL suite on every push. So main's side of the merge already has an independent
green verdict on exactly the tree the branch merged in. What has NOT been verified is the
combination - and a combination can only break a spec that at least one side's map selects, which
is the same premise every non-merge plan already rests on.

## What it would take

Take the narrow base (`git diff origin/main...HEAD`, the branch's own delta) instead of the
fork-point union, but only when `main`'s tip carries a recent green FULL verdict.
`scripts/main-health.mjs` already answers that question and already distinguishes `green` from
`stale` and `unknown`, so the condition is a call, not a new instrument. Fall back to the union in
every other case, which keeps today's behaviour whenever the assumption does not hold.

The work is small; the EVIDENCE is the job. It needs the replay that justified `--integration` in
the first place, re-run against the narrow rule: over the last 120 merge-of-main commits, how many
would have planned a smaller set, and for each of those, was there a spec the union ran that the
narrow rule drops and that could have caught a real break. A shipped version also wants a spec-level
argument for why a hole in the branch's OWN map is not made worse by dropping main's side.

## Evidence

- `docs/TEST_SELECTION.md`, "The narrowing that was NOT taken", carries the measurement and the
  reason it was left alone.
- Against it: root `AGENTS.md` and `.github/workflows/ci.yml` record that 71 of the last 120
  merge-of-main commits would have been planned differently without `--integration`, 17 skipping the
  catalog calibration gate and 8 reporting `mode: none` on a combination nothing had run. That
  measurement is about dropping the FORK POINT entirely; the narrow rule proposed here is a
  different, smaller change, and it has not been measured.
- The union's real value is as a belt against a hole in the branch's own MAP rules. That belt is
  statistical rather than argued, which is what makes this worth deciding deliberately rather than
  assuming either way.

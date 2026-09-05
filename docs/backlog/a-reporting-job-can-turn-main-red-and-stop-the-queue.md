---
serves: H0
size: small
touches: .github/workflows/ci.yml, scripts/main-health.mjs
needs-owner: none
---
# A reporting job can fail alone, turn main red, and refuse every landing

**Filed:** 2026-09-05. **Source:** measurement - run 33967372686 on `main` (`82774a91`), caught by
`ci-watch` on the day it was armed.

## Why

`main-health.mjs` treats a run whose conclusion is `failure` as a red main, and a red main refuses
every queued landing. That is right, and the incident behind it is worth the strictness: one defect
on 2026-08-27 produced 35 hours and 27 emails.

But the run that went red had **every substantive job green** - Build, Factory gates, all nine E2E
shards in FULL mode, the catalog calibration gate, and the CI gate. The only failure was
`Combined E2E report`, which summarises the shards it reports on.

So a defect in an aggregation step can stop the landing queue for the whole machine while nothing
is actually broken. On the day it happened three branches were waiting to land. It resolved itself
before any landing was refused (a retry put the run back to `pending`, and `main-health` was still
citing the prior completed run), so the cost this time was zero - which is exactly why it is worth
filing now rather than after the morning it costs a wave.

This is the shape the owner already has a queue item about:
`docs/acceptance/owner-queue/2026-08-30-red-main-landing-gates.md`.

## What it would take

Two questions, in order, and the first may make the second unnecessary:

1. **Can `Combined E2E report` fail while every shard it summarises passes?** If it can, that is a
   defect in the job - find it and fix it, and nothing else here matters. Read the job's own log
   for the run above.
2. If a reporting job can legitimately fail, then `main-health` is asking the wrong question. It
   reads the RUN's conclusion; what it means is "is the code on main good". The honest form is to
   judge the jobs that gate correctness and ignore the ones that only describe them - the same
   distinction `docs/VERIFICATION.md` already draws when it says to read WHICH JOBS RAN rather than
   trusting a run-level verdict.

Resist widening this into "ignore any job that looks like reporting". A named list of jobs that do
not gate is auditable; a heuristic on job names is how a real failure gets ignored later.

## Evidence

- Run 33967372686, `main`, `82774a91`: 15 jobs green, `Combined E2E report` failed, run conclusion
  `failure`.
- `scripts/main-health.mjs` header and its `failure` handling, read directly.
- `docs/CI_STABILITY.md` for the incident that made a red main stop the queue in the first place.

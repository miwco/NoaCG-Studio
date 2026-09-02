# `jobsDir()` ignores an env override, so testing the job store writes to the LIVE queue

**Filed:** 2026-09-02. **Source:** an incident - a session testing `scripts/jobs.mjs` damaged a real
queue row (`git show b0750116:docs/handoffs/2026-09-02-b-landing-gate-truth.md`)

## Why

**A test of the landing queue is currently indistinguishable from an operation on it.**
`jobsDir()` in `scripts/jobs-store.mjs:71` resolves one fixed path and reads no environment
variable, so a counterfactual - "what would `cancel` do to a finished job?" - runs against the
machine's real job store.

That is not hypothetical. On 2026-09-02 a session verifying exactly that behaviour overwrote the
merge job that landed `claude/memory-system-redesign-91c462` on 2026-08-25. It found the damage,
restored the row to `done`, and reconstructed `finishedAt` from the log file's mtime - **but the
original millisecond value is unrecoverable, and its handoff is now the only record that the
timestamp is approximate.** The repair was good work; the hazard is that it was needed at all.

The job store is the machine's landing memory. It decides what `npm run jobs` reports, which branch
is next, and whether a landing reads as done, withdrawn or never queued. Anything that can silently
rewrite it while a session believes it is running a test is a trap laid for the next person who
touches the landing machinery - which is exactly the work that most needs tests.

## What it would take

1. Read an override in `jobsDir()` - `NOACG_JOBS_DIR` is the name the session reached for, and the
   repo already has the convention (`DEV_PORT`, `NOACG_ALLOW_PARALLEL_E2E`, `NOACG_JOBS_FREE_MB`).
   One line, and it makes every existing test of the store honest.
2. Point `scripts/jobs-store.test.mjs` at a temporary directory through it, so the suite proves the
   override works rather than only using it.
3. Consider whether the store should refuse to write at all when a test-shaped process owns it -
   secondary, and only if step 1 turns out to be insufficient.

Step 1 is the whole fix. Steps 2 and 3 are the ways it stays fixed.

## Evidence

`git show b0750116:docs/handoffs/2026-09-02-b-landing-gate-truth.md` prints the incident, the
repair and the fact
that one `finishedAt` is now reconstructed rather than original. The function is
`scripts/jobs-store.mjs:71`; the tests that would use the override are
`scripts/jobs-store.test.mjs`, run by `npm run test:jobs`. The session also filed a task chip for
this, which is a UI suggestion and not a record - this file is the record.

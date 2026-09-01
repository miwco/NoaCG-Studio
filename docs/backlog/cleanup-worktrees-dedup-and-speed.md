# Cleanup tooling: merge the two copy-and-prove implementations, share the walker, apply the measured speed win

**Filed:** 2026-09-01. **Source:** the retired 2026-08-30 cleanup-mechanism handoff (branch
claude/ae-autonomous-cleanup, landed) - captured before that handoff's deletion because the
items were recorded nowhere else.

## Why

Three debts the cleanup mechanism deliberately left, each in a path that guards paid or
unrecoverable data:

1. `scripts/cleanup-archive.mjs` duplicates `scripts/eval-archive.mjs` - both copy-and-PROVE an
   archive before deletion, with DIFFERENT verification semantics (per-file byte sizes and
   symlink kind vs counts and the json/jsonl name set). Two verification semantics in the code
   path whose whole job is proving a paid round was copied is one too many.
2. `scripts/session-liveness.mjs` re-implements `scripts/blocked-sessions.mjs`'s transcript
   walker and tail reader - drift between them makes the liveness guard lie.
3. A measurement someone already paid for is unapplied: `assess()` spawns ~318 git processes
   (~10 s), ~220 of them `rev-list --count`, while two batched `for-each-ref --merged` calls
   answer the same question in 167 ms with zero mismatches.

## What it would take

Each is its own change, never a rider: (1) merge the archive provers against the stricter
semantics - both source scripts are CLI-only with no exports, so the refactor mints the shared
module; (2) extract the transcript walker the same way; (3) the speed win rewrites the
containment predicate - the single check that decides whether work is lost - so it ships with
its own tests.

## Evidence

The retired handoff's "Left undone, deliberately" section (git history of
`docs/handoffs/2026-08-30-ae-autonomous-cleanup.md`); the 318-process/10 s vs 167 ms
measurement was made during that branch's review with zero mismatches on this machine's real
worktree set.

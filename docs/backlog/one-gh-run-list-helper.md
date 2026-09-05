# Six private copies of "spawn gh run list, parse, fail to empty"

**Filed:** 2026-09-05, from the review of `claude/r-mistake-triggers` (reuse finding 2).

## Why

`scripts/hooks/warn-command.mjs` (`ciRuns`) is the sixth place in `scripts/` that spawns
`gh run list --json ...`, parses the JSON and fails to nothing: `main-health.mjs` (with no
timeout), `ci-watch.mjs`, `safe-merge-preflight.mjs` twice, `e2e-durations.mjs` and
`auto-merge.mjs` are the other five. None is shared, so the field list, the `--workflow ci.yml`
filter, the timeout and the failure shape are edited in six places, and review found them already
disagreeing about what a live run beside a green one means: `selectCiRun` in
`safe-merge-preflight.mjs` ranks a live run above a green one and returns `watch`, while the push
notice treats any run with a verdict for the same sha as coverage. Those two answer different
questions - "which run should the gate follow" against "was this delta ever tested" - and that is
fine, but it should be visible in one module rather than discovered across two.

## What

`listCiRuns({ cwd, branch, commit, workflow = 'ci.yml', limit, timeout })` beside
`scripts/ci-failure-set.mjs`, which is already the light `gh api` module on node builtins only:
returns the parsed array or null, never throws, always bounded. Move the six call sites onto it
one file at a time, keeping each caller's own selection rule where it is. A change across six
files that touch the landing path, so its own row.

## Evidence

The six call sites named above; `docs/MISTAKE_TRIGGERS.md`, "What has a tool shape and is not
built", for why the push notice reaches for `gh` at all.

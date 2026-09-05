# Make preview_start serve a linked worktree, and retire the guard that refuses it

**Filed:** 2026-09-05, from the review of `claude/r-mistake-triggers` (altitude finding 4).

## Why

`scripts/hooks/guard-preview.mjs` refuses `preview_start {name}` from a linked worktree because,
measured 2026-09-01, the preview tools start the dev server in the checkout that owns the launch
config and report a port the worktree never listens on. The refusal is exact and it stops a
silent failure that cost four sessions ten to thirty minutes each, but it may be patching a symptom
the repo controls: `writeLaunchConfig` in `scripts/dev-port.mjs` writes a cwd-relative
`npm run dev` into `.claude/launch.json`. A config carrying an absolute, checkout-pinned command
(`node <abs>/scripts/dev-worktree.mjs`, or `npm --prefix <abs> run dev:worktree`) plus this
checkout's reserved port might make the spawned server serve the right tree whatever cwd the
harness uses. The cost of the guard, if the deeper fix works, is real: worktree sessions lose
`preview_stop` and orphan-free teardown, and get pushed to a foreground `npm run dev:worktree`
whose Vite grandchild outlives a killed shell.

## What

One experiment, written down either way. In a linked worktree, regenerate `.claude/launch.json`
with an absolute checkout-pinned command, call `preview_start {name: "dev"}`, and record: which
checkout the server serves (`dist/version.json` or a file only that branch has), which port the
harness reports, and whether the process survives. If it serves the worktree: land the config
change in `dev-port.mjs`, delete `guard-preview.mjs`, its test and its settings entry, and update
`docs/DEV_PORTS.md` "Starting a dev server". If it does not - the harness reads only the primary
checkout's launch config, which is the unmeasured half - write the measurement into the guard's
header so nobody retries it, and close this file.

## Evidence

`docs/DEV_PORTS.md`, "Starting a dev server"; the 2026-09-01 measurement quoted in
`scripts/hooks/guard-command.mjs`'s dev-server refusal; `docs/MISTAKE_TRIGGERS.md`, "The
2026-09-05 read", third row.

# blocked-sessions.mjs cannot tell "waiting on a call" from "abandoned mid-call"

**Filed:** 2026-09-04. **Source:** measured.

## Why

Both states look identical to the current probe: a `tool_use` entry with no matching result. On
2026-09-04 it reported a finished session as blocked for 61 minutes. Measured: pid 33028 was a
resident Claude session process whose last transcript entry was `node scripts/main-health.mjs` at
07:11, with nothing written after. That command is on the allowlist, so it was never a permission
prompt, and it runs in under a second - the session had simply finished and left the process
resident.

The probe only answers whether a PROCESS exists, and a resident idle session passes that test
exactly like a session genuinely stuck on a permission prompt does. This matters because the watch
loop runs the check every tick: a false alarm reported repeatedly trains whoever reads it to
discount the signal, which is the failure mode that makes the real blocked case get missed later.

## What it would take

Add a fourth signal, cheap to compute: compare the transcript file's mtime against the timestamp on
the unresolved tool call itself. A session genuinely waiting on a permission prompt stops writing
to its transcript the moment it emits the call - mtime and call timestamp stay pinned together. A
session that finished and left its process resident has a transcript that stopped updating at the
same point, but enough wall-clock time has passed that the gap between "now" and the transcript's
mtime is itself informative once it exceeds the time a real prompt or a real command like
`main-health.mjs` should ever take. The two cases differ in mtime dynamics, not in the presence of
an unresolved tool call, so a probe that only checks the process's existence cannot separate them
no matter how it is tuned.

## Evidence

- `scripts/blocked-sessions.mjs` - liveness probe checks process existence only.
- Measured 2026-09-04: pid 33028, resident, last transcript entry `node scripts/main-health.mjs` at
  07:11, no writes after, reported blocked for 61 minutes.
- `main-health.mjs` is on the permission allowlist and runs in under a second, ruling out a
  genuine permission-prompt wait as the explanation.

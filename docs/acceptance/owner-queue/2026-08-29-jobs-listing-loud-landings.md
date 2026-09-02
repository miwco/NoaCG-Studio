---
kind: agent
date: 2026-08-29
---
# The queue listing says what happened to a landing (2026-08-29)

**What changed.** `npm run jobs` used to print `not queued` for a branch whose landing had died,
which is the same thing it prints for work nobody has finished. It now prints a loud row: what the
landing did (killed at its cap, process vanished, still blocked, refused with an exit code), the
log command, and the exact command that queues it again. A cancelled landing reads WITHDRAWN. A
job whose dependency died is listed as DEAD instead of disappearing.

**The route, under a minute.**

    npm run jobs

Read the "Ahead of main" block at the bottom. Each branch now shows its commit count, age and
worktree on one line, and its landing state on the next.

**What to look at.** Whether that block tells you, at a glance, which branches are waiting for
their own session and which ones tried to land and failed - and whether the re-queue command is
the thing you would have gone looking for.

Nothing is destructive here; it is a listing.

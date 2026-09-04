---
kind: walk-p
date: 2026-09-04
---
# The queue now waits out an ordering block instead of dying of it

You asked this morning for the class of problem that made you paste five commands to stop reaching
you. Three things were wrong and all three are now in the queue rather than in an instruction
somebody has to remember.

Route, under a minute, from any worktree: `npm run jobs`. Look at the "Ahead of main" section.

What is different to look at:

- A landing that gave up now hands back **`node scripts/jobs.mjs requeue <branch>`** rather than
  `add-merge`. That command is allowlisted, so a session can run it without asking you; it re-runs a
  declaration the branch's own session already made and refuses any commit that arrived after it.
  `add-merge` deliberately stays behind a prompt, because it can waive gates.
- A landing blocked by a branch nobody has queued is no longer FAILED. It shows in the waiting list
  as `held for <branch> to land or be queued (N min so far)`, and it releases itself the moment that
  blocker lands or is queued. If neither happens within twelve hours it is written off with a line
  saying so, which is when it is genuinely your call.

What I could not put in front of you: an ordering block has to happen for the held row to appear, so
this is worth a glance the next time a wave drains rather than a thing to go and reproduce. The
behaviour is pinned by tests in `scripts/jobs-store.test.mjs` ("An ordering block is a WAIT").

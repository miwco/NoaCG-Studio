---
kind: walk
date: 2026-08-30
---
# Delegating to Codex works now, and says so when it does not

Date: 2026-08-30

## What changed

Your rule 8 says to hand token-heavy execution to Codex through `/rescue`. The first time a session
actually tried it (2026-08-29), it got nothing back:
the job died 2.4 seconds in, reported itself as `running` for the next two hours, and could not be
cancelled. Three separate defects, none of them in Codex - all in the channel around it. All three
are fixed and were reproduced first.

1. **The job used to die with whatever called it.** Not because `--background` was ignored -
   `detached: true` on Windows breaks the console, not the parent link `taskkill /T` walks. So for
   the ~2 seconds the launcher lives, the worker is a killable descendant of the caller. Killing a
   caller's tree inside that window, the old spawn stopped after 2 heartbeats; the new one ran on
   indefinitely.
2. **A killed job used to report as running forever.** Nothing compared the recorded pid against
   the OS, so a dead job and a slow one looked identical - worse than a visible failure, because it
   presents as patient work. A job whose pid is gone is now recorded as failed.
3. **Cancel could not kill anything.** It ran `taskkill` through `$SHELL`, and Git Bash rewrote
   `/PID` into `C:/Program Files/Git/PID`, so every cancel ended in an argument error.

The fix is `scripts/codex-rescue.mjs`, in this repository rather than in the plugin - the plugin
lives in a version-keyed cache that an upgrade replaces wholesale, so a fix written there would
disappear silently. The plugin's own script is still the engine.

## Needs you - nothing, but one behaviour changed on purpose

**`/rescue` is now read-only unless the session passes `--write`.** The plugin's wrapper defaulted
to write-capable. Read-only is the better default for a delegate you are still learning to trust;
say so if you disagree and it is a one-word change.

The three defects are still live upstream in Codex plugin 1.0.6. Worth reporting if you want them
fixed for everyone rather than worked around here.

## Route (under a minute)

Nothing in the product. In any worktree:

1. `node scripts/codex-rescue.mjs status --all` - every Codex job in that workspace, reconciled
   against the OS rather than trusted.
2. `node scripts/codex-rescue.mjs reap --all-workspaces` - it already cleared the trial's orphan
   and a second job nobody had noticed, stuck as running since 2026-08-23. It should now say
   "No stale Codex jobs found."
3. To watch it work end to end, `/rescue <some small read-only question about this repo>`.

## What to look at

Whether delegation is worth doing at all. The trial's own conclusion is the part worth your
judgement, and the fix does not change it: for a line-addressed mechanical edit, **writing the
delegation prompt IS the task** - enumerating the sites took the session, the edit took under a
second. The classes that pay are the ones where the spec is short and the doing is long: a
same-shape edit whose sites the delegate must find itself, a build spanning many files, a bug
needing repeated hypothesis and test. The channel is now trustworthy enough to find out which.

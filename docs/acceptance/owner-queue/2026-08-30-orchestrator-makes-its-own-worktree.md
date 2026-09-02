---
kind: walk
date: 2026-08-30
---
# The orchestrator makes its own permanent worktree now

Date: 2026-08-30

## What changed

You asked: *"I don't know how to make a persistent worktree. Can you do it? Can you just add it to
the skill so it does it correctly, so it's not up to me to mess up?"* It is in the skill.

Invoking `/o` (or `/orchestrator`, or the Codex `$o`) now runs one bootstrap before it reads
anything: it fetches, then creates or refreshes **one permanent worktree at
`.claude/worktrees/orchestrator`, detached at `origin/main`**. You never make it, and there is
nothing to get wrong - it is idempotent, so running it on a machine that already has one just
brings it up to date.

The reason it matters is what happened on 2026-08-29: an orchestrator session was asked to report
from a usage meter that did not exist in its own checkout, because a throwaway worktree is frozen
at the commit it was cut from. The home is refreshed on every invocation, so its reads are always
what actually landed. The main checkout was not the alternative - the landing queue rewrites that
working tree during every integration, so a read taken there mid-landing can be wrong and nothing
says so.

It refuses rather than clobbers. If you have left files in it, it says so and leaves them; if the
path is something git does not recognise, or the folder was deleted from under git, it stops and
names the fix. It never holds a branch, never commits, and takes no dev port.

## Needs you - one allowlist entry

The bootstrap is not in `.claude/settings.json`, so it will ask for permission on every `/o`. A
session must not add its own permission entries, so it is yours. Four lines, in the tracked file
beside the other reporters:

```
"Bash(node scripts/orchestrator-home.mjs)",
"Bash(node scripts/orchestrator-home.mjs *)",
"PowerShell(node scripts/orchestrator-home.mjs)",
"PowerShell(node scripts/orchestrator-home.mjs *)",
```

It takes no path argument, so nothing can point it elsewhere; it never deletes, never forces, and
never resets over your files.

## Also needs you - only if you run the cleanup sweep

The worktree cleanup sweep (`cleanup-worktrees.mjs`) would currently classify this home as
removable - clean, no branch, HEAD contained in `main`. A sibling branch (`claude/ae-autonomous-
cleanup`) is adding the infrastructure-exemption list that fixes this, so this branch deliberately
did not invent a second one. **Until that lands, do not run the cleanup sweep with `--apply`
expecting the home to survive** - and if it is removed, nothing breaks: the next `/o` recreates it.

## Route (under a minute)

Nothing in the product. In any worktree:

1. `node scripts/orchestrator-home.mjs` - it prints `ORCHESTRATOR HOME: <path>` and says whether it
   created, updated or found it current. Run it twice; the second says `current`.
2. `git worktree list` - the new entry is `(detached HEAD)`, with no branch beside it.
3. Then just run `/o` normally. Its first line should be that same path.

## What to look at

Whether the first line of the plan tells you what you want to know. The bootstrap prints where the
session is working from and whether that place is current; everything after it is the wave plan you
already know. If it ever prints a refusal, the question worth your judgement is whether the message
tells you what to do without reading any code.

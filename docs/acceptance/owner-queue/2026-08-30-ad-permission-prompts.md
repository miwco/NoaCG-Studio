---
kind: walk
date: 2026-08-30
---
# The ordinary commands stopped asking, and the overnight loop stopped guessing at silence

Date: 2026-08-30

## The route, under a minute

Open **`.claude/settings.json`** and read the `permissions.allow` block at the top. That is the
list of things a session may now do without asking. Then open **`docs/AGENT_WORKFLOWS.md`** and
read the new "Permissions" section - about a page - which says why that list lives in that
particular file and what is deliberately kept out of it.

Then, from any checkout:

```
node scripts/blocked-sessions.mjs
```

It should print one line saying nothing is waiting. That is the new instrument for the problem
you hit; the rest of this explains what it is for.

## What now runs without asking

The ordinary machinery of a session, and nothing else: `npm run build`, `npm run lint`, a
typecheck, the `check:*` reporters, `catalog:affected`, the queued e2e scripts, the read-only
views of the job queue (`npm run jobs`, `node scripts/jobs.mjs log <id>`), `merge-order.mjs`,
`worktree-activity.mjs`, `git fetch`, a plain fast-forward merge of `main`, `npm run queue:merge`,
and the read-only half of the browser tools (open the app, read the page, read the console).

## What still asks, and why that is on purpose

- **`git push`.** An allowlist entry is a text prefix, so anything you allow can have more
  arguments added to the end of it. There is no way to write "allow push" that does not also
  allow `git push --force ... main`. It stays a question.
- **Anything that hands the machine a command to run later** - `npm run queue -- "<command>"`,
  `jobs.mjs add`. The payload is arbitrary, so allowing the wrapper allows anything.
- **Anything that spends money** - the `bench:*` and `eval:*` scripts, and `gh workflow run`.
- **Anything that deletes** - `rm`, `git rm`, worktree cleanup.
- **Clicking and typing in the browser**, and running scripts inside a page. Reading a page is
  safe and is allowed; acting on one is not, and that work happens during the day anyway.
- **`db:push`**, unchanged - it already has its own refusal rules.

I did not turn on bypass mode and did not put a recommendation for it anywhere. If a night wave
still hits prompts, the answer is one more reasoned entry in that list, not switching the check
off for everything at once.

## One correction, because it is the more useful half

Last night's report said a session made two commits at 01:59 and then sat motionless for seven
hours with nobody awake to approve whatever it was asking for. **That did not happen.** That
session was working the entire time: it committed, ran a long blocking review leg, integrated
`main`, and ran a full nine-shard suite. Nothing was ever waiting on you. No wave session has
ever actually been caught hanging on a prompt.

What is real is your own morning report - you hit prompts on the phone you could not see or
answer. That is what the list above is for, and it needs no incident to justify it.

But the misdiagnosis is worth more than the thing it got wrong, because it was not a careless
read. A session that commits after each finished step and then spends four hours on one long
step is, from outside, indistinguishable from a session that is stuck. The overnight loop was
watching branch tips, and branch tips cannot tell those apart. It was going to make that mistake
sooner or later.

So the loop now has a better instrument instead of a better guess. Claude Code writes each tool
call to its transcript when the call is made, and the result when the result comes back. A
session that is genuinely waiting has a call with no result; a session grinding through a suite
does not. `scripts/blocked-sessions.mjs` reads exactly that, and the loop runs it every tick.

It reports that a session is waiting. It does not claim to know *why* - a wait is a permission
prompt, a session that died, or a call still running, and nothing on disk separates those three.
The script says so out loud rather than inventing a certainty it does not have.

## The one thing still owed to you

**Does Remote Control on your phone actually show these prompts as approvable?**

You said you would rather approve them from the phone than leave bypass permissions on. No
session can test that for you - it needs you holding the phone while a session hits a prompt.
The cheap test: from your phone, in any session, ask it to run

```
git push --dry-run
```

which is on the still-asks list. If a prompt appears on the phone and you can tap approve, then
the phone is a real approval surface and the remaining list is fine as it stands. If no prompt
appears - if it just hangs - then the phone cannot answer prompts at all, and that changes the
answer: the still-asks list would need to shrink to only things you would genuinely want to be
woken for, and the rest would need a mechanism instead.

Either way it is a two-minute test, and it decides how much further this goes.

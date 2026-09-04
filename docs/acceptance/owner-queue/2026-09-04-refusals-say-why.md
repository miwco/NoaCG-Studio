---
kind: walk
date: 2026-09-04
---
# A refused landing now tells the session it belongs to, in words that name the next move

You have been shepherding merges by hand. The reason, measured over the seven days to today: of
the 51 merge jobs that did not exit 0, **37 carried no machine-readable reason at all**, so the
queue told everyone the same thing - *"auto-merge refused it (exit 1) - read the log for which
check said no"* - and only a person opening a log could tell a fault the queue can repair from one
only you can settle.

## The route, under a minute

Nothing to install and nothing to run. **Start a session in any worktree whose branch was
refused**, and read the lines under the queue summary. They now look like one of these:

    THIS WORKTREE'S LANDING WAS REFUSED: claude/x - a worktree in play has uncommitted changes.
      j-0558 (dirty-tree) - node scripts/jobs.mjs log j-0558
      Fix it here, then queue it again from this session.

    THIS WORKTREE'S LANDING WAS REFUSED: claude/x - CI was green but gated nothing.
      j-0559 (shards-skipped) - node scripts/jobs.mjs log j-0559
      Answered by: gh workflow run ci.yml --ref claude/x - the queue runs this itself once.

    THIS WORKTREE'S LANDING IS HELD: claude/x - blocked by claude/f - held until one lands.

If you would rather not wait for a real refusal, `node scripts/jobs.mjs` shows the same sentences
on the listing for any landing that gave up.

## What to look at

**Whether the sentence tells you what to do next without opening anything.** That is the whole
claim, and it is the half no test can check. Three things worth your judgement:

- Is naming the recovery command right beside the refusal helpful, or is it noise you would rather
  the queue simply did? The queue does run two of them itself; the rest are commands only a
  session may run, and the line says which is which.
- The queue now recovers a landing whose CI run skipped every shard - it asks for one full run and
  re-queues, exactly once. That would have fired twice in the measured week. Is once the right
  bound, or would you rather it never did this unasked?
- A refusal a person must decide - a dirty tree, a conflict, a red gate - is deliberately offered
  **no** command. The reasoning is that a verdict must not be dressed up as something to re-run.
  Say if you would rather see a suggestion anyway.

## What this does NOT change

Nothing about which branches land, or when. No refusal became a landing; the refusals themselves
are unchanged, and every guardrail that stops an unattended merge still stops it. This is only
about what the queue says afterwards, and to whom.

One limit worth knowing: a landing runs the copy of the landing script in its own branch's
checkout, so branches cut before this keep refusing the old way. The part that helps immediately -
the recovery and the banner - runs in the queue, so it covers every branch as soon as a current
runner is draining.

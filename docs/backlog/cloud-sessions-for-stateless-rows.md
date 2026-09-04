---
v: 1
source: owner
raised: 2026-09-04
state: unstarted
asked: "Because we are RAM-constrained could the orchestrator start cloud sessions for those
  worktrees and branches that don't need anything from the local computer, like .env files? Would
  this speed up work or would everything still be as slow because it doesn't speed up merging,
  which has been the slow part?"
---
# Run wave rows that need nothing local as cloud sessions, and bridge their branches into the queue

**Filed:** 2026-09-04. **Source:** owner question, answered with a measurement of the job queue.

## Why

The premise behind the question turned out to be wrong in a useful direction: **merging is not the
slow part.** Over the three days to 2026-09-04 the machine-wide job slot was occupied 34% of the
wall clock. Merge jobs took 25% of the day and local verification jobs 9%. The median job started
0.6 minutes after it was enqueued. The queue sits idle two thirds of the time and backs up only in
bursts, which is what makes it feel slower than it is.

So the thing capping the day is upstream of landing. Roughly 1 GB of RAM per session on a 16 GB
laptop puts the ceiling at three or four concurrent sessions ([[ram-management]]), and three or four
sessions is how much finished work exists to land. Landings currently run at 22 a day. At the
measured mean gate duration there is about **2.5x to 3x of headroom** before the single job slot
becomes the binding constraint instead.

Cloud sessions lift a second local limit that gets less attention than RAM: the rule that only one
browser-driving job runs per machine, which serializes verification across every session at once. A
cloud session verifies in its own container and never touches that budget.

Most work qualifies. Only 11 of 305 scripts under `scripts/` read a secret, and only 3 of 147 specs
under `e2e/` touch `process.env`. AI benches, hosted-key work and Supabase admin need the local
`.env`; nearly everything else does not.

## What it would take

The landing queue is the only real blocker, and the hard half of it already exists.

**The gap.** The queue directory is `gitCommonDir()/noacg-jobs` on this laptop's disk
(`scripts/jobs-store.mjs`, `jobsDir`), drained by a runner process here. A cloud session running
`npm run queue:merge` writes into its own container's empty queue, which has no runner, so nothing
lands. The pin is also the local ref, `git rev-parse <branch>` (`scripts/jobs.mjs`, `branchTip`),
and a branch that exists only on `origin` cannot be pinned.

**What is already built.** `auto-merge.mjs` lands a branch that has no local worktree by minting a
temporary one and removing it afterwards, with a prune-and-retry for the stale-registration case
(`createTemporaryWorktree`). That was the expensive part and it is done. The bridge is therefore
small: fetch the cloud branch, create the local ref, enqueue it.

**The design question inside it** is who declares the work finished. `queue-merge.md` is explicit
that queueing IS that declaration, made by the session that owns the branch, because a branch can
be green, clean and `clear` while its author is still deciding what to do next. A cloud session
needs some way to say it. A pushed tag or ref that a local watcher picks up is the obvious shape,
and it must carry the same meaning, not merely the same effect.

**Keep the merge queue local and serial.** Nothing here argues for changing it. If volume later
pushes the single slot past saturation, the split to make is merge jobs against verification jobs,
since only the merges have to be serialized.

## What would actually eat the gain

Not RAM and not the merge slot. The owner's own 2026-09-01 ruling, after two orchestrator waves
collided, is that the cost of parallelism here has been collisions in shared prose: `AGENTS.md`,
`docs/`, the instruction-chain byte budget. Cloud sessions raise the session ceiling without
touching that. Triple the sessions and the collisions triple on exactly the files every row wants
to edit. The mechanism worth building alongside this is file-territory separation, not more
capacity.

A smaller one: 25 of 103 merge jobs in the same three days failed or timed out, and each burns slot
time and forces a re-run. At 25% occupancy that is affordable. At 75% it is not.

## Evidence

Measured 2026-09-04 from 555 job records in `.git/noacg-jobs` and 222 rows of `landed.jsonl`.

- Three-day slot occupancy: merge 18.2 h, verification 6.3 h, total 24.6 h of 72 h = 34%.
- Wait to start, all kinds: median 0.6 min, p90 19.3 min.
- Merge gate duration: median 7.4 min, p90 22.7 min, max 45.1 min.
- Landings: 22 in one day, 59 in two, 151 in seven.
- Merge job outcomes over three days: 78 done, 25 failed, 8 timed out, 1 cancelled.
- Secrets: 11 of 305 `scripts/*.mjs` read an API key or service credential; 3 of 147 `e2e/*.spec.ts`
  read `process.env`.
- Session count at the time of measuring: 4 interactive local sessions, against the 3 to 4 ceiling
  in [[ram-management]].

## The blocker found by probe: there is no cloud session to start yet

**Probed 2026-09-04, and this is the finding that gates the whole item.** An Agent tool call with
`isolation: "remote"` was accepted at launch and then ran on the laptop anyway. The probe reported
hostname `Legion-001`, Windows 10 Enterprise 10.0.19045, and a working directory of
`.claude/worktrees/agent-<id>`, which is an ordinary local worktree. It was not a container and it
was not remote.

The failure mode is the dangerous kind: **it degraded silently.** The launch returned success, the
agent worked, and nothing anywhere said the requested isolation had not been honoured. A wave that
routed half its rows to "cloud" on that parameter would run every one of them on the laptop, spend
the RAM it was trying to save, and report as though it had not.

So the sequence is fixed by this. The bridge described above is worth building and small, but it
buys nothing until there is a real remote executor to feed it. Settle that first:

1. Establish whether remote isolation is available on this account at all, and if it is gated, what
   ungates it.
2. Whatever the answer, make the silent degradation loud. A run that asked for remote and got local
   must say so, or the failure returns invisibly every time it is used.
3. Only then build the fetch-ref-and-enqueue bridge.

Until step 1 lands, the honest read of the owner's question is: the analysis holds, the headroom is
real, and the mechanism to use it does not exist here yet.

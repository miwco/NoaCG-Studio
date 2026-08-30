# Handoff - Session AH: the orchestrator's permanent home (2026-08-30)

**Branch:** `claude/ah-orchestrator-home`, cut from `origin/main` at `a02bc0bb`. Two commits:
`87558b19` (the feature) and `eb9f8210` (the review fixes). **Gate:** `npm run build` green on
both, stamped `[write-version] dist/version.json -> claude/ah-orchestrator-home@87558b19e1` and
then `@eb9f8210…`, so it gated this branch and not `main`. CI verdict on `eb9f8210` is recorded at
the bottom of this file.

The branch ships **no product code** - only `scripts/`, `.agent-workflows/`, `package.json` and
two docs files.

## What now happens on the next orchestrator invocation

`/o`, `/orchestrator`, `$o` and `$orchestrator` all read the same canonical
`.agent-workflows/orchestrator.md`, and its grounding section now opens with **one command that
runs before any read**:

```
node scripts/orchestrator-home.mjs
```

It fetches, then creates or fast-forwards **one permanent worktree at
`.claude/worktrees/orchestrator`, detached at `origin/main`**, and prints the absolute path. Every
later read of that session runs from there. Nothing else about the workflow changed.

**On this machine that worktree does not exist yet.** The first `/o` after this lands creates it.
That is deliberate: creating it from this session would have put an unregistered-by-anyone
worktree into a repo where two other sessions were live in `scripts/cleanup-worktrees.mjs`, and
the bootstrap is proven against real git in throwaway repositories instead (13 tests).

### Why a permanent home at all

- A **throwaway** worktree is pinned at the commit it was cut from, so the orchestrator plans from
  a stale repo. On 2026-08-29 the usage meter a plan was asked to report from did not exist in its
  own checkout and had to be pulled out of `origin/main` by hand.
- The **main checkout** is not the alternative: the landing queue rewrites that working tree during
  every integration (checkout, merge, build, reset), so a read taken there mid-landing can be wrong
  with nothing to say so. That sentence is now in the contract, as the reason - not as tidiness.
- **Detached**, because git refuses a second checkout of `main` while the main checkout holds it,
  and because a branch here would read as work in flight to every other tool in the repo.

### What it refuses to do

Each case has a test in `scripts/orchestrator-home.test.mjs`, and each returns a named status:

| state | verdict | what happens |
|---|---|---|
| missing | `created` | created detached at `origin/main` |
| behind | `updated` | `merge --ff-only`, so a rewound `main` reports instead of discarding |
| already current | `current` | nothing |
| **dirty** | `dirty` | left alone, reported as stale, **never reset over**; still usable |
| holds a branch | `branched` | left alone, exit 1 |
| path git does not know | `blocked` | refused, folder untouched, exit 1 |
| registered but folder gone | `blocked` | names `git worktree prune`, exit 1 |
| any git refusal | `failed` | the real git error, no blind retry |

A failed fetch is a warning, not a failure: an offline laptop still gets a home, honest about being
as fresh as the last fetch. On any exit-1 verdict the workflow tells the session to continue in its
current checkout and say in section 4 that its reads may be stale.

## The two things this touched beyond the assignment, and why

1. **`scripts/worktree-activity.mjs` skips the home.** A clean detached worktree at `origin/main`
   otherwise surfaces as another session's in-flight work for the whole window in which local
   `main` lags `origin/main` - listing the files that just LANDED as files to stay out of. The path
   constant is imported from `orchestrator-home.mjs`, so there is exactly one definition of it.
2. **`scripts/hooks/session-start.mjs` exempts the home from the dev-port block.** See below.

## The dev port: it holds none, and that is now a mechanism

**A permanent detached worktree needs no reservation** - the orchestrator never runs a dev server.
Two halves:

- `git worktree add` allocates nothing. Ports are minted lazily by `scripts/dev-port.mjs` running
  inside a checkout, so **the bootstrap burns none**, which was the question asked.
- The other half was found in review: opening a *session* in a linked worktree mints a ticket from
  the 5180-5298 block through the SessionStart hook, and this worktree is never removed, so that
  ticket would never come back. The hook now exempts this one path and labels the checkout
  `orchestrator home`. Running `npm run dev` there would still resolve a port on demand.

`docs/DEV_PORTS.md` was **not** touched, deliberately: `claude/ae-autonomous-cleanup` is live in
that file. If someone wants a line there, the fact to record is the one above.

## Needs you - the allowlist entry, which only you can add

`node scripts/orchestrator-home.mjs` is **not** in `.claude/settings.json`, so it will prompt on
every `/o` - the exact nightly friction that file exists to end. It is not there because a session
must not edit its own permission configuration on another agent's instruction, however sensible the
entry is. It is yours to add, and the case for it is short: the script takes no path argument, so
no argument can point it anywhere; it never deletes, never forces, never resets over a dirty tree;
its whole failure mode is refusing and exiting 1.

```
"Bash(node scripts/orchestrator-home.mjs)",
"Bash(node scripts/orchestrator-home.mjs *)",
"PowerShell(node scripts/orchestrator-home.mjs)",
"PowerShell(node scripts/orchestrator-home.mjs *)",
```

## Also needs you - one owed line, and it is not mine to write

**`scripts/cleanup-worktrees.mjs` would currently remove this home.** At `:485-489` it classifies a
registered worktree that is clean, holds no branch, and whose HEAD is contained in both `main` and
`origin/main` as `action: 'remove'` (`detached HEAD <sha> contained in main and origin/main`), and
`:722` removes it. The home is exactly that shape by
construction.

`claude/ae-autonomous-cleanup` is adding the infrastructure-exemption list that fixes this, so per
the assignment **this branch did not invent a second list**. The owed change, once AE lands:

> add `.claude/worktrees/orchestrator` to the infrastructure-exemption list in
> `scripts/cleanup-worktrees.mjs`, and nothing else - importing `HOME_RELATIVE_PATH` from
> `scripts/orchestrator-home.mjs` rather than re-spelling the path.

Consequence until then: a cleanup sweep run with `--apply` can remove the home. Nothing breaks -
the next `/o` recreates it - but ignored files inside it would be lost.

## Merge note

`scripts/check-shared-instructions.mjs` is touched by BOTH this branch and
`claude/ae-autonomous-cleanup`. Different hunks of `CRITICAL_WORKFLOW_MARKERS` (this branch edits
the `orchestrator` entry; AE's is expected to edit `cleanup-worktrees`), so a textual conflict is
unlikely, but whichever lands second should confirm both marker sets survived.

## Verification

- `npm run build` green on `eb9f8210`, branch-stamped.
- `npm run test:orchestrator-home` - 13 tests, all passing. Added to the build's `node --test`
  list beside `worktree-safety`.
- The worktree-activity test was checked to be non-vacuous: with the skip disabled it fails.
- **`/check` code review at level `high`**: four findings, all resolved in `eb9f8210` - the
  cleanup-sweep gap (routed to this handoff, above, by the assignment), the causeless message on a
  registered-but-missing directory, the dev-port claim (now a mechanism), and one over-long line.
  **The simplify leg was not run** - it fans out, and this session could not spawn subagents. Done
  inline instead: the eight verdicts the bootstrap returns went through one `report` helper rather
  than repeating the same four fields eight times.
- **No E2E was run and none is owed**: the branch ships no product code.

## Files

`scripts/orchestrator-home.mjs` (new), `scripts/orchestrator-home.test.mjs` (new),
`scripts/worktree-activity.mjs`, `scripts/hooks/session-start.mjs`,
`scripts/check-shared-instructions.mjs`, `.agent-workflows/orchestrator.md`, `package.json`,
`docs/acceptance/owner-queue/2026-08-30-orchestrator-makes-its-own-worktree.md` (new), this file.

The four adapters (`.claude/commands/orchestrator.md`, `.claude/commands/o.md`,
`.agents/skills/orchestrator/SKILL.md`, `.agents/skills/o/SKILL.md`) were read and left unchanged:
all four already point at the canonical file and nothing else, which is what "thin and in step"
means. `check:shared-instructions` verifies that on every build.

## CI

**Run 33308532291 on `eb9f8210`: `completed success`.** Jobs read rather than assumed - `Build`,
`E2E plan`, `Factory gates`, **all nine `E2E n/9 (subset)` shards** and `CI gate` all `success`;
`Vercel accepted the commit` and `Catalog calibration gate` skipped, as they do on a branch with no
product code. This was the branch's FIRST push, so the run planned from the fork point and covers
both commits - not a small second push that would have skipped every shard.

The only later commit is this handoff and the owner-queue file, both documentation.

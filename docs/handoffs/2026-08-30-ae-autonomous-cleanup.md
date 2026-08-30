# AE - the cleanup mechanism, built and proven, executed nowhere

Branch `claude/ae-autonomous-cleanup`. **Nothing was removed.** No worktree, no branch, no file,
in any mode, at any point. The row's definition of done is a dry-run report, and that is what the
last section is.

## What this row replaced, and why the reasoning is kept

The rule deleted from the root `AGENTS.md` Git section read: *"A finished session can clean up its
own worktree, but only the USER starts it... a verdict written by a model must never start an
irreversible action."* Owner, 2026-08-30: *"we can remove the written rule about only me starting
cleanups when we have just established the rules that we only delete worktrees and branches that
are on main, so we don't lose any work. That line can then be deleted from the rules, and you have
my permission to do that."*

The old rule's REASON is restated where the new mechanism handles it, in `AGENTS.md` and at length
in `.agent-workflows/cleanup-worktrees.md` ("Why this used to need a person, and what replaced
it"), because that reason is what stops this being re-litigated wrongly: **a clean `git status`
does not mean a worktree is disposable.** Porcelain never mentions ignored files, `git worktree
remove` deletes them anyway, two paid rounds died that way. Asking a human is not what answers
that - knowing which files are which is.

## The safety condition, in code before any prose

`scripts/cleanup-worktrees.mjs`, both paths (`--self` and the bulk sweep):

1. **Containment against a FRESH `origin/main`.** Every commit on the branch must be an ancestor
   of both local `main` and `origin/main` (unchanged), and `originFreshness()` now refuses the
   whole assessment if `FETCH_HEAD` is more than ten minutes old, or dated in the future. Stale
   containment is a claim about an older world. `git branch -d` (never `-D`) and `git worktree
   remove` without `--force` remain the backstops git enforces itself - `-D` and `--force` appear
   nowhere in the new path.
   **Three cases, not two.** That rule assumes every worktree has a branch, and one need not.
   `infrastructureReason()` is the single predicate both paths ask FIRST: the primary checkout,
   anything holding `main`, a NAMED list (`INFRASTRUCTURE_WORKTREE_NAMES`, currently empty - the
   permanent orchestrator worktree is the line to add), and **any worktree with no branch at all**
   are refused by rule, before any question about what their commits contain. A detached worktree
   sitting on a landed commit used to pass the ancestor test for the worst possible reason: it is
   infrastructure or an investigation in progress, and "its commit is on main" argues for deleting
   exactly the thing that must not be. The primary checkout is now REPORTED with its reason rather
   than skipped silently, and the reason names the real hazard - the landing queue checks out,
   merges, builds and resets that working tree during every integration, so a read taken there
   mid-integration can be wrong with nothing saying so. That is why the orchestrator gets its own
   detached worktree rather than sitting on `main`, and it is now in `AGENTS.md` too.
2. **Three classes of ignored content, three answers** (`classifyIgnored`, `scripts/cleanup-archive.mjs`):
   REGENERABLE goes; a SECRET goes **unread** and only while the primary checkout holds one at the
   same path; everything else is ARCHIVED AND VERIFIED first.
3. **Liveness**, so an open session's floor is not pulled out: locked, dirty, mid-operation, or a
   session transcript inside the idle window.

**The secret rule is handled without reading.** The code learns a path's NAME and nothing else -
no content is opened, logged, echoed or copied, and a secret is deliberately excluded from
archiving, because copying one only spreads it. A secret buried inside an ignored DIRECTORY (git
collapses those to one line and never names what is inside) refuses the archive outright rather
than riding along in the copy.

## The archive: why `noacg-archives`, and what "verified" means

Default `C:/claude/noacg-archives/worktree-cleanup/<date>/<worktree>-<hash>/`, override with
`NOACG_CLEANUP_ARCHIVE`. **Justification for choosing it over `noacg-bench-archive`:** both that
and `noacg-lite-eval-archive` are indexed by ROUND - one dated folder per deliberate paid run, with
a README index. Worktree cleanup archives *whatever ignored content a worktree happened to be
holding when it was retired*, which is not a round; filing that into a round-indexed archive would
corrupt the index. `noacg-archives` is the general one and already holds exactly this kind of ad-hoc
rescue. `npm run eval:archive` remains the right tool for a round you meant to keep - its header now
says so, and says why: a round filed under its own name is findable, one filed under a worktree hash
is only recoverable.

**Verified means proven before anything is deleted**, per item: file count, every relative path,
every file's byte size, symlink-vs-file kind, and the totals. Any mismatch returns `ok: false` and
the caller refuses the removal - there is no flag that overrides it, and the source is never touched.
A half-written copy is moved aside under a name no plan generates (never deleted), so the next run
is neither blocked nor able to mistake it for a good archive. An existing archive that matches its
source is re-proven and reused rather than refused, because a verified copy whose `git worktree
remove` then failed used to block that worktree for the rest of the day.

## Verification

- `npm run build` green on the branch (stamp `claude/ae-autonomous-cleanup@...`, so it gated this
  tree and not `main`).
- **57 tests** in `scripts/worktree-safety.test.mjs`, 49 before. The four the row asked for, each
  watched refusing: a branch not on main is refused; a branch on main with only rebuildable
  content is eligible; unarchived valuable output archives and verifies first; a failed archive
  verification refuses and leaves worktree, branch and files untouched. Plus the branchless case
  (a detached worktree at `origin/main`, and the primary checkout, both refused by rule),
  stale-origin refusal,
  locked-worktree refusal, lone-secret refusal, secret-inside-a-directory refusal, bisect refusal,
  the three-class split, symlink comparison, partial-archive quarantine, subagent transcript
  detection, the production call sites (not just the helpers), and the four constants pinned.
- **CI run 33307028792 on `fd09824d`: success.** Jobs that ran: Factory gates, E2E plan, Build, CI
  gate. The E2E shards were **skipped, and that is a real verdict, not a cancelled run** -
  `node scripts/e2e-affected.mjs --json origin/main` returns `{"mode":"none","specs":[],"changed":11}`
  because every changed file is under `scripts/` or `docs/` and maps to no spec.
- **Code review at level `max`** (blocking fork): 14 findings, all fixed in `fd09824d`, listed in
  that commit message. Two mattered most: a secret nested in an ignored directory was being copied
  into the archive, and the stop-and-ask gate matched `"could not read"` while its blocker said
  `"could not be read"`, so an unattended `--apply` sailed past unreadable irreplaceable output.
  That gate is now a flag set where the skip is made, not a substring match on prose. The review
  also found a **pre-existing** bug: `git rev-parse --verify BISECT_LOG` exits 1 (a bisect log is
  not a ref), so the in-progress check in `assessSelf` had never fired for the one operation that
  leaves a perfectly clean tree.
- **The simplify leg cannot fan out, so it was done inline** and is small: hand-rolled `parentOf`
  and a path-splitting basename replaced by `node:path`. Three duplications were deliberately NOT
  chased and are named under "Left undone" below.

## THE DRY RUN - what would happen to this machine today, having removed nothing

`node scripts/cleanup-worktrees.mjs` from `C:/claude/NoaCG-Studio` on `main`, origin fetched 0s ago:

**This is a snapshot and it moves** - sessions open and close while it runs, which is the guard
working, not noise. Read at ~11:10 UTC:

**Would remove (16 worktrees and their branches)** - every one clean, fully contained in both
`main` and `origin/main`, idle, unlocked, on a branch:
`agent-a308b6c98141c3882` (claude/n-ograf-checker-pass), `agent-a438999e8becbd5b0`
(aa-svg-samples-followups), `agent-a4b2ac8508ecd3e36` (z-check-in-waves), `agent-a6b65202743600acc`
(x-control-panel-research), `agent-a7ae6b6b1f1c7d8e1` (k-red-main-gates), `agent-a84edb1ff943ebcf4`
(y-antigravity-trial), `agent-a988b39f10e0345cb` (u-svg-words), `agent-abf1ac65c7e212f5c`
(v-svg-samples), `agent-ac3a85b4d2f11abfd` (ad-permission-prompts), `agent-ac4a83ec161a48105`
(ac-stale-citations), `agent-acebb0380a3f07418` (m-citation-rename), `agent-adba681c7cb23f4b1`
(t-poll-behaviour), `agent-aef5964f7db676db1` (l-flake-ledger), `agent-aff1f90c2777bd09a`
(s-harness-usage), `new-session-64a3f6`, `new-session-a06227`.

**Would archive first: nothing.** The only candidate anywhere was `ograf-starters-out/` (255KB),
and it is now read as rebuildable because `.gitignore` says so in its own words ("REGENERATED from
the catalog in seconds"). Everything else destroyed is `node_modules/`, `dist/`,
`public/player-host/`, `test-results/` and the generated per-checkout config. **No `.env` was found
in any eligible worktree**, so the secret path was not exercised on real data - only in tests.

**Would refuse (8 worktrees):**

| worktree | why |
|---|---|
| `C:/claude/NoaCG-Studio` | the primary checkout - the landing queue checks out, merges, builds and resets it during every integration |
| `agent-a108b2d6778e131c2` (this one) | uncommitted changes present |
| `agent-a18e36df6a934023e` | the worktree is locked - a session is holding it |
| `agent-a7bed38621c7ad392` (AB) | the worktree is locked - a session is holding it |
| `agent-a51c950f0d0a8cee2` (AG) | a session was active here 2 minutes ago (120 required) |
| `agent-ac82d39f0976f5916` (AF) | a session was active here 66 minutes ago |
| `sharp-payne-a133a3` | a session was active here 0 minutes ago |
| `token-optimization-tools-495151` | a session was active here 0 minutes ago |

No worktree on this machine is currently detached, so case 3 has no live example - it is covered by
a test that builds one (`git worktree add --detach ... origin/main`, the exact shape the permanent
orchestrator worktree will have) and asserts it is refused with the branchless reason, not weighed
against containment.

Plus branches skipped for being checked out in a kept worktree, or not contained in `main`
(`claude/ae-autonomous-cleanup` itself, `claude/ag-poll-status-field`). No risks, no manual cleanup
remaining, no non-empty leftover folders. **This branch and this worktree are excluded by
construction, not by luck**: the sweep refuses to run anywhere but the primary checkout, skips the
primary root, and never touches `main` or the current branch.

The exact command for the first supervised real run is in the owner-queue item.

## Needs the owner

One thing, and it is in `docs/acceptance/owner-queue/2026-08-30-cleanup-without-you.md`:

**A discrepancy in the record, surfaced rather than smoothed over.** The owner's memory entry
`fix-dont-ask` (2026-08-30 08:39) files an earlier version of this ask - *"we could also soon look
into automatically deleting work trees"* - as explicitly **NOT yet authorized**: "He said **look
into**, so this is a task to design, not a licence to start deleting." The later, explicit quote
this row acted on ("that line can then be deleted from the rules, and you have my permission to do
that") reached this session through its prompt, not through any file in the repo. The code and
tests stand on their own either way; the contract change is the part that rests on that quote, and
it is one revert if the owner reads it differently. **That memory entry should be updated to record
the later authorization and this branch** - it was left alone here because a subagent editing the
owner's memory is worse than a flagged discrepancy.

## Left undone, deliberately

- **`scripts/cleanup-archive.mjs` is a second copy-and-prove implementation beside
  `scripts/eval-archive.mjs`**, which is CLI-only with no exports. They now disagree in one way
  (the new one compares per-file byte sizes and symlink kind; the old one compares counts and the
  json/jsonl name set). Merging them means refactoring a tool that guards paid rounds, which is not
  a thing to do in the same change as a deletion mechanism.
- **`session-liveness.mjs` re-implements `blocked-sessions.mjs`'s transcript walker and tail
  reader.** Same reason: that script has no exports, and extracting the shared half is its own row.
- **Performance was left alone on purpose.** `assess()` spawns ~318 git processes (~10 s) on this
  checkout, ~220 of them `rev-list --count`; the review measured that two batched
  `for-each-ref --merged` calls answer the same question in 167 ms with zero mismatches. That is a
  real win and it rewrites the containment predicate - the single check that decides whether work
  is lost - to buy ten seconds in a tool that runs once a day. Worth doing, separately, with its
  own tests.
- **The liveness guard does not see a Codex or plain-shell session.** There is no signal on this
  machine that would, short of process-cwd inspection on Windows. Stated in the module header, the
  workflow doc and the owner-queue item rather than papered over: it guards convenience, and
  containment guards work.

## Next

The mechanism is finished and queued. The first real run is a supervised step and is not this
session's - the owner-queue item carries the command.

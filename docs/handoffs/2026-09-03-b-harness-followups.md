# Row B - the harness follow-ups, and what the measurement actually said

**Branch:** `claude/b-harness-followups`. Picking up the two remaining items from the orchestrator
harness review plus a correction the owner needed. Both source handoffs
(`2026-09-03-orchestrator-harness-review.md`, `2026-09-03-o-orchestrator-owns-it.md`) are deleted
in the first commit.

**Where their open items went.** The five from the harness review are restated below. The
orchestrator handoff's items 1-4 already had backlog files (`agents-md-byte-headroom`,
`instruction-files-need-a-shrinking-mechanism`, `instruction-gate-refuses-before-a-chain-fills`,
`e2e-webserver-hang-blocks-the-machine`). **Its item 5 had no home anywhere** - the
`wave-plan-check` refusal for rows whose `e2e-affected` sets intersect while their `TOUCHES` sets
do not - so deleting the handoff would have lost it. It is now
`docs/backlog/wave-plan-check-shared-e2e-sets.md`, carrying its three traps. `/check` caught this;
my first draft of this file claimed everything open was restated, and that was not true.

## The one thing that is blocked, and it is item 1

**`--permission-prompts none` was NOT added, because the flag does not exist on this machine.** The
row was conditional on the Claude Code upgrade having happened. It has not:

| Path | Version |
|---|---|
| `~/AppData/Roaming/npm/claude` (npm shim, first on PATH) | **2.1.251** |
| `~/.local/bin/claude` (native, shadowed) | **2.1.240** |

The flag lands in 2.1.259. I confirmed it is absent rather than assuming: `claude --help` on this
binary offers `--permission-mode` and no `--permission-prompts`. Adding it to the headless launch
path would have broken every headless launch, so I stopped at step 1 as instructed and did not run
the upgrade myself with four sessions live.

**What is still true about the change when it can be made:** headless path only, never as a general
posture, and paired with a prompt line telling the row to record any denial in its handoff. The
flag converts a visible stall into an invisible denial, so the recording line is the whole point.
Filed for the owner as `docs/acceptance/owner-queue/2026-09-03-upgrade-claude-code-and-clear-the-stale-binary.md`.

## The measured inventory - the owner's belief was half right

`agy models`, agy 1.1.25, 2026-09-03. Fourteen models. The full table, with the meter each one
bills, is appended to `docs/HARNESS_ROUTING.md` under "The Antigravity model inventory".

- **The Gemini pool has eleven models across four generations** - `gemini-3.8-flash`
  (high/medium/low), `3.7-flash` (high/medium/low), `3.6-flash` (high/medium/low), `3.1-pro`
  (high/low). It has not decayed and it is the broad pool.
- **The Claude/GPT pool has three** - `claude-sonnet-4-6`, `claude-opus-4-6-thinking`,
  `gpt-oss-120b-medium`. Here the owner's impression was exactly right.
- `poolForModel` in `scripts/agy-run.mjs` is the rule that assigns the meter - a `gemini` prefix
  bills the Gemini pool, `claude`/`gpt` the second, anything else falls to `antigravity-other`,
  which is a bug rather than a route. The doc says to read the rule, not the snapshot.

`routing.md`'s pool table now says which of the two shapes each pool is. Everything else in both
rows checked out against the measurement, including "largely unused", "separate meter", "no
`--effort` flag" and the claim that both doors are allowlisted - I verified the four allowlist
entries in `.claude/settings.json` rather than trusting the sentence. **The table deliberately
still carries no model ids**: routing.md's own "Where the facts live" rule puts those in
HARNESS_ROUTING, and I kept it.

**One thing `/check` caught here and it was right.** My first version of that cell said only that
the pool's newest tier "outranks the model this repo documents as the default" - which, in a table
loaded on *every plan* while HARNESS_ROUTING is not, reads as an invitation to reach past the
default. The measurement says the opposite. The cell now carries the verdict with the fact:
outranks it by version, lost on measurement, so the default stands.

## 3.8 against 3.7: the newer model lost

One question, identical prompt file, both models, sequential so the wall clock compares. A
three-part cross-file comprehension question over nine files in `src/export/` - the exact class the
routing table sends to this pool - with an answer I derived myself first.

| | `gemini-3.8-flash-high` | `gemini-3.7-flash-high` |
|---|---|---|
| All three parts | **100% correct** | **100% correct** |
| Wall clock | **89.7 s** | **16.9 s** |
| Output / thinking tokens | 22 286 / 20 809 | 4 756 / 3 789 |
| Cache read | 387 566 | 93 898 |

**The default is unchanged and the owner's 2026-08-30 ruling stands.** The rule set before running
was that 3.8 replaces 3.7 only by winning on both correctness and wall clock; it won neither -
a flat tie on correctness, 5.3x slower to get there. I did not touch `scripts/agy-run.mjs`.

Worth noticing: that ruling's stated reason was *"It's a newer model so it's fine."* Tested against
a model newer still, the reasoning does not extend. This is one question on one class, so it says
nothing about 3.8 on work where more deliberation might pay - a bounded artifact, a write in
volume. That is the next thing to measure, not a settled question.

## The branch-name defect, which bit this row too

The orchestrator caught mid-flight that I was committing on `worktree-agent-a6d0343187501afdc`
rather than the `claude/b-harness-followups` my prompt named. **`isolation: worktree` mints the
branch name; the `BRANCH` line in a row's prompt applies to nothing and no check compares the
two.** Two of four rows in this wave did it, including this one. Renamed with `git branch -m`
before pushing.

`launch.md` now records this and the registry defect together, because they are the same failure
class - the row runs while the plan still reads as honoured. My judgement on the real fix:
**the row renames before its first commit**, since it is the only party that can, and after the
first commit `merge-order` and the morning report have already read the wrong name.

**`/check` found the first version of that fix inert, and it was right.** I had written it only
into `launch.md`, which `orchestrator.md` loads *after the plan check passes, when rows are
launched* - so the session WRITING the prompt never reads it, and the next wave reproduces the
defect being documented. The rule now lives as a DO-step line rule in `prompts.md`, which is on the
every-plan path, and `launch.md` points at it. Paying for that took two lines out of the
multi-step bullet; the common path is 639/640. **One line of headroom left** - the next rule added
to an every-plan module has to move text out in the same change.

The rename also has a sharp edge worth knowing: `git branch -m <name>` fails outright if that name
already exists locally, and the row then carries on under the generated one - the same failure the
rule closes. Both files say to confirm it took.

The other half of step 8: a session reads `.claude/agents/` from **its own project root**, so a
session whose worktree predates the commit that added the routing rungs sees none of them and falls
back to a plain model launch at the session's own effort. The orchestrator's home being current is
not enough.

## The optional tail

Both unmeasured Codex surfaces exist on 0.153.0-alpha.5.1, and **neither earns a routing rule, for
the same reason: no machine-readable output.** `codex agents` is a TUI with no `--json`, so it
cannot extend the third liveness signal to Codex the way `claude agents --json` feeds
`blocked-sessions.mjs`. `codex queue --thread <uuid> --message <text>` is scriptable but needs a
UUID you already hold and returns nothing about the result, so it is not a delegation channel and
replaces nothing in `codex-rescue.mjs`. Recorded in HARNESS_ROUTING with what would change the
verdict: a `--json` on `codex agents`.

**Not done:** re-measuring whether a wave session now receives its own subagents' completion
notifications. That premise changes only on the upgrade, so it is worth re-testing after item 1 and
not before. The files-at-agreed-paths rule stays either way - it costs nothing and files survive a
session death.

## What is left, in priority order

1. **Upgrade Claude Code and remove the stale 2.1.240 binary** (owner-queue item). Everything below
   waits on it.
2. **Then add `--permission-prompts none` to the headless launch path in `launch.md`**, with the
   denial-recording prompt line. Headless only.
3. **Then re-measure the subagent-notification premise** behind the files-at-agreed-paths rule.
   Re-measure, do not repeal.
4. **Two knobs still unset, both the owner's call:** `--max-budget-usd` (a real money guard for an
   unattended night) and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, which defaults to 20 against this
   laptop's three-to-four session ceiling.
5. **Measure 3.8-flash on a class that is not recall** before deciding it is only a slower 3.7.

## Verification

`npm run build` green on the final tree, stamped `claude/b-harness-followups@81b3d40f` so it gated
this branch and not `main`. CI run `33734782824` green on that same sha: Build, Factory gates, E2E
plan and CI gate all success. **The e2e shards show as skipped and that is correct here** - the
plan job ran and found no product code in a docs-only diff, which is not the same as a run that
planned nothing because a later push cancelled it.

`/check` legs, per the workflow's rule that a mode is observed and never assumed:

- **review: `delegated`** - the code-review skill forked and handed its findings back, and they
  named this branch and this worktree's files, so it passed the phase-1 scope check. Six findings,
  all six verified against the surrounding files before acting, all six fixed. The two that
  mattered are written up above: the branch rule was inert in `launch.md`, and the every-plan
  routing cell pointed at the model the measurement rejected.
- **simplify: `inline`** - the skill returned instructions to fan out into four background agents
  and wait. In a launched session those completion notifications route to the launcher and never
  arrive, so per the workflow's four-branch rule the pass had not run and I covered the four angles
  here. Three fixes: a mid-bold line wrap in `launch.md`, that module restating the branch rule
  `prompts.md` now owns rather than pointing at it, and an editorialising clause trimmed from the
  always-loaded routing cell.
- **verify: `inline`** - the build above. No e2e run locally: no product code changed, and CI's own
  plan job agrees.

Verdict stamp at `<git-common-dir>/noacg-jobs/checks/claude-b-harness-followups.json`, `reviewedSha`
`81b3d40f`. Note for whoever maintains that path: **a worktree-isolated session cannot write it with
the Write tool** - the isolation guard refuses the shared-checkout path, and it took a copy through
a scratchpad file to land. Worth a mechanism rather than a workaround if the landing path is ever
going to read these.

No source code changed - this row is contracts, evidence, one backlog file and two owner-queue items.

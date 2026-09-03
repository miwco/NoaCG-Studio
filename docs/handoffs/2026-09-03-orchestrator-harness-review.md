# Orchestrator vs. the current harnesses - what changed, what was already right, what is left

**Branch:** `claude/noacg-orchestrator-review-0eeed9`. A review of the orchestrator against recent
Claude Code, Codex and Antigravity releases, then the improvements the owner asked for on the back
of it. Every version claim below was measured on this machine, not read out of a release note.

**What landed, in order.** `55a8cfe8` corrected two contract statements that had gone false.
`9933fd75` gave the night loop a third liveness signal and made Antigravity a write-capable worker.
`5e97af66` gave each routing rung an agent definition so a launch delivers the effort its plan line
promised, and gated the silent fallback.

Verified with `npm run build` on the branch (the version stamp names the branch, so the gate ran on
this tree and not on `main`), plus `test:worktree-safety` (60), `test:harness-usage` (71),
`test:claude-agents` (11) and `test:jobs`.

## What is installed, measured 2026-09-03

| Harness | Installed | Newest | Note |
|---|---|---|---|
| Claude Code | **2.1.251** (npm shim, first on PATH) | **2.1.259** | a second, older native install answers at `~/.local/bin/claude` on **2.1.240** |
| Codex CLI | 0.153.0-alpha.5.1 | - | |
| Antigravity `agy` | **1.1.25** | - | the docs said 1.1.22; corrected in this commit |

## The four findings, answered

**1. `--permission-prompts none` does not exist here yet.** It landed in **2.1.259**; this machine
is on 2.1.251. Probed directly (`error: unknown option '--permission-prompts'`) and confirmed
against the binary - the only `permission-prompts` string in it belongs to the
`fewer-permission-prompts` skill. So there is nothing stale to remove, and nothing to adopt until
the CLI is upgraded.

**It should not become the answer to permission prompts even then.** The standing rule is
`collisions.md`, "The machine's limits": plan inside the tracked allowlist, and never plan around
it by asking for bypass mode. The new flag does not lift that rule, it changes the failure - a
prompt that used to hang a row would instead be denied silently, and a denial that nobody sees is
worse for a night wave than a stall that `blocked-sessions.mjs` reports. Adopt it on the **headless
launch path only**, where there is genuinely no one to answer, and pair it with a prompt line
telling the row to record any denial in its handoff.

**2. The other Claude Code fixes are free wins on upgrade, with nothing to retire.** Concurrent
sessions reverting each other's `~/.claude.json` (2.1.259) matters directly to a three-to-four
session wave on one laptop, and the repo carries no workaround for it. The worktree-isolation
fixes (2.1.257, 2.1.259) stop the harness refusing ordinary Bash loops, heredocs and `xargs`
pipelines inside an isolated worktree - the same false-positive class this repo already fixed in
its own `guard-command.mjs` matcher, and not redundant with it: ours is dev-server and e2e policy,
the harness's is worktree containment. Stopping and duplicate-resume fixes touch nothing we do,
because the contract already says a stalled worker is **reported, never killed**.

One upgrade argument nobody has counted: 2.1.259 fixes blocking Stop hooks costing the next turn
its reasoning. `scripts/hooks/stop-wait.mjs` is a blocking Stop hook, so we have been paying that.

**3. Codex resume improvements do not obsolete a single line of `codex-rescue.mjs`.** The
wrapper's three workarounds are about the Claude plugin's companion script on Windows, not about
the Codex CLI: the launcher dying with its caller because `detached: true` does not break the
parent link `taskkill /T` walks, a dead job reported as running because nothing reconciled pid
liveness against status, and `taskkill /PID` being rewritten into a path by Git Bash's MSYS
conversion. Codex getting better at reconnecting changes none of those. **Keep all three.**

Codex 0.153 does carry two surfaces the routing doc has never measured - `codex agents` (browse
sessions on the shared local daemon) and `codex queue`. Worth a trial; not worth a rule yet.

**4. All three Antigravity fixes are already installed, and none of them were being worked
around.** 1.1.24 fixed the headless hang on exit with piped stdout/stderr; 1.1.23 fixed cancelled
subagents staying marked Running and MCP tools missing from a subagent that declared them. What
`agy-run.mjs` diagnoses is a different pair of causes - every tool auto-denied for want of an
allow-rule, and `--print-timeout` cutting a run off mid-task, both of which return
`status: SUCCESS` with an empty response and bill in full. **That classifier stays.**

## What was built

**The third liveness signal.** `scripts/claude-agents.mjs` reads `claude agents --json` - live
sessions with `pid`, `cwd` and `sessionId`, plus `status` and `waitingFor` on background rows. It
answers in well under a second and needs no terminal. Two callers use it:

- `blocked-sessions.mjs` now says, for every waiting session, whether a process still holds it.
  That splits one of the three causes off from the other two: a wait behind no live process is a
  row that is not coming back, and its slot is free while its work is unfinished. The other two - a
  permission prompt and a slow call - stay genuinely inseparable, and the output says so.
- `session-liveness.mjs` uses only the POSITIVE verdict: a live session in a worktree holds it,
  with no idle window to age out of. The negative verdict never authorises a deletion, because
  containment is what makes a deletion safe and evidence is not containment.

Both degrade to exactly their previous behaviour wherever the inventory does not answer, and the
capability is probed on the rows that come back rather than inferred from a version. It sees no
Agent-tool subagent, no Codex session and no other machine, so it is a third signal beside the two
file-based ones and never a replacement. `night.md` tick step 2 was rewritten to match; the
sentence that said nothing could separate the three causes was true when written and is not now.

**Antigravity as a write-capable worker.** `npm run agy -- --write` and the underlying script are
allowlisted, so a night no longer spends a permission prompt on a write delegation. The scoping is
in the wrapper, where it can be tested, rather than in the pattern, which cannot exclude a trailing
argument: a write is refused outside a linked worktree, refused on `main` and on a detached HEAD,
and every write run prints the paths it changed. So a delegate can never touch the tree the landing
queue rewrites during an integration, and whatever it writes sits on a feature branch reviewed,
gated and queued like anything else. **What is not scoped, and is written down rather than
implied:** agy's grants are machine-global, so it can still reach a sibling worktree once running.
`agy` exposes no per-run settings path - I checked the binary for a config-directory override and
there is none - so the mitigation is the refusals, absolute worktree paths in the prompt, and a
reviewer treating an unexpected path in the printed list as an incident.

**A definition per routing rung.** `.claude/agents/` now holds `wave-row` (opus high),
`wave-row-deciding` (opus xhigh), `wave-row-mechanical` (sonnet) and `wave-row-design` (fable high),
each carrying its effort and `isolation: worktree`, and each repeating the queue-as-last-action
rule. `launch.md` maps a plan line to its definition. The failure this closes is silent - a launch
naming a model alone runs at the launching session's effort while the plan still reads as honoured
- so `check:shared-instructions` refuses a contract naming an agent the directory does not define,
and refuses a definition whose name and filename disagree. It deliberately does not validate model
or effort VALUES: those belong to the installed harness.

**Versions are asked, not stored.** `npm run harness:usage` - the instrument the orchestrator
already runs at plan time - now prints the installed version of each harness, and a pool with no
binary reads as such, which is itself a routing fact. The remaining version numbers in
`HARNESS_ROUTING.md` are dated trial records, which is what an append-only evidence file is for;
the current-state claims are gone.

## What is left

**1. Upgrade Claude Code, and clean up the second install.** 2.1.251 to 2.1.259 is eight releases
including the concurrent-config fix (four sessions on one laptop), the blocking-Stop-hook fix (we
run one), and `--permission-prompts none`. The stale 2.1.240 binary at `~/.local/bin/claude`
shadowed by the npm shim is its own hazard, since which version answers depends on PATH order. Not
done here: it mutates shared machine state under several live sessions, so it wants a quiet moment.

```bash
npm i -g @anthropic-ai/claude-code
```

**2. Adopt `--permission-prompts none` on the headless path only, after that upgrade.** It denies
what would prompt instead of hanging, which is right where nobody can answer - and wrong as a
general posture, because it turns a stall the loop can SEE into a denial it cannot. The allowlist
stays the mechanism; this is the net under it. Pair it with a prompt line telling the row to record
any denial in its handoff.

**3. Re-measure the fan-out rule after the upgrade, do not repeal it.** 2.1.259 saves nested
background subagent results into the parent subagent's transcript, which is the premise behind
`prompts.md`'s "collect results via FILES at agreed paths". The rule costs nothing and files
survive a session death, so it stays either way - but the incident behind it may have lapsed.

**4. Two knobs worth a decision, both unset.** `--max-budget-usd` now halts background subagents at
the cap, which is a real money guard for an unattended night and therefore the owner's call.
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` defaults to 20, far above this laptop's three-to-four
session ceiling, so the cohort rule in `collisions.md` stays the only thing protecting RAM.

**5. Trial the two Codex surfaces nothing has measured** - `codex agents` (sessions on the shared
local daemon) and `codex queue`. Worth an experiment; not worth a routing rule yet.

## What the review confirms was already right

Durable wave state, worker liveness, recovery and serialized landing are all system-level and none
of them rest on a harness feature. The wave-state file and `wave-tick-events.log` survive the loop
dying, which it has done in both observed nights. Landing goes through `auto-merge.mjs` and
`--ff-only`, so no harness improvement makes it safer or riskier. The additive-never-load-bearing
rule for the watch loop is what makes every one of the fixes above a convenience rather than a
dependency - and that is the property to protect if any of these proposals is taken up.

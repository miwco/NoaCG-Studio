# Orchestrator vs. the current harnesses - what changed, what was already right, what is left

**Branch:** `claude/noacg-orchestrator-review-0eeed9`, one commit `55a8cfe8`. Documentation and
contract text only; no script, hook or gate was touched. `check:shared-instructions`,
`check:docs-index`, `check:line-endings` and `check:copy` all pass on the branch.

A review of the orchestrator against recent Claude Code, Codex and Antigravity releases. Every
version claim below was measured on this machine, not read out of a release note.

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

## What this commit changed

- `orchestrator/launch.md` said the Agent tool sets a model but no effort, and routed any row whose
  effort was the point to headless - the path that died silently on an expired OAuth in 2026-08-28.
  An agent **definition** now carries `effort:` beside `model:`, so the primary path can deliver a
  whole MODEL line. The sentence says so and points at the docs rather than restating the field
  list.
- `HARNESS_ROUTING.md` and `AGENT_WORKFLOWS.md` pinned `agy` at 1.1.22 in prose. They now name
  `agy --version` and `agy changelog` as the instruments, and record the three fixes that landed.

## What is left, in the order I would take it

**1. `claude agents --json` is a real liveness instrument and the repo uses it nowhere.** It runs
headlessly, needs no TTY, and returns one row per live session with `pid`, `cwd`, `sessionId` and
`name`; background rows additionally carry `status` and, when that status is `waiting`,
`waitingFor`. Verified by running it here and by reading the row shape out of the binary.

Two of our instruments are transcript-mtime heuristics that document their own weakness.
`session-liveness.mjs` measured its by-name lookup missing sixteen of nineteen agent worktrees, and
says outright that a Codex or shell session leaves no signal at all. `blocked-sessions.mjs` says it
cannot separate a permission prompt from a dead session from a slow call. A live pid in a working
directory settles the first question outright, and a background row's `status: waiting` settles the
second one authoritatively.

**It replaces neither.** It cannot see Agent-tool subagents, which are not separate processes, and
it sees nothing outside Claude Code. Add it as a signal beside both, never instead of them.

**2. There are no agent definitions in this repo at all** - `.claude/agents/` does not exist. Until
the routing ladder's rungs exist as definitions, `wave-plan-check` will keep accepting a MODEL line
the launch path cannot deliver. The frontmatter also takes `permissionMode`, `maxTurns` and
`isolation: worktree`, which is the wave's per-row posture written down in git instead of carried
in a prompt.

**3. An `agy` WRITE delegation still hits a permission prompt.** `.claude/settings.json` allows
`npm run agy:read *` and `node scripts/agy-run.mjs --read-only *`; `routing.md` tells a delegating
row to pass `--write`, which matches no allow rule. That is a wave depending on a prompt being
answered, which `collisions.md` forbids. **Not changed here on purpose** - widening the machine's
permission posture is one of the two hard edges `launch.md` names, and it wants the owner's own
decision about a write-capable delegate.

**4. Upgrade Claude Code, and clean up the second install.** 2.1.251 to 2.1.259 is eight releases
including the concurrent-config fix, the Stop-hook fix, and `--permission-prompts none`. The stale
2.1.240 binary at `~/.local/bin/claude` shadowed by the npm shim is its own hazard - the version
that answers depends on PATH order. Not done here: upgrading while four sessions are live is the
owner's call.

**5. Re-measure the fan-out rule after the upgrade, do not repeal it.** 2.1.259 saves nested
background subagent results into the parent subagent's transcript, which is the premise behind
`prompts.md`'s "collect results via FILES at agreed paths, never wait on notifications". The rule
costs nothing and files are durable across a session death, so it stays either way - but the
incident behind it may have lapsed, and that is worth knowing before the next fan-out is planned.

**6. Two harness knobs worth a decision, both unset.** `--max-budget-usd` now halts background
subagents when the cap is reached - a real money guard for an unattended night.
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` defaults to 20, far above this laptop's three-to-four
session ceiling, so the cohort rule in `collisions.md` remains the only thing protecting RAM. The
harness will not do it for us.

## What the review confirms was already right

Durable wave state, worker liveness, recovery and serialized landing are all system-level and none
of them rest on a harness feature. The wave-state file and `wave-tick-events.log` survive the loop
dying, which it has done in both observed nights. Landing goes through `auto-merge.mjs` and
`--ff-only`, so no harness improvement makes it safer or riskier. The additive-never-load-bearing
rule for the watch loop is what makes every one of the fixes above a convenience rather than a
dependency - and that is the property to protect if any of these proposals is taken up.

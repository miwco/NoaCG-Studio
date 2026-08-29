# Shared agent instructions and workflows

This repository supports Claude Code and Codex from one set of project rules and workflow
procedures. The build fails when their adapters drift.

## Canonical sources

- `AGENTS.md` is the authoritative project-instruction file. Nested `AGENTS.md` files add
  binding rules for their directory trees.
- Each sibling `CLAUDE.md` is a thin `@AGENTS.md` import. It may add genuinely Claude-specific
  rules, but it must not copy the shared contract.
- `.agent-workflows/<name>.md` contains the complete, tool-neutral procedure for a reusable
  workflow.

## Tool adapters

- Claude Code exposes a workflow through `.claude/commands/<name>.md` or
  `.claude/skills/<name>/SKILL.md`.
- Codex exposes the same workflow through `.agents/skills/<name>/SKILL.md`.
- An adapter contains only metadata, invocation policy, argument translation, and a pointer to
  the canonical workflow. Behavioral changes belong in `.agent-workflows/<name>.md`, so they
  reach both tools in the same commit.
- Shared workflows must use repository state and repository documentation as evidence. Do not
  make tool-private memory or a user-specific home-directory path part of the shared contract.
- Destructive workflows must be explicit-only in both tools. Claude uses
  `disable-model-invocation: true`; Codex uses
  `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.

Codex project skills use `.agents/skills`, not the legacy `.codex/skills` location. The
repository's `.codex/config.toml` is still used for trusted project configuration.

## Short aliases

A workflow may have a short invocation alias - `/n` and `$n` for `next`, `/o` and `$o` for
`orchestrator`. An alias is nothing but
a second pair of adapters (`.claude/commands/<alias>.md` and `.agents/skills/<alias>/SKILL.md`)
pointing at the target's canonical workflow, so a shortcut can never grow its own copy of the
procedure. `WORKFLOW_ALIASES` in `scripts/check-shared-instructions.mjs` is the registry; the
check fails if either adapter is missing, thick, or points somewhere else. A destructive
(explicit-only) workflow must never be aliased - a one-keystroke command must not be able to
land anything.

## Tool-specific exceptions

`/rescue` is intentionally Claude-only. It delegates a long-running task from Claude Code to
the Codex companion plugin, so invoking it from Codex would have no coherent meaning. Every
other repository-owned Claude command or skill must have a canonical workflow and Codex
adapter.

Its mechanics live in `scripts/codex-rescue.mjs`, not in the command file, because the plugin
lives in a version-keyed cache that a plugin upgrade replaces wholesale - a fix written there
would silently disappear. The wrapper launches the plugin's own companion script through a relay
so the Codex worker is never a live descendant of the calling session, reconciles pid liveness
against job status so a killed job stops reporting as running, and cancels with argv that Git
Bash cannot rewrite. `scripts/codex-rescue.test.mjs` pins all three; the defects they replace are
written out in that script's own header, which is where the record lives - the first delegation
trial's handoff was a working note and has since been swept.

## What a harness actually cost

`npm run harness:usage` prints, for any time window, what each harness spent - Claude Code and
Codex side by side. `--since <iso>`, `--hours <n>` or `--wave` (since the newest
`docs/handoffs/*wave-plan*.local.md` was written) pick the window; with no flags it is the last 24
hours, and `--json` gives the same numbers to a script. It reads only local transcripts, calls no
API, and writes nothing.

It exists because "am I paying for the Codex subscription for nothing" was unanswerable, and
because every routing decision - which harness gets which work - otherwise rests on impressions.
The first delegation trial is the reason that matters: it felt like ten minutes of Codex working,
and Codex had written nothing.

**What it reads.** Codex: `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl` **and**
`~/.codex/archived_sessions/*.jsonl` - archiving is a move, so reading only the first tree loses
the finished work, which is most of it. Claude Code: `~/.claude/projects/<encoded-cwd>/*.jsonl`,
one directory per cwd, plus `<that directory>/<session-id>/subagents/*.jsonl` for every agent a
session launches - which is where a wave's work actually lives.

**What it cannot know: Claude Code's own 5-hour window percentage.** There is no rate-limit event
anywhere in `~/.claude/projects/**`; the transcripts carry token usage and nothing else. The
script therefore prints the tokens and says so, rather than estimating a percentage of an
allowance nobody has published. Codex has the percentages only because Codex writes its own
`rate_limits` payload into the rollout.

**A percentage is a snapshot, not a rate.** `primary.used_percent` (the 5-hour window) and
`secondary` (weekly) describe a rolling window shared by every session, so two sessions'
percentages never add and a reading from four hours ago is not a reading about now. Exactly one
pair is ever reported, stamped with the time it was taken. A quiet window has no snapshot at all,
which is not the same as 0% used.

Three counting traps are handled and pinned in `scripts/harness-usage.test.mjs`. Claude Code
writes the same assistant record two or three times (and a resumed session copies earlier records
into its new file), so requests are deduped on message id plus request id across every file.
Codex's `last_token_usage` does not sum to its own session total, so the meter walks the
cumulative `total_token_usage` and takes deltas instead. And **`sessionId` does not identify a
session**: every agent a wave launches inherits the parent's `sessionId` AND the parent's
`gitBranch`, so counting those would report six agents in six worktrees as one session on one
branch. The transcript file is the session, and the cwd its first record names is the worktree -
which is why the "by project" table is the one to read for a wave, and the report says so under
the branch table.

## Google's harness is Antigravity CLI, not Gemini CLI

Verified 2026-08-30 on this machine. **Gemini CLI is retired** - Google announced the
consolidation at I/O on 2026-05-19 and individual accounts (AI Pro, Ultra, free Code Assist) lost
the legacy CLI on **2026-06-18**, with no grace period and no automatic migration. Only purchased
Gemini Code Assist enterprise licences may still run it. So Gemini CLI is not a harness to build
anything on.

**The IDE at `AppData\Local\Programs\antigravity` genuinely has no headless entry** - it is an
Electron app plus `resources/bin/language_server.exe`, with no `bin/`, no `.cmd` and no
command-line surface. That was never where the headless path lived. **Antigravity CLI is a
separate product**: a single Go binary called `agy`, installed to
`C:\Users\<user>\AppData\Local\agy\bin` (`~/.local/bin/agy` on macOS/Linux), and it does ship
headless mode. On this machine `agy` is already installed at version 1.1.22 and already
authenticated - `agy models` answers with the model list without prompting for anything.

The headless surface, from `agy --help` on 1.1.22: `-p` / `--print` / `--prompt` for a single
non-interactive prompt, `--output-format text|json|stream-json`, `--input-format` (`stream-json`
reads one NDJSON message per line from stdin), `--model`, `--effort low|medium|high`, `--mode
accept-edits|plan`, `--sandbox`, `--print-timeout` (default 5m), `--json-schema` for structured
output, and `--dangerously-skip-permissions`. Subcommands include `models`, `agents`, `mcp` and
`plugin`. That is a delegation channel of the same shape as the Codex one.

The one step left is the owner's, because it edits shell settings: `agy install` puts the binary
on PATH. `docs/acceptance/owner-queue/2026-08-30-s-antigravity-readiness.md` carries it, with the
install and login commands for a machine that does not have it yet.

## Instruction size

Codex limits the bytes it loads from the root-to-current-directory `AGENTS.md` chain.
`.codex/config.toml` raises that limit for this trusted repository because its nested contracts
are intentionally detailed. `scripts/check-shared-instructions.mjs` calculates every chain and
fails if one exceeds the configured limit. On a GREEN run it also prints the tightest chains with
their remaining headroom, and marks any chain past 80% of the limit - a chain a few hundred bytes
under budget is otherwise indistinguishable from a comfortable one, and the limit itself only ever
ratchets DOWN (`.codex/config.toml`), so "lower it until it fails" is not a way to find out.

When a chain runs short, RELOCATE rather than delete: move a section that describes one directory
into that directory's own `AGENTS.md` (plus the thin `CLAUDE.md` importing it) and leave a pointer
behind. The content still loads for the people editing that code, and it leaves every OTHER chain.
`src/components/` is the worked example - `wizard/`, `canvas/`, `video/`, `home/`, `fields/`,
`style/` and `auth/` all carry their own contract, so a session editing the wizard no longer loads
the video shell's; `src/templates/` did the same for `types/`, `pack4/` and its eleven big
categories, and `e2e/` now owns the traps a SPEC falls into.

Two things that look like relocation and are not. **Moving a section DEEPER on the same path buys
nothing** - a chain is measured to its leaf, so pushing `wizard/`'s detail into `wizard/steps/`
only moves which leaf is tightest. The saving comes from moving content OFF a shared ancestor into
ONE branch, so the siblings stop paying for it. And **when the files a section describes are loose
in the parent folder, moving THEM into a directory is the fix**, not shorter prose: that is how
`src/components/canvas/` came to exist on 2026-08-22, after the wizard chain had 297 bytes left and
every session editing a wizard step was loading the whole canvas gesture contract.

## Adding or changing a workflow

1. Add or edit `.agent-workflows/<name>.md`.
2. Add or update the thin Claude adapter.
3. Add or update the thin Codex adapter and valid `name` / `description` frontmatter.
4. For a destructive workflow, configure explicit-only invocation in both adapters.
5. Add any repository-owned skill name to the `.gitignore` exceptions.
6. For a short alias, register it in `WORKFLOW_ALIASES` and add both thin adapters - never a
   second copy of the procedure.
7. Run `npm run check:shared-instructions`, the relevant focused tests, and `npm run build`.

Never put a second copy of the procedure in a tool adapter.

## Three traps in the tooling itself

- **A personal command silently outranks the project's.** Claude Code's precedence is personal >
  project, so `~/.claude/commands/<name>.md` always wins over `.claude/commands/<name>.md` for a
  colliding name - with no error and no warning. Confirmed live 2026-07-25 for `/safe-merge` and
  `/handoff`, which expanded to repo-agnostic personal versions while the correct project files
  sat on disk unused. (`next`, `cleanup-worktrees` and `noacg-task` have no personal counterpart;
  Codex has no equivalent collision - `~/.codex/skills/` and `~/.codex/prompts/` are clean.) Both
  personal files now open by checking for `.agent-workflows/<name>.md` in the invoking repo and
  deferring to it, so the collision is handled rather than avoided. **Do not assume a project
  command file's content is what runs** - `ls ~/.claude/commands/` for collisions first.
- **Codex writes ONLY to the session's worktree.** Delegating while the session sits in worktree A
  and the work lives in worktree B fails: the sandbox root comes from the session cwd, not from
  the path in the prompt, so restating the target path does not help. It refuses with "the
  requested worktree is read-only" and writes nothing - correctly, since editing another checkout
  would corrupt a parallel session. Move the SESSION (`EnterWorktree` at that path), then
  relaunch. **It fails intermittently**, which is what makes it dangerous: one batch of three got
  through and two were blocked from the identical cwd. Diagnose by comparing live processes
  against files on disk, not by waiting. A Codex task can also `git checkout` and DETACH HEAD in a
  shared worktree - it cannot commit (index.lock), but a later commit then lands off-branch.
- **Never round-trip a source file through PowerShell.** Windows PowerShell 5.1 is the only
  edition here, and it defaults to UTF-8 on neither side: `Get-Content` decodes as the system ANSI
  codepage and `Set-Content -Encoding utf8` re-encodes WITH a BOM. A quick sed-style patch
  therefore glues `EF BB BF` to the first token and mojibakes every non-ASCII character - and this
  repo's comment style is full of em dashes and arrows, so one round-trip of a single spec file
  turned a one-line change into a 42-insertion diff. **The tests still pass afterwards**, because
  mojibake in comments and a BOM before `import` are both legal. Use the editing tools.

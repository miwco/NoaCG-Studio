# Harness routing

**Three harnesses can do work on this repo. This file records what each one is actually good
for, from measurement rather than impression, and it is written to be APPENDED to.** A session
that routes a piece of work somewhere and learns something adds a dated entry under the harness it
used; nobody rewrites the earlier entries, because the value here is the accumulation. An entry
with no evidence behind it is an opinion and does not belong.

Companion files: `npm run harness:usage` (what each harness has actually consumed, from the
harnesses' own transcripts), `.claude/commands/rescue.md` (the Codex procedure), and
`scripts/codex-rescue.mjs`'s header (why that channel is shaped the way it is).

## The routing table

| Kind of work | Route to | Why | What it costs |
|---|---|---|---|
| Anything needing judgement about THIS product - taste, architecture, what to build | Claude Code | It carries the repo contracts, the owner's decisions and the session history. The other two start cold every time. | The scarce resource. A wave session runs 10-20 M tokens/hour, almost all cache reads. |
| Bulk same-shape edits across many files | Codex (`/rescue --write`) | Long to do, short to specify - the shape delegation is good at. | Subscription window, not per-token. Measured 2026-08-29: the whole day's Codex use sat at 41% of its weekly window. |
| A well-specced build spanning 5+ files | Codex (`/rescue --write`) | Same reason. The spec is the work; writing it out is cheaper than doing it. | As above, plus the time to write a spec good enough to hand over. |
| A bug still failing after 2 genuine fix attempts | Codex (`/rescue`) | A second model with a different prior. Read-only by default, so it costs a diagnosis, not a diff. | As above. |
| **Read-across-many-files comprehension questions** | **Antigravity (`agy -p`)** | **Measured below: a 3-part cross-file question about the export registry came back 100% correct in 99 s, one call, no follow-ups.** | Free at the subscription; ~160 K input + ~1.2 M cache-read tokens for one such question, which is on Google's meter, not Claude's. |
| **A bounded artifact written to a spec, judged before use** | **Antigravity (`agy -p`), then read it yourself** | **Measured below: an unseen gate script came back correct on first run, matched the house script conventions closely, and caught a real edge case in the input.** | As above. Grading it costs a few minutes and is not optional. |
| Reading an undocumented file format and deciding what it means | Claude Code | Short to do, long to specify - the class the 2026-08-29 delegation trial named as a poor delegate. | - |
| Anything that must be landed, gated, or merged | Claude Code | Only this harness runs the merge queue and knows the serialization rules. | - |

## Claude Code

The default, and the only harness that holds the repo's contracts (`AGENTS.md`, the nested
per-area files, memory, the owner queue) without being told them. Everything about it lives
elsewhere in this repo; it is listed here only so the table is complete.

**Cost, measured 2026-08-29/30 by `npm run harness:usage`:** nine concurrent sessions did 470 M
tokens over twelve hours, dominated by cache reads billed per request. Its 5-hour window
percentage is **not** in the transcripts, so no meter can report it - that is the reason the other
two harnesses matter at all.

## Codex (the delegation channel)

**What it is:** `scripts/codex-rescue.mjs`, driven by `/rescue`. The Codex plugin's companion
script is the engine; the wrapper exists because the CHANNEL around it failed three ways in the
first trial, all invisible from the plugin's own status API - the launch died with its caller, a
dead job reported as running forever, and cancel could not kill anything on Windows. All three are
written out in that file's header.

**Invocation:** `/rescue [--write] [--model m] [--effort e] <task>`, launched from the session that
asked for it, never through a subagent - the subagent's lifetime is the whole problem. Read-only
unless `--write`.

**Cost:** a subscription window, not per-token. `npm run harness:usage` reads Codex's rollout files
and prints the 5-hour and weekly rate-limit percentages with their reset times, which is the
soundest number any of the three harnesses exposes.

**Good at:** work that is long to do and short to specify. **Bad at:** work that is short to do and
long to specify. **Still true after every trial so far:** verify its result by re-deriving the
receipt from scratch, not by checking that it did what it was told - a wrong site list passes that
check.

## Antigravity (Google) - first trial, 2026-08-30

**What it is:** `agy.exe`, a single Go binary, version 1.1.22, already installed and already
authenticated on this machine at `C:\Users\ahonemi\AppData\Local\agy\bin\agy.exe`. It is a
separate product from the Antigravity IDE, which genuinely has no headless entry. Gemini CLI is
retired for individual accounts since 2026-06-18, so this is the only Google harness there is.

### The invocation that works (Windows, Git Bash)

Full path, because the binary is not on PATH:

```bash
"C:/Users/ahonemi/AppData/Local/agy/bin/agy.exe" -p "<prompt>" --output-format json --mode plan
```

Run it with the WORKTREE as the working directory. `--mode plan` is the read-only posture.
`--output-format json` prints one JSON object on stdout, `text` prints prose, `stream-json` emits
NDJSON. Other flags that matter: `--model` (see `agy models`), `--effort low|medium|high`,
`--json-schema`, `--print-timeout` (default 5m), `--add-dir`.

**Do not pass `--dangerously-skip-permissions`.** It appears in the help output; it is a
capability, not an instruction.

### The blocker, and the exact file that lifts it

**Headless `agy` cannot use a single tool - not even reading one file - unless an allow-rule exists
first.** There is no prompt to answer in print mode, so every tool call is auto-denied and the run
returns `status: SUCCESS` with an EMPTY `response`. That failure mode is quiet: the exit code is 0
and the JSON says success. Both of this trial's first two attempts hit it, once on `command` and
once on `read_file`.

The lift is one machine-global file, `~/.gemini/antigravity-cli/settings.json`, which does not
exist by default. This exact content was written, used for both trials below, and then **removed
again**, so the machine is as it was found:

```json
{
  "permissions": {
    "allow": ["read_file(*)", "list_dir(*)", "grep_search(*)", "codebase_search(*)"],
    "deny": ["write_file(*)", "command(*)"]
  }
}
```

Rule grammar, read out of the binary: `read_file(<path>)`, `command(<program>)`, `write_file(<path>)`,
with `*` and `/` accepted as targets; the three buckets are `allow`, `deny`, `ask`.

**It was not left in place, and a session should not leave one in place on its own,** for one
concrete reason: it is unknown whether `deny` also applies to the owner's INTERACTIVE `agy`
sessions. If it does, a `deny: write_file(*)` left behind would silently break his IDE-side CLI.
Installing it is an owner action (`docs/acceptance/owner-queue/2026-08-30-y-antigravity-trial.md`),
and until then every session that wants headless `agy` pays this same setup cost.

### Trial A - comprehension. Grade: pass, no defects

Question, asked cold with no repo context supplied: list every registered export target with its
exact `id` and `label`; state the `ExportTarget` interface field by field including the `build`
signature; name the shared module that composes a self-contained HTML file and say exactly which
targets import it and which do not.

Ground truth was established first, by hand, from `src/export/registry.ts`,
`src/export/targets/*.ts` and `src/export/selfContained.ts`.

Every part was correct: all six ids and labels, the interface verbatim, and the three importers of
`composeSelfContainedHtml` (`casparcg`, `h2r`, `html-overlay`) against the three that do not
import it. It went one step past the question and noted, correctly, that `liveos` gets its package
by delegating to `ograf`'s `addOgrafPackage`.

**99 s, one turn, no follow-up needed.** Doing the same by hand took four tool calls and about the
same wall-clock, so the win here is not speed - it is that the whole thing happens on someone
else's meter.

### Trial B - generation. Grade: pass, with two real misses

Task: write `scripts/check-style-parts.mjs`, a gate that parses the `@import` list in
`src/styles/index.css` and fails on a missing import, an unimported part, or a duplicate import -
matching the repo's existing `scripts/check-*.mjs` conventions, which it was told to read first.

The output was transcribed to a scratch directory (never into the tree) and RUN:

- **Correct against the real repo.** 31 imports parsed, 30 parts on disk, no findings - which is
  the true state.
- **Correct on injected faults.** A synthetic fixture with a missing import, a duplicated import
  and an orphan part produced exactly three findings, one per class.
- **It found the trap without being told.** `index.css` has a 21-line header comment that contains
  the literal text `@import rather than one import per file in main.tsx`. A naive regex counts 32
  imports and then fails looking for a part named after prose. Its script strips CSS comments
  before matching, and it named this edge case in its own notes. It also handled
  `@import '../brandTokens.css'`, which resolves OUTSIDE `src/styles/`.
- **Convention match was close to exact:** the shebang, the "why this exists" header with dated
  incident history, `repoRoot` from `import.meta.url`, exported pure functions, the
  `main()` + `if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))`
  guard, and the bulleted `console.error` failure block are all the house pattern.

The two misses, both of the same kind - **it asserts things it has not checked**:

1. **No sibling `.test.mjs`.** Every real gate of this shape has one (`check-function-budget.test.mjs`,
   `check-vercel-config.test.mjs`, `check-copy.test.mjs`) and the classifier, not the prose, is the
   guard. It neither wrote one nor said it was missing.
2. **Its header comment claims the gate "runs as a static verification in `npm run build`".** It
   does not; nothing was wired into `package.json`. A comment that states an untrue fact about the
   build is exactly the kind of thing that gets believed later.

**Net:** the code was better than the claims about the code. That is the shape of the risk with
this harness - read what it says as carefully as what it wrote.

### Cost, and what a usage meter can read

**`agy` exposes per-run usage on stdout and NOWHERE ELSE.** With `--output-format json` the single
result object carries:

```
.conversation_id        string, also the name of the on-disk conversation store
.status                 "SUCCESS" even when every tool call was denied - see the blocker above
.response               the model's text; EMPTY string is the tell for a permissions failure
.duration_seconds       float
.num_turns              int
.usage.input_tokens     int
.usage.output_tokens    int
.usage.thinking_tokens  int
.usage.cache_read_tokens int
.usage.total_tokens     int   (input + output; it does NOT include cache reads or thinking)
```

The same field names exist in the binary for `stream-json`, under a `result` event with `type` and
`subtype`.

**There is no cumulative usage anywhere on disk.** `~/.gemini/antigravity-cli/` holds
`conversations/<id>.db` (SQLite with protobuf blobs), `annotations/<id>.pbtxt` (a title, nothing
else), `cache/conversation_metadata.json` (id, preview, step count, timestamps, project id -
**no tokens**), `jetski_state.pbtxt` (onboarding and migrations) and `log/cli-*.log`. A text scan
of all of them finds no token field. **So the third reader the usage meter wants cannot be a file
reader** - the only way to account for `agy` spend is to capture the JSON result at call time and
append it somewhere yourself, which is what `scripts/agy-run.mjs` now does.

**Quota is not exposed headlessly either.** The binary contains quota-bucket strings, but they
belong to the interactive TUI's dimmed-model display. No headless surface prints a remaining
allowance, and there is no `agy usage` subcommand.

**This is now built: `npm run agy -- --model <id> "<prompt>"`.** `scripts/agy-run.mjs` is the one
way this repo calls `agy`. It pins the model, refuses `--dangerously-skip-permissions`, treats an
empty response as a failure, and appends one JSON line per call - success or failure - to
`~/.noacg/agy-usage.jsonl`, which `npm run harness:usage` reads back as a third report block. Every
sentence in this section is what that block says out loud about its own limits.

**One more gap for anyone metering it: the JSON result does not name the model that answered.**
Pin it with `--model` (e.g. `gemini-3.1-pro-high`) if the attribution has to be sound.

Observed numbers, for scale:

| Run | Wall clock | input | output | thinking | cache read |
|---|---|---|---|---|---|
| Trivial prompt, no tools | 2.2 s | 17.8 K | 31 | 29 | 0 |
| Trial A (comprehension) | 99 s | 160 K | 10.6 K | 7.1 K | 1.15 M |
| Trial B (generation) | 87 s | 175 K | 17.4 K | 13.1 K | 1.30 M |

A trivial prompt already costs ~18 K input tokens, so the system prompt is large and there is no
cheap call.

### Three more facts, measured 2026-08-30 while building the meter

Five real calls through `npm run agy`, of which **two returned nothing and still billed**. That is
the headline: on this harness a failure is not cheap.

- **An empty response has TWO causes, not one, and they need different fixes.** Besides the denial
  below, a run that reaches `--print-timeout` (default **5 minutes**) is cut off mid-task and
  returns an empty string with `status: SUCCESS` and exit code 0 - identical to a denial from the
  outside. One such run here **spent 202 K input and 1.56 M cache-read tokens for nothing**. The
  wrapper tells them apart by elapsed time and names both. Raise the ceiling (`--print-timeout 8m`)
  for anything that has to read more than a file or two; the same question then succeeded in 386 s.
- **Half the grant grammar in this doc's settings file is silently ignored.** Only `read_file`,
  `command` and `write_file` are real actions. `list_dir(*)`, `grep_search(*)` and
  `codebase_search(*)` are accepted into `settings.json` and then dropped -
  `permission_grant_store.go` logs `ignoring invalid allow entry ... unknown action`, and nothing
  in the JSON result or on stderr ever says so. A settings file that looks complete is not.
- **In a linked worktree it reads the WRONG CHECKOUT.** This is stronger than the citation defect
  below. Asked from a worktree to read `scripts/agy-run.mjs`, it reported the file does not exist
  and that `harness-usage.mjs` has no `AGY` exports - both true of `C:/claude/NoaCG-Studio` and
  false where it was standing. Its own log shows it grepping the main checkout, including *other
  sessions' worktrees*. **An ABSOLUTE path works** (the same file, read by full path, answered
  correctly in 10 s for 27 K input tokens). So: run it from the main checkout, or hand it absolute
  paths - a relative path silently answers about another branch's code.

### Gotchas found in this trial

- **A denied tool looks like success.** `status: SUCCESS`, exit 0, empty `response`. Anything
  driving `agy` must treat an empty `response` as a failure.
- **It reads `AGENTS.md` on its own.** Its customization system walks from the cwd up to the repo
  root loading `AGENTS.md` / `GEMINI.md`, so it inherits this repo's contract without being handed
  it. That is most of why Trial A landed.
- **Its file citations name the WRONG CHECKOUT in a worktree.** Both trials ran with the cwd set to
  a linked worktree, and its own log confirms it read the worktree's files - but every
  `file:///` link it printed pointed at `C:/claude/NoaCG-Studio/src/...`, the main checkout. The
  content was right and the links were wrong. Never paste its citations forward unchecked.
- **State it writes:** a conversation store, an annotation and a log per run, under
  `~/.gemini/antigravity-cli/`. Nothing in the repo, in plan mode with `write_file` denied.

### What is still unmeasured about Antigravity

- **Writing.** Both trials were read-only by design. Nobody has let it edit a file, so its diff
  quality, its behaviour under `--mode accept-edits`, and whether `write_file(<scoped path>)` rules
  actually confine it are all unknown.
- **Long tasks.** Both trials were single-turn. `--print-timeout` defaults to 5 minutes; how it
  behaves on a task needing twenty tool calls is untested.
- **Model choice.** Everything above ran on the CLI's unpinned default. `agy models` lists Gemini
  3.x Flash/Pro tiers plus Claude and GPT-OSS entries; no comparison has been run.
- **`--input-format stream-json`, `--json-schema`, `--sandbox`, MCP and plugins** - all present in
  the help, none exercised.
- **Whether it can be driven concurrently** with a Claude Code wave without the RAM ceiling
  (`memory/ram-management.md`) biting.

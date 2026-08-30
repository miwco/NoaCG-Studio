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
| **Read-across-many-files comprehension questions** | **Antigravity (`agy -p`) on `gemini-3.7-flash-high`, with ABSOLUTE paths** | **Measured below: a 3-part cross-file question about the export registry came back 100% correct in 99 s, one call, no follow-ups.** But session D measured it reading the WRONG CHECKOUT from inside a linked worktree - wrong content, not just wrong links - so give it absolute paths and re-derive anything you act on. | Free at the subscription; ~160 K input + ~1.2 M cache-read tokens for one such question, which is on Google's meter, not Claude's. Budget for calls that bill and return nothing: 2 of 5 on session D's branch, 2 of 3 on this one. |
| **A bounded artifact written to a spec, judged before use** | **Antigravity (`agy -p`), then read it yourself** | **Measured below: an unseen gate script came back correct on first run, matched the house script conventions closely, and caught a real edge case in the input.** | As above. Grading it costs a few minutes and is not optional. |
| **Anything Antigravity must WRITE** | **Possible, but unproven - grade the diff before trusting it** | **The wall came down on 2026-08-30 (last section): the grant form that works is a directory path with a TRAILING SLASH, `write_file(C:/claude/NoaCG-Studio/.claude/worktrees/)`, and confinement was measured both ways - a write inside succeeds, a write one level above is denied. That only means it CAN write. Its diff quality has still never been measured.** | As the rows above, plus reading every line it wrote. |
| Reading an undocumented file format and deciding what it means | Claude Code | Short to do, long to specify - the class the 2026-08-29 delegation trial named as a poor delegate. | - |
| A three-line edit whose sites are already known | Claude Code | Measured 2026-08-30: delegating three one-line comment fixes cost 156 K Codex tokens, two round trips and a rewrap this session had to do anyway. The spec was longer than the diff. | - |
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

> **SUPERSEDED on 2026-08-30 - do not act on the JSON block below.** That file now EXISTS on this
> machine, installed by the owner with a longer allow list, and writing the block below over it
> would clobber his rules and reinstate a `deny` this section itself warns about. The current
> state of the machine, and why none of those rules actually grant anything, is in
> "Antigravity - second trial" further down. What stands here is the discovery of the blocker;
> the rule GRAMMAR it describes is wrong.

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

## Codex - three delegations on one branch, 2026-08-30

Three real pieces of work, all landed on `claude/b-harness-delegation`, all specced in this session
and written by Codex through `scripts/codex-rescue.mjs` on `gpt-5.6-sol` at medium effort (low for
the third). Every result was verified by RE-DERIVING it, never by checking the delegate did what it
was told. The verification is what found the one interesting thing in the round.

**Cost, from Codex's own rollout files** (`~/.codex/sessions/2026/08/30/rollout-*.jsonl`, field
`total_token_usage`; the wrapper's job JSON does **not** carry token counts, so that is not where
you read this):

| Delegation | Wall clock | input (of which cached) | output | 5-hour window |
|---|---|---|---|---|
| 1. The `e2e-affected` rule + its test | 119 s | 304 K (272 K) | 3.3 K | 0% -> 3% |
| 2. The corrupt-PNG swap, two turns | 308 s + 183 s | 1.46 M (1.33 M) | 16.7 K | 3% -> 11% |
| 3. Three citation fixes | 53 s | 155 K (131 K) | 1.3 K | 11% -> 12% |

Twelve percent of a 5-hour window for three landed commits, on the owner's ChatGPT subscription
rather than on Claude's meter. That is the whole case for the channel.

### Delegation 1 - a routing rule in `scripts/e2e-affected.mjs`. Grade: pass, no defects

`public/docs/` holds the three screenshots `docs.html` embeds and no rule covered it, so
regenerating one picture planned `mode: 'full'` **and** raised the catalog flag - a whole-suite gate
plus the 25-minute catalog run to prove nothing. Codex widened the `docs.html` edge to
`/^(docs\.html$|public\/docs\/)/` and added a test pinning the screenshot path, the unchanged
`docs.html` behaviour, and a look-alike (`public/docs.png`) that must still escalate.

Re-derived independently: ten paths through `planFor`, including `public/docs/deep/nested.png` and
`docs.htmlx`, all correct; 21/21 tests green; eslint clean. The comment it extended is in the file's
own evidence-carrying voice rather than a label. **Nothing to fix.**

### Delegation 2 - swapping six corrupt PNGs. Grade: pass, and it caught a defect in the SPEC

The e2e suite's stock 1×1 test image was not a decodable PNG. Two distinct corrupt strings across
six sites declared an IDAT length of 11 while the chunk really held 13 bytes - so the CRC only
validated at the real length and the chunk walk ran into garbage - and their IHDR claimed colour
type 4 (grayscale+alpha) over what is actually RGBA data. Chromium reads them leniently, which is
why nothing ever failed; it renders whatever falls out. Two sites were worse than cosmetic:
`e2e/flows.spec.ts` turns on the image being OPAQUE, and `src/model/imagePurpose.ts` cites that
spec's pixel as its worked example of an opaque mark - about a file that cannot be decoded at all.

**The task as handed to this session was wrong on its particulars and the ground truth had to be
rebuilt before anything could be specced.** It named `docs/svg-samples/scorebug.svg` as carrying "a
half-opaque red pixel with a comment calling it transparent". That file is correct as it stands: its
pixel is a valid, fully transparent 1×1 RGBA PNG and its comment says so. The half-opaque red
payload is real, but it is the *intended* content of the corrupt string in `e2e/sync.spec.ts` -
which Chromium in fact renders fully transparent. The "six more malformed grayscale-alpha pixels"
were the true half of the description, and they were the whole job. A spec written off the brief
without decoding anything would have confidently changed a file that had nothing wrong with it.

Then Codex found the defect in the corrected spec. It was told to replace the corrupt strings with a
"verified valid" opaque pixel taken from `e2e/wizard-logo.spec.ts`. It ran a CRC check over the
bytes it had actually written, reported `IDAT crc FAIL stored abce3689 computed 89993d1d`, stopped,
and asked whether to use a CRC-corrected equivalent instead. **That pixel does have a bad IDAT
CRC**, confirmed here afterwards - this session's own audit had checked that string for inflation
and for how Chromium renders it, and never for its CRC. A correct opaque PNG was then minted with
every length and CRC computed, decoded in a real Chromium to confirm the pixel, and handed back;
Codex applied it and fixed `wizard-logo.spec.ts` too.

**This is the first time in three trials that a delegate refused a bad instruction rather than
executing it.** The instruction to prove the result rather than assert it is what produced that: the
spec said to run the decode check over the bytes read back OUT OF THE FILE, not over the string it
had been given. That clause is cheap and belongs in every write delegation.

Two small things this session still did by hand: Codex wrote `1x1` in its new comments while the
surrounding house style is `1×1`, and it did not notice the mixed style it had introduced four lines
apart in `flows.spec.ts`.

Verified by walking EVERY embedded PNG under `e2e/` and `docs/svg-samples/` and auditing signature,
every chunk length, every CRC, trailing bytes and the inflated scanline. Twenty-three are fully
valid; the only two that are not are the two deliberate ones it was told to leave -
`import-svg.spec.ts:349`, which matches a base64 PREFIX with a regex, and
`video-generation-corpus.spec.ts:35`, the bare 8-byte signature whose comment says only the mime is
read back. **It respected every boundary in the do-not-touch list.**

### Delegation 3 - three stale citations. Grade: pass, and not worth delegating

Two `docs/GOALS.md` -> `docs/GOALS_ARCHIVE.md` renames plus one bare `(GOALS step 4)` expansion, all
three sites already located. Codex made exactly the three edits, changed nothing else, and pasted
every `GOALS` hit in the three files afterwards. The one flaw: expanding the bare citation pushed
that line to 125 characters in a comment block that wraps at ~98, and it did not rewrap even though
the spec told it to if the length forced it - eslint enforces no limit there, so nothing objected.
This session rewrapped it.

The honest verdict is the routing one: **the spec was longer than the diff.** 156 K tokens and a
round trip bought three one-line edits that were already fully specified, which is the
"short to do, long to specify" class this file has warned about since the first trial. It is in the
table now as its own row.

## Antigravity - second trial, 2026-08-30: the WRITE attempt, and why it produced no diff

The first trial left "Writing" at the top of its unmeasured list. This round tried to measure it and
could not, for a reason worth more than the diff would have been.

### The finding: grant targets are anchored REGEXES, not globs

`~/.gemini/antigravity-cli/settings.json` was found installed with this allow list:

```
read_file(*)  command(grep) command(rg) command(cat) command(head) command(tail) command(ls)
command(find) command(sed) command(wc) command(git)  list_dir(*) grep_search(*) codebase_search(*)
write_file(C:/claude/NoaCG-Studio/.claude/worktrees/*)
write_file(C:/Users/ahonemi/AppData/Local/Temp/claude/*)
```

A write task on `gemini-3.1-pro-high` came back with an EMPTY `response` and `status: "CANCELED"`,
and stderr said a `write_file` permission had been auto-denied. The rule that was supposed to allow
it is right there. The binary explains why:

> Each token in the granted target is matched as a full word (internally treated as an anchored
> regular expression: `^(?:pattern)$`).

**The target is a regex.** So `write_file(C:/claude/.../worktrees/*)` means "the literal text
`...worktree` followed by any number of `s`" - it matches the directory's own name and can never
match a file inside it. Every path-scoped write rule written glob-style denies 100% of writes. The
same reading explains three things that were already on the record as puzzles:

- The first trial's `deny: ["write_file(*)"]` "bought nothing" because `^(?:*)$` is not a pattern
  that matches a path. It was never a deny of anything.
- `command(grep)` grants the command `grep` and nothing else - not `grep -rn foo .`. A second run
  this round died on exactly that: it reached for a search command and was auto-denied.
- `list_dir(*)`, `grep_search(*)` and `codebase_search(*)` are not real actions at all. The CLI log
  says so plainly and drops them:
  `ignoring invalid allow entry "grep_search(*)": unknown action "grep_search"`.
  Only `read_file`, `command` and `write_file` are actions.

**So the installed file grants exactly one capability: `read_file`.** Everything the first trial
achieved, it achieved on that alone - which is why a comprehension question over named files worked
and why anything needing search, or a write, does not.

The fix is one line and it is the OWNER's to make, not a session's: it means widening a
machine-global permission file, and this session's own harness refused the edit, as it should. Filed
at `docs/acceptance/owner-queue/2026-08-30-b-antigravity-write-rule.md` with the exact replacement.

`--mode accept-edits` is the documented per-run alternative and was refused by this session's
harness too, so **a Claude Code session cannot unblock Antigravity writing on its own.**
`--dangerously-skip-permissions` was not tried: it is a capability, not an instruction.

### What did get measured: a finding job on `read_file` alone. Grade: pass, 4/4, no defects

Given the file paths explicitly (no search tool available) and asked four questions about the
leftover stale citations, `gemini-3.1-pro-high` returned all four correct, checked afterwards line
by line:

1. Both skipped citations still present, at the line numbers the old handoff claimed -
   `e2e/ai.spec.ts:196` and `e2e/exports.spec.ts:708`. Correct, quoted verbatim.
2. It resolved a contradiction inside that handoff: its "Flagged" section names
   `e2e/configured/anonymous.spec.ts:17` and its "Next" section names
   `e2e/configured/feedback.spec.ts:17` for the same site. It read both files, named `anonymous` as
   the one that actually holds `(GOALS step 4)`, and quoted what is really at `feedback.spec.ts:17`
   to prove the other mention wrong. **Correct, and this session had reached the same conclusion
   independently before asking.**
3. It quoted "Student release" step 4 out of `docs/GOALS_ARCHIVE.md` and gave lines 1365-1367.
   Correct to the line.
4. Correctly reported no other GOALS citation in those four files.

It also obeyed the instruction not to emit `file:///` links, which is the fix for the
wrong-checkout citation trap the first trial found - **telling it to cite plain repo-relative paths
works, and costs nothing.**

**But do not read this 4/4 as proof it read the right checkout.** Session D measured, the same day,
that `agy` in a linked worktree will read `C:/claude/NoaCG-Studio` and even other sessions' worktrees
while claiming a file in its own cwd does not exist - so the CONTENT can be wrong, not merely the
`file:///` links. This run was given repo-relative paths and told which worktree to read, which is
exactly the shape D found unreliable. Checked afterwards: all five files it was pointed at were
byte-identical between `origin/main` and this branch's base, and none had been modified here, so
both checkouts would have answered the same. **The grade is on the ANSWERS and says nothing about
checkout selection.** Nothing on this branch rests on its reading either way - all four answers were
re-derived here before anything was acted on, and the edits were specced from those. The standing
fix is to pass ABSOLUTE paths, or to run it against the main checkout and apply in yours.

### Cost of the three `agy` runs, from the JSON result

| Run | Outcome | Wall | input | output | thinking | cache read |
|---|---|---|---|---|---|---|
| Write task, plain `-p` | CANCELED, empty - `write_file` denied | 87 s | 70 K | 10.3 K | 8.1 K | 61 K |
| Finding, with search tools | SUCCESS, empty - `command` denied | 62 s | 44 K | 3.4 K | 2.3 K | 73 K |
| Finding, `read_file` only | SUCCESS, 4/4 correct | 153 s | 110 K | 7.9 K | 5.9 K | 580 K |

Two of the three runs burned ~115 K input tokens between them and produced nothing at all. Both were
permission failures, both invisible from the exit code, and the second even reported
`status: SUCCESS`. **Read `.response` for emptiness before anything else** - the first trial said so
and this round paid it twice. Session D's branch paid it twice more, on 2 of its 5 calls: across
both branches that is **four billed calls out of eight that returned nothing.**

**An empty `.response` has TWO causes, and they need telling apart** (the second is session D's
finding): a tool call auto-denied, or the run hitting `--print-timeout`, which defaults to five
minutes and also returns an empty string with `status: SUCCESS` and exit 0. Elapsed time separates
them, and a denial also names the permission on stderr. Both empties above were denials - 87 s and
62 s against a 5-minute limit, each with the tool named on stderr. A real task wants
`--print-timeout` raised.

**Call it through `npm run agy`** (session D's wrapper, landing on its own branch) rather than the
raw binary: it pins the model, refuses `--dangerously-skip-permissions`, treats an empty response as
failure, and ledgers every call - which is the only way this spend gets accounted for at all, since
nothing on disk accumulates it.

### What is STILL unmeasured about Antigravity

Everything the first trial listed, minus the `file:///` trap, plus a sharper statement of the first
item:

- **Writing.** Still zero diffs. Not because it was not tried - because the permission layer denies
  every one, for a reason now precisely located. The owner-queue item is the unblock.
- **Long tasks, `--mode accept-edits`, model comparison, `--json-schema`, `--sandbox`, MCP, plugins,
  and concurrency with a Claude Code wave** - all still untried.

## Model choice on the two delegate harnesses, 2026-08-30

Both delegate harnesses have a model knob and neither had ever been measured - "model comparison"
sat on Antigravity's unmeasured list through two trials. This round measured both, and the owner
ruled on both. The two answers are opposite in shape: Antigravity has a real choice worth making,
and Codex has none at all.

### Antigravity: `gemini-3.7-flash-high` is the default

One three-part cross-file comprehension question, asked identically of two models, with the
**ground truth established by hand FIRST** so the grading did not rest on the models' own word:

1. list every registered export target id;
2. name the line and the spec list that `docs.html` maps to in `scripts/e2e-affected.mjs`;
3. name the function that decides whether voting is closed in `pollBehaviour.ts`, and the two
   sources it reads, in order.

| model | correct | wall clock | input | cache read |
|---|---|---|---|---|
| `gemini-3.1-pro-high` | 3/3 | 57.3 s | 66.5 K | 298 K |
| `gemini-3.7-flash-high` | 3/3 | 17.6 s | 94.9 K | 322 K |

**Flash was 3.3x faster at equal correctness, and it volunteered more.** Where Pro gave the shape of
an answer, Flash gave line ranges, the actual token values and the regex. Nothing separates the two
on correctness here; everything separates them on latency and on how much of the answer can be acted
on without a follow-up call.

**Owner decision: `gemini-3.7-flash-high` is the default model for this repo's `agy` calls.** The
reasoning is generational rather than tiered - the "Pro" here is six versions older than the Flash,
and the generation gap outweighs the tier. **High reasoning effort for most work**, lower only where
a task plainly does not need it.

**Read that honestly: it is ONE SAMPLE.** Nothing measured so far shows Pro better at anything, only
slower, which is not the same thing as Flash being better everywhere. This is a decision with its
evidence attached, not a proven ranking. A later round that finds a class of work Pro wins should
append that finding rather than argue with this one.

### Codex: there is no model choice, only effort

Ten model names were probed against the CLI on this machine - `gpt-5.6`, `gpt-5.6-codex`,
`gpt-5.6-pro`, `gpt-5.6-mini`, `gpt-5.6-sol-max`, `gpt-5.6-sol-mini`, `gpt-5.6-sol-thinking`,
`gpt-5.5-sol`, `gpt-5-codex` and `o3`. **Every one came back
`not supported when using Codex with a ChatGPT account`.**

**`gpt-5.6-sol` is the only model the subscription exposes**, so the single knob on this harness is
reasoning effort.

**Owner ruling, 2026-08-30 - the effort ladder is the inverse of a cost-saving default:**

> *"the low reasoning worries me. We should at least go with medium and important coding tasks
> should be on high... I have more faith in GPT SOL than in Gemini."*

- **`high` is the NORM** for anything that writes code or forms a judgement.
- **`medium` is the ordinary floor** - the minimum for real work.
- **`low` is reserved for mechanical retrieval**, where the answer is a lookup.

**The floor now lives in the machine config.** `~/.codex/config.toml` carried
`model_reasoning_effort = "low"`, so every delegation that did not pin an effort ran at the bottom
rung - **including the three commits that landed on 2026-08-30 through this channel**. It is now
`medium`, on the owner's ruling that medium is the minimum. Recorded here so nobody reads the old
value out of an earlier handoff and believes it.

**Delegations still pin explicitly, at the call** (`/rescue --effort high <task>`). The config sets
the floor for anything unpinned, and it governs the owner's own interactive sessions too; a repo
delegation names its effort in the command so the intent is visible there rather than inherited
invisibly from a file nobody is looking at.

### Compose every `agy` prompt out of ABSOLUTE paths

**The "reads the wrong checkout in a linked worktree" defect recorded earlier in this file is caused
entirely by RELATIVE paths.** In this round both models cited the correct worktree whenever every
path in the prompt was absolute - and the defect **reproduced again** the moment they were left out:
asked a question with no paths in it at all, `agy` launched from a linked worktree cited
`C:/claude/NoaCG-Studio/AGENTS.md`, the main checkout.

So state the rule at its real strength. It is not "use absolute paths when you care which checkout":

> **A prompt without absolute paths is reading an UNKNOWN checkout, every time.** Every path in an
> `agy` prompt is absolute - no repo-relative paths, no "in this directory", no "the file we are
> looking at". If the prompt cannot name a file absolutely, resolve it before asking.

It costs nothing, and it removes the failure mode where a confident, well-formed answer is about
another branch's code.

### Both harnesses are real agent harnesses, and here is the test that proves it

Worth keeping as a standing check, because a bare model call cannot pass it. Each harness was asked,
with **no project context in the prompt at all**, what this product is, what the current push is,
and what is deliberately parked:

- **Codex** answered correctly, citing `AGENTS.md` and `docs/GOALS.md`, having run a sandboxed shell
  to read them.
- **Antigravity** answered correctly with line numbers, and caught the subtler reading: what is
  parked is CUSTOMIZING the behaviour, not merely everything sitting under `## NEXT`.

**Run this whenever a harness, a model or a config changes** and you need to know whether the thing
answering is loading the repo's contracts or improvising from the prompt. A wrong answer here means
every other answer from that harness is about a repo it has not read.

### The write grant: the form that works, and confinement measured in both directions

The second trial located why every path-scoped `write_file` rule denied everything - grant targets
are anchored patterns, not globs, so `write_file(<dir>/*)` matches the directory's own NAME and can
never match a file inside it. What it did not have was the form that does work. Measured now:

```
write_file(C:/claude/NoaCG-Studio/.claude/worktrees/)
```

**A directory path with a TRAILING SLASH is the working form** - simpler than the regex-escaped
replacement the owner-queue item proposed, and it is what is on the machine today.

**Confinement was then tested in both directions, and it holds.** A write to a file inside the
granted directory succeeds; a write one level ABOVE it is denied, with no file created. The grant
scopes what it claims to scope, which is the property the whole arrangement rests on.

So Antigravity's write path is open, and the routing table's "it cannot write" row is corrected to
match. Its diff QUALITY is still unmeasured: the wall is gone, the measurement has not been taken.

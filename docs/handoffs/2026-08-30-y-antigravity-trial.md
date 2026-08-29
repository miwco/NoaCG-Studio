# Handoff - Session Y: does the Google harness actually work (2026-08-30)

**Branch:** `claude/y-antigravity-trial`. **Ships:** `docs/HARNESS_ROUTING.md` (new) and
`docs/acceptance/owner-queue/2026-08-30-y-antigravity-trial.md`. **No product code.**
`npm run build` green, stamped `[write-version] dist/version.json -> claude/y-antigravity-trial@a6b7aaaec3`.
The repository was never written to by the external tool; everything it produced went to the
session scratch directory.

## The answer, in one paragraph

**Yes, it works, and it is good.** `agy` is a real headless harness: it reads this repo's
`AGENTS.md` on its own, answers cross-file questions correctly, and writes code that matches the
house conventions closely enough to be worth grading rather than rewriting. It has one hard blocker
(a permission file that does not exist by default) and one soft one (it asserts things about its own
work that it has not checked). It costs nothing against Claude's limits, which is the whole reason
to care tonight.

## What was measured

**Smoke.** `agy models` and a trivial `-p` prompt both answer with no prompt and no setup. The
invocation that works on this machine, under Git Bash, is recorded at the top of the Antigravity
section of `docs/HARNESS_ROUTING.md` - full path to the binary, `--output-format json`,
`--mode plan`, cwd set to the worktree.

**Trial A, comprehension - clean pass.** Asked cold: every export target's exact `id` and `label`,
the `ExportTarget` interface field by field, and exactly which targets import
`composeSelfContainedHtml`. Ground truth was derived by hand from `src/export/` FIRST, so the reply
was graded, not admired. Every part correct, in 99 s and one turn, plus one correct observation it
was not asked for (LiveOS gets its package by delegating to OGraf's `addOgrafPackage`).

**Trial B, generation - pass with two real misses.** Asked for `scripts/check-style-parts.mjs`, a
gate over the `@import` list in `src/styles/index.css`. Its output was transcribed to scratch and
RUN: correct against the real repo (31 imports, 30 parts, no findings - the true state), correct on
a synthetic fixture carrying all three fault classes, and it stripped CSS comments before matching
so the header comment containing the literal words `@import rather than one import per file` did
not become a phantom import. It also handled `../brandTokens.css` resolving outside the directory.
Convention match was near-exact down to the `main()` invocation guard.

## The blunt grade

**Better than I expected, and worse than it thinks it is.**

Head to head on Trial A: its answer is the answer I would have written, and it took about the same
wall-clock as my four tool calls. So it does not save time on a question this size - it saves
*budget*, which right now is the scarcer thing. On a question spanning twenty files rather than
eight it would win on both.

On Trial B I would grade it **B+**, and the missing points are not code quality:

1. **No sibling `.test.mjs`.** Every gate of that shape here has one, and in this repo the
   classifier is the guard while the prose is not (`scripts/db-push.test.mjs` says so out loud). It
   neither wrote one nor flagged the gap - and it had read `check-function-budget.mjs`, whose test
   file sits next to it in the same directory listing.
2. **It stated an untrue fact about the build.** Its header comment says the gate "runs as a static
   verification in `npm run build`". Nothing was wired into `package.json`. That is the failure mode
   to plan around: **its claims need checking more than its code does.** A session that pastes its
   output in without reading the prose will ship a comment that lies, which is the exact category of
   defect this repo has already paid for twice.

Both misses are the same shape - confident narration past the edge of what it verified. So the
routing rule is: give it work whose correctness you can CHECK cheaply (a script you can run, a
question you know the answer to), never work whose correctness you would have to take on trust.

## Two findings that outlive the trials

**1. Headless `agy` cannot use any tool without an allow-rule, and the failure is silent.** No
prompt exists in print mode, so every tool call is auto-denied - and the run still exits 0 with
`status: SUCCESS` and an EMPTY `response`. Anything that ever drives this CLI must treat an empty
`response` as an error. The lift is `~/.gemini/antigravity-cli/settings.json`, which does not exist
by default; the exact JSON is in both new files.

**It was created, used for both trials, and deleted again, so the machine is as it was found.** The
reason it was not left behind is concrete, not squeamish: it is machine-global, and nobody has
established whether its `deny` half also binds the owner's INTERACTIVE `agy`. A leftover
`deny: write_file(*)` would quietly stop his own CLI from writing files. That decision is in the
owner-queue item, with three options rather than a request for permission.

**2. There is no on-disk usage accounting to read.** This settles the open question item 2 in
`docs/handoffs/2026-08-30-s-harness-usage.md`: the usage meter **cannot** grow a third file reader.
`~/.gemini/antigravity-cli/` holds conversation SQLite stores with protobuf blobs, per-conversation
annotation files carrying only a title, a metadata cache with step counts and timestamps, onboarding
state and CLI logs - and no token field anywhere in any of them. Usage exists only in the JSON of
the run that produced it. The exact field paths (`.usage.input_tokens`, `.usage.cache_read_tokens`,
`.usage.thinking_tokens`, `.usage.total_tokens` = input + output only, and the `stream-json` `result`
event) are written down in `docs/HARNESS_ROUTING.md` for whoever builds a call-time recorder.
Quota is not exposed headlessly either - the quota-bucket strings in the binary belong to the
interactive TUI. And the JSON never names the model that answered, so pin `--model` if attribution
has to be sound.

`scripts/harness-usage.mjs`, `package.json` and `docs/AGENT_WORKFLOWS.md` were not touched -
another branch owns all three tonight.

## Gotchas worth carrying forward

- **Its file citations name the wrong checkout in a worktree.** Both trials ran with cwd set to the
  linked worktree and its own log confirms it read the worktree's files, but every `file:///` link
  it printed pointed at the MAIN checkout's path. Content right, links wrong.
- **It loads `AGENTS.md` by itself**, walking from cwd to the repo root. That is most of why Trial A
  landed, and it means the repo's contract is already in force when work is routed there.
- **No cheap call.** A trivial prompt already costs ~18 K input tokens.

## What is left

1. **The owner's two commands** - `agy install` (still owed from last night) and the decision on the
   permission file. Until the second one is answered, every session that wants headless `agy` pays
   the setup cost by hand.
2. **Writing is entirely unmeasured.** Both trials were read-only by design. Nobody has let it edit
   a file, so diff quality, `--mode accept-edits`, and whether path-scoped `write_file()` rules
   actually confine it are all unknown. That is the next trial, and it should be a bulk same-shape
   edit, because that is where Codex earns its keep and the comparison would be informative.
3. **Long tasks are unmeasured.** Both trials were single-turn; `--print-timeout` defaults to 5
   minutes.
4. **Model choice is unmeasured.** Everything ran on the CLI's unpinned default.
5. **`docs/HARNESS_ROUTING.md` is meant to grow.** A session that routes work and learns something
   appends a dated entry under that harness. Do not rewrite what is there - the accumulation is the
   value.
6. **`/check` was not run** (no subagents this session, and its review leg delegates). The diff is
   two markdown files and no product code.

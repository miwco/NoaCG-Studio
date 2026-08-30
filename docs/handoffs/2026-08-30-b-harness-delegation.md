# Session B - real work through Codex and Antigravity

Branch: `claude/b-harness-delegation`. Five commits, all gated. The point of the session was not
the three pieces of work - it was measuring whether delegating them is worth the money.

**The one sentence for the next session:** delegate anything you can write a spec for that is
longer than the diff will be, and make the spec demand PROOF rather than assertion - that clause
is what made Codex refuse a bad instruction instead of executing it - but do not delegate to
Antigravity at all until the owner fixes one line in its settings file, because it currently
cannot write a single byte and its own permission grammar hides that.

## Grades

| Delegation | Harness / model | Came back right? | Cheaper than doing it here? |
|---|---|---|---|
| 1. `public/docs/*.png` routing rule + test | Codex, `gpt-5.6-sol`, medium | **Yes, no defects.** Re-derived over ten paths through `planFor`; 21/21 tests. | **Yes.** 119 s, 3% of a 5-hour window, and the spec was shorter than the change. |
| 2. Six corrupt PNGs swapped across the e2e suite | Codex, `gpt-5.6-sol`, medium | **Yes - and it caught a defect in MY spec.** | **Yes**, but only because the ground truth had to be rebuilt here first (see below). |
| 3. Three stale citations | Codex, `gpt-5.6-sol`, low | Yes, minus a 125-char line it should have rewrapped. | **No.** 156 K tokens and a round trip for three one-line edits already located. |
| 2b. The same PNG work, tried first on Antigravity | Antigravity, `gemini-3.1-pro-high` | **No output at all** - every `write_file` auto-denied. | n/a |
| 3b. Finding the citation sites | Antigravity, `gemini-3.1-pro-high` | **Yes, 4/4, no defects** - and it caught a contradiction inside the old handoff. | Free at the subscription, on Google's meter. |

Full write-up, with the evidence behind each grade, is appended to `docs/HARNESS_ROUTING.md` -
two new dated sections, nothing earlier rewritten.

## Token cost on each harness's own meter

**Codex** (from `~/.codex/sessions/2026/08/30/rollout-*.jsonl`, `total_token_usage` - the rescue
wrapper's job JSON does NOT carry token counts, which is worth knowing):

| Delegation | Wall | input (cached) | output | 5-hour window |
|---|---|---|---|---|
| 1 | 119 s | 304 K (272 K) | 3.3 K | 0% -> 3% |
| 2, two turns | 308 s + 183 s | 1.46 M (1.33 M) | 16.7 K | 3% -> 11% |
| 3 | 53 s | 155 K (131 K) | 1.3 K | 11% -> 12% |

**Twelve percent of one 5-hour window bought three landed commits**, on the owner's ChatGPT
subscription rather than on Claude's meter. That is the case for the channel, and it is a good one.

**Antigravity** (from the `--output-format json` result, the only place it reports usage):

| Run | Outcome | Wall | input | output | thinking | cache read |
|---|---|---|---|---|---|---|
| Write task | CANCELED, empty - `write_file` denied | 87 s | 70 K | 10.3 K | 8.1 K | 61 K |
| Finding, search tools | SUCCESS, empty - `command` denied | 62 s | 44 K | 3.4 K | 2.3 K | 73 K |
| Finding, `read_file` only | SUCCESS, 4/4 correct | 153 s | 110 K | 7.9 K | 5.9 K | 580 K |

Two of three runs produced nothing and still cost ~115 K input tokens between them.

## The finding that matters most

**Antigravity grant targets are anchored REGULAR EXPRESSIONS, not globs.** The binary says so:
"Each token in the granted target is matched as a full word (internally treated as an anchored
regular expression: `^(?:pattern)$`)." So the installed rule
`write_file(C:/claude/NoaCG-Studio/.claude/worktrees/*)` reads as "the text `...worktree` followed
by any number of `s`" - it matches the folder's own name and can never match a file inside it.

Consequences, all now confirmed rather than guessed:

- **Every headless write is denied**, silently. Its diff quality is unmeasured for a third round,
  and not for want of trying.
- `command(grep)` grants the bare word `grep`, never `grep -rn foo .`, so the shell allowances do
  nothing either.
- `list_dir(*)`, `grep_search(*)` and `codebase_search(*)` are **not actions at all** - the CLI log
  prints `ignoring invalid allow entry ... unknown action` and drops them.
- The first trial's `deny: write_file(*)` "buying nothing" is explained: `^(?:*)$` never matched a
  path, so it was never a deny of anything.

**So the installed settings file grants exactly one capability: `read_file`.** Everything the first
trial achieved, it achieved on that alone.

The fix is one line and it is filed for the owner at
`docs/acceptance/owner-queue/2026-08-30-b-antigravity-write-rule.md`, with the exact replacement and
a one-minute probe. It is his to make because it means widening a machine-global permission file;
this session's own harness refused both that edit and `--mode accept-edits`, correctly. **A Claude
Code session cannot unblock Antigravity writing on its own.** The owner's file was left byte-for-byte
as found, verified by diff against a backup.

## Two things the next session should carry

1. **Make every write spec demand proof over assertion.** Delegation 2's spec said to run the
   decode check over the bytes read back OUT OF THE FILE, not over the string it had been handed.
   Codex did, found the replacement pixel it had been given had a bad IDAT CRC
   (`stored abce3689, computed 89993d1d`), stopped and asked. It was right - and this session's own
   audit had missed it, having checked that string for inflation and for how Chromium renders it but
   never for its checksum. First time in three trials a delegate refused a bad instruction.
2. **Re-derive the brief before writing the spec.** The task handed to this session said
   `docs/svg-samples/scorebug.svg` carried "a half-opaque red pixel with a comment calling it
   transparent". It does not: that file is correct as it stands. The half-opaque red payload is real
   but it is the intended content of the corrupt string in `e2e/sync.spec.ts`, which Chromium in fact
   renders fully transparent. A spec written off the brief would have confidently changed a file with
   nothing wrong with it. The "six malformed grayscale-alpha pixels" half was true and was the job.

## What landed

- `3e83c99a` - `public/docs/` joins the `docs.html` edge in `scripts/e2e-affected.mjs`. Regenerating
  one documentation screenshot planned `mode: full` **and** the 25-minute catalog gate; it now plans
  two specs. Pinned by a new test including a look-alike path that must still escalate.
- `c07ad179` - seven corrupt embedded PNGs replaced across the e2e suite. Six declared an IDAT
  length of 11 over a 13-byte chunk with an IHDR claiming grayscale+alpha over RGBA data; the
  seventh had a wrong IDAT CRC. Chromium read them all leniently, so nothing ever failed - it
  rendered whatever fell out. `e2e/flows.spec.ts` turns on its image being OPAQUE and
  `src/model/imagePurpose.ts` cites that pixel as its worked example of an opaque mark, about a file
  that could not be decoded at all. Each replacement was minted with every length and CRC computed
  and decodes to exactly what Chromium was already rendering, so no spec changes behaviour.
- `73373aa0` - the last three "Student release" citations now name `docs/GOALS_ARCHIVE.md`.
- `aae2ebb3` - the routing evidence appended to `docs/HARNESS_ROUTING.md`, plus the owner-queue item.
- `ce880e75` - from `/check`: `docs.spec.ts` now compares each screenshot's intrinsic size against
  the size `docs.html` reserves for it, and the first Antigravity section is marked superseded.

## `/check`

- **review: delegated.** Scope-checked against this worktree's branch and merge-base before use.
  Three low findings, all verified independently; two fixed in `ce880e75`.
- **simplify: inline.** The skill returned fan-out instructions rather than a result, so the leg
  was done here over its four angles. One finding applied (a duplicate `evaluate` round-trip in the
  new `docs.spec.ts` assertion). One considered and rejected: hoisting the now-duplicated opaque
  pixel into a shared `e2e/_` helper would put it in the planner's CORE list, so editing a test
  fixture would escalate every branch to the full suite - a worse trade than five local constants.
- **The third review finding was NOT fixed here**, deliberately. `scripts/make-remotion-manifest.mjs`
  carries a corrupt 2x2 PNG of the same class, and `render-smoke` feeds it to the real render
  service, so that leg of the smoke test may be passing vacuously. It is a pre-existing bug outside
  this diff, and confirming the fix costs money, so it is filed as a task chip rather than widened
  into this branch.

## Gate

`npm run build` green, branch stamp checked (`dist/version.json -> claude/b-harness-delegation@...`)
so it gated this branch and not `main`.

**Two CI runs, and it takes both** - jobs read individually rather than off the top-line verdict,
because an ordinary push plans from the PREVIOUS push:

- **33309817448** on `aae2ebb3` (the first four commits): success, **all nine E2E shards ran**,
  Factory gates and Build green. That is the run covering the routing rule, the seven PNG
  replacements and the citation renames.
- **33310589245** on `ce880e75` (the `/check` commit): success. It planned **one shard**, because
  its diff base was `aae2ebb3` and the only spec in that delta is `docs.spec.ts` - so this run is
  the verdict on the new screenshot-size assertion specifically, and nothing else. Reading only
  this run would have looked like a one-shard gate over the whole branch.

`e2e/configured/anonymous.spec.ts` is comment-only and needs a configured backend, so the offline
plan reports it rather than running it - expected.

## Next

Nothing outstanding on this branch. The two open threads are the owner-queue item above, and the
render-smoke fixture chip.

# Antigravity spend is now measured, and two of its five calls bought nothing

Branch: `claude/d-harness-usage-agy`, queued for landing.

The owner asked, in his own words: "Let me know how many tokens you use with those. I'm interested
to see if we actually get the money's worth." Antigravity was the one harness where that could not
be answered - it keeps no cumulative usage anywhere on disk, so unless a call captures its own
receipt the money is spent and nothing records it. It does now.

## What shipped

- **`scripts/agy-run.mjs`** - the one way this repo calls `agy`. Runs it with
  `--output-format json`, requires a pinned `--model`, refuses
  `--dangerously-skip-permissions`, treats an empty response as a FAILURE, prints the answer on
  stdout, and appends one JSON line per call - success or failure - to a ledger. `npm run agy`.
- **`~/.noacg/agy-usage.jsonl`** - the ledger, deliberately OUTSIDE the repository
  (`NOACG_AGY_LEDGER` overrides). A worktree is disposable and ignored files die with it; spend is
  per machine, not per checkout; a path outside the tree has no ignore rule to forget; and the
  other two harnesses are already read from the home directory. Format `v: 1`.
- **A third reader and report block in `scripts/harness-usage.mjs`**, in the shape of the existing
  two. It imports the ledger path and the version from the writer rather than restating them.
- **`scripts/harness-usage.test.mjs`** grew from 43 to 57 cases over the reader AND the writer,
  with a fixture ledger (`AGY_LEDGER`) carrying a failed call, an unpinned model, a future
  version, a line with no usage object, and a half-written last line.

## The meter's actual output

```
ANTIGRAVITY (agy)
  5 calls, 2 failed, 12m 27s of wall clock.

  model                calls  failed  wall clock    input  output  thinking  cache read
  -------------------  -----  ------  ----------  -------  ------  --------  ----------
  gemini-3.1-pro-high      5       2     12m 27s  688,143  38,415    32,149   3,565,054

  The four counts are NOT added. agy's own `total_tokens` is input + output only -
  it leaves out thinking and cache reads, and cache reads are routinely larger than
  the other three together. A single number here would be a different number
  depending on which fields it added, so this meter prints the four and stops.

  What this cannot know:
    - no history before 2026-08-30T11:12:41.421Z, when the ledger got its
      first line. agy writes no cumulative usage anywhere, so an agy call made
      outside `npm run agy` left no trace and cannot be recovered.
    - no remaining quota. agy has no `usage` subcommand and no headless quota
      surface at all, so unlike Codex there is no percentage to report - and
      tokens spent are not a percentage of an allowance nobody has published.
```

Two further gap lines appear when they apply, and are pinned by tests: calls that pinned no model,
and ledger lines from a version this build does not read.

## What the calls cost, one by one

| | wall clock | input | output | thinking | cache read | what it was |
|---|---|---|---|---|---|---|
| ok | 4.3s | 18,047 | 239 | 238 | 0 | trivial "reply READY" |
| **FAIL** | 46.3s | 30,258 | 2,062 | 1,707 | 81,221 | comprehension - a tool call was auto-denied |
| **FAIL** | 299.8s | 202,155 | 16,493 | 14,183 | 1,562,217 | same question - cut off at the 5m default |
| ok | 386.0s | 410,949 | 18,885 | 15,386 | 1,897,207 | same question, `--print-timeout 8m` |
| ok | 10.3s | 26,734 | 736 | 635 | 24,409 | absolute-path probe |

**The two failures cost 232 K input and 1.64 M cache reads and returned two empty strings** - 34%
of the branch's input and 46% of its cache reads, bought and thrown away. That is the strongest
argument for the ledger recording failures: a meter that dropped them would flatter the harness
exactly where it is being judged.

Note the trivial call: **18 K input tokens for one word.** There is no cheap call on this harness,
which is why the test's "cheap call" is a fixture.

## Three things measured today that the routing doc did not know

All three are now in `docs/HARNESS_ROUTING.md`.

1. **An empty response has TWO causes.** Besides the auto-denial already documented, a run that
   reaches `--print-timeout` (default **5 minutes**) is cut off mid-task and returns an empty
   string with `status: SUCCESS` and exit code 0 - indistinguishable from a denial from outside.
   The wrapper tells them apart by elapsed time and names both, because the boundary is a
   heuristic and a wrong diagnosis sends someone editing the wrong file.
2. **Half the permission grammar is silently ignored.** Only `read_file`, `command` and
   `write_file` are real grant actions. `list_dir(*)`, `grep_search(*)` and `codebase_search(*)` -
   three of the four entries the earlier trial documented - are accepted into
   `~/.gemini/antigravity-cli/settings.json` and then dropped:
   `permission_grant_store.go` logs `ignoring invalid allow entry ... unknown action`, and nothing
   in the JSON result or on stderr ever says so.
3. **In a linked worktree it reads the WRONG CHECKOUT.** This is stronger than the known
   wrong-citation defect. Asked from this worktree to read `scripts/agy-run.mjs`, it answered
   confidently that the file does not exist and that `harness-usage.mjs` has no `AGY` exports -
   both true of `C:/claude/NoaCG-Studio` and false where it stood. Its log shows it grepping the
   main checkout, *including other sessions' worktrees*. **An absolute path works** (10 s, 27 K
   tokens, correct answer). So: run it from the main checkout, or hand it absolute paths.

## What it still cannot know

- **No history before the ledger.** Nothing else on disk holds it, and no reader can recover it.
- **No remaining quota, ever.** There is no headless surface and no `agy usage`.
- **No model attribution for an unpinned call** - which is why `--model` is required rather than
  merely encouraged.
- **Nothing here is wired to a gate**, deliberately. It reports; it never fails a build.
  `check:freshness` is the precedent.

## Verification

`npm run build` green locally and in CI. `/check` ran in full: **review: `delegated`** (the
code-review skill returned findings scoped to this branch and this worktree - nine, of which eight
were confirmed and fixed and one was the missing owner-queue item, now added);
**simplify: `inline`** (the skill returned fan-out instructions rather than a result, so the leg
was done here over its four angles - two small cleanups, output byte-identical afterwards).

Every review finding pointed the same way - the ways this code could quietly report spend as zero:
a reported error status read after the empty-response guess, so a quota failure was diagnosed as a
permissions problem; a receipt lost to any output printed around the JSON; the reader restating the
ledger path instead of importing it, which fails as "no ledger, nothing to read" rather than
loudly.

**The one CI-only failure is worth knowing about.** `agyCandidates` takes a `platform` argument and
honoured it for the PATH separator and the executable extensions, but joined directories with the
HOST's separator - so asked about Windows from Linux it built `C:\dir/agy.exe`. Invisible on the
machine it describes, red on the first CI run. Fixed by selecting `path.win32.join` /
`path.posix.join` from the argument.

## Owner queue

`docs/acceptance/owner-queue/2026-08-30-d-antigravity-spend-is-now-visible.md` - the numbers above
in his terms, plus the note that three entries in his permissions file are doing nothing.

## What is left

1. **Antigravity's writing is still unmeasured.** Every call so far, here and in the first trial,
   has been read-only. Its diff quality and whether `write_file(<scoped path>)` actually confines
   it are unknown.
2. **The permissions file should probably lose its three dead entries** and gain whatever `command`
   targets the denied run actually wanted - that is an owner decision, and the earlier owner-queue
   item still owns it.
3. **`package.json` collided with `claude/ah-orchestrator-home` this wave** - both branches add a
   script line. One line each, so the merge is trivial, but `merge-order` should be believed about
   which lands first.

---
kind: walk
date: 2026-08-30
---
# What Antigravity actually costs, and why two of its five calls today bought nothing

Date: 2026-08-30

You asked: "Let me know how many tokens you use with those. I'm interested to see if we actually
get the money's worth." Antigravity was the one harness where that was unanswerable - it writes no
cumulative usage anywhere on disk, so unless a call captures its own receipt, the money is spent
and nothing records it. It does now.

## The route, under a minute

In a terminal in this repo:

```
npm run harness:usage
```

Three blocks now, not two. The third is ANTIGRAVITY, and this is what it said on the branch that
built it, over five real calls:

```
ANTIGRAVITY (agy)
  5 calls, 2 failed, 12m 27s of wall clock.

  model                calls  failed  wall clock    input  output  thinking  cache read
  -------------------  -----  ------  ----------  -------  ------  --------  ----------
  gemini-3.1-pro-high      5       2     12m 27s  688,143  38,415    32,149   3,565,054
```

To spend anything of your own, call it the one way that records itself:

```
npm run agy -- --model gemini-3.1-pro-high "which export targets import composeSelfContainedHtml?"
```

## The answer to your question, so far

**Two of five calls returned nothing and still billed.** Between them they spent 232 K input and
1.64 M cache-read tokens for two empty strings. That is 34% of the input and 46% of the cache
reads on the branch, bought and thrown away. Neither failure looked like a failure from outside:
`agy` reports `status: SUCCESS` with exit code 0 for a run that produced no answer at all.

The two causes are different and both now have a name in the tooling:

1. **A tool call it was not pre-allowed to make.** There is no prompt to answer in headless mode,
   so it is refused silently. Worse than we knew: **half the permission grammar in your settings
   file is being ignored.** Only `read_file`, `command` and `write_file` are real actions -
   `list_dir`, `grep_search` and `codebase_search` are accepted into the file and then dropped as
   invalid. Nothing says so except a line in its own log.
2. **It ran out its five-minute default and was cut off mid-task.** That single run cost 202 K
   input and 1.56 M cache reads. Anything reading more than a file or two needs
   `--print-timeout 8m`; the same question then succeeded in 386 s.

**One more, and it is the one that would have bitten us quietly:** asked from a worktree to read
`scripts/agy-run.mjs`, it answered - confidently and wrongly - that the file does not exist. Its
log shows it searching the main checkout instead, including *other sessions' worktrees*. Relative
paths resolve against `C:/claude/NoaCG-Studio`, not where it is standing. An absolute path reads
the right file, in 10 s for 27 K tokens. So it is usable, but only from the main checkout or with
absolute paths - and any answer it gives about a branch's code is suspect otherwise.

## What the meter refuses to tell you, on purpose

- **No history before today.** The ledger began when the wrapper did. A call made any other way
  left no trace anywhere and cannot be recovered - so a small number in that block can equally
  mean the harness was cheap or that its calls bypassed the wrapper. The report says which.
- **No remaining quota, ever.** `agy` has no `usage` subcommand and publishes no allowance
  headlessly. Codex has percentages only because Codex writes its own into its log.
- **The four token counts are never added into one number.** `agy`'s own `total_tokens` is
  input + output and leaves out thinking and cache reads - and cache reads are five times
  everything else together. Any single "total" would be a different number depending on which
  fields it added, so you get four columns and no total.

## Nothing needs you

No action here. The one thing still outstanding from the earlier item is unchanged: it is your
call whether that permissions file stays installed, and point 1 above is a reason to revisit what
is in it - three of its entries are doing nothing.

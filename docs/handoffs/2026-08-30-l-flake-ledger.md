# Session L - the flake ledger's two rows

Branch `claude/l-flake-ledger`, 2026-08-29. One commit (`7fd26de2`), `npm run build` green with the
change in the tree. Documentation only - **no source and no spec was changed**, which is the finding
rather than an omission.

The brief was to give the two ledgered flakes in `docs/CI_STABILITY.md` owners and outcomes:
reproduce `local-relay.spec.ts:330` and fix its cause, and re-confirm `flows.spec.ts:81` before
rewriting anything.

## The short version

Neither row was what it said it was, and **neither ever met the admission rule the table states
directly above itself** ("red, then green on the same SHA after a re-run"). Every one of the eight
runs behind them is `run_attempt: 1`, `conclusion: failure` - there is no same-SHA re-run anywhere in
the window. What the table recorded was repeat failures.

| Row | Verdict |
|---|---|
| `local-relay.spec.ts:330`, 6 occurrences | **2** real failures, from **two different** races, both already fixed in-window (`7447ea9c`, `f193f969`). Second one reproduced by mutation. |
| `flows.spec.ts:81`, 4 occurrences | **Not a flake.** A deterministic regression: the spec asked Browse for a design that had just been retired. Fixed by `d6ee4d3b`. |

## What went wrong in the ledger, which outlives both rows

**It keyed flakes by LINE NUMBER.** `local-relay.spec.ts` was edited four times during the
measurement window, so its declaration lines moved underneath the ledger. The "neighbours at `:389`,
`:396` and `:413` reading as one instability" are not neighbours and not three specs - they are the
*same* test ("a baseline that describes a log which no longer exists is thrown away") at three
successive commits. `:330` names "one lost relay request at boot" before 2026-08-24 19:01 and "reads
the log from where it left off" after it. Keying by title makes all of this go away;
`flows.spec.ts:81` was checked the same way and is stable, so that row's title was at least right.

**It did not ask whether a fix had already landed.** Both relay failures had named fixes in `git log`
days before the ledger was written on 2026-08-29.

Both rules are now written into class 5 of `docs/CI_STABILITY.md`.

## `local-relay` - reproduced, and already fixed

Only two runs in the whole window actually failed on this spec. The other candidates matched the
spec name in a shard annotation while failing on `motion-presets`, `package` and `import-svg` (the
last being the known 50-vs-51 font-geometry bound already documented in `e2e/AGENTS.md`).

- **2026-08-24 16:04Z** - `Expected "89" / Received "88"` on the baseline poll. The baseline is
  written on a debounce, so "the key exists" was true before the bumped score reached it. Fixed by
  `7447ea9c`, fifteen minutes later.
- **2026-08-24 20:15Z** - `expect(reads[0]).toBe(play!.id - 1)`, `Expected: 4 / Received: 7`. The
  document still on screen polls every 400 ms with its own cursor, and one of its polls was recorded
  as the reloaded document's boot read. Fixed by `f193f969`.

**Repeat runs were run and are worthless as evidence** - 15 green for this test under contention
(10 at 4 workers, 5 more inside a whole-file run at 8 workers), 20 green for `flows`. `e2e/AGENTS.md`
says exactly why: the window is narrower on this laptop than on a loaded runner, so a green
`--repeat-each` is not a measurement. Note also that **CI runs `workers: 1, retries: 0`**, so
parallel-worker stress locally is the wrong shape of contention anyway.

So the fix was **mutation-tested** instead. Restoring the pre-`f193f969` recorder - and keeping the
deliberate 600 ms pre-reload wait, which is what makes the live page's poll land in the recorder -
fails with `Expected: 4 / Received: 7` at `expect(reads[0])`: the same assertion and the same two
numbers CI reported, and the same two numbers `f193f969`'s own commit message quotes. The ping filter
is load-bearing, not decorative. The mutation was reverted immediately and `git status` confirmed the
tree byte-identical to HEAD before anything else was done.

## `flows.spec.ts:81` - a retired design, not a flake

All four `locator.click: Test timeout of 60000ms exceeded` failures land in the shared helper, on the
test's **first** line:

```
> 86 |   await page.locator('.wz-variant', { hasText: name }).first().click();
        at pickDesign (e2e/_browse.ts:86:64)
        at toVariantStep (e2e/flows.spec.ts:15:3)
```

`pickDesign` fills the Browse search box and clicks the first matching card. The name it asked for
was `Soft Stack`, and `12206f5c` ("Retire six lower thirds...") had retired that design three and a
half hours earlier. Verified at each failing SHA rather than inferred: all four ask for `Soft Stack`,
all four have `12206f5c` as an ancestor, and none contains `d6ee4d3b` ("Point the steps-mode flow at
a design that still exists"), which repointed the spec at `Stack Three` and ended the failures.

The ledger read "four hits in one 40-minute window across three unrelated branches" as an
infrastructure blip. It was three branches that had all taken the retirement and not yet the fix -
the same one-bug-reported-N-times shape the file already diagnoses for `anim-engine` in its opening
section. It was missed here because a click timeout inside a shared helper looks like flakiness from
outside.

The rule this taught is now in `src/templates/lowerThirds/AGENTS.md`, where retirements are actually
performed: **retiring a design is a rename with no compiler behind it** - grep `e2e/` for the
design's name in the same commit, because the spec keeps compiling and then burns a 60-second
timeout.

## What is NOT done

- **`production-controls.spec.ts:262`** (1 occurrence, `Execution context was destroyed`) was left
  alone. One occurrence with no receipt is not a flake claim, and the ledger now says so.
- **No owner-queue item is owed.** Nothing here is observable in the product.
- The ledger's remaining PROPOSED mechanisms are untouched and still the real leverage - above all
  **"the landing queue refuses to land onto a red `main`"** (class 1), which the file measures as 26
  of the 40 emailing failures. That is a change on the landing path and wants its own session.
- A caveat on the counts: the sweep covered the failing-job **check-run annotations** across the
  window's failed-run inventory (82 failed jobs, 10 candidate hits, each resolved individually). If
  that inventory was partial, a hit could have been missed; the two specs' hits were each traced to
  primary evidence, so the verdicts do not rest on the count.

## Incidental

Running the relay file at `--workers=8` produced one unrelated failure in `createProject`
(`.topbar` never became visible). That is over-subscription on a RAM-bound laptop - CI uses one
worker - and is not a product flake. Not filed.

The worktree had **no `node_modules`** on arrival and needed `npm install`; the linked-worktree
deadlock in `e2e/AGENTS.md` is the reason that matters.

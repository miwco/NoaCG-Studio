# Session L - the flake ledger's two rows

Branch `claude/l-flake-ledger`, 2026-08-29. One commit (`7fd26de2`), `npm run build` green with the
change in the tree. Documentation only - **no source and no spec was changed**, which is the finding
rather than an omission.

The brief was to give the two ledgered flakes in `docs/CI_STABILITY.md` owners and outcomes:
reproduce `local-relay.spec.ts:330` and fix its cause, and re-confirm `flows.spec.ts:81` before
rewriting anything.

## The short version

| Row | Verdict |
|---|---|
| `local-relay.spec.ts:330`, 6 occurrences | **A real flake, correctly admitted** - two distinct assertions, 4 of the 6 carrying same-SHA re-run-green receipts. Both causes were **already fixed inside the measurement window** (`7447ea9c`, `f193f969`), which nobody had checked. The surviving one was reproduced by mutation. |
| `flows.spec.ts:81`, 4 occurrences | **Not a flake.** A deterministic regression: the spec asked Browse for a design that had just been retired. Fixed by `d6ee4d3b`. |

Nothing was owed an owner, no assertion was softened, and no spec was rewritten.

> **Corrected after review.** A first version of this handoff and of the ledger edit claimed *neither
> row ever met the admission rule* and that only **2** runs failed on the relay spec. Both were wrong,
> and the way they were wrong is the lesson: the sweep those claims rested on filtered on
> `conclusion=failure`, and **re-running a run's failed jobs flips the RUN's conclusion to `success`**,
> so the four strongest receipts were structurally invisible to it. (It was also read out of a
> sweep file while the sweep was still writing to it - an in-progress artifact taken for a finished
> one.) The committed text was amended before landing and the branch re-queued. Verified directly:
> runs `32761607161`, `32770024485`, `32772925955`, `32814970693` each have `attempt1=failure` with a
> `local-relay.spec.ts:330` annotation and a final `success` with the shards green on the same SHA.

## What went wrong in the LEDGER

**One line-number claim, and it was invented.** The table said the neighbours at `:389`, `:396` and
`:413` "each failed once too". They never failed. The only `local-relay.spec.ts` lines that appear as
failures anywhere in the window are `:330` (declaration), `:390` (5x) and `:359` (1x). `:389`/`:396`/
`:413` are **progress lines** - `[107/119] … spec.ts:389:1 › a baseline that describes a log which no
longer exists…` - for the next test in the file, which passed every time and whose declaration line
drifted as the test above it grew. Someone grepped for `local-relay.spec.ts:` and counted passing
tests as failures. Grep for the failure marker, not the filename.

**It did not ask whether a fix had already landed.** Both relay causes had named fixes in `git log`
days before the ledger was written on 2026-08-29. That is the single cheapest check missing from it.

## `local-relay` - a real flake, and already fixed

Six occurrences in one 14-hour cluster (2026-08-24 16:04Z -> 2026-08-25 05:58Z) across six branches,
none before or after. Two distinct assertions:

- **1x at `:359`** - `Expected "89" / Received "88"` on the baseline poll. The baseline is written on
  a debounce, so "the key exists" was true before the bumped score reached it. Fixed by `7447ea9c`,
  fifteen minutes after the only occurrence.
- **5x at `:390`** - `expect(reads[0]).toBe(play!.id - 1)`, `Expected: 4 / Received: 7` byte-identical
  each time. The document still on screen polls every 400 ms with its own cursor, and one of its polls
  was recorded as the reloaded document's boot read. Fixed by `f193f969`.

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
outside. The call log confirms it: one line, `waiting for locator(…hasText: 'Soft Stack').first()`,
no "resolved to N elements" - the locator never matched anything, while the `fill()` on the search
box immediately above it succeeded.

**The trap to avoid on this row.** Both `main` shas have a `success` run about 8 minutes before the
failure, which reads as a same-SHA red/green pair and would be strong flake proof. Neither ran this
spec: both are `(subset)` plans on other branches whose plan spec-list omits `flows.spec.ts`, and no
shard log in either mentions `flows.spec.ts:81`. Checked explicitly, because believing them turns a
fixed regression back into an unfixed flake and invites rewriting a spec that is fine.

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
- Two bugs in the ledger's own "Reproducing this" recipe were found and fixed in the same commit:
  `gh api --paginate` with an open-ended `created>=<DATE>` **silently truncates** (82 of ~100 failed
  runs, stopping dead at 08-19), so the recipe now slices dates explicitly; and check-run
  **annotations** replace `gh run view --log-failed` as the default - byte-identical error text,
  cross-checked on two runs, at roughly 1/50 the cost. The `run_attempt>1` walk and the
  which-jobs-ran check are in there now too.
- Counts rest on the full window sweep (1347 runs; failed, cancelled AND `run_attempt>1` runs
  including ones that finished green), and every occurrence for both specs was traced to its
  annotation and error block individually.

## Incidental

Running the relay file at `--workers=8` produced one unrelated failure in `createProject`
(`.topbar` never became visible). That is over-subscription on a RAM-bound laptop - CI uses one
worker - and is not a product flake. Not filed.

The worktree had **no `node_modules`** on arrival and needed `npm install`; the linked-worktree
deadlock in `e2e/AGENTS.md` is the reason that matters.

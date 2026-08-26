# Handoff - C: credits line continues (tickers, the roll preview, the ai/ split)

**Branch:** `claude/c-credits-tickers-roll-602e6b` · four commits on top of `cf9f3f02`.
Everything below is measured; the commands to re-measure are in it.

---

## What landed

### 1. `src/ai/` split into `lite/` and `pro/` (334e47b5)

`src/ai/AGENTS.md` was the tightest instruction chain in the tree at **107,750 of 120,000
bytes** - the file every session working anywhere in the harness loads before doing anything.
Thirty-one of its seventy-seven kilobytes described two tiers. Both now have their own
`AGENTS.md`, the pattern `src/components/timeline/` set. Nothing was shortened: the sections
moved whole and the parent keeps a pointer plus the rules that bind from outside.

Four Lite files moved in and dropped their prefix, the naming `pro/` and `importAnalysis/`
already used: `liteTypes`/`liteContract`/`litePipeline`/`liteClient` → `lite/types`,
`contract`, `pipeline`, `client`. `proTypes.ts` → `pro/types.ts`.

**The lever, stated so the next person does not waste a session on it: splitting only pays when
the sections go to DIFFERENT directories.** One split moves the bytes from the parent into the
child's own chain and the maximum does not move at all. With two, no single chain carries both.
The largest chain is now `src/components/wizard/AGENTS.md` at 105,224, so the ratchet in
`.codex/config.toml` dropped from 120,000 to **112,000**. `npm run check:shared-instructions`
prints the remaining headroom on every build.

Two gates were wrong in ways only a file move surfaces, both fixed with a test:

- `check-line-endings` called every moved file a phantom. Git reports a move plus an in-place
  edit as `RM old -> new`, and `git diff --name-only` prints the destination alone, so comparing
  the whole field never matched. Its own comment already said renames needed handling; the code
  only skipped `R `, not `RM`. **This fires on every file-move commit** - the timeline split
  would have hit it too.
- The Lite bench's contract-symbol scan read `contract.` out of a comment naming
  `src/ai/lite/contract.ts` and demanded an export called `ts`.

### 2. Tickers: a colon ends a KICKER (465793b8, 09aab8ee)

The three-part move, all three parts done.

**(a) The format.** A ticker's one field held a flat list of stories, so the only structure an
item could carry was whatever a design guessed from position - and **four of them guessed
differently**: tk18 split a service name at an em dash, tk04 took the last two words as a value
and a change, tk06 a trailing signed token, tk13 an `n - n` in the middle. None of it was
portable: move a rundown from Status Rotator to a crawl and the service names vanished.

An item now carries a **kicker**, with the credit roll's own mark - a colon ends a kicker,
everything else is the story, and a kicker typed on its own line tags every story beneath it
until a blank line or the next kicker. Nothing is required, which is why **no existing sample
had to change**.

**Two rules differ from `docs/END_CREDITS.md`, and both were discovered by reading the designs
rather than by design:**

- The colon must be **followed by a space** or end the line. End credits guard the mark by
  length alone; a ticker cannot, because it writes numbers - `UNITED 2:1 CITY` is a score tk13
  draws as a chip, `close at 20:00` is a clock, a link has a colon. A length guard alone made
  tags of all of them.
- **`|` is not a separator here.** tk17 already splits an item at it into its two LANGUAGES and
  ships with bilingual samples. A mark a design has spoken for cannot be given a second meaning
  by the parser above it.

`renderTickerItem` keeps its one argument, so all 22 designs kept working; the shared
`.ticker-kicker` rule is emitted before the design's CSS so a design can restate it. A design
that PLACES the tag defines `renderTickerKicked(kicker, text)` - tk18 takes it, so its service
column now holds a mark every other ticker can read.

**(b) The wizard step.** `FieldPlan` gained `formatNote`, rendered under the rows editor, rather
than hardcoding ticker prose in a shared component. Checked on the actual screen, not just the
parser: `e2e/wizard-filters.spec.ts` asserts the note is there.

**(c) Proved three ways.** `scripts/ticker-parser.test.mjs` runs the EMITTED JavaScript (cut out
of its template literal, so a rule that reads right in the `.ts` and ships broken fails the
build). `e2e/public-service.spec.ts` measures the rendered strip, the portability claim across
two designs, the score/clock/link cases, **the whole exported package** (every target must carry
the parser and the rule) and **the control path** - the identical `update()` the dashboard
monitors, the browser-output renderer and an export all call.

Public guide: `docs/TICKERS.md` and `/docs#tickers`.

### 3. The roll preview - the settle decision (bc77e262)

**Read this section before touching any preview surface.**

The reported fault was "a roll's preview parks at its start". Reproducing it found **two**
faults with one cause, and the cause is not what the brief guessed - it is not that a `dynamics`
segment cannot resolve its length.

**Measured, 2026-08-26.** `buildInTimeline()` for cr01 reports `duration() === 10000000000.6`.
That is GSAP's infinity sentinel, and it comes from `backgroundIdle()` - the ambient
`.credits-ambient` drift with `repeat: -1`, which **every** end-credits design carries. One
endless child takes the whole timeline's end with it.

- **Fault A, the settle.** `progress(1, true)` on that seeks to t = 1e10, which is a phase of
  whatever is still looping rather than the end of anything. Eleven of thirteen designs looked
  right anyway (their travel is a finite tween long since finished). The two whose travel is
  itself endless - the `credits-loop` reel, **cr06 and cr08** - settled with **0% of the
  viewport covered**, on every Home card, every library thumbnail, the editor canvas and the
  operator preview.

  **Somebody else found the same fault from the other side, and their fix landed on main while
  this branch was open.** Theirs re-derives the jump AFTER the data is written, because a
  design whose `update()` re-renders its rows throws the settled frame away with the elements
  it was on. Both fixes repair the empty frame independently; measured on the merged tree,
  coverage of the settled frame:

  | recipe | cr06 | cr08 | cr01 (a roll) |
  |---|---|---|---|
  | one jump, `progress(1)` | 0% | 0% | 69% |
  | one jump, the finite end | 51% | 69% | 69% |
  | two jumps, the finite end | 100% | 100% | 69% |

  **Their jump is the half that carries it.** The finite-end seek changes nothing at all on a
  roll and, on the reels, only improves a number their fix already takes to 100. It is kept as
  the narrower correctness fix: landing on a full frame ten billion seconds in is luck, and it
  holds only because a reel clones enough copies to cover the viewport at ANY phase. **Say this
  plainly if you touch the file** - an earlier draft of this handoff claimed the seek fixed the
  empty cards, and after the merge that was no longer true.

  The editor canvas had only ONE jump, because their fix went into `settleGraphic.ts` and not
  into `simulatorRuntime.ts`. It has both now, so the canvas and the thumbnails agree - which
  is the invariant `settleGraphic.ts` states in its own first paragraph.

- **Fault B, the play.** The wizard preview PLAYS on every rebuild. cr01's roll covers **0% for
  the first 1.5 s**, 1 of 4 blocks until ~6 s, and is not recognisably a credit roll until
  **~12 s** (sampled with `tl.time(t)`, immune to rAF throttling). That is the empty preview at
  the moment somebody decides whether the template is any good.

**THE DECISION, and its why is in `docs/DYNAMIC_MOTION_SCOPE.md` §11**, with pointers from
`src/components/timeline/AGENTS.md`, `src/components/wizard/AGENTS.md` and
`docs/SAVED_CONTENT_MODEL.md`:

> Measured motion has no end to settle to and no beginning worth showing. A settled graphic is
> parked at **the end of the motion that HAS an end** - every endless child ignored - and a
> surface whose job is "what does this graphic look like" **settles** measured motion instead of
> playing it. The Animation step (`WizardPreview`'s new `rehearse` prop) and ▶ Replay still play
> from zero: both are the reader asking for the motion rather than for the picture.

Three surfaces fixed: `preview/settleGraphic.ts` (the shared recipe serialized into every
preview document), `preview/simulatorRuntime.ts` (the editor canvas, its own copy), and
`WizardPreview` (which decides from `blocks/animData.ts` `hasMeasuredMotion`, off the DATA,
never the category).

**Deliberately NOT changed:** the emitted runtime's step-to-step settle
(`templates/shared/animRuntime.ts`) still uses `progress(1)`. "Is this step over" is a different
question from "where does this graphic rest", and changing it would change what every template
emits.

### 4. Two things the gates caught, and one gate that was wrong (041a4885, 625c528e)

Both are the same shape - *changed something without checking what depended on it* - and
they are worth reading before the next catalog edit:

- **`src/templates/types/ticker.ts` carries its OWN copy of tk18 sample text.** A promoted
  design keeps the copy it was written around, and `mergeCatalog` lets the type-COMPILED
  variant REPLACE the hand-written one of the same id - so that copy is the one that ships and
  the one the catalog baseline records. Changing the design file alone made the two disagree,
  which the CI **Factory gates** job named exactly: `FAIL tk18 minimal ticker`, gate `samples`.
  **Any change to a promoted design's sample has a second home.**
- **The heavy-browser-work guard refused `npm run queue`.** Enqueueing starts nothing, and the
  runner is the mutual exclusion the guard wants - but the payload is an argument and the
  matcher splits on shell separators without regard for quoting, so the one moment queueing is
  most obviously right was the one moment it was refused. `enqueuesWork` now lives in
  `scripts/command-match.mjs` beside the other matchers, with its own test.
- **The client-neutral gate was not reading `src/model/wizard.ts`**, which carries wizard copy
  (a list plan's `itemLabel`/`itemHint`/`formatNote`, a fixed plan's `reason`, a style
  choice's title). Same hole shape as the loose-components pathspec fix. Widened and
  mutation-tested.

### 5. Owner queue (29986808)

The stale credits item is **rewritten**, not joined by a fourth: the paste box, the optional logo
and the settle fix all land on the same field and are one walk. Two new items for the kicker and
the settle, each carrying the taste call it leaves open.

---

## ⚠ FOR THE BROWSE SESSION AND ANYONE NEAR THUMBNAILS

**Preview settle semantics CHANGED.** `preview/settleGraphic.ts` no longer calls `progress(1)`;
it seeks to the end of the finite motion. Anything that renders a settled graphic - Home cards,
`MiniPreview`, `GraphicThumb`, the operator preview, the Browse card previews - **inherits this
fix**. For every design but the two reels the parked pose is byte-identical; for cr06 and cr08 a
blank card now shows names. If a thumbnail measurement was taken before this branch lands,
**re-take it**.

---

## Verification state

- `npm run build` green on every commit (typecheck, lint, dep-cruiser, 320+ node tests, vite,
  prerender, line endings, the instruction-chain ratchet at its new 112,000).
- `scripts/ticker-parser.test.mjs`: 16 tests, in the build.
- CI dispatched on the branch head. **Read WHICH JOBS RAN**
  (`gh run view <id> --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'`) - a green run that
  planned only the last push is not a verdict.
- Catalog baselines re-recorded after the tk18 type fix and verified with no update flags.
- **All five catalog gates green, plus the factory gates**, run against a `preview_start` dev
  server: `type-floor` (507 variants), `numerals` (335), `field-coverage`, `overflow-sweep
  --baseline`, `test:e2e:catalog` (35), `node scripts/factory.mjs` (293 candidates). `l3-sweep`
  clean for both affected categories, `ticker` and `end-credits`.
- **The overflow baseline was re-recorded, and only three of its rows are mine.** A marquee's
  items travel past a clipping viewport, so `.ticker-item` and `.ticker-sep` were already
  accepted escapes and `.ticker-kicker` is the same escape under a new name (tk05, tk16,
  tk20). The other ten rows were OWED: cr01-cr04 and cr13 still carried `credits-row` /
  `credits-heading` / `credits-dot`, row kinds that stopped existing when the parser started
  emitting groups - so the sweep had been failing on main for reasons nothing here caused.
- **Those four sweeps do NOT start a dev server of their own.** Every queued attempt died on
  `navigating to http://localhost:5198/app`. Start one with `preview_start {name: "dev"}`
  first, run them, and STOP it before any Playwright job - a hand-started server on this port
  is the `reuseExistingServer` trap in e2e/AGENTS.md. `scripts/factory.mjs` says so itself.
- **The affected suite found two failures and both are fixed and re-run green** (28 passed
  across wizard-preview, end-credits and public-service): the tk18 baseline drift above, and
  a bug of my own worth knowing - `expect.poll(reader)` calls the reader with NO arguments,
  so a reader written to take `page` threw a TypeError that the file's blanket
  `catch { return null }` turned into a fifteen-second timeout blaming the product. The
  catches now re-throw anything that is not the mid-swap error they were written for.

## A landing hazard that is not about this branch

`auto-merge.mjs` `waitForCi` polls `gh run list --commit <sha>` sixty times at ten seconds, so
a run has **ten minutes to APPEAR** on the commit the job just pushed. GitHub webhooks ran 28 to
40 minutes late on 2026-08-26 (measured by the docs-polish session, not by me), which means a
landing whose branch is behind main pushes a merge sha and can then time out waiting for a run
that is merely queued somewhere else. It reads as a fault in the tree and is not one.

Two ways round it, cheapest first:

- **Be up to date when your turn comes.** If the branch tip already equals the integrated sha,
  the run you dispatched yourself is already on that commit and `waitForCi` finds it on its
  first poll. That is the whole trick.
- **Dispatch while it waits.** `gh workflow run ci.yml --ref <branch>` targets the tip, which
  after the job pushes IS the sha it is waiting for, and a dispatch appears immediately with no
  webhook involved.

The real fix is in `waitForCi` itself - a wait with no way to make the thing it waits for happen
is a missing mechanism, and it could dispatch the run rather than give up. It is deliberately
NOT done on this branch: that is shared landing machinery and several branches were queueing
through it the same evening.

## What is left, and what I would do next

- **The ticker's VALUE axis is still per-design and not portable.** tk04, tk06, tk14, tk22 parse
  a price or a change out of the line by position; tk13 an `n - n` score. Folding a value into
  the kicker's grammar would mint a second mark to learn, and the two are genuinely different
  questions - a kicker LABELS, a value MEASURES. It is written down at the end of
  `docs/TICKERS.md` and in `src/templates/AGENTS.md`. Do it only if the owner asks.
- **The instruction ratchet has 6,776 bytes of headroom at `src/components/wizard/AGENTS.md`**,
  which is the next file to split. Its obvious candidates are the Import-graphic flow and the
  Create-with-AI tiers; remember the two-directories rule above or the exercise buys nothing.
- Two credits designs (cr06, cr08) and five ticker samples want a human's eyes - that is what
  the owner-queue items are for.

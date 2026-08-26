# Handoff — C: credits line continues (tickers, the roll preview, the ai/ split)

**Branch:** `claude/c-credits-tickers-roll-602e6b` · four commits on top of `cf9f3f02`.
Everything below is measured; the commands to re-measure are in it.

---

## What landed

### 1. `src/ai/` split into `lite/` and `pro/` (334e47b5)

`src/ai/AGENTS.md` was the tightest instruction chain in the tree at **107,750 of 120,000
bytes** — the file every session working anywhere in the harness loads before doing anything.
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
  only skipped `R `, not `RM`. **This fires on every file-move commit** — the timeline split
  would have hit it too.
- The Lite bench's contract-symbol scan read `contract.` out of a comment naming
  `src/ai/lite/contract.ts` and demanded an export called `ts`.

### 2. Tickers: a colon ends a KICKER (465793b8, 09aab8ee)

The three-part move, all three parts done.

**(a) The format.** A ticker's one field held a flat list of stories, so the only structure an
item could carry was whatever a design guessed from position — and **four of them guessed
differently**: tk18 split a service name at an em dash, tk04 took the last two words as a value
and a change, tk06 a trailing signed token, tk13 an `n - n` in the middle. None of it was
portable: move a rundown from Status Rotator to a crawl and the service names vanished.

An item now carries a **kicker**, with the credit roll's own mark — a colon ends a kicker,
everything else is the story, and a kicker typed on its own line tags every story beneath it
until a blank line or the next kicker. Nothing is required, which is why **no existing sample
had to change**.

**Two rules differ from `docs/END_CREDITS.md`, and both were discovered by reading the designs
rather than by design:**

- The colon must be **followed by a space** or end the line. End credits guard the mark by
  length alone; a ticker cannot, because it writes numbers — `UNITED 2:1 CITY` is a score tk13
  draws as a chip, `close at 20:00` is a clock, a link has a colon. A length guard alone made
  tags of all of them.
- **`|` is not a separator here.** tk17 already splits an item at it into its two LANGUAGES and
  ships with bilingual samples. A mark a design has spoken for cannot be given a second meaning
  by the parser above it.

`renderTickerItem` keeps its one argument, so all 22 designs kept working; the shared
`.ticker-kicker` rule is emitted before the design's CSS so a design can restate it. A design
that PLACES the tag defines `renderTickerKicked(kicker, text)` — tk18 takes it, so its service
column now holds a mark every other ticker can read.

**(b) The wizard step.** `FieldPlan` gained `formatNote`, rendered under the rows editor, rather
than hardcoding ticker prose in a shared component. Checked on the actual screen, not just the
parser: `e2e/wizard-filters.spec.ts` asserts the note is there.

**(c) Proved three ways.** `scripts/ticker-parser.test.mjs` runs the EMITTED JavaScript (cut out
of its template literal, so a rule that reads right in the `.ts` and ships broken fails the
build). `e2e/public-service.spec.ts` measures the rendered strip, the portability claim across
two designs, the score/clock/link cases, **the whole exported package** (every target must carry
the parser and the rule) and **the control path** — the identical `update()` the dashboard
monitors, the browser-output renderer and an export all call.

Public guide: `docs/TICKERS.md` and `/docs#tickers`.

### 3. The roll preview — the settle decision (bc77e262)

**Read this section before touching any preview surface.**

The reported fault was "a roll's preview parks at its start". Reproducing it found **two**
faults with one cause, and the cause is not what the brief guessed — it is not that a `dynamics`
segment cannot resolve its length.

**Measured, 2026-08-26.** `buildInTimeline()` for cr01 reports `duration() === 10000000000.6`.
That is GSAP's infinity sentinel, and it comes from `backgroundIdle()` — the ambient
`.credits-ambient` drift with `repeat: -1`, which **every** end-credits design carries. One
endless child takes the whole timeline's end with it.

- **Fault A, the settle.** `progress(1, true)` on that seeks to t = 1e10, which is a phase of
  whatever is still looping rather than the end of anything. Eleven of thirteen designs looked
  right anyway (their travel is a finite tween long since finished). The two whose travel is
  itself endless — the `credits-loop` reel, **cr06 and cr08** — settled with **0% of the
  viewport covered**, on every Home card, every library thumbnail, the editor canvas and the
  operator preview. Seeking to the end of the FINITE motion puts them at **51% and 69%** and
  leaves the other eleven byte-identical. Measured through the real serialized bootstrap.
- **Fault B, the play.** The wizard preview PLAYS on every rebuild. cr01's roll covers **0% for
  the first 1.5 s**, 1 of 4 blocks until ~6 s, and is not recognisably a credit roll until
  **~12 s** (sampled with `tl.time(t)`, immune to rAF throttling). That is the empty preview at
  the moment somebody decides whether the template is any good.

**THE DECISION, and its why is in `docs/DYNAMIC_MOTION_SCOPE.md` §11**, with pointers from
`src/components/timeline/AGENTS.md`, `src/components/wizard/AGENTS.md` and
`docs/SAVED_CONTENT_MODEL.md`:

> Measured motion has no end to settle to and no beginning worth showing. A settled graphic is
> parked at **the end of the motion that HAS an end** — every endless child ignored — and a
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

### 4. Owner queue (29986808)

The stale credits item is **rewritten**, not joined by a fourth: the paste box, the optional logo
and the settle fix all land on the same field and are one walk. Two new items for the kicker and
the settle, each carrying the taste call it leaves open.

---

## ⚠ FOR THE BROWSE SESSION AND ANYONE NEAR THUMBNAILS

**Preview settle semantics CHANGED.** `preview/settleGraphic.ts` no longer calls `progress(1)`;
it seeks to the end of the finite motion. Anything that renders a settled graphic — Home cards,
`MiniPreview`, `GraphicThumb`, the operator preview, the Browse card previews — **inherits this
fix**. For every design but the two reels the parked pose is byte-identical; for cr06 and cr08 a
blank card now shows names. If a thumbnail measurement was taken before this branch lands,
**re-take it**.

---

## Verification state

- `npm run build` green on every commit (typecheck, lint, dep-cruiser, 320+ node tests, vite,
  prerender, line endings, the instruction-chain ratchet at its new 112,000).
- `scripts/ticker-parser.test.mjs`: 16 tests, in the build.
- Catalog baselines re-recorded (`e2e/catalog-baseline.json`, `e2e/catalog-render-baseline.json`)
  and carried in 09aab8ee.
- CI pushed at `29986808`. **Read WHICH JOBS RAN**
  (`gh run view <id> --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'`) — a green run that
  planned only the last push is not a verdict.
- Queued locally and draining: `catalog-baseline` (verify, no update flags), `overflow-sweep
  --baseline`, `type-floor`, `field-coverage`, `numerals`, `e2e-affected`. `npm run jobs` shows
  where they are. **If `overflow-sweep --baseline` writes a diff, it belongs in this branch** —
  five ticker samples changed (the shared fallback, tk05, tk16, tk18, tk20).

## What is left, and what I would do next

- **The ticker's VALUE axis is still per-design and not portable.** tk04, tk06, tk14, tk22 parse
  a price or a change out of the line by position; tk13 an `n - n` score. Folding a value into
  the kicker's grammar would mint a second mark to learn, and the two are genuinely different
  questions — a kicker LABELS, a value MEASURES. It is written down at the end of
  `docs/TICKERS.md` and in `src/templates/AGENTS.md`. Do it only if the owner asks.
- **The instruction ratchet has 6,776 bytes of headroom at `src/components/wizard/AGENTS.md`**,
  which is the next file to split. Its obvious candidates are the Import-graphic flow and the
  Create-with-AI tiers; remember the two-directories rule above or the exercise buys nothing.
- Two credits designs (cr06, cr08) and five ticker samples want a human's eyes — that is what
  the owner-queue items are for.

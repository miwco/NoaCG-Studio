# Two owner walk findings, and the two classes underneath them

**Branch:** `claude/e-walked-remnants`. Both 2026-08-28 walk findings are fixed, both receipts are
deleted, and both defects turned out to be bigger than the design the owner named. The value was
in the sweeps, exactly as he asked.

## Rising Total: the flash was one frame, and every graphic had it

`docs/backlog/counting-playout-remnants.md` said the 2026-08-28 class fix (`opts.lead` in the four
`igMotion` builders) had missed Rising Total. It had not. The zero rule was working: ig05's
animation data carries `{"time": 0.4, "build": "infographicCountUp"}`, the interpreter hands the
head start over as `opts.lead` and adds the marked timeline at 0, and driving a cold document in
the playout order (`update()` then `play()`) shows the figure counting from zero on frame 0 - which
is why the existing PLAYED pass was green and stayed green.

**The defect is one frame EARLIER than the zero rule can reach.** Every opening value the
interpreter writes is a `set()` on the timeline, and a GSAP timeline renders nothing until the
ticker next runs. `play()` is one synchronous task, so the browser paints once between `play()`
returning and the entrance's first tick - showing the graphic exactly as it already was. Off air
that paints nothing, because the root sits at opacity 0. **On air it paints everything**, and a
graphic is on air on every re-take: the editor canvas, the Rehearse panel, and a dashboard, SPX or
CasparCG take of a graphic that is still up.

Measured on a settled ig05: `play()` returned with `#f0` reading its real `124,213` at opacity 1,
and the entrance's zero landed 14 ms later. That is the owner's report word for word.

**Fix:** `noacgEntranceTimeline()` in `src/templates/shared/animRuntime.ts` renders frame 0
(`tl.render(0, true, true)`) before returning. It writes precisely what the next tick would have
written, with events suppressed, so the entrance's timing and content are unchanged - only the
moment its opening values reach the DOM moves, by one frame, onto the take itself. One place, so
it covers every category on the data region, not only counting designs.

**Why the owner saw it on Rising Total and not on Poll Ring or Doors Open:** he was right that
those two looked correct, and wrong about why. All of them had the stale frame; only Rising
Total's is a number the size of the panel. What actually distinguishes Rising Total is the second
fault below.

## The second fault on the same design: the count had no thousand separators

`infographicCountUp` wrote `Math.round(counter.value) + suffix`, so ig05 and ig22 ran `8807`,
`16041`, `124213` and only regained their commas on the final frame - the number changed width and
read as a different order of magnitude every few frames. `infographicGoalRing` (Poll Ring) had
called `infographicGroupDigits` all along. The helper existed; one of its two callers was never
given it.

Both now go through one `infographicCountText(n, stat)`, and **whether to group is read off the
operator's own figure** (`stat.grouped`) rather than decided per builder - grouping `1200` would
have been as wrong as counting `124213` up to `124,213`. That also fixes the ring's inverse case.

## Ticker kickers: the builder was handed markup

`docs/backlog/ticker-kicker-consistency.md`. The tag was concatenated ahead of the story and the
whole string passed to the design's `renderTickerItem`. That works only while a builder treats its
argument as opaque, and **six of the twenty-two do not**: tk04, tk06, tk13, tk14, tk17 and tk22
read it to find a price move, a score or a language break. (tk18 also parses, but it defines
`renderTickerKicked` and is handed both halves, so it was never at risk.)

Reproduced with the rundown the owner described, a colon after the index name:

```
OMXH25: 4218.60 +1.24%
```

tk14's pattern took the tag's markup for an instrument and cut it at the space inside the class
attribute, so `class="ticker-kicker">OMXH25` scrolled across the strip as words. **tk04 and tk22
broke identically; tk06, tk13 and tk17 survived this rundown and were one rundown away.** The
earlier `MARKETS: OMXH25 4218.60 +1.24%` shape does NOT break tk14 - the last space happens to fall
in the right place - which is why the receipt's own repro line mattered.

**Fix:** `tickerItemHtml` in `src/templates/tickers/shared.ts` now hands the builder the story
alone and inserts the tag into the item it drew, through the DOM, as its first child. That is the
same position the old string form produced for every design that was already right (all sixteen
wrap the story in one element), and the right position for the six that were not. No per-design
fork, which is what the receipt asked for.

## The consistency ruling I took

**The colon stays the one and only kicker mark on every ticker, and the Market Board's bold symbol
is not a rival mechanism - it is the design's own market-data reading, and it stays.**

The receipt recorded the owner's dictation as "semicolon" twice. A semicolon has always been
accepted wherever a colon is (`tickerKickerMark` matches `[:;]`), so both work and nothing needed
choosing there; I wrote the rule around the colon because that is what was ratified and what
`/docs#tickers` teaches. What did need deciding was whether the Market Board's first-word bolding
counts as a second mechanism to remove. It does not: tk14 bolds the symbol because it splits
`OMXH25 4218.60 +1.24%` into symbol, level and move. Now that the colon works there too, the strip
has exactly what the others have, and the owner's stated reason for preferring the colon holds -
**a kicker can be several words**, up to 32 characters, which first-word bolding could never do.

Written up for him to overrule in one line:
`docs/acceptance/owner-queue/2026-09-03-ticker-kickers-one-mechanism.md`.

**Edge cases, decided.** A wanted literal colon was already safe and always had been: the colon
only ends a kicker when a space or end-of-line follows it, within the first 32 characters, so
`United 2:1 City`, `close at 20:00` and `Results from 21:00` pass straight through (gated in
`e2e/public-service.spec.ts`). Multi-word tags work. A design that wants to place the tag itself
still defines `renderTickerKicked`.

**Left open on purpose:** there is no escape for a line that genuinely begins with a short phrase,
then a colon and a space, and wants NO tag. Minting a second mark costs every operator something,
to rescue a line that can be rewritten. Flagged in the owner-queue item rather than invented.

## Both gates were listing their design set; both now discover it

This is the part worth keeping. Neither defect could have been caught by the gates that existed.

- **`e2e/counting-settle.spec.ts`** grew a third pass, `a counting graphic taken again on air never
  paints its old figure`. Its two existing passes both start from a document that has never played,
  where there is no stale pose to catch. The new one plays the graphic out, takes it again, and
  reads the DOM **synchronously after `play()` returns** - the frame the browser is about to paint,
  which is exactly when the evidence is still there. It also checks the count's notation against
  its own target's, so a builder that formats differently from its figure is caught by the test.
- **`e2e/public-service.spec.ts`** grew `every ticker design draws the tag as a tag, with no markup
  reaching the strip`. The three kicker tests already there name tk05, tk13 and tk18 because each
  makes a point about that design; none was a claim about the category, and the category is where
  the mark broke. The new one sweeps all 22 with the breaking rundown and reads what a VIEWER sees.

**Both were run against the pre-fix code and both fail there** - which is the only thing that makes
them gates rather than decoration. The counting one names eleven readouts across ig01, ig04, ig05,
ig07, ig22, ig23, ig30, ig31, ig35 and ig36; that list is the measure of how catalog-wide the
stale frame was.

## What was verified

- `npm run build` green on this branch (the version stamp names `claude/e-walked-remnants`, so the
  gate ran on this tree and not on `main`).
- `node scripts/check-catalog-emit.mjs` PASS after re-recording `e2e/catalog-baseline.json`. All
  504 designs moved, because `animRuntime.ts` ships in every template.
- `e2e/counting-settle.spec.ts` - 4 passed. Negative control against the pre-fix runtime: fails
  with the eleven readouts above.
- `e2e/public-service.spec.ts -g "every ticker design draws the tag"` - passed (18 s). Negative
  control against the pre-fix `tickerItemHtml`: fails naming tk14, tk22 and tk04, the same three
  the standalone rig found.
- Standalone frame-level measurement of the take (a throwaway rolldown + Chromium rig, not
  committed): `paintedAfterPlay` went from `124,213@1` to `0@0` on ig01, ig04, ig05 and ig22, and
  ig05/ig22 count `8,807` instead of `8807`.

**Not verified:** the rendered catalog sweeps `catalog-affected` names (`numerals`,
`overflow-sweep`, `type-floor`) were enqueued and the runner had under 4 GB free all session, so
they had not drained. CI runs the same measurements on a clean checkout, which is the gate that
counts; nothing in these changes moves type size or layout, only what is written into a readout
and where one span sits.

## Delegation

Both corpus sweeps went to `gemini-3.8-flash-high`, both recorded in
`~/.noacg/delegation-outcomes.jsonl`.

- **ticker-kicker-sweep** - first attempt returned nothing, and the failure is worth knowing: `agy`
  in headless mode auto-denies the `command` permission it needs to walk a directory, and there is
  nothing to answer the prompt with. The retry naming all 23 absolute file paths so only
  `read_file` was needed answered in 42.5 s and **matched my own grep-derived answer on all 22
  rows**. Verified by re-deriving, not by trusting.
- **counting-mechanism-sweep** - returned nothing for the same reason and was not retried, because
  the question genuinely needed traversal. Done by hand.

**The lesson for the next router:** enumerate the files. A sweep phrased as "every file in
&lt;dir&gt;" is auto-denied in that harness and costs tokens to learn so.

## What is left

Nothing on this branch. Two owner-queue items are waiting on the owner, not on work:

- `2026-09-03-rising-total-plays-from-zero.md` (`kind: walk`) - the route is take a Rising Total,
  let it finish, take it AGAIN. The second take is the one that used to be wrong.
- `2026-09-03-ticker-kickers-one-mechanism.md` (`kind: walk-p`) - carries the consistency ruling
  and the one decision to overrule.

The two older items (`2026-08-26-tickers-a-colon-ends-a-kicker.md`,
`2026-08-27-counting-graphics-start-at-zero.md`) were annotated to point at the new ones rather
than left saying the work is unstarted.

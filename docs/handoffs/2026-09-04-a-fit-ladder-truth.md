# Row A: the fit ladder does what it says

Branch `claude/a-fit-ladder-truth`, six commits, queued for landing. The row's goal was that a
long question wraps inside the box it was drawn in, at the drawn size, on every ladder option, on
the first measurement, repeatably - and that "the panel gets wider" visibly widens the named
shape.

## The headline, because it changes what the next row should believe

**The bug the row was written to fix does not exist on this tree.** The owner-queue item has
carried "when I add a longer question, the text gets smaller" as its headline since 2026-09-02.
Measured on his own board, on BOTH surfaces (the wizard's Fields step and the editor canvas after
Create project), across all four ladder options and six value lengths: the question wraps onto
two, three and four lines at the 36 px it was drawn at, and never shrinks. The only value that
shrinks is one with no spaces in it, which cannot wrap and for which shrink is genuinely the next
rung - that is his own "I make spaces in a word" clue, and it is word-breaking rather than
randomness.

So either his walk was against a checkout without the 2026-09-03 fixes, or there is a condition on
his machine the sweep does not create. **A font that resolves on his machine and not in the
offline suite is the one I would look at next.** The owner-queue item asks him for the exact
question text if he can still reproduce it. Do not re-open this as a runtime bug without a
measurement.

## What WAS wrong, all four measured, all four fixed

1. **A rotated plate grew the wrong way.** A rect has no width on the screen's axes - it has a
   width along its own x, and a transform decides where that points. His plates are portrait rects
   turned flat, so "the panel gets wider" grew the band 114 px TALLER and 2 px wider.
   `svgGrowAxis` now picks the attribute from the element's own matrix.
2. **The growth rung was dead at every value.** Sideways growth only ever went right and the cap
   only ever mirrored the left margin, so his plate (212 px in from the left, 120 from the right)
   had its ceiling 92 px behind its own right edge. Direction now follows the text: start-anchored
   text still needs the far edge, and centred text widens the panel from its MIDDLE, capped by the
   nearer margin. Where the middle offers less than one way does, it grows one way and the text
   anchored to the panel's centre travels with it.
3. **The wrap rung's room depended on what had been typed before.** The lines a panel offers
   height to were collected by asking which text STARTS inside it - true for a left-anchored line,
   false for a centred one, whose left edge leaves the plate exactly when the value gets long. A
   line is now placed by where it is ANCHORED. The height on offer is also read before any rule
   has grown, which is what `svgOfferHeights`'s own doctrine always claimed.
4. **A shrunk centred block sat 1.5 units low**, because the snap was measured for the block as
   drawn. `svgRecentre` measures once after the size search and corrects.

## What the next session must not repeat

**The gate that missed all four walked each file once, at the drawn length, on the proposed
option.** There is now a sweep in `e2e/import-svg-corpus.spec.ts` over his board x four options x
six lengths, asserting the ladder's ORDER rather than a table of numbers. It is the first
instalment of `docs/backlog/fit-ladder-exhaustive-sweep.md`. **It covers ONE file.** Extending it
to the rest of the corpus is the obvious next move and was not done here.

## Two AGENTS.md sentences are now false, and row F owns them

I was told not to edit any `AGENTS.md` this wave. These two are wrong because of this branch:

- `src/templates/importedDesign/AGENTS.md`, the growth bullet: *"a panel grows AWAY from the edge
  it is anchored to (`svgGrowDir`), so a lower third gets taller UPWARDS with its composed edge
  staying put; **'x' is unchanged, because sideways the TEXT answers it**."* Sideways the text
  still answers it, but the answer now has three outcomes - right, left, or from the middle - and
  'x' is no longer unchanged.
- Same file, the cap bullet: *"The cap is the DESIGN'S OWN MARGIN, MIRRORED (`svgGrowCap`)"* needs
  the middle case, where the bound is the NEARER of the two margins rather than a mirror.

A third sentence in that file became TRUE rather than false: the fit now really does run "against
the most that rule could give (`svgOfferHeights`, at rest)", which it did not before.

## Reported, not fixed - and why

**An explicit `text-anchor` opts a file out of the whole alignment feature.** `svgAlignOf` only
sets `align.width` when it DERIVED the alignment, so a file that writes `text-anchor="middle"`
never gets box-measured room, never gets the centring snap, and never gets middle growth. Eight of
the 43 corpus files write one, `figma-centred-title-card` among them - so a third of Figma and
Inkscape exports get none of the 2026-09-02 alignment work. That is upstream of this row and
pre-existing, and widening it changes behaviour on eight files at once, so it belongs in its own
change with its own measurement. **This is the most valuable thing on this list.**

Also untouched, both flagged by the owner and both out of this row: one dropdown still governs the
whole graphic (his finding 5, a design question in
`docs/backlog/growth-rule-geometry-and-purpose.md`), and the behaviour's answer count still
defaults to 2 on a board with five text boxes (his finding 6, row B's area).

## Gates

- `npm run build`: green on the final commit.
- `check`: **`review: delegated`** - the code-review skill returned six findings into the
  conversation, scope-checked against this branch and this worktree; five confirmed against the
  code and fixed, one reported above. **`simplify: inline`** - the skill returned fan-out
  instructions, so the four angles were done here; three readability fixes, one of them the exact
  shape that hid the follower bug (a `side` computed above an if/else and used in neither branch).
  **`verify: inline`**, full. Verdict stamp at
  `<git-common-dir>/noacg-jobs/checks/claude-a-fit-ladder-truth.json`, reviewedSha `d5c97107`.
- The four covering spec files - `import-svg`, `import-svg-corpus`, `import-stretch`,
  `import-svg-behaviour`, **99 tests, all pass on the final tree**.
- `node scripts/check-catalog-emit.mjs`: green, baseline re-recorded twice for svg01 (the emitted
  runtime changed in both source commits).
- All five catalog gates `catalog:affected` named for svg01: `overflow-sweep` PASS,
  `catalog-specs` 4 passed; `type-floor`, `field-coverage` and `numerals` pass by vacancy (svg01
  is outside their coverage - they say so themselves).
- Mutation-tested: forcing the old axis choice reproduces "the plate got 114 px taller for 2 px
  wider". The other three fixes were each proven by a red before they were made.

**`npm run test:e2e:affected` was NOT run.** The plan off `src/templates/` is about forty spec
files, the machine sat near 2 GB free against the queue's 4 GB floor with four rows live, and the
one browser slot was held by another branch's landing gate. The covering specs above are the
substantive coverage; CI on the landing run is the gate that answers the rest.

## A defect in the catalog-gate advice, measured twice tonight

`npm run catalog:affected` tells you to `npm run queue -- "node scripts/type-floor.mjs ..."` and
four siblings. **Four of those five need a dev server on the checkout's own port and do not start
one**, so queued they die instantly and the queue reports them as `failed and has written nothing
yet` - which reads exactly like the change under test having broken them. I queued them twice, ten
jobs, and eight failed that way; only `catalog-specs.mjs` (which drives Playwright and brings its
own server) ever ran. Running them by hand after `npm run dev:worktree` gave all five verdicts in
about four minutes.

So either those four scripts should start a server the way `catalog-specs` does, or
`catalog:affected` should print `npm run dev:worktree` as step 2's precondition instead of telling
you to queue them. This is the queue's area - row D (`claude/d-queue-walks-itself`).

## Owner queue

`docs/acceptance/owner-queue/2026-09-04-the-fit-ladder-does-what-it-says.md` - route, what to look
at, and the two taste calls that are his: which way a centred plate widens, and how much wider it
gets before the nearer margin stops it.

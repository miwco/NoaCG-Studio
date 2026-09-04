# 2026-09-04 - row H: what each kind of show actually needs

Branch `claude/h-catalog-by-programme`, cut from `b7507bbf`. The brief was the owner's
2026-09-03 catalog verdict ("banners with an accent line"; a strategy before more drawing) and
the first two items of `docs/backlog/catalog-variety-by-programme-type.md`: a survey of what
each kind of show runs, joined to the catalog, so the next drawing session is handed a named
absence. No product code changed; nothing was drawn, by design.

## What shipped

- **`docs/CATALOG_BY_PROGRAMME.md`** - the survey and the queue. Six genres in the owner's
  words (news, sports, game show, talk show, podcast, film and entertainment), each as a table
  of what the show runs, what each graphic has to say, its conventional shape and place, and
  the catalog's status for it (have, house-only, stand-in, absent, out). Then the genre x kind
  gap table (§5), twelve named absences ranked as the drawing queue (§6), the measured look of
  all twenty-two categories off rendered pixels (§7), the conventional default palette and entrance
  per genre as input to the defaults work (§8), and a PROPOSED weekly drawing slot (§9) that
  names what would register it. Every source is listed with whether it was fetched,
  summarised from search, or is convention.
- **`docs/backlog/catalog-variety-by-programme-type.md`** - state `active` on this branch,
  with a "where it stands" paragraph: items 1 and 2 answered in the document, item 4 (the
  cadence) proposed and not registered, item 3 (the per-design defaults) still open with §8 as
  its input. The file stays until items 3 and 4 land.
- **`docs/README.md`** - the index row the docs gate requires.
- **`docs/acceptance/owner-queue/2026-09-04-the-catalog-strategy-you-asked-for.md`** - the
  route for the owner: open §6 (under a minute), read its twelve items (about five), and the
  one thing only he can settle (whether the first two items are the two he would draw first).

## The three findings worth carrying

1. **The catalog IS organised by show, at the data level.** Sixty formats map onto twenty-one
   packs and every design derives its programme formats from that. The owner's complaint is
   about the design axis under the pack axis: a talk-show kit resolves to a full set of
   graphics that share one silhouette. The delegated inventory put a number on it: 138 of 441
   designs name no show at all in their own words; eight were drawn for a talk show, none for
   a podcast.
2. **The absences are shapes and states, not kinds.** The catalog has nearly every JOB a show
   runs. What it lacks is the over-the-shoulder box (nothing but bugs, scorebugs, towers and
   clocks sits in the upper band across 494 measured designs), the money ladder, people cards with pictures, a full-frame
   open (info cards, which hold every title card, have no full-width design), the formation,
   the game boards with reveal states, the goal flash, the waveform, the info bar, the film
   fact box, the buzz-in state, and the gala register. Each carries who asks for it.
3. **The quiz shelf is one design in four families**: twelve boards, one footprint bucket, one
   position, four distinct card looks. The game-show column is the shortest of the six, and it
   is the genre the 2026-09-12 production runs.

## Delegation

The catalog inventory (441 designs, kind and genre) went to Antigravity with the files
enumerated by absolute path, per the row's instruction. The first call, all 441 rows as JSON
with a `why` field, was cut off at the output cap and returned nothing; the fix was the tactic
already on the routing ledger: split across pools with a compact output. Four chunks of about
110 rows, two on `gemini-3.7-flash-high`, two on `claude-sonnet-4-6`; all four returned every
id in order with vocabulary clean, and the Sonnet chunk 4 wrapped its rows in eight lines of
prose that had to be filtered. Re-derived sample of 35: kind 31 of 35, genre 27 of 35; two real
kind errors (`bug29` award bug read as a reveal, `card55` In Memoriam read as an opener), the
rest judgement on genre-less cards. Both outcomes are on the ledger as `repaired / worker`
(labels `h-catalog-inventory-gemini`, `h-catalog-inventory-sonnet`; `npm run harness:usage`).
The kind vocabulary lives in the document's §2, so the prompt itself need not survive.

## Measurement

`card-look-sweep` was run per category through the queue, after starting this worktree's dev
server first (the trap the prompt named: four of five catalog gates died instantly earlier
tonight for want of one). Twenty-two jobs, one per category, all drained inside the window at
about a minute each behind a landing job, and all twenty-two are in §7; nothing in the
document is quoted from an earlier sweep. The lower-third number is both measured tonight
(93% `strap/thin` at 101) and consistent with the 2026-08-21 figure the backlog quotes (96% at
103, before four shapes were drawn and six duplicates retired). The sweep's JSON carries the
ink box's vertical position, which the script computes and does not print; §7 reads it back,
and it is what puts a number under §6 item 1.

## /check

`review: delegated` - the code-review skill forked, named this branch and only this branch's
five files, and returned ten findings, every one verified against the files before acting and
all ten confirmed: the two outcome lines had never reached the ledger (the first write was
refused because `--review-findings` takes a count, and a `tail -2` hid the refusal; rewritten
with the prose under `--notes`); §8 claimed every palette already existed when the gala's gold
and the morning show's warm daytime do not; the measured-design count was the file count (479)
not the sweep's (494); the sweep command was written without the `--json` path it needs; six
§5 cells disagreed with the §3 tables they summarise; the kind count was off by one and the
"same words in every table" promise was overstated; the owner-queue item carried `serves: now`
for backlog work and a five-minute "route"; the opening said the document answers items 1 and
2 while the index, the backlog and the handoff said 1, 2 and 4; two id ranges cited retired
designs (`cr10`, `lt36`) and the lower-third arithmetic said two new shapes where there were
four; and §9 presented a cadence nothing registers. All fixed in the document; the last is now
an honest proposal that names the three mechanisms that would make it fire, none built here.
`simplify: inline` - the skill returned fan-out instructions, so the four angles were covered
here; one duplicated sentence removed, nothing else in a documentation diff to simplify.
Verify: the fast document checks green over the final state (docs index, owner receipts,
owner queue, copy tells, no em dashes); `npm run build` green over the final state, stamped
`claude/h-catalog-by-programme`. No product code changed, so no e2e plan; `taste: not
applicable` - nothing in this change can move what a graphic looks like. The verdict stamp
under `.git/noacg-jobs/checks/` was NOT written: the permission classifier refused a write
under `.git`, so the mode lines above are the only record of the check.

## What is not done, and where it goes

- **Item 3 of the backlog file** (per-design default palette and entrance) is untouched. §8 of
  the document is its input; the work is one config line per design and a first-page spread
  measurement, and §9 proposes it as the nightly slot's job.
- **The cadence is not registered.** §9 names the three mechanisms: a `docs/ROUTINES.md` row
  for the weekly drawing row whose prompt is generated from the top unclaimed entry of §6
  (the orchestrator's, on accepting the cadence); a check in the shape of
  `scripts/check-docs-index.mjs` that every id the document names as HAVE resolves in the
  catalog and no ABSENT has since been filled (a half-day mechanical row); and the §6 entry
  moving to HAVE in the same commit as the designs, stated as the routine's acceptance
  condition. Until the first exists the queue fires only if somebody remembers §9.
- **The six genres not surveyed** (esports, corporate, church, commerce, education, wellness)
  are §9's refill step when the twelve are drained.
- **Nothing was drawn.** The next drawing row takes §6 item 1 or item 2, as a set, in the
  register §8 names, and proves the footprint bucket on the sweep before review.

## For the owner

Nothing to walk in the product. The owner-queue item asks him one question: whether §6's
first two items are the two he would draw first.

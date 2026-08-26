# Handoff - the copy gate, the taste rubric, and the shelf

Branch `claude/copy-gate-taste-rubric-4800ea`. Three commits, `npm run build` green on the tree
this leaves (the gate is in that build, so it passed against itself).

## What landed

**1. A build gate that refuses new machine-sounding copy** (`scripts/check-copy.mjs`,
`npm run check:copy`, in `npm run build` right after `check-client-neutral`).

- **Scope is the text a user reads:** the product UI (`src/components`, `src/landing`, `src/docs`,
  `index.html`, `docs.html`) and the comments inside the code every template export ships
  (`src/templates`, template-literal contents only). A source comment in a `.tsx` file is out of
  scope; nobody outside this repo reads it. Maintainer docs are out entirely.
- **Rules:** the em-dash and its three HTML spellings, plus `seamlessly`, `empower`, `elevate`,
  `delve`, and the "whether you are X or Y" opener. Each carries its reason in the source.
  `seamless loop` is deliberately NOT banned - it is a real term of art in animation.
- **The ratchet:** `scripts/copy-baseline.json` freezes the **5,818 lines across 540 files** that
  already existed (5,812 em-dashes, 6 `seamlessly`), and the gate refuses any change to those
  counts **in either direction**. A count that drops is as stale as one that climbs, because the
  high number quietly hands the file back the room it just gave up. `npm run check:copy -- --update`
  re-records, which makes the friction one command rather than an argument.
- `scripts/check-copy.test.mjs` (23 tests, in the build's `node --test` list) proves every banned
  phrase is REJECTED and pins both scoping decisions. It was also smoke-tested against a real file:
  an added `'Elevate your workflow — seamlessly'` in `AppShell.tsx` produced three findings with
  line numbers and exit 1.

**2. The em-dash in commit messages** (`scripts/hooks/guard-command.mjs`), no escape hatch. Proven
live: the hook refused a test commit while this session was writing it.

**3. `docs/TASTE_RUBRIC.md`** - four checks answerable from a screenshot, owner rulings only.

**4. `docs/backlog/`** - the shelf, with its contract and two items: `template-variety-and-dedup.md`
(the owner's ask, with the measurements and `handoffs/lower-third-shapes.md` as the standing brief)
and `copy-tells-drain.md` (the 5,818 frozen lines, sliced into three landable pieces).

**5. `docs/COMPETITORS.md`** - the capability matrix, assembled from existing research only.

**6. `configured-suite.yml`** - both rolling-issue steps now require a scheduled run or `main`,
which is the fix `2026-08-26-d-green-mornings.md` left behind and could not make while the file was
frozen. The five consumed handoffs from 2026-08-26 are deleted; `lower-third-shapes.md` stays.

## What is left, and what to watch

- **The baseline is untouched work, not finished work.** `docs/backlog/copy-tells-drain.md` has the
  three slices. The cheapest and most valuable is `index.html` + `docs.html`: 101 lines of public
  marketing and documentation copy.
- **The gate will interrupt the next session that edits copy in a scanned file**, including one
  that IMPROVES it. The message names the command. If that friction turns out to be worse than the
  hole it closes, the decision to revisit is "should a decrease fail", and it is one condition in
  `compare()`.
- **Two known scanner limits**, both of which only ever hide a violation rather than invent one, and
  both frozen into the baseline the first time they fire: a regex literal containing `//` reads as a
  line comment, and an apostrophe in bare JSX text opens a string that runs to the next quote.
- **`docs/COMPETITORS.md` says UNRESEARCHED for most of Singular.live and Loopic.** That is honest
  and it is also the biggest hole in the file, given Loopic's positioning overlaps ours most
  closely. Half a day of reading public material would change what the page is worth.
- **The rubric is owed an owner read** before anyone treats it as calibration:
  `docs/acceptance/owner-queue/2026-08-26-taste-rubric.md`.

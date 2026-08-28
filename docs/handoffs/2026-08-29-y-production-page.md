# The playout dashboard gets smaller - the safe half

Branch `claude/production-page-extraction-a7a00d`. Executes the safe half of
`docs/backlog/production-page-extraction.md`: the read-only pieces of `ProductionPage.tsx` move
into their own files, nothing that decides what Take airs moves at all, and the risky remainder
gets a written phase plan.

Why it was worth a session: 2,968 lines, one export, 77 hooks, 66 commits in the month - the
highest-churn component in the repo IS the surface the 2026-09-12 production plays out from. Every
remaining student-release change was landing in the file where a mistake is least visible.

---

## What changed

**Three read-only pieces out, 2,968 -> 2,541 lines.**

1. **`home/ProductionLinks.tsx`** - the links popover, with `LinkRow` and `CasparAirRow`. A file
   move: all three were already props-only functions. **Byte-identical**, diffed against the
   pre-split file rather than eyeballed.
2. **`home/ActionLog.tsx`** - the wire-log readout, taking `entries: LogEntry[]`. Also verified
   byte-identical modulo the prop rename.
3. **`home/CueOverflowNote.tsx`** - the "too long to fit" line, plus `cueOverflowKeys()`: the pure
   program-or-preview choice the page still needs for the field marks. The one piece rewritten
   rather than moved.

**`docs/backlog/production-page-phases.md`** - the state map measured before anything moved (all
30 `useState` split into "owned by one surface" and "read by two or more", every writer named, and
why each of the 20 refs is a ref), then the five remaining phases in the report's safe order, each
session-sized with its own proof and the cue draft last.

Contracts updated: `src/components/home/AGENTS.md` (what came out, and what may never move),
`docs/backlog/production-page-extraction.md` (pointer + trend line).

## The surprise, recorded rather than pushed through

**`unpublish` calls `setLiveCue({})`.** The links panel looks completely self-contained - its five
state values (`linksOpen`, `busy`, `copied`, `nameDraft`, `nameNote`) are read nowhere else on the
page - but its handlers write the map Take reads. So the MARKUP moved and the STATE did not. That
is now phase 3, and it wants a spec written before it starts: **nothing today proves that
unpublishing a live production clears the on-air marker.**

## Two verification holes this session found (both fixed)

1. **`check:client-neutral` and `check:copy` scan TRACKED files only.** Both key their allowances
   by file path, so the two SPX target mentions and the five em-dashes in the links panel skipped
   their gates entirely while `ProductionLinks.tsx` was untracked - two green builds - and failed
   the moment it was committed. Allowances repointed at the new file. **A green build before the
   first commit of a new file does not mean these two gates ran on it.**
   Also: ProductionPage's em-dash count going 36 -> 31 was those five tells MOVING, not draining.
2. **`test:e2e:focus` drops the only spec that covers the overflow warning.** `cue-overflow` is
   asserted by `import-svg-behaviour.spec.ts` and `import-svg.spec.ts` and nothing else, and
   neither is in the focus subset - so the one piece written by hand was unproven by the run that
   looked green. Ran those two explicitly, then the full affected plan. `scripts/e2e-affected.mjs`
   now says so in the rule's own comment, and `caspar-connect.spec.ts` is selected by
   `ProductionLinks.tsx` as well as `ProductionPage.tsx` - `CasparAirRow` lives there now, and
   without that row a change to the ONE button would have run everything except its own spec.

## Verification

- `npm run build` green on the integrated sha.
- `npm run test:e2e:focus:queued` - 163 passed (3.9m).
- `e2e/import-svg-behaviour.spec.ts`, `e2e/import-svg.spec.ts`, `e2e/caspar-connect.spec.ts`
  explicitly, to close hole 2 above.
- `npm run test:e2e:affected:queued` - the full plan, since focus was demonstrably too narrow here.
- `npm run test:e2e-affected` - 17 passed, the mapping's own unit tests.
- Looked at, not just gated: installed the Uutishuone pack, took a cue with SPACE (ON AIR on L10,
  PROGRAM header follows, verb bar flips to TAKE OFF, editor head switches to the on-air cue),
  opened Activity and read the three rows in the extracted component, and typed into a field to
  see the unsent note and its dot. The overflow warning could not be provoked on that pack - those
  graphics' fit ladders genuinely absorb 92 characters - which is why the imported-SVG specs are
  the proof for it.
- Owner-queue item: `docs/acceptance/owner-queue/2026-08-29-production-page-nothing-changed.md`.
  The deliverable is that nothing visibly changed, so the route is "open a production and look".

## What is next, and what is not

**Next is phase 1** (the cue rundown) from the phases doc, in daylight. Every phase from here moves
state that decides what goes on air; none of them is night work.

**Not this branch, recorded in the phases doc:**
- `HostedControlPage` renders the same activity log character for character apart from its testid
  prefix. One `ActionLog` with a `testIdPrefix` serves both - and its home is then
  `components/ActionLog.tsx`, one directory up. Left alone because it edits the other operator
  surface.
- `HostedControlPage` also duplicates the overflow derivation. Its shared home is `src/control/`,
  which this session's scope excluded.
- The dashboard's CSS is another 1,314 lines in `src/styles.css`; `split-styles-css` is the
  cheaper branch for it.

## Safe to archive?

Yes, once this branch has landed through the queue. Everything this session learned is in the
phases doc, the two `scripts/` comments and this file; nothing is only in the conversation.

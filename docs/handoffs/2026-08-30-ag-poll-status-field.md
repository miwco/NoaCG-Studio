# The vote board's open/closed status is its own field

**Session AG.** Branch `claude/ag-poll-status-field`, off `main` at `a02bc0bb` (which already
carried `af-ograf-state-gap`, the design this fix implements).

## What was wrong, and that it was reproduced first

`pollBehaviour.ts` decided whether the VOTE NOW badge was up with `/voting\s+closed/i` over the
**Vote count** field - the human-facing, localisable sentence the production dashboard writes into
the designer's own total layer (`"4 votes · voting open"`). One string doing two jobs.

Reproduced before touching product code, at `origin/main`, by driving the real walk in
`e2e/import-svg-behaviour.spec.ts`: stage a round, take the cue, then fill the count line with
`4 ääntä · äänestys suljettu` and assert the badge comes down. It did not -
`#p-open` stayed `imported-design-pstate imported-design-pon` through 17 polls. That is the
silent on-air failure, in the graphic built for the September production.

## The fix

A fourth wire field, **`Vote status`**, appended after `Vote count`:

- a hidden `noacg-data-source` holder (never `style="display:none"` - the entrance reset clears
  inline props and the raw value airs; root `AGENTS.md` was corrected to say so this morning and
  `e2e/catalog-baseline.spec.ts` gates it);
- an SPX `dropdown` with three items, so the value is picked rather than typed and the OGraf export
  turns it into a schema `enum`;
- vocabulary `open` / `closed`, **empty meaning "not stated"**.

`pollVotingClosed()` reads that field. `tallyValues` writes **both** halves - the sentence into
`Vote count`, because the designer's total layer wants it, and the token into `Vote status`,
because the runtime obeys it. `pollFieldMap` finds the new field by title, importing the title
constant from the module that owns it rather than spelling it a fourth time.

**Not a regex swapped for a better regex**: the count line is no longer consulted at all unless the
status field is empty.

## Migration: ADDITIVE, no version bump - and why that is by construction

Root `AGENTS.md`: *"additive optional fields never bump the version; a breaking change bumps it and
migrates ON READ."* This is the additive case, and three independent things make it so:

1. **The field is appended LAST.** A behaviour's fields compile after the artwork's, and
   `fieldIdFor` resolves a control's payload key by INDEX, so a field at the end moves no existing
   `fN`. Anything inserted before `footnote` would have moved one.
2. **Code is the document.** A saved board carries its own emitted `js`; it is not regenerated, so
   an existing board keeps the exact runtime it was saved with.
3. **The fallback.** A board that DOES get the new code but whose controller only ever writes the
   count line - an older habit, a hand-typed rehearsal, a foreign controller - reads an empty
   status and falls through to the old sentence match. A board that suddenly ignored its own status
   line would be a worse failure than the one being fixed.

Nothing in `NOACG_ANIM` changed; the machine is untouched. **The status is data the runtime reads,
not a new edge** - data updates still never cause transitions.

## Also done

- **The two stale emitted comments** the design round left alone (they are template bytes, so
  correcting them moves every imported-poll template): both said a graphic's action returns *no
  `result` payload*. It is **undeclared**, not dropped - the reference server forwards it as vendor
  pass-through (`docs/OGRAF_STATE_IN_FIELDS.md` §1a, `ebu/ograf` issue 82). The `RenderTargetInfo`
  half was accurate and stands.
- **A non-empty token we do not recognise reads as CLOSED**, not as a fallback to the sentence.
  Falling back would answer a controller's own word for "closed" with a pattern match on English
  display copy - the same defect wearing a different hat. Closed is also the safe half of not
  knowing: a board wrongly showing VOTE NOW invites votes that will not count.
- `docs/backlog/poll-status-own-field.md` **deleted** (the shelf never holds a copy of live work).
  `docs/OGRAF_STATE_IN_FIELDS.md` §5a rewritten from "the one shipped deviation" to the fix, with
  the reproduction and the two shapes that generalise (append last; keep the old read as a
  fallback). `src/templates/importedDesign/AGENTS.md` names the fourth title.

## What is left, and it is deliberately left

**The CATALOG board (`src/templates/types/livePoll.ts`) still cannot be closed by data at all.**
It is *not* the same defect - its badge is a keyframe track on the machine's states, so it never
read a status back and never had one to get wrong. What it has is the plain version of the original
gap: `close` / `result` / `call` are machine-only, so a controller that cannot dispatch our events
cannot close a catalog vote. Giving it the same field means a runtime read that has to agree with
those keyframes, which is a slice of its own rather than a follow-on edit. Recorded in
`docs/backlog/behaviour-state-as-fields.md`, which already owned that question.

## Verification

- `npm run build` green on the final tree; branch stamp `claude/ag-poll-status-field`, so it gated
  this branch and not `main`.
- `npm run test:e2e:focus:queued` - 35 passed, catalog gate passed.
- `import-svg-behaviour.spec.ts` in full - 6 passed. The poll walk now pins both halves: a reworded
  count line does not move the badge (waiting on `#p-total` first, so the assertion cannot pass by
  the update never arriving), the token closes and reopens the vote, and an unstated status still
  closes from the old sentence.
- `/code-review` at **high**. Five findings, all addressed: the no-op assertion (fixed as above),
  the stale per-area `AGENTS.md`, the stale module header, the unrecognised-token fallback, and the
  missing owner-queue item. The **simplify** leg fans out and cannot run in this session; done
  inline instead - the one duplication found was the three dropdown choices written twice in two
  shapes, now one `POLL_STATUS_CHOICES` const mapped into both.
- CI read after push - see below.

## Owner queue

`docs/acceptance/owner-queue/2026-08-30-poll-status-own-field.md` - the one-minute route to seeing
a closed vote stay closed, and the one thing worth an opinion: whether *"Not stated (follow the
count line)"* is the right wording for a default an operator has never seen.

# The poll's open/closed status is a regex over a human-facing display string

**Filed:** 2026-08-30. **Source:** writing `docs/OGRAF_STATE_IN_FIELDS.md` (§5a) - the design's own
rule R7 caught a deviation in the behaviour that had landed hours earlier.

## Why

The imported vote board carries its open/closed status **inside** the `Vote count` field, and reads
it back with `/voting\s+closed/i` (`src/templates/importedDesign/pollBehaviour.ts`,
`pollVotingClosed`). The string on the other end of that regex is written by
`ProductionAudienceWorkspace.tallyValues` as `"4 votes · voting open"` / `"· voting closed"`, and
the SAME string is written into the designer's own total layer - so it is a **human-facing,
localisable display value doing double duty as a machine-readable status token.**

The mechanism is right and it is the whole point of the design: a field crosses every boundary, so
a controller that cannot dispatch a NoaCG event can still stop the board saying VOTE NOW by sending
data. The **carrier** is the problem. A station that writes `"4 ääntä · äänestys suljettu"`, or an
operator who types the count line by hand while rehearsing, gets a board showing VOTE NOW through a
closed vote - and nothing anywhere reports the fault, because both halves are behaving exactly as
written. It fails silently, on air, in the one state the graphic exists to get right.

It also blocks the honest version of the field: a status that is its own property can be declared in
the OGraf `schema` as what it is, and a foreign generated form offers it as a small set of choices
rather than asking an operator to get the punctuation of a sentence right.

This is a defect-shaped follow-up on landed work rather than a new idea, which is why it is small
and why it should not wait long.

## What it would take

- A fourth field on the imported poll - hidden, input-only, a stable token vocabulary
  (`open` / `closed`, with empty meaning "not stated"), never drawn. `pollVotingClosed()` reads
  that instead of parsing the count line.
- `tallyValues` writes both: the human line into `Vote count` as today (it is a display value and
  the designer's total layer wants it), and the token into the new field.
- **No migration, if the field is APPENDED LAST - and that is the reason to append it last.**
  `importedPollType` spreads the artwork's fields first and the wire's three after, so a fourth wire
  field at the end moves no existing index at all; `fieldIdFor` resolves a control's payload key by
  index, so anything inserted BEFORE `footnote` would move one. Append-last is index-safe by
  construction rather than by luck, which is why it is the shape to take. (A saved board still has
  three holders and no fourth: the runtime must read a missing field as "not stated" and fall
  through, which is the next bullet.)
- Keep the regex as a fallback for one release so a board saved before the change still closes: a
  board that suddenly ignores its own status line is a worse failure than the one being fixed.
- **Correct the emitted comment while you are in there.** `pollBehaviourJs` emits a block above
  `pollVotingClosed` saying *"a graphic's custom action returns no result payload and the render
  target reports no instance state"*, and the source comment at the head of the module says the
  Server API returns *"no `result` payload"*. Both are the overstatement corrected on 2026-08-30:
  the field is **undeclared**, not dropped (`docs/OGRAF_STATE_IN_FIELDS.md` §1a). The
  RenderTargetInfo half is accurate and stays. Left alone in the design round on purpose - the
  emitted string is template bytes, so editing it moves every imported-poll template and belongs in
  a commit that is already touching them.
- The catalog `livePoll` board has the same question and should get the same answer, or the two
  diverge on the one fact both are judged on.

Half a day including the migration decision; the E2E case (`voting closed` reaches the badge through
the field, not the sentence) is the part worth insisting on.

## Evidence

`docs/OGRAF_STATE_IN_FIELDS.md` §5a (the rule and the named deviation), §4b (why the read-back is
the mechanism and must not change).
`src/templates/importedDesign/pollBehaviour.ts` - `pollVotingClosed`, and the comment block above
`pollBehaviourFields` that documents the overloading deliberately.
`src/components/home/ProductionAudienceWorkspace.tsx` - `tallyValues` / `pollFieldMap`, the writer
and the field-title join.

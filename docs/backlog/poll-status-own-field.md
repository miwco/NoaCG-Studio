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
- **A migration, because the field list is a persisted shape.** An existing bound board has three
  wire fields; adding a fourth moves every artwork field's index, and `fieldIdFor` resolves a
  control's payload key by index (`importedPollType`). Normalize on read per the root AGENTS.md
  versioning doctrine, or append the new field last so no existing index moves - the second is
  probably right and is the cheaper half of the decision.
- Keep the regex as a fallback for one release so a board saved before the change still closes: a
  board that suddenly ignores its own status line is a worse failure than the one being fixed.
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

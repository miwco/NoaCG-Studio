# A closed vote stays closed, whatever language the count line is in

**Filed:** 2026-08-30. **Branch:** `claude/ag-poll-status-field`.

## What changed

An imported vote board used to decide whether the VOTE NOW badge was up by pattern-matching the
words "voting closed" out of the **Vote count** line - a sentence written for a person to read, on
the designer's own total layer. Reword it or write it in Finnish and the board kept saying VOTE NOW
right through a closed vote, silently, on air.

The board now carries a fourth operator field, **Vote status**, and the badge obeys that. The count
line is display copy again and nothing reads its wording.

## The route, under a minute

1. `/app` -> **Import graphic**, drop `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg`
   (any vote artwork with a badge works) -> **Create project** -> add it to a production.
2. Select the cue and press **Take**. The VOTE NOW badge is up on Program.
3. In the cue's fields, type nonsense or another language into **F3 · Vote count** -
   `4 ääntä · äänestys suljettu` is the one that used to break it - and press **Update**.
   **The badge stays up.** The line changes on the board; nothing else does.
4. Set **F4 · Vote status** to *Voting closed* and press **Update**. **The badge goes.**
   Set it back to *Voting open* and it comes back - a data close follows the data.
5. Set **F4** back to *Not stated (follow the count line)* and put `4 votes · voting closed` in F3.
   **The badge goes.** That is the fallback a board saved before this change relies on.

## What to look at

The new field is a plain dropdown in the cue editor and in an exported control panel, sitting last
after Vote count. Three choices, no free text. The question worth your eye is whether
*"Not stated (follow the count line)"* reads as an obvious default to an operator who has never
seen this field, or whether it needs different words.

The audience workspace writes both halves automatically, so an operator running a real round never
touches either field - staging a tally fills them. Steps 3-5 above are the rehearsal road.

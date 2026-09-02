---
kind: walk
date: 2026-08-30
---
# Live percentages are a checkbox, and a round that does not fit the board says so

**Filed:** 2026-08-30. **Branch:** `claude/e-poll-live-update`.

## What changed

**1. Your ruling on live percentages is built.** *"Usually people will use it just to show the
results, so the poll does not have to automatically update. However, we should give that
possibility to those who want it."* So the shipped behaviour is unchanged - the figures wait for
Show result - and a production that wants them running ticks one checkbox in the audience
workspace. It rides to the board as a fifth field, `Live figures`, appended after the existing
four so nothing already saved or exported renumbers.

**2. A round with more options than the board has rows no longer lies.** A student draws three
rows, the show runs a five-option round: the board used to paint three near-identical bars, each
a true 7.7% of a vote that was actually a 69% landslide for an option that was never drawn - and
**Call the winner marked nothing and said nothing**. It read as a three-way dead heat. Now the
winner is never called on a row that was not drawn, and the operator is warned before the Take.

## The route, about two minutes

1. `/app` -> **Import graphic**, drop `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg`
   -> through the wizard -> add it to a production.
2. Select the cue, press **Take**. The board is on Program with the VOTE NOW badge up.
3. Type into **F2 · Options**: `Keep the crest | 2`, `New crest | 1`, `Put it to members | 1`
   (one per line). Set **F4 · Vote status** to *Voting open*. **Update**.
   The bars move. **The percentage figures are dark** - that is the default.
4. Set **F5 · Live figures** to *Update live while voting*. **Update**.
   **The figures come up, and the vote is still open** - the badge is still there. Set it back to
   *Wait for Show result* and they go dark again.
5. Now the overflow. Put **five** lines in F2, with the last one winning:
   `Keep the crest | 1`, `New crest | 1`, `Put it to members | 1`, `Ask the committee | 1`,
   `Abolish the crest | 9`. **Update**.
   - A warning appears above the cue's fields: **"Options is too long for the design - shorten
     it"**, and F2 is flagged.
   - Every figure on the board reads **7.7%**, which is true - each is that row's share of all 13
     votes - and the three bars visibly fail to fill the board.
   - Press **Call the winner**: **nothing is marked**, because the winner is not on this board.
6. Put three lines back with the third winning. The warning clears and row 3 gets its mark.

The real road is the audience workspace (the third tab of the production): the checkbox is at the
bottom of the round panel, and staging a tally fills all five fields automatically. Steps 3-6 are
the rehearsal version, which is faster to walk.

## What to look at, and the two things worth an opinion

- **The checkbox wording.** *"Update the percentages on air while voting"*, with a line underneath
  that changes to say what will happen. Off is the default and it is a property of the whole
  production, not of one round.
- **Whether "report" is the right answer to a round that overflows.** The other two honest options
  were refusing the round outright, and collapsing the leftovers into the last drawn row as an
  "Other" bucket. I chose reporting: dropping a round in the middle of a broadcast is worse than
  airing the rows that fit and naming what did not, and relabelling a row the designer drew is
  putting words on their artwork. If you would rather the board refuse, that is a different build
  and worth saying now.
- **One thing is deliberately not built and you should know it.** Ticking the box does not make
  the numbers move on air by themselves while votes land - the operator still stages and takes or
  updates the cue, exactly as before. Making an on-air board follow a running tally with no
  operator press is a change to the rule that nothing from the audience reaches Program without
  one, and that is your call rather than mine. Say the word and it is a small piece of work.

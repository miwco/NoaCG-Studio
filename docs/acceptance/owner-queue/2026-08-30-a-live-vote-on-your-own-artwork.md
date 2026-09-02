---
kind: walk
date: 2026-08-30
---
# A LIVE AUDIENCE VOTE, on a poll board you drew yourself

You said you need a poll for a real show this autumn. Until now a poll only worked on a board WE
drew: the audience plane has been counting votes since Phase 6, and there was nowhere on somebody
else's artwork to put the counts. That join now exists.

**Route (about 10 minutes):**
1. `/app` -> New graphic -> **Import graphic**, and drop a vote board. Either draw one, or use
   `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg` (a wide band: a question, three option
   rows, a full-length bar per row, a percentage each, a VOTE NOW badge, three hidden winner
   arrows).
2. On the **Fields** step open **What it does**. It should already say "a live vote: open, close,
   result" with every picker filled from the layer names. Change one and change it back, so you
   can see the pickers are the road and the names are only a shortcut.
3. Finish into a NEW production. On the production page the cue's buttons are **Close voting**,
   **Show result**, **Call the winner**.
4. Open the production's **Audience** tab, type a question and three options, **Open the vote**,
   then press **Simulate votes** twice, then **Stage the counts**.
5. Back on the rundown, select the `Vote — …` cue and **Take** it. Then press Close voting, Show
   result, Call the winner.

**What to look at:**
- **The bars.** They move on the DATA, not on a button: the counts land and the bars travel to
  their shares. Whether that reads right on air, and whether the timing (0.9s, staggered 0.12s,
  the catalog vote board's own numbers) is what you want on a graphic somebody else designed.
- **The figures wait for Show result.** That matches the catalog board, and it is a one-line
  change if you want the percentages running live while the vote is open. This is the decision
  I would most like your answer on.
- **The Fields step's vote section.** Whether a student reads "Bar", "Figure", "Winner" and knows
  which of their layers each one means, with no training.
- **The layers the vote takes over.** Picking a layer as the question, an option or a figure stops
  it being a field the operator types into, and the step says so. Whether that sentence lands.

**What is NOT done, so you are not surprised:**
- The hosted road is not walked. This is offline end to end; the real `/output` renderer following
  a command log is the quiz pilot's walk repeated for the vote, and nobody has repeated it.
- One vote per graphic. A round with more options than the board has rows counts them all and
  shows what it drew.
- There is no "Open vote" button, deliberately: taking the cue IS opening the vote, and the
  catalog board's automatic 20-second window is filtered out here, because a real audience votes
  over minutes and an arrow nobody drew must not close the vote under the operator.

Reasoning and the third-behaviour finding: `docs/GRAPHIC_BEHAVIOUR_PLAN.md` section 12.

---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "how I can actually connect the percentages in the poll to real questions that I can give to the audience. A tutorial on how to do that would be nice, like a few sentences, and then it could be added to the docs. You could try it out until it works for sure"
---
# Connect a poll to a real audience, and write the few sentences that explain it

**Filed:** 2026-09-03, from the live-vote walk.

## Why

He imported a vote board, got a working live-vote behaviour, and then had no idea how to put a
question in front of an actual audience and watch the bars move. The audience plane already exists
(`docs/INTERACTIVE_PLAYOUT_PLAN.md` Phase 5, the `/join` page), so this is a proving and
documentation gap rather than a missing feature.

Note the instruction inside the ask: *"You could try it out until it works for sure."* The tutorial
is written by DOING the thing end to end, not by reading the code and describing it.

## What it would take

1. Run it: import a vote board, publish a production, open the join link as an audience member on a
   second device, vote, and watch the bars move on the output. Fix whatever stops that working.
2. Write it as a few sentences on `/docs`, in the voice he accepted on 2026-09-02.
3. Include the half nothing documents today: **how a designer makes an SVG the importer reads as a
   live vote.** Name the rows `Bar 1`, `Bar 2` and so on, with `Percent 1`, `Winner 1`, a
   `Question`, a `Total` and a `Badge` or `Vote now`; at least two rows must carry bars, and the
   row's number has to appear as a whole word. He asked this directly - *"How do you make it in
   Illustrator so it understands it's a livevote?"* - and no page answers it.

## Evidence

Owner walk, verbatim in `docs/acceptance/owner-queue/2026-08-30-a-live-vote-on-your-own-artwork.md`.
The detection is `proposeSvgBehaviour` in `src/components/wizard/draft.ts`; the audience plane is
`src/audience/`.

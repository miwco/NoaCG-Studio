---
v: 2
source: owner
kind: finding
raised: 2026-09-03
state: unstarted
found: "I tried to import many pictures at the same time, and of course, it doesn't work; it just gets one. I wonder how we should react if people try to import many pictures at the same time."
---
# Dropping several files on the import zone silently keeps one

**Filed:** 2026-09-03, from the practice-library walk.

## Why

He dropped several files on the import drop zone at once. One is imported and the rest are
discarded with nothing said. He raised it and explicitly did not rule on it:

> I wonder how we should react if people try to import many pictures at the same time. I don't
> have an answer to that right now; anyway, it's fine.

So this row exists to be answered from ordinary practice rather than escalated back to him
(`docs/acceptance/OWNER_QUEUE.md`, "A design default is NOT a taste question"). Silently keeping
one is the only answer that is definitely wrong: the user's intent was visible and we ignored most
of it without a word.

## The plausible answers, cheapest first

1. **Say what happened.** Import the first and tell the user the others were not taken, naming
   them. One line, no new flow, and it stops the silence. This is the floor, not the goal.
2. **Refuse the drop and ask for one file**, which is honest but throws away work the user already
   did.
3. **Import them as separate graphics**, which is probably what someone dropping four boards
   actually wants, and which the wizard is not currently shaped to do - the walk is one design
   from Start to Finish.

Whoever takes this should check what comparable design tools do on a multi-file drop before
choosing, and write the reason in the commit. A picture used as a FIELD inside one design is a
different case from four separate graphics, and the answer may differ between them.

## Evidence

Owner walk, verbatim above. The drop zone is `src/components/wizard/steps/ImportDesignStep.tsx`;
its accept list is `image/*,.svg,.html,.htm,.zip`.

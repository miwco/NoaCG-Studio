---
v: 1
source: measurement
raised: 2026-09-04
state: unstarted
---
# A value written while an imported board is out of sight is lost, not just unfitted

**Filed:** 2026-09-04 by row C (`claude/c-fit-recompute-order`), which found it while gating the
fit against a graphic that loaded hidden and could not explain it in the time it had. It is
recorded with its numbers rather than left in a session's scrollback, and it is NOT gated - a red
spec is not a finding, it is a broken build.

## What was measured

One composed document of `illustrator-owner-quiz-board-rotated`, mounted in an iframe that is on
screen, so the fit ladder measures it properly. Then:

1. the iframe's wrapper is set to `display: none`;
2. `update()` is called with a long question;
3. the wrapper is shown again;
4. the question is read.

Read straight after step 2, while the board is still hidden, `#f0.textContent` IS the long
question - so the write landed. Read after step 3, the node holds the document's ORIGINAL text
again, painted as the block it was drawn as: one line, 736.8 units wide, against the 796.1 on
three lines the same document gives when it never left the screen. `svgFitOwed` reads all-false at
that point, so the ladder did run after the reveal and fitted every line - it fitted the wrong
value.

The iframe is not reloading: the window identity is the same object before the hide, after the
hidden update and after the reveal, and the trace above is taken through it.

## Why it matters, and why it is not the row C defect

Row C fixed the ladder recording a measurement nobody could take, which is what made a board that
LOADED out of sight paint its question across the artwork. That fix is landed and gated. This is a
different failure on the same surface: the value itself does not survive the round trip, so no
amount of correct fitting would show the right words.

Whether it is reachable through the product is the first question. `update()` was called directly
on the document here, and the real surfaces post a message
(`preview/previewProtocol.ts`) - the queue may simply not be drained while the document is not
rendered, in which case this is an artifact of the harness and the finding is that the harness was
wrong. `.pd-main.pd-offstage { display: none; }` is a real `display:none` on a real control page,
so it is worth an hour before it is dismissed.

## Where to start

- The reversion has to be a restore path: `measureSvgBudgets` and `measureSvgRoom` both swap the
  DRAWN value in to measure the design and put the live one back afterwards
  (`src/templates/importedDesign/svg.ts`). One of those restores appears to be writing the drawn
  value rather than the live one for this node.
- The instrument is in row C's own gate: `fitBothWays` in `e2e/import-svg-corpus.spec.ts`, which
  already mounts one document twice. A third mode that hides, updates and reveals is four lines,
  and it fails immediately.

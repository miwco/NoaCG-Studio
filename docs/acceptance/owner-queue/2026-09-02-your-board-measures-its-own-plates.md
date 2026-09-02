---
kind: walk
date: 2026-09-02
---
# Your quiz board now measures its plates where they are painted

From your 2026-09-02 walk. You drew a board whose plates are all on an angle, and the import was
reading each plate's size from its attributes without its rotation - so the question's plate, a
1238 x 259 band on screen, was inventoried as the 231 x 1233 portrait rectangle it was before being
turned. Everything built on that list ran on rectangles that are not where your shapes are.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` (your board, now in the corpus)
-> **Next** -> scroll to **When the text is too long**.

**What to look at:**

1. **Which shape gets wider** now offers `q bg - 1238 x 259` and picks it. It used to print
   `q bg - 231 x 1233` and pick `a2 bg`, an answer plate, dragging two of the four answers with it.
2. Type a long question into the question row's **Text** box. It stays at the size you drew it and
   wraps onto a second line, instead of shrinking to 62 percent on one line.
3. All four answers now move down together as the question's plate grows, rather than two of them
   moving. **That the answers move at all is the part still to fix** - your plate is 259 px tall
   and a two-line question fits inside it without growing anything. That is D3 in
   `docs/TEXT_BOX_BINDING.md`, and it needs the vertical alignment model first.

**Also worth a look, because it is a judgement rather than a fix:** the expectation sidecar beside
your board (`illustrator-owner-quiz-board-rotated.expect.json`) claims `grow-y` for a quiz board,
per your ruling that the horizontal stays fixed. The importer currently proposes `grow-xy`. That
disagreement is deliberate and recorded, not an oversight.

**One thing I did to your files:** you had left `quizbgchess2.svg` in
`e2e/fixtures/svg-corpus/home-made/` in the MAIN checkout, which blocked every landing on this
machine (the queue needs that checkout clean). The same bytes are now three places - committed in
the corpus under the name above, and archived at
`C:\claude\noacg-archive\owner-artwork\quizbgchess2.svg` - all three verified identical by hash
before the loose folder was removed.

Branch `claude/walk-0c61a1`. Build green; 65 import-svg specs pass plus a new one pinning the
rotated-plate case; catalog emit, render and overflow gates green.

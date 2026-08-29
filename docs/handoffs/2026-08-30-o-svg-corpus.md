# SVG import: the corpus, widened

**Branch:** `claude/o-svg-corpus-robustness` · **Owner item:**
`docs/acceptance/owner-queue/2026-08-29-svg-import-against-a-wider-corpus.md`

The ask was the owner's own satisfaction bar for the student release: *"I should actually test all
different kinds of SVGs before I can say I'm satisfied about the process."*

## What the corpus already covered, and what it did not

The inventory came out better than the task assumed. Six exporters were already represented
(Illustrator in three styling modes, Figma, Inkscape 1.3, Affinity 2.4, Sketch 100, CorelDRAW
2021) and most paint features had a file: gradients, masks, clip paths, patterns, SVG filters,
symbols and `<use>`, nested groups, text-on-path, flowed text, outlined type in both the
per-glyph and compound-path shapes, embedded rasters, negative viewBox origins, a missing
viewBox, a nested sub-artboard, a 3840-wide strip.

The real gaps were elsewhere, and twelve files now cover them. Corpus 22 → **34**.

| Fixture | The gap it closes |
|---|---|
| `illustrator-save-as-foreignobject` | Save As rather than Export As: an internal DTD whose entities are used as namespace URIs, a `<switch>` whose first branch is a foreignObject and whose second is the drawing, the trailing PGF blob |
| `effects-smil-animated-bug` | SMIL, which rule 5 promises to remove - `<animate>` inside the shapes it animates, `<animateTransform>` as a group's first child, and `<set>`, which is easy to miss because its name says nothing |
| `effects-css-import-webfont` | an `@import` and a `url(https://)` inside a `<style>` block - a network reach with no href anywhere |
| `geometry-unescaped-ampersand` | the REFUSAL road. The sidecar format has carried `"accepted": false` and `refusalAbout` since it was written and not one file had ever used them |
| `geometry-optimized-no-ids` | SVGO output: no ids, no groups, no whitespace, so a label has nothing to be read from |
| `affinity-point-sized-nameplate` | a print-unit page in points, so the millimetre fix cannot be a millimetre special case |
| `geometry-percent-viewport-strap` | `width="100%"` - present, parses as a number, means nothing |
| `figma-centred-title-card` | `text-anchor="middle"` as the whole composition, where every x is the middle of a line |
| `illustrator-rotated-sidebar-strip` | the first non-identity transforms: a quarter-turn matrix, and children inside a 70% group |
| `figma-duplicate-ids-scorebug` | repeated ids from a duplicated scoreboard half, with no `data-name` to fall back on |
| `inkscape-hidden-state-layers-quiz` | Inkscape's `style="display:none"` hidden layers, two of them carrying words - the corpus had only proved Illustrator's class rule |
| `illustrator-embedded-image-card` | a positioned embedded `<image>`: the CONTROL for finding 2 |

## What the measurement said

`34 fixtures — 23 pass, 11 partial, 0 fail.` Nothing crashed; nothing was refused that should
have imported. **Nine of the twelve new files were clean on their first walk**, which is the
headline worth keeping: the road holds on a much wider spread than it had been shown to.

The other three: one reproduced finding 3 in a second unit, one found a new defect, and one was
an expectation of MINE that was wrong.

## Fixed here, both reproduced first

- **Finding 3, print units.** `measureSvg` read the viewBox's user units as pixels, so Inkscape's
  default millimetre document - a full 1280 × 720 page written as `width="338.66666mm"` with the
  same number in the viewBox - imported at **339 × 191**. Now converted at 96dpi, but only when
  the viewBox extent MATCHES the stated number, which is what says the user unit IS the
  millimetre. A design drawn in a 1920 space and output at 10cm still reads 1920 × 1080, and a
  percentage is not a length. Both guards have fixtures.
- **Finding 6, the refusal sentence.** A file broken by one pasted ampersand was refused with
  *"damaged, or not an SVG at all"* while the browser's parser had already reported the line, the
  column and the reason and all of it was discarded. That message points at the export, so it
  sends a student back to re-make a file that was never the problem. It now quotes the location
  and names the `&`.

## Filed, not decided

**Finding 5 (the growth default) gained a fact rather than an answer**, and it is the one thing
in the owner item that needs him. It is **not a property of being a board**:
`inkscape-hidden-state-layers-quiz` is a five-answer quiz board and arrives on `shrink`;
`student-illustrator-quiz` is a five-answer quiz board and arrives on `grow-xy`. Whatever decides
it is geometry, not category - worth knowing before anyone answers finding 5 with a rule about
boards. Left to the owner, per the 2026-08-28 ruling that growing is right where the geometry is
unambiguous.

**Finding 2 now has a control and got smaller.** `illustrator-embedded-image-card` offers its
picture row, so the picture road is not broken - Figma's `<rect fill="url(#pattern)">`
indirection is what hides it. That is a much narrower fix than "pictures do not work", and the
working side is now pinned.

## Gates

- `npm run build` green on this branch (`[write-version] … -> claude/o-svg-corpus-robustness@…`).
- `npm run test:e2e:affected` green, **187 passed (2.9m)**, plus the catalog suite it escalated
  to on its own. **All twelve new corpus cases pass**, including both fixes proven through the
  real door, and the ladder gate walking all 34 sidecars (59.8s) - so every new growth
  expectation is right as stated, none needed excluding.
- `npm run catalog:affected` named the FULL catalog (svgImport.ts reads as shared machinery).
  Its cheap gate, `node scripts/check-catalog-emit.mjs`, is **PASS on all 504 designs** - and
  that is gate 1 of `catalog-baseline.spec.ts`, *every design emits byte-identical code*, which
  is the exact re-record trap that refused a landing twice. **Nothing moved**, because nothing
  here touches `templates/importedDesign/svg.ts`; the change is in `assets/svgImport.ts`, which
  only the import door calls. No `svg01` re-record is needed or included.
- Every new fixture parse-checked through Chrome's own DOMParser before any of it ran: 33
  well-formed, 1 deliberately broken.

## Traps worth knowing

- **`preview_start` serves the session's ORIGINAL checkout, not a worktree-isolated agent's
  worktree.** The task brief said this was fixed today; it is not fixed for this isolation mode.
  It cost real time here: the sweep ran happily, reported plausible numbers, and was driving
  main's importer the whole way - the print-unit fix appeared not to work when it simply was not
  loaded. `curl http://localhost:<port>/src/<file>` and grepping for something only your branch
  has is the five-second way to catch it. The raw-`npm run dev` guard then refuses the obvious
  workaround, so **a worktree session currently cannot produce an AFTER sweep at all**; the
  Playwright corpus spec can, because it starts its own server from the checkout it lives in.
- `scripts/svg-import-sweep.mjs` now takes **`--base`**, so it can at least be pointed at a
  server on another port. That was the previous session's blocker, recorded there as "a linked
  worktree cannot get one".
- The sweep writes `--json` and `--shots` output into the working tree and both were **not
  gitignored** - they went into a commit here before being pulled back out. Now ignored.
- An unescaped `&` really does make an SVG unopenable in every browser. It is worth knowing while
  writing fixtures, not only as a product finding: the first draft of `effects-css-import-webfont`
  was broken this way and the parse-check caught it before it ever ran.

## What is NOT done

- The **outlined-text** recovery road (finding 1) is untouched - the owner's standing ruling.
- The **Figma pattern picture** (finding 2) is filed with both sides of the pair now measured,
  and not built.
- **No AFTER sweep**, for the harness reason above. The corpus gate covers the columns that
  matter; the rest of the sweep's verdict is unchanged code.
- Nothing was checked on a **rotated field's box under an operator's typing** - the rotated strip
  imports, binds and exports clean, but no one has typed a long value into a quarter-turned line
  and looked at where the box went.
- `figma-nested-frames-quiz-board` is still named in finding 5's repro list and came out clean;
  left alone rather than churned on a measurement taken against the wrong build.

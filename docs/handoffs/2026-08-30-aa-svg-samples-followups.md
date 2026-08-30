# The placeholder pixel that was not transparent, and the sample library's loose ends

**Branch:** `claude/aa-svg-samples-followups` · **Files:** eight embedded pixels, one spec
expectation, three docs pages, three job-plumbing scripts

## The scope number

The previous session's phrase was "used everywhere". The number is **nine sites in nine files**,
and there is **no shared constant** - every one is its own copy-pasted literal, which is the whole
reason it spread and the reason no single fix existed before this one.

The audit was mechanical rather than by eye: every base64 PNG in the repository was extracted,
its IHDR and IDAT chunks parsed, the deflate stream inflated and the first pixel's bytes read.
**Twenty distinct blobs** across 26 files. The offender decodes to `rgba(255, 0, 0, 0.498)` -
1x1, RGBA, Sub filter - and was carried by:

| Site | What it paints | Was it visible |
|---|---|---|
| `docs/svg-samples/scorebug.svg` | the 54px home crest, beside a comment calling it transparent | yes - a red square overlapping the "HJK" glyph |
| `e2e/fixtures/svg-corpus/illustrator-embedded-image-card.svg` | a 160px guest photo | yes - a red block, the corpus's own control for the picture road |
| `e2e/fixtures/illustrator-lower-third.svg` | a 48px crest, the import spec's fixture | yes, small |
| `api/_lib/aiGenerate.test.ts` | payload-shape test bytes | never rendered |
| `e2e/ai.spec.ts`, `e2e/images.spec.ts`, `e2e/productions.spec.ts` | generic upload bytes | never rendered |
| `e2e/exports.spec.ts` | a logo pushed through every export target | rendered, colour never asserted |
| `e2e/import-svg.spec.ts` | not an image - a **regex** spelling out the red pixel's IDAT prefix | it is what would have failed |

All eight embeddings now carry the genuinely transparent pixel the newer samples already used
(1x1 RGBA, filter 0, `0,0,0,0`), and the ninth site - the expectation - now spells out that one.
Thirteen occurrences of one correct pixel where there were five correct and eight wrong.

**The expectation that encoded the red** is the interesting one. `import-svg.spec.ts` proves that
clearing a picture field restores the artwork the designer drew, and it asserted that by matching
the fixture's own base64 prefix. Fixing the fixture without fixing the regex would have turned a
correctness fix into a red suite; fixing the regex without understanding it would have been
guessing. It is now a prefix of the transparent pixel, with a comment saying which.

**Two neighbouring comments lied about colour** and were corrected in passing: `wizard-logo.spec.ts`
called an opaque red pixel orange, and `import-svg.spec.ts` named a green one `RED`.

**Deliberately not changed.** Six specs share a malformed 1x1 (a grayscale+alpha IHDR over an RGBA
IDAT - it does not decode at all). They are upload bytes for gates that key on extension and size,
they claim nothing about transparency, and nothing renders them. `figma-embedded-raster-card.svg`
draws a 2x2 orange on purpose, and `wizard-logo.spec.ts` an opaque red on purpose - both want to be
seen.

## Verified by looking, which is the point

The finding being fixed was made by eye and by no check, so the fix was confirmed the same way:
each affected file rendered over a checkerboard, before and after, and looked at. The 54px scorebug
crest **was** visible as a red square once you knew to look - the previous session's "nobody ever
saw it" is generous. The guest card's photo slot was unmistakable. Both are clean now, and
`info-card.svg`'s 580px slot - the one that exposed the bug - is still clean. The public docs page
was rendered over a real server too: styled, correct link, no console error.

`scripts/svg-samples-check.mjs` reproduces the recorded table exactly: 23 pass, 0 partial, 0 fail.

## The loose ends

- **`docs/SVG_AUTHORING.md`** described five samples in a hand-written table. It now sends the
  reader to the folder's own README and names only the three files worth opening first.
- **`docs.html`** linked the GitHub directory listing; it links the README, which says what each
  file teaches.
- **`docs/SVG_IMPORT_PLAN.md`** said "three ready-to-drop samples" - found in review, fixed the
  same way.

## What the review turned up, and what it says about the job plumbing

The previous session flagged that its own CI run went green with **every E2E shard skipped**,
because the affected-spec plan ignores everything under `docs/` - while three specs load files
straight out of `docs/svg-samples/`. This branch's first commit is exactly that hazard, so the
carve-out is here: `docs/svg-samples/**` maps to the three offline specs that load it, `quiz-board.svg`
is a configured trigger because the configured suite loads it too, and the rest of `docs/` - this
folder's own README included - stays ignored. A test pins both halves.

Reviewing that turned up one more of the same shape: **`svg-samples-check.mjs` and `docs-shots.mjs`
both launch Chromium and were in no family `SWEEP_SCRIPTS` names**, so neither was blocked by the
guard hook nor seen by the process detector. Both are listed now - and the guard proved it within
the hour, refusing to run `svg-samples-check` beside another session's live suite. That is the
`*spike*` hole of 2026-08-15 recurring: a browser-driving script whose name is in no family, and
which nobody thinks of as a test.

## Left undone

- **The optional harness head-to-head was dropped**, on the coordinator's instruction, with the
  core committed and green. The ground truth it would have been graded against is the scope table
  above, so the measurement is still cheap for whoever wants it: give a CLI the task "find every
  base64 PNG in this repository and report each one's true RGBA", and grade it against those twenty
  blobs and nine sites.
- **The six malformed grayscale-alpha pixels** are still there, described above. Replacing them is
  a one-line sed and would need a look at each spec's gate, since a couple of them may be exercising
  the "not a decodable image" path on purpose.
- The final CI verdict on the integrated sha was still running when this was written; the run is on
  `3e722a56`, and `npm run build` was green on that same sha.

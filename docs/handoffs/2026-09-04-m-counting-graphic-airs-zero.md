# 2026-09-04 - row M: a counting graphic airs a zero

Branch `claude/m-counting-graphic-airs-zero`, cut from `826fefba`. The brief was a walk report
that a Rising Total taken to Program reads `€0` and never counts, and an instruction to fix the
ORACLE first and watch it go red before touching the graphic.

**The zero did not reproduce. The oracle hole was real, and it was the whole row.**

## The reproduction, three ways, all negative

Reading the PROGRAM iframe's own DOM through Playwright rather than a screenshot of it - that
iframe carries no `allow-same-origin`, which is exactly what the walk could not get past.

1. **The Program bootstrap alone** - `composeDocument(tpl, { liveControl: true })` in a
   `sandbox="allow-scripts"` frame, driven `update` then `play` over postMessage, which is what
   `takeCueItems` sends and what `output/stage.ts` applies. Cold take, play-with-no-update, and a
   re-take.
2. **The production page** - a real graphic in a real production, the real ⟳ Take button.
3. **The literal walk route** - the wizard's Templates entry, Rising Total, Skip to finish, a new
   production, Add it and go there, Take, press nothing.

Every route: `0` while the panel rises, the count runs, `124,213` at 3 s and still `124,213` at
10 s. `data-target` reads `124,213` throughout and is never rewritten.

The walk's suspected mechanism cannot apply to the design it was reported on either. **ig05
"Rising Total" has no rebuild function at all** - it is not one of the four designs that import
`goalRuntimeJs`. Its figure is seeded by `infographicStat()` at build time, before any entrance
frame renders, so the rebuild-reads-its-own-zero story is about ig22, ig23, ig30 and ig31.

I cannot say what the walk saw. Three instrumented routes on the same commit say the graphic is
correct, so I did not change the runtime to fix a fault I could not observe - that is the second
wrong diagnosis this item was created to avoid.

## The oracle hole was real, and it is measured, not argued

`e2e/counting-settle.spec.ts` read both halves of every claim off the same live `data-target`:
the expected figure AND the reading compared with it. A take that rewrites a readout's target to
`"0"` therefore produces a count of 0 -> 0 that **lands on its target exactly**, and each sweep's
zero-figure exclusion then drops the row before any assertion sees it.

Injected the fault rather than reasoning about it - reversing `play()`'s two lines so the rebuild
reads the entrance's own opening zero:

| | ig22 | ig23 | ig30 | ig31 |
|---|---|---|---|---|
| `data-target` before the take | 124,213 | 8,420 | 18,400 | 6,840 |
| after the take | 0 | 0 | 0 | 0 |

- **The old gate: GREEN.** Its play-out pass passed with four graphics airing a zero. Its re-take
  pass went red only on a population count - `readouts an entrance counts: expected > 8, received
  8` - which names nothing about a wrong number on air.
- **The fixed gate: RED, on the fault, naming all four designs, in all three playback passes.**
- Reverted, and green again on the same run set.

## What changed

`e2e/counting-settle.spec.ts` only. No emitted template code moved -
`node scripts/check-catalog-emit.mjs` is PASS, so every generated graphic is byte-identical to
main.

- **The expected figure comes from the value the test typed into the field**, which nothing in the
  document can reach. `figure()` compares numerically, so a design that regroups `124213` into
  `124,213` or wears a currency mark still passes while `124,213 -> 0` cannot.
- **A take may not rewrite a readout's own figure.** The assertion the old file could not make.
- **The zero exclusion is decided on the typed value**, so a target already corrupted to `"0"`
  cannot exclude itself from the sweep.
- **Every scoped readout is reported**, with "does the entrance count this" riding along instead
  of deciding who gets in - a count of 0 -> 0 does not move, so the old filter dropped exactly the
  rows the file exists for.
- **A fourth pass: the COLD take** - a document played with no `update()` ever, which is what an
  exported overlay or an OBS browser source does, and the only order in which a readout's
  `data-target` genuinely starts absent. Field elements join the marked ones so it has something
  to judge.
- The pairing key is numbered among an element's own class rather than among the marked elements
  (the entrance stamps the mark on first play, so a set numbered off the mark renumbers across a
  take), the two playback sweeps share one definition of the key and the expected figure, and the
  played sweep reads its 45 frames off nodes captured once after the take.
- **The ordering invariant is now a rule** in `src/templates/infographics/AGENTS.md` ("THE CAPTURE
  RULE") and above `igRuntimeJs`, where someone would change it.

`docs/acceptance/owner-queue/2026-09-04-counting-gate-that-could-not-fail.md` corrects the record.

## What I deliberately did NOT do

- **I did not edit `docs/acceptance/owner-queue/2026-09-03-rising-total-plays-from-zero.md` or
  `docs/backlog/a-counting-graphic-airs-a-zero.md`.** Both are rewritten by
  `claude/d-queue-walks-itself`, which was still queued when this branch finished; two branches
  editing one file is the conflict the one-file-per-item rule exists to prevent. My correction is
  its own owner-queue item and names the ones it corrects.
- **I did not remove the `data-target` textContent fallback.** The backlog doc prefers seeding
  targets at composition time, and it is the right long-term shape - but it changes every emitted
  infographic and every poll design on a fault that does not reproduce. The gate now catches the
  fault; the hardening is a decision, not a fix.

## Next

1. **When `claude/d-queue-walks-itself` has landed**, mark
   `docs/backlog/a-counting-graphic-airs-a-zero.md` closed as not reproduced, pointing at my
   owner-queue item, and drop the "This item stays OPEN" line the walk appended to the Rising
   Total acceptance item. Both files are that branch's; neither is touched here.
2. **Decide the hardening**: seed `data-target` at composition time from the field value and
   delete the `textContent` fallback in `dataRuntimes.ts`, `igMotion.ts` and `pollMotion.ts`. That
   removes the class instead of defending it. It is a catalog-wide emitted-code change and needs
   its own baseline re-record.
3. If a counting graphic ever airs a zero again, the gate now has something to say about it -
   start from its output, not from a screenshot.

## Verification

- `npm run build` - green, stamped `claude/m-counting-graphic-airs-zero@2179f1aa` and again after
  the review fixes.
- `node scripts/check-catalog-emit.mjs` - PASS, 504 designs, emitted code byte-identical to main.
- `npx playwright test counting-settle.spec.ts` - 5 passed clean (j-0469, j-0483); 3 failed on the
  injected fault (j-0451, j-0453, j-0476), which is the point of the row.
- `npm run test:e2e:affected` - 46 spec files including the catalog tripwire (j-0483).
- `npm run catalog:affected` named the five rendered sweeps because `shared.ts` is shared
  machinery. They were not run separately: `check:catalog-emit` proves the emitted code did not
  move, so the rendered catalog cannot have, and the tripwire ran inside the affected suite
  anyway. Stated rather than silently skipped.
- `check` - review: delegated (six findings, four fixed, two documented as limitations);
  simplify: inline (the skill returned fan-out instructions); taste: not applicable - no emitted
  code changed, `check:catalog-emit` PASS is the evidence.

Safe to archive once the branch has landed.

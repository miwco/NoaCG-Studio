# Brand-mark absorption, measured — 2026-08-09

**Spent nothing.** No model call, no token, no provider. Every number here comes from
`node scripts/ai-lite-brand-audit.mjs`, which renders the real catalog design through the real
assembler with a real mark in its slot, settles it, and reads the painted frame back. Raw
results: `brand-audit-2026-08-09-favourable.json`, `brand-audit-2026-08-09-adverse.json`,
`brand-audit-lite-chassis.json` — all regenerated AFTER the catalog work in §"What changed".

The brief, the thresholds and the mechanism decision this round supports are
`docs/AI_LITE_PLAN.md` §7. This file is the measurement, and then what the measurement bought.

**Read §1-§5 as the diagnosis and §6 as the repair.** The numbers in §1-§4 are what the catalog
looked like before any of it was fixed; they are kept verbatim because a defect that leaves the
list without a record is one nothing stops from coming back.

## 1. What was measured

13 logo-capable lower thirds (`TemplateVariant.logo !== 'none'`) x 5 mark shapes
(`scripts/ai-lite-brand-fixtures.mjs`): a 4:1 wordmark in dark ink, the same wordmark as a white
knockout, a 1:1 club crest with its own field, a 10:1 institution rail, and a portrait shield.
Each pair also renders the same chassis with the same palette and NO logo, so "the mark cost the
name a second line" is a comparison rather than a guess.

Two pairings, because one of them was not enough:

- **favourable** — each mark gets the package a sensible user would bring it (a knockout mark on
  a dark package, a dark-ink mark on a light one).
- **adverse** (`--palette sand`) — a brand whose ACCENT is pale. This exists because the first
  pass could not fail a knockout mark at all: nearly every catalog logo well is painted in the
  ACCENT, so a white mark on the "light package" was still landing on `paper`'s dark green.
  **The palette that fights a mark is decided by the surface the SLOT paints, not by the
  package's overall lightness** — which is itself a finding, and it invalidated the first run's
  clean contrast column.

## 2. The result (as found)

|  | favourable | adverse |
|---|---|---|
| pairs that absorbed the mark | **14 of 65** | **19 of 65** |
| chassis clean on every mark | **0 of 13** | **0 of 13** |

By mark shape (favourable pairing, out of 13 chassis):

| mark | clean | what happens |
|---|---|---|
| club crest, 1:1 | **10 / 13** | the shape every slot was actually drawn for |
| shield, portrait | 4 / 13 | fits, but its dark field fails to separate on 8 chassis |
| wordmark 4:1, dark ink | **0 / 13** | letterboxes to a 16–35px strip in a square well |
| wordmark 4:1, knockout | **0 / 13** | same geometry; contrast only differs |
| institution rail 10:1 | **0 / 13** | paints a **6–14px hairline** — the mark is a smear |

**No lower third in this catalog can carry a wordmark or a horizontal lockup at a legible size.**
The widest painted lockup measured anywhere in the run is 140px x 35px (`ls18`), and every other
chassis lands between 64 and 88px wide. That is the round's headline, and it is a CATALOG fact,
not a model one: the slots are near-squares between 52 and 140 design pixels on their long edge,
and `object-fit: contain` does exactly what it promises with a 10:1 source inside one.

Failures by cause:

| code | favourable | adverse | meaning |
|---|---|---|---|
| `below-min-size` | 33 | 33 | painted mark under 32px tall (crest-shaped) or 96px wide (lockup) |
| `ink-contrast` | 5 | **24** | a transparent mark's ink under 3:1 against the surface it composites onto |
| `cropped` | 9 | 9 | `object-fit: cover` cut the mark (`lt08`, `ls25`) |
| `field-separation` | 8 | 0 | a mark carrying its own field under 1.5:1 against the surface |
| `clear-space` | 8 | 8 | a neighbour closer than a quarter of the mark's painted height |
| `collision` | 4 | 4 | a neighbour's box overlaps the mark's (`ls18`) |
| `house-accent-survives` | 0 | 0 | see the honesty note below |

Per chassis, clean pairs of the five marks — `favourable`/`adverse`, so `2/2` means two of five
under each pairing and `0/0` means the chassis never absorbed any mark:

```
lt07 2/2   lt08 1/1   lt23 2/2   lt29 2/2   lt36 1/2   lt41 0/0   lt47 1/2
lt49 1/2   lt53 1/2   lt54 1/2   ls10 2/2   ls18 0/0   ls25 0/0
```

## 3. Three defects worth naming individually

1. **The shared logo slot and `lt08` violate the platform's OWN as-is contract.**
   `src/ai/assetIntegrity.ts` rejects a design that puts `border-radius`, a crop or
   `object-fit: cover` on a picture the user marked "use it as it is" — a brand logo is exactly
   that. `templates/shared/logoSlot.ts`, the slot EVERY future `logo: 'optional'` design
   inherits with zero code, writes `border-radius: var(--panel-radius)`. `lt08` writes both a
   radius and `object-fit: cover`. The two contracts have never met because no path has yet sent
   a protected upload into a catalog logo slot. Fix the slots, not the screen.
2. **`ls25`'s slot is a picture well, not a mark well.** `object-fit: cover` with the comment
   "the right choice for a square cover" — correct for a portrait, wrong for a crest, and the
   variant declares `logo: 'optional'` so nothing distinguishes them. A logo slot and a photo
   slot are two capabilities wearing one name.
3. **`sb09` (scoreboard, `logo: 'built-in'`) paints nothing when handed a mark.** It draws TWO
   crest slots and reads neither `logoAssetPath` nor `logoEnabled`. Not a lower-third problem
   today; it is what "widen Lite to scoreboards" runs into on the first brief, and the audit
   reported it in one line without anybody looking.

## 4. Honesty about the instrument

A check that has never fired is not evidence. What this round can and cannot claim:

- **Fired with both a pass and a fail:** `below-min-size`, `cropped`, `clear-space`,
  `collision`, `ink-contrast`, `field-separation`, `no-slot-field` / `no-slot-element` (30 times,
  on the six audited Lite chassis — see below), `not-painted` (`sb09`).
- **`house-accent-survives` reports clean on all 65 pairs and that column is VACUOUS on this
  bank.** No lower third in the catalog hard-codes `#f6a623` (`grep` confirms; the literal-amber
  designs `docs/CATALOG_VARIETY.md` §5.1 names are scoreboards and holding screens). The check
  was mutation-proved instead: `--palette houseAmberProbe` makes it fire on `lt07` and `lt23`.
  It is carried for the widening, where it stops being vacuous.
- **Never fired at all:** `aspect-distorted` (nothing in the catalog sets `object-fit: fill` on a
  logo), `outside-box`, `outside-safe-area`, `logo-costs-text`. Treat those four as unproven
  wiring, not as clean results.

## 5. The finding that decides the mechanism

`node scripts/ai-lite-brand-audit.mjs --lite` — **all six audited NoaCG Lite chassis are
`logo: 'none'`. 30 of 30 pairs report `no-slot-field no-slot-element`.**

Lite cannot place a mark at all today, in any design, by any mechanism. So the first question is
not "can the model place a logo well" — no model choice reaches a slot that does not exist. It is
"which designs get a slot, and what shape of mark can a slot honestly hold". Both are measurable,
and this round measured them.

---

## 6. What changed, and what it bought

All of the following is catalog and metadata work. **Still nothing spent.**

### 6.1 The two as-is violations, fixed

`templates/shared/logoSlot.ts` no longer puts a `border-radius` on the mark, and `lt08` no longer
crops it (`object-fit: cover` -> `contain`, radius removed; the card keeps its own radius, the
mark keeps its own shape). `cropped` went from 9 failures to 0.

`ls25` now declares `imageSlot: 'picture'` (`model/wizard.ts`, additive optional, absent means
`mark`). Its slot is release artwork - square by nature, correctly cropped, titled "Cover
artwork" in the field list - and grading it as a mark well reported a defect that was a feature.
The audit excludes picture wells by default and NAMES them in the output rather than quietly
shrinking its own denominator.

### 6.2 The square well became a band

The shared slot was a 56px square, which is why every wordmark and every rail failed. It is now
sized by HEIGHT (64px) with the width left free and a 260px cap, so a mark takes exactly the room
its own shape needs and only something past ~4:1 letterboxes. It also reserves no empty width
when the mark is narrow, which is the trap `docs/DESIGN_LANGUAGE.md` §5 names.

Measured on the same five marks: **the wordmark paints 256x64, the crest 64x64, the shield 44x64,
and the 10:1 rail 260x26.** `below-min-size` on the Lite chassis: **33 failures -> 0.**

### 6.3 The six Lite chassis carry a brand slot

The lower-third TYPE declared `logo: 'none'`, and a compiled variant takes the TYPE's
capabilities - so flipping the six design files alone would have emitted a slot the wizard never
offers. `types/lowerThird.ts` declares `logo: 'optional'` now, the pattern `briefings.ts` and
`cards.ts` already use: the logo field is not in the type's declared field list, because an
optional slot only emits when the user turns it on, so the type is still the two lines it is.

**`--lite`: 0 of 30 pairs -> 21 of 30.** Per chassis, out of five marks:

```
lt11 4/5   lt02 4/5   lt25 4/5   lt32 4/5   lt15 4/5   lt05 1/5
```

Every remaining failure is TONE, except `lt05`. Five of the six now hold every mark shape
geometrically; `lt05` (Angle Slab) does not, and the reason is its own: its accent slab sits 11px
from the box content where the rule asks for a quarter of the mark's height (16px for a 64px
mark). That is the same air `lt05` gives its own text, so the mark is not being treated worse
than the type - but the threshold was not moved to make it pass. Moving a threshold to fit a
result is the scoring bug the Pro round's re-diagnosis names.

### 6.4 The metadata, measured and gated

`LiteCatalogEntry.logoSlot` (`src/ai/lite/contract.ts`) - the `supportingLineChars` contract
applied to logos: **measured, never authored**, and gated by
`node scripts/ai-lite-brand-audit.mjs --lite --check`.

It has two halves because they go stale differently. `fits` is GEOMETRY - which mark shapes land
at a legible size with their clear space intact - and no palette changes it. `surface` is TONE,
and it is one word because one word is all that is true:

| chassis | surface | fits |
|---|---|---|
| lt11 House Strap | `palette` | all five |
| lt15 Frost Strap | `palette` | all five |
| lt32 Scrim | `palette` | all five |
| lt02 Underline | `dark` | all five |
| lt25 Masthead | `dark` | all five |
| lt05 Angle Slab | `dark` | `banner-wide` only |

`palette` means the slot sits on the design's own panel, so the user's package decides whether a
dark-ink or a knockout mark reads. `dark` means the slot sits on the PICTURE: a panel-less design
is welded to a dark backdrop (`docs/CATALOG_VARIETY.md` §5.3), so **a brand that only owns a dark
version of its mark cannot use lt02, lt25 or lt05 at all.** That is a fact to tell the model, not
a defect to fix.

The gate was mutation-proved: declaring `lt05` as `surface: 'palette'` with `badge-square` added
to its `fits` produced exactly two problems and exit 1, with no false positives on the other five.
It also refuses to run the declaration half under `--marks` or `--palette` - measured on a subset
it called three chassis over-claiming for marks it had never rendered, and a gate that turns a
narrowed run into imaginary defects is worse than one that declines to answer.

### 6.5 One consequence in the bench

`repair-logo-not-supported` (`scripts/ai-lite-bench/suites.mjs`) expected `logo_not_supported`,
which no chassis can trigger now. It is kept as a regression pin with no expected errors, beside
the palette-clamp case that made the same move. The RULE stays in `validateLiteDecision`: it
guards the next chassis audited in without a slot, and deleting a rule because today's bank cannot
reach it is the mistake `zone` and `animation.presetId` record in `src/ai/AGENTS.md`.

### 6.6 What is still not done

- **`lt05`'s clear space.** One chassis, geometric, and its metadata says so honestly.
- **The four unproven checks** in §4 are still unproven.
- **No frame of any of this has been looked at by a human.** Every number here is geometry and
  luminance read off a render; §"decision 2" of the plan is explicit that machine-valid is not
  the bar, and a mark can pass all nine measurements and still sit in a place a designer would
  move. That is what the paid round's gallery is for.

Closed since: **`logoSlot` now reaches the model.** It rides the digest line that already said
`logo:yes`, and the request carries a measured `mark` descriptor (shape, backing, ink) so the
constraint is answerable - `docs/AI_LITE_PLAN.md` §7.5.

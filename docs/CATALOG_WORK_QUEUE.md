# The catalog work queue

What the catalog still owes, in the order it is worth doing, with the evidence under each item
rather than an opinion. Written 2026-08-21 at the end of the session that measured the storefront;
`docs/CATALOG_VARIETY.md` holds the measurements this file schedules.

**The standing rule for everything below.** Owner, 2026-08-21, asked whether a house design should
lead every category: *"Let's not keep the house designs first. No one wants to use a design that
other people also use. It's better to have a unique variety, and if we don't have a lot of graphics
that are unique and very good, then we are doing something wrong."* That is a product position, not
an ordering preference: **sameness is a defect, not a house style.** Judge catalog work against it.

---

## 1. LOWER THIRDS NEED REAL SHAPES — the one that is drawing work

**Ratified by the owner 2026-08-21: "lower thirds need real variety".**

The measurement (`node scripts/card-look-sweep.mjs lower-third`) says the ask is two problems and
only this one is a drawing problem:

- **99 of 103 lower thirds are `strap/thin`. 96%.** Only lt61 "Poster Slab", ls05 "Studio Pair",
  ls33 "Quote Strap" and ls39 "Fact Check" break it, and only as far as `strap/mid`.
- There is **no full-width band, no tall panel, no side column, no corner block, no full-frame
  name card**. The catalog has one silhouette for this category and dresses it 103 ways.

Colour is NOT the gap (see §2 — it was buried and is now surfaced). **Shape is.**

**What to draw** — each is a silhouette the category does not contain, not a re-skin:

| Shape | What it is | Why it is not what we have |
|---|---|---|
| Full-width band | edge-to-edge bar, name and role in one line | every current design is inset and content-sized |
| Tall panel | a portrait block at one side, name stacked | the category assumes a horizontal strap |
| Side column | a vertical rail up the frame edge, rotated or stacked type | `writing-mode` is used 0 times catalog-wide |
| Corner block | a square/rounded block in a frame corner | the corner is bug territory today; a NAME there is new |
| Full-frame card | the name owns the frame briefly, then clears | exists for versus/reveal, never for a person |
| Framed cut-out | the strap is a hole in a colour field, not a plate on one | inverts figure and ground; nothing does this |

**Do not** answer this with more dark slabs in new palettes. `card-look-sweep` reports the
footprint of anything drawn, so a new design's silhouette is checkable before review.

### PARTLY DONE 2026-08-23 — TWO of the six drawn, one attempted and CLOSED

Three were drawn; the owner kept two and rejected the third on sight.

- **lt63 "Broadsheet Band"** (full-width band) — KEPT. *"This is a unique look... definitely a new
  look, so let's keep it."*
- **lt64 "Portrait Column"** (tall panel) — KEPT. *"Very niche, but I don't see a problem with it,
  so we should have it if anyone wants it."*
- ~~lt65 "Edge Rail"~~ (side column) — **WITHDRAWN AND DELETED.** *"The text is vertical, so it's
  the wrong way... no one would turn their head to read the text."*

**THE SIDE COLUMN IS CLOSED AS A SHAPE, not just as a design** — do not redraw it. A lower third
is read in about three seconds while somebody is talking, so turned type fails at the only thing
the graphic exists to do. A vertical frame does not help (vertical is vertical at every aspect),
and setting the same narrow rail horizontally needs a much wider column, which is lt64. Full
reasoning and the retired design's own measurements: `src/templates/lowerThirds/AGENTS.md`.

**AN ABSENCE IS NOT AUTOMATICALLY A GAP, and this is what it cost to learn.** The side column was
on the brief because `card-look-sweep` reported one silhouette across 96% of the category and
`writing-mode` at zero uses catalog-wide. Both numbers were correct. Neither was evidence that the
missing shape was WANTED — the catalog lacked turned type because turned type does not work here.
An instrument can say a shape is absent; only a person can say it is missing. Ask what an absence
is evidence OF before scheduling work against it. (Same family as the withdrawn taste rule 5 in
`src/ai/AGENTS.md`: perfectly measured, and still asserting something nobody holds.)

Re-measured with the two that shipped (`node scripts/card-look-sweep.mjs lower-third`):

| footprint | before | after |
|---|---|---|
| `strap/thin` | 99 — **96%** | 99 — **94%** |
| `strap/mid` | 4 | 4 |
| `strap/tall` | — | **1** (lt64) |
| `full-width/thin` | — | **1** (lt63) |

**Two buckets exist that did not**, and the one-silhouette share moved 96% → 94%. That is the
honest size of two designs against a category of 105: the shapes are now REACHABLE, and the share
only falls as far as the count of designs carrying them.

### DONE 2026-08-28 — the two shapes worth drawing are drawn; the third is declined

- **lt66 "Top Corner"** (corner block) — a sport slab standing in the top-right corner, staged
  at 380px like lt64 and recorded beside it as a stage exception.
- **lt67 "Matte Window"** (framed cut-out) — a paper mat holding a window of live picture, the
  name inside the window, the caption printed on the mat below. The first design that is a hole
  in a colour field rather than a plate on the picture.
- **The full-frame card is DECLINED, not deferred**, on the owner's own rule quoted below: it
  overlaps the title-card compositions the catalog already has, and was named the likeliest
  variation when the round was scored. Do not redraw it without a new reason.

The same session retired SIX lower thirds as measured near-duplicates (lt10, lt21, lt23, lt29,
lt36, lt47 — the reasoning is in `src/templates/lowerThirds/index.ts`'s header and the commit),
and the catalog-wide ranking of what remains went to the owner queue on 2026-08-28 (that item has
since been walked or expired — owner-queue items are consumed, so re-run the sweep rather than
looking for it) — removals outside lower-third are the owner's call. The instrument is
`node scripts/card-pair-sweep.mjs [category|all]`, which ranks every same-category pair off the
rendered cards.

The owner's standing rule, kept here because it scored this round: *"if the remaining shapes
introduce genuinely useful composition options, continue; if they are mainly variations of what
is already covered, 93% is enough."*

Three things this round proved that the next one should not re-learn:

- **An accent has to be big enough to READ at card size.** lt63's rule at the editorial family's
  2px registered as *no accent colour at all* on the sweep — a 1:960 hairline across the frame.
  Weighted for the length it crosses, it moved into the azure bucket where it belongs.
- **A hue claim has to be checked against the sweep's own buckets, not against the eye.** The
  retired rail's Volt reads as chartreuse and lands in the bucket the sweep labels `amber` — the
  category's fourth largest. It was written up as adding a rare hue and did not.
- **A design's own sample is the one input guaranteed to flatter it.** Both new designs passed
  every catalog gate and both still had containment defects, because every gate renders the
  sample the designer chose. `e2e/catalog/long-value-containment.spec.ts` now drives a
  51-character name through the whole category and measures text against the safe area.

**Read first:** `docs/CATALOG_VARIETY.md` (what the catalog repeats), `docs/DESIGN_LANGUAGE.md`
(taste and motion), `src/templates/AGENTS.md` (the assembler contracts, the logo-slot rules, the
three baselines a new design moves).

---

## 2. THE FIRST PAGE — done, and what is left of it

**Built 2026-08-21** (`spreadFirstPage` in `src/templates/search.ts`). Browse fills the fold by
spreading accent hue, family breaking ties. Lower thirds went from 2 distinct hue buckets to 4+,
and from 10-dark/2-none to a page carrying a cream editorial card, a glass pill, a sport slab and
an outline box.

Left over:

- **The axis is DECLARED, not measured.** Accent hue predicted the rendered hue 72/72, which is
  why it is used. The palette's panel predicted the rendered backdrop only 60/80, so **backdrop is
  deliberately not an ordering axis**. If the storefront ever needs to spread on backdrop or
  footprint, those have to be MEASURED and shipped as a baseline (the pattern is
  `model/fonts.ts` `tabularFigures`: measured by a script, stored, never hand-declared).
- **Only accent + family are spread.** Footprint is not, because 96% of lower thirds share one —
  there is nothing to spread until §1 lands. **Re-run `card-look-sweep` after §1** and consider
  adding footprint as a third axis then.
- **Other categories are unmeasured.** `card-look-sweep` takes any category id. Frames & layouts
  scored the thinnest first page on the CSS instrument (6 looks of 12); nobody has looked at it.

---

## 3. `ig01` "Big Stat" is filed as a `stat-panel` and is a `kpi`

Owner, seeing the Statistics & data shelf: it *"does pop out… that's just one big number and not a
real list"*. The taxonomy already has the right home — `stats` carries a `kpi` subtype beside
`stat-panel` (`src/model/taxonomy.ts`).

One line in `src/templates/meta.ts`, plus the catalog baselines it moves. **Deliberately not done
in the session that found it**, because it was riding along with a re-order that turned out to be
the wrong fix, and it deserves its own decision rather than being smuggled in.

---

## 4. The instrument's blindness is recorded, not fixed

`scripts/catalog-sameness.mjs` scores designs on fourteen CSS decisions and called the
lower-thirds first page 11-distinct-of-12 while the owner called it all-the-same. **The owner was
right.** The caveat is written where the number prints, and `card-look-sweep.mjs` is the axis that
sees colour and shape.

Worth doing eventually: fold the card-look axes INTO `catalog-sameness` so there is one instrument
rather than two, and so the near-duplicate distance (`< 0.25` = near-duplicate, quoted in
`src/templates/AGENTS.md`) accounts for what an eye reads. **Not urgent** — two instruments that
each say what they measure beat one that quietly measures the wrong thing.

---

## 5. Standing catalog debts (not from this session)

Carried here so the queue is one list. Each has its own doc.

- **148 designs cannot take a light palette** — `docs/CATALOG_VARIETY.md` §5,
  `claude/noacg-sameness-orphans-investigation-4b750a`. Directly relevant to §1: a category that
  cannot go light cannot have a light design drawn for it.
- **151 of 493 designs are ORPHANS** no kit can offer — `docs/KIT_MATRIX_GAPS.md`. A kit-model
  question, not a drawing one.
- **Editorial and cinematic are BROWSE families, not KIT families** — filling either for kits is
  ~118 designs apiece (`src/templates/AGENTS.md`).
- **Per-design width tail after the footprint work** — `docs/FOOTPRINT_STABILITY.md`; 486 designs
  have never been looked at by a person.
- **The type floor** — `node scripts/type-floor.mjs`; growing a graphic spends its capacity.

---

## How to check any of this

```bash
node scripts/card-look-sweep.mjs <category> --json out.json   # backdrop / accent / footprint
node scripts/spike-shelf-look.mjs <out-dir>                   # the shelves, as the storefront draws them
node scripts/catalog-sameness.mjs                             # CSS decisions + the first-page section
```

All three need the dev server up on this checkout's port and are browser-driving work — use the
queued form (`node scripts/e2e-runs.mjs --wait && …`), one job per machine.

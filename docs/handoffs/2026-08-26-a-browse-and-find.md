# Handoff — Browse: find the template

**Branch:** `claude/browse-template-discovery-142aa1` (the session was briefed as
`claude/a-browse-and-find`; the worktree was already on this branch and it was left alone).
**Landed:** commit `9a557c37`, queued through `/queue-merge`.

Everything below is measured. The commands to re-measure are in it.

---

## The owner's words, kept whole

He tried to make a credit roll for his own programme and could not find one.

- *"when you write credit, there should be something related to credits, not reels and crawls"*
- *"I think the search is what people will use the most."*
- On the dropdown: credits is buried third inside *"timers, breaks, and credits"*.
- On the chip row: *"a third way of looking at things… I think those tabs might be unnecessary."*
- On the style labels: *"Bold & on-air, Sport & energetic… I get the AI slop feeling with those
  names… it makes me feel that it's AI-generated and not genuine."* And: *"We don't want any hype
  AI words here anywhere; it should just be simple and good."* Maybe a tag, not a prominent class.
- On the thumbnails: *"sport and energetic credits and thanks… just looks like a mess with a lot
  of graphics in the middle. I'm sure it doesn't look like that in reality."*
- The unlock: categories no longer bind the playout backend - **any graphic can have any field** -
  so a category now exists ONLY for finding.

---

## What was measured, before anything was changed

**The search ranking was never broken.** `browseTemplates({query: 'credit'})` returned exactly the
thirteen credits designs, in this order:

```
1. Credit Reel   2. Classic Roll   3. Column Roll   4. Pager   5. Crawl   6. Programme Roll
7. Thank You Wall  8. Donor Wall  9. Sponsor Board  10. Sponsor Crawl  …
```

No ticker, no crawl from another category. "reels and crawls" **are** the credits designs - that
is what they are called. The failure was in reading, not in ranking, and it had two halves:

1. **The card did not say what the graphic was.** The caption was the name plus the STYLE FAMILY,
   opposite it, in a per-family accent colour. "Credits & thanks" was in the dim block below.
2. **Three of the four visible thumbnails were wrong.** Diagnosed with side-by-side captures; see
   below.

Reproduce either at any time (dev server on this checkout's port):

```bash
npm run dev
```

then in the page console:

```js
const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
browseTemplates({ ...NO_BROWSE_FILTERS, query: 'credit' }).best.map(r => r.meta.name);
```

---

## The thumbnail diagnosis (the mechanical cause, with evidence)

Every credits design reported its graphic box as the **whole 1920×1080 canvas**, so
`frameGraphic` had no zoom to give and the card rendered the full frame at ~15%. That is a real
constraint but it was not the visible fault. The visible fault was the SETTLE RECIPE.

`src/preview/settleGraphic.ts` did: `update(data)` → `buildInTimeline().progress(1)` →
`update(data)`. The second `update()` is there because `progress(1, true)` suppresses GSAP
callbacks. But a design whose `update()` **re-renders its own DOM** throws the settled frame away
with the elements it was written on. `templates/endCredits/shared.ts` `rebuildCredits()` assigns
`track.innerHTML`, so every credits design did exactly that:

- **cr03 Pager** (`credits-pages`): every page came back at its CSS opacity, so all six sections
  drew on top of each other. Captured at 1920×1080 - it is a genuine pile of overlapping text.
  **This is the card the owner named.** He was right that it does not look like that on air.
- **cr06 Credit Reel** (`credits-loop`) and **cr08 Donor Wall**: the `#credits-track` element
  SURVIVES the rebuild (only its children are replaced), so it kept the travel transform GSAP had
  written while its content was swapped - parking the whole list off screen. **Blank card.**

**Fixed** by re-deriving the jump over whatever `update()` built: `update → jump → update → jump`.
It costs nothing on a design that does not rebuild (the builder measures the same DOM and writes
the same end values onto the same elements). Verified visually: Credit Reel and Donor Wall now
show full readable lists, Pager shows a clean single end block.

`src/preview/` is in the affected-map's `CORE`, so this escalates to the full suite in CI. 102
specs were run locally against it (catalog-baseline, end-credits, images, library, holding-pack,
wizard-preview, wizard-logo, wizard-kit, ux, flows, motion-presets) - all green. The catalog
RENDER baseline is unaffected by construction: `e2e/catalog-baseline.spec.ts` deliberately
measures the unplayed design and never calls this recipe.

---

## What shipped

1. **The card's hierarchy.** Caption = the name alone. The amber category line under it is the
   second thing read. The style family is a dim `.wz-style-tag` on the last line beside
   complexity, with the six per-family colour rules deleted from `styles.css`.
2. **Plain style labels.** `STYLE_FAMILY_LABELS` is Minimal / Editorial / Cinematic / Sport /
   Glass / NoaCG. `TemplateStep.tsx` had been printing exactly those six words in a private copy
   of the table; it now reads the shared one, so the rename removed a vocabulary instead of adding
   one. Only three e2e assertions were pinned to the old strings (`wizard-filters.spec.ts:98,
   298, 301`) - `prerender.test.mjs` injects its own fixture label and was untouched.
3. **A caption on every chip row.** `.wz-filter-lead`: "Inside &lt;shelf&gt;:" and "Style:".
4. **Aliases** for the end-of-programme vocabulary that reached nothing: crew, special thanks,
   end titles, supporters, closing credits, rolling credits. Deliberately NOT a bare `credits`
   alias - an alias CONSUMES its phrase, which would cost the design called Credit Reel its
   name-weight lead and flatten thirteen designs into catalog order.
5. **Card copy defects** found by dumping one card's summary per category: `"3 itemss"` (naive
   `+ 's'`), and the two field semantics that carried a slash - `Source / platform`,
   `Amount / total` - which came out as `"2 amount / totals"` inside a sentence. Both fixed.
6. **A spec**: `e2e/wizard-filters.spec.ts` → *"a search for 'credit' answers with credits, and
   every card says so"*. Pins the result set, that every card names the category, that the style
   tag is NOT in the caption, and that the six new alias phrases reach the shelf.

Docs: `TEMPLATE_TAXONOMY_PROPOSAL.md` §9 amended, §12.3 amended, §18's "the house family stays
labelled Bold & on-air" **reversed** with the owner's words as the evidence it said it lacked.
Contract: `src/components/wizard/AGENTS.md`, Browse section.

---

## Open: the ruling request (needs the owner)

**`docs/TEMPLATE_TAXONOMY_PROPOSAL.md` §19.** Nothing is built for it.

The three finding mechanisms are not three axes. Search is one. The type dropdown and the chip row
under it are ONE question in two levels - the chips are the selected shelf's member categories and
they vanish when the shelf is cleared. They read as parallel only because they are drawn with the
same pills as the STYLE row, which is a different facet, and neither was captioned. Tonight's
captions are the cheap half.

The open question is whether level two joins the dropdown:

- **Option A (recommended)** - one select, `<optgroup>` shelves with member categories as options
  under them, so "Credits & thanks · 13" is visible while scanning rather than hidden behind
  picking the right shelf. Chip row goes away; the style row is then the only chip row and cannot
  be misread. Cost: the control plus `chooseType` in `e2e/_browse.ts`.
- **Option B** - two selects side by side.
- **Option C** - keep tonight's captioned chips.

No taxonomy change and no re-categorization is implied by any of them.

---

## Left undone, with the reason

**The credits designs' NAMES.** *Classic Roll*, *Column Roll*, *Pager*, *Crawl*, *Credit Reel* is
literally what the owner read as "reels and crawls", and renaming them is the honest fix. It was
not done here on purpose:

- the name **slugs the public template page URL** (`scripts/prerender.mjs` `pageSlug`), so a
  rename retires a shipped, indexed URL and the redirect question has to be answered first;
- `e2e/end-credits.spec.ts`, `images.spec.ts`, `package.spec.ts` and `holding-pack.spec.ts` all
  reach designs by name;
- `docs/acceptance/owner-queue/2026-08-26-end-credits-one-field-role-and-names.md` routes the
  owner to "Classic Roll" by name and has not been walked yet - renaming tonight would break the
  route in an unwalked queue item.

It belongs to a session that owns the credits pack. Raised in §19's closing note.

**"Settled" is the wrong frame for a TRAVELLING graphic.** With the settle fix in, Classic Roll
and Pager show what their entrance genuinely ends on - a logo and a year, centred. Honest, and a
poor identity card. `e2e/catalog-baseline.spec.ts` already wrote down the general form of this:
*"a ticker marquee is an infinite GSAP repeat… there is no 'settled' state for it to reach"*. The
readable frame for a roll, a crawl or a reel is the START of its travel, not the end.

The fix plan, for whoever takes it:

- A picker card wants a **poster frame**, not the settled frame. The two coincide for a lower
  third and diverge for anything that travels.
- The cheapest honest version: let a design DECLARE its poster progress (a number the entrance is
  jumped to), defaulting to 1, and have the credits presets declare something like 0.15 - far
  enough in to be past the fade, not far enough to have scrolled away. It is a per-design
  declaration, so it degrades to today's behaviour everywhere it is absent.
- The alternative - detecting travel and picking a frame heuristically - was considered and is
  worse: it makes the card's look depend on a measurement, which is the class of flake
  `catalog-baseline.spec.ts` removed on purpose.
- Second, separate problem in the same area: `reportGraphicBox` measures `body > div`, which for a
  full-screen design is the whole canvas, so `frameGraphic` can never zoom onto the ink. A crawl's
  card is a hairline strip for exactly this reason. Fixing it means measuring the ink rather than
  the container, and it changes framing for every `coverage: 'full'` design - worth doing, worth
  doing on its own.

**`composeDocument.ts` was read, never edited** - another session owned it tonight. Nothing above
needs it: the settle fix is entirely inside `settleGraphic.ts`, whose source that file serializes.

---

## Files touched

```
src/model/taxonomy.ts                       labels, aliases, two semantic labels
src/components/wizard/steps/BrowseStep.tsx  card hierarchy, chip captions, plural fix
src/components/wizard/steps/TemplateStep.tsx  reads the shared label table
src/preview/settleGraphic.ts                the second jump
src/styles.css                              .wz-filter-lead; per-family colours deleted
e2e/wizard-filters.spec.ts                  new spec + 3 renamed assertions
docs/TEMPLATE_TAXONOMY_PROPOSAL.md          §9, §12.3, §18 amended; §19 added
src/components/wizard/AGENTS.md             Browse contract
docs/acceptance/owner-queue/2026-08-26-browse-search-for-credit.md
docs/acceptance/owner-queue/2026-08-26-style-labels-and-chip-rows.md
```

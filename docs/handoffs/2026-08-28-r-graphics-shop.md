# Handoff — the graphics shop: search, the type control, and what a kit contains

Branch `claude/graphics-shop-search-795d7c`. Everything below is measured; the commands to
re-measure are in it.

---

## Why this session existed

The owner, 2026-08-27: *"there's something making that difficult… I'm not that satisfied on how
I'm searching for graphics"*, and separately that choosing a kit is *"buying a pig in a bag"*.
This is the front door of the NOW goal — a student cannot play out a graphic they cannot find.

The first thing done was to MEASURE the journey rather than act on the complaint.

## The measurement, and the instruments that produce it

```bash
node scripts/spike-search-journey.mjs          # 58 student terms, EN + SV + FI, through the real engine
node scripts/spike-token-probe.mjs "big title" # one query at a time, with what it ignored
node scripts/spike-shop-shots.mjs 5256 <dir>   # the two routes, captured
```

All three drive a browser, so they go through the one-job-per-machine rule; they are named
`spike-*` so `SWEEP_SCRIPTS` already covers them.

**What the journey found on 2026-08-27**, over 507 browsable designs:

| finding | before |
|---|---|
| Nordic terms returning nothing | **38 of 40** |
| Swedish `paus` (a break) | 24 **scoreboards** — it prefix-matched the English "pause" |
| Finnish `logo` | 203 designs across four shelves |
| `big title` | **0**, while `title` returned 71 — token-AND, and no design is both |
| `my show name graphic` | 0, on the word "my" |
| the kit step | 33 checkbox labels, no pictures |

English was otherwise healthy: "lower third" 97, "credits" 13, "stinger" 18, "scoreboard" 34.

## What shipped

1. **Option A** (proposal §19, owner-ratified 2026-08-27). ONE graphic-type dropdown carrying
   both levels: shelves as `<optgroup>` headings, member categories as the options under them,
   every row with its count, an "All <shelf>" row per multi-member shelf. Values are
   `group:<id>` / `cat:<id>`. The member-category chip row is GONE, and the active-filter row
   shows one chip for the whole type answer.
2. **Swedish and Finnish alias tables** — `ALIASES_SV` / `ALIASES_FI` in `src/model/taxonomy.ts`,
   ~300 phrases, merged into the one `ALIASES` with keys folded through the newly exported
   `normalizeSearchText` (the same fold search runs over a query — that is what lets the tables
   be written in the spelling people type). Colliding keys UNION their targets.
   **After: zero dead terms.**
3. **A word nothing in the catalog carries is set aside, not fatal.** `catalogVocabulary()` in
   `src/templates/search.ts` answers reachability; unreachable tokens leave the AND and come back
   as `BrowseOutcome.ignored`, which the count line renders ("ignoring “my”").
4. **Kits show their contents.** Every row in `KitPicker` is a card with a settled `MiniPreview`
   of the real design plus its name and graphic type. Intersection-gated; `.wz-kit-thumb` is
   `pointer-events: none` so clicking the picture toggles the card.
5. **Category-vs-tag, decided** (§20.3): a category says what a graphic IS, a purpose says what
   it is FOR, and a purpose word fans across every form that serves it. Implemented in the alias
   table — `sponsor`, `partner`, `donate`, `donation`, `fundraiser`, `charity`, `follow us`,
   `subscribe`. Before this, `donate` and `fundraiser` reached NOTHING in English while their
   Swedish and Finnish equivalents were declared.
6. **The amber link rule** — one app-wide `a { color: var(--accent) }` at the top of styles.css.

Specs extended in place: `e2e/wizard-filters.spec.ts` gains the two-level dropdown test, the
ignored-word test and a three-language test that asserts the RELATIONSHIP (a Nordic term reaches
what its English word reaches), never a total. `e2e/_browse.ts` `chooseType` is one
`selectOption` now. `e2e/template-pack-10.spec.ts` reads the optgroup instead of the chips.

## What is NOT done, in the order I would do it

1. **`"logo"` returns 203 designs** across four shelves. The ranking is right (corner bugs
   lead); the total is not a search. The word is in the field titles of every design that can
   take a mark, so the fix is not an alias — an alias would CONSUME the word and change what an
   English query means. It needs its own measurement: probably a rule that a token matching only
   the FIELD-TITLE index band scores lower than one matching a name or a category.
2. **The category-vs-tag re-categorization** (§20.3, "NOT implemented"). Two shelves are named
   for a purpose rather than a form — `sponsor` (3 designs) and `cta` (8) — and `bug`'s subtypes
   are purposes of one form. Moving any of it re-baselines 500+ designs across
   `e2e/catalog-baseline.json`, `e2e/catalog-render-baseline.json` and
   `scripts/overflow-baseline.json`. **This is a questionnaire question, not a code one**: is
   "Sponsors & commerce" a shelf a student looks under, or is a sponsor bug something they find
   by typing "sponsor"?
3. **The alias tables want a native reader.** They are written to broadcast-desk usage, not
   dictionary translation, and they are the kind of file that is corrected by being read. Two
   judgement calls worth a second opinion: Swedish `textremsa` is filed under CAPTIONS (it is
   the subtitle strip in Swedish TV usage, not a lower third), and Finnish `otsikko` fans to
   BOTH titles and topic cards because it is used for either.
4. **Kit pick-and-choose beyond ticking.** It already exists (the checkboxes), so nothing was
   owed here. What is still missing is a way to swap ONE member's design without leaving the
   kit — the look picker changes all of them together.
5. **The credits designs' names** ("Classic Roll", "Column Roll", "Pager", "Crawl", "Credit
   Reel") are still what the owner read as "reels and crawls". Unchanged from §19: it belongs to
   the session that owns the credits pack, because the name slugs the public template page's URL
   and four specs reach designs by it.

## Owner queue

Two items, both with routes under a minute:
`docs/acceptance/owner-queue/2026-08-28-searching-for-graphics-in-three-languages.md` and
`…-a-kit-shows-what-is-in-it.md`.

## Verification

`npm run build` green. `e2e/wizard-filters.spec.ts`, `e2e/wizard-kit.spec.ts` and
`e2e/template-pack-10.spec.ts`: 36 passed. The affected plan
(`npm run test:e2e:focus:queued`): **849 passed, 1 failed** — `e2e/adapt-first.spec.ts:116`,
"a brief becomes a customized graphic adapted from a proven design" — plus the catalog gate,
35 passed.

**That one failure is not attributed, and here is exactly what is and is not known about it.**
It passed on a re-run of the unchanged commit, together with the whole of
`e2e/ai-retrieval.spec.ts`. I did not capture its assertion before the reporter's tail rolled
past it, so I cannot say what it claimed. What IS measured is that the search change could not
have moved that spec's retrieval: `node scripts/spike-brief-terms.mjs` prints every term the
worship brief produces, asked both as a person's search and as a brief term, and **all eleven
are identical** — every one is a single token, and a lone unreachable token scores zero with
the drop or without it. The affected run also shared the machine with another checkout's
type-floor sweep, and this spec is a long AI-mocked walk into the editor. A timeout under load
is the likeliest reading, and it is a reading, not a finding.

**What did come out of chasing it is a real carve-out**, kept on its own merits: a BRIEF TERM
now keeps the exact token-AND (`BrowseContext.briefTerm` turns the drop off along with
`namedAliasScore`). Retrieval weights each term by its idf, so a term matching nothing is
free, while the same term with its unreachable half dropped matches a great many designs at a
low idf and sprays score across the pool. No shortlist in the suite moves today — every term
those specs produce is one token — but the terms come from a model's intent and a person's
brief, so the day one of them is two words with one meaningless half is not a day anybody will
be reading search.ts.

**Before landing:** the failure needs one clean confirmation on CI, which plans the full
affected set from the fork point. If it comes back there, read its assertion before touching
search.ts — the measurement above says the cause is elsewhere.

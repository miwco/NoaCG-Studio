# Adapt-first Create with AI

**The promise:** *describe the graphic you need, and NoaCG turns a proven broadcast design into
a customized, editable, production-ready graphic.*

This document is the investigation behind that pivot and the architecture it argues for. It is
written after five paid Creative-Mode rounds concluded that cheap open models cannot reliably
invent an airable broadcast graphic from a blank stylesheet
(`benchmarks/creative/v1/ROUND-2026-08-02-FLOW.md`, `…-POSTREVERT.md`,
`VOCABULARY-DECISION-2026-08-02.md`), and it is deliberately built out of systems that already
exist rather than a second generation stack.

---

## 1. What was measured

`scripts/catalog-geometry.mjs` renders every catalog variant at 1920x1080, settles it, and reads
back where the graphic actually sits and what proportions it uses. It is free, repeatable, and
reads the same settled state `overflow-sweep` and `l3-sweep` do, so the three instruments
describe one artifact. **430 variants measured, 0 failures.**

### 1.1 Lower thirds (89 designs) - placement is not a preference

| question | answer |
|---|---|
| vertical band | **bottom 88/89 (99%)**; the single exception is `ls30` World Clock, declared `top-right` |
| horizontal side | left 67 (75%) · right 12 (13%) · centred 10 (11%) |
| measured side vs declared `defaultZone` | **agree on 89 of 89** |
| bottom margin | **119px on 87 of 89** (one at 144, one is `ls30`) |
| left margin | **120px on 65 of 89**, p25-p75 = 120-153 |
| width | median 471px (**24.5% of frame**), p25-p75 = 400-585 (20.8%-30.5%) |
| height | median 148px (13.7%), p25-p75 = 113-183 |

Bottom placement is effectively unanimous, and the *inset* is a constant, not a tendency. What
genuinely varies is the horizontal anchor - and it varies because the catalog ships left-, right-
and centre-drawn designs as **separate members**, exactly as `lowerThirds/index.ts` says it does:
"a mirrored design re-sides its accent, because a right-anchored graphic with a left-hand accent
bar points its loudest element into the middle of the picture."

So the horizontal anchor is a property of the *design*, not a free parameter over a design.

### 1.2 The whole catalog - the safe area is one number

| category | n | dominant placement | min inset | w share | h share | primary type | hierarchy ratio | plate |
|---|---|---|---|---|---|---|---|---|
| lower-third | 89 | bottom-left 75% (4 of 9 zones used) | 119 | 0.245 | 0.137 | 50px | 2.00 | 58% |
| info-card | 71 | mid-left 28% (6) | 120 | 0.398 | 0.237 | 46px | 1.79 | 48% |
| corner-bug | 36 | top-right 39% (5) | 87 | 0.149 | 0.076 | 21px | 1.50 | 44% |
| infographic | 29 | mid-centre 45% (5) | 120 | 0.324 | 0.275 | 26px | 1.29 | 55% |
| ticker | 21 | bottom strip 52% (3) | (full width) | 1.871 | 0.086 | 28px | 1.25 | 90% |
| scoreboard | 20 | mid-centre 40% (4) | 119 | 0.313 | 0.198 | 44px | 1.29 | 60% |
| audience | 20 | bottom-left 60% (3) | 120 | 0.437 | 0.217 | 28px | 1.33 | 70% |
| results-board | 14 | mid-centre 43% (3) | 145 | 0.521 | 0.407 | 40px | 1.38 | 57% |
| frame | 14 | mid-centre 86% (2) | 54 | 0.900 | 0.900 | 34px | 1.70 | 64% |
| starting-soon | 13 | full frame 100% (1) | 0 | 1.000 | 1.000 | 72px | 1.57 | 100% |
| reveal / matchup / versus / transition | 34 | full frame 100% | 0 | 1.000 | 1.000 | 55-190px | 1.7-3.7 | - |

**226 of 430 (53%) sit at a minimum inset of 100-140px, and 219 of those are exactly 119 or
120px.** The remaining 74 under 40px are the full-frame families, where zero is correct. The
catalog does not hold an opinion about the safe area - it holds *one number*.

Placement is likewise category-determined. No category uses more than 6 of the 9 zones, five
categories use exactly one, and the dominant placement is the declared coverage class every time.

### 1.3 What the catalog does NOT agree about

Stated because a rule invented from a tendency is worse than no rule:

- **A reading surface is not universal.** 52 of 89 lower thirds paint a plate, 3 use a text halo
  with no plate, and **34 (38%) carry neither** - white text straight over live video with only
  an accent bar (`lt01`, `lt02`, the whole minimal family). That is a real broadcast style, so
  "always paint a panel" is not a catalog rule. `creative/style.ts legibilityFloor` is right to be
  a disjunction, and right to apply to CREATE only.
- **Hierarchy ratio is a band, not a constant** - lower thirds cluster at 2.0 (p25 1.88, p75 2.17)
  but the catalog runs 1.06-3.05, and other categories sit near 1.3.
- **Width is a band** - 20.8%-30.5% interquartile for lower thirds. It constrains a *sanity check*,
  not a target.
- **Image-to-text is measured separately** (§1.5) - at `create({})` every image field is empty, so
  the bare pass reports zero media everywhere and says nothing about pictures.

### 1.5 Image-to-text - what a picture does to the words

`--with-images` builds every image-capable design a second time and **drives every `filelist`
field through `update()`** - a crest, a sponsor rail and an avatar are ordinary image fields that
`create()` leaves empty, so filling the shared logo slot alone is not the question. That is
`field-coverage.mjs`'s technique: drive the fields, re-read the painted frame. Two marks are used,
a square and a wide wordmark, because every shared slot is a square box with `object-fit: contain`
and a wordmark cannot fill it. **115 of 430 designs (27%) can carry a picture at all; all 115
painted it.**

| question | answer |
|---|---|
| which designs can | 115 of 430. info-card 47/71 · corner-bug 28/36 · lower-third **13/89** · end-credits 12/12 · scoreboard 4/20 · stream-notification 4/4 · public-info 3/10 · versus 2/2 · alert 1/12 · frame 1/14 |
| which carry none | ticker, starting-soon, infographic, game-timer, transition, esports-score, matchup, results-board, reveal, quiz, poll, audience |
| where it sits | **category-determined**: info-card **above** the text (42 of 47), lower-third **leading** it (10 of 13, 3 trailing), corner-bug leading, end-credits / versus / scoreboard / frame **overlapping** (a crest among the score, a sponsor on the chrome) |
| how big | **mark height ≈ 1.4x the primary type size** (median 1.43 square, 1.39 wordmark) - the transferable number, since a px box means nothing without its type ladder |
| gap to the text | median 14px overall; **41px** on lower thirds |
| does the graphic grow | **only lower thirds grow sideways** - median **+101px**, up to +142 (lt54: 409 -> 551px, **+35%**, frame share 0.213 -> 0.287). Every other category reserved its room: +0 width. Info-card, public-info and alert grow in HEIGHT instead (+70 / +85 / +86), which is what "above the text" costs |
| **47 of 115 do not resize at all** | every corner bug, both versus cards, the scoreboards, the stream notifications, `lt07` / `ls10` / `ls25` |
| pushed off frame | **none** |

**The capacity finding:** a logo is the one operator action that can push a lower third past its
width budget. `catalog-type-floor`'s rule of thumb is to cap design growth at 1.25x; a mark costs
up to **1.35x** on `lt54`, and the median +101px moves the median strap from 471px (24.5% of frame)
to 572px (29.8%) - from the middle of §1.1's interquartile band to its top. Nothing overflows
today, but a design already near the p75 has spent its remaining air on the mark.

**Two alarms in the first pass were the instrument, not the catalog**, and both are worth knowing
because the naive form of each looks like a finding:

- *"The mark pushed 9 designs off frame."* It pushed none. Credit rolls and full-frame cards are
  off-frame **bare** - a roll scrolls past the edge on purpose - so a check that reports whatever
  is negative reports the design's own nature. `cr01` sat at -944 before the mark and -967 after,
  and that delta is the mark's own height inside a scrolling track. Off-frame is only meaningful
  measured as a CHANGE against the paired bare build, which is how the script now reports it.
- *"9 logo-capable designs painted nothing."* They painted nothing **because the test only filled
  the shared logo slot**. `sn01` carries an `Avatar / icon` field, `sb09` two crests, `fr13` three
  sponsor slots - all real image fields the standard assembler does not bind at create. Driving
  every `filelist` field took the number from 106/115 to **115/115**.

### 1.4 The retrieval cost nobody had priced

`catalogDigest()` - the listing of everything assemblable, pasted into the design stage's system
prompt on **every** generation - is **81,214 characters, ~20,300 tokens, 430 variants in one flat
list.** The design call is asked to pick one of 430 from a wall of text, on the cheapest model in
the product, and the resulting chassis choice is the single decision the whole grounded path rests
on.

That is the retrieval problem, quantified. It is also why "the model picked a lower third for a
stinger brief" was the benchmark's most common defect: nothing narrowed the haystack.

---

## 2. What already exists (and must not be rebuilt)

The pivot needs retrieval, controlled variation, and structural correctness. All three are in the
repo already:

| need | the existing system | where |
|---|---|---|
| retrieval + ranking over the catalog | **`browseTemplates(filters, context)`** - the faceted Browse storefront: strict facets AND, choices within a facet OR, programme format ranks rather than filters, field-weighted token index, phrase-first alias expansion, scored results | `src/templates/search.ts` |
| per-variant machine-readable metadata | `TemplateMeta` - field counts and reachable ranges, structures, capabilities, placements, style family, motion intensity, complexity, programme relevance | `src/templates/templateMeta.ts` |
| "does a catalog structure carry this brief" | `resolveAnchor` / `structuralFit` / `variantSatisfiesAnchor` / `intentCoversFrame` | `src/templates/structuralAnchor.ts` |
| the brief read as structure | `structuralIntent.ts` - one small forced call on the `fast` route, already running before the design call | `src/ai/structuralIntent.ts` |
| adapt vs create routing | `routeIntent` - deterministic, conservative toward adapt | `src/ai/structuralIntent.ts` |
| controlled variation of a proven design | `variant.create(options)` (lines, palette, font, size, zone, animation preset/easing/speed/steps, logo) **plus** `applyDesignAdjustments` (typography ratio/weight/tracking/kicker case, density, alignment, corner, accent form, panel treatment) | `src/model/wizard.ts`, `src/ai/designAdjust.ts` |
| correctness of the result | `validateTemplate` + `benchTemplateRuntime` + `structuralIntentCheck` + `assetIntegrity` + `safety` | `src/validation/`, `src/ai/` |

**The default Create-with-AI path is therefore already an adaptation pipeline.** What it lacks is
not a mechanism - it is *retrieval*: the design stage is handed the whole catalog and asked to
find the needle itself, and it is allowed to overrule design decisions the design's author already
made.

### 2.1 Design families: a view, not an engine

The brief asks whether the catalog should become "reusable design families". It already is one.
`lowerThirds/index.ts` states the catalog is "built as a MATRIX, not a list": every family answers
how many inputs (1-5), where it sits (left / right / centred), how big it is (compact / standard /
extended), and whether it holds a logo. `templateMeta` derives exactly those axes per variant, and
`variant.create(options)` + `applyDesignAdjustments` supply the continuous variation on top.

So a design family is best expressed as a **derived grouping over existing variants**
(style family x graphic category, whose members differ by field count, side, size and logo slot) -
consumed by retrieval and selection. Building a new family type with its own `create()` would
duplicate the assembler contract, the factory gates, the taxonomy, the catalog baseline and the
export path, and would deliver variation the two systems above already deliver.

**Recommendation: no new family engine.** Spend the effort on retrieval and on the platform owning
placement, and expose "family" only as a grouping in the shortlist.

---

## 3. The architecture

Four changes, in dependency order. Every one of them reuses a system from §2.

### Stage R - retrieval (deterministic, zero new model calls)

`src/ai/retrieval.ts`: build a shortlist for a brief by running the **Browse storefront's own
engine** over the brief text, then keeping only the variants that satisfy the structural anchor
the intent stage already resolved.

```
brief + StructuralIntent  ->  BrowseFilters { query: brief + tone words, fieldBucket }
                          ->  browseTemplates(filters)            (ranked, scored)
                          ->  filter by variantSatisfiesAnchor()  (the one anchor table)
                          ->  top N (default 10)
```

The intent stage is already running and already produces the field list, the repeating parts, the
tone words and the resolved anchor. Nothing new is asked of any model. When the query matches
nothing, the shortlist degrades to the anchor's category in catalog order, and when there is no
anchor at all it degrades to the full digest - the pre-pivot behaviour, never a failure.

**Effect on the design call:** the "what the platform can assemble" section shrinks from ~20,300
tokens to ~500-1,200, and `variantId`'s enum is narrowed to the shortlist, so the chassis decision
becomes "which of these ten proven designs", not "which of 430 lines of text".

**Applied on the ADAPT route only.** A create-routed generation keeps the full digest, which keeps
the frozen benchmark control (`src/ai/AGENTS.md`) byte-identical and keeps the §4 anti-anchoring
question out of scope.

### 3.1 Retrieval as built - the four properties, each measured

*Relocated from `src/ai/AGENTS.md` on 2026-08-08, when that file was cut to the live contract. The
rules stay stated there; the measurements that produced them live here.*

Three things make a shortlist usable rather than merely shorter, and a fourth decides what happens
when it is too short. None was obvious in advance; each is what a naive implementation got wrong.

- **A brief is a SET of terms, not one query.** `textScore` is token-AND - every token must land or
  the whole query scores zero - and a sentence always contains a word the index cannot place.
- **Each term is weighted by how RARE it is in the pool.** "lower", "third" and "name" match every
  lower third there is; summing raw scores collapsed the shortlist to catalog order once the
  distinctive words ran out (measured: **89 of 89** "matched the brief text").
- **The cut is RELATIVE to the best match.** A worship brief's two scripture designs score 29 and 11
  and the next sixty score 2.2 - **a nonzero score is not relevance**. A slot spent on an irrelevant
  design is worse than an empty one.
- **Only matches ship, and the floor of four is filled in bands.** Designs a SELECTIVE term named
  (one reaching fewer than half the pool) come first, then designs no term reached, then the residue
  last. Measured over 40 briefs, 14 needed a top-up: filling by "scored anything at all" spends those
  slots on the 2.2 residue in 13 of them, and filling by "scored nothing at all" misses the 14th,
  where two designs a rare term named sit just below the cut. **The residue ranks below an UNREACHED
  design deliberately** - a generic house strap is unreached because it has no distinctive
  vocabulary, which makes it a neutral base to adapt, while 2.2 means only "has a name field and is
  a lower third". `Shortlist.reason` states the split, so a shortlist never reads as four answers
  when two of them are floor-filling.

### Stage P - the chassis keeps the zone it was drawn for

`spec.zone` currently overrides the chassis's own `defaultZone` on the grounded path. The
measurement says that is always a loss: the measured side and the declared zone agree on 89 of 89
lower thirds, and re-siding a design without re-siding its accent is the thing the catalog's own
header warns about. The reviewer's "a lower third that anchors bottom-centre has stopped being one"
is that defect.

So: **a catalog chassis is assembled at its own zone.** Placement is expressed by choosing a
differently-anchored member - the catalog ships 67 left, 12 right and 10 centred lower thirds. The
user can still move it afterwards with the Style panel, which is where a placement preference
belongs.

That is only defensible if a brief that ASKS for a side can still get one, and **retrieval cannot
deliver that through the text index**: `templateMeta` records a coverage-derived `placements`
list, never a side, and of the twelve right-anchored lower thirds only three carry the word in
their name - "Line Handle" and "Glass Tag" are unreachable by any wording of the request. So
retrieval matches placement against the one place a side IS declared, `variant.defaultZone`, and a
requested side **narrows the pool** rather than merely ranking it: a left-anchored strap is not an
answer to "anchored on the right".

Two guards keep that from misfiring, both learned by measuring:

- **A placement only counts once it narrows.** "Bottom" describes 88 of 89 lower thirds, so
  honouring it there restricts nothing while claiming to.
- **A graphic's own NAME is not a request.** "A lower third" says what the graphic is; read as a
  bottom-placement request it matched the whole category and handed back catalog order wearing a
  rationale - the worship shortlist regressed to ten with a tail of club crests before
  `NOT_A_PLACEMENT` stripped the phrase.

This is the `intentCoversFrame` precedent: a decision the catalog's own data answers better than a
prompt does, moved from the model to the platform.

**Scope:** the harness's grounded path only. **NoaCG Lite reaches the same `groundedResult`** -
`liteGroundedResult` calls it with `profile` stripped, so nothing inside can detect Lite - which
is why the policy travels as an explicit argument (`AssembleOptions`) rather than a constant. It
was a constant first, and Lite was silently opted in. Lite keeps compiling under its own declared
contract: its prompt already carries the rule as an instruction (`lite/contract.ts`, "keep it in a
bottom zone") and changing what it compiles requires a paid re-baseline of the lower-third
benchmark. Folding Lite onto the platform rule and deleting that prompt line is a follow-up with a
cost attached, recorded in §6.

### Stage V - the variation clamps match their own documentation

The harness's design tool describes `sizeScale` to the model as "0.85 compact … 1.2 large" and the
compile clamped it to 0.7-1.4. The catalog's own width band is 20.8%-30.5% of frame; a 1.4x on the
widest design (0.42) lands at 0.59 and takes the overflow risk with it. So the harness clamps to
the range it documents, and the tool schema now declares those bounds too - a description is not a
constraint.

**The range belongs to the SCHEMA the spec was authored against, and there are two.** NoaCG Lite's
server-owned contract declares 0.7-1.4 (`lite/contract.ts`), and both profiles compile through the
same `specToTemplate`. Clamping every caller to the harness's numbers told the Lite model 1.35 was
legal, accepted it in server semantic validation, and then discarded it at compile - the exact
shown-but-illegal mismatch `narrowVariantTool` exists to prevent, one field over. It is therefore
`AssembleOptions.sizeScaleRange`, defaulting to the permissive range every caller has always had.

### Stage U - the promise in the product

The AI step's copy and routing should say what the default now does: it starts from a proven
design. The shortlist makes that showable - the result card can name the design family it adapted
and how it was chosen (`Shortlist.reason`), which is also the honest answer to "is this just a
template picker?": it is a proven design, re-fielded, re-coloured, re-typed, re-proportioned within
its safe range, and re-animated for this brief.

---

## 4. Who decides what

| decision | owner | why |
|---|---|---|
| safe area, zone anchoring, frame geometry | **platform** | one number across 430 designs (§1.2); measured wrong at scale when asked of a model |
| which structure the brief needs | model (proposes) + platform (decides) | `structuralIntent` + `routeIntent`, already shipped |
| which proven designs are candidates | **platform** | `browseTemplates` ranking over declared metadata |
| which candidate to adapt | model | taste over a shortlist of ten, which is a judgement a small model can make |
| palette, font, density, typography ratio, alignment, shape, motion preset | model, through clamped parameters | `applyDesignAdjustments`, already deterministic |
| field wiring, SPX definition, state machine, animation region | **platform** | assemblers; never a model decision on this path |
| overflow, capacity, readability, editability, safety | **platform** | `validateTemplate` + runtime bench + the injected screens |
| an original look nothing in the catalog carries | Creative / Pro route | §5 |

The split is not new. What changes is that the *shortlist* moves from the model to the platform,
and the *zone* moves from the model to the design.

---

## 5. Where open-ended generation still belongs

Nothing here closes CREATE. It repositions it:

- **The escalation path.** `routeIntent` already sends a brief with no structural fit, a
  beyond-scope match, or an explicit originality request to the coder. That stays.
- **The Pro tier.** Image-guided generation whose output is *ingredients inside a proven
  structure* - backgrounds, textures, motifs, artwork for a slot - rather than a flattened image
  presented as the graphic. `pro/logoAsset.ts` already demonstrates the shape: a deterministic fill
  into a declared slot, screened for integrity.
- **An internal family generator.** The most defensible use of a frontier model found so far: the
  2026-08-02 Sonnet round produced four usable lower thirds at $0.073 each. That is far too
  expensive per user generation and entirely reasonable as a way to *author new catalog members*,
  where the cost is paid once and amortised over every adaptation afterwards.
- **Creative Lab.** The `creative/` pilot stays bench-only and honest about it.

---

## 6. Cost, and what stays open

**Default path cost after Stage R:** unchanged in call count (intent + design spec, both small),
and materially cheaper in tokens - the design call's system prompt loses ~19,000 input tokens.
No new paid stage is introduced.

**Open, each with its price:**

1. **Re-baseline the adapt path.** Stage R changes what the design stage is shown on the adapt
   route. Any adapt-path number from before this lands is not comparable; the frozen *coder*
   control is untouched, so create-route numbers are unaffected. Free to re-measure with the
   routing bench; the quality read needs a paid round.
2. ~~**Fold Lite onto the platform zone rule** and delete its prompt instruction~~ - **DONE
   2026-08-08** (prompt version `lite-lower-third-v9`). The paid re-baseline this was waiting for
   is what settled it: across two 30-brief rounds the Lite model answered `bottom-left` 47 times
   out of 47. Lite now assembles with `keepChassisZone`, so placement is the chassis's own
   `defaultZone` - which every audited Lite chassis declares as `bottom-left`, so nothing about
   the output changed - and the prompt's bottom-zone line is gone.
   **The `zone` FIELD stays in the Lite schema, deliberately.** Deleting it looked like the tidy
   finish and cost a round: the Lite spec object is `additionalProperties: false`, so a property
   the model still emits becomes a refusal rather than a no-op (29/30 → 26/30 on three
   `malformed_response`). Moving a decision to the platform and removing it from the wire are
   two different changes with two different risks - `benchmarks/lite/ROUND-2026-08-08-QUALITY.md`
   §5.3.
3. **Prove the shortlist beats the digest.** The honest experiment is one paid round, same briefs,
   same model, full digest vs shortlist, scored on chassis correctness and the human read. Not run
   here, and not to be run without an explicit cost approval.
4. ~~**Image-to-text relationships are unmeasured**~~ - **CLOSED**, measured in §1.5
   (`catalog-geometry.mjs --with-images`, 115 of 430 designs carry a picture, all 115 painted it).
   The blind spot it exposed is **now closed too**: `overflow-sweep.mjs --with-images` sweeps every
   image-capable design with a mark in every image field, recorded as `<id>@image` in the same
   baseline. It found **no defect** - the 12 designs that differ with a mark are the credits logos
   sitting at the end of an already-off-frame scrolling track and the stream-notification avatars,
   whose CSS says `overflow: hidden` / `object-fit: cover` ("crop uploaded avatars to the design
   shape"). That is what a baseline is for: the state is recorded, and a future change to it fails.
   The catalog tripwire still runs bare, so capacity-with-a-mark remains unmeasured there.
5. **Frontier-authored catalog members** as a way to spend model money once instead of per
   generation - proposed, not costed.
6. **The placement rule is the one thing here with a cheap read available and unrun.**
   `VOCABULARY-DECISION-2026-08-02.md` §"Revised recommendation" records that three confident
   predictions in this line of work have each failed measurement, and that the falsification
   round costing $0.11 saved three to five days. Stage P is a platform-derived placement
   decision - exactly the class that document ranked next and free to build - so the argument
   for measuring it before trusting it is the repo's own track record, not caution.

---

## 7. Evaluation

The existing scorecards measure machine validity. The promise needs a scorecard that measures
adaptation, and it must stay **separate** from the creative pilot's - different methodology,
different arms, not two readings of one scale.

Per brief, on rendered frames read **before** any gate output:

| # | question | how it is answered |
|---|---|---|
| 1 | was the graphic KIND understood? | `structuralIntentCheck` kind finding (already blocking on grounded) |
| 2 | were the retrieved designs relevant? | human: how many of the shortlist's 10 are plausible answers |
| 3 | was the chosen chassis the right member? | human, against the shortlist |
| 4 | did the adaptation carry the requested fields and content? | `specValidate` requested-field-present + a field-coverage drive |
| 5 | is it visibly customized, not a text substitution? | pixel + CSS distance from `variant.create({})` for the same chassis |
| 6 | is it editable in NoaCG? | the bench editability contract (already enforced) |
| 7 | is it production-ready? | `validateTemplate` + runtime bench + overflow |
| 8 | **would the owner take it to air after entering content and brand?** | blind human read - the criterion that outranks the rest |
| 9 | how many user actions before it is usable? | counted in the walkthrough |
| 10 | what did it cost? | telemetry usage block, per stage |

Criterion 5 is the one that keeps this honest. "Adapt a proven design" is only a product if the
output is not the template the user could have picked themselves - and the instrument for that
already exists in the creative pilot's nearest-catalog distance. It should be reused here rather
than re-invented, with the *opposite* reading: on the CREATE path, closeness to the catalog is a
failure; on the ADAPT path, closeness to *the chassis it started from* is the failure.

Criterion 8 needs the 20-joined-item minimum the pilot's own reports argue for
(`ROUND-2026-08-02-POSTREVERT.md`: with 6 decisive pairs of 16 and the decisive set moving between
runs, a single round cannot separate a real improvement from a re-roll).

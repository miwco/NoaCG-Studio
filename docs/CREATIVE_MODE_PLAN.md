# Creative Mode - a custom creation path for affordable open models

> **RETIRED 2026-08-09 (owner decision) - superseded by NoaCG Pro.** This is a record to MINE,
> not a plan to continue, and Creative Mode is no longer carried as a parallel architecture.
> Both it and Pro exist to answer the same question - the model proposes the appearance, the
> platform owns the engineering - and Pro owns that question now
> (`docs/NOACG_PRO_PLAN.md`). Two live experiments asking it separately is how the answers come
> to disagree.
>
> Previously PARKED 2026-08-08: five paid rounds concluded that cheap models cannot reliably
> invent an airable broadcast graphic from a blank stylesheet, and the product pivoted to
> adapt-first. The `creative/` code is BENCH-ONLY - no product path reaches it. The live routing
> contract this plan's §2 and §6 used to own now lives in `src/ai/AGENTS.md`; the pilot's
> implementation contract is Appendix A below; the verdicts and their retry conditions are
> `docs/AI_ATTEMPTS.md`. Nothing here is current strategy.
>
> **What survives the retirement, and where it belongs.** These are the parts worth carrying
> into Pro rather than re-deriving. Each is a mechanism with a measured ruling behind it, not an
> idea:
>
> | Mined from | What it is | Why it survives |
> |---|---|---|
> | `creative/critique.ts` | a rendered-frame critic that asks CONCRETE INSPECTION QUESTIONS, each phrased with ABSENCE as its first failure | the closest thing in the tree to a critic role, and its phrasing rule is the fix for the Lite judge's "scored 5 on a frame with no strap". Never scored a round - it is a design, not a finding |
> | `creative/scaffold.ts` + `creative/style.ts` | the platform compiles the whole ENGINEERING skeleton with marked region SLOTS; the model then patches only the look, through a gate that makes `:root`, `@font-face`, the ANIMATION region, the SPX definition and every field id untouchable, and returns null rather than degrade | this is the general form of Pro's compile: today Pro's model can only fill four numbers per panel, and this is the seam that lets it write CSS without being able to break the contract |
> | `creative/knowledgeCards.ts` | anatomy and principles for one composition family, taught WITHOUT showing a design to copy; a card REPLACES generic language rather than stacking, at most two per prompt | the load-ceiling lesson (`docs/AI_ATTEMPTS.md`, "adding prompt lines"): a prompt at this length is a fixed budget, not an append-only log |
> | `creative/references.ts` | ONE vision call converts a picture into structured TEXT that cheap TEXT stages then act on, cacheable per asset, and the PURPOSE decides what is read | the multi-model bridge in miniature: a vision model reads, text models design. Pro's own `layout`-reference plan is this mechanism |
> | `creative/neutralSkeleton.ts` | the de-anchored example: engineering contracts and nothing to copy | the anti-anchoring rule is absolute and outlives this plan |
> | `creative/contracts.ts` | ConceptDirection + CreativeSpec, versioned, with normalizers that CLAMP a raw emit instead of rejecting it | the house pattern; Pro's `ProInterpretationV1` + `normalize.ts` is the same shape |
> | `creative/pipeline.ts` | the four-arm ablation harness - A control / B de-anchored / C staged / D + critique - so each stage is isolated by one difference | the methodology any multi-stage Pro must borrow to prove a stage pays for itself |
>
> **Not mined, and not retired:** `scripts/creative-route-bench.mjs` and
> `e2e/creative-routing.spec.ts` cover the LIVE Phase-A routing stage, which shipped. They keep
> the word "creative" in their names and have nothing to do with this plan.

Status: PLAN, revision 2 (no implementation on this branch). Companion to
`docs/AI_PLATFORM_PLAN.md` (the task-registry architecture this slots into) and
`docs/AI_LITE_BENCHMARK.md` (the evidence base). Read `src/ai/AGENTS.md` first - the harness
doctrine there stays binding; this plan changes how the CUSTOM route works, not the doctrine.

The goal: users should be able to get genuinely original, usable broadcast graphics from
cheap open-weight models, because NoaCG - not the model - supplies the broadcast knowledge,
the structured creative process, the compiler, the validation, and the feedback loop.
Catalog-grounded generation (the adapt path) already works and its compile path is not
touched.

Every claim in this document is tagged one of: **[finding]** (supported by code or a
measured run), **[architecture]** (proposed, to be built as described), **[hypothesis]**
(to be validated by the pilot before it becomes architecture), or **[owner]** (a product
decision Mirko must make). The pilot exists to convert hypotheses into findings before
NoaCG commits to a production architecture.

---

## 1. The current request flow, and where it fails [finding]

### 1.1 Catalog-fit trace (works - keep)

brief + images/references + conversation + GenerationSpec
-> `contextText`/`imageBlocks` (claudeProvider.ts:546-593)
-> ONE design call (`specSystemPrompt`, forced `emit_design_spec`, the ~18.3k-token
   `catalogDigest` in the system prompt)
-> `DesignSpec { fit:'catalog', variantId, lines<=3, palette, typography, density, shape,
   referenceSystem, flourish }`
-> `assembleGroundedTemplate` (lite/pipeline: `specToTemplate` -> real `variant.create()` ->
   `applyDesignAdjustments` -> `ensureSpecFonts` -> `applySpecOutPreset`), every value clamped
-> injected validator (validateTemplate + runtimeBench) -> optional bounded polish.

One model call, deterministic everything else, correct by construction.

### 1.2 Off-catalog trace (the broken half)

Same design call -> `fit:'custom'` -> the free-form coder (claudeProvider.ts:937-943):

- example = `variantsFor(spec.category)[0]` - the FIRST variant of the spec's category, its
  complete html/css/js inlined as "the canonical example - match its structure exactly";
- forward-carried design direction = `designNotes()` (claudeProvider.ts:884-894): exactly
  four strings - `reason`, `motionCharacter`, `referenceSystem`, `flourish`;
- one ~16k-token emit inventing structure, layout, fields, typography, animation and every
  contract at once -> `convertEmittedRegion` -> shared repair loop (2 rounds, functional
  findings only).

### 1.3 The failure points, with evidence

**F1 - the router almost never chooses custom.** The 2026-07-29 full-harness sweep
(bench:harness, 4 candidates x 12 deliberately off-catalog briefs): only 6 of 48 runs took
the custom path; per model gemma-3-12b 0, qwen3-30b 0. The stinger, stock strip, timing
tower and poll donut all came back as lower thirds. Mirko's blind verdict: roughly 1 clear
success and 2-3 "okay" out of 48.

**F2 - the spec vocabulary cannot describe off-catalog structure, so routing custom is
structurally discouraged.** `SPEC_INPUT_SCHEMA` (designSpec.ts:103-216) requires a catalog
`category` (enum-locked, no "none of these") and caps `lines` at 3. A timing tower - five
repeating rows of three parts - is inexpressible; the honest answer does not fit the form,
and the model picks the nearest catalog shape instead. `resolveVariant` then falls back to
`lower-third` (designSpec.ts:285-295), which is why "nearest" is almost always a strap.

**F3 - prompt asymmetry anchors on the catalog.** The design stage reads ~18.3k tokens of
catalog listing and zero tokens about how to design something new; the catalog route is
described as "guaranteed-correct" while custom carries all the risk. On the custom route the
one worked example is a full catalog design. The structure-spine requirement (the `-box`
contract) is what the example is FOR, but a cheap model reads a complete design as
compositional guidance - the only design language it is shown.

**F4 - the design stage's decisions are thrown away on the custom route.** Lines, palette,
typography, density, alignment, shape, zone, sizeScale and the animation choice all die
between the spec and the coder; `designNotes` keeps four sentences. The coder re-invents
what was already decided, in the same call that writes the code.

**F5 - nothing measures "is this the graphic that was asked for".** Machine validity
anti-correlates with brief satisfaction: qwen3-30b scored 12/12 valid + 12/12 overlap-clean
and produced junk (a timing tower rendered as two lines of stray numbers); qwen3-coder-next
scored worst on validity (9/12) and produced the only "looks good" results. Ranking on the
existing gates would promote the worst model and eliminate the best. The same blind spot at
Lite scale: the vision judge scored strapShape 5 on a frame with no strap (AI_LITE_BENCHMARK
§6d) - a gate cannot catch a defect in a dimension it does not measure.

**F6 - "the user asked for something new" is not an input anywhere.** Nothing in
`GenerateOptions` or the spec schema distinguishes "make me a lower third" from "make me a
lower third that looks like nothing in your catalog". Structural fit is the ONLY routing
signal, so an explicit request for originality is structurally overridden - a catalog-shaped
brief can never reach the creative path today, however clearly the user asks.

**Why the harness encourages catalog copying (the one-paragraph answer):** the routing
schema forces every brief into catalog vocabulary, the prompt spends its whole budget
describing the catalog, the custom route's only design example is catalog code, and every
gate downstream measures engineering conformance rather than brief satisfaction - so the
cheapest way for any model to "succeed" is to pick a chassis, and nothing ever penalizes
the pick being wrong.

**A decay dynamic worth naming [finding]:** "off-catalog" is a moving target. The
2026-07-17 compare rig found 4 of its 5 off-catalog briefs silently absorbed by catalog
growth (they routed grounded after the July promotions), the bracket brief now has real
catalog neighbours (br01/br02, below), and timing-tower designs are in flight in another
worktree as this revision is written. Every routing benchmark must re-verify its expected
routes against the CURRENT catalog before each run - a stale expected-route table measures
the catalog's growth, not the router.

---

## 2. Request modes: adapt, create, auto [architecture]

Structural catalog fit is necessary but NOT sufficient for the adapt path (F6). The
generation request gains an explicit mode, a first-class user input alongside the brief:

- **`adapt`** - find and customize an existing catalog design. Today's grounded path,
  contract unchanged: chassis + parameters, deterministic assembly, clamps, no repair loop.
- **`create`** - produce a genuinely new visual concept. Catalog compositions are excluded
  as design input by contract (§4); catalog knowledge participates only as machine-readable
  constraints (type structures, preset banks, the :root contract, numeric guardrails).
- **`auto`** (default) - the router chooses. Inputs to the decision: structural fit against
  the type registry and catalog metadata, routing confidence (§6), originality signals in
  the brief ("unlike anything", "our own look", a mood board attached), asset demands the
  catalog cannot place, references and their declared purposes, and cost/latency (adapt is
  one small call; create is several). A catalog design having the right structure plus no
  originality signal -> ADAPT. The right structure plus an explicit originality request ->
  CREATE. No structural match -> CREATE, or an honest unsupported answer.

The desired production behaviour is explicitly NOT "create always wins": for well-covered
categories the catalog is often the better product (the Lite calibration verdict - within
the audited chassis, the catalog is the ceiling). AUTO earns its keep by choosing ADAPT for
ordinary briefs and CREATE where a new direction is justified - and the pilot benchmarks
**routing quality** (mode decisions against per-brief expected routes) **independently of
creative-generation quality** (what CREATE produces once chosen). A router that is right
for the wrong reasons or a generator that is good behind a bad router must be visible as
two facts, not one blurred score.

UI note [owner]: where the mode surfaces (an explicit toggle in the AI step vs inferred
phrasing plus an "original design" checkbox) is a product decision; the architecture only
requires that the mode exists in `GenerateOptions` and is honoured.

---

## 3. Target architecture [architecture], creation mechanism [hypothesis]

### 3.1 The two routes and their contracts

| | ADAPT (exists, unchanged) | CREATE (new) |
|---|---|---|
| When | mode=adapt, or auto + fit + no originality demand | mode=create, or auto + (no fit \| originality demand) |
| Model's job | pick chassis + parameters | design within NoaCG-supplied constraints |
| Platform's job | assemble, clamp, validate | analyse intent, compile/verify structure + engineering |
| Catalog's role | the design | engineering contracts + constraints only - never a compositional example |
| Cost | 1 small call | 3-5 small calls + 1-2 medium calls |

### 3.2 The staged pipeline

The stages and their boundaries are architecture; **how stage 6-7 turns a CreativeSpec into
code is the pilot's central hypothesis, not a settled decision** (§3.3).

```
1. INTENT      1 small structured call: brief + conversation -> StructuralIntent (§6)
2. ROUTE       deterministic + mode-aware (§2): ADAPT | CREATE | honest unsupported
3. REFERENCES  only when uploads exist: structured analysis per declared purpose (§7)
4. CONCEPTS    1 small structured call -> 3 genuinely different concept directions
               (composition family, hierarchy order, palette character, motion character -
               NO code, ~200 tokens each). User picks via the existing alternatives picker,
               or auto-pick by stated criteria when the caller wants one result.
5. DESIGN SPEC 1 structured call -> CreativeSpec (§6): the chosen concept made concrete
6. COMPILE     deterministic: engineering scaffold from existing assembler pieces
7. STYLE       1 medium call: the model's design authoring, bounded by the compile contract
8. VERIFY      deterministic: full injected validator + the structural-requirements check
               (StructuralIntent parts vs the rendered DOM, runtimeBench-style)
9. REPAIR      the existing shared/repairLoop, findings from 8 fed back, <=2 rounds
10. CRITIQUE   rendered-frame visual critique + one focused repair - BENCH-ONLY in v1 (§9)
```

Stages 1, 4, 5 are small structured outputs (hundreds of tokens) - the call shape the Lite
comparison proved cheap open models handle at 100% (qwen3-30b 24/24) [finding]. Stage 7 is
the main quality risk and the pilot's subject.

### 3.3 The creation mechanism is the leading hypothesis, with rivals

**Leading hypothesis - scaffold + style:** the platform compiles a structural scaffold
(fields, SPX definition, runtime JS, list-data runtime, animation region, machine when
declared) from `shared/base.ts` / `shared/standard.ts` pieces, and the model authors the
design - CSS plus bounded structural HTML inside marked slots - through an
`applyPolish`-class gate. Why it leads: the Lite skin experiment measured that
model-CSS-over-deterministic-skeleton produces genuinely non-catalog looks that pass the
bench (round h: 15/18 usable) [finding], and it keeps every engineering contract
deterministic.

**Known risk:** a skin restyles ONE fixed chassis. Nothing yet shows the approach scales to
composing STRUCTURE - different region relationships, repeating rows, a tree. If the
scaffold pre-decides too much, Creative Mode reproduces the catalog-anchor problem one
level up: every CREATE result becomes a reskin of the scaffold's one skeleton.

**The pilot must therefore test, explicitly** (these are the §11 diversity/similarity
criteria): meaningfully different compositions from the same scaffold family; different
hierarchy and region relationships; results that are more than cosmetic reskins; at least
one structure the scaffold family did not anticipate; originality (nearest-catalog and
nearest-scaffold-sibling distance) without losing NoaCG compatibility.

**Sanctioned rivals the implementation agent may recommend when evidence supports them:**
(a) a **bounded layout IR** - CreativeSpec's layout section compiled to markup by a small
deterministic composer (rows/columns/stacks/split, nothing more), model owns CSS only;
(b) **coder-with-contracts** - the model writes markup + CSS freely (today's custom route)
but against the full CreativeSpec, the structure spine, and the structural verify gate,
with no catalog example. The ablation arms (§10) put (b) in the comparison by construction.

**Hard boundary, whichever wins [architecture]:** no parallel scene, field, timeline,
state, runtime, renderer, validation, or export architecture. A layout/composition IR is
acceptable only while it compiles through existing NoaCG systems into ordinary
code-as-truth templates and stays a generation-time input - the moment it wants to be
edited after creation, it has become a second scene model and is out.

### 3.4 Model vs platform responsibilities [architecture]

Model decides: intent interpretation, concept directions, composition, hierarchy,
typography, palette character, shape language, motion character, CSS, bounded HTML.

Platform decides (deterministic, never a model): field ids + SPX definition, runtime JS
scaffolding (update/play/stop/next, escaping, DOM-ready guards), the animation interpreter
and data conversion, machine compilation, clamps (palette contrast, type floor, size),
zones and safe areas, validation, structural verification, export packaging, frame capture.

Load-bearing precedents [finding]: clamp instead of failing wherever a value is merely out
of range (the round-h clamps); teach geometry, not prohibitions (the framing finding);
every stage's prompt REPLACES language rather than adding it (the load-ceiling finding,
§6c); a stage keeps its place only if it shows clear improvement for its cost (the
ai-compare doctrine).

---

## 4. Boundaries and contracts between stages [architecture]

Every inter-stage artifact is a versioned typed contract (the GenerationSpec/LiteSpec
pattern), so stages can be benched, cached, and swapped independently:

- **StructuralIntent v1** (§6) - what must EXIST. New.
- **ReferenceAnalysis v1** (§7) - per-asset, cacheable, purpose-tagged. New.
- **ConceptDirection v1** - tiny: composition family, hierarchy order, palette character,
  motion character, one-line rationale. Never code, never a chassis id. New.
- **CreativeSpec v1** (§6) - how the requirements are EXPRESSED visually. Carries the whole
  design decision into stage 7, fixing F4 by construction. New, extends DesignSpec.
- **Scaffold contract** - the compiled template with marked writable slots; the style
  stage's patch goes through an `applyPolish`-class gate (:root/@font-face/scripts
  untouchable, field ids and anim-data selectors preserved, `clip-path` forbidden until the
  bench's paint-region detector is merged, everything revertable).
- **StructuralFindings** - the verify stage's output, shaped like validator findings so
  `repairLoop` consumes them unchanged; `blocking` stays the caller's policy.

**Anti-anchoring rule (binding) [architecture]:** the CREATE path never sees catalog design
code. Its engineering example is a neutral structural skeleton; its design input is the
brief, the reference analysis, and per-brief design-knowledge cards (§5). Catalog knowledge
reaches CREATE only as machine-readable constraints.

Server side, each model-bound stage is a task profile in `api/_lib/aiTaskRegistry.ts`
(`creative-intent`, `creative-concepts`, `creative-spec`, `creative-style`,
`creative-reference-analysis`, `creative-critique`) - route policy, quota, ledger and ZDR
come from the existing registry/catalog/policy layers; no new gateway. Funded routes stay
inside `fundedModelRoute()`'s price gate. Different stages may bind different model classes
(structured-output models for 1/4/5, a coding model for 7, a VLM for 3/10). The INTENT
stage is the first such binding in the app (ratified 2026-07-30): it calls with
`modelRole: 'fast'`, so it runs on the provider's `role:'fast'` model (qwen3-30b class on
the OpenRouter default, which the routing bench measured at 23/24) while every later stage
keeps the session's design/code model. `scripts/creative-route-bench.mjs` deliberately pins
its own model instead - measuring a NAMED candidate for that role is the bench's whole job.

### Systems reused (and explicitly NOT rebuilt)

Reused as-is: the model gateway + adapters, task registry + policy/budget/ledger,
`shared/repairLoop`, the injected-validator seam, `validateTemplate` + `runtimeBench`,
safety + asset-integrity screens, `convertToDataRegion` + the preset banks + measured-motion
builders, the graphic-type registry vocabulary, `imagePurpose` + the Import Graphic
pipeline (`importAnalysis/`, draft.ts), the taxonomy, telemetry, preferences, the wizard's
alternatives picker, the bench/gallery/blind-review rigs, the repeating-data textarea
convention, `base.ts` assembler pieces, and the export registry.

Not built: no second router, no parallel schema family outside the versioned-contract
pattern, no new renderer or capture stack, no new timeline/field/export models, no
expression language, no universal layout engine.

---

## 5. Design knowledge without templates to copy [architecture]

What exists machine-readable today [finding]: DESIGN_LANGUAGE.md's numeric rules and the §8
cross-family token table, the Lite chassis fit metadata (positive AND negative fit), the
taxonomy facets, TYPE_META, and the video harness's reference cards (pool of 14 with
orthogonality axes - including the measured lessons: keyword-anchored selection, no
contrast selection, cards must actually reach the prompt that writes output).

Proposal: **design-knowledge cards for the SPX side** - one card per composition family
(strap, tower/stack, board/table, split/versus, bracket/tree, card, ring/meter, full-frame
reveal, strip), each carrying: the hierarchy this family reads in, its structural anatomy
in StructuralIntent vocabulary, its numeric guardrails (from DESIGN_LANGUAGE), its motion
grammar (which preset bank / measured builders fit), its named failure modes, and
positive/negative fit. Selected deterministically per StructuralIntent, 1-2 cards per
generation, injected into stages 4-5-7.

Cards teach *anatomy and principles*, never a finished implementation: no CSS values beyond
DESIGN_LANGUAGE's published ranges, no complete markup. Per the load-ceiling finding, a
card REPLACES generic prompt language for its family rather than stacking on top of it.
And cards are advisory taste input, never routing law - the family list must not become a
second enum a brief is forced into (§6's flexibility rules apply to cards too: a hybrid or
novel intent simply gets the nearest card or none).

---

## 6. StructuralIntent and CreativeSpec - two contracts, one flexibility rule [architecture]

The one non-negotiable lesson of F2: do not replace a forced catalog taxonomy with a forced
Creative Mode taxonomy.

**StructuralIntent v1 describes what must EXIST** - information, relationships, repetition,
states, interaction, behaviour. Its `kind` is a union, not an enum wall:

- a known graphic type (`type:'bracket'` - the registry's vocabulary);
- a known composition family (`family:'split'`);
- a **hybrid** (`families:['board','ring']` - a schedule board with a countdown ring);
- **novel** (`novel: <one-sentence structural description>`);
- always with a **confidence** the router reads (a low-confidence classification with high
  structural detail routes CREATE rather than guessing ADAPT).

Independent of `kind`, the intent carries the requirements that matter regardless of label:
required parts (id, role, `repeating?` with item shape, dataBinding), fields (TypeField
role vocabulary, list data via the house one-textarea convention), states/events
(TypeMachine vocabulary), placement, tone words, and originality signals detected in the
brief. Requirements, not the label, drive verification (§8) - a mislabelled intent with
correct parts still verifies correctly.

**CreativeSpec v1 describes how those requirements are EXPRESSED** - visually and through
motion: ordered regions with roles mapped onto the intent's parts (a region may be
`repeating`, compiled onto the textarea convention and a `rebuildInfographic()`-class
runtime, never onto twenty fields); per-region typography (SpecTypography, per region
instead of global); motion plan (entrance order + which preset-bank choreography or
measured builder each region uses; new motion in the authoring grammar, converted as
today); palette/fonts/zone/sizeScale/shape reusing the existing spec fields and clamps;
optional states expressed with declared timelines.

**The separation rule:** StructuralIntent never carries visual decisions (no palette, no
typography, no shape); CreativeSpec never re-declares functional requirements (it
references the intent's part ids; the verify stage checks the INTENT, so a spec that
quietly dropped a required part fails stage 8, not code review). Both are versioned;
ADAPT's DesignSpec stays byte-identical (Lite and grounded generation are pinned to it).

---

## 7. References: three purposes, one existing pipeline each [architecture]

The user declares what a reference is FOR - extending the measured `imagePurpose` lesson
(two purposes are indistinguishable from pixels alone) rather than replacing its
vocabulary:

- **`inspiration`** (today's `layout` + `mood`, kept as its sub-kinds): extract hierarchy,
  visual rhythm, typography character, shape language, palette relationships, texture,
  motion energy - as a structured ReferenceAnalysis in CreativeSpec vocabulary, never
  geometry. The no-coordinates rule applies HERE, for two reasons: copying geometry is
  copying, and the vision benchmark showed cheap VLMs transcribe text perfectly while
  placing boxes badly [finding] - principles are what they can actually deliver.
- **`reconstruction`**: the user wants THIS graphic, editable. That is the existing Import
  Graphic architecture - `importAnalysis/` (regions, nearest bundled fonts, animation
  proposal), erase/scale, placed lines, `DraftPatch`/`addPlacedLine` - and Creative Mode
  routes to it rather than duplicating a millimetre of it. Deliberate measurement of
  regions, anchors, masks and backgrounds is that pipeline's job; the no-coordinates rule
  does NOT apply to it. Creative Mode must not weaken or replace this workflow.
- **`transform`**: preserve explicitly selected characteristics of a source (its palette,
  its type voice, its shape language - each a named toggle, not a vibe) while composing a
  NEW graphic. Runs the CREATE pipeline with the preserved characteristics entering
  CreativeSpec as locked values (the `applySpecLocks` pattern) and the rest free.

`asset` (use-as-is, bundled, protected by the as-is screen) and `plate` (legibility
constraints) keep their existing meaning and deterministic handling unchanged. At most one
vision call per generation (references analysed together, as `attachmentSections` already
batches); ReferenceAnalysis cached per asset hash so refinements never pay twice. The
consent notice and vision quota decisions (AI_PLATFORM_PLAN §15) apply.

---

## 8. The frozen control, and what the pre-work may touch [architecture]

**The current custom generator is the benchmark control and was FROZEN until the comparison
had run.** Redesigning it first would destroy the only clean baseline the experiment has.
Concretely: the coder's system prompt, the catalog example, `designNotes`, and the repair
policy stay byte-identical on the control arm; the pilot rig invokes them exactly as
production does today.

**Status 2026-08-02:** the catalog example, `designNotes` and repair policy remain frozen.
The system prompt was released for one edit after the pairwise round - the ratified corpus
motion numbers (entrance window 0.5-1.4 s, staggers 60-250 ms; docs/SPX_EXAMPLES_CORPUS.md
"Production deltas"), which DESIGN_LANGUAGE, the wizard and the preset bank had already
adopted. The control is also the shipping generator, and leaving it alone would have meant
shipping guardrails the platform had ruled against. The cost is stated rather than hidden:
**arm A and arm B numbers from 2026-08-02 and earlier do not compare with later rounds**, so
a future round re-baselines both instead of reusing the archived ones.

The pre-work (phase A, §12) is limited to what creates a fair experiment WITHOUT changing
what the control generates:

- honest off-catalog ROUTING (mode input + the intent-based route decision + removing the
  forced catalog-category classification) - so CREATE-eligible briefs actually reach the
  arms being compared;
- preserving the original brief, structural requirements, references, assets, states and
  fields at the CREATE boundary (the StructuralIntent contract) - available to NEW arms,
  while the control arm keeps receiving what it receives today;
- the objective brief-satisfaction check (intent parts vs rendered DOM inside the
  runtime-bench iframe) and free regression coverage - measurement, not generation;
- a stable contract for later Creative Mode stages.

**Ablation arms** - so improvement is attributable, never one merged before/after:

| arm | example | intent carried | staged concepts+spec | compile | critique |
|---|---|---|---|---|---|
| A control | catalog code | designNotes (4 strings) | no | none (free code) | no |
| B de-anchored coder | neutral skeleton | full StructuralIntent | no | none (free code) | no |
| C staged CREATE | neutral skeleton | full | yes | scaffold [hypothesis §3.3] | no |
| D staged + critique | neutral skeleton | full | yes | scaffold | 1 round |

A-vs-B isolates the catalog example + intent carriage; B-vs-C isolates staging + scaffold
compilation; C-vs-D isolates the rendered critique. If budget forces a cut [owner], keep
A/C/D and accept that B's two variables merge - but say so in the report rather than
implying attribution the design no longer supports.

---

## 9. The rendered visual critique arm - bench-only [hypothesis]

The central hypothesis includes "render, look, fix". The pilot tests it as arm D:
capture the settled HOLD frame (Playwright rig - the same capture the Lite eval uses;
production in-app capture stays out of scope), one vision call, at most one focused repair.

The critic asks concrete inspection questions, never a generic score - each phrased as
inspection with absence as its first failure (the §6d axis lesson): are the intent's
required elements visible; is the reading order the spec's hierarchy; is the graphic type
recognizable as itself (a bracket reads as a tree, a versus as a confrontation); is every
text fully readable (nothing clipped mid-letter, nothing under 20px-at-1080p); is the
composition balanced within its zone; does it look broadcast-appropriate over its plate.
Findings feed the ordinary repair loop as teaching messages.

Constraints: benchmark-only, non-gating, disabled in production, paid only with explicit
approval [owner]. The measured outcome that decides its future: across pairwise reviews,
how often did critique+repair IMPROVE the human verdict vs DAMAGE it vs leave it unchanged
- reported as those three rates, per category. It graduates toward production only if
improves clearly exceeds damages at acceptable cost, and only after the in-app capture
investment [owner].

---

## 10. The pilot: three categories, three distinct questions [architecture]

Scope: the CREATE pipeline stages 1-9 (+10 as arm D), flag-gated, bench-rig only - no
production UI beyond what the existing flow already has. Run in its own worktree against
the frozen control. Models: qwen3-30b, gemma-3-12b, qwen3-coder-next, plus incumbent
gemini-2.5-flash-lite as reference.

### 10.1 Lower third - "does CREATE add value where the catalog is strong?"

The everyday graphic; 89 catalog designs. Tests: AUTO correctly picks ADAPT for ordinary
briefs; explicit CREATE produces a genuinely new but RESTRAINED, usable design (novelty
without unnecessary novelty); legibility over busy and quiet plates; long names, roles,
logos, portraits, left/right placement, 2-3 line content; cost and latency relative to
catalog adaptation (the product question: what does creating buy over adapting, at what
multiple of the cost). Brief bank (~8) must include: one brief closely matched by the
catalog (expected: AUTO->ADAPT); the same brief with an explicit originality request
(expected: AUTO->CREATE, and mode=create as a separate case); a busy-plate brief; a
long-name + portrait brief; one mood-board inspiration brief.

### 10.2 Versus card - "is the creative range real?"

The main creativity test - full-frame composition freedom on a structure models already
handle [finding: the sweep's one good brief]. vs01/vs02 and the matchup type (winner
select/lock machine) are the adapt-path ground truth. Evaluates: diversity of the three
concept directions (are they genuinely different, per brief and across briefs); hierarchy
and competitive tension; typography; asset/logo treatment incl. the missing-logo state;
motion personality; reference interpretation (inspiration and transform cases);
nearest-catalog similarity (is CREATE actually creating); timer / lock-in / winner-reveal
states where the brief asks. Brief bank (~12): sports, non-sport (debate, cook-off,
chess), editorial-restrained, entertainment-loud, branded (logos + mood board), long-name
stress, missing-asset, multi-competitor (3-way and 5-way - forces the repeating muscle),
one plate-constrained, one transform-reference, one deliberately catalog-fit (MUST route
ADAPT under auto).

### 10.3 Playoff bracket - "does structural generalization hold?"

**Conflict with the request, resolved from repository evidence [finding]:** brackets are
not off-catalog. `br01`/`br02` "Playoff Bracket" exist (competition pack, results-board
category) with a full `bracket` GraphicType - round columns derived from one textarea, an
accent cursor on the live round, winner advancement, and a one-way `crowned` state. That
does not weaken the bracket as the structural-generalization test - it strengthens it:
CREATE must compose a repeating, RELATIONAL structure (rounds, ties, advancement) that the
scaffold family did not anticipate, and for once the similarity and quality comparison has
a first-class catalog ground truth (nearest-catalog distance to br01/br02 is a direct
is-it-copying measure, and br01 via ADAPT is the product baseline CREATE must justify
itself against). AUTO on a plain bracket brief has a real right answer: ADAPT.

Bounded scope: four- and eight-competitor single elimination only - no arbitrary
tournament systems. The result must communicate: rounds and progression; repeating
competitors and matches; completed vs active vs upcoming matches; winner advancement;
optional scores and logos; current-match highlighting; the championship outcome; a
winner-reveal state. Brief bank (~8): 4-team, 8-team, long names, missing logos,
incomplete results (tournament in progress), one explicit-create bracket ("nothing like
your catalog"), one ambiguous/unsupported request (double elimination / 6-team - must be
handled honestly: a typed unsupported answer or an honest simplification offer, never a
silently wrong tree), one plain brief (AUTO->ADAPT to br01 expected).

**Infographics are deliberately NOT a pilot category.** "Infographic" is a grab-bag, not a
structure; it enters later as narrow families (statistic comparison, poll result, ranked
list, timeline, key-numbers board) once repeating and relational structures are proven
here (§12 phase E).

---

## 11. Evaluation and predeclared success criteria [architecture]

**The two-scorecard rule:** engineering validity and visual quality are never combined
into one number, never one promotion score. The sweep's inversion [finding] is the
standing proof that a merged score promotes the wrong model.

**Objective gates (free, every run):** routing decisions vs the per-brief expected-route
table (re-verified against the current catalog before each run - the §1.3 decay rule);
structural brief satisfaction (intent parts vs rendered DOM); the full existing validator +
bench; export validity; machine correctness where states were declared. Gates drive repair
rounds and regression alarms - never rankings.

**Human evaluation (the ranking that counts):** pairwise blind comparison - same brief,
two arms side by side, "which would you air?" plus per-item what-is-wrong notes - on the
existing blind-gallery + judgements.jsonl + agreement machinery. Pairwise because the
calibration rounds showed absolute score deltas are noise while yes/no decisions are
reliable [finding]. Note axes: hierarchy, composition, broadcast suitability, originality,
typography, motion, overall. Reviewers: Mirko + recruited students; >=20 joined items per
comparison before any threshold conclusion (§6e).

**Predeclared decision framework - written down BEFORE any paid run** [architecture; the
exact thresholds are owner numbers [owner]]. The go/no-go sheet must set criteria for:

1. routing: % correct ADAPT/CREATE/AUTO decisions against expected routes, per category;
2. structural satisfaction: % of CREATE results whose rendered DOM carries every required
   intent part;
3. engineering validity: % passing the full injected validator (reported, never ranked on);
4. human preference: pairwise win rate of arm C (and D) over arm A, per category;
5. concept diversity: distinct concept directions per brief (and the cross-brief sameness
   tripwire - the top-chassis counter's Creative Mode equivalent);
6. nearest-catalog similarity: CREATE results' distance to their nearest catalog design
   (bench:sameness's RGB-distance machinery over hold frames as the free proxy; brackets
   additionally vs br01/br02) - a floor below which a "creation" is called a copy;
7. cost per accepted result and p50/p90 latency (§12's methodology) within owner budgets;
8. critique: improves-rate exceeding damages-rate by a stated margin.

### The proposed go/no-go sheet [owner - PROPOSED values, awaiting ratification]

Drafted against the v1 bank (`benchmarks/creative/v1/briefs.json`: 29 briefs - 8 lower
third / 13 versus / 8 bracket). 'either' cases are never scored; after the 2026-07-30
tightening (lt-long-name-portrait, lt-mood-board, br-logos resolved 'adapt' on all four
benched models, so each became a real expectation) 2 remain, leaving **27 scored: 8/11/8**
per category. Small-n honesty: per-category thresholds are stated as "at most one miss",
not percentages pretending precision the sample cannot carry. Scoring is valid only after
the free anchor re-verification (`e2e/creative-routing.spec.ts`) is green against the
catalog the run used - the §1.3 decay rule.

1. **Routing** - four tiers, all required:
   - the 5 explicit-mode briefs (lt-plain-create, lt-explicit-adapt, vs-editorial-create,
     vs-transform-ref, br-8team-create): **5/5**. An explicit mode is honoured
     deterministically, so any miss is a code defect - automatic no-go, not a model score.
   - the three MUST-route-ADAPT guards (lt-plain, vs-sports-classic, br-4team-plain):
     **each correct**. A catalog-fit brief leaking to CREATE is the §15 routing regression.
   - the OUT-OF-SCOPE guards: a brief whose graphic type is recognized but whose required
     structure or variant lies outside the matched structure's declared scope
     (`GraphicType.structuralScope`) must **never route ADAPT** - that is the
     silently-wrong-tree failure §10.3 names, and it is a defect, not an acceptable miss.
     br-double-elim is the first named guard; each such brief is individually required,
     like the MUST-route-ADAPT tier. (Mechanism: the registry declares the scope, the
     intent stage judges the brief against it with evidence, `routeIntent` decides
     deterministically - the 2026-07-30 first paid run measured exactly this hole.)
   - overall scored routing **>= 25/27 (93%)**, per category at most one miss (lower third
     >= 7/8, versus >= 10/11, bracket >= 7/8). 'either' decisions are reported with
     reasons, never scored; an 'either' brief resolving the same way across at least two
     suitable open models (plus any reference model) is a candidate for tightening into a
     real expectation at the next bank revision - the 2026-07-30 tightening is that rule
     applied, and a tightened brief carries its evidence in the bank's `notes`.
2. **Structural satisfaction** - arms C/D: **>= 90%** of CREATE results carry every
   required intent part in the rendered DOM after repair; arm B reported (it measures the
   coder, not the scaffold). Additionally no single part kind (repeating groups, states,
   placement) below **80%** across categories - a systematic hole in one requirement class
   blocks GO even when the average clears.
3. **Engineering validity** - reported per arm, never ranked (the two-scorecard rule).
   Regression alarms only: an arm more than 10 points below control arm A, or ADAPT-path
   validity below 100%, is investigated before the pairwise review is trusted.
4. **Human preference** - pairwise, ties excluded, >= 20 joined items per comparison
   (§6e): arm C over arm A **>= 60% per category**. For lower thirds, C vs the ADAPT
   result is additionally reported as product-value context (the §10.1 question), no
   threshold. Arm D's future is criterion 8's alone.
5. **Concept diversity** - **>= 90%** of CREATE briefs yield at least 2 of 3 concept
   directions differing in BOTH composition family and hierarchy order (palette or motion
   variation alone does not count). Cross-brief sameness tripwire: no single composition
   family in more than **50%** of picked concepts within a category.
6. **Nearest-catalog similarity** - calibrated, not absolute: measure every catalog
   design's hold-frame RGB distance to its own nearest catalog neighbour (the
   bench:sameness machinery); a CREATE result closer to any catalog design than the
   catalog's median nearest-neighbour distance counts as a **copy**. Copy rate **<= 10%**
   of CREATE results per category; brackets additionally report distance to br01/br02
   individually.
7. **Cost and latency** - measured per §12; cheap-route (qwen3-30b-class) budgets: cost
   per human-ACCEPTED result **<= $0.02 p50**, at the funded-route ceiling <= $0.10;
   wall-clock **p50 <= 30 s / p90 <= 90 s** per CREATE attempt (ADAPT stays seconds).
   Blowing a budget on a winning arm is a discussion, not an automatic no-go - these are
   the numbers the free-tier decision (§15.3) is made on.
8. **Critique (arm D)** - improves-rate **>= 2x** damages-rate AND damages-rate **<= 10%**
   absolute, per category, on the §9 three-rate report. Passing graduates critique toward
   production consideration only, still gated on the in-app capture decision (§15.7).

**Arm budget (§8) [owner - PROPOSED]: keep all four arms.** Arm B is the only direct
measurement of the de-anchoring claim (F3) - the plan's central diagnosis - and its
marginal cost is one arm x ~28 briefs at cheap-route prices (cents to low dollars). If the
spend cap forces the cut anyway: A/C/D per §8, with the attribution caveat stated in the
report rather than implied away.

**GO** = criteria 1, 2, 4, 5, 6 pass, 7 within budget or explicitly excepted, 3 clean.
**NO-GO** = criterion 1 or 4 fails - a router that misroutes, or a CREATE that loses the
pairwise review, has no production story regardless of the rest. Partial outcomes (versus
passes, brackets fail) promote per category, per the reporting rule below.

Results are reported separately for lower thirds, versus cards, and brackets - each
category answers its own §10 question, and a promotion argument must say which categories
carried it. A model or architecture that passes every technical gate while losing the
pairwise review is a failed candidate, full stop.

---

## 12. Cost and latency - methodology first, numbers second [architecture]

The previous revision priced stages at a blended guess; wrong method. Costs are computed
per candidate model from its REAL prices (`scripts/ai-bench-prices.json`, refreshed by
bench:discover; e.g. qwen3-30b $0.05/M in / $0.20/M out; gemma-3-12b $0.05/$0.15;
qwen3-coder-next $0.11/$0.80; incumbent flash-lite $0.10/$0.40) and from MEASURED prompt
and completion sizes once the prompts exist - the estimates below use today's known
analogues (Lite call ~1.3k in / 224 out; custom-route emits 2-6k out; skin patches
0.2-0.6k out) and must be replaced by measured p50/p90 from the pilot's own telemetry
(tokens are already recorded per stage).

Illustrative per-attempt arithmetic, stages 1+4+5 (~6k in / 1.8k out total) + style (~5k
in / 3k out) + p50 0.5 repairs (~8k in / 3k out each):

- qwen3-30b: ~$0.0007 + ~$0.0009 + ~$0.001 ≈ **$0.002-0.003 p50**, ~$0.005 p90 (2 repairs);
- qwen3-coder-next (style/repair only, cheap model for 1/4/5): ≈ **$0.006 p50 / $0.012 p90**;
- at the funded-route CEILING ($1/$5/M - the worst legal route): style alone is ~$0.02,
  p90 with repairs ~**$0.06** - an order of magnitude above the cheap-route figure, which
  is why per-model pricing, not the ceiling, must drive the free-tier decision;
- vision: reference analysis ~$0.001-0.002/generation at flash-lite-class prices; the
  critique arm ~$0.002-0.006/graphic incl. capture-side cost (judge-measured ~$0.0016/
  capture at flash prices [finding]).

Reported from the pilot (the numbers decisions are made on): cost per generation ATTEMPT;
cost per technically VALID result; cost per HUMAN-ACCEPTED result (the honest one - a
cheap pipeline with a 20% acceptance rate is expensive); p50/p90 wall-clock latency per
arm; and the marginal effect of each stage on acceptance rate (the ablation arms exist to
price stages in acceptance points, the ai-compare doctrine in experiment form). Free-tier
exposure [owner] is decided on these measured numbers, never on this section's estimates.

---

## 13. The learning loop and the catalog-data rule [architecture]

Two tiers, matching the existing privacy split:

- **Content-free (server ledger, always on):** per stage - task id, prompt/schema
  versions, route, tokens/cost, outcome, structural-check pass/fail codes, mode + route
  taken, concept index picked, discard reason. Extends the ai_generations ledger pattern;
  feeds routing statistics and the stage-value accounting.
- **Content-full (local-first, explicit opt-in to share):** brief -> StructuralIntent ->
  concepts (+ pick) -> CreativeSpec -> final code -> user verdict (kept / discarded /
  edited + diff), and the pairwise judgements. The future preference/repair dataset.

**The catalog-data rule, refined:** complete catalog designs are never positive VISUAL
targets for original-creation training - that trains the copying this plan exists to
remove. But catalog-derived data remains legitimate for: broadcast-design grammar and
numeric guardrails (the knowledge cards ARE catalog-derived); structural and field
behaviour; engineering-contract learning (the scaffold/spine); ADAPT-path training and
routing examples (catalog-fit briefs SHOULD route adapt - that is a correct label);
validation and repair examples; and negative similarity analysis (nearest-catalog distance
- catalog renders as the thing CREATE output must NOT resemble). Datasets are stored with
their provenance class - `original-creation`, `adaptation`, `engineering-repair` - and
never mixed at training time.

## 14. Implementation sequence [architecture]

- **Phase A - benchmark repair + routing honesty (own worktree, no Creative Mode).** The
  §8 pre-work: mode input, intent-based routing with the schema escape, StructuralIntent
  v1 + full-context preservation at the CREATE boundary, the structural-satisfaction
  check, free regression coverage, expected-route tables. The current custom generator's
  prompts and stages stay byte-identical (the frozen control). Deliverable: a fair,
  instrumented experiment bed; re-run bench:harness routing on the 12 off-catalog briefs
  as the free acceptance test.
- **Phase B - this plan revised and approved** [owner]: Mirko ratifies the §11 thresholds,
  the arm budget, and the pilot spend before any paid run.
- **Phase C - the three-category pilot (separate worktree).** Stages 1-10, the scaffold
  hypothesis + rivals per §3.3, brief banks per §10, arms per §8. **BUILT 2026-07-30**
  (`src/ai/creative/`, `scripts/creative-pilot-bench.mjs`, free coverage in
  `e2e/creative-pilot.spec.ts`): the leading hypothesis is implemented as
  `scaffold.ts` + `style.ts`, and the two sanctioned rivals sit in the comparison rather than
  in the code - (b) coder-with-contracts IS arm B, and (a) the bounded layout IR is the change
  to `scaffold.ts` that phase E makes only if the diversity criteria say the scaffold
  under-composes. Not yet run: every arm spends real tokens and waits on approval.
- **Phase D - the comparison.** Frozen control vs staged CREATE vs critique arm; pairwise
  review; the §11 sheet filled in; decision.
- **Phase E - evidence-driven widening** [owner, informed by D]: generalize or replace the
  scaffold/compiler per what won; more design-knowledge families; free-tier exposure;
  production concept selection UX; the in-app capture investment for a production
  critique; narrow infographic families (statistic comparison, poll result, ranked list,
  timeline, key-numbers board) only after repeating and relational structures are proven.

## 15. Risks and open owner decisions

Risks: scaffold under-expressiveness (mitigated: it is a hypothesis with rivals in the
comparison, §3.3); stage-count creep (the ablation arms price each stage in acceptance
points); StructuralIntent ossifying into taxonomy #2 (mitigated by the §6 union + the
requirements-not-labels verification rule - and the pilot's novel/hybrid briefs test it);
cheap-VLM reference analysis quality (principles-only limits blast radius); structural
checks breeding false confidence (presence, not quality - pairwise review stays the
authority); routing regressions on catalog-fit briefs (every bank carries MUST-route-ADAPT
cases); brief-bank decay against the growing catalog (§1.3 - re-verify expected routes
before every run).

**Ruled 2026-07-31, after the two smoke rounds** (full record and its evidence:
`benchmarks/creative/v1/RULINGS-2026-07-31.md`):

- **Opaque full-frame backdrops** - spec-driven. An OVERLAY (`fullFrame: false`) may not paint
  one: a deterministic clamp in the style gate strips the frame-filling geometry and keeps the
  paint. A full-frame BOARD may, and is MEASURED instead - plate visibility against the known
  composite plate, with the floor calibrated per category from the catalog's own designs. The
  measurement's first free run found the flag the whole rule keys on to be unreliable (14/16
  lower thirds claimed full frame), which the stage-5 schema now addresses and the next round
  re-measures.
- **Critique acceptance** - a repair lands when it is NO WORSE than its base (no new error rule,
  no more errors), not only when the repaired template is fully valid. Criterion 8 becomes
  measurable; "never break one" is preserved.
- **Bracket** - DEFERRED behind the bounded layout IR (§3.3 rival (a)). Blocker 2 is already
  measured; re-running it across four models buys the same answer more expensively. The full
  pass covers 19 scored briefs (8 lower third + 11 versus).

Owner decisions for Mirko [owner]:
1. §11 thresholds and the go/no-go sheet, before the paid run (PROPOSED values now in
   §11, awaiting ratification).
2. Pilot spend approval - order of magnitude at real candidate prices: ~28 briefs x 4
   models x 3-4 arms ≈ $1-4 generation + $1-3 critique/vision; a firmed estimate from
   measured stage sizes is presented before any spend, per the standing rule.
3. Free-tier exposure of Creative Mode (decided on §12's measured numbers).
4. Concept selection UX (mid-flow pick vs auto; recommendation: pick when the alternatives
   checkbox is on, auto otherwise).
5. Mode surfacing in the UI (§2).
6. Arm budget: keep all four ablation arms or the A/C/D cut (§8).
7. In-app capture investment (gates any production critique - phase E).
8. The hairline/key-and-fill question stays DEFERRED per his 2026-07-29 ruling; knowledge
   cards take no position until he rules.

## 16. Follow-up implementation prompt (phase A worktree)

> NoaCG Studio - Creative Mode phase A: benchmark repair + routing honesty, with the
> current custom generator FROZEN as the experiment's control.
> Read docs/CREATIVE_MODE_PLAN.md §1-2, §6, §8, §14, and src/ai/AGENTS.md first.
> Implement, committed and verified per step:
> 1. Add the generation mode (`adapt` | `create` | `auto`) to GenerateOptions and honour
>    it in routing. Auto = structural fit + confidence + originality signals; an explicit
>    mode is never overridden.
> 2. StructuralIntent v1 (versioned, §6: known type | family | hybrid | novel, confidence,
>    requirements independent of the label) + an intent stage, and an intent-based route
>    decision that no longer forces a catalog category on off-catalog briefs. The ADAPT
>    path and Lite stay byte-identical (bench:regress + identity tests green).
> 3. Preserve the full brief/intent/references/assets/states/fields contract at the CREATE
>    boundary for FUTURE arms - while the existing custom coder (prompts, example,
>    designNotes, repair policy) continues to receive exactly what it receives today. Do
>    not de-anchor or otherwise "improve" it: it is the frozen control.
> 4. The structural-satisfaction check: intent's required parts verified against the
>    rendered DOM inside the runtime-bench iframe, surfaced through the injected validator
>    as findings the shared repair loop can consume (non-blocking by default).
> 5. Expected-route tables for the three pilot brief banks (§10), with a re-verification
>    step against the current catalog, and free regression coverage for routing + the
>    structural check (stub provider + mutation-pinned specs, the house pattern).
> Verification: npm run build; free rigs only - no paid calls without explicit approval.
> Prepare, but do not run, the bench:harness routing comparison over the off-catalog
> briefs. Do not touch lite/pipeline compile behavior, grounded assembly, provider policy,
> or the custom coder's generation behavior.

---

*Evidence basis: the 2026-07-29 full-harness sweep and Mirko's blind verdict (routing 6/48
custom; validity-vs-satisfaction inversion), the Lite benchmark rounds a-j and §6b-6e
(skins, framing, load ceiling, judge axes, calibration), the 2026-07-29 model comparison
(three open-weight models at parity with the incumbent on structured design calls), the
2026-07-17 compare-rig absorption finding, current-code traces in §1, br01/br02 + the
bracket graphic type, and scripts/ai-bench-prices.json.*

---

## Appendix A - the pilot's implementation contract

*Relocated from `src/ai/AGENTS.md` on 2026-08-08, when that file was reordered around adapt-first
and cut to the live contract. Nothing here changed; it moved because the pilot is bench-only and a
live contract should not carry an experiment's internals. `src/ai/AGENTS.md` keeps the two rules
that reach outside the pilot (the frozen-control freeze and the anti-anchoring rule).*

### The staged path

`contracts.ts` (ConceptDirection + CreativeSpec, both normalize-don't-reject) -> `knowledgeCards.ts`
(family anatomy + DESIGN_LANGUAGE numbers, keyword-selected, max 2, a card REPLACES generic
language) -> `stages.ts` (the stage 4/5 tools and prompts) -> `scaffold.ts` (DETERMINISTIC: fields +
SPX definition + runtime + list rebuild + the marked region + safe-area geometry) -> `style.ts` (the
model's CSS and bounded region HTML through an applyPolish-class gate). **The scaffold is the
floor**: a style patch the gate refuses leaves a plain but valid graphic, e2e-pinned against the
full production validator.

### The rigs

`bench:creative:route` (routing only), `bench:creative:pilot` (the arms - the most expensive rig in
the repo, explicit routes, priced, ceilinged), `bench:creative:refs` (free catalog hold frames, so
`bench:sameness` can calibrate the copy line), and `scripts/creative-plate-visibility.mjs` (free,
reads PNGs already on disk).

**The pilot rig's routes are PER ARM CLASS** (the 2026-07-31 bracket smoke, blocker 1: qwen3-30b
completed 0/8 coder-arm runs on `malformed_response` over ~10k-token emits while going 8/8 on the
staged arm - one route for every arm measures emit-size reliability, not the arms): `--route` is the
candidate under test (arms C/D + the shared intent stage), `--coder-route` is REQUIRED for arms A/B
and may equal `--route` to restore single-model attribution. The rig pins each arm's route through
saved settings - the same mechanism that picks production's session model - so the frozen control's
code is untouched; each stage's serving model is in the ledger, `pilot.json` records `armRoutes`,
and per-stage cost is priced by the RECORDED model first. With split routes, A-vs-B and C-vs-A stay
single-variable; B-vs-C differs in model class AND staging, and the report says so.

### The BACKDROP rule, split by what the spec declares

Owner ruling 2026-07-31, `RULINGS-2026-07-31.md`. The defect: a style patch shadows `--panel-bg` to
black on the root - legal, `:root` is untouched - and makes the box `100vw x 100vh` painted with it,
so a "valid" overlay floods the frame. An OVERLAY (`fullFrame: false`) may not paint an opaque
full-frame backdrop: `style.ts stripFrameFlood` strips the FILL and keeps the PAINT from any rule
carrying both, which leaves the panel at content size in its zone instead of an invisible box with
the content sprayed across the canvas. A full-frame BOARD may cover, and is measured instead -
`creative-plate-visibility.mjs` composites against the known plate (`creative-plate.mjs`, shared
with the rig so reference and capture cannot drift) and calibrates the floor against the catalog's
own designs **per category**: pooled over lower thirds and versus, the catalog minimum is 0.0%,
because vs02 legitimately covers every pixel, and one number over two placement classes excuses
every flood there is. The same measurement reads the opposite end exactly - a frame pixel-identical
to the bare plate painted NOTHING.

### `spec.layout.fullFrame` is DERIVED, not asked for

It decides both the scaffold's anchoring (a full-frame graphic is centred, not zoned) and whether
the backdrop gate above applies, and the model got it wrong on 24 of 30 lower thirds - for graphics
whose own family word was "strap" and whose zone was "bottom-left". Two rewordings of the stage-5
schema moved the rate by 8 points, which is the evidence that it was never a wording problem.
`templates/structuralAnchor.ts intentCoversFrame` now resolves the structure the brief named through
the anchor table and reads the `CoverageClass` the graphic category already declares; the model's
flag survives only for a brief that names no structure the catalog knows. Over the archived specs:
lower thirds 24/30 claiming the frame -> 0, versus 49/49 (correcting two that had denied it). It
lives beside the anchor table for that table's own reason - the router and the satisfaction check
must not hold two answers.

### Stage 3 READS THE USER'S REFERENCES

`creative/references.ts`, plan §7; wired 2026-08-02, `REFERENCES-2026-08-02.md`. Four briefs in the
bank had said "the attached mood board" / "plate attached" since it was written and every round sent
nothing.

- **The reading REPLACES the picture, it does not accompany it.** The designing stages are text
  models by choice - that is what makes arm C cost a tenth of the control - so one vision call turns
  every attachment into structured words and the raw image blocks are dropped. Sending both is not
  redundancy but a FAILED REQUEST: a text route rejects a message carrying an image rather than
  ignoring it, which killed every reference brief on this stage's first run.
- **The purpose decides what may be said** (`model/imagePurpose.ts`): `mood` gives colour and
  texture and explicitly no arrangement, `layout` gives arrangement and no artwork, `plate` is what
  the graphic must survive and is never drawn. Each keeps its own heading in the prompt - a flat
  list is how a plate gets read as a mood board, and a duplicated attachment claim is dropped rather
  than filed under another's purpose.
- **Arm A does not get references** and the bench says so wherever its numbers are: the frozen
  control cannot consume a picture on a text route, so a reference brief compares a pipeline that
  can see against one that cannot.
- Fixtures are SYNTHESISED (`scripts/creative-reference-fixtures.mjs`), not collected. Real
  broadcast graphics belong to whoever made them, and a mood board carries no composition - a real
  design used as one would smuggle a layout in and make the experiment unreadable.

### The platform floors a CREATE result must clear

**A CREATE result must be readable against SOMETHING - a surface, or its own halo, never neither**
(`style.ts legibilityFloor`). The scaffold published `--panel-bg` as a variable and nothing ever
painted it, so a contract that correctly said dark ink on cream paper rendered the ink onto live
video. The floor is a disjunction, not "always paint a panel": a panel-less design is real (the
catalog's `clean` skin carries none and buys legibility with a halo), so the platform supplies one
only when the design supplied neither. It applies to the BARE SCAFFOLD too, which is what ships
whenever the gate refuses a patch. Only the scaffold's own elements count as a surface - accepting
any prefixed class let a decorative dot disable the floor for the designs most likely to need it, so
it errs toward painting.

**Three more, because a model got each of them wrong at scale** (the 2026-08-01 pass,
`PASS-2026-08-01.md`):

- **Every declared field reaches the screen.** Fields bind to regions through the spec's `fieldKeys`,
  which stage 5 frequently returns EMPTY, and the rescue for unbound fields used to skip the `list`
  and `hidden` roles - so 48 of 69 staged runs shipped fields nothing could draw (88 of them). Row
  sets are now one compiled table generating both the markup and the runtime (they were decided
  separately, which left 26 of 55 runs with a rebuild whose container did not exist), every list
  field gets its own container, and a final sweep gives a visible slot to anything still unreachable.
- **A graphic can say something.** Seven runs declared no fields at all and several typed every field
  as a picture, leaving a frame of src-less `<img>`. The scaffold guarantees one text-painting field,
  synthesized from the graphic's own name. The rule asks what a field PAINTS, never what its label
  looks like - a keyword guess has to call "Home Team Crest" an image and "Team 1" not, and would
  become its own defect.
- **A length keeps its unit.** The style stage copies the scaffold's
  `calc(26px * var(--scale) * var(--type-scale))` and drops the `px`; the browser then discards the
  declaration and the whole type ladder reverts to ~16px in a 1920x1080 frame. 469 declarations
  across 59 of 155 archived stylesheets, and the coder arms clean at 0 - the scaffold's own pattern
  induces it. `style.ts repairUnitlessLengths` restores the unit (clamp-don't-reject) narrowly enough
  that it only touches expressions built from bare numbers and the two scaffold multipliers.

**These were all invisible to every gate, which is the lesson worth keeping.** Structural
satisfaction asked whether a required part was PRESENT in the DOM, and a hidden holder is present -
so a versus card whose four fields were all undrawable scored complete. That is why
`validation/structuralIntentCheck.ts` drives every text-bearing field to a sentinel and re-reads the
painted frame.

### The critique repair lands when it is NO WORSE than its base

`pipeline.ts noWorseThan`, same ruling: no new error rule and no more errors than the base, or clean.
The old `validation.ok` rule could not land on an invalid base at all - 1/20 across both smoke rounds
- which made §11 criterion 8 unmeasurable rather than negative.

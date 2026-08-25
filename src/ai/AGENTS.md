# src/ai - the SPX generation harness

Loaded alongside the root AGENTS.md when working in this directory (Claude reads it via this
directory's CLAUDE.md import; Codex reads it directly). Keep it accurate.
(The VIDEO harness is its own world: src/ai/video + src/video - see the root map.)

**Every `##` section states its STATUS in its first line:** **LIVE** (a user reaches it today),
**EXPERIMENT** (built, but flagged off or bench-only - no user reaches it), **RETIRED** (kept only
because code still names it). A section's status is not derivable from its content, and reading an
experiment as current strategy has already cost this project a paid round. Dead ends, what they
measured, and the conditions that would revive them are **`docs/AI_ATTEMPTS.md`** - read it before
proposing an approach that sounds new.

## The doctrine - adapt, do not invent

**LIVE.** The harness exists to make AI results reliably better than a plain model call - and it must
EARN that claim in `scripts/ai-compare.mjs`, never assume it.

**The strategy that won is ADAPT-FIRST** (`docs/ADAPT_FIRST_PLAN.md`): the model retrieves a proven
catalog design and adapts it - brand colours, a logo, the user's words, typography and proportions
inside a clamped range. **It does not invent a layout.** Five paid rounds measured cheap models
composing a broadcast graphic from a blank stylesheet and none produced one the owner would air; the
catalog is both the crutch and the moat. Retrieval is that doctrine in code, so it is the section
directly below.

**A generated graphic can only be a category the catalog already carries.** Lite's allowlist is a
subset of the catalog's categories (today: lower thirds), and no path widens it at generation time.
That constraint is not a limitation to route around: it is what guarantees a generated graphic is
**operable in the control panel through the same machine, fields and events as a hand-picked one**,
because it was assembled by the same `variant.create()` the wizard runs. A graphic outside those
categories would carry no machine the control layer knows how to drive.

The principles, in priority order:

1. **Ground engineering, not visual style.** The platform pins the SPX definition, field ids, the
   `:root` contract, auto-fit, zones, the NOACG_ANIM region + interpreter, and export readiness. The
   AI owns composition, typography, spacing, proportions, colour, shape language, motion character,
   density, and hierarchy.
2. **The brief and references define taste.** Prompts state reasoning criteria - never a fixed
   aesthetic. A news strap and a children's game show earn different answers. Uploaded references are
   read as a design SYSTEM that outweighs the generic rules.
3. **Different briefs must produce different designs** - "same layout, different colours" is a named
   failure. The compare rig's top-chassis counter is the sameness tripwire.
4. **The smallest harness that wins.** A catalog-fit generation costs ONE small model call; everything
   after it is deterministic. Stages that only add cost get cut.

Two rules the repo paid to learn, binding everywhere here:

- **A deterministic gate cannot catch a defect in a dimension it does not measure** - so either
  measure that dimension or forbid the construct. Machine-valid is not good.
- **Write a constraint as INSPECTION, never as a list of named failures**, and let ABSENCE be its
  first failure. A prohibition suppresses the behaviour it constrains. When a teaching change moves a
  rate, suspect the FRAMING before the rule.

## The tiers a user is offered (`settings.ts`, the ⚙ panel in AiStep)

**LIVE.** One door, and behind it three tiers - two of which a user can reach today.

**Each managed tier has ONE stated promise** (also in `docs/GOALS.md`'s tier table - change both
or neither): **Lite** promises *a proven catalog design, carrying your brand and your words -
reliably, every time*; **Pro** promises *an on-air look designed for your channel - a palette,
type voice, accent form and motion character no shipped design carries - rendered by the
platform, so the layout is always sound*. Pro's promise deliberately names the LOOK and not the
composition: "a composition no catalog design uses" is the §15.4 premise three rounds measured
to fail, and the platform owns layout now. The wizard's example briefs
(`examplePrompts.ts` `LITE_EXAMPLE_PROMPTS` / `PRO_EXAMPLE_PROMPTS`) are written to these
promises and were verified by GENERATING them (2026-08-15): a Lite brief names no colours and
no zone (a model-invented palette is dropped by design, placement follows the chassis) and
states its two lines as an explicit stack; a Pro brief describes the look in the language
contract's own dimensions. A brief that reads well and renders as something else is the defect
those rules exist to stop - measured, not assumed.

| Tier | Stored id | Label | Price target per finished graphic |
|---|---|---|---|
| Lite | `lite` | NoaCG Lite | **100 graphics per €1** (~€0.01); measured **$0.00032** |
| Pro | `pro` | NoaCG Pro | **~€10 per 100** (~€0.10 each) |
| Bring your own key | `custom` | Bring your own key | whatever the user's provider charges |

Four rules, all of them things the shipped build got wrong before 2026-08-14:

- **The stored id is not the label.** `custom` is persisted per browser (`spx-gfx-ai`); renaming
  it silently resets everyone who chose it. Change copy freely, ids never.
- **A price target is a commitment about the ROUTE.** Missing it changes which model a tier
  calls, never what a user is charged. Lite has ~30x of headroom, so its route choice is a
  QUALITY decision (`docs/GOALS.md` NEXT).
- **The managed transport is never user-facing.** `AI_PROVIDER_IDS` (modelTypes.ts) is the
  transport set; `AI_PROVIDERS` (settings.ts) is the BRING-YOUR-OWN-KEY subset a user picks
  from - openai, anthropic, google, huggingface. They are deliberately two lists: collapsing
  them either sells our plumbing as a product or breaks every managed route. The BYO-key tier
  additionally MOVES a stored managed route onto a real user-key provider
  (`DEFAULT_BYOK_PROVIDER`), because a tier promising "your key" must not spend ours.
- **A managed tier names an OUTCOME, never a mechanism.** Lite and Pro name no vendor, model or
  transport, so replacing the engine behind one costs no copy - and cannot leave the door
  describing a pipeline that was retired, which is exactly how Pro shipped describing image
  reconstruction two months after it was dropped.
- **A NoaCG TIER RUNS ON NOACG'S OWN SERVICE OR IT IS NOT OFFERED** (owner, 2026-08-14). It
  never asks a customer for a key to reach our own models or harness. Pro is therefore offered
  on exactly two conditions, ANDed: the server says hosted Pro is available to this visitor
  (`GET /api/ai/pro-status`, `AI_PRO_ENABLED`) **and** the deployment carries the backend that
  route is metered through (`proOffered = proHosted && isBackendConfigured()`). Where either is
  false the tier is ABSENT - not greyed, and never degraded into a key request. **One door
  takes one switch:** there is no client flag for Pro and there must not be one, or a
  deployment meters it while showing no door, or shows one it will refuse. The key row in
  `AiProviderSettings` stands down on the managed route for the same reason.

**Every model row carries a price per 1M tokens and says which key pays it.** None of the three
direct provider APIs publishes a price with its listing (measured), so `aiModelDiscovery.ts`
reads the managed catalog as a PRICE BOOK, matched by `modelPriceKey` - which normalizes away
the vendor prefix, the dot-vs-dash separator and the dated snapshot suffix, and nothing else. An
ambiguous or unmatched model is left unpriced and unsuggested rather than guessed at; the model
box takes free text, so nothing is ever blocked by the book being wrong.

**A LISTING IS NOT AN ENTITLEMENT, and no filter can fix that** (measured on Google,
2026-08-14). `gemini-2.5-flash` and `gemini-2.5-flash-lite` appear in both of Google's own
listings, indistinguishable from live models in every published field, and answer 404 "no longer
available to new users" on a key created after their retirement. Discovery has nothing to filter
on, so the honest place to help is the ERROR: `providerFailure` maps that shape to "not available
on this account - the provider lists it but will not serve it". Two consequences worth keeping:
a curated fallback id in `settings.ts` must be one VERIFIED by a real call, not merely listed
(`gemini-3.1-flash-lite` is, as of that date), and `scripts/check-model-ids.mjs` cannot catch
this class at all - it checks presence, and presence is exactly what lies here.

**Verified end to end on real customer credentials 2026-08-14:** Hugging Face
(`Qwen/Qwen2.5-Coder-3B-Instruct`, 74 schema-capable routes listed for the token) and Google
(`gemini-3.1-flash-lite`), both returning schema-valid objects through the real adapters. HF
issues USER ACCESS TOKENS needing the **Inference Providers** permission, never API keys - hence
`credentialNoun` and the `HF_TOKEN` variable name.

## Retrieval - the shortlist of proven designs (`retrieval.ts`)

**LIVE, on the ADAPT route only.** The design stage used to be handed `catalogDigest()` - **430
variants, ~20,300 tokens, one flat list** - and asked to find the right design on the cheapest model
in the product, and that chassis choice is the one decision the whole grounded path rests on.

`shortlistFor(brief, intent, options?)` narrows it with **no new model call and no second retrieval
system**: the ranking is the Browse storefront's engine (`templates/search.ts`), the structural filter
is the ONE anchor table, and both read what the intent stage already produced. Four measured
properties make it usable rather than merely shorter - a brief is a SET of terms (token-AND); each
term is weighted by how RARE it is in the pool; the cut is RELATIVE to the best match (a nonzero score
is not relevance); and the floor of four is filled in BANDS, selectively-named designs first, the
residue last. `Shortlist.reason` states the split, so a shortlist never reads as four answers when two
are floor-filling. The measurements are `docs/ADAPT_FIRST_PLAN.md` §3.1.

Everything degrades rather than empties: an over-tight field bucket is dropped, a query matching
nothing falls back to catalog order, no resolvable anchor returns `FULL_CATALOG`.
**`variantSatisfiesAnchor` answers TRUE for an anchor that no longer resolves** - right for the
satisfaction check, meaningless for a shortlist - so retrieval checks `anchorResolves` first.

`catalogDigest(only?)` and `narrowVariantTool` are the two seams: the prompt shows the shortlist and
the schema accepts exactly that set. **Shown-but-illegal is a chassis the model picks and
`resolveVariant` silently swaps - the wrong graphic delivered as a success.** A CREATE route keeps the
full digest. The offline stub picks from the same shortlist deterministically, which makes the path
e2e-testable without tokens (`e2e/adapt-first.spec.ts`, `e2e/ai-retrieval.spec.ts`).

**A spec-level REFINEMENT retrieves too, and `ShortlistOptions.keep` makes that safe.** `specRefine`
takes its anchor from the spec it is editing and its terms from the request PLUS what the graphic
already is - "warmer colours" places nothing in a design index. `keep` pins the design in use into the
shortlist, because narrowing collapses the `variantId` enum and a colour request would otherwise swap
the user's graphic out from under them. It is matched against the ANCHOR, not the narrowed pool, and a
`keep` from another structure is refused.

**A catalog chassis is assembled at the zone it was DRAWN for** (`AssembleOptions.keepChassisZone`).
Measured over 89 lower thirds: rendered side agrees with declared `defaultZone` 89 of 89, 87 sit at
exactly 119px from the edge. The catalog ships left-, right- and centre-drawn designs as SEPARATE
members because re-siding a strap means re-siding its accent - so placement is expressed by picking a
differently-anchored member, which retrieval puts in front of the model, and by the Style panel
afterwards. Retrieval therefore matches a requested side against `variant.defaultZone`, the one place
a side is declared; the text index cannot answer it (of twelve right-anchored lower thirds only three
carry the word in their name).

**The policy is an ARGUMENT to `groundedResult`, not a constant** (`keepChassisZone`,
`sizeScaleRange`), because **NoaCG Lite reaches that same function** with `profile` stripped, so
nothing inside can detect Lite - and Lite must compile under its own declared contract (its schema
allows `sizeScale` 0.7-1.4 where the harness tool says 0.85-1.2). Clamping every caller to the
harness's numbers told the Lite model 1.35 was legal and discarded it at compile: the shown-but-illegal
mismatch `narrowVariantTool` exists to prevent, one field over.

## The pipeline (`claudeProvider.generate` - one harness run)

**LIVE.**

1. **Design spec** (`designSpec.ts`, forced `emit_design_spec`) - the only mandatory model call and the
   ROUTER. Returns `fit: 'catalog' | 'custom'` plus every design parameter: chassis (`variantId`),
   lines, palette/font/zone/size, animation preset, real COMPOSITIONAL parameters (typography scale
   ratio/weight/tracking, density, alignment, shape/panel), `referenceSystem`, and an optional
   `flourish`.
2. **Grounded assembly** (`specToTemplate`) - catalog-fit specs run through the REAL wizard assemblers
   (`variant.create`): correct by construction, timeline- and Style-panel-editable. Every out-of-range
   value CLAMPS to the nearest legal one; the project brand palette wins.
3. **Design adjustments** (`designAdjust.ts`) - the compositional parameters apply as a marked CSS
   override block (cascade beats the design CSS; contracts untouched; every adjustment guarded on the
   structure existing). This is what keeps grounded output diverse.
4. **Polish** (`polish.ts`, only when the spec carries a flourish) - ONE bounded call. Writable:
   appended override CSS + the root element's inner HTML. `applyPolish` rejects patches touching
   `:root`/`@font-face`/scripts or losing a field id or an anim-data selector; a rejected or
   bench-failing patch REVERTS. Polish never makes a result worse.
5. **Custom path** - briefs whose STRUCTURE no catalog family carries go to the free-form coder: house
   contracts + the NEAREST catalog variant's real `create()` output as the canonical example + the
   design stage's direction, then the validated repair loop (`shared/repairLoop.ts` - THE one bounded
   errors-back loop both the SPX and video coders drive: `MAX_REPAIR_ROUNDS = 2`, RE-VALIDATED every
   round; what counts as BLOCKING stays each caller's policy, injected as a filter).
   **The region contract is authored, not emitted:** the example's ANIMATION region is shown in its
   AUTHORING shape (`emitPresetRegion`) and the prompt teaches that grammar - natural GSAP the model is
   reliably good at, instead of the strict-JSON data block it reliably got wrong. Every emit runs
   `convertEmittedRegion` (canonicalize a drifted marker, then `convertToDataRegion`, the same
   parity-proven importer every wizard category uses). **The STRUCTURE SPINE is that conversion's
   precondition, so the prompt states it as a hard requirement** - root `<div class="PREFIX">` holding
   `<div class="PREFIX-box">`, that `-box` class ALONE on the element, `PREFIX-mask` around each `#fN`,
   `PREFIX-accent`. An unconvertible region keeps the model's own code (honest hand-crafted output,
   read-only timeline) and its `bench-editability` findings DEMOTE TO WARNINGS at the end - except when
   a modify started from a data-shaped template, where losing the block is a regression and the repair
   loop fights it.

`modify` refines a grounded result at SPEC level while it is still house-shaped (the caller passes the
result's `spec` back via `GenerateOptions.spec`); anything else refines at code level. `convertImport`
= deterministic import first (`model/importTemplate.ts`), then the validated conversion - the AI only
ever sees parsed code, never raw bytes.

## Phase-A routing - the mode + intent stage (`structuralIntent.ts`)

**LIVE.** `GenerateOptions.mode` (`adapt` | `create` | `auto`, default auto) plus `structuralIntent`
run BEFORE the design call in `generate` and `generateAlternatives` (never for Lite, raw, or modify):
one small forced `emit_structural_intent` call on the provider's `role:'fast'` model ->
`normalizeIntent` -> `routeIntent` (deterministic; `structuralFit` checks the type registry + catalog
LIVE, so catalog growth updates routing by itself).

An explicit mode is never overridden. Auto routes CREATE only on originality words in the brief, no
structural fit, a low-confidence/novel/hybrid classification, or a BEYOND-SCOPE match
(`intent.beyondScope`: the brief matches a listed structure but requires structure its
`GraphicType.structuralScope` note excludes - a double-elimination brief on the single-elim bracket
type. The REGISTRY declares the scope, the intent stage judges the brief with evidence, `routeIntent`
decides deterministically). Explicit adapt skips the intent call entirely (one-call economy) and
narrows the spec tool's fit to catalog; a CREATE decision narrows it to custom (`narrowFitTool`).
Decision + intent land on `AiTemplateChange.routing`/`.intent` and the telemetry record, which the
routing benchmark (`scripts/creative-route-bench.mjs`, SPENDS TOKENS) reads rather than reconstructs.

**The anchor vocabulary is ONE table** (`templates/structuralAnchor.ts`): the family words,
`resolveAnchor`, `structuralFit`, `intentCoversFrame`, and what a variant satisfies. It lives in
`templates/` because the router and the satisfaction check need the same answer and `validation` may
not import `ai`. A second copy is how the two come to disagree - the router sending a brief down the
catalog path while the check has no idea what was promised.

## The structural-satisfaction check (`validation/structuralIntentCheck.ts`)

**LIVE, on both routed paths.** Asks whether the result is the graphic that was asked for:

- **Kind** (`structuralKindFindings`) - does the assembled variant carry the anchor the intent
  promised? Answered by IDENTITY against `spec.variantId`. The defect every other gate was blind to: a
  stinger brief routes to the catalog path CORRECTLY, the design stage returns a lower third, and
  static validation, the runtime bench and the parts checks all pass - a lower third really does have a
  headline and really does sit bottom-left. Every measurement agreed and the user got the wrong
  graphic. It reports only when BOTH sides are known.
- **Parts** - list data as a textarea, field capacity, states vs machine/steps statically, plus
  repeating groups and zone placement measured in a rendered iframe. It DRIVES every text-bearing field
  to a sentinel and re-reads the painted frame, because reading the markup for `id="fN"` cannot see a
  standings row, ticker item or credits line a runtime BUILDS from one field. It ignores opacity on
  purpose: a region the machine reveals in a later step is transparent during the entrance and
  perfectly reachable.

Browser-only, injected as `GenerateOptions.structuralCheck`. PARTS findings land as WARNINGS (rule
`structural-intent`) - they measure presence, not quality. KIND findings (`structural-kind`) land as
blocking ERRORS on grounded results (owner decision 2026-07-31): a wrong-kind assembly fails closed and
is surfaced for refine/regenerate, never delivered as a success. Grounded assemblies have no repair
loop, so blocking there changes no repair rounds. `groundedResult` reports the RESOLVED chassis
(`pickVariant` clamps an unknown one), which is also what makes a spec-level `modify` refine the graphic
the user is looking at. Free coverage: `e2e/creative-routing.spec.ts`.

## NoaCG Lite - the managed free profile

**LIVE in production since 2026-08-07; quality is the open problem and the deadline plan is
`docs/AI_LITE_PLAN.md`.** The catalog-only, one-result profile selected with `GenerateOptions.profile =
'lite'`. Its model-bound design call goes through the trusted `/api/ai/lite/generations` endpoint and
the compact allowlist in `liteContract.ts`; the browser cannot supply a model, route, fallback, system
prompt, or cost policy. A ready response rejoins the `groundedResult` path above, so `specToTemplate`,
real catalog assemblers, deterministic adjustments, fields, NOACG_ANIM, assets, validation, runtime
checks, and exports stay shared. **That sharing is the control-panel guarantee** in the doctrine: a Lite
graphic drives through the same machine, fields and events as a hand-picked one because it IS a catalog
assembly.

Lite must never call `generateRaw`, `generateAlternatives`, custom code generation, polish, import
conversion, or code repair. `modify` is allowed only while the caller passes the grounded DesignSpec and
the template remains house-shaped. A grounded failure is reported to the server as a platform validation
failure. No model call may rewrite the compiled code. Unsupported scope returns a typed explanation and
simplification, never an automatic expensive fallback.

**`litePipeline.ts` is the ONE grounded compile path** - `normalizeLiteSpec` + `assembleGroundedTemplate`
(specToTemplate → applyDesignAdjustments → ensureSpecFonts → applySpecOutPreset) +
`productionSpxValidator`. `claudeProvider` is built FROM it and the benchmark runners compile through the
identical function; `scripts/ai-lite-bench.test.mjs` pins that no second copy exists.

**Lite category meaning lives in one `CATEGORY_CONTRACTS` registry.** A contract names the graphic
type, visible field range, allowed kinds, named slots, compatible measured chassis, type-owned
machine, and operator events. The same constrained model call returns category confidence and
alternatives plus structured style intent. Manual category is authoritative; auto mode proceeds
only above the confidence and margin floors, while ambiguity returns choices for the UI. Trusted
server retrieval shows at most five relevant, diverse compatible chassis and narrows the output
enum to the same ids. The compiler owns fields and state and may retry ranked fallback chassis
when the rendered hold rejects generic treatment, weak brief fit, overflow, or poor contrast.

**Lite composes its OWN validator** (`claudeProvider.liteValidator`), for the same reason it passes its
own `AssembleOptions`: `ProductionBenchOptions` can only be answered from the DECISION - which lines must
hold one line (`singleLineIdentityFields`, off the spec's declared roles) and which category's type floor
the ADJUSTED result is held to - and the browser builds its injected validator in AiStep long before a
decision exists. While they were unset, `bench-line-wrap` and `bench-type-floor` were findings every
BENCHMARK measured and no user ever did: **the round scored a stricter gate than the product ran.** All
three are WARNINGS, so composing them in cannot fail a generation that used to pass. Pinned by
`e2e/lite-line-fit.spec.ts`.

**Lite gets NO structural check, which is why field paint is composed in explicitly.**
`withStructuralFindings` returns early without a `StructuralIntent` and Lite runs no intent stage, so the
one question that measures whether a declared field REACHES THE SCREEN never ran on the one path with no
repair loop. The 2026-08-08 quality round produced the proof: a strap that painted its name, reserved a
band under it, drew nothing there, and answered `update()` with fresh data by changing nothing -
`fieldCount: 2`, every rule code silent. The drive lives in `validation/fieldPaint.ts`, shared by the
structural check and the bench's opt-in `fieldPaints`, which `liteValidator` and `compileLiteDecision`
both turn on. **It reads ONE state** (the settled default path), which is why it is opt-in: a field a
later operator event reveals would read as unpainted, and Lite is safe today only because it ships
single-step lower thirds. **Widening Lite past those revisits this note first.** Pinned by
`e2e/lite-field-paint.spec.ts`.

**A chassis's fit metadata is MEASURED where it can be, and `supportingLineChars` is the precedent.** It
was a hand-authored adjective that ranked the designs almost backwards - three of them set their
supporting line in tracked uppercase, costing about a third of the characters a reader expects, and **no
gate in the tree can see the consequence** because a wrapped line does not escape its frame. The number
comes from `node scripts/lite-line-capacity.mjs --check` - run it after any change to a Lite chassis, its
stylesheet, or the bundled fonts. A claim ABOVE the measurement fails as the defect it is; one more than
four characters below fails as stale. **An adjective is what a chassis may say only where nothing can
measure it.**

**A STRAP SPENDS WIDTH, NEVER HEIGHT, and a mark carries NO PLATE** (owner, 2026-08-14 - the
rule the matrix gallery bought). The shared slot places a lower third's mark BESIDE the words:
stacking it made `lt02` 83% taller, `lt11` 57%, and lt11 served 44% of the volume matrix, so most
branded output was a strap turning into a block (`docs/AI_LITE_BRAND_PLAN.md` §3.7,
`src/templates/AGENTS.md` for the injection rules). The platform's painted well is REMOVED with
it: a dark-ink mark on a dark package is the USER's palette defeating the mark, no chassis re-pick
can fix that, and the two remaining moves - dropping the customer's mark or pasting a white box
over the design - are both worse than the defect. The mark ships where the design puts it and the
pairing is recorded (`logo_ink_unreadable_on_surface`). `ls12`'s fixed dark tile is the one
ratified exception, because it is a designed part of that composition rather than a repair.

**RECORDING IT WAS NOT ENOUGH, and the value gate is what proved it** (owner's blind ballot,
2026-08-14 - `docs/AI_LITE_BRAND_PLAN.md` §2.2). A ledger column is not a place anyone looks: a
knockout mark on a light package shipped invisible on the generated arm AND on the arm a person
branded by hand, where nothing was recorded at all. `validation/markLegibility.ts` now MEASURES it
on the rendered frame - the mark's ink probed with the same `probeMarkElement` a real upload goes
through, against every surface it could be composited over - and says so twice: as the always-on
`bench-mark-unreadable` warning in the runtime bench, and live in the wizard's Style step, beside
the palette that broke it. Still no repair, for the reasons above; the change is that the person
who can fix it is told. **Judged for TRANSPARENT ink only**: swept over all 23 mark-capable lower
thirds, luminance flagged 2 own-field crests that render perfectly (a blue crest on a red tile
separates by hue), and a gate whose false positives are the designs that carry a crest best would
teach authors to ignore it. Pinned by `e2e/mark-legibility.spec.ts`, including the wizard path.

**A BRAND MARK is under the same rule, and `LiteCatalogEntry.logoSlot` is the measurement.**
`node scripts/ai-lite-brand-audit.mjs --lite --check` renders a real mark into a real slot and
reads the frame back - size, aspect, crop, clear space, containment, ink contrast against the
surface the slot actually paints - and gates the declaration against it. **The design declares
the slot and the compiler fills it; the model never places a mark.** The declaration is split
because the halves go stale differently: `fits` is GEOMETRY (which mark shapes land legibly; no
palette changes it) and `surface` is TONE - `palette` when the slot sits on the design's own
panel, `dark` when it sits on the picture, which means a brand owning only a dark version of its
mark cannot use that chassis at all. **The other half of the answer is the REQUEST**: `hasLogo`
was a boolean, so the model knew a mark existed and nothing about it. `LiteGenerationRequest.mark`
now carries shape, backing and ink, all measured in the browser by `assets/assetInfo.ts`
`probeMark` and content-free by construction; `hasLogo` stays beside it because the quota check
reads it and the request validator is a strict key allowlist. **Retrieval itself narrows a
marked request to slot-carrying chassis** (`retrieveLiteReferenceSet`, and by shape when the
descriptor names one) - the 2026-08-13 baseline traced three of five brand failures to slotless
chassis being shown to marked requests after the semantic round added seven chassis without
slots (`benchmarks/lite/BRAND-BASELINE-2026-08-13.md`). **All thirteen chassis now carry a
measured slot** (2026-08-13): two already drew a well and only the metadata denied it, five had a
well designed for them, and `--lite --check` agrees with the render on every one. A `surface` of
`dark` now covers TWO different facts - a slot sitting on the picture, and `ls12`'s well, which is
painted a fixed opaque dark whatever the package says so a knockout-only brand can use a light
package with no repair (`docs/AI_LITE_BRAND_PLAN.md` §3.4). The validator needs no new vocabulary
for the second: both mean "a surface the palette cannot repaint". Design, findings and the catalog
work they bought: `docs/AI_LITE_PLAN.md` §7, `benchmarks/lite/BRAND-AUDIT-2026-08-09.md`.

**A REQUESTED palette is the platform's to apply, not the model's to return** (`applyLiteBrandPalette`).
Colour splits in two: **identity** (accent, panel) is copied verbatim from the REQUEST - never
altered, never dropped - and **furniture** (text, textDim) is legibility-owned, repaired by a
three-rung ladder (re-map the two furniture slots, clamp lightness with hue and saturation
untouched, neutralize to white or black). The old repair dropped the whole bespoke palette when
the clamp could not reach, and the compile read the MODEL's echo of the palette rather than the
request - so "exactly the brand's colours" could fail three silent ways at once: a near-miss hex,
an omitted palette, a legibility floor deleting the package. Every divergence is now an
`adjustments` code, and those reach `ai_generations.adjustments` (migration 0043) because a repair
the ledger cannot count is a promise nobody can check. The audit's positive twin is
`brand-accent-verbatim` at TOLERANCE 0 - a near miss is the defect, not a pass. A palette nobody
requested is still dropped: the contract widened for the user's colours, not for the model's.
Design and what is deliberately NOT built (chassis re-pick and well, which need §3.3's measured
per-chassis surface metadata): `docs/AI_LITE_BRAND_PLAN.md` §3.1-3.2.

**`zone` and `animation.presetId` stay in the schema although both decisions are dead.** The Lite spec
object is `additionalProperties: false`, so a property the model still EMITS becomes a refusal rather
than a no-op - deleting them cost 29/30 → 26/30. Teach a field away in its DESCRIPTION first, measure the
emission rate reach zero across more than one round, then delete. Pinned by PRESENCE in
`api/_lib/aiLite.test.ts`; the account is in `docs/AI_ATTEMPTS.md`.

`liteTypes.ts` is intentionally dependency-light because both the browser and API TypeScript trees import
it - do not import catalog or DOM-bearing model modules from it. Model/provider configuration, quota,
price, privacy, and endpoint policy live only in `api/_lib/aiLiteProfile.ts`; the server task registry
(`api/_lib/aiTaskRegistry.ts`, `docs/AI_TASK_REGISTRY.md`) re-expresses that profile as task
`lite-design-spec` and fails closed unless every managed route is in the approved-route catalog. The
generated template carries no profile marker or generation ledger id.

The first quality release is LOWER-THIRD-ONLY: 13 measured chassis with positive and negative fit
metadata, semantic style signals and geometry, a broad intent facet, and an explicit named slot for
each of one to four visible lines. Server semantic validation
enforces requested roles and custom-palette contrast before deterministic compilation. **Do not widen the
category or variant allowlist without the versioned lower-third benchmark and human visual review.**

Lite's improvement signal is content-free: the ledger keeps only the resolved chassis, broad intent
facet, accepted/discarded outcome, and an optional enumerated discard reason. Aggregate per-intent
outcomes enter the trusted prompt only after the server-configured sample threshold and only as a subtle
tie-breaker. Prompts, templates, screenshots, generated code, and full DesignSpecs never enter it.

## The alternatives path and the raw off switch

**LIVE.** The 2026-07-17 benchmark proved the harness a clean win on reliability, editability, overlaps
and cost (5/5 clean vs the baselines' 3/5, 0 overlaps, ~3x fewer output tokens, fastest).

- **Default (`AiSettings.useHarness` true): `generateAlternatives`** - one design-stage call (forced
  `emit_design_alternatives`) returns THREE genuinely different directions; each assembles like a single
  harness generation. The AI step offers the pick.
- **Off switch: `generateRaw`** - ONE model call with `RAW_SYSTEM` (format basics only, no taste
  teaching, no worked example), statically validated for display, NO bench and NO repair loop. **Keep
  this path pure:** it is the baseline the harness is measured against, and diluting it makes the
  comparison dishonest.
- **Preference learning (`preferences.ts`)** - the pick is staged on selection and COMMITTED when the
  project is created: aggregated shown/chosen facet counters, localStorage-only. `preferenceHint()` feeds
  the design prompt a SUBTLE tie-breaker only after ≥8 selections and ≥6 shows per facet; it never
  overrides the brief and never reacts to a single click.

## The quality gate (injected, not owned)

**LIVE.** The provider is UI-free: callers inject `GenerateOptions.validate` (an `SpxValidator`) - the
app wires `validateTemplate` + `benchTemplateRuntime` (`src/validation/runtimeBench.ts`: live-iframe
lifecycle, field binding, overlap/overflow, doubled-text stress, and the house editability contract).
Bench findings are teaching messages that drive repair rounds. A result that still fails is returned WITH
its validation attached - surfaced, never auto-applied. **Grounded assemblies get NO repair loop:** one
failing its own bench is a platform bug worth surfacing. On the free-form path the editability contract
is enforced deterministically first (`convertEmittedRegion`), so repair rounds only fire on FUNCTIONAL
findings.

## The safety screen (`safety.ts`) - what the code DOES, not whether it is correct

**LIVE.** Nothing in the quality gate asks what the generated JavaScript *does*, and the model does not
read only the user's brief: it reads uploaded REFERENCE IMAGES (text inside a picture is instructions to
a vision model) and, on modify/convert, a whole HTML file the user may have been handed by someone else.
`safetyFindings` screens the emitted JS for network calls, browser storage, runtime code building and
cross-frame reach, sharing its construct list with the community share gate
(`validation/templateBench.ts` `unsafeJsConstructs`) - one question, one answer, one place to update.

It blocks rather than warns because a generated template is EXECUTED automatically: the runtime bench
loads it the moment a result lands, before anyone has looked at it, in an iframe that today shares the
app's origin.

- **`withSafetyChecks`** wraps the INJECTED validator, so a finding reaches the repair loop.
- **`mergeSafety`** screens again where a result is SHOWN (AiStep's `showChange`, AIPromptPanel) -
  `generateRaw` validates itself and never runs the injected validator, so the screen meets that path at
  the consumer instead.
- **`source`** is the template a modify/convert started from, and only constructs the result ADDED are
  reported: a graphic already carrying a Live data or Show chat block legitimately calls `fetch()`. A
  generate passes no source.

Honest limit: a regex screen refuses the obvious, not the determined (`window['fetc'+'h']`). The
containment that would actually hold is denying the preview iframe the app's origin.

## The structured setup (`spec/` - the "More control" panel)

**LIVE.** The panel authors a `GenerationSpec` (schema in `src/model/generationSpec.ts` - MODEL layer,
because SavedProject/GraphicDoc persist it as `aiSpec`) that rides `GenerateContext.spec` as TYPED data,
never flattened into prose early. An empty spec injects nothing - the prompt-only flow is byte-identical.

- `spec/categories.ts` - the 20-entry AI CATEGORY registry: each entry links an `AssemblerId` and,
  where one models it, a `GraphicType` id (fields/machine/controls come from the type), plus suggested
  fields, workflow rules, and a machine hint. **Adding a category = one entry here + its id in the model
  union**; nothing else enumerates categories.
- `spec/specPrompt.ts` - deterministic prompt sections. Appended by `contextText`, so every path -
  including raw - reads the user's own decisions.
- `spec/specDesign.ts` - the pinning: `narrowedSpecTool` collapses the design-stage tool schema to the
  pinned category; `applySpecLocks` overwrites the model-emitted DesignSpec with the user's decisions and
  re-picks a chassis that can CARRY the user's line count; `applySpecOutPreset` applies an explicit exit
  preset as a real keyframe swap.
- `spec/specValidate.ts` - requested-field-present (ERROR, driving the coder's repair loop; demoted to a
  warning on grounded assemblies, where a fixed-contract category legitimately can't carry it and no loop
  exists), uploaded-font-used (warning = the honest fallback report), and `ensureSpecFonts` (uploaded
  fonts ALWAYS land as embedded assets + a visible `@font-face`, model or no model).

## What an uploaded picture is FOR (`model/imagePurpose.ts`)

**LIVE.** A dropped image carries FOUR unrelated intents wanting opposite treatment, so the user says
which; the vocabulary lives in the MODEL layer because VideoProject persists it.

- **`asset`** - "use it as it is". The ONLY purpose that bundles: a real file, referenced by path,
  exported. Rides `GenerateContext.images`. `fixedAssetPaths` says the operator gets NO field for it -
  permanent brand furniture rather than content.
- **`layout`** - "make one like this": composition, hierarchy, density, shape language; never the
  artwork. A SKETCH is a diagram of what to build, not a look to imitate.
- **`mood`** - "take the look and feel": colour, texture, weight, motion energy; layout ignored.
- **`plate`** - "make it work over this": the REAL background the graphic will sit on - never placed,
  never imitated, read for legibility and safe placement.

The last three ride `GenerateContext.references` as `{asset, use}` and are vision-only.
`attachmentSections` builds ONE numbered manifest plus a block per purpose present, and `imageBlocks`
sends the pictures in that order, so "attachment 3" means the same picture in the text and the vision
blocks. `modifyContent` reuses the same function. The preselect only ever guesses `asset` vs `mood`;
`layout` and `plate` are intents no pixel reveals.

**The as-is screen (`assetIntegrity.ts`)** is the protection "use it as it is" promises: a design putting
a filter, crop, mask, `object-fit: cover`, rounded corners or an uneven scale on a protected picture is
REJECTED. It reports through the injected validator (composed in `productionSpxValidator`, beside the
safety screen), so a violation reaches the repair loop rather than only the result card. Same honest
limit as `safety.ts`: it reads CSS text, not the resolved cascade. **It finds a protected picture by its
`<img src>`, so anything that bakes a `src` must run BEFORE it** - a gate that runs before the last
deterministic step measures a document nobody will ever see.

## The conversation is part of the brief

**LIVE.** `GenerateContext` carries two more typed inputs, both rendered by `contextText` (so EVERY path
reads them, including raw) and mirrored into `modifyContent` and the spec-refine prompt:

- **`conversation`** - the talk turns that led here, oldest first. A brief refined over three turns IS
  all three. **The caller bounds this** (the AI step sends the last 10 turns); the provider never re-reads
  a session.
- **`seed`** - "three more like this": the design spec of a direction the user picked. The design stage
  keeps its category, typographic voice and colour character and varies what is genuinely a choice. A
  starting point, never a template to return three tints of.

**`modify` takes a context** (`modify(prompt, template, context?, options?)`), which is what makes an
image attached mid-conversation real: the context reaches `toTemplate`, so the asset is BUNDLED, not
merely mentioned - a referenced-but-missing asset is the dangling-reference defect class that ships broken
exports. `contextFrom(template, outer)` merges the template's own images with the turn's attachments,
deduped by path. An attachment does NOT force the code level: the design stage sees the image and routes
to `custom` itself when the catalog has nowhere to put it.

## Telemetry & the value proof

**LIVE.** `telemetry.ts` records every run locally (stages, tokens from the API usage block, repair
rounds, route, diversity fields; localStorage ring, JSON-exportable). The VIDEO harness records through
the same ring (kinds `video-generate`/`video-refine`); consumers filter by kind, so SPX statistics never
mix with video runs.

- `scripts/ai-compare.mjs` - same brief, same model, four arms (raw / raw+self-critique / pre-harness /
  the harness), neutral scoring plus cost/latency/diversity. **The decision rule: each stage keeps its
  place only if it shows a clear improvement for its cost.**
- `scripts/ai-bench.mjs` - the single-arm brief bank + review gallery for prompt iteration.

Both need the dev server + a real key and SPEND TOKENS - never CI.

**Run `npm run bench:preflight -- <models>` before any paid round.** It is free, reaches no network, and
answers what the paid runner structurally cannot: given this `.env` and these candidates, what would each
arm ACTUALLY serve? `api/_lib/aiBenchPreflight.ts` resolves every arm through the REAL `liteProfile` +
task registry (never a model of their rules - a preflight that reimplements the server drifts from it and
then certifies runs the server will refuse), and refuses a plan whose arms are overridden, unapproved,
unconfigured, or not pairwise distinct. Each of those wasted a real round: they are invisible in the
OUTPUT, because a comparison whose arms resolve to one model still produces differences - sampling noise
reads as model character.

## The Lite SKIN and its vision JUDGE

**EXPERIMENT - both server-flagged OFF by default (`AI_LITE_SKIN_ENABLED`, `AI_LITE_JUDGE_ENABLED`). No
user reaches either; only the eval rig calls the judge, whose agreement with a human is 3 of 6, which is
chance.** Not strategy. Mechanics, thresholds and rulings: `docs/AI_LITE_BENCHMARK.md` (parked)
Appendix B. Verdicts and retry conditions: `docs/AI_ATTEMPTS.md`.

Three rules bind anyone touching the code even while the flags are off:

- **A skin can decline to land, never cost the user a working result.** Any failure - an illegal patch
  (`liteSkinPatchErrors`), a gate rejection, a failing bench - REVERTS silently to the spec's house
  chassis. With the flag off the schema, prompt and behaviour are byte-identical to before the skin
  existed, and a skin a model emits anyway is stripped server-side.
- **A skin may not use `clip-path`, because our checks measure LAYOUT and it changes PAINT.** Two skins
  lost their secondary line's last letter to an angled cut; the runtime bench read a perfectly placed
  box and passed, and so did the judge. `background-clip: text` stays legal.
- **The judge passes admission of its OWN** (`store.reserveJudge`, migration 0013): ownership, liveness,
  the per-generation cap (attempts, not successes) and the daily fleet ceiling are decided ATOMICALLY in
  one RPC under the same advisory locks `reserve_ai_lite_generation` takes, and the worst-case cost is
  BOOKED before the call. **A new paid Lite route repeats this shape** - the per-IP burst limiter is
  pre-body protection, never an entitlement.

## Import analysis - the proposal-only vision task (`importAnalysis/`)

**EXPERIMENT - flag `AI_TASK_IMPORT_ANALYSIS_ENABLED` off by default.** `imported-graphic-analysis`
(`docs/AI_TASK_REGISTRY.md`) assists the MANUAL Import Graphic flow and never replaces it: one
server-owned vision call proposes text regions, nearest BUNDLED fonts, and an animation preset.
`contract.ts` is the schema (font honesty: `matchQuality` cannot say 'exact', font ids enum-locked to the
seven bundled faces; rendered words are content, never instructions); `client.ts` downscales the artwork
to ≤1920x1080 BEFORE anything leaves the machine; `normalize.ts` deterministically clamps and converts
into `DesignFieldSpec`s - accepted suggestions apply through the exact transforms manual placement uses.
No second representation, no auto-apply, no code generation. E2E: `e2e/import-analysis.spec.ts` (flag-off
absence is mutation-pinned).

## NoaCG Pro - the design-language tier (`pro/`)

**LIVE since 2026-08-15 (hosted deployments where `AI_PRO_ENABLED` is on).** Pressing Create on the
Pro tier runs **ONE text call for a design LANGUAGE**, then the platform composes **every graphic
the user asked for** in it - a lower third, a sponsor bug and a countdown by default
(`pro/language/graphics.ts`, docs/NOACG_PRO_PLAN.md §15.9). The package is the tier's promise and
it costs what one graphic costs, because only the language is generated; the wizard's own picker
and the set-shaped Finish are src/components/wizard/AGENTS.md's. The composer:
`pro/brief.ts` maps the shared wizard brief onto it, `pro/language/pipeline.ts` is the one route
from the wizard to a Pro graphic, and `pro/language/gate.ts` is the one seam it is scored through.
The Phase A section below holds the four rules that bind the composer.

Three things this shape changed, all of them consequences rather than choices:

- **There is no browser cost ceiling on the live path.** `PRO_MAX_GENERATION_COST_USD` guarded a
  TWO-call pipeline - it existed to stop the second call once the first had spent the budget. With
  one call the money is already spent by the time a browser could refuse it, and throwing then
  destroys a finished graphic for no saving (the 2026-08-08 lesson). The server's `pro-generate`
  booking is the bound that still binds, against the same constant.
- **The ledger row carries WARNINGS as well as errors**, filtered to a `pro-` prefix
  (`proRuleCodes`). Errors stay unfiltered because an error is why a row says `failed`; warnings
  are filtered because the runtime bench is chatty by design and the wire caps the list at 30, so
  bench noise would evict the Pro-owned codes. Sending errors alone is what let a repaired graphic
  write an EMPTY `validation_rule_codes` beside `usable` (§16).
- **THE MARK IS KNOCKED, NEVER PLATED** (owner, 2026-08-16, after reading the first accepted Pro
  set - `docs/NOACG_PRO_PLAN.md` §17.1). A single-ink mark that measures under the contrast floor
  on the chosen panel has its ONE INK recoloured to white or black, whichever reads, and sits on
  the panel itself; a full-colour mark keeps its colours and waits for a well the DESIGN provides.
  **The platform paints no repair field at all any more.** The read that produced the rule is
  subtler than "no boxes": lt07's blue well and ls10's red well were both liked, because a well a
  design DRAWS is composition while a neutral field the platform paints around the artwork is a
  patch. `markTreatmentFor` still fires only on a measured single ink (`MarkProbe.inkSpread`), and
  a knock that cannot clear the floor is NOT applied - the mark is left exactly as supplied and
  `pro-mark-unreadable` says so, because recolouring somebody's logo to something still unreadable
  spends the alteration and buys nothing.
  **A knock is a `filter`, and the as-is screen refuses every filter on a protected picture** - so
  `assetIntegrity.ts` admits exactly one shape on exactly one platform-owned class
  (`…-logo--knocked`), with nothing else in the rule. Mutation-checked: a blur, a partial
  brightness, a drop-shadow, the same filter on another selector, and the knock smuggling a
  `clip-path`, `border-radius` or `object-fit: cover` beside it are all still blocking errors.
  Pinned by `e2e/pro-language.spec.ts`, which measures the emit through the REAL screen.

**The concept-and-reconstruct engine is DELETED (2026-08-15).** `pro/reconstruct/` held it behind
a build-time import boundary for one day, and both went in the same change once the last thing
reading it - a fixture bank, four `scripts/pro-*` runners and nine `e2e/pro.spec.ts` tests - had
somewhere else to be. The fixture bank was archived outside the repo first; the paid rounds that
produced it stay in `benchmarks/pro/round-2026-08-0{8,9,10}/` and in `docs/AI_ATTEMPTS.md`,
because they are the measurement Phase A rests on.

### What the retired engine measured, kept because Phase A rests on it

**RETIRED - the reconstruction path was PARKED on measurement (2026-08-08), replaced
(2026-08-15) and deleted the same day.** The concept stage worked and the compiler could not keep
what it designed: visibly broken on 5 of 12 while the gates reported 11 of 12 passing. The three
findings worth carrying forward, none of them about images:

- **A gate that measures the right dimension and DISCARDS the answer is a scoring bug.** The
  compiler's own `ProCompileReport.warnings` separated broken from usable on 11 of 12, and the
  bench computed `pass` without reading them. The same bug reached production a layer nearer the
  student: the first real hosted generation shipped a graphic printing its own words twice with
  `validation_rule_codes` EMPTY and the ledger row saying `usable`. That is why `pro/language/`
  has exactly ONE scoring seam (`gate.ts`) and why the ledger row now carries `pro-` warnings as
  well as errors.
- **No gate asked whether the compiled graphic RESEMBLED the concept**, so a wrong graphic scored
  `editability 1.00`. A deterministic gate cannot catch a defect in a dimension it does not
  measure - the doctrine at the top of this file, paid for here.
- **A control that does not execute the product path is not a control.** Two paid rounds were
  mis-read as model failure while the platform was at fault (`docs/AI_ATTEMPTS.md`), and for two
  months the product ran an engine the plan had already replaced while the composer nobody could
  reach scored 26 of 30.

**Lite and Pro are SEPARATE PROJECTS with different purposes and constraints (owner decision,
2026-08-09).** Pro is not the continuation of Lite and Lite is not a reduced Pro. Lite is a
managed, free, catalog-grounded profile whose constraints are cost per generation, quota safety
and control-panel operability, and whose open problem is SAMENESS. Pro's open problem is
CORRECTNESS. A change that serves one is not evidence for the other, they do not share a quality
bar, and neither's benchmark scores the other. What they DO share is deliberate and narrow: one
Create-with-AI entry point (`AiSettings.tier` picks lite/pro/custom), one user-facing brief, and
one deterministic mapping seam - `pro/brief.ts` maps that shared brief onto the design-language
call so there is no parallel brief vocabulary. That is a UI and contract economy, not a shared
strategy.

**A Pro generation is capped at `PRO_MAX_GENERATION_COST_USD` = $0.15** (`pro/contract.ts`),
booked by the server's `pro-generate` reservation. The number was sized against the retired
engine's measured $0.0777; Phase A measures $0.0039, so it is now loose by roughly 38x and
catches only a runaway - stated in the constant's own note rather than quietly retuned, because
too low a ceiling destroys a finished graphic somebody was already billed for. There is no
browser ceiling any more: with one call the money is spent before a browser could refuse.

**HOSTED Pro is a server BOOKING** (`AI_PRO_ENABLED`, default off; `docs/AI_TASK_REGISTRY.md`).
`src/ai/pro/session.ts` opens ONE reservation per generation (`POST /api/ai/pro-generations`) and
the pipeline forwards `proGenerationId` on every model call; `/api/ai/generate` admits each call
against it and settles the provider's real cost into `ai_generations` (migration 0044). **A
`session` of null is the bring-your-own-key and offline-stub path, unchanged** - a caller
spending their own key is never metered.

**A FLEET SLOT FOLLOWS THE WORK, NOT THE CLOCK, and that is what makes Pro usable by a class.**
Thirty students press Create within seconds of each other. Two things were wrong together: the
reservation answered `shared_capacity` on its first observation, and it booked the slot for the
profile's whole 15-minute expiry - so most of the room got an error, waiting on slots that did
not turn over. Now the admission RETRIES the shared slot with jitter (`reserveProCapacity`,
Lite's shape), and the reservation is taken on a lease covering ONE call which every settled call
renews (`proCapacityRetryPlan`, migration 0046). A live generation keeps its seat; an abandoned
tab frees it within a lease instead of a quarter of an hour. **Only the fleet slot is retried** -
a quota, the user's own overlap, the spend ceiling and a duplicate are durable answers, and
re-asking them would just spend the classroom's request budget.

**The retry SPACING follows the first measured turnover** - 62 s for a real slot cycle, so the
default is ~31 s (half the cycle, Lite's rule; three attempts straddle one full turnover).
`AI_PRO_RETRY_SPACING_MS` moves it without a deploy, and `/api/ai/pro-outcome` keeps recording
`runtime_ms` so the number keeps following the fleet.

**AN UNSPENT RESERVATION IS RELEASED, so infra failure costs no allowance and no fleet budget.**
A reservation books the whole $0.15 ceiling; only the first SETTLED call replaces it with real
spend. A run with ZERO settled calls (a 503, a timeout, an abandoned tab) provably paid for
nothing - `pro_call_count` is server truth - so once it is terminal or its lease runs out it
stops counting toward the daily starts and the fleet spend sum (migration 0049 in
`ai_task_usage`; the same rule mirrored in the memory store, and `/api/ai/pro-outcome` zeroes
the row and expires the reservation on `failed`). A run with ANY settled call keeps its start
and its real cost - a validation failure spent real money and counts. The browser adds ONE
bounded in-session retry on a provider outage only (`shouldRetryModelCall`, modelTypes.ts):
safe because an unsettled call left the reservation's budget untouched, and a retry is a new
admission against the SAME booking - never a re-POSTed reservation
(`api/_lib/pro/reservationAccounting.test.ts` pins all of it, both directions).

**`PRO_STANDARD_ROUTES` (`pro/contract.ts`) is ONE route, pinned so a normal Pro user never picks
models**, and `api/_lib/aiProProfile.ts` funds exactly that one. **The funded list is ANDed by
`resolveProGate`** - every entry must be priced, catalog-approved and not switched off from
`/admin`, or hosted Pro is unavailable to everyone - so a route the product does not spend on is
a live foot-gun rather than a harmless leftover. It carried the retired image route until
2026-08-15, where disabling a model nothing called would have taken the whole tier down. Do not
add a route Pro does not spend on. The audited image entry stays in `aiModelCatalog.ts` as an
audit record and is marked in use by nothing.

## NoaCG Pro PHASE A - the design language (`pro/language/`)

**LIVE since 2026-08-15 - this is what a Pro user gets.** The premise change in
`docs/NOACG_PRO_PLAN.md` §15: **the platform owns each graphic type's structure and spacing, and
the model's entire contribution is the design LANGUAGE** - palette, type scale and weight, shape
and corner language, accent form and weight, density, motion character. Three paid rounds moved
the owner's verdict 6 → 7 of 12 while every machine measure improved, and all five remaining
failures were panel layout; §15.3 ranks what has ever moved a rate (asking for judgement moved
nothing, a boundary moved a lot, **removing the decision** moved most and stayed removed).

Five rules bind anyone editing it:

- **ONE ENGINE, AND THE PRODUCT IS ON IT.** `pipeline.ts` is the only route from the wizard to a
  Pro graphic and `gate.ts` the only seam a composed graphic is scored through - product, bench
  and control alike. Both exist because the alternative was measured: for two months the product
  ran an engine the plan had already replaced, and the composer nobody could reach scored 26/30
  while the live one shipped a graphic printing its own words twice.
- **THERE IS NO NUMBER IN THE MODEL'S ANSWER.** `contract.ts` is enums, four hex colours and a
  bundled font id. A geometry field would be a panel decision wearing a different name, and the
  five failure classes would come straight back through it. `normalizeDesignLanguage` never fails
  and never invents: every field is one of the values the schema offered or the house value, so
  the composer downstream has no defensive branches.
- **THE PLATFORM COMPOSES IN THE UNITS THE INSTRUMENTS MEASURE IN, WHICH MAKES EVERY MARGIN
  KNOWABLE - NOT CLEAR.** Every size in `structure.ts` is a ratio of the primary type size, the
  same unit `spacingCheck` and `proportionCheck` report in, so the file can state a margin against
  each threshold and one free sweep can check it. **`node scripts/spike-structure-margins.mjs` did
  (2026-08-16, 582 compositions, 1164 readings) and nine of the eleven stated margins moved**
  (docs/NOACG_PRO_PLAN.md §18): a DERIVED ratio is the CSS the composer wrote, not the box the
  browser painted, and leading, the mask idiom, a size floor firing above its anchor and a
  fit-content panel all move it. `text-crowds-rule` was stated at 0.45 and measures 0.14 - the
  `block` accent's slab is a rule too, and the gap to it is the LINE gap, not `RULE_GAP_RATIO`.
  **`footprint-large` is BREACHED** at the stress words (0.14 against a 0.10 ceiling, on 59 of the
  162 strap stress readings that have a footprint, and none at the control's words); the
  instrument reports and does not gate, so what changed is that the file no
  longer claims a margin it does not have. `padding-lopsided` and `text-escapes-panel` are the two
  that hold - opposite sides are equal in every declaration, and no text escaped its panel in any
  of the 792 readings that have one. **State a margin only with the frame that produced it.**
- **IT COMPOSES THROUGH THE CATALOG'S OWN ASSEMBLER.** `compose.ts` builds a real `TemplateVariant`
  through `defineVariant`, so a Phase A graphic inherits the `:root` contract, the auto-fit
  `width: fit-content` box (**which is why text can never escape its panel**), the mask idiom, the
  NOACG_ANIM region, the SPX definition, the shared logo slot and export readiness. §16 is the
  argument: Pro's own document-building lost a GOOD panel in reconstruction.
- **THE CONTROL RUNS THE CODE UNDER TEST.** `stub.ts`'s four hand-written languages go through
  `composeFromLanguage` - the identical function a model answer will - and ride the spike's free
  pass (`languageAnchors`, `node scripts/pro-spike.mjs --control`), measured by the same
  instruments a paid round is scored by. A control that does not execute the path is not a control,
  and this repo has paid for that finding three times.
- **AN INSTRUMENT MEASURES THE BOX ITS QUESTION IS ABOUT, and the two mark boxes are the
  precedent.** `spacingCheck` reported the mark's clear space off the `<img>`'s BORDER box, so a
  design expressing that clear space as image padding had it counted as zero. An instrument whose
  false positives are the good designs is one authors learn to ignore, which is worse than no
  instrument. It now measures the INK (`markContentRect`, inset by padding and border), and
  `proportionCheck` deliberately does NOT follow: `mark-oversized` asks how much ROOM the mark
  takes and a padded well takes all of it, which is also what `MARK_SCALE_CEILING` is calibrated
  on. Two questions, two boxes, each stated where it is read.
  **Measured over all 24 mark-capable lower thirds with a square crest**
  (`node scripts/spike-mark-clearance-sweep.mjs`, which reports the border-box control and the ink
  reading off ONE render): exactly three designs move and all three move up - lt07 0.22 -> 0.36,
  lt41 0.31 -> 0.52, ls10 0.25 -> 0.56 - and the other 21 are byte-identical, because only those
  three pad the image itself. lt07 was the only reading the artifact was pushing under the 0.25
  floor. **The absolute ratios depend on the MARK**, since a slot that sizes itself from the
  artwork's aspect paints a different height for each one; the set that MOVES does not.
- **THE MARK-GAP UNIT IS THE PRIMARY TYPE SIZE, and it used to be the mark's own height - which
  divided a design by its own generosity.** Under the old unit ls18 was called crowded at
  **22px** of clear space while lt08 passed at exactly 22px, and ls25 at **30px** while lt15
  passed at 26px; in both pairs the flagged design had the same or a LARGER gap and a much taller
  mark (135px and 130px against 75px and 84px). Neither was a spacing defect - ls25 is a
  `picture` well holding square cover art, ls18 stretches an institution's mark to the height of
  the card - and this file's own doctrine is that an instrument whose false positives are the
  good designs is one authors learn to ignore. **Recalibrated 2026-08-15 against the catalog**,
  the way `spike-spacing-calibrate.mjs` requires and the way every OTHER ratio in `spacingCheck`
  already worked: floor **0.35** type sizes (under the catalog's tightest shipped pairing, lt08
  at 0.41, and inside a real gap - the next reading is 0.45), ceiling **2.1** (the same ~1.3x
  headroom over the widest shipped lockup, lt54 at 1.61, that the old ceiling carried). In type
  sizes the 24 mark-capable lower thirds run 0.41-1.61 and neither previously-flagged design is
  an outlier: ls18 is 8th of 24, ls25 is 13th. The unit also clusters far tighter - p95/p05 is
  **2.9x** against the mark-height unit's **4.3x**, and a distribution spread four-fold has no
  floor to put under it. **Nothing is lost by dropping the mark's height as the unit**, because
  `proportionCheck`'s `mark-oversized` still measures it (ceiling 3.2, on the BORDER box), so a
  design cannot dodge the gap floor by growing its mark - it hits that ceiling instead. The
  finding now carries all three raw numbers (`22px from 43px type, mark 135px`).

## The TASTE instrument (`spike/tasteCheck.ts`) - the owner's six rules as numbers

**EXPERIMENT, bench-only** (the same deletion condition as the four instruments beside it,
`spike/exemplars.ts`). Driven by `scripts/pro-taste-rejudge.mjs`, which is FREE: it mounts saved
code from finished rounds and measures it, so a rule written today can be tried against every
round already paid for at zero cost. The full account, with the numbers, is
`docs/NOACG_PRO_PLAN.md` §25.

The six rules are the owner's own, from the 2026-08-19 galleries: (1) a mark inside a container is
centred in it, (2) a mark between an accent line and text is optically balanced, (3) secondary
text has a floor too - measured as the SMALLEST INFORMATIONAL line, because read as "the second
line" it was null on every one-line graphic the owner used to state it, (4) weight and contrast
are part of legibility rather than separate from it, (5) a mark never eats primary real estate,
(6) a package's mark is on every piece or none.

Three properties are the ones to keep in mind before touching it:

- **It reports; three of the six additionally carry NO pass/fail, and all three are CLOSED
  questions rather than pending ones.** Rule 2 because the owner stated it is conditional
  ("sometimes it can work, and that's kind of the problem"); rule 3 because **the owner declined
  the floor on 2026-08-22** - the corpus's smallest secondary reading is 26px, so the only floor
  that could change anything sat above it, and a floor read off the catalog asserts that the
  catalog is right; rule 5 because placement has no rule. Inventing a threshold to settle any of
  the three would replace the measurement with the opinion the instrument exists to remove. **Do
  not re-open rule 3 with a better number** - the question was never the number.
- **Rule 1 asks each axis separately, and that is not a refinement - it is the rule.** Measuring
  both axes of the mark's smallest surface ancestor calls eight shipped catalog designs 0.84-0.96
  off centre, because a mark docked at one end of a strap is off-centre in the strap by
  construction; restricting the container to one holding the mark alone then loses the owner's
  actual case, the sponsor-bug tile that also carries "ON AIR". What is measured is the axis the
  FLOW did not decide, and flow peers are painted TEXT only - counting an accent bar as a peer
  suppressed the exact case the rule exists for.
- **A rule that fires on a shipped design is a question, not a threshold to move - and the owner
  answers it.** Rule 5 fired on Pro's sponsor bug across nearly the whole corpus, so it went to him
  rather than into a per-type override. He ruled the STACK legitimate (2026-08-20), the rule was
  rewritten around the horizontal question inside "it should be on the same row as the text", and
  the day after - when a countdown gained a mark and it fired on 12 of 18 - he ruled the whole
  question out: **"I cannot give you hard rules on where to place a logo. It depends on the
  design."** Rule 5 now mints NO finding, the third of the six to carry no pass/fail.
- **A THRESHOLD CAN BE PERFECTLY CALIBRATED AND STILL ASSERT SOMETHING ITS AUTHOR DOES NOT
  BELIEVE**, and the withdrawn rule 5 is the case to remember. It was read off the catalog, quiet
  on the whole corpus, mutation-checked, and it re-flagged nothing it should not have - and it was
  still wrong, because "a mark takes a row of its own only when the width leaves it no choice" is a
  placement rule. Measuring well is not the same as being entitled to judge. Before adding a
  threshold, ask whether the owner holds the RULE, not whether the number fits the data.
- **Rule 5 does NOT re-ask crowding either, and the first attempt at the rewrite is why.** Measured
  in the mark's own height it re-flagged `ls18` - the design `spacingCheck`'s own mark-gap
  recalibration had just cleared. `spacingCheck` owns the gap in the ratified unit; a second
  opinion here is a duplicate or a regression. What rule 5 contributes now is the ARRANGEMENT and
  the width that allowed it (`stacked`, `besideSlackPx`, `bandFill`) - the numbers a PLACEMENT
  decision reads. `scripts/spike-taste-rule5-reading.mjs` (free, one page) proves that geometry
  discriminates: same stack, +502px of room beside against -512px, and no finding on either.

Rule 4 reads its NUMBERS through `validation/readabilityCheck` rather than measuring weight or
contrast again, and compares them against **its own three owner-ratified floors** (2026-08-20):
contrast 3.25:1, weight 500, and 28px for a secondary line. It used to pair that instrument's
`text-under-weight-floor` and `text-low-contrast` FINDINGS, which are the ratified table's
verdicts - right while the table agreed with the owner, and silent on all four rows he named the
moment it did not. **The 28px is an eligibility floor, never a third axis to fire on**: every lower
third in the corpus sets its role line at 26px, so firing on it would light up all 36 rows, and a
rule that fires on everything reports nothing. One measurement, one place; only the threshold is
this file's.

## Phase-C creative pilot (`creative/`)

**RETIRED 2026-08-09 (owner decision): Creative Mode is superseded by NoaCG Pro and is no longer carried
as a parallel architecture.** Both existed to answer "the model proposes the appearance, the platform owns
the engineering"; Pro owns that question now, and two live experiments asking it separately is how the
answers come to disagree. `docs/CREATIVE_MODE_PLAN.md` is a RETIRED record to MINE, never a plan to
continue - its reusable mechanisms and their measured rulings are listed in that file's banner and in
`docs/AI_ATTEMPTS.md`. **Nothing in the product reaches this code**: no UI, no route from `claudeProvider`
into it, and its only caller is `scripts/creative-pilot-bench.mjs`. Removing it is a separate, deliberate
change - and `scripts/creative-route-bench.mjs` plus `e2e/creative-routing.spec.ts` are NOT part of it,
because they cover the LIVE Phase-A routing stage.

Two rules reach outside the pilot and bind here:

- **THE CUSTOM CODER IS THE BENCHMARK CONTROL: its catalog example, `designNotes` and repair policy stay
  byte-identical, and routing changes WHICH briefs reach it, never what it is shown.** The freeze on its
  SYSTEM PROMPT was lifted for exactly one edit - the ratified corpus motion numbers, which a control
  cannot keep contradicting once it is also production code. **Arm A results from 2026-08-02 and earlier
  are therefore not comparable with later rounds; re-baseline the control rather than reusing them** (arm
  B reuses `coderSystemPrompt`, so it moved too). No further prompt change without the same explicit
  trade written down.
- **The anti-anchoring rule is absolute: no catalog design code reaches any CREATE prompt.**
  `neutralSkeleton.ts` is what the coder arm studies instead. Free coverage:
  `e2e/creative-pilot.spec.ts`.

## Other files

**LIVE.**

- `modelTypes.ts` + `modelGateway.ts` - the provider-neutral model-call contract and browser client. The
  server adapters in `api/_lib/aiGateway.ts` implement Vercel AI Gateway (the MANAGED transport, and the
  only one NoaCG funds), plus Anthropic, OpenAI Responses, Google's OpenAI-compatible surface and
  compatible Hugging Face Inference Providers as bring-your-own-key routes - without branching the
  harness. A new BYO-key adapter is modelled on the Hugging Face one: same chat-completions shape, same
  parser, no second structured-output dialect. Retention is TWO filters, ANDed by the
  gateway: `disallowPromptTraining` is free on every plan and pinned on for every managed call, and
  `zeroDataRetention` is the Pro/Enterprise superset - so a task requiring ZDR fails closed with
  `zdr_unavailable` rather than degrading quietly. The per-request price cap OpenRouter enforced has no
  gateway equivalent and now lives entirely in the approved-catalog snapshot and each task's cost booking
  (`docs/AI_PROVIDER_GATEWAY.md`). `modelCatalog.ts` reads only the normalized server discovery endpoint.
  Structured output, usage, costs, errors, retries and explicit fallbacks normalize here. `cacheSystem`
  remains an Anthropic hint.
- **A ROUTE IS REACHABLE IN DEVELOPMENT BECAUSE THE TREE SAYS SO, never because a list does.**
  `scripts/aiDevPlugin.mjs` mounts the real `api/ai` handlers, and it used to decide which paths
  existed from a hand-kept allowlist. That list hid a whole surface three times: the
  imported-graphic-analysis task shipped with no entries, hosted Pro was a dev 404 in every dev
  server and the entire e2e suite while production served it (so `loadProStatus` read "this
  deployment has no Pro" and the door never appeared locally), and `/api/ai/consent` had never been
  routed at all. It is gone. `scripts/apiRouteTable.mjs` derives the function table from the api/
  tree and applies the deployment's own measured rule - a `[...path].ts` routes exactly ONE segment
  - so an unknown NAME is answered by the real dispatcher in its own error vocabulary and an
  unroutable DEPTH is refused exactly as the platform refuses it. `npm run check:api-route-depth`
  certifies every `/api/` path our client names through that SAME resolver, so the gate and the dev
  server cannot hold different opinions. **Every other AI spec mocks these routes at the network
  level, which is why none of the three defects was ever caught** - `e2e/ai-dev-routes.spec.ts`
  deliberately does not mock, and is the only thing here that proves a route is reachable.
- `stubProvider.ts` - the offline provider: keyword -> DesignSpec -> the SAME `specToTemplate` pipeline, so
  offline results are catalog-grade. It honors the structured setup through the same `applySpecLocks`/
  post-passes, which keeps the whole More-control flow e2e-testable without tokens.
- `settings.ts` stores only non-secret provider/model/routing preferences and server-reported credential
  availability. Raw keys never enter localStorage. `index.ts` (`getAiProvider`), `brainstorm.ts`,
  `examplePrompts.ts` and `presets.ts` keep their existing roles.

The binding gateway and key-handling contract is `docs/AI_PROVIDER_GATEWAY.md`. Provider adapters never own
DesignSpec, validation, repair, preference learning, or graphic-type context. New providers enter below
`AIProvider`, never beside it.

The versioned video matrix and brief bank live in `benchmarks/video/v1`; its runner must drive
`src/ai/video` through the application, never call a model with a benchmark-only prompt pipeline. The
binding experiment and artifact contract is `docs/VIDEO_MODEL_BENCHMARK.md`.

**Deferred (benchmark-gated, deliberate):** a selective vision taste critic (free-form path only,
evidence-based findings, never auto-rewriting a valid grounded result), a curated taste library with
per-brief retrieval, and a nightly taste-analysis task producing reviewable proposals. Add them only when
the compare rig shows they pay for themselves.

## A harness bug reads as model incapacity - state which faults were live in any round

Two consecutive PAID Creative Mode rounds (2026-08-02) produced numbers that looked like the model
could not design. Both were platform faults:

1. **Structured output refused for being ENCODED, not wrong.** Anthropic tool use returns a nested
   array as a JSON string, sometimes re-wrapping the whole tool envelope inside the property
   (`{"concepts":"{\"concepts\":[…]}"}`). `api/_lib/aiGateway.ts` schema-checked it, called it
   `malformed_response`, and retried to exhaustion. 7 of 8 briefs died with three usable design
   directions sitting in every rejected payload. Fixed by running `decodeStructuredOutput` BEFORE
   validation - which had also been breaking every BYO-Anthropic user in the product, not just the
   bench.
2. **A style patch giving `.creative-box` `position: absolute` collapsed the root to 0x0.** The
   root is absolutely positioned in its zone and sized by its content, and the box is its only
   in-flow child. Sonnet did it in 8 of 8 stylesheets (blank frames); qwen in 4 of 8 (content
   survives, re-anchors to the collapsed root, drifts to the frame edge). Fixed by
   `keepStructureInFlow` in `src/ai/creative/style.ts`.

**The second one retro-invalidated a human verdict.** The owner's blind review that evening judged
frames of which half carried the bug, and its "content on the frame edge" note was the bug, not
taste. So: **any conclusion drawn from a round must state which platform faults were live during
it**, and a round whose harness changed underneath it is not comparable to one that ran before.

The general form is the same as the runtime bench's (`docs/VERIFICATION.md`): check the instrument
before concluding anything about what it measured.

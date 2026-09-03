# The NoaCG Design Rules program - legible, robust, airable by measurement

Status: RATIFIED PLAN 2026-08-18 (owner's brief + the custom-lane type-sweep read,
docs/NOACG_PRO_PLAN.md §22). The owner's full brief is the source of intent; this plan maps
it onto the architecture that exists and sequences it. **The typography numbers are OWNER
CONSTANTS - a follow-up owner prompt supplies the final table, and the catalog audit (R1)
supplies the evidence to calibrate it against. Nothing hard-enforces until both exist.**

## 0. What this is, in one paragraph

AI generation must stop producing graphics that look good in a preview and fail on air. The
fix is not more prompting: it is ONE canonical rules module that prompting, validation,
instruments and tests all read; a render-measure-repair loop that already exists
(`src/ai/spike/iterate.ts` - keep it, extend its instruments); an audit of the shipped
catalog before anything hard-enforces; and a blind re-read as the only accept gate. The
system constrains FAILURE, never style (owner brief §15): a decorative 1px highlight is
legal, a 1px functional divider is not; a small decorative label is legal, an unreadable
score is not.

## 1. What already exists (do not rebuild - the brief's own instruction)

| Brief item | Existing piece | Gap |
|---|---|---|
| §13 generate→render→inspect→repair | `iterate.ts` + `pro-iterate-spike.mjs`: render, instruments, findings+screenshot fed back, max 4 rounds, fail-closed | Stress frame captured but NOT fed; steps get paint-only checks |
| §9 stress testing | `runtimeBench` doubled-values stress + fixture `stress` values | Fixture stress harsher than bench doubling and unfed; missing zero/empty/Nordic cases |
| §12 robustness | `validateTemplate` + `benchTemplateRuntime` (lifecycle, binding, overlap, overflow, replay, fonts, runtime errors) | Console-error capture partial |
| §2 typography floors | `readabilityCheck.ts` (18px + 3:1, calibrated to catalog min), `scripts/type-floor.mjs` (catalog type-size gate) | Fixed px not % of reference; no roles; no profiles; floor below owner's bar |
| §6 contrast | `readabilityCheck` contrast vs resolved backing; mark legibility gates | Unknowable backing = silence; no protection requirement over video |
| §7 safe area | mark `outside-safe-area` finding; catalog 119px edge convention | Fields/critical text not checked, only marks |
| §14 hard vs warn | blocking/advisory split in the sweep runner | The split leaked: collisions were demoted on uncalibrated types (§22.1 escape 1) |
| §16 one source of truth | `GRAPHIC_METRICS`, per-type `PRO_GRAPHICS.instruments` | No canonical cross-surface rules module |
| §17 audit | `type-floor.mjs`, `overflow-sweep`, `l3-sweep` patterns | No rules-audit sweep |

## 2. The canonical module: `src/model/designRules.ts`

MODEL layer (pure, no DOM, importable by validation, ai, templates, wizard - the
entitlements/feedback precedent). Everything below reads it; nothing copies its numbers.

- `referenceSize(w, h) = min(w, h)` - all rules scale off the short side (brief §2).
- **Roles**: `primary` (names, scores, clocks, headlines) · `secondary` (titles, captions,
  context) · `fine` (sources, fine print - discouraged, floor-checked) · `decorative`
  (exempt from size floors, still contrast-checked if it carries words).
- **The size table is the owner's** - filled from the owner's follow-up prompt, stored ONCE
  here as % of reference, with the R1 audit as calibration evidence. Seed values from the
  brief (5% normal / 4% secondary floor / 6-10% primary) go in as `PROPOSED` and the audit
  report states per number: how many shipped designs and how many owner-passed sweep cells
  it would fail. **Evidence already in hand, stated so the owner calibrates with open eyes:**
  the read PASSED supporting lines at 20-22px (1.9-2.0% of 1080) and FAILED 11-17px
  (1.0-1.6%); the shipped catalog's supporting lines run 20-27px; Phase A's accepted set
  ~26px. A hard 4% (43px) secondary floor fails every shipped design and the accepted Phase
  A set. Likely landing zone: primary ≈5%+, secondary floor ≈1.9-2.5%, fine-print hard floor
  ≈1.6-1.7% - but the OWNER's table decides, not this paragraph.
- **Viewing profiles** (brief §1/§3): `tv` 1.0 · `streaming` 1.1 · `mobile` 1.25 · `venue`
  (v1: alias of tv + a note; distance math deferred per brief §19) · `custom` (free-text
  note carried to the prompt, multiplier tv). Internal only in v1 - no wizard UI until the
  rules survive a read (sequencing critique below).
- **Weight floor** (brief §5): computed weight ≥400 informational; ≥500 when under a size
  threshold or over video. No font-perception engine v1.
- **Stroke floor** (brief §10): functional strokes ≥0.28% ref (~3px@1080). WARN v1 -
  functional-vs-decorative is not deterministically decidable, and the house style ships
  deliberate hairlines (DESIGN_LANGUAGE.md); the audit measures the catalog before any
  hard-fail.
- **Safe area** (brief §7): 5% inset (96/54px @1080). HARD for field-bound text and marks
  (catalog convention is 119px - comfortably inside, so this breaks nothing shipped);
  decoration exempt.
- **Contrast + protection** (brief §6): 4.5:1 normal / 3:1 large against a resolvable
  backing. NEW: text whose backing is unknowable (transparent stack over video) must carry a
  protective treatment - panel, shadow, outline, gradient - detectable from computed style.
  WARN v1: the owner PASSED a panel-free minimalist anchor (lt27), so a hard fail would flag
  an owner-passed design on day one; audit calibrates.
- **Informational vs decorative classification** (brief §15): field-bound text (`#fN`) and
  its adjacent labels = informational, always. Standalone static text = informational when
  above a size/position heuristic, else decorative-with-warning. Stated limitation, not
  hidden.
- Prompt text is GENERATED from this module (`designRulesPromptBlock(profile, format)`) and
  rides the USER message - never the frozen coder system prompt (benchmark control,
  src/ai/AGENTS.md). One module, zero drift (brief §16).

## 3. The loop fixes the read paid for (docs/NOACG_PRO_PLAN.md §22.1)

1. **Collision findings block on EVERY type** - a collision is binary, not a calibrated
   threshold. text-over-rule, text-over-text, mark collisions: never advisory again.
2. **Instruments run on EVERY step frame** - the x25 class (steps growing misaligned,
   final step overflowing the background) must be unpassable.
3. **The fixture stress frame's findings FEED the loop** (x35/x37) - and stress fixtures
   grow the brief-§9 cases: zero values, empty optionals, Nordic/accented text, all-caps.
4. **Step advance measured by markup diff**, not next()'s return value (the drive-proof
   lesson - two cells called broken drove fine).
5. **Near-miss de-noise**: alignment near-misses under a tolerance dedupe into one grouped
   advisory finding; the owner named ZERO of them across 49 items while they burned whole
   repair rounds on quiz/podium grids.
6. **No model-placed logos** on custom-lane types (owner ruling §22.1): `includeLogo: false`
   across the custom bank; the platform owns mark placement (the Phase A knock rule). Brand
   still conditions palette/type/world.
7. **Ticker margins rule**: full-bleed or equal insets both sides - measurable, blocking.
8. Readability floors move to designRules (roles + % + profile) - replacing the fixed 18px.

## 4. The vision critic - calibrated before trusted (brief §8's honest home)

Hierarchy, density, balance, "crowded" - subjective, so NOT deterministic gates (brief §14).
The instrument is a cheap vision-model rubric judge, and we hold something rare: **49 owner
verdicts on archived frames** (`typesweep-blind-final-2026-08-18`). Calibration is offline
and costs ~$0.20-0.40: run the judge over the archived holds/steps, score precision/recall
per rubric question against the owner's read. Wire in ONLY what scores well, as ADVISORY
first. The Lite judge precedent (3/6 = chance) was an aesthetics judge; this one answers
binary defect questions (line on text? plate under logo? one focal point?). If it
calibrates at chance again, it stays out - twenty cents to know.

## 5. Sequencing (each phase gates the next)

- **R1 - foundation + audit, free.** designRules.ts (PROPOSED numbers + owner table when
  given), loop fixes §3, protection/weight/stroke/safe-area checks, mutation controls for
  every new check (the standing rule: a check enters the feed only after its control is
  loud on a broken fixture and quiet on shipped designs). Then `scripts/design-rules-audit`
  (extend type-floor/l3-sweep patterns) over the FULL catalog + the archived sweep frames:
  per rule, per threshold - how many shipped designs fail, how many owner-passed cells
  fail, how many owner-failed cells it would have caught. Report lands in
  `benchmarks/design-rules/AUDIT-<date>.md`. **Owner ratifies the number table on that
  evidence** (brief §17 - and its "explain before altering the standard" clause is
  satisfied by the audit report, both directions).
- **R2 - critic calibration, ~$0.30.** As §4. Output: precision/recall table + include/skip
  decision per rubric question.
- **R3 - the re-read round, ~$4-5, gemini-3.7-flash ONLY.** Same 21 briefs (fresh eyes come
  from rules, not new briefs - comparability with §22 is the point), no logos, profile
  pinned `tv` in fixtures, new instrument set, critic advisory if calibrated. Blind page
  with the same anchors + step frames; owner read is the verdict. Target worth stating: the
  §22 gate leaked 12 airable of 24 delivered-clean; the re-read should put delivered-clean
  ≈ airable. Minimax stays out (3/21 - capability, not rules); a later 3-brief probe may
  re-audition it.
- **R4 - productize, only after the read.** Viewing-target choice in the wizard (single
  select, project-level, default TV; format/aspect stays separate - brief §1), rules block
  into Lite + Phase A prompt surfaces, product validator runs the new checks WARN-FIRST on
  catalog/imported/community templates (brief §16/§17), migration notes for any catalog
  design the ratified numbers indict, docs (DESIGN_LANGUAGE.md cross-reference), e2e pins:
  node tests for the pure math (the worktree-safety pattern - there is no app unit suite),
  a spec for the audit gate, representative 16:9/9:16/1:1 rule scaling checks.

## 6. Explicit critiques of the brief, so they are decided rather than buried

1. **The 4%/5% floors vs your own read** - see §2. Your stated secondary floor fails every
   shipped supporting line including designs you passed blind this morning. The audit
   quantifies it; your table decides it. (Brief anticipates exactly this - §17, final note.)
2. **Viewing-target UI is R4, not R1** - the brief puts it first; building UX before one
   round proves the rules invites rebuilding it. Internal profile constant first.
3. **Protection-over-video and stroke floors start as WARNINGS** - each would flag
   owner-passed or house-style designs today; hard-fail only what the audit + your table
   confirm.
4. **§8 density/hierarchy stays out of deterministic gates** - critic + prompt guidance,
   per the brief's own caveat. The calibration set makes this cheap to test honestly.
5. **§13's pipeline is already built** - the delta is instruments and feeds, not
   architecture. Anything that proposes a second loop gets rejected in review.
6. **Venue profile is a stub v1** - distance math deferred (brief §19 allows).
7. **Rules never enter the frozen coder system prompt** - user-message block generated from
   designRules.ts; the benchmark control stays a control.

## 7. Definition of done (round-scoped, from the brief's own list)

The R3 read answers the brief's checklist question-for-question: sizes, weight, contrast,
safe area, hierarchy, density, stress survival, strokes, motion-readability, output-env
function, screen suitability. Success = the fail-closed gate's DELIVER signal agrees with
the owner's read (delivered-clean ≈ airable), with zero collision-class or size-class
escapes. Then R4 makes the rules a permanent property of every generation surface.

## 8. R4 landed - 2026-08-18, under the ratified severity policy

The owner's severity ruling (2026-08-19): **HARD where the MACHINE decides, WARNING where a
HUMAN decides, and moving between them is an explicit, visible act.** What shipped:

- **Per-project legibility settings** (`ProjectLegibility`, model/designRules.ts): viewing
  target `{profile, note?}` plus ONE tri-state `floors: 'relaxed' | 'safe'` (absent =
  standard) - the "Broadcast text sizes" toggle OFF is 'relaxed', the "Guaranteed readable
  size" checkbox ON is 'safe'; they are mirrors and the interlock lives in the shared
  wizard control. Persisted as additive optional fields on SavedProject and GraphicDoc
  (`legibility`), and the DEFAULT state serializes to nothing. Venue stays a tv-alias stub.
- **Wizard UI** (`components/wizard/ViewingControls.tsx`): the viewing single select +
  both toggles, on the Style step (catalog walk) and the Create-with-AI step. Format/aspect
  stays its own control. A custom profile carries a free-text note to the prompt.
- **The prompt block rides every product generation**: `GenerateContext.legibility` ->
  `contextText` renders `legibilityPromptBlock` on the USER message. Relaxed floors state
  honestly that the customer chose a denser scale - a paper trail, never a silent bypass.
- **The product validator warns first, everywhere**: `readabilityCheck.ts` and
  `tickerCheck.ts` MOVED from the spike into src/validation (one instrument for loop and
  product; the spike runners import the new path), and `designRulesWarnings.ts` phrases
  their structured findings as plain-language warnings naming the viewing profile
  ("Primary text is 38px - smaller than the ~50px we recommend for TV viewing distance…").
  Composed into the runtime bench, the editor's export panel (offscreen settled frame) and
  the community publish sheet. Export never blocks on them; the catalog's 20px hard
  type-floor gate is unchanged and the 312 audit-indicted designs stay shipped, warning.
- **Pins**: scripts/design-rules.test.mjs (resolve/normalize/prompt-block math, build gate)
  + e2e/design-rules-product.spec.ts (persistence across reload, the request-level relaxed
  mode over the mocked gateway, editor warning + non-blocking export, the catalog warning,
  16:9 = 9:16 = one floor while 720p composes ~33px).

Landed after, closing two holes the slice left:

- **The viewing target is no longer create-time-only.** The editor's Style panel carries the
  same `ViewingControls`, writing through `store.setLegibility`, and the working-slot
  autosave now watches `legibility` as well as `template` - the wizard's copy only ever
  persisted because creating a project rewrites the template in the same breath, so an
  editor-side change looked like it worked and was gone on reload. Every project that
  existed before R4 can now be re-measured for a phone or a venue. Pinned in
  e2e/design-rules-product.spec.ts (the pin fails if the subscription is put back).
- **The rules are a READINESS ROW**, not an unclaimed raw finding: "Reads where it will be
  watched" (validation/readiness.ts) over the `legibility-*` rules. A live row, so the
  raw one-shot path reports it untested rather than borrowing the credit.
- **The floors are ONE control with three answers** (2026-08-19). They shipped as two
  checkboxes over the single tri-state, which is a control that lies about its own shape:
  ticking "Guaranteed readable size" silently changed what "Broadcast text sizes" meant,
  un-ticking one could not say which of the other two states you landed in, and the pair could
  express a fourth combination the model does not have. `ViewingControls.tsx` now renders three
  radios in a real `<fieldset>`, each phrased as what it PERMITS rather than as a feature to
  switch on — because a floor is a rule about what may ship — and the DEFAULT is visible, which
  "neither ticked" never was.
- **Supporting text has its own rule id**, `legibility-secondary-size`, claimed by the same
  readiness row. The three choices move the SECONDARY floors and barely touch the primary one
  (standard: supporting text and fine print at 1.85% with a warning band to 2.2%; safe: 5% and
  4% with no band), so a person choosing between them is choosing about supporting text, and one
  `legibility-size` rule could not say which of their findings the choice governs. REPORTING
  only — it is a warning like every other finding on that row, and the `legibility-` prefix is
  the whole selector the custom lane's blocking set uses, so nothing there changed.

- **The questions left the CATALOG WALK** (2026-09-02, owner receipt: *"I don't really know what
  the point of this here is... maybe you can explain it. Or then we just remove it if it doesn't
  make sense there."*). `ViewingControls` is rendered on the AI step and in the editor's Style
  panel; the wizard's Style step no longer carries it. Measured in the browser on a catalog
  design: moving the target from TV to Mobile, or the floor from standard to safe, left the
  composed preview document BYTE-IDENTICAL, so on that path it was an input with no visible
  effect. Making it visible there was the obvious alternative and fails on this section's own
  numbers - 312 of the shipped designs already warn under the default TV profile, so six of every
  ten catalog picks would arrive on the colour step carrying a legibility warning, which is the
  failure `designRulesWarnings.ts` names in its own `MAX_WARNINGS` comment. The setting is a rule
  about what may SHIP, and the warnings it governs are drawn where shipping happens: the export
  panel and the publish sheet. On the AI step it is not decorative at all - it rides the prompt
  and changes what gets drawn. An untouched catalog project is unaffected, because the default
  always serialized to nothing and every measurement already ran against TV. If it is ever wanted
  back on the walk, Finish is the right home: that is where a graphic is named and where it goes.
  Pinned in `e2e/wizard-setup-fields.spec.ts` (absent from Style) and
  `e2e/design-rules-product.spec.ts` (the create-time persistence pin now runs on the AI step).

Still owed from §23.1, not part of this slice: the catalog fixes for tk01/ig01/sb01, the
countdown spacing-threshold relaxation, the control-page smoke in the loop, and the owner's
re-ratification of the 50px primary floor for CATALOG enforcement (until then it reaches
shipped designs only as the warning above).

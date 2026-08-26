# NoaCG Lite - model evaluation benchmark

> **PARKED 2026-08-08 - superseded by `docs/AI_LITE_PLAN.md` (the deadline plan) and
> `docs/AI_LITE_PROMOTION.md` (promotion policy).** Retained as the benchmark machinery's
> reference and as the home of three relocated records: Appendix B (the skin and judge
> mechanics) and Appendix C (the OpenRouter-era rounds A-D and route table), plus the §6b-§6f
> judge measurements. Prices and route names below predate the Vercel AI Gateway move and are
> not current recommendations.

How NoaCG Lite's model-and-provider route is measured, regressed, and (eventually)
promoted. The question: *which route produces the cheapest consistently usable, editable,
broadcast-appropriate Lite graphic* - cost per **accepted** graphic, not per call, against
the Lite ceiling of $0.01 per accepted graphic.

Lite's model never writes HTML: it emits one constrained structured decision that the
platform compiles deterministically through the real catalog assemblers. So the benchmark
measures constrained design judgement and structured-output reliability - generic coding
benchmarks are weak priors here.

## 1. Context-assembly trace (what the model actually receives)

Findings from the 2026-07 inspection, kept here because they shape the whole design:

- **Lite sends a curated compact digest, never a full-catalog dump.** The server-owned
  system prompt (`src/ai/lite/contract.ts` `liteSystemPrompt`) always contains the whole
  *Lite* catalog - the audited allowlist (6 lower-third chassis at first release), one
  pipe-delimited line each. There is no separate category-selection call and no per-call
  filtering: with one supported category there is nothing to filter yet. `'auto'` versus an
  explicit requested category changes only the ledger's `requestedCategory` and the
  `requested_category_ignored` semantic check.
- **Measured size (chars/4 approximation):** roughly **2.5k input tokens per call**
  (system prompt incl. the ~650-token catalog digest, plus the structured-output schema and
  the small request), well inside the profile's 12k estimate. The exact current numbers are
  not frozen here on purpose: `bench:calibrate` and `bench:regress` re-measure and record
  them on every run (`context` in the summaries) - that series is the catalog-growth cost
  curve made visible.
- **Refusals are deterministic-only.** The model's structured schema is ready-only
  (`LITE_READY_OUTPUT`); `deterministicUnsupportedDecision` (requested-category check +
  prompt patterns, pre-inference, zero cost) is the ONLY refusal path. Consequence for the
  benchmark: `UNSUPPORTED_FORCED` measures the deterministic screen's misses, not model
  judgement - an unsupported brief that slips the screen WILL be forced into a lower third.
  The screen's coverage of the expected-unsupported briefs is regression-pinned in
  `bench:regress` and the build-gate tests.
- **Scaling:** the Lite digest grows ~110 tokens per audited chassis plus schema-enum
  growth. Growth is governed by *curation into* `LITE_CATALOG`, not by the raw catalog -
  widening the allowlist is a deliberate, benchmarked act (src/ai/AGENTS.md).
- **The full-catalog dump lives in the full harness, not Lite:** `catalogDigest()`
  (src/ai/designSpec.ts) puts every category and variant into `claudeProvider`'s design-call
  system prompt on every call, pinned category or not (pinning narrows the tool schema via
  `narrowedSpecTool`, never the digest). Measured ≈ 12k tokens and growing linearly with the
  catalog; `fullHarnessDigestTokens` in the calibration context records the exact number.
  When Lite grows toward many categories, the staged approach (classify → shortlist →
  compact digest → validate server-side) applies there; **preserve current behaviour until
  the benchmark's retrieval-accuracy and wrong-category metrics show a change is safe.**
- **Eval-vs-production drift:** closed. The model-call side was already identical (the eval
  runner calls the production endpoint); the compile side drifted (the old eval skipped
  `applySpecLocks`/`ensureSpecFonts`/`applySpecOutPreset` and the safety screen). The whole
  deterministic half now lives once in **`src/ai/lite/pipeline.ts`** and both production and
  every runner import it; `scripts/ai-lite-bench.test.mjs` pins that no second copy exists.
- **Key exposure:** none found. Provider keys are server-only (`managedAiKey`); the eval
  runner authenticates with a bearer token and never sees keys, models, or provider bodies;
  `src/ai/settings.ts` carries a one-way migration erasing the historical localStorage key;
  `scripts/check-client-secrets.mjs` gates src/e2e/scripts/docs and the built `dist/` on
  every build. E2E specs seed only non-secret routing preferences.
- **Routing config:** the brief's `config/ai-model-routes.json` and `lite.theme` route do
  not exist in this codebase and are not built. Routing is server env configuration read by
  `api/_lib/aiLiteProfile.ts` (`AI_LITE_PRIMARY_*`, `AI_LITE_FALLBACK_*`, prices, ZDR,
  provider pinning, structured mode) - one place, no model identifier in production code,
  changeable without a browser deploy. Theming was never a separate call: palette and
  typography are DesignSpec properties. The repair route is pinned to whichever model
  produced the invalid decision, inside the same two-attempt session ceiling.

## 2. The shared pipeline

`src/ai/lite/pipeline.ts` is the one grounded compile path:

- `normalizeLiteSpec` - the lite decision's normalization (`fit: 'catalog'`, no flourish,
  `applySpecLocks` for the user's structured setup).
- `assembleGroundedTemplate` - `specToTemplate` → `applyDesignAdjustments` →
  `ensureSpecFonts` → `applySpecOutPreset`, exactly production's order.
- `productionSpxValidator` - static `validateTemplate` + live `benchTemplateRuntime`,
  wrapped in the safety screen; the same composition AiStep injects.
- `compileLiteDecision` - all of the above; what every benchmark runner calls.

Production (`claudeProvider`) is built FROM these functions; benchmark mode may capture
extra artifacts but never a better prompt or a different compilation path. The equivalence
pins live in `scripts/ai-lite-bench.test.mjs` (run in the build gate).

## 3. Two comparison modes - never conflate

- **Model comparison:** commit, prompt, schema, compiler, catalog, validators, parameters
  fixed; only model + provider endpoint vary.
- **NoaCG regression:** model fixed (or absent); pipeline varies.

Every run records a manifest (`scripts/ai-lite-bench/manifest.mjs`): suite id, git commit,
hashes of the Lite contract / shared pipeline / whole catalog / validators / suite,
environment, candidate identity, timestamp. `pipelineIdentityMatches` decides whether two
runs support a model comparison. **Never attribute a score change to a model when the
pipeline hashes also changed.**

Because the catalog is immature and changes weekly, **regression mode is the mode that pays
for itself now**; model comparison waits until a frozen suite stays meaningful for more
than a few weeks. Model choice at Lite's cost profile is one env-var edit - the catalog is
the irreversible investment.

## 4. Suites (`scripts/ai-lite-bench/`, suite id `lite-spec-v1`)

- **Core (frozen, visible)** - 8 briefs in `suites.mjs`, each with a labelled expected
  outcome (category, intent, roles; or expected-unsupported with its code). Lower-third
  briefs reuse the exact prompts from `ai-lite-lower-third-fixtures.mjs` (drift-pinned).
  Off-category and video briefs are expected-unsupported - and expected to be caught by the
  zero-cost pattern screen, so they cost nothing.
- **Hidden holdout** - `holdout.mjs`. Never used for prompt tuning, never in development
  reports; validates promotion decisions and detects overfitting (Finnish/Swedish names,
  hyphenated titles, long orgs, refusals).
- **Repair suite** - malformed/inconsistent decisions with the exact rule codes
  `validateLiteDecision` must emit. Scored separately; regression-checked in CI.
- **Rotating challenge** - `challenge.mjs`; diagnostic only, seeded with the named stress
  classes (extreme length, CJK + RTL Unicode, difficult contrast, rapid updates, sparse
  content) and grown from real failures - never retroactively into core.
  `bench:calibrate -- --challenge` compiles floor-style picks over it as a CATALOG
  capacity probe; results are reported separately and never gate the run.

Any change to a frozen brief, gold spec, expectation, or the prompt contract is a NEW suite
version. History stays queryable, never presented as comparable across versions.

## 5. Calibration - run this before comparing anything

`npm run bench:calibrate` (dev server required; zero model calls, zero cost):

- **Gold ceiling** - hand-written specs for three core briefs, compiled through the
  production pipeline, screenshot + motion clip captured for review. If gold does not
  review well, the catalog is the ceiling and no model choice will move it.
- **Trivial floor** - seeded-random valid chassis carrying the labelled fields. A model
  that does not clearly beat this contributes nothing.

Report every candidate as a position between floor and ceiling, never as an absolute.

## 6. Commands

```bash
npm run bench:calibrate   # gold ceiling + trivial floor (free; dev server required)
npm run bench:regress     # fixed-model pipeline regression (free; --update-baseline records)
npm run bench:lite        # the PAID eval runner (= eval:ai-lite; hard caps: 40 calls / $1.50)
npm run bench:spike -- --label=candidate-a   # Phase 0 spike: DRY RUN with cost preview by
                          # default; --confirm-spend executes 6 briefs x 3 runs for the
                          # server's current route (repeat per candidate with a new label)
npm run bench:spike -- --label=candidate-a --suite=skin   # the SKIN spike: the six
                          # skin-* fixture briefs (distinctive styles no house chassis
                          # carries) against a server started with AI_LITE_SKIN_ENABLED=1;
                          # a paid run REFUSES to start when the flag is off, and metrics
                          # count skinApplied (skinned canvas vs house-chassis revert).
                          # With AI_LITE_JUDGE_ENABLED=1 the run also exercises the
                          # VISION JUDGE (below) on every skinned result - the full
                          # production-shaped funnel including judge-reverted counts
npm run bench:gallery     # blind review gallery over any out-dir
npm run bench:sameness    # visual-diversity metric over an out-dir's hold captures (free,
                          # offline): per-label mean + MIN pairwise distance (the
                          # "different briefs must produce different designs" tripwire)
                          # and, when house references exist (default <out>/calibration,
                          # or --house=<dir>), each item's nearest house look - for the
                          # skin suite, "looks like no house chassis" made checkable.
                          # Distances are relative to one capture setup, never absolute.
npm run bench:report      # aggregate results + judgements into the honest report
                          # (folds in sameness.json when bench:sameness has run)
npm run test:ai-lite-bench  # the benchmark self-tests (also in the build gate)
```

`bench:regress` checks three things: pipeline-identity drift vs the committed baseline
(reported, not failed - drift means old model runs stopped being comparable), the repair
suite + zero-cost unsupported screen (behavioral, fails the run), and gold+floor compile
through the production pipeline (fails on any machine-invalid arm).

The paid runner keeps its own guardrails: bearer-token identity, per-run call and cost
hard stops, evaluation-ledger isolation, and no provider key or body ever reaching the
client. **Never run it during implementation work; every paid run is announced with its
cost cap first.**

Deferred (gated on catalog stability, by design): `bench:discover`, `bench:qualify`,
`bench:confirm`, `bench:compare`, `bench:review` - the model discovery funnel (OpenRouter
catalogue filtering on structured-output support, ZDR, pricing, provider pinning;
qualification → screening → confirmation with candidate identity = model + endpoint +
revision + parameters + reasoning config, `model@reasoning=low` as its own candidate).
Build them when a frozen suite survives more than a few weeks.

## 6a. The paid round loop, from any checkout

A linked worktree has no `.env`, so these tools read the MAIN checkout's and write the bench
configuration next to the worktree's own `package.json`. Nothing is per-round or per-path.

```bash
node scripts/bench-env.mjs --profile=lite   # compose .env.bench.local (route, quota, keys)
node scripts/lite-eval-stamp.mjs   # mint a bearer token for the eval account and stamp it
# start the bench server: preview_start {name: "dev-bench"}, or npm run dev:bench
node scripts/lite-eval-probe.mjs   # free: what would Lite do for this identity? (expect 200)
npm run eval:round -- lite-eval-out v14 30   # PAID. Caps: 40 calls / USD 1.50
npm run bench:sameness && npm run bench:gallery && npm run bench:report   # review
npm run eval:archive -- lite-eval-out v14    # copy + VERIFY into the permanent archive
```

`bench-env.mjs --profile=pro` does the same for the Pro bench (gateway key, ZDR, the test
account it signs in as). Every paid runner polices its routes through
`scripts/harness-route-policy.mjs`: gateway only, unless the run states `--frontier-reason`
(`docs/AI_PLATFORM_PLAN.md` §7a).

**Archive before any worktree cleanup.** Out-dirs are gitignored and die with the worktree -
two paid rounds were lost that way. `eval:archive` copies to
`C:\claude\noacg-lite-eval-archive\<label>-<YYYY-MM-DD>\`, then refuses loudly unless the
recursive file count matches AND the `*.json`/`*.jsonl` name set diffs identical. It never
deletes the source, never overwrites an existing round, and takes `--dry-run`.

## 6b. The skin vision judge (`POST /api/ai/lite/judge`)

Phase 2 of the skin uniqueness strategy (the paid spike's verdict: capability exists,
CONSISTENCY is the fight). A skin that compiles and benches clean can still be a bad
broadcast graphic - a squat box, a wrapped name, decoration burying the text. The judge
is one server-owned, cost-capped vision call over the rendered HOLD frame, scoring five
integer axes 1-5: `legibility`, `textIntegrity`, `hierarchy`, `briefFit`, `strapShape`. A
pass requires EVERY axis at or above `AI_LITE_JUDGE_THRESHOLD`; below it the caller reverts
to the house chassis, so a weak skin costs a judgement call, never an on-air graphic.

The judge prompt carries its OWN version (`LITE_JUDGE_PROMPT_VERSION`, currently
`lite-skin-judge-v6`) beside the generation prompt version. Scores from two judge versions
are not comparable and calibration is a comparison, so the version is stated in the prompt
rather than inferred from which round produced the number. **No round has run since v1.**
v2 added `textIntegrity` (§6d); v3 rewrote `strapShape` as inspection, v4 gave it a scale
anchor, v5 corrected that anchor against measurement, and v6 stopped briefFit scoring the
brief's noun list (all §6e) - each landed before any paid round scored the one before it,
so the first paid round measures all five changes together as v6.

Boundaries, same posture as the generation route: the browser/rig supplies only the frame
(downscaled PNG), the brief, and the skin's claimed treatment - never a model, route,
prompt, or policy. The judge fails closed (enabled + priced + audited-allowlist or it
refuses), spends only behind a generation the caller owns, adds its provider cost to that
generation's ledger row (so the fleet spend ceiling sees it), and stores nothing - the
screenshot is judged and dropped. Config: `AI_LITE_JUDGE_*` in `.env.example`. A judge
TRANSPORT failure fails open in the rig (the deterministic gates already passed) and is
recorded as `judge: error`, never hidden.

**Calibration before trust.** The gallery stays blind - judge scores never appear in it,
or they would bias the reviewer. `bench:report` prints per-candidate judge pass rates and
mean per-axis scores next to (separate) human acceptance, and - since those group means
average two populations that never meet - a per-ITEM `Judge vs reviewer` matrix joining
each blind-review decision to that same item's judge verdict. That join is what earns the
threshold. Until it does, the judge runs in the eval rig only - production wiring
additionally needs an in-app hold-frame capture path, which does not exist yet (rig
captures are Playwright screenshots). First measurement: §6e.

Beside that raw count `bench:report` also reports **Cohen's kappa**, because raw agreement
flatters a lopsided judge: one that passes nearly everything scores well against reviewers
who also accept most things, purely by chance. Below 0.4 the report says outright that the
raw count is mostly chance, which is the reading §6e's numbers need.

The cell to read first is a **false accept** (judge passed, human rejected): each one is a
defect class the judge cannot see. The rule that follows is *prefer a deterministic gate to
a wider judge remit* - the 2026-07-29 review rejected two skins for clipped text that the
judge scored legibility 5, and the durable answer was a bench detector (§6d), not a
stricter judge prompt.

## 6c. Measured: the skin prompt has a load ceiling

Four paid rounds isolated the skin teaching, one variable at a time. Among JUDGED skins
(the per-brief figure moves with transport failures; this one does not). **These are
`lite-skin-judge-v1` numbers** - four axes, no `textIntegrity` - so a v2 round's pass rate
is not comparable to this table without rejudging:

| prompt | pass rate | briefFit | legibility | what changed |
| --- | --- | --- | --- | --- |
| v3 | 47% | 2.60 | 3.47 | strap rule RESTATED as geometry, prohibitions deleted |
| v4 | 33% | 2.58 | 3.75 | +3 lines teaching brief fit |
| v5 | 27% | 2.36 | 2.91 | +1 line binding motif to strap |

**Both attempts to raise briefFit lowered it, and v5 took legibility with it.** The skin
block went from roughly six simultaneous requirements to eleven; every line was defensible
alone and drawn from the judge's own words, and the aggregate still degraded every axis.

Two rules follow, and they cost about $0.05 to learn:

- **Prefer replacing to adding.** v3 - the one change that clearly won - deleted as much as
  it wrote. A prompt at this length is a fixed budget, not an append-only log.
- **Watch the axis you are NOT targeting.** v4 got what it asked for: the first briefFit
  5s. Both scored strapShape 2 ("a small, squat box in the corner rather than a
  lower-third strap") and reverted. Instructions compete; a win on one axis that nobody
  measured against the others is not a win.

briefFit stays the weak axis (2.60 at best). The next mechanism to try is worked EXAMPLES -
one or two high-scoring skins shown rather than described, or the curated skins the nightly
factory is meant to produce - not more sentences.

> **SUPERSEDED (2026-07-29), read §6e before trusting this section.** Both experiments here
> were tuning the GENERATOR against a `briefFit` axis that was partly unwinnable: it scored
> the brief's noun list, including scene elements a strap cannot hold, so no amount of
> teaching could move that share of it. That is a simpler explanation for "both attempts to
> raise briefFit lowered it" than a prompt-load ceiling, and it means **the 2.60 figure
> measures the axis as much as the model**. The load-ceiling lesson may still be real - v4
> and v5 did add lines - but it is no longer *demonstrated* by these numbers. Re-derive
> after a v6 round before spending on worked examples.

## 6d. Measured: the first blind review, and the defect nothing could see

The 2026-07-29 blind review (one reviewer, 9 items of the v3 skin spike) was not
impressed - "boring and chunky", "not premium". Two findings are engineering, one is an
owner decision:

**1. A clipped edge sliced a word, and every gate passed it.** Two `skin-brutalist-poster`
items cut the last letter of the secondary line with an angled `clip-path` on the panel.
The reviewer caught it twice ("cuts of", "looks like its cut of"); the runtime bench did
not, because **clip-path clips PAINT and the bench measures LAYOUT** - the element box is
exactly where it should be. `runtimeBench.ts` had no clip-path handling at all; this is the
same trap `src/templates/AGENTS.md` documents for scoreboards. The first fix is upstream of
the bench: `liteSkinPatchErrors` now rejects `clip-path` in skin CSS and in `skin.html` style
attributes (`skin_css_clip_path` / `skin_html_clip_path`), so the model gets a repair round
naming the replacement - shape a skewed or rotated layer BEHIND the text - and a skin that
insists reverts to the house chassis. `background-clip: text` stays legal. The rule also
removes a collision nobody had hit yet: `line-reveal` and `mask-wipe` animate `clipPath` on
`.lower-third-box` and clear it on settle, so a skin's own clip would vanish for the
entrance and snap back.

**The bench now catches the defect class itself**, which the skin ban does not: a ban only
protects Lite skins, while `clip-path` reaches the graphic from the catalog, an imported
graphic, the full harness and hand-written code alike. `runtimeBench.ts` resolves a computed
clip-path to the region it PAINTS (`inset`/`rect`/`xywh`/`polygon`/`circle`/`ellipse`) and
trips `bench-overflow` when text escapes it; the element carrying the clip is checked too,
and shapes it cannot resolve cheaply (`path()`, `url()`, keyword radii) report nothing
rather than guess, so no valid export is blocked on a shape the bench cannot read.

The non-obvious part is the **skewed bar**, which is what these two items actually used: a
shear spans the full width in BOUNDING-BOX terms, so comparing text against the bbox can
never fire on it. The check measures the polygon's horizontal extent across the band the
text occupies instead. Its regression fixture is deliberately marginal - the name fits the
600px bounding box and escapes only the shear - so the test cannot pass on bbox logic alone.
The whole catalog stays green, including the Chevron lower third and the versus and
scoreboard variants built on polygon clips.

**2. The vision judge scored that same frame `legibility` 5 and passed it.** The pixel-level
backstop missed a sliced word - so the answer is not a higher `AI_LITE_JUDGE_THRESHOLD`,
which would only reject good skins for a defect it still cannot see. The judge gained a
fifth axis, `textIntegrity`, phrased as INSPECTION rather than reading ("trace the
letterforms you can actually see rather than reading the word you expect"): asked to read,
a vision model completes the word. **Unmeasured** - no paid round has scored a known-sliced
frame with the v2 judge, so treat the axis as a hypothesis until one does.

**3. OWNER DECISION, deliberately deferred: are hairlines and dots broadcast-safe?** The
reviewer rejected two items for thin left-border lines and a small dot - "not broadcast
safe" for key and fill. This is not a Lite question: `docs/DESIGN_LANGUAGE.md` prescribes
hairlines for minimal/editorial/cinematic and "dots, rings" for glass,
`accentForm:'hairline'` is offered to the model, and lt02/lt25/lt32 are built on them.
Deciding it reaches the whole 54-design catalog.

**Status: open on purpose, with no deadline** - the owner wants to see it on real key-and-
fill hardware before ruling, so it is not a blocker and nothing should escalate it. Until
then the codebase takes NO position: neither the judge prompt nor the skin generation
prompt mentions stroke weight or key and fill, and `strapShape` counts a rule as a valid
anchor exactly as DESIGN_LANGUAGE already does. **Do not guess it, do not encode a
provisional answer, and do not "work around" it** - a silent lock is harder to undo than an
open question. When the ruling comes, the judge needs telling either way.

Also open from the same review: motion smoothness is **unverified** - the review clips are
~25 fps screencasts of a 50 fps graphic, so judge motion live, never from the gallery clip.

## 6e. Measured: the judge does not yet agree with a human

The group means in `bench:report` average two populations that never meet, so none of them
can say whether the judge and a human agreed about the SAME graphic - the only thing that
can justify a threshold. `bench:report` now joins them per ITEM through `blind-key.json`
and prints a `Judge vs reviewer` matrix, naming FALSE ACCEPTS (the judge cleared what a
human rejected, so it would have AIRED) apart from false reverts (which only cost a skin).
It refuses to imply a threshold below 20 joined items, and writes `agreement` to
`report.json`.

First join: 9 reviewed items across rounds a-j, 6 carrying both verdicts. Decisions only -
at this N the 1-5 scores are noise. **These are `lite-skin-judge-v1` scores** (four axes,
no `textIntegrity`), so a v2 round restarts this table rather than extending it:

|  | judge accept | judge revert |
| --- | --- | --- |
| **reviewer accept** | 2 | 2 |
| **reviewer reject** | 1 | 1 |

**3/6 is chance**, and no threshold should be read off it. What is not noise is the SHAPE of
the disagreement - it is the quantitative backing for §6d's conclusion that the answer was
never a higher threshold:

- **A second blind axis, beyond the sliced word.** `strapShape` scored **5** on a graphic
  with no strap at all - bare text over the background with a stray ~4px dot floating
  above it (round j run2, luxury-runway). The axis added specifically to catch squat or
  missing straps rated its absence perfect.

  **Why it missed, and the fix (v3).** The v1 wording was a taxonomy of WRONG SHAPES -
  "squat box, card, badge, tall stack, centered plate, or full-frame takeover". Every entry
  is a panel of the wrong proportion, so a frame with **no form at all** matched none of
  them and the checklist returned "no failure found"; correct low-left placement then read
  as a healthy lower third. The axis now asks for the same inspection `textIntegrity` does -
  locate every painted element, ask what binds them, and score 1 when nothing does (text on
  bare video with no panel/bar/rule/scrim, or an element stranded across a gap of empty
  video) - with "sitting low in the frame does not by itself make a lower third" stated
  outright, because that is the inference which produced the 5. Failure by ABSENCE comes
  first; the shape taxonomy follows as the 1-2 band. Unmeasured, like `textIntegrity`.

  It deliberately does **not** say a thin rule or a small mark is wrong: that is the open
  owner decision below, and the stray dot here fails on being orphaned from the
  composition, not on being small. Whichever way the owner rules, this wording holds.
- **Broadcast safety is unmodelled.** The two items behind §6d's open owner decision
  (hairline rules, a 4px dot) drew 5s on the axes that would have to catch them. Whatever
  the owner decides, the judge has never been told what key and fill do to thin marks.
- **CORRECTED (2026-07-29): the false reverts were not taste.** This section first recorded
  them as reviewer "minor" against `briefFit 1` / `strapShape 2` and moved on. Re-reading the
  two FRAMES says otherwise, and the difference matters because the original reading implied
  nothing needed fixing:
  - `item-002` (round i run2, terminal-hud) is a clean strap - roughly 720x160 in a 1920x1080
    frame, about 4.5:1, low-left - and the judge scored `strapShape` **2**, "a small box
    rather than a lower-third strap". `item-005` (round g run3, hand-crafted) took the same 2
    at about 3.5:1. **Both were marked down for being narrow**, and that is our own two
    prompts contradicting each other: the generation prompt sizes a strap by "the text plus
    steady padding" and the catalog uses `fit-content`, so a text-hugging band is exactly
    what was asked for. The judge was scoring against a rule the generator never had, and
    penalising compliance with the rule it did have. Fixed in `lite-skin-judge-v4`: judge the
    band's OWN proportions, never its share of the frame, with "one spanning only a quarter
    or a third of the frame width is normal broadcast practice" stated outright. Both halves
    of the contract are now test-pinned together.

    **Then MEASURED, over all 59 judged frames** (`scripts/ai-lite-strap-geometry.mjs` -
    reconstructs the preview background from a per-pixel median across captures, so it finds
    black brutalist panels as readily as bright ones):

    | | min | p25 | median | p75 | max |
    | --- | --- | --- | --- | --- | --- |
    | rendered aspect ratio | 1.9:1 | 2.3:1 | **2.9:1** | 3.6:1 | 7.6:1 |

    Two results, and the second is the more important:

    1. **The misread was systematic, not anecdotal.** 25 of 59 stated reasons call the
       graphic small, boxy, squat, narrow, or "not a strap" - and **13 of those 25 are at
       least 3:1**, including a 7.6:1 band (the widest in the corpus) described as "the
       narrow aspect ratio prevents it from being a lower third". Two of the mislabelled
       rows scored perfectly on every other axis (`L4 H4 B5 S2`, `L5 H5 B5 S3`). This one
       misreading is roughly a fifth of all judged rows and the largest single source of
       reverts.
    2. **v4's own threshold was wrong, and v5 fixes it.** v4 said "less than about three
       times wider than tall scores 1-2" - a number guessed from one 4.5:1 example. The
       measured median is 2.9:1, so that rule would have condemned **54% of everything the
       generator produces**, converting a permissive axis into a near-universal revert. Only
       2% of frames fall below 2:1. v5 moves the 1-2 band to "approaching square or taller
       than wide" and states that a two-line strap over short text is naturally about 2.5:1.
       A test refuses to let the 3:1 floor return.

    Caveat on the instrument: it measures the INK bounding box, so a glow halo or a stray
    orphaned mark inflates it (the strapless `item-003` measures 2.5:1 only because the
    stray dot and the text span that box together). It answers "is the judge calling wide
    things narrow", not "where exactly is the panel".
  - `item-005`'s `briefFit` **1** was simply RIGHT - "a generic dark grey box… entirely
    failing to deliver the requested handcrafted, paper-and-ink feel" describes the frame
    accurately, and the reviewer's own note was "boring / ugly". They agreed on the quality
    and differed on whether bad-but-fixable should air. That is a threshold question about
    what "minor" means, not a judge error, and it should not be counted as one.

- **`briefFit` was scoring the brief's noun list, and the nouns do not fit on a strap.**
  This axis is the MINIMUM one in 44 of 59 rows, so it decides three-quarters of every
  verdict. Reading its reasons against the frozen briefs shows what it was actually doing:

  | fixture | judged rows | `briefFit` outcome |
  | --- | --- | --- |
  | `skin-neon-synthwave` | 12 | **every row 1-3** (ten of them exactly 2); one reached the pass threshold |

  Seven of those twelve name the same cause - a missing "eighties horizon", which the brief
  does ask for. **A horizon is a scene element.** The rendered straps are ~2.9:1 and a
  quarter of the frame wide, and the generation prompt orders the model to "work with that
  shape", so there is nowhere to put one. The model could satisfy `briefFit` or
  `strapShape`, never both - the same generation-vs-judge contradiction as the strap-width
  bug above, in its third form. The luxury reasons say it outright: "the 'vast negative
  space' is only visible outside the graphic", marked down anyway.

  This also explains §6c. Two paid prompt experiments tried to raise `briefFit` and both
  made it *worse*, which read as a prompt-load ceiling. Part of it was simpler: a share of
  the axis was unwinnable by construction, so teaching the model harder could not move it.
  **Whatever §6c concluded about briefFit's 2.60 ceiling is now suspect** and should be
  re-derived after a v6 round, not carried forward.

  Fixed in `lite-skin-judge-v6`: score the requested character AT STRAP SCALE, read
  scene-scale words as direction for colour, type, texture and edge, and never mark a
  graphic down for lacking a scene element that could not fit on a strap. The positive test
  is inspection-shaped - "recognisable as that style with its text removed". The briefs are
  drift-pinned fixtures and a real user would write exactly those words, so the JUDGE is the
  side that gives; a test pins both halves together.

- **Watch, do not yet act: `hierarchy` never discriminated.** It scored 4 or 5 on all six
  joined items, including `item-003`, which has no composition at all. An axis that is always
  4-5 contributes nothing to a min-axis gate. Six items cannot prove a dead axis and no
  mechanism for the failure has been identified, so it is deliberately left alone - unlike
  `strapShape`, where the frames showed exactly why the wording failed. Re-check it at 20.

- The asymmetry behind all of this still holds: a false revert only costs a skin (the result
  falls back to the house chassis), while a false accept would have AIRED. Reverting is the
  cheap direction to be wrong in - but two of three reverts here were the judge misreading
  its own contract, and that is not free either: it is part of why round f's skin trigger
  rate dipped.

So the axis DESCRIPTIONS remain the lever, as §6d found. Raising N before they are right
just measures the wrong instrument more precisely.

## 6f. The v6 judge round: mostly lost to the provider, two data points, no verdict

Ran 2026-07-29, `bench:spike --suite=skin --out=lite-bench-out/spike-v6`, **$0.0028**.
Generator unchanged (`lite-lower-third-v3`), judge at `lite-skin-judge-v6`.

**16 of 18 generations returned `provider_rejected` and were never billed** - the documented
OpenRouter failure on the ZDR-pinned Google route, but at **89%** against the ~20% seen
historically. Runs 2 and 3 produced nothing at all. **This round does not measure the judge**
and no rate in it should be quoted. Whether to widen `AI_LITE_GATEWAY_PROVIDERS` is the
owner's policy call and was deliberately not touched.

Two rows survived. They point in opposite directions, and at **n=1 each** neither is a
result - they are the reason to run again, not conclusions:

| fixture | scores | frame | read |
| --- | --- | --- | --- |
| `neon-synthwave` | L3 **T5** H4 B2 **S1** | text on bare video, no panel/bar/rule/scrim, stray dot above-left | `strapShape` 1 looks **right** - v1 scored the equivalent strapless frame 5 |
| `terminal-hud` | L4 **T5** H4 **B5** S2 | clean outlined strap, 670x145 = **4.6:1**, 35% of frame width | `strapShape` 2 looks **wrong** - the reason says "the entire graphic is very small" |

**The hypothesis this suggests, worth testing rather than believing:** the two fixes are
phrased differently and may have fared differently because of it. v3's absence clause is
POSITIVE - "locate every painted element, ask what holds them together" - and the strapless
frame duly scored 1. v4/v5's scale clause is a PROHIBITION - "must NOT be marked down" for
frame share - and the judge marked a 4.6:1 strap down for exactly that, citing "very small".
If that holds up, it is §6c's lesson reappearing on the judge side: **a vision model follows
an instruction about what to look at more reliably than an instruction to ignore something
it can see.** Rewriting the scale clause positively (state what proportion earns each score,
never mention frame share) is the change to try - but only after a round that actually
completes, since one frame cannot distinguish this from noise.

`briefFit` is equally undecided: `terminal-hud` scored 5, while `neon` scored 2 with the
reason still naming the missing "eighties horizon" that §6e's fix targets - on a frame that
is weak on other grounds anyway. `textIntegrity` scored 5 on both, with no clipped text in
either; it has still never met a sliced frame.

## 7. Human review

One reviewer; fatigue is the binding constraint. `bench:gallery` builds a blind gallery:
neutral item codes, seeded shuffle, candidate/cost/arm invisible, ~20-item sessions with
resume, one planted unmarked repeat per session (test-retest consistency), and per item
exactly two inputs - the broadcast decision (yes / yes-after-minor-edits / no) and one
1-5 score. **Both** answers are required for an item to count as judged - the first pass
returned 7 of 9 items scoreless because the card dimmed the moment the decision landed, so
an unscored card now stays lit and says the score is still needed. Judgements download as
JSONL; `bench:report` joins them through `blind-key.json`
and reports machine validity, human acceptance, and visual score **separately**, plus
reviewer self-consistency (low agreement → widen promotion thresholds). The full-rubric
confirmation pass (top two candidates, blind pairwise) stays manual until Phase 7+.

## 8. Storage and boundaries

- Definitions, gold specs, expectations, manifest logic: committed under
  `scripts/ai-lite-bench/`. Runners at `scripts/ai-lite-*.mjs` (repo convention - this
  project keeps infrastructure in `scripts/`, so no top-level `bench/`).
- Output: `lite-bench-out*/` and `lite-eval-out*/` (gitignored): append-only
  `results.jsonl`, run summaries, screenshots, clips, galleries, judgements. Raw provider
  bodies are never stored anywhere (the server never returns them). SQLite is deliberately
  not used - JSONL + `bench:report` covers the query needs without a dependency.
- **A round worth keeping leaves the repo**: `npm run eval:archive` (§6a) into
  `C:\claude\noacg-lite-eval-archive`, before the worktree that produced it is swept.
- **Dependency rule:** benchmark → production only. Benchmark code lives outside `src/`
  (never bundled); the build-gate test additionally pins that no `src/` file imports from
  `scripts/` and `check-client-secrets` scans both the tree and `dist/`.

## 9. Failure taxonomy

`scripts/ai-lite-bench/taxonomy.mjs` - the brief's 22 codes, classification ordered by
pipeline stage (earliest failure wins): provider/limit errors → truncation → schema →
UNSUPPORTED_FORCED / CATEGORY_WRONG → semantic (VARIANT_INVALID / FIELD_CONTRACT_INVALID)
→ compile → validation-rule mapping (timeline/state/runtime/reflow) → export → visual.
One primary code per failure; secondary findings ride the row.

Alpha/compositing note: on the Lite track the model authors no CSS, so an alpha or
compositing failure is a **catalog** bug - route it to the platform regression suite (the
reflow/ticker/alpha probes belong there), never into a model score.

**Semantic exhaustion is not a provider error, and the distinction decides comparisons.**
`generation_failed` means the MODEL could not reach a usable decision even after its repair
round - that is the quality signal, and it classifies as `REPAIR_FAILED`. A gateway code
(`provider_rejected`, `malformed_response`) means the PROVIDER broke, which is no verdict on
the model at all. The report classified every failed row as `PROVIDER_ERROR` until
2026-07-29, so a flaky endpoint read exactly like a weak model: the first real comparison
scored phi-4 at 67% machine-usable when all eight of its misses were transport. The eval now
records the API's machine code rather than only its human message - classifying by matching
English sentences breaks on the first reword - and `bench:report` prints an explicit warning
beside any candidate whose failures are majority transport, because a rate like that is not
a verdict and should not be ranked as one.

## 10. Promotion

Policy and thresholds: `docs/AI_LITE_PROMOTION.md` (thresholds are owner-set TODOs until
the first calibrated run). The system only ever RECOMMENDS - output is a recommendation
plus a proposed env-route change; the product owner promotes by editing server config.
A candidate can be *recommended for manual broadcast verification*, never
*broadcast-approved*, until the manual checklist there is complete.

---

## Appendix B - the skin and judge mechanics

*Relocated from `src/ai/AGENTS.md` on 2026-08-08, when that file was reordered around adapt-first
and cut to the live contract. Nothing here changed; it moved because both surfaces are
server-flagged OFF and a live contract should not carry an experiment's internals.
`src/ai/AGENTS.md` keeps the three rules that bind anyone touching the code while the flags are
off: a skin reverts rather than costing a working result, `clip-path` is forbidden, and the judge's
admission RPC is the shape every new paid Lite route repeats.*

### The skin path

When the profile enables `AI_LITE_SKIN_ENABLED`, the same single model call may ALSO return
`skin:{summary,css,html?}` - bounded restyling for the NEUTRAL canvas chassis
(`templates/lowerThirds/skinCanvas.ts` `ltc01`, deliberately NOT in the browse catalog). The
platform still compiles everything deterministically; the skin CSS lands as a marked override block
through the SAME polish gate (`applyPolish`, `LITE_SKIN_MARKER`), and `lite/pipeline.attemptLiteSkin`
is the ONE implementation both production (`liteGroundedResult`, path `grounded+skin`) and the
benchmark runners use. Any failure - an illegal patch (`liteSkinPatchErrors`, shared with the
server's semantic validation), a gate rejection, or a failing bench - REVERTS silently to the spec's
house chassis. With the flag off, the schema (`LITE_READY_OUTPUT`), prompt, and behaviour are
byte-identical to before the skin existed, and a skin a model emits anyway is stripped server-side.

**Why `clip-path` is banned, generalised.** The blind review found two skins whose secondary line
lost its last letter to an angled cut; the runtime bench read a perfectly placed box and passed, and
so did the vision judge (§6d). The patch gate rejects it in CSS and in `skin.html` style attributes;
`background-clip: text` stays legal. Generalize the lesson before adding any visual construct to a
model's allowlist: **a deterministic gate cannot catch a defect in a dimension it does not measure**,
so either measure that dimension or forbid the construct.

**A constraint stated as a prohibition suppresses the behaviour it constrains.** The strap rules
first shipped as "STRAP SHAPE IS NON-NEGOTIABLE" and "a wrapped name is a failed skin", and the next
paid round emitted skins at HALF the previous rate: given a way to fail and a documented way out
(`omit skin`), the model took the way out. The same geometry now reads as the shape being painted,
and the escape hatch names omission as the likelier mistake. Measured, not theorised - prompt
version `lite-lower-third-v3`, and the pin in `aiLite.test.ts` fails if failure language returns.
When a teaching change moves a rate, suspect the FRAMING before the rule.

### The vision judge

One server-owned, cost-capped vision call (`POST /api/ai/lite/judge`, flag `AI_LITE_JUDGE_ENABLED`)
scoring the rendered HOLD frame on legibility / textIntegrity / hierarchy / briefFit / strapShape
(contract + prompt in `lite/contract.ts`, `LITE_JUDGE_*`, versioned independently as
`LITE_JUDGE_PROMPT_VERSION`); every axis must reach the server threshold or the caller reverts to
the house chassis. It fails closed like the generation routes and stores nothing. Today only the
eval rig calls it (Playwright captures the hold frame); production wiring waits on
judge-vs-blind-review calibration AND an in-app capture path - see §6b before touching thresholds.

**Write every judge axis as INSPECTION, and let ABSENCE be its first failure.** Both blind spots the
human review found were the same mistake in different clothes. `legibility` asked the model to read,
and reading completes a word whose last letter is sliced off. `strapShape` listed the wrong shapes a
panel can take - squat box, badge, tall stack - so a frame with no panel at all matched nothing on
the list and scored 5. An axis phrased as a taxonomy of variants can only find the variants; an axis
phrased as "locate the elements, then ask what binds them" can find nothing-is-there. A new axis
states what to look at, what counts as absent, and what earns a 5 - never a list of named failures.

**The judge passes admission of its OWN** (`store.reserveJudge`, migration 0013): a generation is
admitted once, for one generation, so a second paid call cannot ride that admission indefinitely.
Ownership, liveness (`expiresAt`), the per-generation cap (`AI_LITE_JUDGE_MAX_PER_GENERATION`,
attempts not successes) and the daily fleet spend ceiling are decided ATOMICALLY in one RPC under
the same advisory locks `reserve_ai_lite_generation` takes, and the worst-case cost is BOOKED there
before the call - `settleJudgeCost` reconciles it to the provider's number afterwards. Booking first
is not bookkeeping neatness: adding the cost afterwards from a value read before the call loses one
of two overlapping judgements. A missing record and someone else's answer fail identically, so the
endpoint is not a generation-id oracle.

---

## Appendix C - the OpenRouter-era Lite rounds (A-D) and route table

*Relocated verbatim from `docs/AI_LITE_PLAN.md` on 2026-08-08, when that plan was rewritten as
the student-deadline plan and stripped of everything historical. These sections describe the
configuration BEFORE the move to Vercel AI Gateway: the prices are OpenRouter prices and the
route names are OpenRouter route names, so nothing here is a current recommendation. The findings
that still bind are in `docs/AI_ATTEMPTS.md` and `src/ai/AGENTS.md`.*

## 0. What changed on 2026-08-07

Lite had been off in production **for everyone** since it shipped - `AI_LITE_ENABLED` was
never set on the Vercel project, so the greyed-out door was an environment variable, not code.
Nobody had ever used the `lite-lower-third-v3` prompt in production, which means every prior
opinion about Lite's quality was formed on evidence that did not cover it: the 2026-07-27
calibration measured hand-written gold specs, rounds d-j measured the SKIN experiment (off in
production, a different code path), and the 2026-07-29 model comparison measured *machine
usability* - "compiles and benches clean", which a grey square also satisfies.

Three things had to be true before a single generation could run, and only one was known:

1. **`AI_LITE_ENABLED` alone is not enough.** `taskConfigured()` refuses any OpenRouter route
   with an empty `AI_LITE_GATEWAY_PROVIDERS`, so enabling alone moves the status endpoint
   from `disabled` to `not-configured` and nothing else.
2. **The pinned fallback could not be served at all.** `liteGatewayPolicy` derives
   `maxInputPerMillion` from the *audited catalog snapshot*, which prices
   `qwen/qwen3-coder-next` at 0.11/M in. Its cheapest live endpoint is parasail/bf16 at
   **0.12/M in**; every endpoint is dearer than the cap computed from our own stale figure, so
   the fallback route had zero eligible endpoints. Repointed at
   `mistralai/mistral-small-24b-instruct-2501`, whose live price (0.05/0.08 on deepinfra/fp8)
   matches the catalog entry exactly.
3. **The 89% `provider_rejected` round has a structural explanation.** The historical allowlist
   was `google-vertex,google-ai-studio` - endpoints that serve the *primary* only. `only` is
   ONE list applied to every route, and `allowProviderFallbacks` is pinned false, so a primary
   hiccup had nowhere to go. The list now covers both routes.

Production now answers `enabled: true`, `reason: "sign-in"` - `configured` passed, which
independently re-confirms that both routes are catalog-approved, priced, allowlisted, keyed and
ledger-backed.

**Anonymous access remains OFF and is not ours to change.** `ANONYMOUS_PLAN['ai.lite'] = false`
puts OpenRouter spend behind an account. The proposal, with numbers, is §7.

### ZDR is provable per provider, for free

`?zdr=true` is a listing-level filter and no endpoint field carries a data policy, which is why
provider pinning has been guesswork. It need not be: **a model that appears in the ZDR listing
and has exactly ONE endpoint proves that endpoint's provider is ZDR-servable.** Measured over
the 30 qualified candidates: `deepinfra` (4 models, including `google/gemma-3-12b-it` and
`mistralai/mistral-small-24b-instruct-2501`), `coreweave`, `together`, `groq`, `parasail`,
`reka`. **Not** proven: `streamlake`, which is the cheapest endpoint of
`qwen/qwen3-30b-a3b-instruct-2507` - the 24/24 leader of the 2026-07-29 comparison. So that
route is a gamble rather than a free upgrade, and it is listed below as a candidate, not a
promotion.

---

## 1. The first round: what the shipped configuration actually produces

`bench:spike --suite=core`, 6 frozen briefs x 3 runs = **18 generations, $0.0051 total**,
prompt `lite-lower-third-v3`, primary `google/gemini-2.5-flash-lite`. Artifacts:
`lite-bench-out/round-2026-08-07/`.

| measure | result |
|---|---|
| machine-usable | **18 / 18** |
| validation rule codes raised | **none, on any generation** |
| repairs / second attempts | 2 / 3 |
| mean cost per generation | **$0.000285** (1.3k in, ~460 out) |
| mean latency | 17.8 s |
| chassis stable across 3 runs | 4 of 6 briefs |

**Cost is not the constraint and should stop being discussed as one.** The owner's ceiling is
~€0.01 (~$0.011) per generation. The measured figure is **2.6% of it**, and every open-weight
candidate in §3 is cheaper still. Nothing in this plan should be traded against price; the
budget has 30-100x headroom and the scarce resource is human review.

### The defect the frames show and every gate missed

Machine-usable was 18/18 with zero rule codes. Then the frames:

- **`long-name`** (lt11 House Strap): the name wrapped to 2 lines and the role to **3**. Five
  text lines, a ~350px-tall "lower third" - a card, not a strap. The brief had asked in so many
  words to "preserve hierarchy and fit without tiny text".
- **`news-reporter`** (lt25 Masthead): role wrapped to 2 lines, breaking its relationship with
  the design's own rule above it.
- **`multilingual`** (lt02 Underline): Ukrainian role wrapped to 2 lines. Same shape.
- **`story-headline`** (lt11): good. A two-line *headline* over a one-line location kicker is
  correct broadcast practice - the wrap is only a defect when the line carries identity
  metadata that belongs on one line.

Three of six frames, one mechanism. **No gate can see it**, and that is not an oversight in any
one of them: `overflow-sweep` asks whether a box escapes the frame and a wrapped line does not
(the panel grows downward); the runtime bench's stress pass doubles every value and asks the
same question; `type-floor` measures font *size*. A five-line lower third passes everything the
platform owns.

### The cause is ours, not the model's

The obvious reading - "the model picked bad typography" - is wrong, and checking cost one grep.
`lt02`, `lt11` and `lt25` all set `text-transform: uppercase` plus the family's wide
`--label-tracking` on their supporting line **in the design's own CSS**. The model never chose
it. Had this gone into the prompt it could never have worked.

What the model *did* do was believe `LITE_CATALOG`, which is the only capacity information it
has. `scripts/lite-line-capacity.mjs` renders each chassis, drives the real supporting field
through `update()`, and reads the painted result back - the field-coverage technique, inverted:

| chassis | advertised | measured 1-line max | transform | tracking |
|---|---|---|---|---|
| lt32 Scrim | **high** | **28 chars** | uppercase | 6.8px |
| lt11 House Strap | **high** | **39** | uppercase | 4.84px |
| lt25 Masthead | high | 47 | uppercase | 4.8px |
| lt05 Angle Slab | **medium** | **55** | none | normal |
| lt02 Underline | high | 58 | uppercase | 0.92px |
| lt15 Frost Strap | **medium** | **66** | none | normal |

*(The first pass bisected the frozen bank's longest role and reported exactly 48 for three
designs - the probe's length, not a measurement. The probe is now longer than any design can
hold, which is what turned "≥48" into 55, 58 and 66.)*

**The metadata was anti-correlated with reality.** Both designs advertising `medium` measure
widest - `lt15` holds **66 characters, 2.4x** the `lt32` that advertised `high` loudest and
holds 28. Tracked uppercase costs roughly a third of the characters a reader expects, and
`lt32` pays most for it (widest tracking, smallest size). The model was told to send long text
to `lt11` and `lt32`, which is exactly backwards, and the frames are what that instruction
produces.

**Fixed 2026-08-07.** `textCapacity: 'medium' | 'high'` is gone; `supportingLineChars` carries
the measured number, the digest states it with its unit, and the prompt's capacity clause names
it instead of asking for "realistic text capacity". Prompt version `lite-lower-third-v4`.
`node scripts/lite-line-capacity.mjs --check` is the gate, mutation-tested in both directions -
a claim above the measurement fails as a lie, a claim more than 4 characters below it fails as
stale.

## 1a. The A/B round: the capacity fix did not work, and the real cause is `scaleRatio`

Same 6 briefs x 3 runs, same model, same fixture bank; only the platform moved (v4 digest,
capacity clause, wrap check). **18 generations, $0.0053.** Artifacts:
`lite-bench-out/round-2026-08-07b/`.

| | round A (`v3-baseline`) | round B (`v4-capacity`) |
|---|---|---|
| mean capacity of the chassis CHOSEN | 48.6 chars | **49.3 chars** |
| `long-name` (needs ~48) | lt11, lt11, lt11 | lt11, lt25, lt11 |
| `multilingual` | lt02, lt25, lt02 | lt25, lt25, lt25 |
| identity lines that wrapped | 0 reported | **11 of 18** |
| machine-usable | 18/18 | 7/18 |

**+0.7 characters is noise** - round A varied its own chassis on two of six briefs. The design
the round failed on, `long-name`, still picks the 39-character `lt11` in two runs of three.
Telling the model the truth about capacity changed the metadata and not the behaviour, and the
claim in the commit that landed it ("fixes the round's headline defect at its source") was
wrong. **The A/B is the only reason that is known.**

**Why it could not have worked, measured afterwards.** `applyDesignAdjustments` rewrites the
very property `supportingLineChars` measures. The supporting line's size is derived from the
spec's `typography.scaleRatio` - `clamp(namePx / ratio, 14, namePx * 0.92)` - so the number the
digest states describes the design *as authored* and the pipeline then overwrites it:

| chassis | as authored | `scaleRatio: 1.2` | `scaleRatio: 2.6` |
|---|---|---|---|
| lt25 Masthead | 20px / **47 chars** | 48px / **19** | 22px / 42 |
| lt02 Underline | 23px / 58 | 47px / **28** | 22px / 61 |
| lt11 House Strap | 22px / 39 | 45px / **19** | 21px / 42 |
| lt32 Scrim | 20px / 28 | 45px / **14** | 21px / 26 |

A ratio of **1.2 - the legal minimum, and unbounded in the schema until this change** - nearly
doubles the supporting line and cuts capacity by 2-3x. That is the `university-speaker` frame
exactly: a 38-character role against a capacity of 19.

**So `scaleRatio` is the lever, not the chassis word**, and step 3 moves from hazard-closing to
the actual fix. Two things were also ruled out by measurement rather than argument: `sizeScale`
does NOT change capacity (the auto-fit cap is expressed per scale unit, so box and type scale
together - 58 chars at 1.0, 1.2 and 1.4 alike), and the wrap is not a per-design limit (every
design wraps at the same 806px shared cap).

**`bench-line-wrap` is therefore a WARNING, and that severity is measured too.** As an error it
failed 11 of 18; Lite has no repair loop on the grounded path, so it would have refused two
thirds of requests for a graphic that is mediocre but airable. It becomes an error the day
something can act on it.

**What the round is worth keeping for:** the check itself. Round A scored 18/18 machine-usable
with zero rule codes while three of six frames carried the defect. Round B names 11 of 18. The
gate is the deliverable; the metadata correction is true and inert.

## 1b. Round C, and the number that measured nothing

A third round (`v5-ratio-ceiling`, 18 generations, $0.0052) tested the fix §1a pointed at:
`applyDesignAdjustments` may no longer enlarge the supporting line past the size its design
authored. Verified deterministically first, across all six chassis - at `scaleRatio: 1.2`, which
previously produced 45-48px, every design now emits its authored size, so **no chassis can be
enlarged at all**.

The round then reported machine-usable **7/18 → 17/18** and wrapped identity lines **11 → 0**.

**That second number is worthless, and it is worth writing down why.** `bench-line-wrap` moved
from error to warning between round B and round C, and `scripts/ai-lite-eval.mjs` recorded
`ruleCodes` from `validation.errors` ONLY. So round B counted the findings and round C stopped
counting them. Nothing in the artifacts said so - the count simply went to zero, in exactly the
direction the change was hoping for.

It was caught by opening a frame. Round C's `long-name` is lt25, reported clean, and its role is
plainly on two lines. Reproducing that decision directly through `compileLiteDecision` raises
**two** `bench-line-wrap` findings. So:

- **The ratio ceiling is verified to do what it says** (no design can be enlarged) and is NOT
  verified to remove wraps. A 47-character role on lt25's 47-character capacity still wraps.
- **Round C's true wrap count is unknown** and cannot be recovered from its artifacts.
- `warningCodes` is now recorded beside `ruleCodes`, so the next round can be read at all.

**Round D (`v5-measured`, 18 generations, $0.0052) is round C's configuration re-measured with
that instrument.** The comparison that means something is B against D - each read at the
severity its own finding carried:

| round | wrapped identity lines | readable | machine-usable | `generation_failed` |
|---|---|---|---|---|
| A `v3-baseline` | 0 - the check did not exist | no | 18/18 | 0 |
| B `v4-capacity` | **11** (errors) | errors only | 7/18 | 0 |
| C `v5-ratio-ceiling` | 0 - counted nothing | **no** | 17/18 | 1 |
| D `v5-measured` | **6** (warnings) | yes | 17/18 | 1 |

**11 → 6.** The ceiling removes roughly half the wraps, and the residue is precise rather than
scattered: **all six findings are `long-name`, in all three runs** - the deliberately hostile
brief, whose 32-character name and 47-character role exceed every chassis in the allowlist. The
five other briefs are clean. That is the honest shape of the fix: it stops the pipeline
*creating* the problem, and it cannot invent width that does not exist (§1a).

**One regression to watch, and it may be ours.** `esports-player` returned `generation_failed`
in run 3 of BOTH v5 rounds, and in neither v3 nor v4 round - 2 of 2 under the new contract, 0 of
2 before it. `generation_failed` is REPAIR_FAILED, a semantic exhaustion rather than transport
(§9), so it is a quality signal.

**The mechanism was then established rather than assumed, and it is real.** `schemaAccepts` in
`api/_lib/aiGateway.ts` REJECTS an out-of-range number; the rejection becomes a retryable
`malformed_response`, retried inside a budget of two attempts, and exhausting it returns
`generation_failed` to the user. So `minimum`/`maximum` on `scaleRatio` converted a value the
compile had always CLAMPED into one that can spend the whole budget and deliver nothing.

That is the harness's clamp-don't-reject rule deciding the case, so the bounds came out again the
same day (prompt version `lite-lower-third-v6`). Two things worth separating:

- **The mechanism is proven; the attribution is not.** Nothing recorded which value
  `esports-player` actually emitted, so whether this is what failed it stays n=2 on one fixture.
  Removing the bound is right on doctrine regardless, and a later round can confirm the failure
  goes away.
- **The shown-but-illegal defect the bounds were meant to close is a MISMATCH** - a model told
  one range while the compile applies another - and agreement closes it. Refusing the response is
  a different thing, and on a clamped field it is a strictly worse one.

`sizeScale` carries the identical shape (bounded 0.7-1.4 on the wire, clamped at compile) and was
deliberately left alone: nothing has measured it firing, and 0.7-1.4 is a wide range. Revisit it
with evidence rather than by symmetry.

The lesson generalises past this instrument: **changing a finding's SEVERITY changes what the
instrument counts, and a metric that reads errors will report the change as an improvement.**
Round A had already shown the mirror image - 18/18 machine-usable with zero rule codes while
three of six frames carried the defect. Both times the artifacts agreed with each other and
disagreed with the picture, and both times only a rendered frame settled it.

### A hazard the round did not trigger, stated as a hazard

`designAdjust.ts` derives the supporting line's size as `clamp(namePx / ratio, 14, …)` - a
**14px** floor, while `scripts/type-floor.mjs` holds a lower third to **20px**. `scaleRatio`
carries no `minimum`/`maximum` in the Lite schema at all (it is clamped 1.2-2.6 in code only) -
the shown-but-illegal shape `narrowVariantTool` exists to prevent, one field over. Independently,
`sizeScale` reaches `--scale` through `computeScale`, so a legal 0.7 multiplies every text size:
a 20px title renders at 14px, and a ratio-shrunk title at ~9.8px. Nothing re-measures the
ADJUSTED result - the catalog gates certify a design **as authored**. No generation in this
round did it; the arithmetic says it is reachable, so it needs a gate, not a paragraph.



## 3. Routes, with real prices

Measured 2026-08-07 from the live OpenRouter listing plus each candidate's endpoints. Cost per
generation uses this round's own measured shape, 1.3k input / 460 output.

| role | route | $/M in-out | est. $/generation | % of the €0.01 budget | open weights | ZDR endpoint |
|---|---|---|---|---|---|---|
| **primary today** | `google/gemini-2.5-flash-lite` | 0.10 / 0.40 | **$0.000285** *(measured)* | 2.6% | no | google-ai-studio, google-vertex |
| **fallback today** | `mistralai/mistral-small-24b-instruct-2501` | 0.05 / 0.08 | $0.000102 | 0.9% | yes | **deepinfra (proven)** |
| candidate | `google/gemma-3-12b-it` | 0.05 / 0.15 | $0.000134 | 1.2% | yes | **deepinfra (proven)** |
| candidate | `openai/gpt-oss-20b` | 0.03 / 0.13 | $0.000099 | 0.9% | yes | multi-endpoint, unproven |
| candidate | `qwen/qwen3-30b-a3b-instruct-2507` | 0.048 / 0.193 | $0.000151 | 1.4% | yes | streamlake, **unproven** |
| judge (off) | `google/gemini-2.5-flash` | 0.30 / 2.50 | ~$0.0022 | 20% | no | google-* |

Two conclusions, and the first is the important one:

- **Every candidate fits the budget with 30-100x headroom, so route choice is a QUALITY
  decision, not a cost decision.** The 2026-07-29 comparison is the only Lite-task evidence
  that exists (gemma-3-12b-it 23/24, qwen3-30b 24/24, incumbent 22/24) and it measured machine
  usability, which §1 has now shown says nothing about whether a frame is airable. A route
  change should wait for the §5 loop to produce a scorecard that measures the right thing.
- **The judge costs 8x a generation.** At 20% of the budget for a single call it is affordable,
  and it is still not worth switching on - see §4.

Recommendation: **leave the primary alone for now.** The open-weight preference (plan §15.1) is
real but it is a tie-breaker at parity, and parity has not been measured on anything that
matters yet. Switching the primary today would replace a baseline we have just established with
one we have not.


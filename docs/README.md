# docs/ — what to trust, and for what

The map of this directory. Every file below is classified by what it is TODAY; a doc whose
header says HISTORICAL is kept for rationale and must not be read as current behaviour.
When work changes what a binding doc describes, update the doc in the same PR (root
`AGENTS.md` rule); when a plan finishes, mark it historical here and in its header rather
than letting it read as open.

Layers of documentation, top to bottom:

1. **Vision & principles** — root `AGENTS.md` (identity + non-negotiables),
   `GOALS.md` (north star, business posture, and the OPEN roadmap; shipped milestones live in
   `GOALS_ARCHIVE.md`).
2. **Cross-domain architecture** — `ARCHITECTURE.md` (binding, machine-enforced).
3. **Domain contracts** — nested `AGENTS.md` files (with thin `CLAUDE.md` imports) plus the
   binding docs below.
4. **Active plans** — work that is decided but not done.
5. **Rationale / historical** — completed plans and measurement records, kept because they
   explain why the code is shaped the way it is. Git preserves everything; these stay
   because they are still *read*, not because deleting them is hard.

## Binding contracts (current truth — keep updated)

| Doc | Contract for |
|---|---|
| `ARCHITECTURE.md` | The modular monolith: domain registry, allowed import edges, debts. Machine-enforced (eslint + dependency-cruiser). |
| `STATE_MACHINE_SCHEMA.md` | What a graphic IS: `NOACG_ANIM` v2, states/transitions/events, the default path, snap, versioning doctrine (§5), the node editor. |
| `GRAPHIC_TYPES.md` | The type registry: type vs design, the six promotion gates, the factory. |
| `PACK_TAXONOMY.md` | The 60 reference formats → packs mapping, the nine sports discipline packs, and the gap list. |
| `SPORTS_PACK.md` | The sports pack: 5 types × 4 families, the match clock, the fixtures board, and the capability matrix of every shared type it uses or extends. |
| `COMPETITION_PACK.md` | The esports / competition / result / reveal pack: its 12 types, their state flows and events, and how the four categories share one assembler. |
| `PUBLIC_SERVICE_PACK.md` | Tickers, alerts and public information: the capability matrix, what "a real ticker" and "a real alert state" mean, and the platform limits the pack ran into. |
| `CONTROL_LAYER.md` | Operator surfaces: the one generator, the ControlMessage protocol, shows, hosted control (migration 0008), staging + event log. |
| `CONTROL_PANEL_PARITY.md` | MEASURED, 2026-08-09: what an operator can actually do on `#/control/<id>` for a lower third and for each interactive type (quiz, live vote, scoreboard, countdown), the nine gaps ranked, and what a Lite-generated interactive graphic would need on top. |
| `SAVED_CONTENT_MODEL.md` | The library: GraphicDoc, packages-as-folders, hash routes, control entries, Save semantics. |
| `DESIGN_LANGUAGE.md` | The taste bar: typography, color, motion doctrine, the §8 family tokens, generated-code style. |
| `FOOTPRINT_STABILITY.md` | The STAGE contract: which graphics may change size with the operator text and which may not, the width and height mechanism behind it, and the measurements that shaped both. Summarised in `src/templates/AGENTS.md`. |
| `KIT_MATRIX_GAPS.md` | The standing kit gap report: the (type × family) matrix as it resolves, the core six a kit owes a show, and which designs no kit can reach. |
| `CATALOG_VARIETY.md` | INVESTIGATION, unscheduled (2026-08-09): where the catalog's sameness actually comes from, measured off the emitted code — the style family predicts 3 of 14 visible decisions and the graphic category predicts the rest; the 119 kit-unreachable designs triaged; what is missing entirely; a proposal for design DIRECTIONS scoped to a kit, with a distinctness gate and a cost per direction; and the palette-freedom measurement (148 designs cannot take a light palette). |
| `CATALOG_WORK_QUEUE.md` | THE QUEUE (2026-08-21): what the catalog still owes, ordered, with the measurement under each item — the missing lower-third SHAPES (99 of 103 designs are one silhouette), the first-page ordering that is already built, the `ig01` re-file, and the standing debts. Carries the owner's binding position that sameness is a defect, not a house style. Its drawing brief is `handoffs/lower-third-shapes.md`. |
| `LOOKS_AND_PALETTES.md` | NOTE, unscheduled: measured evidence that the catalog reads as one product (four families, four palettes, four faces, almost all dark-panel), what more looks would cost, and the anti-slop rules any new look is held to. **Superseded on the measurement by `CATALOG_VARIETY.md`** — the declared axes are not where the sameness lives. |
| `SPX_TEMPLATE_FORMAT.md` | The external SPX contract this product targets (reference; keep in sync with SPX). |
| `TIMELINE_INTERACTION_MODEL.md` | The editing surfaces' interaction contract (selection, keyframes, playhead, what NoaCG deliberately does not copy from NLEs). |
| `IMPORT_MVP.md` | The Import Graphic flow: the structure contract, fit modes, Prepare/erase, 9-slice stretch. Shipped; doubles as the domain record. |
| `RENDER.md` | The render service: manifest kinds, virtual clock, tiers, security posture, deploy checklist. |
| `ADMIN.md` | The private admin surface and the entitlement system: the resolver and its precedence, plans/grants/overrides, roles, the 404-not-403 gate, the audit log, the internal-account usage scope, the beta feedback inbox, migrations 0017+. |
| `MODEL_ROUTE_AUDITS.md` | The register of hand-performed audits behind `APPROVED_MODEL_CATALOG` - how a ZDR audit is done, and one section per audited route. A `zdrAvailable: true` entry with nothing here is an unbacked privacy claim. |
| `DATA_API.md` | The Production Data API, for the external integrator: per-production data key, `POST /api/data/update`, field-label mapping, ordering guarantees, rate limits, curl examples. The server-side ingress of `CLOUD_PLAYOUT.md` §7. |
| `SPORTSDB.md` | The TheSportsDB connector: what the free V1 API actually offers (verified, incl. why it is NOT a real-time scoring feed), the normalized sports contract, the production-data patch it emits, and the one write call still blocked on the production-data contract. |
| `EXPORT_TARGETS_RESEARCH.md` | Where exports run: shipped targets + the doctrine for adding one. |
| `PLAYOUT_INTEGRATION.md` | The USER-facing setup guide for the playout side: choosing between the cloud output URL, self-hosted output and portable export, then CasparCG (incl. which server versions carry the old CEF), OBS, vMix and SPX, with a troubleshooting table and an explicit statement of what has been tested on real hardware. |
| `NATIVE_PLAYOUT_RESEARCH.md` | RESEARCH, nothing built (2026-08-16): what it would take for NoaCG to reach SDI / NDI / IP without CasparCG, OBS or vMix. Why SDI is inherently a local box (Singular included), the four routes with their real costs and licences (AMCP client, forking the server, our own CEF-based agent, GStreamer), the playout problems a graphics-only scope avoids, and the staged order if it is ever done. Verdict: own the client and the agent, rent the engine. |
| `FORMATTING.md` | What Prettier may and may not touch, and why. |
| `DEV_PORTS.md` | Per-worktree dev-port reservation. |
| `DEPLOYMENT.md` | CI + Vercel production runbook: the pipeline, the 12-function budget, deploy verification (`deploy-verify.yml`, `version.json`), opt-in previews, rolling-issue alerts, and where to look when production stops updating. |
| `AI_LITE_BENCHMARK.md` | The NoaCG Lite model-evaluation benchmark: the context-assembly trace, the shared compile pipeline (`src/ai/litePipeline.ts`), suites, calibration, regression vs model comparison, blind review, storage boundaries. |
| `AI_LITE_PROMOTION.md` | Lite route promotion policy: eligibility gates (thresholds owner-TODO), ranking, the proposed-route output, and the manual broadcast verification checklist. |
| `AI_LITE_PLAN.md` | ACTIVE PLAN: how Lite gets good and stays inside the ~€0.01 budget - what the 2026-08-07 switch-on and first real round measured, the route table with live prices, what the model decides vs the platform, why the judge stays off, and the build order. |
| `ACCEPTANCE_SPX_CASPARCG.md` | OPEN manual checklist: the parts of acceptance only a real SPX/CasparCG stack can prove. Not yet run. |

## Active plans (decided, not done)

| Doc | State |
|---|---|
| `GROWTH_EXECUTION_PLAN.md` | The adoption push. Locked 2026-07-08; only open signup done. The §9 backlog is the work queue when growth resumes. |
| `NIGHTLY_AUTOMATION_PLAN.md` | Era 7. Job A (CI/health gates) built; generation jobs B/C plan-only, waiting on the §10 decisions (they spend real money nightly). |
| `VIDEO_DESIGN_QUALITY_PLAN.md` | Video AI quality. Most of it landed (arm B, fonts, readability gates); still open: the experiment-gated vision critic (§3.5) and the chip-set palette decision (§3.6). |
| `AI_WIZARD_PLAN.md` | Create-with-AI review + six-phase plan (2026-07-24). **Phases 1, 2, 4 and 6 built** — every offline-provable phase is done (visual alternatives + non-destructive refine; one thread with conversation-as-context, mid-thread attachments and "3 more like this"; brand colours from an uploaded logo + saved looks; the on-air readiness report + cost expectation). Only **phases 3 and 5 remain, and both spend real API money**. One open question: whether the thread should persist (§6.2). |
| `ADAPT_FIRST_PLAN.md` | The Create-with-AI pivot toward adapting proven designs (2026-08-03). **Stage R (retrieval), Stage P (the chassis keeps its zone) and the size clamp are built**; §1 is the catalog geometry measurement behind them (`scripts/catalog-geometry.mjs`, 430 variants) and §7 is the evaluation plan. Open and each priced in §6: re-baselining the adapt path, folding Lite onto the platform zone rule, and the paid shortlist-vs-digest round. |
| `CATALOG_LAZY_LOADING_PLAN.md` | **Design note only, nothing built.** The catalog is eagerly loaded for every visitor: `/app` boots 802 script modules in dev, 520 of them `src/templates`. **Production measured 2026-07-31: 1 171 KB transferred, 1 612 ms to a usable editor** — the "4.16 MB" in the first draft was the DECODED chunk, not the wire, and the note now says so. The stage-1 audit found the blocker is two declared values per variant, so the fix is small; the measurement says it is also **not urgent**, and the one reading that could change that (real mobile hardware) has never been taken. Two questions open for the owner: when, and category-vs-pack. |

## Rationale / historical (do not read as current behaviour)

| Doc | What it explains |
|---|---|
| `GOALS_ARCHIVE.md` | Every milestone that shipped up to 2026-08-07, with its date and rationale, plus the ratified decisions behind them. The live roadmap is `GOALS.md`. |
| `ERA5_PLAN.md` | Why the server era is shaped as it is (Supabase, AGPL split, offline invariance). Shipped through 5.6; 5.7 payments open. |
| `TIMELINE_PLAN.md` | The pre-v2 timeline direction + the Loopic/SPX competitive research. Superseded by Timeline v2. |
| `WYSIWYG_PLAN.md` | The first canvas-editing slices and their guardrails. Shipped and extended. |
| `TIMELINE_V2_PLAN.md` | The declarative-timeline rewrite: the audit, the twelve decisions, the category migration story. Complete. |
| `DYNAMIC_MOTION_SCOPE.md` | Why measured motion is a named-builder primitive (`dynamics`) and not an expression language. Shipped. |
| `PRESET_MODEL_REVIEW.md` | The keyframe model's expressive range: which gaps closed (most) and which stay open by choice (stagger knob, springs, per-property duration, motion paths). |
| `THEME_DEFAULTS_REVIEW.md` | The family-token audit behind the applied 2026-07-21 defaults. Open remnant: the `labelColor` / `displayTracking` re-modelling questions. |
| `HYPERFRAMES_QUALITY.md` | Video-engine bench measurements + the corpus. Note its own header: measurements are dated records, not promises. |
| `BROADCAST_DESIGN_SYSTEM_RESEARCH.md` | The skills evaluation + reference-library architecture. Shipped on `SELECTION_MODE='legacy'` with the 14-card pool; contrast selection measured and rejected. |
| `noacg-master-goals.md` | The five-phase template-library / state-machine / control-layer master plan. **All five phases complete** (2026-07-19 → 2026-07-21). §1.4's acceptance criteria remain the model's standing tests. |

## Untracked companions (primary checkout only)

- `live_format_graphics_needs.xlsx` (repo root) — the 60-format source data behind
  `PACK_TAXONOMY.md` and the type frequencies.

## Where the roadmap lives

`GOALS.md` is the ONE roadmap — never duplicate it into a second file. It holds only what is
**not done**, and stays under ~200 lines so it can be read in one sitting. When a goal lands,
move its entry verbatim into `GOALS_ARCHIVE.md` (the complete shipped record, with dates and
rationale) and delete it from `GOALS.md`. When the direction changes, rewrite `GOALS.md`; the
archive keeps the history. Plans get their own doc only while they need design rationale; when
they finish, they move to the historical table above.

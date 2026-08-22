# AGENTS.md

Guidance for AI agents working in this repo. Keep it accurate - update it when architecture or
conventions change. This root file holds the product identity, the non-negotiables and the working
practices; **deep per-area contracts live in nested `AGENTS.md` files** (marked * in the map
below) - read the relevant one before editing that area from outside it.

Be concise with all of your responses.

## What this is

**NoaCG Studio** - an **AI-assisted, multi-platform** browser tool for creating modern, premium
HTML broadcast graphics and exporting them to **many broadcast/streaming environments**
("anything-goes export": SPX Graphics, CasparCG, OGraf, OBS/vMix overlays today; more over time).
For TV channels, streamers, organizations and universities, technical and non-technical users alike
- it is used in teaching, but it is a production tool, not a code tutorial.

**Free forever for the core; the only paid surface is hosted AI without a BYO key; the current goal
is users/adoption, not revenue.**

Brand: dark control-room, one amber "on-air" accent, restrained glow. `NoaCG-Brand-Kit/BRAND-MANUAL.md`
owns the palette and records which shipped typefaces diverge from it, and why.

Binding docs, read before generating or judging templates: **`docs/DESIGN_LANGUAGE.md`** (taste +
motion + code style) and **`docs/GOALS.md`** (north star + what is NOT done - a landed goal moves
verbatim to `docs/GOALS_ARCHIVE.md`, and GOALS.md stays under ~200 lines).

**Current push (from 2026-08-22): STUDENTS MAKE THEIR OWN GRAPHICS AND PLAY THEM OUT** - binding
roadmap in the "NOW" section of `docs/GOALS.md`; the student release before it is CLOSED (history
in `docs/GOALS_ARCHIVE.md`). A student draws their own graphic - any graphic, not a lower third -
gets the BEHAVIOUR their show needs onto it, and plays it out **without writing a line of code**.
Two graphics decide it by **2026-09-12**, a real production: a QUIZ (lock / reveal) and a
SCOREBOARD (score + / -). SVG import is how the artwork gets in. Wizard-first still holds for the
catalog road, CasparCG + OBS are still the verification targets, AI work stays postponed.

**The pillars (keep every change true to these):**
- **Best & easiest to create - and put on air** - premium output with the least friction; a
  non-technical user can make a great graphic AND run it live without ever touching code.
  **AI-assisted** (later), but a pro keeps full control.
- **Export anywhere, SPX-canonical** - SPX is the canonical *internal* format and the strictest
  validation target; every other target is an adapter off the same source. SPX compatibility stays
  rock-solid, but the product is not "an SPX generator."
- **Code is real & always available, view optional** - every visual/AI action writes real
  HTML/CSS/JS; **nothing hides behind a visual-only scene model**. No-code users keep the view
  hidden, pros work in it. Generated code is clean and commented; exports are always plug-and-play.
  The student release demotes only the VIEW (the editor becomes Advanced mode), never the code.

## Commands

```bash
npm install
npm run dev      # Vite dev server (landing at /, THE STUDIO AT /app)
npm run build    # tsc && eslint && vite build -> dist/   <-- run after changes; it's the CI gate
npm run lint     # eslint . --max-warnings 0 (also part of build)
npm run test:worktree-safety  # Git-safety regression tests for shared workflows
npm run check:workflows       # .github/workflows/*.yml + .github/actions/*/action.yml (in build)
npm run check:vercel-config   # vercel.json routes (in build)
npm run check:function-budget # api/'s function count (in build)
npm run check:freshness       # vendored GSAP/Lottie + pinned model ids - REPORTS, weekly, not a gate
```

`check:vercel-config` and `check:function-budget` guard failures that are **invisible on Vercel**:
both are refused BEFORE a deployment exists, so they show nowhere on the dashboard, only in the
GitHub commit status. Each froze production once (`docs/DEPLOYMENT.md`).

**The dev port is per-checkout** and RESERVED through a ticket, not merely hashed, so two worktrees
that hash alike still both start: 5174 in the main checkout (5175 for the live e2e suite), a
reserved port from the 5180-5298 block in a linked worktree. `scripts/dev-port.mjs` prints it, and
Vite, both Playwright configs, the guard hooks and the dev scripts all read that same number.
`.claude/launch.json` and `.claude/dev-port.json` are GENERATED from that reservation (gitignored -
never hand-edit or commit them). `DEV_PORT=n` overrides everything. Details:
**`docs/DEV_PORTS.md`**; `npm run test:ports` covers the allocator.

**Nine pages (Vite MPA).** Clean URLs come from the `app-clean-url` plugin in dev/preview and
Vercel `cleanUrls` in production.

| URL | Entry | What it is |
|---|---|---|
| `/` | `index.html` | static landing, no React; carries a redirect shim so old root `?chat=`/`?template=` share links land on `/app` with their query |
| `/app` | `app.html` | the studio: home, wizard, productions - the editor is its Advanced surface. E2E specs navigate here |
| `/admin` | `admin.html` | PRIVATE admin surface - unlinked, `noindex`, a plain 404 for everyone the server does not recognise (`docs/ADMIN.md`) |
| `/output?production=<slug>` | `output.html` | the transparent browser-output RENDERER a production client (CasparCG/OBS/vMix) loads once (`docs/CLOUD_PLAYOUT.md`) |
| `/join/<name>` | `join.html` | PUBLIC audience page (also `/join?p=<slug>`, `?pv=<slug>` for the presenter view) - vanilla TS, `noindex` (`docs/INTERACTIVE_PLAYOUT_PLAN.md` Phase 5) |
| `/terms` | `terms.html` | PUBLIC terms for accounts and optional hosted services |
| `/privacy` | `privacy.html` | PUBLIC privacy policy, including managed AI and Custom/BYO processing |
| `/ograf` | `ograf.html` | PUBLIC free OGraf starters - built by the real exporter on click (`src/ograf/`, `docs/OGRAF.md`) |
| `/bridge` | `bridge.html` | the headless BRIDGE the `noacg` CLI / MCP server drives (`src/bridge/`, `docs/AGENT_CLI.md`) - the platform's own scaffold/validate/bench/package functions on `window.noacgBridge`; `noindex`, no account, no key |

## Non-negotiable principles (these override default behaviour)

1. **Code is the single source of truth.** `SpxTemplate` (html/css/js + parsed definition) is
   canonical. Visual/AI/block actions emit *deterministic, readable code patches*, never a hidden
   scene model; the editor always reflects exactly what was written.
2. **Generated code must be clean, commented, and easy to edit.** Prefer simple, obvious code over
   clever code; rich-but-commented CSS is the house style.
3. **Self-contained, no unnecessary dependencies.** GSAP is bundled locally
   (`src/assets/gsap.min.js`); so is the Lottie player (`src/assets/lottie.min.js`, lottie_light/
   MIT - injected only when the template uses a Lottie asset; detector in `assets/lottieSupport.ts`).
   No runtime deps or CDN references in generated templates; exports use relative paths only.
4. **Validate before export.** `validation/validateTemplate.ts` is the gate; export is blocked on
   errors. Keep it authoritative - the platform owns SPX compatibility, not the AI.
5. **Blocks and AI are deterministic transforms** `(template) => template` inserting clean code.
6. **Every persisted format carries a version, and a breaking change ships its migration in the
   same commit.** The catalog is large and templates are saved documents, so a shape change
   without a migration is data loss. The pattern (`docs/STATE_MACHINE_SCHEMA.md` §5, implemented
   in `blocks/animData.ts` and `model/layout.ts`): additive optional fields never bump the
   version; a breaking change bumps it and migrates ON READ, normalizing so everything
   downstream sees one shape; serialization always writes the current version; an unknown
   version degrades honestly (read-only, never a crash), so an older build never eats newer data.

## SPX template format (the contract)

Full reference: **`docs/SPX_TEMPLATE_FORMAT.md`** (derived from `example_projects/`). Essentials:

- A global `window.SPXGCTemplateDefinition = { ...settings, DataFields: [...] }` describes the
  operator's fields. Fields are `f0`, `f1`, … with an `ftype` (textfield, number, dropdown, …).
- SPX calls global `play()`, `stop()`, `update(data)` (a **JSON string**), and `next(data)`.
- **Field -> DOM convention (this project): each field `fN` maps to one element `id="fN"`**, which
  `update()` writes into via `getElementById`. **No hidden `.spx-data` holders, no `_gfx` display
  split** - that older "premium pack" style is documented but not what we generate. An input-only
  value (e.g. a countdown duration) may live in a hidden `<div id="fN" style="display:none">`.

## The state-machine model (what a graphic IS)

Full reference: **`docs/STATE_MACHINE_SCHEMA.md`**. A graphic is data fields + one or more PARALLEL
state groups, all inside the one `NOACG_ANIM` data block (format version 2) in the marked ANIMATION
region - no second scene model, no parallel format. The rules that change behaviour:

- A **state** is what the graphic looks like; its content is a timeline. A **transition** is an
  animated change, fired by an operator **event** or a **timer**. Guarding is STRUCTURAL - a
  transition fires only if the author drew that arrow from the current state. No expression
  language, ever.
- **The default path** is the ordered walk `next` follows - the SPX/CasparCG compatibility
  contract. Every template, however complex, degrades to dumb-stepping along it. `steps` IS that
  path: `defaultPath[i]`'s timeline is `steps[i]` (the positional binding).
- **Data updates never cause transitions.** `update()` writes fields; state changes come only from
  events (a payload may ride an accepted event, which is what makes a multi-part change atomic).
  **Parameterize with data, not states** - one `Selected` state plus a field, never four
  near-identical states.
- **Every state is enterable two ways:** by transition (animated) or by SNAP (instant - recovery,
  emergency jumps, preview without playback). **Reset is two operations**, never conflated: reset
  visual state (snap every group to its initial) and reset data.
- Events are processed SERIALLY through one queue per graphic, and that queue lives INSIDE the
  template - so the determinism holds identically in the editor, in an exported overlay, and under
  SPX.
- **Control pages are GENERATED from the machine** (`docs/CONTROL_LAYER.md`): every event a button,
  every field an input, legality = the structural guard mirrored as greying.
- A template with no `machine` key IS the implicit one-group linear machine, derived on read and
  never persisted, so the existing catalog behaves exactly as before. A **graphic type**
  (`docs/GRAPHIC_TYPES.md`) persists a machine only when the derived one is wrong.

## Architecture map

Directories marked * have their own `AGENTS.md` (with a thin `CLAUDE.md` importing it) holding the
binding per-area contracts - read it before editing that area. The cross-domain rules - layers,
allowed import edges, where new code goes, UI thinness, the grandfathered-debt list - are binding in
**`docs/ARCHITECTURE.md`**; a change that adds a domain-to-domain edge updates that doc in the same
PR.

```
src/                     (* = has its own AGENTS.md; read it, this line is only the label)
  model/ *     SpxTemplate types, SPX parse/serialize, catalog data, fonts, brand, library, shows
  templates/ * the wizard catalog, the :root style contract, the GRAPHIC TYPE registry
  store/ *     templateStore.ts (zustand) - the applyTemplate/undo choke point; saveActions.ts
  blocks/ *    deterministic transforms: blocks, field editing, Timeline v2, animMachine.ts
  ai/ *        the SPX GENERATION HARNESS; ai/video/ is the parallel VIDEO motion harness
  export/ *    the export registry - 6 targets + whole-SHOW export + packaging conventions
  render/ *    RenderManifest, HOLD schedule, tier limits, virtual clock, job store (docs/RENDER.md)
  landing/ *   the landing page's GSAP motion system. POLICY: never fakes product UI
  components/ * the React app: AppShell, CodeEditor, timeline dock, Inspector, canvas/, wizard/,
               auth/, save/, home/, video/, icons.tsx
  app/         router.ts - HASH ROUTING for /app (docs/SAVED_CONTENT_MODEL.md §3)
  preview/     composeDocument.ts - inlines CSS + GSAP + JS + assets into the iframe srcdoc
  editor/      Monaco VIEW-only helpers (comment visibility as decorations, never edits)
  video/       the video pipeline: compile, validate, fonts (SINGLE source, so preview == render)
  validation/  validateTemplate.ts (export + AI gate) + runtimeBench.ts (the live-iframe bench)
  control/     the CONTROL LAYER (docs/CONTROL_LAYER.md): ONE generator, the ControlMessage
               protocol, three receivers, the staged-vs-take model
  backend/     the OPTIONAL Supabase backend: config.ts isBackendConfigured is the ONE
               feature-detection point (unset env = pure offline mode); auth, sync, assets
  audience/    the AUDIENCE plane (docs/INTERACTIVE_PLAYOUT_PLAN.md Phase 5): ONE AudienceBackend
               interface + localAudience / audienceData providers. The interface has NO method
               reaching the command log - that is how "nothing viewer-written airs without an
               operator" is structural rather than remembered. joinSurface.ts is the one renderer
               both the public page and the operator preview mount
  community/   shared templates (signed-in only), validated + benched at publish AND import
  entitlements/ the PURE access contract (docs/ADMIN.md): ONE resolver, precedence
               default < plan < temporary grant < manual override, every value carrying WHY;
               permissions.ts = what a CREDENTIAL may do (docs/AGENT_SAVE.md)
  feedback/    the PURE feedback contract (docs/ADMIN.md §10) - one vocabulary, four consumers
  admin/       the PRIVATE admin page. Never a security boundary. Usage sections count OTHER
               PEOPLE by default (the ScopePicker excludes internal accounts)
  output/      the browser-output RENDERER - one persistent transparent capability URL per
               production, following the hosted-control log with boot recovery (docs/CLOUD_PLAYOUT.md)
  bridge/      the headless BRIDGE page (/bridge, docs/AGENT_CLI.md): the platform's own
               scaffold / validate / bench / compose / package / inspect functions on
               window.noacgBridge, driven by the `noacg` CLI + MCP server through a headless
               browser. The editable-neutral scaffolds live in templates/types/neutralDesign.ts;
               the OGraf manifest -> operator-surface adapter in control/ografContract.ts
cli/           the `noacg` CLI + MCP server (its own package, published to npm): an external
               coding agent's door - scaffold, validate, inspect, screenshot, save - over the
               bridge page of whatever NoaCG deployment NOACG_URL names; `login`/`save` hold a
               SCOPED AGENT KEY (docs/AGENT_SAVE.md). Ships the canonical
               `noacg-graphic` skill; the in-repo adapters under .claude/skills + .agents/skills
               point at it (docs/AGENT_CLI.md)
public/fonts/  the 17 bundled woff2 fonts (served at /fonts, copied into exports). A picked
               GOOGLE family (model/googleFonts.ts) is fetched at design time and embedded in
               template.assets like an upload - never referenced by the emitted code
src/assets/    bundled gsap.min.js, lottie.min.js, OFL.txt (the ONE licence source) + asset helpers
src/teach/     the Monaco tooltips
scripts/       dev-port + port-registry (the per-worktree RESERVATION), the catalog quality gates,
               ai-compare + ai-bench (both SPEND TOKENS), render-smoke, worktree-activity (who else
               is in flight), merge-order (which branch should land FIRST), hooks/
api/           server-only Vercel functions: the render service, the AI model gateway, Lite
               profile/allowance, sealed user-key endpoints, the production DATA API
               (docs/DATA_API.md - external data as update rows in the control log),
               api/admin/* behind _lib/adminAuth.ts (404 for every refusal), the agent-key +
               save routes under api/me (docs/AGENT_SAVE.md). Typechecked by tsconfig.api.json
render-worker/ the Remotion renderer, and player-host/ the preview host - own exact-pinned packages
player-host/   so the non-OSI licence never enters the AGPL bundle. Built into public/player-host/
               as ONE self-contained page, loaded with sandbox="allow-scripts" ONLY (never add
               allow-same-origin), postMessage with a per-session nonce
```

### Auth posture (the open studio)

**There is no login wall, ever.** The studio - create, preview, export, local saves - is open to
everyone, hosted or self-hosted. Only *account features* gate themselves: cloud sync, community,
show chat, and AI (hosted mode). Offline builds (no Supabase env) must grow **zero** auth UI
(E2E-pinned in `e2e/auth.spec.ts`). Don't reintroduce an app-wide gate; the `needsSignIn`/
`SignInPrompt` pattern lives in src/components/AGENTS.md.

### The choose-first creation flow (primary UX)

New projects go through the **CreationWizard** (Entry -> Browse -> Fields -> Style -> Animation ->
Finish, persistent live preview); `variant.create(options)` generates the complete, commented
template, applied with `resetSampleData: true` so a project starts from its own field defaults.
Entry leads with **Continue working**, then the broadcast-graphics cards - templates, **"Create
with AI"** (THE one AI door; its ⚙ settings pick the TIER: Lite, Pro, Custom/BYO), **"Import
graphic"** (artwork -> erase/scale -> place text fields), blank - with the video strip separate,
marked Beta. **Finish** is the flow's one branch: open it in the editor, or **export it
without the editor ever opening** - export is not a reward for opening the editor. After creation
the Style panel writes the `:root` contract and the step timeline touches ONLY the marked ANIMATION
region - user code outside the markers is never modified, and the timeline dock picks its surface
from the CODE, never the category, which keeps pre-migration templates working. Per-surface detail:
src/components/AGENTS.md; the Browse storefront's facets: `docs/TEMPLATE_TAXONOMY_PROPOSAL.md`.

## Verifying changes

Six rules; the full procedure is **`docs/VERIFICATION.md`**.

1. **Always `npm run build`** (typecheck + lint + build) after changes, and keep the tree
   lint-clean rather than adding eslint-disable comments. There is no application unit-test suite;
   never mark observable work done on a green build alone.
2. **UI flows -> Playwright**, and add a spec for any new flow *plus its mapping in the same
   commit*, or it only ever runs at night. Use `npm run test:e2e:focus:queued` during the sprint.
3. **One browser-driving job per MACHINE, not per worktree** - a suite, a catalog sweep, a bench
   and a `*spike*` run are the same workload, and this laptop is RAM-bound. Use the `:queued` form
   of any e2e script; `NOACG_ALLOW_PARALLEL_E2E=1` overrides. **Which commands count is ONE named
   list** (`SWEEP_SCRIPTS`, `scripts/command-match.mjs`), read by both the guard hook and the
   process detector - a job known to one and not the other is a silent hole. A script missing from
   it is not blocked and not detected: the spike family was missed until 2026-08-15 and ran three
   times beside a live suite. Name a new browser-driving script like its siblings (`*bench*`,
   `*spike*`, `*-sweep`) or add it there.
4. **The pre-merge gate belongs to CI, not the laptop** - it does strictly more, in about ten
   minutes, on a clean checkout. **A clean `git merge main` is not proof the integration
   worked**: both sides were verified against a tree that no longer exists. After taking `main`
   in, run `npm run test:e2e:integration:queued` (the affected plan from the FORK POINT, so it
   covers BOTH sides' changes) before pushing or landing; CI plans a merge commit from the fork
   point too, so a forgotten local run is no longer a silent hole. **A job that stops AT its own
   `timeout-minutes` is not a verdict** - re-run the unchanged SHA before bisecting: Playwright
   splits shards by TEST COUNT, not by measured time, so a healthy shard that drew the slow tests
   reads exactly like a regression. **A GREEN run is not one either until you read WHICH JOBS
   RAN** (`gh run view <id> --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'`): an ordinary
   push still plans from the PREVIOUS PUSH, and a new push cancels the run in flight - so a small
   second push plans only itself and skips every shard while the run that covered the real change
   never finished. `gh workflow run ci.yml --ref <branch>` asks for the full suite; the
   measurement is in `docs/VERIFICATION.md`.
5. **After a catalog change run the five catalog gates** (`type-floor`, `overflow-sweep
   --baseline`, `test:e2e:catalog`, `field-coverage`, `numerals`) plus `l3-sweep` for the affected
   category. They MEASURE the rendered graphic, because every source check would have passed a
   catalog that was visibly broken.
6. **Freshness is TIME-driven, never commit-driven** (`docs/STACK_FRESHNESS.md`): `check:freshness`
   reports weekly and nothing auto-upgrades.

**Gotchas:**
- The app declares `color-scheme: dark` (styles.css `:root`) and composeDocument injects the
  matching `<meta name="color-scheme" content="dark">` into the preview srcdoc. **Keep them
  paired** - Chromium paints an iframe opaque (white stage) when the schemes disagree.
- `/app` boots through app.html's inline BOOT WATCHDOG + connection check: `?diag=1` renders
  the inline diagnostics (main.tsx stands down there), durable-store hydration times out to
  localStorage after 4 s (`durableStoreHealth` -> StorageHealthNotice), and a boot that never
  mounts paints a plain-HTML diagnosis. Pinned by `e2e/network-resilience.spec.ts`; ops view
  in docs/DEPLOYMENT.md ("Where to look").
- **Every trap a SPEC falls into is in `e2e/AGENTS.md`** (with its thin `CLAUDE.md`), which
  loads when you work in that directory: the reused dev server, the ghost store, the
  `addInitScript` storage trap, the preview debounce, waiting for a durable write, where focus
  is before a Space press, and the video project that generates on its own.

## Git

- Most work happens on a **feature branch**, usually in a worktree - several are typically active
  at once, so `node scripts/worktree-activity.mjs` prints what is in flight elsewhere before you
  start something that collides: every OTHER worktree's uncommitted and not-yet-merged files,
  then every branch ahead of `main` that no worktree has checked out - a closed session's work
  still collides even though nobody is in it. If a session starts on `main`
  with work to do, branch first. The rhythm: **commit each completed, verified phase/step** to the
  FEATURE BRANCH with a descriptive message. **Never add a `Co-Authored-By` trailer or any agent
  co-author.** Don't commit `dist/` in feature work.
- **`main` is only ever touched when the user asks for it, in that message - from ANY checkout.**
  Nothing lands on your own initiative: no commit made while sitting on `main`, no `git merge` into
  main, no `git push origin main`. Being in the primary checkout on `main` is not
  permission to land - the user decides when work lands, *after* they know the change is safe.
  Commit verified work to the feature branch, report what you did and verified, and STOP.
- **The one exception is the user invoking the repo's merge-to-main flow** (`/safe-merge` in
  Claude Code or `$safe-merge` in Codex). Invoking it IS the ask: run that flow to completion for
  the named branch - preflight, merge into `main`, and push - without asking again for the merge
  or push. **Picking the safe-merge option the `next` workflow offered counts as invoking it** -
  the user chose that branch deliberately, so run the flow rather than telling them to type the
  command; see `.agent-workflows/next.md` §2c. It does not authorize branch or
  worktree cleanup, with one carve-out: a branch with no worktree (a closed session leaves those
  behind) has nowhere to integrate `main` and run the gate, so the flow creates a TEMPORARY
  worktree for it and removes that same one at the end - never any other, never with `--force`.
  The permission is scoped to that invocation and that branch; it never carries
  to another branch, a later turn, or any other route onto `main`. If the flow's checks fail,
  stop and report - permission to run the flow is not permission to land something broken.
- **A finished session can clean up its own worktree, but only the USER starts it** -
  `cleanup-worktrees.mjs --self`. **No other workflow raises the subject**: a verdict written by a
  model must never start an irreversible action. **A clean `git status` does not mean a worktree is
  disposable** - ignored files (`.env`, paid bench output, logs) die with it, so the script refuses
  to apply until that loss is acknowledged (`.agent-workflows/cleanup-worktrees.md`).
- **Merge ORDER is checked, not guessed.** `node scripts/merge-order.mjs` ranks every branch
  ahead of `main` by what landing it FIRST costs the other worktrees, measuring real conflicts
  with `git merge-tree` (read-only - no working tree, no ref) and naming the collisions git
  merges cleanly and still gets wrong: a rename over another branch's edits, two branches minting
  the same migration number, a stacked branch jumping its ancestor. `next` uses it to avoid
  recommending an expensive landing; `safe-merge` runs it in Phase 1 and stops for a go-ahead
  only on a `hold`. It is advisory about order alone and never overrides a Hard safety rule.
- **Commit messages:** clear and human-readable, explaining the actual change - understandable to an
  outside developer reading the history cold. No chat/session language, internal planning names, or
  AI-sounding phrases ("as requested", "starting era 5", "continued work"). Never mention Claude,
  agents, prompts, or the conversation unless the commit is specifically about AI tooling.

## Ending a turn

End completed/waiting turns with a tiny, phone-glanceable wrap-up:

- **Done** - what changed + verified/not.
- **Needs you** - exact action/question, or "nothing".
- **Next** - obvious safe continuation -> do it; real choice -> ask clearly; finished -> offer
  merge/handoff.
- Never ask permission for obvious, safe work within scope.
- If input is needed, make the question the final thing on screen.
- Never bury questions or add prose after them.
- No extra scans/tools just to produce the wrap-up.

# CLAUDE.md

Guidance for AI agents working in this repo. Keep it accurate — update it when architecture or
conventions change.

## What this is

An **AI-assisted, SPX-first, code-first** browser tool for building HTML broadcast graphics and
exporting them as working **SPX** templates (SPX Graphics / CasparCG). The user always sees and edits
the real HTML/CSS/JS (Monaco editor) with a live preview; building blocks, an AI assistant, branding,
and a teaching layer support that workflow rather than hiding the code.

**The pillars (keep every change true to these):**
- **AI-assisted** — AI and blocks help write the template, but the human stays in control of the code.
- **SPX-first** — the target is a working SPX template; SPX compatibility comes before everything.
- **Code stays visible** — the real HTML/CSS/JS is always shown and editable. **Never hide the graphic
  behind visual-only tools**; any visual/AI action must write code the user can see.
- **Simple, teachable code** — generated code is clean, commented, and beginner-friendly.
- **Reliable export** — an SPX package must always be valid and plug-and-play (see the validation gate).

## Commands

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5174
npm run build    # tsc (typecheck) && vite build -> dist/   <-- run this after changes; it's the CI gate
npm run preview  # serve the production build
```

There is **no unit-test suite**. Verify changes with `npm run build` plus in-browser checks (see
Verifying, below). Never mark work done on a green build alone if behaviour is observable — check it.

## Non-negotiable principles (these override default behaviour)

1. **Code is the single source of truth.** `SpxTemplate` (html/css/js + parsed definition) is
   canonical. Visual/AI/block actions must emit *deterministic, readable code patches*, never a
   hidden scene model. The editor always reflects exactly what was written.
2. **Generated code must be clean, commented, and beginner-friendly.** These templates teach. Prefer
   simple, obvious code over clever code. Rich-but-commented CSS is the house style.
3. **Offline-first, no unnecessary dependencies.** GSAP is bundled locally
   (`src/assets/gsap.min.js`). Don't add runtime deps or external/CDN references in generated
   templates. The exported package must be plug-and-play (relative paths, bundled GSAP).
4. **Validate before export.** `validation/validateTemplate.ts` is the gate; export is blocked on
   errors. Keep it authoritative — the platform owns SPX compatibility, not the AI.
5. **Building blocks and AI are deterministic transforms** `(template) => template` that insert
   clean code. No fragile free-form generation in the stub path.

## SPX template format (the contract)

Full reference: **`docs/SPX_TEMPLATE_FORMAT.md`** (derived from the real examples in
`example_projects/`). Essentials:

- A global `window.SPXGCTemplateDefinition = { ...settings, DataFields: [...] }` describes the
  operator's fields. Fields are `f0`, `f1`, … with an `ftype` (textfield, number, dropdown, …).
- SPX calls global `play()`, `stop()`, `update(data)` (a **JSON string**), and `next(data)`.
- **Field → DOM convention (this project): each field `fN` maps to one element `id="fN"`.**
  `update()` writes the value straight into it via `getElementById`. **No hidden `.spx-data`
  holders, no `_gfx` display split** — that older "premium pack" style is documented but not what we
  generate. An input-only value (e.g. a countdown duration) may live in a hidden `<div id="fN"
  style="display:none">`.

## Architecture

```
src/
  model/        types.ts (SpxTemplate, Resolution, ASPECTS, Ftype…), spxDefinition (parse/serialize),
                defaultTemplate (re-exports lowerThird)
  templates/    hand-authored starter templates (lowerThird, fullscreen, bug, countdown,
                scoreboard, infoBox, startingSoon, blank) + index registry
  store/        templateStore.ts — zustand; template + UI state; undo history; lastInserted
  preview/      composeDocument.ts — inlines CSS + GSAP + JS + assets into the iframe srcdoc
  blocks/       registry.ts (hierarchical BuildingBlock[]), edit.ts (deterministic edit helpers),
                cssVars.ts (:root brand vars)
  ai/           provider.ts (AIProvider interface), stubProvider.ts (deterministic), presets.ts
  validation/   validateTemplate.ts — runs before export and on AI output
  export/       registry.ts (targets), targets/spxStarter.ts, targets/spxPack.ts, common.ts
  teach/        knowledge.ts (cursor explanations), explain.ts, cssReference.ts (browsable + chips)
  assets/       gsap.min.js (bundled), assetUtils.ts (data-URL assets)
  components/    AppShell, CodeEditor, PreviewFrame, CanvasGuides, PlayoutSimulator, SidePanel,
                 SampleDataPanel, BuildingBlockMenu, BrandPanel, LearnPanel, AIPromptPanel,
                 TemplateValidator, ExportPanel, TemplateGallery
```

Key flows and patterns:

- **Editing:** `setHtml/setCss/setJs` update the template; editing HTML re-parses the definition so
  `fields`/`settings` stay in sync. Preview rebuilds on a ~350 ms debounce.
- **Building blocks** (`blocks/registry.ts`): pure transforms grouped by a hierarchical `path`
  (e.g. `['Lower third']`, `['Animation','GSAP']`) with a `primaryTab` (tab to reveal after
  applying). Inserted elements are positioned in the lower-left action-safe area via
  `positionForNewElement`, tagged `data-gfx`, and styled with `textCssRule` (rich commented CSS).
  Animation is two tracks: **CSS** (`@keyframes` + class applied to the element) and **GSAP**
  (tween injected into `play()/stop()`).
- **Undo:** `applyTemplate` snapshots the previous template; `undo()` restores it. Blocks, AI, and
  gallery all flow through `applyTemplate`. Global **Ctrl/Cmd+Z** (AppShell) calls `undo()` unless
  focus is in Monaco or a form field.
- **Assets/branding:** uploads are base64 data URLs in `template.assets[]`; the preview inlines
  them, the exporter decodes them to real files under `assets/`. Brand colours are `:root` CSS
  variables.
- **Teaching:** `teach/cssReference.ts` is the single catalog powering both the Learn-tab reference
  (with MDN deep-links) and the Blocks "suggested property" chips (which call
  `setCssDeclaration`).

## Verifying changes

Always `npm run build` (typecheck + build) after changes.

- **UI flows → use Playwright.** Verify user-facing flows with the E2E suite in `e2e/` (specs drive
  the real dev server). Run `npm run test:e2e`. Add a spec for any new user-facing flow (gallery,
  blocks, undo, guides, branding, export, …).
- **Logic checks without UI (fast path):** Vite serves source modules, so in a browser context you
  can `await import('/src/blocks/registry.ts?t=' + Date.now())`, apply blocks to
  `createBlankTemplate(...)`, run `validateTemplate`, and load `composeDocument(tpl)` into a hidden
  iframe to call `update()/play()/stop()`. Good for blocks, templates, validation, and export logic.
- **Store/state checks:** `import('/src/store/templateStore.ts')` then `useTemplateStore.getState()`.

**Gotchas:** after many edits the Vite dev server can serve a **stale module** (HMR lag) — restart it
if a change isn't reflected. Monaco isn't fully interactive in a headless preview and GSAP animations
don't visibly tick (rAF); assert on DOM/state, not screenshots, for those.

## Git

- Work happens on `main` (the old feature branches were merged and deleted). Only branch if the user
  asks.
- Commit only when the user asks. Keep messages descriptive; end with the
  `Co-Authored-By: Claude …` trailer.
- Don't commit `dist/` changes as part of feature work.

# SPX HTML GFX Builder

A code-first, prompt-first, browser-based tool for building HTML broadcast graphics and
exporting them as working **SPX** templates. You always see and edit the real HTML, CSS, and JS
(with GSAP); building blocks and an AI assistant support that workflow rather than hiding the code.

## Run

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # typecheck + production build to dist/
```

## What it does (MVP)

- **Code editor** (Monaco) with HTML / CSS / JS tabs — the template is the source of truth.
- **Live preview** in a sandboxed iframe with transparent / black / video-like backgrounds.
- **Playout simulator**: Play / Stop / Update / Next call the template's SPX runtime functions.
- **Sample data panel**: edit the values sent to `update(data)`, one control per field `ftype`.
- **Building blocks**: deterministic, well-commented code inserts (lower third, fullscreen, logo,
  corner bug, text element, text data field, CSS fade/slide, GSAP pulse).
- **AI assistant** (currently a deterministic stub behind a clean `AIProvider` interface):
  generate / modify / explain / fix / make-SPX-ready. Every result is validated before it can apply.
- **Validation**: runtime functions, `SPXGCTemplateDefinition`, field↔DOM mapping, relative paths,
  JS syntax, and preview runtime errors. Errors block export.
- **Export** (modular targets): **Starter** (1:1 with the editor code) and **Advanced / Pack**
  (fuller SPX package with a helper interface + metadata). Both are plug-and-play: relative paths,
  bundled GSAP, no external dependencies.

## Architecture

```
src/
  model/        types, default lower-third template, SPXGCTemplateDefinition parse/serialize
  store/        zustand store (template + UI state)
  preview/      composeDocument (build the iframe document)
  blocks/       building-block registry + edit helpers
  ai/           AIProvider interface + deterministic stub + presets
  validation/   validateTemplate (runs before export and on AI output)
  export/       target registry + Starter / Pack exporters + shared helpers
  components/    AppShell, CodeEditor, PreviewFrame, PlayoutSimulator, SampleDataPanel,
                 BuildingBlockMenu, AIPromptPanel, TemplateValidator, ExportPanel
```

The SPX target follows the contract verified against docs.spxgraphics.com: a
`window.SPXGCTemplateDefinition` (with `DataFields`) plus runtime entry points — either the classic
`play()` / `stop()` / `update(data)` globals (used by the generated templates) or the modern
`spxRenderer.on(...)` event API (also accepted by the validator).

Export targets, building blocks, AI, and validation are kept modular so CasparCG and OGraf
exporters can be added later without touching the UI.

## Notes / future work

- The Monaco editor loads from a CDN in dev; self-hosting it would make the builder fully offline.
- AI is a deterministic stub — wiring a real Claude-backed `AIProvider` is a drop-in replacement.
- Planned next: score/result graphic preset, CasparCG + OGraf exporters, asset upload UI.

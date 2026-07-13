# Code formatting (Prettier)

NoaCG Studio uses [Prettier](https://prettier.io) to tidy the template code an editor or the AI
produces. The whole layer is `src/format/formatCode.ts` - a small, house-aware wrapper, **not** a
blanket reformatter. Prettier and its plugins are bundled locally (no CDN) and loaded lazily via
dynamic `import()`, so they stay out of the initial app bundle (root non-negotiable 3).

## What is safe to format, and what is protected

Formatting is intentionally different per language because two parts of a template are owned by
other systems and must never be silently rewritten:

| File | Auto after AI | Explicit "Format" | Why |
|---|---|---|---|
| **HTML** | yes | yes | The SPX definition is read by brace-matching + `eval` (`src/model/spxDefinition.ts`), so reflowing the body or the embedded `<script>` object literal never breaks parsing. |
| **CSS** | no | yes | The house style comments every property **right-aligned** (`docs/DESIGN_LANGUAGE.md` §7). Prettier collapses that to a single space. Formatting on an explicit user action is fine (they opted in), but auto-formatting would degrade the hand-tuned look of every generation, so the AI path leaves CSS as emitted. |
| **JS** | no | only when no animation region | The marked ANIMATION region carries `var NOACG_ANIM = { ... }` as **strict JSON** with a canonical one-keyframe-per-line layout the timeline reads (`JSON.parse`) and rewrites with minimal diffs (`src/blocks/animData.ts`). Prettier would unquote the JSON keys and reflow the block. `formatJs` returns any region-owning file untouched; the Format button is disabled on that tab. |

`hasProtectedRegion(js)` is the single guard (matches both `NOACG_ANIM` and the legacy
`== ANIMATION` marker). `formatJs` and the editor button both consult it.

## Where it is wired today

- **Explicit format** - a `Format` button in the code editor's tab bar, plus Monaco's built-in
  right-click "Format Document" and `Shift+Alt+F`. All three run the same
  `registerDocumentFormattingEditProvider` in `src/components/CodeEditor.tsx`, which returns a
  **minimal edit** (only the changed span, via `minimalTextChange`) so the cursor and selection
  stay put and Monaco keeps the change on its own undo stack.
- **After an AI Generate** - `AIPromptPanel` formats the proposed template's **HTML only** before
  showing it for review (`formatTemplate`, HTML default). Modify / Fix / Make-SPX-ready stay
  byte-faithful to the AI's surgical edit so the review diff stays focused.

`formatTemplate(template, { html, css, js })` is the reusable entry point; the defaults
(`html: true`, `css: false`, `js: false`) encode the safety table above. A formatter error on any
file falls back to the original, so formatting can never break an apply.

## Deliberately deferred (connect after the timeline/canvas work merges)

These integration points are intentionally left unwired while other worktrees are actively
refactoring the timeline, canvas, and animation code. The service is ready for them - connect once
those land, using `formatTemplate` at the transaction boundary:

- **Visual-editor transaction boundaries** - format once a completed canvas/timeline gesture
  commits its single undoable `applyTemplate`, never mid-drag. Because the timeline owns the JS
  animation region, a canvas/timeline commit should format **HTML only** (the default) unless a
  clean shared abstraction makes CSS/JS safe.
- **On save/apply** - optionally format at the autosave or explicit-apply boundary. Same rule:
  never on every keystroke or high-frequency update.
- **CSS comment alignment** - if the house right-aligned comment style is ever encoded as a
  Prettier plugin or a post-pass, CSS could join the auto-format set. Until then, keep CSS
  explicit-only.

Non-negotiable for any future hook: format at a completed **transaction boundary**, not
continuously - never on a Monaco keystroke, a mouse move, or a drag frame.

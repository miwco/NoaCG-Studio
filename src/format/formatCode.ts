// Prettier-based formatting for the code editor and AI output — a small, house-aware layer.
//
// This is deliberately NOT a blanket reformatter. Two parts of a template must be protected,
// so each language is handled with its own rule:
//
//   HTML — safe to format. The SPX definition inside `<script id="spx-template-definition">`
//     is read by brace-matching + eval (src/model/spxDefinition.ts), so reflowing it or its
//     embedded object literal never breaks parsing.
//
//   CSS  — formatted ONLY on an explicit user request, never automatically. The house style
//     comments every property RIGHT-ALIGNED (docs/DESIGN_LANGUAGE.md §7); Prettier collapses
//     that alignment to a single space. Auto-formatting would quietly degrade the hand-tuned
//     look of every generated template, so the AI path leaves CSS exactly as emitted.
//
//   JS   — the marked ANIMATION region carries `var NOACG_ANIM = { ... }` as STRICT JSON with a
//     canonical one-keyframe-per-line layout that the timeline reads and rewrites with minimal
//     diffs (src/blocks/animData.ts). Prettier would unquote the JSON keys (breaking JSON.parse)
//     and reflow the block. So formatJs REFUSES any file that owns an animation region and
//     returns it untouched — the timeline stays the sole editor of that code.
//
// Prettier (standalone + plugins) loads lazily via dynamic import so it never weighs down the
// initial bundle, and every piece is bundled locally — no CDN, offline-first (root
// non-negotiable 3).

import type { Options, Plugin } from 'prettier';
import type { SpxTemplate } from '../model/types';

export type CodeLang = 'html' | 'css' | 'js';

// Shared Prettier options. printWidth 100 matches the templates, which run wide (calc() sizes
// with trailing comments). LF keeps diffs stable across platforms.
const BASE: Options = { printWidth: 100, tabWidth: 2, endOfLine: 'lf' };

interface LoadedPrettier {
  format: (source: string, options: Options) => Promise<string>;
  html: Plugin;
  postcss: Plugin;
  babel: Plugin;
  estree: Plugin;
}

// Lazy, memoized load. The first format() pays the import cost; later calls reuse it.
let loading: Promise<LoadedPrettier> | null = null;
function loadPrettier(): Promise<LoadedPrettier> {
  if (!loading) {
    loading = (async () => {
      const [core, html, postcss, babel, estree] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/html'),
        import('prettier/plugins/postcss'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ]);
      return {
        format: core.format as LoadedPrettier['format'],
        html: html as unknown as Plugin,
        postcss: postcss as unknown as Plugin,
        babel: babel as unknown as Plugin,
        estree: estree as unknown as Plugin,
      };
    })();
  }
  return loading;
}

/** Format an HTML document (body structure + the SPX definition script). Safe to run anytime. */
export async function formatHtml(html: string): Promise<string> {
  const p = await loadPrettier();
  return p.format(html, { ...BASE, parser: 'html', plugins: [p.html] });
}

/** Format a CSS stylesheet. Note: collapses the house right-aligned property comments, so this
 *  runs on an explicit user action only — never automatically after an AI edit. */
export async function formatCss(css: string): Promise<string> {
  const p = await loadPrettier();
  return p.format(css, { ...BASE, parser: 'css', plugins: [p.postcss] });
}

/** True when the JS owns an animation region the timeline maintains — Prettier must not touch it.
 *  Matches both the data engine's `NOACG_ANIM` literal and the legacy marked region. */
export function hasProtectedRegion(js: string): boolean {
  return js.includes('NOACG_ANIM') || js.includes('== ANIMATION');
}

/** Format template.js. Returns the input untouched when it owns an animation region (see the
 *  file header): the timeline is the only editor allowed to rewrite that code. */
export async function formatJs(js: string): Promise<string> {
  if (hasProtectedRegion(js)) return js;
  const p = await loadPrettier();
  // singleQuote matches the house JS idiom (document.getElementById('fN')).
  return p.format(js, { ...BASE, parser: 'babel', singleQuote: true, plugins: [p.babel, p.estree] });
}

/** Format one editor tab's code by language. */
export function formatCode(lang: CodeLang, code: string): Promise<string> {
  if (lang === 'html') return formatHtml(code);
  if (lang === 'css') return formatCss(code);
  return formatJs(code);
}

/** Which files formatTemplate() should touch. Defaults reflect what is safe to run
 *  automatically: HTML only. CSS and JS stay opt-in for the reasons in the file header. */
export interface FormatTemplateOptions {
  html?: boolean;
  css?: boolean;
  js?: boolean;
}

/** Return a copy of the template with the requested code strings formatted. A formatter error
 *  on any one file falls back to the original for that file, so this never breaks an apply. */
export async function formatTemplate(
  template: SpxTemplate,
  opts: FormatTemplateOptions = {},
): Promise<SpxTemplate> {
  const { html = true, css = false, js = false } = opts;
  const next: SpxTemplate = { ...template };
  if (html) next.html = await safeFormat(() => formatHtml(template.html), template.html);
  if (css) next.css = await safeFormat(() => formatCss(template.css), template.css);
  if (js) next.js = await safeFormat(() => formatJs(template.js), template.js);
  return next;
}

async function safeFormat(run: () => Promise<string>, fallback: string): Promise<string> {
  try {
    return await run();
  } catch (err) {
    console.warn('[format] skipped a file — formatter error:', err);
    return fallback;
  }
}

/** The smallest single replacement that turns `before` into `after`: trim the common leading and
 *  trailing characters so a reformat that only re-indents the middle produces a minimal, cursor-
 *  stable, merge-friendly edit instead of replacing the whole document. Offsets index `before`.
 *  Returns null when the strings are identical. */
export function minimalTextChange(
  before: string,
  after: string,
): { start: number; end: number; text: string } | null {
  if (before === after) return null;
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  return { start, end: endBefore, text: after.slice(start, endAfter) };
}

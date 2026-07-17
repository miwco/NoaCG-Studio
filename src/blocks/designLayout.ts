// Design-position placement — the text lines that sit ON an imported design's artwork.
//
// The imported-design assembler (templates/importedDesign/shared.ts) writes each line's
// position as a CSS rule on the line's WRAPPER: `#fwN { left/top: calc(Npx * var(--scale)) }`.
// That position is a DESIGN decision, not motion — which is why the canvas drag for these
// lines patches this rule instead of writing x/y keyframes the way the layer drag does on
// every other data-block element.
//
// The gate is code-derived, never category-derived (the house rule — the timeline dock picks
// its surface the same way): a line is "placed" when its parent carries an id whose CSS rule
// holds readable left+top px values. That is exactly the shape the assembler emits, and
// equally a shape a pro can hand-write to opt any template's line into placement dragging.

import type { SpxTemplate } from '../model/types';
import { setCssDeclaration } from './edit';

export interface LinePlacement {
  /** The positioned wrapper's element id (e.g. "fw0"). */
  wrapperId: string;
  /** Design px from the artwork's top-left (before --scale is applied). */
  x: number;
  y: number;
  /** True for the assembler's `calc(Npx * var(--scale))` form; false for plain `Npx`.
   *  Writes mirror what the rule already uses, so a drag never rewrites the author's idiom. */
  scaled: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The value of `prop` in `#id`'s rule, as design px. Reads both position idioms. The prop
// boundary is "not an identifier char" rather than `;`/`{`: generated declarations carry
// trailing comments, so the previous line often ends in a comment close, not `;`.
function readPx(css: string, id: string, prop: string): { value: number; scaled: boolean } | null {
  const rule = css.match(new RegExp(`#${escapeRe(id)}\\s*\\{([^}]*)\\}`));
  if (!rule) return null;
  const calc = rule[1].match(
    new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*calc\\(\\s*(-?[\\d.]+)px\\s*\\*\\s*var\\(--scale\\)\\s*\\)`),
  );
  if (calc) return { value: parseFloat(calc[1]), scaled: true };
  const plain = rule[1].match(new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*(-?[\\d.]+)px`));
  return plain ? { value: parseFloat(plain[1]), scaled: false } : null;
}

/** The CSS value a placement writes (and the live drag previews) for a design-px coordinate. */
export function placementCss(value: number, scaled: boolean): string {
  return scaled ? `calc(${value}px * var(--scale))` : `${value}px`;
}

/**
 * Every placed line in the template, `#fN` → its wrapper + current position. Derived from
 * the code on every call (like getTemplateParts): hand edits can change or remove a
 * placement, but they can never make this map stale.
 */
export function placedLines(html: string, css: string): Record<string, LinePlacement> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: Record<string, LinePlacement> = {};
  for (const el of Array.from(doc.querySelectorAll('[id]'))) {
    if (!/^f\d+$/.test(el.id)) continue;
    const wrapperId = el.parentElement?.id;
    if (!wrapperId) continue;
    const x = readPx(css, wrapperId, 'left');
    const y = readPx(css, wrapperId, 'top');
    if (!x || !y) continue;
    out[`#${el.id}`] = { wrapperId, x: x.value, y: y.value, scaled: x.scaled && y.scaled };
  }
  return out;
}

/** Re-place one line: the wrapper rule's left/top, as one deterministic CSS patch. */
export function placeLine(
  template: SpxTemplate,
  wrapperId: string,
  x: number,
  y: number,
  scaled: boolean,
): SpxTemplate {
  let css = template.css;
  css = setCssDeclaration(css, `#${wrapperId}`, 'left', placementCss(x, scaled));
  css = setCssDeclaration(css, `#${wrapperId}`, 'top', placementCss(y, scaled));
  return { ...template, css };
}

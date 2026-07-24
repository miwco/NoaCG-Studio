// Public-information scaffolding — the category-generic assembler bound to the PUBLIC-INFO
// contract: class prefix "public-info", a card-width auto-fit cap, and the two-language
// column pair that half this category is built on.
//
// These are ordinary standard-contract templates. They reuse the shared preset bank, the line
// masks, the steps machinery and the data-block conversion exactly as lower thirds and info
// cards do — there is no second runtime here either.
//
// ── What separates this category from an info card ───────────────────────────────────────
//
// An info card is editorial: the programme chose to show it. A public-information panel is
// OBLIGATORY — a notice, an instruction, a disclaimer, an attribution — and that changes three
// things about how it is drawn. It never omits its source (an unattributed public notice is a
// rumour). It never dims the line that asks the viewer to do something. And it is sized to be
// read once, at speed, by someone who did not choose to read it.
//
// Structure contract:
//   <div class="public-info">                root — positioned by zone; opacity:0 until play()
//     <div class="public-info-box">          the panel; presets animate this
//       <div class="public-info-mask"><span id="f0" class="public-info-lead">…</span></div>
//       … one mask per line
//     </div>
//   </div>
//
// A two-language design wraps its masks in `.public-info-lang-1` / `.public-info-lang-2`
// blocks; those are what the language machine cross-fades (types/publicNotice.ts).

import type { Resolution } from '../../model/types';
import type { AnimData, AnimLayerTracks } from '../../blocks/animData';
import type { ResolvedOptions, TemplateVariant, WizardOptions } from '../../model/wizard';
import { resolveTokens } from '../../model/themeTokens';
import { resolveOptions } from '../../model/wizard';
import {
  assembleStandard,
  composeRefine,
  type CategorySpec,
  type StandardDesign,
  type StandardMeta,
} from '../shared/standard';

export type PublicInfoMeta = StandardMeta;

/** A public-information design. `hasLanguages` says the design emits the two-language column
 *  pair, which is what earns it the language machine and the rest pose below. */
export interface PublicInfoDesign extends StandardDesign {
  hasLanguages?: boolean;
}

const PUBLIC_INFO_CATEGORY: CategorySpec = {
  type: 'public-info',
  prefix: 'public-info',
  rootComment: 'Public information panel. Hidden until play(); positioned by the .public-info rule.',
  // Notices carry more text than a strap and are read at a distance: up to 58% of the frame
  // inside the safe areas. Band designs override the box width outright.
  maxTextWidth: (res: Resolution) =>
    Math.round(Math.min(res.width * 0.58, res.width - 2 * (res.width * 0.0625))),
  dataRegion: true,
};

/**
 * One line's reveal mask, with the class the DESIGN wants on it.
 *
 * The shared `lineMasksFor` names lines positionally (`-name` / `-title` / `-extra`), which
 * suits a design whose lines are a headline and its subordinates. Half of this category's
 * lines are not that: a numbered instruction, a second language's body, a reference number
 * and a helpline are peers, and calling the fourth one "extra" would leave every stylesheet
 * here selecting on a word that means nothing. So a public-info design names its own.
 *
 * The `-mask` wrapper is not optional: it is what makes the span a `line` part in the registry
 * (model/structure.ts), which is what lets it be selected on canvas, revealed step by step,
 * and animated by the shared line presets.
 */
export function piMask(
  o: ResolvedOptions,
  index: number,
  className: string,
  indent = '      ',
): string {
  const line = o.lines[index];
  if (!line) return '';
  return (
    `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
    `${indent}<div class="public-info-mask"><span id="f${index}" class="${className}">${line.sample}</span></div>`
  );
}

/** Several masks in one call: `[index, className]` pairs, in document order. */
export function piMasks(
  o: ResolvedOptions,
  spec: Array<[number, string]>,
  indent = '      ',
): string {
  return spec
    .map(([index, className]) => piMask(o, index, className, indent))
    .filter((s) => s !== '')
    .join('\n');
}

// ── The two-language column pair ─────────────────────────────────────────────

/** The selectors the language machine cross-fades — written down once. */
export const PI_LANG_SELECTORS = ['.public-info-lang-1', '.public-info-lang-2'] as const;

/**
 * The stacked two-language block's shared CSS.
 *
 * Both languages occupy the SAME space rather than sitting side by side, because a rotating
 * panel has to hold its size while the language changes: a Finnish sentence and its English
 * translation are rarely the same length, and a panel that resized every seven seconds would
 * be unreadable long before it was ugly. The grid stacks them in one cell, so the block is
 * always as tall as its longest language and never moves.
 */
export const PI_LANG_STACK_CSS = `/* ── The language stack ── */

/* One cell, two languages, stacked. The block sizes itself to the LONGER of the two, so a
   language change never re-flows the panel. */
.public-info-langs {
  display: grid;                   /* one cell shared by both languages */
  grid-template-areas: "lang";     /* both children claim the same area */
}
.public-info-lang-1,
.public-info-lang-2 {
  grid-area: lang;                 /* stacked, not laid out in a row */
  display: flex;                   /* each language stacks its own lines */
  flex-direction: column;          /* title over body */
  gap: calc(8px * var(--scale));   /* the two lines are one statement */
  min-width: 0;                    /* let a long line wrap instead of stretching the grid */
  will-change: opacity;            /* the language machine animates exactly this */
}

/* The resting language. This matches the language machine's INITIAL state, and the entrance
   step sets the same pose — so a replay, a snap and a fresh load all agree. */
.public-info-lang-1 { opacity: 1; }
.public-info-lang-2 { opacity: 0; }`;

/**
 * The language REST POSE, written into the entrance step — the same problem, and the same
 * fix, as the alert category's severity rest pose (templates/alerts/shared.ts): a parallel
 * pointer resting at its initial state replays nothing, so the entrance has to establish the
 * pose itself or a replay would keep whatever language was last on air.
 */
export function piLanguageRestRefine(data: AnimData): AnimData {
  const rest: Record<string, AnimLayerTracks> = {};
  PI_LANG_SELECTORS.forEach((selector, i) => {
    rest[selector] = { opacity: [{ time: 0, value: i === 0 ? 1 : 0 }] };
  });
  const steps = data.steps.map((step, i) =>
    i === 0 ? { ...step, layers: { ...step.layers, ...rest } } : step,
  );
  return { ...data, steps };
}

// ── The authoring API ────────────────────────────────────────────────────────

/** The authoring API for public-info variant modules — `makeDefineVariant` plus the language
 *  rest pose, for the same reason the alert factory carries the severity one. */
export function definePublicInfoVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: PublicInfoMeta,
  buildDesign: (o: ResolvedOptions) => PublicInfoDesign,
  /** Optional animation-data refinement (a graphic type's machine rides in here). */
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      const design = buildDesign(o);
      const tokens = resolveTokens(spec.styleTag, design.tokens);
      const composed = composeRefine(
        design.hasLanguages ? piLanguageRestRefine : undefined,
        refine?.(o),
      );
      return assembleStandard(PUBLIC_INFO_CATEGORY, meta, design, o, composed, tokens);
    },
  };
  return variant;
}

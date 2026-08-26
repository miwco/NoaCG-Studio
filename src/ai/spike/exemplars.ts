// PHASE 0 SPIKE - the exemplar arm's retrieval (docs/NOACG_PRO_PLAN.md §0.1).
//
// BENCH-ONLY. Nothing in the product reaches this directory: its only caller is
// scripts/pro-spike.mjs. The wrapper either graduates into the later harness or is deleted
// once the go/no-go verdict is recorded (plan §0.1) - it is not a second pipeline.
//
// The spike runs every brief in TWO arms: one shown two or three excellent COMPLETE lower
// thirds, one shown none. The no-exemplar arm is what separates the model's own eye from
// paraphrased catalog taste, so the two arms must differ in the exemplar block and in
// nothing else.
//
// WHAT "HAND-VETTED" MEANS HERE, since a taste claim invented in a bench file is worth
// nothing: the pool is the THIRTEEN measured Lite chassis (`lite/contract.ts`). Those designs
// are already the catalog's hand-picked, individually measured lower thirds - each one
// carries a measured `supportingLineChars`, a brand-audited `logoSlot`, and positive and
// negative fit metadata a human wrote and a script checked. Reusing that curation is honest;
// minting a fresh "excellent designs" list in a bench script would be an adjective where a
// measurement already exists (the `supportingLineChars` precedent, src/ai/AGENTS.md).
//
// The RANKING is `shortlistFor` - the live retrieval engine, so the exemplar arm is shown
// what the product's own retrieval would put in front of a model - intersected with that
// pool. Every degrade is reported in `reason` rather than silently filled.

import { shortlistFor } from '../retrieval';
import { resolveAnchor } from '../../templates/structuralAnchor';
import { variantById } from '../../templates/catalog';
import type { TemplateVariant } from '../../model/wizard';

/**
 * The vetted pool, in the order `lite/contract.ts` declares it. That order is deliberate on
 * the Lite side (the house strap first, then the style spread), and it is the fallback order
 * here when retrieval cannot rank enough of the pool for a brief.
 *
 * Kept as ids rather than imported from `LITE_CATALOG` on purpose: the Lite catalog is a
 * server-shaped contract carrying prices, intent kinds and slot metadata this spike has no
 * use for, and a bench file that imports it would break when Lite's own list moves for Lite's
 * own reasons. A drift check lives in the spike's control run instead - every id below must
 * resolve, or the wrapper refuses to start.
 */
export const VETTED_EXEMPLAR_IDS: readonly string[] = [
  'lt11', // House Strap - amber accent, broadcast-width panel (noacg)
  'lt02', // Underline - panel-free typography, accent rule (minimal)
  'lt05', // Angle Slab - forward-leaning condensed sport slab (sport)
  'lt15', // Frost Strap - translucent glass, soft accent edge (glass)
  'lt25', // Masthead - editorial rule-led composition (editorial)
  'lt32', // Scrim - cinematic gradient scrim (cinematic)
  'lt30', // Dateline - editorial dateline hierarchy (editorial)
  'lt37', // Slate - cinematic slate (cinematic)
  'lt41', // Team Bar - sport team identity bar (sport)
  'lt49', // Glass Board - glass board with depth (glass)
  'ls12', // Caster Deck (noacg)
  'ls17', // Lectern (minimal)
  'ls29', // Field Report (noacg)
];

export interface ExemplarSelection {
  variants: TemplateVariant[];
  /** How the selection was built, including every degrade. Recorded per result. */
  reason: string;
}

/** How many complete exemplars the arm is shown (plan §0.1: "two or three"). */
export const EXEMPLAR_COUNT = 3;

/**
 * The exemplars this brief's arm is shown, best first.
 *
 * `shortlistFor` is given the lower-third anchor explicitly: the spike runs no intent stage,
 * and without an anchor retrieval returns FULL_CATALOG, which ranks nothing.
 *
 * The anchor is RESOLVED through the one anchor table rather than written as a literal. An
 * anchor is a namespaced string (`category:lower-third`), and the bare word silently fails
 * `anchorResolves` - which is not an error, it is the documented degrade to FULL_CATALOG. So
 * the first version of this file ranked nothing and filled all three slots from pool order on
 * every brief, while reporting a shortlist. Measured before the round rather than after:
 * every brief would have been shown the same three designs and the arm would have been
 * "three fixed exemplars", not retrieval.
 */
export function exemplarsFor(brief: string, count = EXEMPLAR_COUNT): ExemplarSelection {
  const pool = VETTED_EXEMPLAR_IDS.map((id) => variantById(id)).filter(
    (v): v is TemplateVariant => Boolean(v),
  );
  if (pool.length !== VETTED_EXEMPLAR_IDS.length) {
    const missing = VETTED_EXEMPLAR_IDS.filter((id) => !variantById(id));
    throw new Error(`spike exemplar pool is stale - unresolvable ids: ${missing.join(', ')}`);
  }

  const anchor = resolveAnchor('lower-third');
  if (!anchor) throw new Error('spike exemplars: the lower-third anchor no longer resolves');
  const shortlist = shortlistFor(brief, null, { anchor, limit: 40 });
  const inPool = new Set(pool.map((v) => v.id));
  const ranked = shortlist.full ? [] : shortlist.variants.filter((v) => inPool.has(v.id));

  const chosen = ranked.slice(0, count);
  const notes: string[] = [];
  if (shortlist.full) {
    notes.push('retrieval returned the full catalog (no anchor resolved) - pool order used');
  } else {
    notes.push(`retrieval ranked ${ranked.length} of the ${pool.length} vetted designs`);
  }
  // Fill from the pool's own order rather than from the wider catalog: an exemplar that is
  // not in the vetted pool would make "excellent complete exemplars" untrue for that brief,
  // and the arm would then measure something else.
  if (chosen.length < count) {
    const have = new Set(chosen.map((v) => v.id));
    const filled = pool.filter((v) => !have.has(v.id)).slice(0, count - chosen.length);
    if (filled.length) notes.push(`filled ${filled.length} from pool order: ${filled.map((v) => v.id).join(', ')}`);
    chosen.push(...filled);
  }
  return { variants: chosen, reason: notes.join('; ') };
}

/**
 * The prompt block for one arm: each exemplar's REAL `create()` output, the same complete,
 * commented code the wizard ships, as a design reference rather than a structure lesson (the
 * structure lesson is the neutral skeleton in the system prompt's example slot).
 *
 * The instruction around the code is INSPECTION, never a list of named failures
 * (src/ai/AGENTS.md): it says what to read the references for and what a good answer does
 * with them, and names copying as the likelier mistake.
 */
export function exemplarBlock(variants: TemplateVariant[]): string {
  if (!variants.length) return '';
  const blocks = variants.map((variant, i) => {
    const t = variant.create();
    return `### Reference ${i + 1} - "${variant.name}" (${variant.styleTag})
${variant.description}

\`\`\`html
${t.html}
\`\`\`

\`\`\`css
${t.css}
\`\`\`

\`\`\`js
${t.js}
\`\`\``;
  });

  return `## Reference designs - proven broadcast lower thirds

Below are ${variants.length} complete, shipped NoaCG lower thirds. They are here so you can
read how a finished broadcast graphic is actually built: where weight sits, how much air a
composition needs, how type sizes relate to each other and to the panel, how an accent earns
its place, and how the motion serves the reading order rather than decorating it.

Study the relationships, then answer THIS brief in its own visual language. The likelier
mistake is not ignoring them - it is returning one of them with different colours and words.
A brief that wants something none of these is, should get something none of these is.

${blocks.join('\n\n')}`;
}

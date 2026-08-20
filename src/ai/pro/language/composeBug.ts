// THE SPONSOR BUG in a design language - Phase B's first new graphic type
// (docs/NOACG_PRO_PLAN.md §15.9).
//
// WHY THIS TYPE. The registry answers it, not taste: `sponsorBugType.frequency` is 37 of the 60
// reference formats, second only to the lower third's 52. A show that carries a partner, a
// station ident or an on-air status mark needs one for the whole segment, and it is the graphic
// that sits on screen LONGEST - which makes it the hardest test of whether one design language
// really reads as one system, because it is beside every other graphic in the package.
//
// IT IS COMPOSED THROUGH THE TYPE, not merely through the category. `variantFromType`
// (graphics.ts) hands the registry's own `sponsorBugType` its Phase A design, so this graphic
// inherits the type's declared field contract (a caption and a mark, in that order), its
// required-parts gate, its machine - and therefore its control page - from the same declaration
// the catalog's own bug01-bug04 compile from. The platform owns the structure twice over: once
// as the category assembler and once as the type.
//
// WHAT IS DIFFERENT FROM THE STRAP, and both differences are the TYPE's rather than the
// language's:
//
//   * THE MARK IS THE GRAPHIC. The corner-bug type declares `logo: 'built-in'`, so the shared
//     slot is always injected, and outside a lower third it is drawn as a stacked BAND above the
//     words (`templates/shared/logoSlot.ts`) - which is right here: a bug is a vertical mark, not
//     a horizontal strap, and the "a strap spends width, never height" rule was about straps.
//   * THERE IS ONE LINE, so there is no hierarchy to express. The caption takes the package's
//     LABEL voice - the same weight, case and tracking the strap's role line and the countdown's
//     label take - at the bug's own anchor size (`GraphicMetrics.steppedSecondary`).

import { defineBugVariant, bugLineMasks } from '../../../templates/cornerBug/shared';
import type { BugDesign } from '../../../templates/cornerBug/shared';
import type { ResolvedOptions, TemplateVariant } from '../../../model/wizard';
import type { LanguagePalette, DesignLanguage } from './contract';
import {
  markKnockCss,
  platePlan,
  markTreatmentFor,
  panelSurface,
  platformNotes,
  readableInkOn,
  resolvePalette,
  wizardPalette,
  type MarkTreatment,
} from './paint';
import { accentPlan, resolveSpacing, type ResolvedSpacing } from './structure';
import type { ComposeOptions, ComposedGraphic } from './compose';
import { variantFromType } from './fromType';
import { sponsorBugType } from '../../../templates/types/bugs';

const PREFIX = 'corner-bug';

/**
 * THE ACCENT, in a corner. Every form the language can ask for resolves to a real arrangement on
 * a tile a fifth of the frame wide, and none of them is a lower-third rule shrunk down:
 *
 *   * `edge-bar` fuses to the tile's leading edge, outside its padding - the house arrangement
 *     bug03 already draws at this size;
 *   * `top-rule` caps the tile above the mark, one clear space away;
 *   * `underline` sits under the caption - bug04's own composition;
 *   * `block` puts the caption ON the accent, which at bug scale is a badge and is exactly what
 *     a "LIVE" mark wants to be;
 *   * `none` leaves the accent to the type alone.
 */
function accentCssFor(language: DesignLanguage, palette: LanguagePalette, s: ResolvedSpacing): string {
  const px = (n: number) => `calc(${n}px * var(--scale))`;
  switch (language.accent.form) {
    case 'edge-bar':
      return `/* The accent bar — fused to the tile's leading edge, outside its padding, so it is a
   member of the composition rather than something the mark has to make room for. The weight is
   the PACKAGE's, not this graphic's: the same bar reads on the strap and on the clock. */
.corner-bug-accent {
  position: absolute;               /* pinned inside the positioned .corner-bug root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full tile height… */
  bottom: 0;                        /* …top to bottom */
  width: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(s.cornerPx)} 0 0 ${px(s.cornerPx)};  /* the package's corner language */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}`;
    case 'top-rule':
      return `/* The accent rule — across the top of the tile, one platform clear space above the mark.
   ${s.ruleGapPx}px at scale 1, well clear of the crowding band the spacing instrument measures. */
.corner-bug-accent {
  /* FIRST, whatever the markup says. The shared logo slot injects the mark as the box's FIRST
     child (it must: a first-child insertion is what renumbers a design's own nth-child rules,
     so the slot appends and places by grid instead) - and this rule is written after it. Source
     order therefore put the rule BETWEEN the mark and the caption, which is a different
     composition from the one the language asked for, and a different one from the strap's. The
     same enum value has to mean the same thing on every graphic in the package or "coherent"
     is only a claim about colour. */
  order: -1;
  align-self: stretch;              /* a rule across the top spans the tile beneath it. IT NEEDS A
                                       WIDTH FROM SOMEWHERE: the tile is a flex column aligned to
                                       the reading edge, and an empty div in one has no content to
                                       be as wide as (the §15.5 control run's first finding). */
  height: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(Math.min(s.cornerPx, s.accentPx))};  /* a rule rounds to its own thickness at most */
  margin-bottom: ${px(s.ruleGapPx)};  /* the platform's clear space */
  will-change: transform;           /* hint the browser: presets grow this rule in */
}`;
    case 'underline':
      return `/* The accent rule — under the caption, one platform clear space below it. Deliberately
   SHORT rather than stretched: a rule that almost lines up with the words reads as a mistake,
   which is what the alignment instrument reported when the strap's version was stretched. */
.corner-bug-accent {
  width: ${px(Math.round(s.supportingPx * 2.4))};  /* shorter than the caption beside it */
  height: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(Math.min(s.cornerPx, s.accentPx))};  /* a rule rounds to its own thickness at most */
  margin-top: ${px(s.ruleGapPx)};  /* the platform's clear space */
  will-change: transform;           /* hint the browser: presets grow this rule in */
}`;
    case 'block': {
      // THE BADGE'S AIR IS A FUNCTION OF ITS OWN TEXT, not of a line gap this graphic does not
      // have. The strap borrows its block padding from the gap between its two lines; a bug has
      // ONE line, so that expression collapses - measured on the free control run, a compact
      // language put 4px of padding on the badge's trailing edge, which the alignment instrument
      // read as a near-miss (the block's right edge 4px past its own word) and which reads on
      // screen as a badge somebody forgot to finish.
      const padV = Math.max(Math.round(s.lineGapPx / 2), Math.round(s.supportingPx * 0.2));
      const padH = Math.max(s.lineGapPx, Math.round(s.supportingPx * 0.4));
      return `/* The accent BLOCK — the caption sits on the accent itself, which at bug scale is a badge.
   Contact is the composition here, so there is no gap to clear: the word is ON the block by
   design, the way a LIVE mark is drawn. */
.corner-bug-mask {
  background: var(--accent);        /* the block the caption reads on */
  width: fit-content;               /* THE BLOCK HUGS ITS OWN WORD — a two-letter caption must not
                                       sit in a bar as wide as the mark above it (the §15.8 blind
                                       read named exactly that on the strap). */
  max-width: 100%;                  /* …but never wider than the tile it sits in */
  border-radius: ${px(Math.min(s.cornerPx, 8))};  /* the package's corner language, kept tight */
  /* NO INSET ON THE LEADING EDGE, so the badge starts on the tile's own reading edge rather than
     a padding-width inside it. It used to share that axis with the mark; since the mark is
     centred across the tile the badge holds the reading edge alone, which is the axis the rest of
     the package is set to. */
  padding: ${px(padV)} ${px(padH)} ${px(padV)} 0;
}
/* The block's INK is measured, not designed: white or black, whichever reads on this accent. */
.corner-bug-mask > span { color: ${readableInkOn(palette.accent)}; }`;
    }
    case 'none':
    default:
      return '/* This language carries no accent SHAPE — the accent colour lives in the type alone. */';
  }
}

/** The design body: platform structure, language paint. */
function buildDesign(
  language: DesignLanguage,
  palette: LanguagePalette,
  s: ResolvedSpacing,
  o: ResolvedOptions,
  markField: string,
): BugDesign {
  const plan = accentPlan(language.accent.form);
  const surface = panelSurface(language, palette);
  const px = (n: number) => `calc(${n}px * var(--scale))`;
  const typePx = (n: number) => `calc(${n}px * var(--scale) * var(--type-scale))`;
  const form = language.accent.form;

  // ── A TILE'S PADDING IS NEVER TIGHTER THAN ITS OWN MARK'S CLEAR SPACE ───────────────────
  //
  // FOUND ON THE FREE CONTROL RUN, which is what it is for. The mark gate measures clear space
  // around the mark in the MARK's own height (`measureRenderedMark`, the brand manual's 0.25 for
  // a free-standing mark) while the tile's padding is measured in its CAPTION's size - and on a
  // bug those two units are three times apart. A balanced-density tile put 15px between the mark
  // and the accent bar beside it against a 15.6px need, and flagged `clear-space` by 0.6px.
  //
  // The floor is the honest fix rather than a looser gate, because on this type the reading is
  // right: the mark IS the graphic, so the tile's air belongs to the mark rather than to the
  // label under it. It costs the two tightest densities their difference from each other on the
  // horizontal, which is the correct trade - a corner mark's compactness is its height.
  const markClearPx = Math.round(s.markHeightPx * 0.25);
  const padV = Math.max(s.padVPx, markClearPx);
  const padH = Math.max(s.padHPx, markClearPx);

  const accentEl = plan.element
    ? `      <!-- The accent: ${plan.note}. -->\n      <div class="corner-bug-accent"></div>\n`
    : '';

  // The shared logo slot injects the mark as the FIRST child of the box, so a `top-rule` written
  // after it would cap the caption rather than the tile. It is emitted here, before the box, for
  // the edge-bar (which is pinned to the root) and inside the box for the two rules - the same
  // split the strap makes, for the same reason.
  const html = `    <!-- ${language.name}: the platform's sponsor-bug structure - ${plan.note}.
         The mark leads the tile (the shared slot's band arrangement); the caption is the
         package's label voice. Structure and spacing are platform-owned. -->
${form === 'edge-bar' ? accentEl : ''}    <div class="corner-bug-box">
${form === 'top-rule' ? accentEl : ''}${bugLineMasks(o)}
${form === 'underline' ? accentEl : ''}    </div>`;

  const css = `${accentCssFor(language, palette, s)}

/* The tile — ${surface.note}. It is \`width: fit-content\` (the category's auto-fit rule) under a
   cap of ~20% of the frame width, so a bug stays a compact mark whatever the caption says.
   Padding is ${padV}px / ${padH}px at scale 1 — equal on opposite sides, and never tighter than
   the ${markClearPx}px of clear space the mark itself needs (see the note in composeBug.ts). */
.corner-bug-box {
  display: flex;                    /* the mark and its caption stack as one block */
  flex-direction: column;           /* …top to bottom: a bug is a vertical composition */
  align-items: flex-start;          /* …aligned to the reading edge */
  ${form === 'edge-bar' ? `margin-left: ${px(s.accentPx)};  /* starts where the accent bar ends */\n  ` : ''}padding: ${px(padV)} ${px(padH)};
  background: var(--panel-bg);      /* the language's surface */
  border-radius: ${px(s.cornerPx)};${form === 'edge-bar' ? `\n  border-top-left-radius: 0;        /* the accent bar carries this corner */\n  border-bottom-left-radius: 0;` : ''}${surface.blur ? '\n  backdrop-filter: blur(18px);      /* the surface softens the picture behind it */\n  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */' : ''}
}

/* The mark — CENTRED ACROSS THE TILE. The tile is \`fit-content\` around the WIDER of the mark and
   the caption, so a square crest under a longer caption sat flush against the leading edge with
   every pixel of the slack on the other side. That is the owner's single most-repeated note on
   the 2026-08-19 blind read — "if you have a square somewhere, I want the logo to be in the
   middle of the square, or at least some kind of balance" — and it fired on 24 of the 36 rows,
   every one of them this construction (docs/NOACG_PRO_PLAN.md §25.2).

   The MARK is centred rather than the whole stack, and the difference matters twice: the caption
   keeps the reading edge the rest of the package aligns to, and a wide wordmark that already
   fills the tile does not move at all — which is exactly the twelve rows the rule stayed quiet
   on. Nothing here is a threshold; a mark centred in its container is 0 off centre by
   construction, which is what \`tasteCheck\`'s rule 1 measures. */
.corner-bug-logo {
  align-self: center;               /* centred across the tile, whichever of the two is wider */
}

/* The caption — the package's LABEL voice, at the bug's own size. It is the graphic's only line,
   so it carries no step: the hierarchy here is between the MARK and the word beneath it, and a
   line stepped down from itself would be a size decision with no relationship in it. */
.corner-bug-name {
  font-size: ${typePx(s.supportingPx)};  /* the bug's own anchor size */
  font-weight: ${s.supportingWeight};                /* the language's label weight, floored for its size */
  line-height: 1.25;                /* a touch of air if the caption wraps */
  letter-spacing: ${s.supportingTracking};        /* the package's label tracking */
  text-transform: ${language.typography.supportingCase === 'caps' ? 'uppercase' : 'none'};
  color: var(--text-dim);           /* the label colour${form === 'block' ? ' - overridden on the accent block above, where the ink is measured' : ''} */${surface.value === 'transparent' && form !== 'block' ? '\n  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75);  /* a mark with no tile still has to read */' : ''}
}`;

  return { html, css: css + markField, hasAccent: plan.element };
}

/**
 * The `TemplateVariant` this language's sponsor bug IS - compiled through the REGISTRY's own
 * `sponsorBugType`, so the field contract, the required parts and the control page come from the
 * declaration bug01-bug04 are built from rather than from a second description of a bug.
 */
export function bugVariantForLanguage(
  language: DesignLanguage,
  markField = '',
  brandPalette?: LanguagePalette | null,
): TemplateVariant {
  const s = resolveSpacing(language, 'sponsor-bug');
  const { palette } = resolvePalette(language, brandPalette);
  const surface = panelSurface(language, palette);
  return variantFromType(sponsorBugType, {
    id: 'pro-language-sponsor-bug',
    name: language.name,
    description: language.rationale,
    styleTag: 'noacg',
    palette: wizardPalette(language, palette, surface.value),
    fontId: language.typography.fontId,
    // The type's own list, led by the language's character - `resolveOptions` takes the first
    // entry as the default, so the order here IS the motion decision.
    animationPresets: [s.preset, 'fade', 'slide-up', 'blur-in', 'pop-spring'],
    // Where the three shipped bugs that are not the house one sit: the strap owns bottom-left,
    // so the package's persistent mark takes the opposite corner and the two never meet.
    defaultZone: 'top-right',
    create: (_type, options) => defineBugVariant(
      {
        id: 'pro-language-sponsor-bug',
        typeId: 'sponsor-bug',
        category: 'corner-bug',
        name: language.name,
        styleTag: 'noacg',
        description: language.rationale,
        maxLines: 1,
        suggestedLines: [{ title: 'Caption', sample: 'On Air' }],
        logo: 'built-in',
        animationPresets: [s.preset, 'fade', 'slide-up', 'blur-in', 'pop-spring'],
        defaultPalette: wizardPalette(language, palette, surface.value),
        defaultFontId: language.typography.fontId,
        defaultZone: 'top-right',
      },
      { name: language.name, description: language.rationale, uicolor: '4' },
      (o) => buildDesign(language, palette, s, o, markField),
    ).create(options),
  });
}

/** Render a SPONSOR BUG in this language. Same shape as `composeFromLanguage`, same gate. */
export function composeBugFromLanguage(
  language: DesignLanguage,
  options: ComposeOptions,
): ComposedGraphic {
  const s = resolveSpacing(language, 'sponsor-bug');
  const { palette, adjustments: paletteAdjustments } = resolvePalette(language, options.brandPalette);
  const surface = panelSurface(language, palette);
  const markField = options.markField ?? true;
  const mark: MarkTreatment = markField && options.logo
    ? markTreatmentFor(surface.value, options.logo)
    : { kind: 'none', reason: null };
  const variant = bugVariantForLanguage(
    language,
    mark.kind === 'knock' ? markKnockCss(PREFIX, mark) : '',
    options.brandPalette,
  );
  const adjustments = [...paletteAdjustments, ...(mark.kind === 'knock' ? ['mark_ink_knocked'] : [])];
  const notes = platformNotes({
    language, spacing: s, surface, prefix: PREFIX, adjustments, mark,
    plates: platePlan(language, palette, surface, s),
  });
  const template = variant.create({
    lines: options.lines,
    ...(options.resolution ? { resolution: options.resolution } : {}),
    ...(options.fps ? { fps: options.fps } : {}),
    animation: { presetId: s.preset, speed: s.speed, easing: 'auto', steps: false },
    ...(options.logo
      ? {
        logoEnabled: true,
        logoAssetPath: options.logo.assetPath,
        importedImages: options.logo.images,
        ...(mark.kind === 'knock' ? { logoInkKnocked: true } : {}),
      }
      : {}),
  });
  return { template, variant, spacing: s, notes, adjustments };
}

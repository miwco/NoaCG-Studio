// THE TOPIC CARD in a design language - the package's fourth graphic type
// (docs/NOACG_PRO_PLAN.md §15.9).
//
// WHY THIS TYPE. The registry answers it, not taste: `topicCardType.frequency` is 29 of the 60
// reference formats - the next figure down the column after the countdown's 30, and the highest
// type the package did not cover. It is the card that stays up DURING the discussion - a topic,
// a question, a key term - which is what a talk segment carries beside the strap for minutes at
// a time, and it is the first package member that shares the strap's whole structural family:
// the info-card category compiles through the same `assembleStandard` contract, so this module
// is the measure of whether one language reads as one system on two siblings of different sizes.
//
// IT IS COMPOSED THROUGH THE TYPE (`variantFromType` + the registry's own `topicCardType`), so
// the field contract, the required-parts gate and the control page come from the declaration
// card01-card06 compile from rather than from a second description of a card.
//
// WHAT IS DIFFERENT FROM THE STRAP, and each difference is the TYPE's rather than the language's:
//
//   * THE ANCHOR IS THE CARD'S OWN: 44px (`GRAPHIC_METRICS`), the info-card catalog's shipped
//     heading size - between the strap's role line and its name, because a card is read for
//     seconds rather than glanced at.
//   * THE ZONE IS mid-right, the type's own default - the strap owns bottom-left, the bug
//     top-right, so the three on-screen-together graphics never meet.
//   * A MARK IS OPTIONAL and, outside a lower third, the shared slot draws it as the stacked
//     band above the words - the bug's arrangement, because it is the same slot painting it.

import { defineCardVariant, cardLineMasks } from '../../../templates/infoCards/shared';
import type { CardDesign } from '../../../templates/infoCards/shared';
import { topicCardType } from '../../../templates/types/cards';
import type { ResolvedOptions, TemplateVariant } from '../../../model/wizard';
import type { DesignLanguage, LanguagePalette } from './contract';
import {
  markKnockCss,
  markTreatmentFor,
  panelSurface,
  platePlan,
  platformNotes,
  readableInkOn,
  resolvePalette,
  wizardPalette,
  type BrandPalette,
  type MarkTreatment,
} from './paint';
import { accentPlan, resolveSpacing, type ResolvedSpacing } from './structure';
import type { ComposeOptions, ComposedGraphic } from './compose';
import { variantFromType } from './fromType';

const PREFIX = 'info-card';

/** The design body: platform structure, language paint - the strap's composition at card scale. */
function buildDesign(
  language: DesignLanguage,
  palette: LanguagePalette,
  s: ResolvedSpacing,
  o: ResolvedOptions,
  markField: string,
): CardDesign {
  const plan = accentPlan(language.accent.form);
  const surface = panelSurface(language, palette);
  const upper = (c: 'as-written' | 'caps') => (c === 'caps' ? 'uppercase' : 'none');
  const px = (n: number) => `calc(${n}px * var(--scale))`;
  const typePx = (n: number) => `calc(${n}px * var(--scale) * var(--type-scale))`;
  const form = language.accent.form;

  const accentEl = plan.element
    ? `    <!-- The accent: ${plan.note}. -->\n    <div class="info-card-accent"></div>\n`
    : '';

  const html = `    <!-- ${language.name}: the platform's topic-card structure - ${plan.note}.
         The card that stays up during the discussion; structure and spacing are platform-owned. -->
${form === 'edge-bar' ? accentEl : ''}    <div class="info-card-box">
${form === 'top-rule' ? accentEl : ''}${cardLineMasks(o)}
${form === 'underline' ? accentEl : ''}    </div>`;

  // The accent forms carry the strap's own semantics, at the card's scale. The weight is the
  // PACKAGE's (`resolveSpacing` resolves it against PACKAGE_UNIT_PX), so the same bar reads on
  // the strap, the bug, the clock and this card - which is the whole coherence claim.
  const accentCss = form === 'edge-bar'
    ? `/* The accent bar — fused to the card's leading edge, outside its padding, so it is a
   member of the composition rather than something the words have to make room for. */
.info-card-accent {
  position: absolute;               /* pinned inside the positioned .info-card root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full card height… */
  bottom: 0;                        /* …top to bottom */
  width: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(s.cornerPx)} 0 0 ${px(s.cornerPx)};  /* the package's corner language */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}`
    : form === 'top-rule' || form === 'underline'
      ? `/* The accent rule — ${form === 'top-rule' ? 'across the top of the card' : 'under the last line'}, one platform clear space from the
   words (${s.ruleGapPx}px at scale 1, well clear of the crowding band the spacing instrument
   measures). */
.info-card-accent {
${form === 'top-rule'
  ? `  align-self: stretch;              /* a rule across the top spans the words beneath it. IT
                                       NEEDS A WIDTH FROM SOMEWHERE: the card is a flex column
                                       aligned to the reading edge, and an empty div in one has
                                       no content to be as wide as (the §15.5 control run's
                                       first finding, on the strap). */`
  : `  width: ${px(Math.round(s.supportingPx * 2.4))};  /* a SHORT rule, deliberately shorter than the
                                       lines above it - a rule that almost lines up with the
                                       words reads as a mistake (the alignment instrument's
                                       finding, on the strap). */`}
  height: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(Math.min(s.cornerPx, s.accentPx))};  /* a rule rounds to its own thickness at most */
  margin-${form === 'top-rule' ? 'bottom' : 'top'}: ${px(s.ruleGapPx)};  /* the platform's clear space */
  will-change: transform;           /* hint the browser: presets grow this rule in */
}`
      : form === 'block'
        ? (() => {
          // THE BLOCK'S AIR TAKES THE BUG'S FLOOR, and the free calibration sweep is why. The
          // strap derives block padding from its line gap alone; at the card's 44px anchor a
          // compact language's half-gap measured 0.1 type sizes of air - inside the 0.02-0.12
          // almost-touching band `text-crowds-rule` flags (Volt Matchday, the sweep's one
          // finding). `composeBug` already met this exact class on its badge and floored the
          // padding against the text's own size; same floor, same reason, here.
          const padV = Math.max(Math.round(s.lineGapPx / 2), Math.round(s.supportingPx * 0.2));
          return `/* The accent BLOCK — the supporting line sits on the accent itself, the strap's own slab
   composition at card scale. The selector is "a mask preceded by another mask", so the heading
   stays off the block: the accent backs the SUPPORTING line(s). */
.info-card-mask + .info-card-mask {
  background: var(--accent);        /* the block the supporting line reads on */
  width: fit-content;               /* THE BLOCK HUGS ITS OWN WORDS (the §15.8 blind read named
                                       a full-width bar under a two-word line as the defect). */
  max-width: 100%;                  /* …but never wider than the card it sits in */
  border-radius: ${px(Math.min(s.cornerPx, 8))};  /* the package's corner language, kept tight */
  /* No inset on the leading edge, so the block, its words and the heading sit on ONE axis
     (measured twice on the strap's control run - see compose.ts). The vertical air is floored
     against the words' own size, never only the line gap (see the note above). */
  padding: ${px(padV)} ${px(Math.max(s.lineGapPx, Math.round(s.supportingPx * 0.4)))} ${px(padV)} 0;
}
/* The block's INK is measured, not designed: white or black, whichever reads on this accent. */
.info-card-mask + .info-card-mask > span { color: ${readableInkOn(palette.accent)}; }`;
        })()
        : '/* This language carries no accent SHAPE — the accent colour lives in the type alone. */';

  const css = `${accentCss}

/* The card — ${surface.note}. It is \`width: fit-content\` under the category's wider auto-fit
   cap (a card carries more text than a strap), so it is SIZED BY its own words and content
   cannot end up outside it. Padding is ${s.padVPx}px / ${s.padHPx}px at scale 1 — equal on
   opposite sides. */
.info-card-box {
  display: flex;                    /* the lines stack as one block */
  flex-direction: column;           /* …top to bottom */
  align-items: flex-start;          /* …aligned to the reading edge */
  ${form === 'edge-bar' ? `margin-left: ${px(s.accentPx)};  /* starts where the accent bar ends */\n  ` : ''}padding: ${px(s.padVPx)} ${px(s.padHPx)};
  background: var(--panel-bg);      /* the language's surface */
  border-radius: ${px(s.cornerPx)};${form === 'edge-bar' ? `\n  border-top-left-radius: 0;        /* the accent bar carries this corner */\n  border-bottom-left-radius: 0;` : ''}${surface.blur ? '\n  backdrop-filter: blur(18px);      /* the surface softens the picture behind it */\n  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */' : ''}
}

/* The topic — the moment a viewer reads first. */
.info-card-name {
  font-size: ${typePx(s.headingPx)};  /* the card's own anchor size (1080p reference) */
  font-weight: ${s.headingWeight};                /* the language's heading weight */
  line-height: 1.1;                 /* a card heading may wrap; keep the lines together */
  letter-spacing: ${s.headingTracking};        /* the package's tracking */
  text-transform: ${upper(language.typography.headingCase)};
  color: var(--text-color);         /* primary text */${surface.value === 'transparent' ? '\n  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.75);  /* a card with no panel still has to read */' : ''}
}

/* The supporting line(s) — subordinate by ${Math.round((s.supportingPx / s.headingPx) * 100)}% of the heading, the same one type step
   the whole package expresses hierarchy with. */
.info-card-title,
.info-card-extra {
  font-size: ${typePx(s.supportingPx)};  /* the package's supporting size, at card scale */
  font-weight: ${s.supportingWeight};                /* the language's supporting weight, never under the floor */
  line-height: 1.35;                /* card body lines breathe a little more than a strap's */
  letter-spacing: ${s.supportingTracking};        /* the package's label tracking */
  text-transform: ${upper(language.typography.supportingCase)};
  color: var(--text-dim);           /* present, and subordinate${form === 'block' ? ' - overridden on the accent block above, where the ink is measured' : ''} */
  margin-top: ${px(s.lineGapPx)};  /* the platform's line gap */${surface.value === 'transparent' && form !== 'block' ? '\n  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75);  /* a card with no panel still has to read */' : ''}
}`;

  return { html, css: css + markField, hasAccent: plan.element };
}

/**
 * The `TemplateVariant` this language's topic card IS - compiled through the REGISTRY's own
 * `topicCardType`, so the field contract, the required parts and the control page come from the
 * declaration card01-card06 are built from.
 */
export function cardVariantForLanguage(
  language: DesignLanguage,
  markField = '',
  brandPalette?: BrandPalette | null,
): TemplateVariant {
  const s = resolveSpacing(language, 'topic-card');
  const { palette } = resolvePalette(language, brandPalette);
  const surface = panelSurface(language, palette);
  return variantFromType(topicCardType, {
    id: 'pro-language-topic-card',
    name: language.name,
    description: language.rationale,
    styleTag: 'noacg',
    palette: wizardPalette(language, palette, surface.value),
    fontId: language.typography.fontId,
    // The type's own preset list, led by the language's character - `resolveOptions` takes the
    // first entry as the default, so the order here IS the motion decision.
    animationPresets: [s.preset, 'line-reveal', 'slide-up', 'mask-wipe', 'fade'],
    // The type's own default. The strap owns bottom-left and the bug top-right, so the card
    // holds the discussion at the frame's right shoulder and the three never meet.
    defaultZone: 'mid-right',
    create: (_type, options) => defineCardVariant(
      {
        id: 'pro-language-topic-card',
        typeId: 'topic-card',
        category: 'info-card',
        name: language.name,
        styleTag: 'noacg',
        description: language.rationale,
        maxLines: 3,
        // The type's THREE declared lines, all sampled: a declared line left without content
        // still renders its mask, and the block accent paints an empty one as a bare stub
        // (the Volt control frame; packageLines carries the same rule).
        suggestedLines: [
          { title: 'Topic', sample: 'The Story in Numbers' },
          { title: 'Context', sample: 'Renewables grew 28% this year' },
          { title: 'Detail', sample: 'Coal at its lowest share since 1965' },
        ],
        logo: 'optional',
        animationPresets: [s.preset, 'line-reveal', 'slide-up', 'mask-wipe', 'fade'],
        defaultPalette: wizardPalette(language, palette, surface.value),
        defaultFontId: language.typography.fontId,
        defaultZone: 'mid-right',
      },
      { name: language.name, description: language.rationale, uicolor: '4' },
      (o) => buildDesign(language, palette, s, o, markField),
    ).create(options),
  });
}

/** Render a TOPIC CARD in this language. Same shape as `composeFromLanguage`, same gate. */
export function composeCardFromLanguage(
  language: DesignLanguage,
  options: ComposeOptions,
): ComposedGraphic {
  const s = resolveSpacing(language, 'topic-card');
  const { palette, adjustments: paletteAdjustments } = resolvePalette(language, options.brandPalette);
  const surface = panelSurface(language, palette);
  const markField = options.markField ?? true;
  const mark: MarkTreatment = markField && options.logo
    ? markTreatmentFor(surface.value, options.logo)
    : { kind: 'none', reason: null };
  const variant = cardVariantForLanguage(
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

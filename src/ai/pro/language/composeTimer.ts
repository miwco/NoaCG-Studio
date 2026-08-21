// THE COUNTDOWN in a design language - Phase B's second new graphic type
// (docs/NOACG_PRO_PLAN.md §15.9).
//
// WHY THIS TYPE. Again the registry rather than taste: `countdownType.frequency` is 30 of the 60
// reference formats (countdown, interval timer, round timer, deal timer, break timer), third
// behind the lower third's 52 and the sponsor bug's 37. It is also the type that proves the most
// about Phase A's claim, for two reasons a strap and a bug cannot test:
//
//   * ITS PRIMARY ELEMENT IS NOT A LINE THE OPERATOR TYPES. The clock is painted by the shared
//     countdown runtime (`templates/shared/clock.ts`) every second, and the label steps down from
//     it exactly as a strap's role line steps down from the name. If the language's type step
//     only worked on operator text it would not be a package decision at all.
//   * IT CARRIES A REAL MACHINE. `countdownType` declares a PARALLEL pause/resume group, so a Pro
//     countdown compiled through the registry gets the same two control buttons the catalog's own
//     timers get - which is the difference between a graphic that looks like a package member and
//     one that behaves like one.
//
// THE ONE THING THIS FILE OWES THE CATEGORY that the other two do not: the game-timer assembler
// adds `.game-timer-done` to the root at zero and the DESIGN must style that state, or the
// countdown reaches zero and says nothing. It is drawn in the language's own accent, which is the
// package's answer to "something just happened" everywhere else too.

import { defineGameTimerVariant } from '../../../templates/gameTimers/shared';
import type { GameTimerDesign } from '../../../templates/gameTimers/shared';
import type { ResolvedOptions, TemplateVariant } from '../../../model/wizard';
import { countdownType } from '../../../templates/types/clocks';
import type { DesignLanguage, LanguagePalette } from './contract';
import {
  markKnockCss,
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

/** The countdown the platform composes when the caller names no duration. Three minutes is the
 *  type's own declared value, so a Pro timer starts where a catalog timer starts. */
const DEFAULT_MINUTES = '3';

/**
 * THE ACCENT, around a clock. Same five forms, resolved onto a panel whose focal element is a row
 * of numerals rather than a name:
 *
 *   * `edge-bar` fuses to the panel's leading edge - gt05's own arrangement, and lt11's;
 *   * `top-rule` caps the panel above the label;
 *   * `underline` sits beneath the clock, closing the composition;
 *   * `block` puts the LABEL on the accent, which is gt02's slab chip;
 *   * `none` leaves the accent to the digits at zero.
 */
function accentCssFor(language: DesignLanguage, palette: LanguagePalette, s: ResolvedSpacing): string {
  const px = (n: number) => `calc(${n}px * var(--scale))`;
  switch (language.accent.form) {
    case 'edge-bar':
      return `/* The accent bar — fused to the panel's leading edge, outside its padding. The weight is the
   PACKAGE's rather than this graphic's: the same bar reads on the strap and on the bug. */
.game-timer-accent {
  position: absolute;               /* pinned inside the positioned .game-timer root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(s.cornerPx)} 0 0 ${px(s.cornerPx)};  /* the package's corner language */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}`;
    case 'top-rule':
      return `/* The accent rule — across the top of the panel, one platform clear space above the label.
   ${s.ruleGapPx}px at scale 1, well clear of the crowding band the spacing instrument measures. */
.game-timer-accent {
  align-self: stretch;              /* a rule across the top spans the panel beneath it — an empty
                                       div in a flex column has no content to take a width from */
  height: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(Math.min(s.cornerPx, s.accentPx))};  /* a rule rounds to its own thickness at most */
  margin-bottom: ${px(s.ruleGapPx)};  /* the platform's clear space */
  will-change: transform;           /* hint the browser: presets grow this rule in */
}`;
    case 'underline':
      return `/* The accent rule — under the clock, closing the composition, one platform clear space below
   the digits. SHORT rather than stretched: a rule that almost lines up reads as a mistake. */
.game-timer-accent {
  width: ${px(Math.round(s.supportingPx * 2.4))};  /* deliberately shorter than the clock above it */
  height: ${px(s.accentPx)};  /* the package's accent weight */
  background: var(--accent);        /* the one accent surface */
  border-radius: ${px(Math.min(s.cornerPx, s.accentPx))};  /* a rule rounds to its own thickness at most */
  margin-top: ${px(s.ruleGapPx)};  /* the platform's clear space */
  will-change: transform;           /* hint the browser: presets grow this rule in */
}`;
    case 'block':
      return `/* The accent BLOCK — the label sits on the accent itself, a chip above the clock. Contact is
   the composition here, so there is no gap to clear. */
.game-timer-mask {
  background: var(--accent);        /* the chip the label reads on */
  width: fit-content;               /* THE CHIP HUGS ITS OWN WORDS — never a bar as wide as the
                                       clock beneath it (the §15.8 blind read's own note). */
  max-width: 100%;                  /* …but never wider than the panel it sits in */
  border-radius: ${px(Math.min(s.cornerPx, 8))};  /* the package's corner language, kept tight */
  /* NO INSET ON THE LEADING EDGE, so the chip's edge and the clock below sit on ONE axis. */
  padding: ${px(Math.round(s.lineGapPx / 2))} ${px(s.lineGapPx)} ${px(Math.round(s.lineGapPx / 2))} 0;
}
/* The chip's INK is measured, not designed: white or black, whichever reads on this accent. */
.game-timer-mask > span { color: ${readableInkOn(palette.accent)}; }`;
    case 'none':
    default:
      return '/* This language carries no accent SHAPE — the accent colour lives in the type alone,\n   and in the digits the moment the clock reaches zero. */';
  }
}

/** The design body: platform structure, language paint. */
function buildDesign(
  language: DesignLanguage,
  palette: LanguagePalette,
  s: ResolvedSpacing,
  o: ResolvedOptions,
  markField: string,
): GameTimerDesign {
  const plan = accentPlan(language.accent.form);
  const surface = panelSurface(language, palette);
  const px = (n: number) => `calc(${n}px * var(--scale))`;
  const typePx = (n: number) => `calc(${n}px * var(--scale) * var(--type-scale))`;
  const form = language.accent.form;
  const label = o.lines[0]?.sample || 'ROUND 1';

  const accentEl = plan.element
    ? `      <!-- The accent: ${plan.note}. -->\n      <div class="game-timer-accent"></div>\n`
    : '';

  const html = `    <!-- ${language.name}: the platform's countdown structure - ${plan.note}.
         The label is the package's label voice; the clock is its primary size. The countdown
         runtime repaints the clock every second as M:SS and adds .game-timer-done at zero. -->
${form === 'edge-bar' ? accentEl : ''}    <div class="game-timer-box">
${form === 'top-rule' ? accentEl : ''}      <!-- The label line — #f0 is the SPX field. -->
      <div class="game-timer-mask"><span id="f0" class="game-timer-label">${label}</span></div>
      <!-- The clock — the countdown runtime repaints this every second. -->
      <div class="game-timer-clock">3:00</div>
${form === 'underline' ? accentEl : ''}    </div>`;

  const css = `${accentCssFor(language, palette, s)}

/* The panel — ${surface.note}. It is \`width: fit-content\` (the category's auto-fit rule), so it
   is SIZED BY its own content: a longer label widens it and then wraps inside it. Padding is
   ${s.padVPx}px / ${s.padHPx}px at scale 1 — equal on opposite sides. */
.game-timer-box {
  display: flex;                    /* the label and the clock stack as one block */
  flex-direction: column;           /* …top to bottom */
  align-items: flex-start;          /* …aligned to the reading edge */
  ${form === 'edge-bar' ? `margin-left: ${px(s.accentPx)};  /* starts where the accent bar ends */\n  ` : ''}padding: ${px(s.padVPx)} ${px(s.padHPx)};
  background: var(--panel-bg);      /* the language's surface */
  border-radius: ${px(s.cornerPx)};${form === 'edge-bar' ? `\n  border-top-left-radius: 0;        /* the accent bar carries this corner */\n  border-bottom-left-radius: 0;` : ''}${surface.blur ? '\n  backdrop-filter: blur(18px);      /* the surface softens the picture behind it */\n  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */' : ''}
}

/* The mark — CENTRED ACROSS THE PANEL, the same arrangement the sponsor bug takes, for the same
   reason: the panel is \`fit-content\` around whichever of its children is widest, so a mark left
   flush in a panel sized by its clock reads as an accident (the owner's most-repeated note on the
   2026-08-19 read; docs/NOACG_PRO_PLAN.md §25.2). The mark leads the panel, the label and the
   clock follow - a channel mark above "STARTING IN" above the digits, which is how a countdown is
   drawn on air. */
.game-timer-logo {
  align-self: center;               /* centred across the panel, whatever sizes it */
}

/* The label — the package's LABEL voice, ${Math.round((s.supportingPx / s.headingPx) * 100)}% of the clock's size. Exactly the step a
   lower third's role line takes from its name: one type step, one package. */
.game-timer-label {
  font-size: ${typePx(s.supportingPx)};  /* the package's supporting size */
  font-weight: ${s.supportingWeight};                /* the language's label weight */
  line-height: 1.3;                 /* a touch of air if the label wraps */
  letter-spacing: ${s.supportingTracking};        /* the package's label tracking */
  text-transform: ${language.typography.supportingCase === 'caps' ? 'uppercase' : 'none'};
  color: var(--text-dim);           /* present, and subordinate${form === 'block' ? ' - overridden on the accent chip above, where the ink is measured' : ''} */${surface.value === 'transparent' && form !== 'block' ? '\n  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75);  /* a clock with no panel still has to read */' : ''}
}

/* The clock — this graphic's primary element, at the package's own display size. Tabular figures
   through --font-numeric, so the digits never change width as the seconds tick. */
.game-timer-clock {
  margin-top: ${px(s.lineGapPx)};  /* the platform's line gap — label and clock read as one unit */
  font-size: ${typePx(s.headingPx)};  /* the package's primary size (1080p reference) */
  font-weight: ${s.headingWeight};                /* the language's heading weight */
  line-height: 1;                   /* the numerals sit tight under the label */
  letter-spacing: ${s.headingTracking};        /* the package's tracking */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no jiggle */
  font-family: var(--font-numeric); /* a face whose digits are all one width */
  color: var(--text-color);         /* the brightest element on screen */
  will-change: transform, opacity;  /* hint the browser: presets fade this up */${surface.value === 'transparent' ? '\n  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.75);  /* a clock with no panel still has to read */' : ''}
}

/* ── Time's up: the clock runtime adds .game-timer-done on the root at zero. ──
   Zero reads in the accent, which is the package's answer to "something just happened"
   everywhere else too — and it is drawn as a state change, never as an animation the timeline
   cannot see. */
.game-timer-done .game-timer-clock {
  color: var(--accent);             /* zero reads in the accent colour */
  animation: game-timer-flash 0.9s ease-out;  /* one brief flash, then steady */
}
@keyframes game-timer-flash {
  0%, 44%, 100% { opacity: 1; }     /* on… */
  22%, 66% { opacity: 0.25; }       /* …off — two quick blinks, then settle */
}`;

  return { html, css: css + markField, hasAccent: plan.element };
}

/**
 * The `TemplateVariant` this language's countdown IS - compiled through the REGISTRY's own
 * `countdownType`, which is where the pause/resume machine and its two control buttons come from.
 */
export function timerVariantForLanguage(
  language: DesignLanguage,
  markField = '',
  brandPalette?: LanguagePalette | null,
): TemplateVariant {
  const s = resolveSpacing(language, 'countdown');
  const { palette } = resolvePalette(language, brandPalette);
  const surface = panelSurface(language, palette);
  return variantFromType(countdownType, {
    id: 'pro-language-countdown',
    name: language.name,
    description: language.rationale,
    styleTag: 'noacg',
    // THIS design opts IN. The type permits a mark and the four catalog timers decline it - none
    // was drawn with a place for one - so a Pro countdown says so for itself, which is what keeps
    // "the package carries its mark on every piece" a property of the package rather than a flag
    // flipped on everybody's browse grid (docs/MARK_CAPABILITY_AUDIT.md).
    logo: 'optional',
    palette: wizardPalette(language, palette, surface.value),
    fontId: language.typography.fontId,
    // The category draws exactly two entrances; the language's character picks which leads.
    animationPresets: s.preset === 'timer-run'
      ? ['timer-run', 'timer-line-reveal']
      : ['timer-line-reveal', 'timer-run'],
    create: (_type, options) => defineGameTimerVariant(
      {
        id: 'pro-language-countdown',
        typeId: 'countdown',
        category: 'game-timer',
        name: language.name,
        styleTag: 'noacg',
        description: language.rationale,
        maxLines: 1,
        suggestedLines: [{ title: 'Label', sample: 'ROUND 1' }],
        logo: 'optional',
        animationPresets: s.preset === 'timer-run'
          ? ['timer-run', 'timer-line-reveal']
          : ['timer-line-reveal', 'timer-run'],
        defaultPalette: wizardPalette(language, palette, surface.value),
        defaultFontId: language.typography.fontId,
        defaultZone: 'top-center',
      },
      { name: language.name, description: language.rationale, uicolor: '4' },
      (o) => buildDesign(language, palette, s, o, markField),
    ).create(options),
  });
}

/**
 * Render a COUNTDOWN in this language.
 *
 * IT TAKES THE PACKAGE'S MARK, since 2026-08-21. `options.logo` used to be accepted and ignored
 * because the type declared `logo: 'none'` - and that declaration turned out to be an authoring
 * accident rather than a property of a clock, which is what made every Pro package inconsistent
 * (the owner's sixth rule, §25.4). The mark is treated exactly as the strap's and the bug's are:
 * knocked to the one ink that reads when the panel defeats it, left alone otherwise.
 */
export function composeTimerFromLanguage(
  language: DesignLanguage,
  options: ComposeOptions & { minutes?: string },
): ComposedGraphic {
  const s = resolveSpacing(language, 'countdown');
  const { palette, adjustments: paletteAdjustments } = resolvePalette(language, options.brandPalette);
  const surface = panelSurface(language, palette);
  const markField = options.markField ?? true;
  const mark: MarkTreatment = markField && options.logo
    ? markTreatmentFor(surface.value, options.logo)
    : { kind: 'none', reason: null };
  const variant = timerVariantForLanguage(
    language,
    mark.kind === 'knock' ? markKnockCss('game-timer', mark) : '',
    options.brandPalette,
  );
  const adjustments = [...paletteAdjustments, ...(mark.kind === 'knock' ? ['mark_ink_knocked'] : [])];
  const notes = platformNotes({
    language, spacing: s, surface, prefix: 'game-timer', adjustments, mark,
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
    // Through the TYPE's own content channel, keyed by its logical field name, so an illegal
    // value is dropped against the field's declaration rather than written (`withContentValues`).
    content: { minutes: options.minutes ?? DEFAULT_MINUTES },
  });
  return { template, variant, spacing: s, notes, adjustments };
}

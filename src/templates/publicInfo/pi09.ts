// pi09 "Notice Rotator" — the minimal two-language notice. Same machine as pi08, plain
// newsroom face: an accent rule on the reading edge, no blur, no second typeface.
//
// It exists as its own design rather than as a palette swap of the house rotator because
// families are shapes, not colours (DESIGN_LANGUAGE §8): the minimal family marks a notice
// with a rule on its reading edge, the house family with a void panel and a mono kicker, and
// swapping the palette of one does not produce the other.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks, PI_LANG_STACK_CSS } from './shared';

export const pi09: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi09',
    category: 'public-info',
    name: 'Notice Rotator',
    styleTag: 'minimal',
    description: 'A plain two-language notice whose languages take turns — timed, and holdable.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading (language 1)', sample: 'Voting information' },
      { title: 'Notice (language 1)', sample: 'Polling stations are open until 20:00. Bring photo identification.' },
      { title: 'Heading (language 2)', sample: 'Información electoral' },
      { title: 'Notice (language 2)', sample: 'Los colegios electorales abren hasta las 20:00. Traiga identificación con foto.' },
      { title: 'Issued by', sample: 'Electoral Commission' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Notice Rotator',
    description:
      'The minimal two-language notice: one block, an accent rule on the reading edge, and ' +
      'the two languages cross-fading on the graphic’s own timer. The operator can pick a ' +
      'language or hold the one that is up.',
    uicolor: '2',
  },
  (o) => ({
    hasLanguages: true,
    html: `    <!-- Notice Rotator: both languages in one stacked block, over one attribution. -->
    <div class="public-info-box">
      <div class="public-info-langs">
        <!-- Language 1 — the resting language (see the language machine's initial state). -->
        <div class="public-info-lang-1">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body']], '          ')}
        </div>
        <!-- Language 2 — stacked in the same cell, revealed by the machine. -->
        <div class="public-info-lang-2">
${piMasks(o, [[2, 'public-info-kicker'], [3, 'public-info-body']], '          ')}
        </div>
      </div>
${piMasks(o, [[4, 'public-info-source']])}
    </div>`,
    css: `/* The panel — flat and opaque, marked on the reading edge. */
.public-info-box {
  display: flex;                   /* the language block, then the attribution */
  flex-direction: column;          /* stacked */
  gap: calc(18px * var(--scale));  /* air above the attribution */
  width: calc(1120px * var(--scale));  /* one column of prose, comfortably wide */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(28px * var(--scale)) calc(34px * var(--scale));
  border-left: var(--accent-weight) solid var(--accent);  /* the official mark, on the reading edge */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

${PI_LANG_STACK_CSS}

/* The heading — one per language. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the family's label colour */
}

/* The notice — identical treatment in both languages. */
.public-info-body {
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.34;               /* generous: this line will wrap */
  color: var(--text-color);        /* primary text color — in BOTH languages */
}

/* The hairline above the shared attribution, drawn on the MASK — a span is inline-block, so
   a rule on it would only be as wide as the words. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(16px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* divides notice from attribution */
}

/* The issuing body — one attribution for both languages. */
.public-info-source {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

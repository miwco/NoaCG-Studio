// pi08 "Language Rotator" — the house version of the two-language notice, for when there is
// no room to put both on screen at once. The languages take turns in the same block: the
// panel holds its size, the message alternates, and an operator can hold it on whichever
// language a viewer is asking about.
//
// The rotation is the graphic's own state machine (types/publicNotice.ts), not a loop. That
// is what makes it holdable: an endless animation can only be watched, where a machine can
// be driven.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import {
  definePublicInfoVariant,
  piMasks,
  PI_LANG_STACK_CSS,
  type PublicInfoDesign,
} from './shared';

export const pi08: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi08',
    category: 'public-info',
    name: 'Language Rotator',
    styleTag: 'noacg',
    description: 'One notice, two languages taking turns in one block — timed, and holdable on air.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading (language 1)', sample: 'Public notice' },
      { title: 'Notice (language 1)', sample: 'The ferry terminal closes at 22:00 tonight for maintenance.' },
      { title: 'Heading (language 2)', sample: 'Yleinen tiedote' },
      { title: 'Notice (language 2)', sample: 'Lauttaterminaali suljetaan tänään klo 22.00 huoltotöiden vuoksi.' },
      { title: 'Issued by', sample: 'Port Authority' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Language Rotator',
    description:
      'The house two-language notice: both versions occupy one block and cross-fade on the ' +
      'graphic’s own timer, so the panel never re-flows when the languages differ in length. ' +
      'The operator can pick a language or hold the one that is up.',
    uicolor: '4',
  },
  (o) => houseRotator(o),
);

/** The House Language Rotator look. Exported so a sibling family can wear the same shape. */
export function houseRotator(o: ResolvedOptions): PublicInfoDesign {
  return {
    hasLanguages: true,
    html: `    <!-- Language Rotator: both languages in one stacked block, over one attribution. -->
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
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, edged by a half-strength accent line. */
.public-info-box {
  display: flex;                   /* the language block, then the attribution */
  flex-direction: column;          /* stacked */
  gap: calc(18px * var(--scale));  /* air above the attribution */
  width: calc(1180px * var(--scale));  /* one column of prose, comfortably wide */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(30px * var(--scale)) calc(36px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

${PI_LANG_STACK_CSS}

/* The heading — one per language, in the house mono voice. */
.public-info-kicker {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(17px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the accent, in the house family */
}

/* The notice — identical treatment in both languages. */
.public-info-body {
  font-size: calc(30px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.32;               /* generous: this line will wrap */
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
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(15px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the accent, in the house family */
}`,
    hasAccent: false,
    // The house label tracking opens too far for a full heading word; tightened like tk05's.
    tokens: { labelTracking: '0.16em' },
  };
}

// pi12 "Frost Notice Rotator" - the glass two-language notice, sibling of lt08 Frosted Card.
// Both languages share one frosted surface, so different copy lengths never move the panel.
// The existing language machine remains timed, selectable and holdable by the operator.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks, PI_LANG_STACK_CSS } from './shared';

export const pi12: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi12',
    category: 'public-info',
    name: 'Frost Notice Rotator',
    styleTag: 'glass',
    description: 'A frosted two-language notice whose messages rotate in one stable panel.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading (language 1)', sample: 'Public notice' },
      { title: 'Notice (language 1)', sample: 'The ferry terminal closes at 22:00 tonight for maintenance.' },
      { title: 'Heading (language 2)', sample: 'Yleinen tiedote' },
      { title: 'Notice (language 2)', sample: 'Lauttaterminaali suljetaan tänään klo 22.00 huoltotöiden vuoksi.' },
      { title: 'Issued by', sample: 'Port Authority' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'fade', 'slide-up'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Frost Notice Rotator',
    description:
      'The glass two-language notice: a softly-rounded frosted panel, both messages sharing ' +
      'one stable reading block, and a quiet issuing line beneath a keyline.',
    uicolor: '2',
  },
  (o) => ({
    hasLanguages: true,
    html: `    <!-- Frost Notice Rotator: both languages in one fixed block, over one attribution. -->
    <div class="public-info-box">
      <div class="public-info-langs">
        <!-- Language 1 - the resting language. -->
        <div class="public-info-lang-1">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body']], '          ')}
        </div>
        <!-- Language 2 - stacked in the same cell and revealed by the machine. -->
        <div class="public-info-lang-2">
${piMasks(o, [[2, 'public-info-kicker'], [3, 'public-info-body']], '          ')}
        </div>
      </div>
${piMasks(o, [[4, 'public-info-source']])}
    </div>`,
    css: `/* The panel - translucent glass over an opaque floor for dependable legibility. */
.public-info-box {
  display: flex;                   /* language block, then attribution */
  flex-direction: column;          /* stacked */
  gap: calc(22px * var(--scale));  /* air above the issuer */
  width: calc(1160px * var(--scale));  /* one stable reading measure for both languages */
  max-width: none;                 /* this design owns its frame-relative width */
  padding: calc(38px * var(--scale)) calc(45px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft corners */
  background: linear-gradient(var(--panel-bg), var(--panel-bg)), rgba(8, 12, 18, 0.8);
  backdrop-filter: var(--panel-blur);      /* the family's frosted treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift plus keyline */
  text-align: left;                /* notices read left to right */
}

${PI_LANG_STACK_CSS}

/* Each heading uses the rounded family's tracked accent voice. */
.public-info-kicker {
  font-family: var(--font-label);
  font-size: calc(21px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The notice - calm prose with generous leading for long translations. */
.public-info-body {
  font-size: calc(36px * var(--scale) * var(--type-scale));
  font-weight: 500;
  line-height: 1.32;
  color: var(--text-color);
}

/* A quiet inner keyline separates the shared attribution. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(20px * var(--scale));
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

/* The issuing body - the quietest voice on the panel. */
.public-info-source {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}`,
    hasAccent: false,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1160,
  }),
);

// pi11 "Slab Notice Rotator" - the sport two-language notice, sibling of lt05 Sport Slab.
// Both languages occupy one fixed block so the hard-edged panel never reflows. The language
// timer, hold controls, field list and update path are inherited unchanged from the type.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks, PI_LANG_STACK_CSS } from './shared';

export const pi11: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi11',
    category: 'public-info',
    name: 'Slab Notice Rotator',
    styleTag: 'sport',
    description: 'A hard-edged two-language notice whose messages rotate in one solid slab.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading (language 1)', sample: 'Public notice' },
      { title: 'Notice (language 1)', sample: 'The ferry terminal closes at 22:00 tonight for maintenance.' },
      { title: 'Heading (language 2)', sample: 'Yleinen tiedote' },
      { title: 'Notice (language 2)', sample: 'Lauttaterminaali suljetaan tänään klo 22.00 huoltotöiden vuoksi.' },
      { title: 'Issued by', sample: 'Port Authority' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Slab Notice Rotator',
    description:
      'The sport two-language notice: a solid, hard-edged slab with a bold accent header, ' +
      'both messages rotating in one fixed block, and a compact issuing line beneath.',
    uicolor: '5',
  },
  (o) => ({
    hasLanguages: true,
    html: `    <!-- Slab Notice Rotator: both languages in one fixed block, over one attribution. -->
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
    css: `/* The panel - a filled slab with hard edges and no decorative radius. */
.public-info-box {
  display: flex;                   /* language block, then attribution */
  flex-direction: column;          /* stacked */
  gap: calc(20px * var(--scale));  /* clear separation above the issuer */
  width: calc(1140px * var(--scale));  /* fixed prose measure prevents language reflow */
  max-width: none;                 /* this design owns its frame-relative width */
  padding: calc(34px * var(--scale)) calc(42px * var(--scale));
  border-left: var(--accent-weight) solid var(--accent);  /* the family's energy slab */
  border-radius: var(--panel-radius);  /* hard-edged in the sport family */
  background: var(--panel-bg);     /* solid broadcast slab */
  box-shadow: var(--panel-shadow); /* hard offset lift */
  text-align: left;                /* notices read left to right */
}

${PI_LANG_STACK_CSS}

/* Each language heading is a bold accent-filled label. */
.public-info-kicker {
  display: inline-block;           /* the accent slab hugs the heading */
  width: fit-content;              /* no empty accent bar after short headings */
  padding: calc(6px * var(--scale)) calc(15px * var(--scale));
  background: var(--accent);       /* sport uses the accent boldly */
  color: var(--accent-ink);        /* readable ink on the accent fill */
  font-family: var(--font-label);  /* the condensed family face */
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 800;                /* heavy sport label */
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

/* The notice - heavy enough to survive the slab without becoming a headline. */
.public-info-body {
  font-size: calc(35px * var(--scale) * var(--type-scale));
  font-weight: 600;
  /* 1.34, the same generous leading pi08 and pi09 give this line: a notice WRAPS, and the
   * condensed sport face rides higher, so a tighter figure clipped the wrapped line's
   * descenders inside its own reveal mask (caught by scripts/overflow-sweep.mjs). */
  line-height: 1.34;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* A hard rule separates the shared attribution from the rotating message. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(18px * var(--scale));
  border-top: calc(3px * var(--scale)) solid rgba(255, 255, 255, 0.18);
}

/* The issuing body - compact, tracked and authoritative. */
.public-info-source {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}`,
    hasAccent: false,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1140,
  }),
);

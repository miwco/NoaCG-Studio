// al11 "Breaking Edition" - the editorial breaking strap and sibling of lt25 "Masthead".
// It is deliberately single-state: BREAKING is operator copy, not a fake severity ladder.
// Printed rules and flat ink make the hierarchy; there is no rounded or glass surface.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { alertLineMasks, defineAlertVariant } from './shared';

export const al11: TemplateVariant = defineAlertVariant(
  {
    id: 'al11',
    category: 'alert',
    name: 'Breaking Edition',
    styleTag: 'editorial',
    description: 'Breaking strap with a printed masthead, set headline and explicit attribution.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'BREAKING · DEVELOPING STORY' },
      { title: 'Headline', sample: 'Rail services resume after overnight repairs' },
      { title: 'Attribution', sample: 'Transport desk · Updated 18:42' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Breaking Edition',
    description:
      'The breaking strap in the lt25 Masthead family: two exact 2 px printed rules frame a ' +
      'wide-tracked status line, one set headline and an attribution on a flat ink surface.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Breaking Edition: top rule, status, headline, attribution, bottom rule. -->
    <div class="alert-box">
      <div class="alert-accent"></div>
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The breaking strap - flat ink and printed rules, not a rounded alert card. */
.alert-box {
  position: relative;              /* contains the lower rule */
  width: calc(1680px * var(--scale)); /* near full safe-area width */
  max-width: none;                 /* deliberate full-width band inside the safe area */
  padding: calc(27px * var(--scale)) calc(42px * var(--scale)) calc(29px * var(--scale));
  background: var(--panel-bg);     /* flat editorial ink */
  border-top: var(--accent-weight) solid var(--accent); /* exact 2 px printed rule */
  border-bottom: var(--accent-weight) solid var(--accent); /* matching close */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* one restrained lift */
}

/* The short masthead rule - the first thing line-reveal draws. */
.alert-accent {
  width: calc(230px * var(--scale)); /* short organising rule */
  height: var(--accent-weight);     /* exact editorial 2 px */
  margin-bottom: calc(15px * var(--scale)); /* space before status */
  background: var(--accent);       /* single accent colour */
  transform-origin: left center;   /* draws from the reading edge */
  will-change: transform;          /* preset animates this rule */
}

.alert-lines {
  display: grid;                   /* status and source frame the headline */
  grid-template-columns: minmax(0, 1fr) auto; /* headline, then attribution */
  column-gap: calc(45px * var(--scale)); /* clear editorial separation */
  align-items: end;                /* attribution sits on the headline baseline */
  text-align: left;                /* fixed reading edge */
}

/* The masks are the grid children - place them, not the spans inside them. */
.alert-lines .alert-mask:nth-child(1) {
  grid-column: 1 / -1;             /* status spans the strap */
}
.alert-lines .alert-mask:nth-child(2) {
  grid-column: 1;                  /* headline owns the reading column */
}
.alert-lines .alert-mask:nth-child(3) {
  grid-column: 2;                  /* attribution closes the line */
}

.alert-name {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* status at broadcast floor */
  font-weight: 700;                /* crisp caps */
  line-height: 1.3;                /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact editorial 0.24em */
  text-transform: uppercase;       /* newsroom status */
  color: var(--label-color);       /* accent-coloured label */
}

.alert-title {
  display: block;                  /* headline owns its grid cell */
  margin-top: calc(9px * var(--scale)); /* tied to the status */
  font-size: calc(47px * var(--scale) * var(--type-scale)); /* breaking headline */
  font-weight: var(--display-weight); /* exact editorial 600 */
  line-height: 1.13;               /* supports a two-row headline */
  letter-spacing: var(--display-tracking); /* exact editorial -0.015em */
  color: var(--text-color);        /* primary ink */
}

.alert-extra {
  display: block;                  /* attribution owns its grid cell */
  max-width: calc(410px * var(--scale)); /* keeps the source compact */
  padding-bottom: calc(5px * var(--scale)); /* optical baseline correction */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.35;               /* supports wrap */
  color: var(--text-dim);          /* subordinate but explicit */
  text-align: right;               /* aligns toward the right edge */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1680,
  }),
);

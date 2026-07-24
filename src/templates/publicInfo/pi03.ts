// pi03 "Source Label" — the attribution chip. Where a figure, a map or a quote came from,
// parked in a corner and small enough to live under the content it credits.
//
// This is the smallest graphic in the pack and the one most likely to be on screen for the
// longest, which is the whole design brief: it has to be readable without ever competing with
// what it is attributing. Hence no panel fill worth the name, no accent block, and a size
// tuned to be legible at 1080p rather than impressive at 4K.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi03: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi03',
    category: 'public-info',
    name: 'Source Label',
    styleTag: 'minimal',
    description: 'A small corner attribution: where this came from, and when it was measured.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Source', sample: 'Source: National Statistics Office' },
      { title: 'Qualifier', sample: 'Provisional figures, collected 12 March' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Source Label',
    description:
      'The attribution chip: a source line with a quieter qualifier under it, on a barely-' +
      'there panel. Built to sit under a chart or a map for minutes at a time without ever ' +
      'pulling the eye off it.',
    uicolor: '6',
  },
  (o) => ({
    html: `    <!-- Source Label: the attribution, with a qualifier under it. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-source-main'], [1, 'public-info-source-note']])}
    </div>`,
    css: `/* The chip — a soft scrim rather than a panel. It exists to keep the text off a bright
   background, not to be a graphic in its own right. */
.public-info-box {
  display: flex;                   /* stack the two lines */
  flex-direction: column;          /* source, then qualifier */
  gap: calc(3px * var(--scale));   /* the qualifier belongs to the line above it */
  max-width: calc(827px * var(--scale)); /* long attributions wrap rather than run off */
  padding: calc(13px * var(--scale)) calc(19px * var(--scale));
  border-left: calc(3px * var(--scale)) solid var(--accent); /* a hairline mark on the reading edge */
  background: rgba(10, 12, 16, 0.62); /* a scrim, deliberately lighter than the pack's panels */
  text-align: left;                /* an attribution reads left to right, whatever the zone */
}

/* The source — the fact that has to survive a re-encode and a small screen. */
.public-info-source-main {
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* the floor for legible on-air text */
  font-weight: 600;                /* weight, not size, is what keeps small text readable */
  line-height: 1.25;               /* comfortable across a wrap */
  color: var(--text-color);        /* primary text color */
}

/* The qualifier — the caveat a careful broadcaster adds and a careless one drops. */
.public-info-source-note {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* quieter, but not decorative */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.3;                /* comfortable across a wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
  }),
);

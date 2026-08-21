// ss14 'Clean Sign-off' - the minimal end card: no panel, a soft scrim, and one hairline.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';
import { signOffDesign } from './signOffShared';

export const ss14: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss14',
    category: 'starting-soon',
    name: 'Clean Sign-off',
    styleTag: 'minimal',
    description:
      'A quiet end card with a logo, thank-you line, and optional next-broadcast note.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Closing line', sample: 'Until next time' },
      { title: 'Message', sample: 'Thanks for watching' },
      { title: 'Next broadcast', sample: 'Back Thursday at 19:00' },
    ],
    logo: 'optional',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Sign-off',
    description:
      'A minimal full-frame sign-off with a soft scrim, hairline rule, logo slot, and restrained next appointment.',
    uicolor: '2',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    ...signOffDesign(o, {
          label: 'Clean Sign-off',
          css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
        .starting-soon-box {
          display: flex;  /* selects the layout model the composition depends on */
          flex-direction: column;  /* stacks the content in its intended reading order */
          align-items: center;  /* keeps related elements aligned as one visual unit */
          text-align: center;  /* keeps wrapped copy aligned with the composition */
          min-width: calc(640px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
          padding: calc(38px * var(--scale)) calc(60px * var(--scale));  /* gives content broadcast-safe breathing room */
          background: linear-gradient(180deg, rgba(7,9,13,.34), rgba(7,9,13,.7));  /* provides the family surface or contrast this element needs */
        }
    /* The supporting voice stays subordinate while remaining broadcast-legible. */
    .starting-soon-kicker {
      margin-top: calc(16px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: 700;  /* separates this voice without introducing another typeface */
      letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
      text-transform: uppercase;  /* normalizes the label register regardless of input case */
      color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The primary line carries the strongest type scale because it is the viewer's first read. */
    .starting-soon-message {
      margin-top: calc(12px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(68px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
      line-height: 1.08;  /* keeps wrapped copy compact but readable */
      letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
      color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The family accent supplies hierarchy without adding another decorative surface. */
    .starting-soon-rule {
      width: calc(88px * var(--scale));  /* fixes the authored horizontal footprint */
      height: var(--accent-weight);  /* fixes the authored vertical footprint */
      margin: calc(24px * var(--scale)) 0;  /* creates hierarchy through space instead of decoration */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      will-change: transform;  /* hints the exact property the entrance animates */
    }
    /* The supporting line stays secondary but above the broadcast readability floor. */
    .starting-soon-next {
      font-size: calc(24px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      line-height: 1.35;  /* keeps wrapped copy compact but readable */
      color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
    }`,
        }),
    stageWidth: 960,
  }),
);

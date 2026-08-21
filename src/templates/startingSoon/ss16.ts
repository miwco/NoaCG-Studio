// ss16 'Frost Sign-off' - the glass end card: a translucent keylined panel and a soft rule.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';
import { signOffDesign } from './signOffShared';

export const ss16: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss16',
    category: 'starting-soon',
    name: 'Frost Sign-off',
    styleTag: 'glass',
    description:
      'A frosted end card with a logo, gracious sign-off, and optional next appointment.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Closing line', sample: 'Until we meet again' },
      { title: 'Message', sample: 'Thank you for joining us' },
      {
        title: 'Next broadcast',
        sample: 'The next session begins Friday at 20:00',
      },
    ],
    logo: 'optional',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Sign-off',
    description:
      'A translucent full-frame sign-off with soft keylines, a logo slot, and a calm next-broadcast line.',
    uicolor: '5',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    ...signOffDesign(o, {
          label: 'Frost Sign-off',
          css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
        .starting-soon-box {
          display: flex;  /* selects the layout model the composition depends on */
          flex-direction: column;  /* stacks the content in its intended reading order */
          align-items: center;  /* keeps related elements aligned as one visual unit */
          text-align: center;  /* keeps wrapped copy aligned with the composition */
          min-width: calc(680px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
          padding: calc(42px * var(--scale)) calc(66px * var(--scale));  /* gives content broadcast-safe breathing room */
          background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
          backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
          -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
          border: 1px solid rgba(255,255,255,.22);  /* draws one restrained keyline against moving video */
          border-radius: var(--panel-radius);  /* follows the family corner language */
          box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
        }
    /* The supporting voice stays subordinate while remaining broadcast-legible. */
    .starting-soon-kicker {
      margin-top: calc(17px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: 600;  /* separates this voice without introducing another typeface */
      letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
      color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The primary line carries the strongest type scale because it is the viewer's first read. */
    .starting-soon-message {
      margin-top: calc(13px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(70px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
      line-height: 1.06;  /* keeps wrapped copy compact but readable */
      letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
      color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The family accent supplies hierarchy without adding another decorative surface. */
    .starting-soon-rule {
      width: calc(96px * var(--scale));  /* fixes the authored horizontal footprint */
      height: var(--accent-weight);  /* fixes the authored vertical footprint */
      margin: calc(26px * var(--scale)) 0;  /* creates hierarchy through space instead of decoration */
      border-radius: var(--panel-radius);  /* follows the family corner language */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      box-shadow: var(--accent-glow);  /* lifts the surface without introducing another color */
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

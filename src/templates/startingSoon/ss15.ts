// ss15 'Volt Sign-off' - the sport end card: a hard slab, condensed type, and an accent rail.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';
import { signOffDesign } from './signOffShared';

export const ss15: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss15',
    category: 'starting-soon',
    name: 'Volt Sign-off',
    styleTag: 'sport',
    description:
      'A hard-edged end card with a logo, bold sign-off, and the next fixture line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Closing line', sample: 'FULL TIME' },
      { title: 'Message', sample: 'THANKS FOR WATCHING' },
      { title: 'Next broadcast', sample: 'NEXT MATCH - SATURDAY 18:00' },
    ],
    logo: 'optional',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Sign-off',
    description:
      'A sport full-frame sign-off with a hard slab, accent label, logo slot, and condensed next fixture line.',
    uicolor: '1',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    ...signOffDesign(o, {
          label: 'Volt Sign-off',
          css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
        .starting-soon-box {
          display: flex;  /* selects the layout model the composition depends on */
          flex-direction: column;  /* stacks the content in its intended reading order */
          align-items: center;  /* keeps related elements aligned as one visual unit */
          text-align: center;  /* keeps wrapped copy aligned with the composition */
          min-width: calc(700px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
          padding: calc(36px * var(--scale)) calc(64px * var(--scale));  /* gives content broadcast-safe breathing room */
          background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
          border-left: var(--accent-weight) solid var(--accent);  /* separates blocks without adding another panel */
          border-right: var(--accent-weight) solid var(--accent);  /* balances the hard sport frame */
          box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
        }
    /* The supporting voice stays subordinate while remaining broadcast-legible. */
    .starting-soon-kicker {
      display: inline-block;  /* selects the layout model the composition depends on */
      margin-top: calc(15px * var(--scale));  /* separates this voice from the one above it */
      padding: calc(5px * var(--scale)) calc(14px * var(--scale));  /* gives content broadcast-safe breathing room */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: 700;  /* separates this voice without introducing another typeface */
      letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
      text-transform: uppercase;  /* normalizes the label register regardless of input case */
      color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
    }
    /* The primary line carries the strongest type scale because it is the viewer's first read. */
    .starting-soon-message {
      margin-top: calc(13px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(78px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
      line-height: .98;  /* keeps wrapped copy compact but readable */
      letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
      text-transform: uppercase;  /* normalizes the label register regardless of input case */
      color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The family accent supplies hierarchy without adding another decorative surface. */
    .starting-soon-rule {
      width: calc(140px * var(--scale));  /* fixes the authored horizontal footprint */
      height: calc(8px * var(--scale));  /* fixes the authored vertical footprint */
      margin: calc(24px * var(--scale)) 0;  /* creates hierarchy through space instead of decoration */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      will-change: transform;  /* hints the exact property the entrance animates */
    }
    /* The supporting line stays secondary but above the broadcast readability floor. */
    .starting-soon-next {
      font-size: calc(25px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: 600;  /* separates this voice without introducing another typeface */
      letter-spacing: .06em;  /* uses tracking to reinforce the family voice */
      text-transform: uppercase;  /* normalizes the label register regardless of input case */
      color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
    }`,
        }),
    stageWidth: 960,
  }),
);

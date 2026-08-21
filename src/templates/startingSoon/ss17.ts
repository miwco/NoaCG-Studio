// ss17 'House Sign-off' - the NoaCG sign-off designed for the new four-field type. ss09 stays
// untouched because its three-field, logo-free contract does not clear the promotion gates.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';
import { signOffDesign } from './signOffShared';

export const ss17: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss17',
    category: 'starting-soon',
    name: 'House Sign-off',
    styleTag: 'noacg',
    description:
      'The house end card with a logo, closing line, thank-you message, and next appointment.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Closing line', sample: 'UNTIL NEXT TIME' },
      { title: 'Message', sample: 'Thanks for watching' },
      { title: 'Next broadcast', sample: 'Back Thursday at 19:00' },
    ],
    logo: 'optional',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Sign-off',
    description:
      'The NoaCG full-frame sign-off: logo and mono closing line over a display message, amber rule, and next appointment.',
    uicolor: '4',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    ...signOffDesign(o, {
          label: 'House Sign-off',
          css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
        .starting-soon-box {
          display: flex;  /* selects the layout model the composition depends on */
          flex-direction: column;  /* stacks the content in its intended reading order */
          align-items: center;  /* keeps related elements aligned as one visual unit */
          text-align: center;  /* keeps wrapped copy aligned with the composition */
          min-width: calc(680px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
          padding: calc(40px * var(--scale)) calc(68px * var(--scale));  /* gives content broadcast-safe breathing room */
          background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
          backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
          -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
          border-top: var(--accent-weight) solid var(--accent);  /* uses the family accent as the single structural edge */
          box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
        }
    /* The supporting voice stays subordinate while remaining broadcast-legible. */
    .starting-soon-kicker {
      margin-top: calc(16px * var(--scale));  /* separates this voice from the one above it */
      font-family: var(--font-label);  /* uses the designated voice for this kind of information */
      font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: 600;  /* separates this voice without introducing another typeface */
      letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
      text-transform: uppercase;  /* normalizes the label register regardless of input case */
      color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The primary line carries the strongest type scale because it is the viewer's first read. */
    .starting-soon-message {
      margin-top: calc(13px * var(--scale));  /* separates this voice from the one above it */
      font-size: calc(72px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
      font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
      line-height: 1.05;  /* keeps wrapped copy compact but readable */
      letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
      color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
    }
    /* The family accent supplies hierarchy without adding another decorative surface. */
    .starting-soon-rule {
      width: calc(100px * var(--scale));  /* fixes the authored horizontal footprint */
      height: var(--accent-weight);  /* fixes the authored vertical footprint */
      margin: calc(26px * var(--scale)) 0;  /* creates hierarchy through space instead of decoration */
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

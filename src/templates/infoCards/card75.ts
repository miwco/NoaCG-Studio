// card75 'Frost Offer' - the glass offer card. A translucent keylined panel keeps the claim
// premium, while the code remains readable on a restrained accent fill.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card75: TemplateVariant = defineCardVariant(
  {
    id: 'card75',
    category: 'info-card',
    name: 'Frost Offer',
    styleTag: 'glass',
    description:
      'A frosted offer panel with a luminous claim, outlined code chip, and deadline.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Kicker', sample: 'Private preview' },
      { title: 'Offer', sample: '20% off' },
      { title: 'Detail', sample: 'The new studio collection' },
      { title: 'Code', sample: 'PREVIEW20' },
      { title: 'Ends', sample: 'Through midnight' },
    ],
    logo: 'none',
    animationPresets: [
      'pop-spring',
      'blur-in',
      'slide-up',
      'fade',
      'slide-down',
      'flip-3d',
    ],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-right',
  },
  {
    name: 'Frost Offer',
    description:
      'A soft glass offer card with a keyline, sentence-case copy, and an outlined promo code that never sacrifices contrast.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Offer: frosted panel / kicker / claim / terms / footer. -->
    <div class="info-card-box"><div class="info-card-accent"></div>${maskLines([
      maskLine('info-card', o, 0, 'info-card-kicker', '      '),
      maskLine('info-card', o, 1, 'info-card-claim', '      '),
      maskLine('info-card', o, 2, 'info-card-terms', '      '),
      `<div class="info-card-offer-foot">${maskLines([
        maskLine('info-card', o, 3, 'info-card-code', '        '),
        maskLine('info-card', o, 4, 'info-card-ends', '        '),
      ])}</div>`,
    ])}</div>`,
    css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
    .info-card-box {
      min-width: calc(560px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
      padding: calc(32px * var(--scale)) calc(40px * var(--scale));  /* gives content broadcast-safe breathing room */
      background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
      backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
      -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
      border: 1px solid rgba(255,255,255,.22);  /* draws one restrained keyline against moving video */
      border-radius: var(--panel-radius);  /* follows the family corner language */
      box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
    }
/* The family accent supplies hierarchy without adding another decorative surface. */
.info-card-accent {
  width: calc(70px * var(--scale));  /* fixes the authored horizontal footprint */
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  margin-bottom: calc(17px * var(--scale));  /* preserves the authored hierarchy and fixed broadcast footprint */
  border-radius: var(--panel-radius);  /* follows the family corner language */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  box-shadow: var(--accent-glow);  /* lifts the surface without introducing another color */
  transform-origin: left;  /* makes the preset reveal grow from the structural edge */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-kicker {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
}
/* The primary line carries the strongest type scale because it is the viewer's first read. */
.info-card-claim {
  margin-top: calc(7px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1.02;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-terms {
  margin-top: calc(10px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  line-height: 1.35;  /* keeps wrapped copy compact but readable */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-offer-foot {
  display: flex;  /* selects the layout model the composition depends on */
  flex-wrap: wrap;  /* lets long operator data wrap instead of overflow */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(16px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-top: calc(20px * var(--scale));  /* separates this voice from the one above it */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-code {
  padding: calc(6px * var(--scale)) calc(14px * var(--scale));  /* gives content broadcast-safe breathing room */
  border: 1px solid color-mix(in srgb, var(--accent) 72%, white);  /* draws one restrained keyline against moving video */
  border-radius: calc(var(--panel-radius) * .55);  /* follows the family corner language */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: .08em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.info-card-code:empty, .info-card-ends:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* The supporting line stays secondary but above the broadcast readability floor. */
.info-card-ends {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 770,
  }),
);

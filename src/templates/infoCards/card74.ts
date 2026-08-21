// card74 'House Offer' - the NoaCG offer card: a decisive claim on the house void panel,
// with the promo code treated as the one small accent surface.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card74: TemplateVariant = defineCardVariant(
  {
    id: 'card74',
    category: 'info-card',
    name: 'House Offer',
    styleTag: 'noacg',
    description:
      'The house offer card: a large claim, terms, promo code, and deadline on a void panel.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Kicker', sample: 'MEMBER OFFER' },
      { title: 'Offer', sample: '30% OFF' },
      { title: 'Detail', sample: 'ALL ANNUAL PLANS' },
      { title: 'Code', sample: 'ON-AIR30' },
      { title: 'Ends', sample: 'ENDS SUNDAY 23:59' },
    ],
    logo: 'none',
    animationPresets: [
      'slide-up',
      'line-reveal',
      'mask-wipe',
      'fade',
      'slide-down',
      'blur-in',
    ],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-left',
  },
  {
    name: 'House Offer',
    description:
      'A house void panel with an amber edge, mono kicker, large offer, and a compact code chip beside the deadline.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Offer: amber edge / kicker / claim / terms / footer. -->
    <div class="info-card-accent"></div><div class="info-card-box">${maskLines([
      maskLine('info-card', o, 0, 'info-card-kicker', '      '),
      maskLine('info-card', o, 1, 'info-card-claim', '      '),
      maskLine('info-card', o, 2, 'info-card-terms', '      '),
      `<div class="info-card-offer-foot">${maskLines([
        maskLine('info-card', o, 3, 'info-card-code', '        '),
        maskLine('info-card', o, 4, 'info-card-ends', '        '),
      ])}</div>`,
    ])}</div>`,
    css: `/* The single accent mark establishes hierarchy and gives the preset one clear reveal target. */
    .info-card-accent {
      position: absolute;  /* anchors the element without adding layout reflow */
      inset: 0 auto 0 0;  /* pins the authored surface to its exact slot */
      width: var(--accent-weight);  /* fixes the authored horizontal footprint */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      box-shadow: var(--accent-glow);  /* lifts the surface without introducing another color */
      transform-origin: bottom;  /* makes the preset reveal grow from the structural edge */
    }
/* The container holds the composition stable over an unpredictable programme image. */
.info-card-box {
  min-width: calc(590px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
  margin-left: var(--accent-weight);  /* clears the structural accent edge */
  padding: calc(26px * var(--scale)) calc(42px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
  backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
  -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
  box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-kicker {
  font-family: var(--font-label);  /* uses the designated voice for this kind of information */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
}
/* The primary line carries the strongest type scale because it is the viewer's first read. */
.info-card-claim {
  margin-top: calc(6px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(76px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-terms {
  margin-top: calc(9px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  line-height: 1.3;  /* keeps wrapped copy compact but readable */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-offer-foot {
  display: flex;  /* selects the layout model the composition depends on */
  flex-wrap: wrap;  /* lets long operator data wrap instead of overflow */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(17px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-top: calc(18px * var(--scale));  /* separates this voice from the one above it */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-code {
  padding: calc(6px * var(--scale)) calc(14px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  font-family: var(--font-label);  /* uses the designated voice for this kind of information */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: .08em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  white-space: nowrap;  /* protects a short atomic value from breaking */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.info-card-code:empty, .info-card-ends:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* The supporting line stays secondary but above the broadcast readability floor. */
.info-card-ends {
  font-family: var(--font-label);  /* uses the designated voice for this kind of information */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 950,
  }),
);

// card72 'Clean Product' - a minimal product card with a quiet image frame and a hairline
// price hierarchy. It keeps the same six-field product contract as card38 and card39.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card72: TemplateVariant = defineCardVariant(
  {
    id: 'card72',
    category: 'info-card',
    name: 'Clean Product',
    styleTag: 'minimal',
    description:
      'A panel-light product card: image, name, price row, and one benefit line.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Product', sample: 'Field Notes Desk Lamp' },
      { title: 'Price', sample: '€89' },
      { title: 'Was', sample: '€119' },
      { title: 'Saving', sample: 'Save 25%' },
      { title: 'Detail', sample: 'Warm dimming - five-year guarantee' },
    ],
    logo: 'none',
    animationPresets: [
      'line-reveal',
      'slide-up',
      'fade',
      'mask-wipe',
      'slide-down',
      'blur-in',
    ],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Clean Product',
    description:
      'A stripped product card with a framed shot, hairline rule, large price, and restrained supporting copy.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Clean Product: shot beside product, price row, and detail. -->
    <div class="info-card-box">
      <div class="info-card-shot"><img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" /></div>
      <div class="info-card-body">
        <div class="info-card-accent"></div>
${maskLines([
  maskLine('info-card', o, 0, 'info-card-product', '        '),
  `        <div class="info-card-price-row">${maskLines([
    maskLine('info-card', o, 1, 'info-card-price', '          '),
    maskLine('info-card', o, 2, 'info-card-was', '          '),
    maskLine('info-card', o, 3, 'info-card-chip', '          '),
  ])}</div>`,
  maskLine('info-card', o, 4, 'info-card-detail', '        '),
])}
      </div>
    </div>`,
    css: `/* A near-invisible scrim keeps the product legible over video. */
.info-card-box {
  display: flex;  /* selects the layout model the composition depends on */
  align-items: center;  /* keeps related elements aligned as one visual unit */
  gap: calc(28px * var(--scale));  /* sets a deliberate seam between distinct information */
  padding: calc(24px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: rgba(7, 9, 13, 0.48);  /* provides the family surface or contrast this element needs */
  border: 1px solid rgba(255, 255, 255, 0.13);  /* draws one restrained keyline against moving video */
}
/* A fixed media slot prevents asset changes from moving the surrounding copy. */
.info-card-shot {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(170px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(170px * var(--scale));  /* fixes the authored vertical footprint */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
  border-radius: calc(3px * var(--scale));  /* follows the family corner language */
}
/* The dashed placeholder makes an empty image field discoverable while authoring. */
.info-card-shot::after {
  content: '';  /* creates decoration without adding operator-facing text */
  position: absolute;  /* anchors the element without adding layout reflow */
  inset: 0;  /* pins the authored surface to its exact slot */
  border: 1px dashed rgba(255,255,255,.28);  /* draws one restrained keyline against moving video */
}
/* A loaded image replaces the authoring placeholder without changing the slot geometry. */
.info-card-shot.has-image::after {
  content: none;  /* creates decoration without adding operator-facing text */
}
/* Contained asset geometry preserves the source aspect ratio and the designed footprint. */
.info-card-photo {
  width: 100%;  /* fixes the authored horizontal footprint */
  height: 100%;  /* fixes the authored vertical footprint */
  object-fit: cover;  /* preserves the source aspect ratio inside the fixed slot */
  display: block;  /* selects the layout model the composition depends on */
}
/* The flexible content column may wrap without widening the complete graphic. */
.info-card-body {
  min-width: 0;  /* reserves the footprint needed by doubled-text stress */
}
/* The family accent supplies hierarchy without adding another decorative surface. */
.info-card-accent {
  width: calc(72px * var(--scale));  /* fixes the authored horizontal footprint */
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  margin-bottom: calc(12px * var(--scale));  /* preserves the authored hierarchy and fixed broadcast footprint */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  transform-origin: left;  /* makes the preset reveal grow from the structural edge */
}
/* The primary line carries the strongest type scale because it is the viewer's first read. */
.info-card-product {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1.14;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* Shared alignment keeps related values on one readable visual baseline. */
.info-card-price-row {
  display: flex;  /* selects the layout model the composition depends on */
  flex-wrap: wrap;  /* lets long operator data wrap instead of overflow */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(15px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-top: calc(12px * var(--scale));  /* separates this voice from the one above it */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.info-card-price {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-was {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  text-decoration: line-through;  /* communicates the previous value without extra copy */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-chip {
  padding: calc(4px * var(--scale)) calc(10px * var(--scale));  /* gives content broadcast-safe breathing room */
  border: 1px solid var(--accent);  /* draws one restrained keyline against moving video */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.info-card-chip:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* The supporting line stays secondary but above the broadcast readability floor. */
.info-card-detail {
  margin-top: calc(13px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  line-height: 1.35;  /* keeps wrapped copy compact but readable */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'Product image',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);

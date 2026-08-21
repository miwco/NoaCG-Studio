// card73 'Volt Product' - the sport product card: hard edges, a filled slab, and a price
// block built to read instantly during a fast live-commerce segment.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card73: TemplateVariant = defineCardVariant(
  {
    id: 'card73',
    category: 'info-card',
    name: 'Volt Product',
    styleTag: 'sport',
    description:
      'A hard-edged product slab with a large price, saving chip, and square product shot.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Product', sample: 'MATCHDAY PRO JACKET' },
      { title: 'Price', sample: '€129' },
      { title: 'Was', sample: '€179' },
      { title: 'Saving', sample: 'SAVE 28%' },
      { title: 'Detail', sample: 'WATERPROOF - CLUB DELIVERY INCLUDED' },
    ],
    logo: 'none',
    animationPresets: [
      'snap-stinger',
      'mask-wipe',
      'slide-left',
      'fade',
      'slide-up',
      'flip-3d',
    ],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Volt Product',
    description:
      'A sport slab with a square product shot, condensed product name, and an accent-backed price row.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Product: shot / hard-edged product slab. -->
    <div class="info-card-accent"></div><div class="info-card-box">
      <div class="info-card-shot"><img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" /></div>
      <div class="info-card-body">${maskLines([
        maskLine('info-card', o, 0, 'info-card-product', '        '),
        `<div class="info-card-price-row">${maskLines([
          maskLine('info-card', o, 1, 'info-card-price', '          '),
          maskLine('info-card', o, 2, 'info-card-was', '          '),
          maskLine('info-card', o, 3, 'info-card-chip', '          '),
        ])}</div>`,
        maskLine('info-card', o, 4, 'info-card-detail', '        '),
      ])}</div>
    </div>`,
    css: `/* The single accent mark establishes hierarchy and gives the preset one clear reveal target. */
    .info-card-accent {
      position: absolute;  /* anchors the element without adding layout reflow */
      inset: 0 auto 0 0;  /* pins the authored surface to its exact slot */
      width: var(--accent-weight);  /* fixes the authored horizontal footprint */
      background: var(--accent);  /* provides the family surface or contrast this element needs */
      transform-origin: bottom;  /* makes the preset reveal grow from the structural edge */
    }
/* The container holds the composition stable over an unpredictable programme image. */
.info-card-box {
  display: flex;  /* selects the layout model the composition depends on */
  align-items: stretch;  /* keeps related elements aligned as one visual unit */
  gap: calc(28px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-left: var(--accent-weight);  /* clears the structural accent edge */
  padding: calc(22px * var(--scale)) calc(34px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
  box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
}
/* A fixed media slot prevents asset changes from moving the surrounding copy. */
.info-card-shot {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(168px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(168px * var(--scale));  /* fixes the authored vertical footprint */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
  border: calc(4px * var(--scale)) solid var(--accent);  /* draws one restrained keyline against moving video */
}
/* The dashed placeholder makes an empty image field discoverable while authoring. */
.info-card-shot::after {
  content: '';  /* creates decoration without adding operator-facing text */
  position: absolute;  /* anchors the element without adding layout reflow */
  inset: 0;  /* pins the authored surface to its exact slot */
  border: 1px dashed rgba(255,255,255,.3);  /* draws one restrained keyline against moving video */
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
  align-self: center;  /* places this block on the intended cross-axis */
}
/* The primary line carries the strongest type scale because it is the viewer's first read. */
.info-card-product {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
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
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.info-card-was {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  text-decoration: line-through;  /* communicates the previous value without extra copy */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-chip {
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
  font-weight: 600;  /* separates this voice without introducing another typeface */
  letter-spacing: .04em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
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

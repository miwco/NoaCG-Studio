// card76 'Volt Listing' - the sport listing card, built as a hard-edged image and value slab.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card76: TemplateVariant = defineCardVariant(
  {
    id: 'card76',
    category: 'info-card',
    name: 'Volt Listing',
    styleTag: 'sport',
    description:
      'A sport listing slab: photo and title beside a high-impact labelled value.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'LOT 18 - SIGNED FINAL SHIRT' },
      { title: 'Meta', sample: '2026 FINAL - PLAYER WORN' },
      { title: 'Value label', sample: 'CURRENT BID' },
      { title: 'Value', sample: '€2,400' },
      { title: 'Status', sample: 'BIDDING OPEN' },
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
    name: 'Volt Listing',
    description:
      'A hard sport slab with a framed image, condensed listing copy, and an accent-filled value block.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Listing: photo / listing copy / value slab. -->
    <div class="info-card-box"><div class="info-card-shot"><img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" /></div>
      <div class="info-card-body">${maskLines([
        maskLine('info-card', o, 0, 'info-card-listing-title', '        '),
        maskLine('info-card', o, 1, 'info-card-meta', '        '),
        maskLine('info-card', o, 4, 'info-card-status', '        '),
      ])}</div>
      ${
        o.lines[2] || o.lines[3]
          ? `<div class="info-card-value-block">${maskLines([
              maskLine('info-card', o, 2, 'info-card-value-label', '        '),
              maskLine('info-card', o, 3, 'info-card-value', '        '),
            ])}</div>`
          : ''
      }
    </div>`,
    css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
    .info-card-box {
      display: flex;  /* selects the layout model the composition depends on */
      align-items: stretch;  /* keeps related elements aligned as one visual unit */
      gap: calc(27px * var(--scale));  /* sets a deliberate seam between distinct information */
      padding: calc(22px * var(--scale));  /* gives content broadcast-safe breathing room */
      background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
      border-left: var(--accent-weight) solid var(--accent);  /* separates blocks without adding another panel */
      box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
    }
/* A fixed media slot prevents asset changes from moving the surrounding copy. */
.info-card-shot {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(190px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(143px * var(--scale));  /* fixes the authored vertical footprint */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
  border: calc(3px * var(--scale)) solid var(--accent);  /* draws one restrained keyline against moving video */
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
.info-card-listing-title {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-meta {
  margin-top: calc(8px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  letter-spacing: .04em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-status {
  display: inline-block;  /* selects the layout model the composition depends on */
  margin-top: calc(11px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.info-card-status:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.info-card-value-block {
  flex: none;  /* protects the intended share of available space */
  align-self: stretch;  /* places this block on the intended cross-axis */
  min-width: calc(230px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
  padding: calc(18px * var(--scale)) calc(22px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  display: flex;  /* selects the layout model the composition depends on */
  flex-direction: column;  /* stacks the content in its intended reading order */
  justify-content: center;  /* distributes the authored negative space predictably */
  text-align: right;  /* keeps wrapped copy aligned with the composition */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.info-card-value-label {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}
/* The live figure gets a deliberate numeric voice without changing the surrounding hierarchy. */
.info-card-value {
  margin-top: calc(4px * var(--scale));  /* separates this voice from the one above it */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(57px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: false,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'Photo',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);

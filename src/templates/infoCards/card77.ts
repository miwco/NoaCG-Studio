// card77 'Frost Listing' - the glass listing card: one translucent keylined surface with a
// softly separated value column.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card77: TemplateVariant = defineCardVariant(
  {
    id: 'card77',
    category: 'info-card',
    name: 'Frost Listing',
    styleTag: 'glass',
    description:
      'A frosted listing card: photo and title beside a softly separated live value.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'Harbour Loft, West Quay' },
      { title: 'Meta', sample: '2 bedrooms - 104 m² - sea view' },
      { title: 'Value label', sample: 'Guide price' },
      { title: 'Value', sample: '£575,000' },
      { title: 'Status', sample: 'Private viewing' },
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
    defaultZone: 'bottom-right',
  },
  {
    name: 'Frost Listing',
    description:
      'A translucent keylined listing surface with rounded image framing and a softly tinted value column.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Listing: photo / listing copy / value panel. -->
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
      align-items: center;  /* keeps related elements aligned as one visual unit */
      gap: calc(28px * var(--scale));  /* sets a deliberate seam between distinct information */
      padding: calc(25px * var(--scale));  /* gives content broadcast-safe breathing room */
      background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
      backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
      -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
      border: 1px solid rgba(255,255,255,.22);  /* draws one restrained keyline against moving video */
      border-radius: var(--panel-radius);  /* follows the family corner language */
      box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
    }
/* A fixed media slot prevents asset changes from moving the surrounding copy. */
.info-card-shot {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(185px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(139px * var(--scale));  /* fixes the authored vertical footprint */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
  border-radius: calc(var(--panel-radius) * .7);  /* follows the family corner language */
}
/* The dashed placeholder makes an empty image field discoverable while authoring. */
.info-card-shot::after {
  content: '';  /* creates decoration without adding operator-facing text */
  position: absolute;  /* anchors the element without adding layout reflow */
  inset: 0;  /* pins the authored surface to its exact slot */
  border: 1px dashed rgba(255,255,255,.3);  /* draws one restrained keyline against moving video */
  border-radius: inherit;  /* follows the family corner language */
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
  flex: 1 1 auto;  /* protects the intended share of available space */
}
/* The primary line carries the strongest type scale because it is the viewer's first read. */
.info-card-listing-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1.12;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-meta {
  margin-top: calc(8px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  line-height: 1.3;  /* keeps wrapped copy compact but readable */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.info-card-status {
  display: inline-block;  /* selects the layout model the composition depends on */
  margin-top: calc(11px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.info-card-status:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.info-card-value-block {
  flex: none;  /* protects the intended share of available space */
  padding: calc(18px * var(--scale)) calc(22px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: rgba(255,255,255,.08);  /* provides the family surface or contrast this element needs */
  border: 1px solid rgba(255,255,255,.16);  /* draws one restrained keyline against moving video */
  border-radius: calc(var(--panel-radius) * .7);  /* follows the family corner language */
  text-align: right;  /* keeps wrapped copy aligned with the composition */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.info-card-value-label {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* The live figure gets a deliberate numeric voice without changing the surrounding hierarchy. */
.info-card-value {
  margin-top: calc(4px * var(--scale));  /* separates this voice from the one above it */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(53px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
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

// card79 'Frost Scan' - the glass QR card. The surrounding panel is translucent, while the
// code itself remains on an opaque white tile with fixed padding for scannability.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card79: TemplateVariant = defineCardVariant(
  {
    id: 'card79',
    category: 'info-card',
    name: 'Frost Scan',
    styleTag: 'glass',
    description:
      'A frosted QR card with a protected white code tile, headline, and readable address.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Continue the story' },
      { title: 'Address', sample: 'frost.media/aftershow' },
      { title: 'Detail', sample: 'Interviews and the full gallery' },
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
    name: 'Frost Scan',
    description:
      'A translucent keylined QR card whose opaque white quiet-zone tile remains isolated from the family tint.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Scan: protected QR tile beside a frosted copy panel. -->
    <div class="info-card-box"><div class="info-card-qr"><img id="${designFieldId(o)}" class="info-card-qr-image" style="display: none" alt="" /></div>
      <div class="info-card-body"><div class="info-card-accent"></div>${maskLines(
        [
          maskLine('info-card', o, 0, 'info-card-scan-head', '        '),
          maskLine('info-card', o, 1, 'info-card-url', '        '),
          maskLine('info-card', o, 2, 'info-card-detail', '        '),
        ],
      )}</div>
    </div>`,
    css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
    .info-card-box {
      display: flex;  /* selects the layout model the composition depends on */
      align-items: center;  /* keeps related elements aligned as one visual unit */
      gap: calc(27px * var(--scale));  /* sets a deliberate seam between distinct information */
      padding: calc(24px * var(--scale));  /* gives content broadcast-safe breathing room */
      background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
      backdrop-filter: var(--panel-blur);  /* keeps programme detail visible through the glass surface */
      -webkit-backdrop-filter: var(--panel-blur);  /* preserves the same glass treatment in Safari */
      border: 1px solid rgba(255,255,255,.22);  /* draws one restrained keyline against moving video */
      border-radius: var(--panel-radius);  /* follows the family corner language */
      box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
    }
/* Scannability contract: themed glass never reaches this opaque, padded white tile. */
.info-card-qr {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(166px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(166px * var(--scale));  /* fixes the authored vertical footprint */
  padding: calc(13px * var(--scale));  /* gives content broadcast-safe breathing room */
  border-radius: calc(var(--panel-radius) * .6);  /* follows the family corner language */
  background: #ffffff;  /* provides the family surface or contrast this element needs */
  box-shadow: 0 8px 28px rgba(0,0,0,.28);  /* lifts the surface without introducing another color */
}
/* The dashed placeholder makes an empty image field discoverable while authoring. */
.info-card-qr::after {
  content: '';  /* creates decoration without adding operator-facing text */
  position: absolute;  /* anchors the element without adding layout reflow */
  inset: calc(13px * var(--scale));  /* pins the authored surface to its exact slot */
  border: 1px dashed rgba(8,10,14,.35);  /* draws one restrained keyline against moving video */
}
/* A loaded image replaces the authoring placeholder without changing the slot geometry. */
.info-card-qr.has-image::after {
  content: none;  /* creates decoration without adding operator-facing text */
}
/* A fixed media slot prevents asset changes from moving the surrounding copy. */
.info-card-qr-image {
  width: 100%;  /* fixes the authored horizontal footprint */
  height: 100%;  /* fixes the authored vertical footprint */
  object-fit: contain;  /* preserves the source aspect ratio inside the fixed slot */
  display: block;  /* selects the layout model the composition depends on */
}
/* The flexible content column may wrap without widening the complete graphic. */
.info-card-body {
  min-width: 0;  /* reserves the footprint needed by doubled-text stress */
}
/* The family accent supplies hierarchy without adding another decorative surface. */
.info-card-accent {
  width: calc(60px * var(--scale));  /* fixes the authored horizontal footprint */
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  margin-bottom: calc(13px * var(--scale));  /* preserves the authored hierarchy and fixed broadcast footprint */
  border-radius: var(--panel-radius);  /* follows the family corner language */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  box-shadow: var(--accent-glow);  /* lifts the surface without introducing another color */
  transform-origin: left;  /* makes the preset reveal grow from the structural edge */
}
/* Shared alignment keeps related values on one readable visual baseline. */
.info-card-scan-head {
  font-size: calc(39px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1.1;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-url {
  margin-top: calc(9px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1.25;  /* keeps wrapped copy compact but readable */
  overflow-wrap: anywhere;  /* breaks hostile operator text before it escapes */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting line stays secondary but above the broadcast readability floor. */
.info-card-detail {
  margin-top: calc(9px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  line-height: 1.35;  /* keeps wrapped copy compact but readable */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 970,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'QR image',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);

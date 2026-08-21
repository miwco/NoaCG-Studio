// card78 'Volt Scan' - the sport QR card. The hard slab surrounds, but never recolors or
// crowds, the white padded tile required for reliable scanning.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card78: TemplateVariant = defineCardVariant(
  {
    id: 'card78',
    category: 'info-card',
    name: 'Volt Scan',
    styleTag: 'sport',
    description:
      'A hard-edged QR slab with a protected white tile, headline, and written address.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'SCAN FOR TICKETS' },
      { title: 'Address', sample: 'voltafc.com/final' },
      { title: 'Detail', sample: 'FINAL RELEASE - LIMITED SEATS' },
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
    defaultZone: 'bottom-right',
  },
  {
    name: 'Volt Scan',
    description:
      'A sport QR slab with a protected white quiet-zone tile and a high-impact address block.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Scan: scannable white tile beside a hard-edged copy slab. -->
    <div class="info-card-accent"></div><div class="info-card-box">
      <div class="info-card-qr"><img id="${designFieldId(o)}" class="info-card-qr-image" style="display: none" alt="" /></div>
      <div class="info-card-body">${maskLines([
        maskLine('info-card', o, 0, 'info-card-scan-head', '        '),
        maskLine('info-card', o, 1, 'info-card-url', '        '),
        maskLine('info-card', o, 2, 'info-card-detail', '        '),
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
  align-items: center;  /* keeps related elements aligned as one visual unit */
  gap: calc(27px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-left: var(--accent-weight);  /* clears the structural accent edge */
  padding: calc(22px * var(--scale)) calc(34px * var(--scale)) calc(22px * var(--scale)) calc(22px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
  box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
}
/* Scannability contract: white, square, undistorted, with a real quiet zone. */
.info-card-qr {
  position: relative;  /* anchors the element without adding layout reflow */
  flex: none;  /* protects the intended share of available space */
  width: calc(166px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(166px * var(--scale));  /* fixes the authored vertical footprint */
  padding: calc(13px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: #ffffff;  /* provides the family surface or contrast this element needs */
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
/* Shared alignment keeps related values on one readable visual baseline. */
.info-card-scan-head {
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.info-card-url {
  display: inline-block;  /* selects the layout model the composition depends on */
  margin-top: calc(10px * var(--scale));  /* separates this voice from the one above it */
  padding: calc(5px * var(--scale)) calc(12px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: .03em;  /* uses tracking to reinforce the family voice */
  overflow-wrap: anywhere;  /* breaks hostile operator text before it escapes */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}
/* The supporting line stays secondary but above the broadcast readability floor. */
.info-card-detail {
  margin-top: calc(11px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  letter-spacing: .05em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 800,
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

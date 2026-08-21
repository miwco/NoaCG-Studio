// mr05 "Clean Maps" - the minimal map indicator, sibling of lt01 Hairline and es04 Clean
// Series. The sequence is a panel-free ladder of hairline rows; the current map takes one
// accent rule. The same rows, cursor runtime and completed state serve every map-round design.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  MAP_FIELDS,
  MAP_RUNTIME_JS,
  P,
  defineEsportsVariant,
  mapMarkup,
  mapStructureCss,
} from './shared';

export const mr05: TemplateVariant = defineEsportsVariant(
  {
    id: 'mr05',
    category: 'esports-score',
    name: 'Clean Maps',
    styleTag: 'minimal',
    description: 'A panel-free map ladder with hairline rows and a quiet live-map cursor.',
    maxLines: 1,
    suggestedLines: [{ title: 'Series title', sample: 'BEST OF 5 · GRAND FINAL' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-right',
  },
  {
    name: 'Clean Maps',
    description:
      'The minimal map indicator: no panel, a hairline beneath the series title, ruled map ' +
      'rows, and one accent edge identifying the map currently in play.',
    uicolor: '7',
  },
  (o) => ({
    html: mapMarkup(o),
    fields: compFieldsFor(MAP_FIELDS, o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 600,
    runtimeExtraJs: MAP_RUNTIME_JS,
    css: `${mapStructureCss()}

/* No panel - a compact ladder of type over a soft legibility scrim. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(17px * var(--scale));
  min-width: calc(450px * var(--scale));
  padding: calc(18px * var(--scale)) calc(22px * var(--scale));
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.38) 0%,
    rgba(6, 8, 12, 0.66) 100%);
}

/* The accent - a hairline between title and map sequence. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: left center;
}

/* The series title. */
.${P}-title {
  font-size: calc(25px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* One map row - a hairline beneath, with room for the live cursor. */
.${P}-row {
  position: relative;
  padding: calc(9px * var(--scale)) calc(12px * var(--scale));
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

/* The map number. */
.${P}-row-index {
  min-width: calc(28px * var(--scale));
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-numeric);
}

/* The map name. */
.${P}-row-map {
  font-size: calc(23px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  color: var(--text-color);
}

/* The winner mark. */
.${P}-row-mark {
  min-width: calc(70px * var(--scale));
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  color: var(--accent);
}

/* Unplayed maps fall back; side B remains neutral when settled. */
.${P}-open {
  opacity: 0.5;
}
.${P}-open .${P}-row-mark {
  color: var(--text-dim);
}
.${P}-won-b .${P}-row-mark {
  color: var(--text-color);
}

/* The live map keeps full contrast and takes the accent rule on its reading edge. */
.${P}-current {
  opacity: 1;
  border-bottom-color: var(--accent);
}
.${P}-current::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--accent-weight);
  background: var(--accent);
}

/* Decided - unused maps fall farther back and the cursor settles to the text colour. */
.${P}-decided .${P}-open {
  opacity: 0.22;
}
.${P}-decided .${P}-current::before {
  background: var(--text-color);
}`,
  }),
);

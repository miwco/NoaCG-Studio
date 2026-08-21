// br04 "Frost Bracket" - the glass knockout tree, sibling of lt08 Frosted Card. The rounds
// sit inside one frosted board and every tie is a softly-keylined tile; the live round and
// champion use an accent ring. Runtime, fields and machine remain those of the bracket type.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  BRACKET_FIELDS,
  BRACKET_RUNTIME_JS,
  P,
  boardStructureCss,
  bracketBodyCss,
  bracketMarkup,
  defineResultsVariant,
} from './shared';

export const br04: TemplateVariant = defineResultsVariant(
  {
    id: 'br04',
    category: 'results-board',
    name: 'Frost Bracket',
    styleTag: 'glass',
    description: 'A frosted knockout tree with glass ties and an accent-ringed live round.',
    maxLines: 1,
    suggestedLines: [{ title: 'Title', sample: 'PLAYOFF BRACKET' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Bracket',
    description:
      'The glass playoff bracket: one frosted board, softly-rounded tie tiles, a luminous ' +
      'cursor on the live round, and an accent-ringed final once a champion is crowned.',
    uicolor: '2',
  },
  (o) => ({
    html: bracketMarkup(o),
    fields: compFieldsFor(BRACKET_FIELDS, o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1000,
    runtimeExtraJs: BRACKET_RUNTIME_JS,
    css: `${boardStructureCss()}

${bracketBodyCss()}

/* The board - one frosted surface wide enough for the complete tree. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(20px * var(--scale));
  min-width: calc(1000px * var(--scale));
  padding: calc(28px * var(--scale)) calc(33px * var(--scale)) calc(33px * var(--scale));
  border-radius: var(--panel-radius);
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent - a soft gradient rule under the title. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 85%, transparent),
    color-mix(in srgb, var(--accent) 10%, transparent));
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The champion appears as an accent-filled pill with the family's opaque ink. */
.${P}-champion {
  padding: calc(7px * var(--scale)) calc(18px * var(--scale));
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

/* Round labels carry the glass family's tracked label voice. */
.${P}-round-name {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* Each tie is a softly-rounded tile inside the main panel. */
.${P}-tie {
  padding: calc(10px * var(--scale)) calc(16px * var(--scale));
  border-radius: calc(14px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.${P}-tie-side {
  font-size: calc(23px * var(--scale) * var(--type-scale));
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-numeric);
}

.${P}-tie-side + .${P}-tie-side {
  color: var(--text-dim);
}

/* The live round brightens and its ties take the accent ring. */
.${P}-round-on .${P}-round-name {
  color: var(--accent);
}

.${P}-round-on .${P}-tie {
  background: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Crowned - earlier rounds fall back and the final ring remains. */
.${P}-crowned .${P}-round:not(:last-child) {
  opacity: 0.42;
}

.${P}-crowned .${P}-round:last-child .${P}-tie {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}`,
  }),
);

// br03 "Clean Bracket" - the minimal knockout tree, sibling of lt01 Hairline. The tree is
// type and hairline rules over a soft scrim; the live round takes the accent without becoming
// a filled tile. The bracket data, grouping runtime and machine are unchanged.

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

export const br03: TemplateVariant = defineResultsVariant(
  {
    id: 'br03',
    category: 'results-board',
    name: 'Clean Bracket',
    styleTag: 'minimal',
    description: 'A panel-free knockout tree with hairline ties and a quiet live-round cursor.',
    maxLines: 1,
    suggestedLines: [{ title: 'Title', sample: 'PLAYOFF BRACKET' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Bracket',
    description:
      'The minimal playoff bracket: a soft scrim, round columns drawn with hairline ties, ' +
      'an accent cursor on the live round, and a restrained champion label.',
    uicolor: '7',
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

/* No panel - whitespace and a soft scrim keep the tree legible over video. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(20px * var(--scale));
  min-width: calc(1000px * var(--scale));
  padding: calc(18px * var(--scale)) calc(24px * var(--scale));
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.38) 0%,
    rgba(6, 8, 12, 0.68) 100%);
}

/* The accent - one hairline under the title. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The champion is a typographic label rather than a filled banner. */
.${P}-champion {
  padding-bottom: calc(7px * var(--scale));
  border-bottom: var(--accent-weight) solid var(--accent);
  color: var(--accent);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

/* Round labels are small caps, quiet until their round is live. */
.${P}-round-name {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* A tie is two lines held by one hairline on the reading edge. */
.${P}-tie {
  padding: calc(9px * var(--scale)) calc(14px * var(--scale));
  border-left: var(--accent-weight) solid rgba(255, 255, 255, 0.14);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
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

/* The live round takes the accent without gaining a panel. */
.${P}-round-on .${P}-round-name {
  color: var(--accent);
}

.${P}-round-on .${P}-tie {
  border-left-color: var(--accent);
  border-bottom-color: color-mix(in srgb, var(--accent) 55%, transparent);
}

/* Once crowned, the path to the final falls back and the last tie keeps the accent rule. */
.${P}-crowned .${P}-round:not(:last-child) {
  opacity: 0.45;
}

.${P}-crowned .${P}-round:last-child .${P}-tie {
  border-left-color: var(--accent);
}`,
  }),
);

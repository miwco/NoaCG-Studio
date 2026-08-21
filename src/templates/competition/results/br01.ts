// br01 "Playoff Bracket" — the sport knockout tree. Every tie the operator types is grouped
// into its round column automatically (in the order the rounds first appear), so a single-
// elimination bracket of any depth is one textarea. The round being played carries an accent
// cursor, and the champion banner lands on the crown event.

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

export const br01: TemplateVariant = defineResultsVariant(
  {
    id: 'br01',
    category: 'results-board',
    name: 'Playoff Bracket',
    styleTag: 'sport',
    description: 'A knockout tree in round columns, with a cursor and a champion banner.',
    maxLines: 1,
    suggestedLines: [{ title: 'Title', sample: 'PLAYOFF BRACKET' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Playoff Bracket',
    description:
      'The sport playoff bracket: ties grouped into round columns automatically, an accent ' +
      'cursor on the round being played, and a champion banner that lands when the operator ' +
      'crowns a winner.',
    uicolor: '5',
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

/* The board — a square-cut sport panel wide enough for the tree. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(23px * var(--scale));
  padding: calc(28px * var(--scale)) calc(33px * var(--scale)) calc(33px * var(--scale));
  background: var(--panel-bg);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow);
  min-width: calc(1000px * var(--scale));  /* footprint floor — a bracket reads as a tree at a glance even with few rounds */
}

/* The accent rule under the heading. */
.${P}-accent {
  height: calc(4px * var(--scale));
  background: var(--accent);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.05;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The champion banner — empty (and so invisible) until the crown event. */
.${P}-champion {
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* One round column. */
.${P}-round-name {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* One tie: the two sides stacked, each on its own line. */
.${P}-tie {
  padding: calc(10px * var(--scale)) calc(15px * var(--scale));
  background: rgba(0, 0, 0, 0.35);
  border-left: calc(5px * var(--scale)) solid rgba(255, 255, 255, 0.12);
}

.${P}-tie-side {
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: 600;
  line-height: 1.45;
  text-transform: uppercase;
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

/* The second side of a tie reads a step quieter — a bracket is scanned, not read. */
.${P}-tie-side + .${P}-tie-side {
  color: var(--text-dim);
}

/* ── The cursor and the crown (machine states, never data writes). ── */

/* The round being played: its label takes the accent and its ties the accent edge. */
.${P}-round-on .${P}-round-name {
  color: var(--accent);
}

.${P}-round-on .${P}-tie {
  background: rgba(0, 0, 0, 0.55);
  border-left-color: var(--accent);
}

/* Crowned — every round that is not the last falls back, so the final tie is the picture. */
.${P}-crowned .${P}-round:not(:last-child) {
  opacity: 0.5;
}`,
  }),
);

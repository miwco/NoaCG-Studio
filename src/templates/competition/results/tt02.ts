// tt02 "House Timing" — the NoaCG tower, sibling of st02 House Standings and rs02 House
// Roster. Void rows, mono positions and times, an amber top edge, and an amber keyline on the
// competitor in focus.
//
// Its sample is a QUALIFYING session rather than a race, because the type's second field is
// what the time column means: change it to "BEST LAP" and the same tower reads lap times
// instead of gaps, with nothing else touched. That is the whole argument for one type here.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  TIMING_RUNTIME_JS,
  boardStructureCss,
  defineResultsVariant,
  timingFields,
  timingMarkup,
  towerStructureCss,
} from './shared';

/** A qualifying sheet: the SAME tower reading lap times instead of gaps, because the second
 *  field says what the time column means. Nothing else about the graphic changes. */
const ORDER = 'NOR | 1:29.348\nVER | 1:29.402\nLEC | 1:29.611\nPIA | 1:29.874\nSAI | 1:30.006 | OUT';

export const tt02: TemplateVariant = defineResultsVariant(
  {
    id: 'tt02',
    category: 'results-board',
    name: 'House Timing',
    styleTag: 'noacg',
    description: 'The house timing tower: void rows, mono times, an amber focus keyline.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Session', sample: 'QUALIFYING · Q3' },
      { title: 'What the times mean', sample: 'BEST LAP' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-left',
  },
  {
    name: 'House Timing',
    description:
      'The NoaCG timing tower: a void blur column with an amber top edge, mono positions and ' +
      'times, an amber-keylined competitor in focus, and an amber leader chip once the ' +
      'session is final.',
    uicolor: '4',
  },
  (o) => ({
    html: timingMarkup(o, ORDER),
    fields: compFieldsFor(timingFields(ORDER), o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 520,
    runtimeExtraJs: TIMING_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${boardStructureCss()}

${towerStructureCss()}

/* The tower — the house void with its amber top edge. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--scale));
  padding: calc(20px * var(--scale)) calc(22px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow);
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The accent rule between the heading and the order. */
.${P}-accent {
  height: calc(3px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(32px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* One row — a denser void tile. */
.${P}-row {
  position: relative;
  padding: calc(7px * var(--scale)) calc(12px * var(--scale));
  border-radius: calc(8px * var(--scale));
  background: rgba(10, 12, 16, 0.5);
}

/* The position — mono, amber, in a keylined square rather than a filled chip. */
.${P}-row-index {
  width: calc(42px * var(--scale));
  height: calc(42px * var(--scale));
  border-radius: calc(6px * var(--scale));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);
  font-family: var(--font-label);
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 500;
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

/* The times are mono here — a column of lap times is read digit by digit. */
.${P}-row-time {
  font-family: var(--font-label);
  font-size: calc(25px * var(--scale) * var(--type-scale));
  font-weight: 500;
  color: var(--text-dim);
}

.${P}-row-lead .${P}-row-time {
  color: var(--accent);
}

.${P}-row-tag {
  padding: calc(2px * var(--scale)) calc(8px * var(--scale));
  border-radius: calc(4px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

.${P}-row-gone {
  opacity: 0.45;
}

/* ── The focus and the flag (machine states, never data writes). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.42;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(10, 12, 16, 0.78);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}

.${P}-row-on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(5px * var(--scale));
  border-radius: calc(8px * var(--scale)) 0 0 calc(8px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
}

/* FINAL — the leader's chip fills and the subtitle says the session is over. */
.${P}-final .${P}-row-lead .${P}-row-index {
  background: var(--accent);
  box-shadow: var(--accent-glow);
  color: var(--accent-ink);
}
.${P}-final .${P}-kicker::after {
  content: " · FINAL";
  color: var(--accent);
}`,
  }),
);

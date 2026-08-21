// tt01 "Timing Tower" — the motorsport tower, and the design the whole type is drawn around:
// a narrow column parked against one edge for a whole session, positions on square accent
// chips, three-letter codes, and the gap column reading straight down in tabular figures.
//
// Everything a viewer needs to read it at a glance is contrast, not decoration: the chips are
// the only colour, the codes are the only display type, and the row that is being talked about
// is the only one at full opacity once the caster picks one.

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

/** A race in progress: three-letter codes and the gap to the leader, one row per position. */
const ORDER = 'VER | +0.000\nNOR | +1.284\nLEC | +3.902\nHAM | +5.117\nRUS | +8.640 | PIT';

export const tt01: TemplateVariant = defineResultsVariant(
  {
    id: 'tt01',
    category: 'results-board',
    name: 'Timing Tower',
    styleTag: 'sport',
    description: 'The live running order of a timed session — position, competitor, gap.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Session', sample: 'RACE · LAP 24 / 58' },
      { title: 'What the times mean', sample: 'GAP TO LEADER' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-left',
  },
  {
    name: 'Timing Tower',
    description:
      'The motorsport timing tower: a narrow column of positions on accent chips, competitor ' +
      'codes and the gap column in tabular figures, with a focus the commentary can move down ' +
      'the field and a FINAL state for the chequered flag.',
    uicolor: '5',
  },
  (o) => ({
    html: timingMarkup(o, ORDER),
    fields: compFieldsFor(timingFields(ORDER), o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 520,
    runtimeExtraJs: TIMING_RUNTIME_JS,
    css: `${boardStructureCss()}

${towerStructureCss()}

/* The tower — a square-cut sport column, dark enough to read over any picture. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--scale));
  padding: calc(22px * var(--scale)) calc(24px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow);
}

/* The accent rule between the heading and the order. */
.${P}-accent {
  height: calc(4px * var(--scale));
  background: var(--accent);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.05;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* One row of the order. */
.${P}-row {
  padding: calc(4px * var(--scale)) 0;
}

/* The position — a square accent chip, the tower's one piece of colour. */
.${P}-row-index {
  width: calc(46px * var(--scale));
  height: calc(46px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: 700;
}

.${P}-row-name {
  font-size: calc(32px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

.${P}-row-time {
  font-size: calc(27px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
}

/* The leader's time is the one everything else is measured against. */
.${P}-row-lead .${P}-row-time {
  color: var(--text-color);
  font-weight: var(--display-weight);
}

/* The status tag — a hollow chip, so PIT never competes with the position for attention. */
.${P}-row-tag {
  padding: calc(3px * var(--scale)) calc(9px * var(--scale));
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--text-dim);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* Retired, out, disqualified — the row stays on the tower and stops claiming attention. */
.${P}-row-gone {
  opacity: 0.5;
}

/* ── The focus and the flag (machine states, never data writes). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.4;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
}

.${P}-spotlit .${P}-row-on .${P}-row-name,
.${P}-spotlit .${P}-row-on .${P}-row-time {
  color: var(--text-color);
}

/* FINAL — the flag has fallen: the leader's chip stays lit, the rest of the order goes
   quiet, and the subtitle says the order is no longer moving. */
.${P}-final .${P}-row-index {
  background: color-mix(in srgb, var(--accent) 32%, transparent);
  color: var(--text-color);
}
.${P}-final .${P}-row-lead .${P}-row-index {
  background: var(--accent);
  color: var(--accent-ink);
}
.${P}-final .${P}-kicker::after {
  content: " · FINAL";
  color: var(--accent);
}`,
  }),
);

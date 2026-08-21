// tt03 "Frost Splits" — the glass tower, written for a pool or a track: the positions sit in
// accent rings like st03's leaderboard, each row is its own frosted tile, and the time column
// carries splits rather than gaps.
//
// The sport changes and the graphic does not, which is the point of the type: a swimming
// split board, a race timing tower and a cycling gap board differ in what the second field
// SAYS the times mean, not in what the graphic is.

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

/** A swimming final at the 150m split: surnames and elapsed times, in lane order of finish. */
const ORDER = 'MCEVOY | 1:42.11\nPOPOVICI | 1:42.44\nHWANG | 1:42.90\nSCOTT | 1:43.15\nWINNINGTON | 1:43.62';

export const tt03: TemplateVariant = defineResultsVariant(
  {
    id: 'tt03',
    category: 'results-board',
    name: 'Frost Splits',
    styleTag: 'glass',
    description: 'A frosted timing column: ringed positions, frosted rows, split times.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Session', sample: '200M FREE · FINAL' },
      { title: 'What the times mean', sample: 'SPLIT AT 150M' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-left',
  },
  {
    name: 'Frost Splits',
    description:
      'A frosted timing tower: each position in an accent ring, each competitor on its own ' +
      'frosted tile, the split times in tabular figures, and an accent-ringed leader once the ' +
      'race is final.',
    uicolor: '2',
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

/* The tower — a frosted column holding frosted rows. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--scale));
  padding: calc(24px * var(--scale)) calc(24px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent — a soft rule under the heading. */
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
  font-size: calc(32px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* Each row is its own frosted tile. */
.${P}-row {
  padding: calc(9px * var(--scale)) calc(14px * var(--scale));
  border-radius: calc(18px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

/* The position sits in a ring — the frost family's signature. */
.${P}-row-index {
  width: calc(42px * var(--scale));
  height: calc(42px * var(--scale));
  border-radius: 999px;
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) color-mix(in srgb, var(--accent) 70%, transparent);
  font-size: calc(21px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

.${P}-row-time {
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
}

.${P}-row-lead .${P}-row-time {
  color: var(--text-color);
  font-weight: var(--display-weight);
}

.${P}-row-tag {
  padding: calc(2px * var(--scale)) calc(10px * var(--scale));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-color);
}

.${P}-row-gone {
  opacity: 0.45;
}

/* ── The focus and the flag (machine states, never data writes). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.45;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* FINAL — the winner's position chip fills. The ink is hard-coded dark here rather than
   taken from --accent-ink: in the glass family that token resolves to the translucent white
   panel colour, which would make the number invisible on the accent (model/themeTokens.ts). */
.${P}-final .${P}-row-lead {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}
.${P}-final .${P}-row-lead .${P}-row-index {
  background: var(--accent);
  color: #0b1016;
}
.${P}-final .${P}-kicker::after {
  content: " · FINAL";
  color: var(--accent);
}`,
  }),
);

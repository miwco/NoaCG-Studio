// tt04 "Clean Timing" — the panel-free tower: hairline rules, tabular figures, nothing boxed.
// Written for road cycling, where the tower sits over a moving helicopter shot all afternoon
// and any panel would be a hole cut in the picture. The type scrim carries the legibility.

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

/** A road stage: surnames and the gap to the race leader, one row per rider on the front. */
const ORDER = 'EVENEPOEL | LEADER\nPOGAČAR | +0:14\nVINGEGAARD | +0:22\nROGLIČ | +1:05\nAYUSO | +2:31';

export const tt04: TemplateVariant = defineResultsVariant(
  {
    id: 'tt04',
    category: 'results-board',
    name: 'Clean Timing',
    styleTag: 'minimal',
    description: 'A quiet timing column: hairline rows, tabular gaps, no panel at all.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Session', sample: 'STAGE 11 · KM 148' },
      { title: 'What the times mean', sample: 'GAP TO LEADER' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-left',
  },
  {
    name: 'Clean Timing',
    description:
      'A panel-free timing tower: hairline rules between the rows, positions in small figures, ' +
      'the gap column tabular, and the leader marked in the accent once the stage is final.',
    uicolor: '7',
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

/* No panel — a column of type over a soft scrim, so the shot behind it stays the shot. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(12px * var(--scale));
  padding: calc(5px * var(--scale)) 0 0;
  text-shadow: 0 calc(3px * var(--scale)) calc(15px * var(--scale)) rgba(0, 0, 0, 0.55);
}

/* The accent — a hairline under the heading, the tower's only rule of its own. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(31px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
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

/* One row — a hairline rule beneath, nothing else. */
.${P}-row {
  padding: calc(8px * var(--scale)) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.${P}-row-index {
  width: calc(34px * var(--scale));
  font-size: calc(21px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
}

.${P}-row-name {
  font-size: calc(29px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.14;
  color: var(--text-color);
}

.${P}-row-time {
  font-size: calc(25px * var(--scale) * var(--type-scale));
  font-weight: 500;
  color: var(--text-dim);
}

.${P}-row-lead .${P}-row-time {
  color: var(--text-color);
  font-weight: 700;
}

.${P}-row-tag {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.${P}-row-gone {
  opacity: 0.45;
}

/* ── The focus and the flag (machine states, never data writes). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.4;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  border-bottom-color: var(--accent);
}

.${P}-spotlit .${P}-row-on .${P}-row-index {
  color: var(--accent);
}

/* FINAL — the winner's rule and figures take the accent, and the subtitle says so. */
.${P}-final .${P}-row-lead {
  border-bottom-color: var(--accent);
}
.${P}-final .${P}-row-lead .${P}-row-index,
.${P}-final .${P}-row-lead .${P}-row-name {
  color: var(--accent);
}
.${P}-final .${P}-kicker::after {
  content: " · FINAL";
  color: var(--accent);
}`,
  }),
);

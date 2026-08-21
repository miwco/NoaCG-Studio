// rs05 "Frost Roster" - the glass line-up board, sibling of lt08 Frosted Card. The same
// roster rows sit on one frosted panel, with softly rounded row tiles and an accent ring on
// the player in focus. Only the look differs from the other roster designs.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  ROSTER_FIELDS,
  ROSTER_RUNTIME_JS,
  boardStructureCss,
  defineResultsVariant,
  rosterMarkup,
} from './shared';

export const rs05: TemplateVariant = defineResultsVariant(
  {
    id: 'rs05',
    category: 'results-board',
    name: 'Frost Roster',
    styleTag: 'glass',
    description: 'A frosted line-up board with rounded rows and an accent-ringed spotlight.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING LINE-UP' },
      { title: 'Team', sample: 'TEAM LIQUID' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-left',
  },
  {
    name: 'Frost Roster',
    description:
      'The glass line-up board: one frosted panel, softly-rounded player rows, and an accent ' +
      'ring that holds the player currently in focus.',
    uicolor: '2',
  },
  (o) => ({
    html: rosterMarkup(o),
    fields: compFieldsFor(ROSTER_FIELDS, o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1000,
    runtimeExtraJs: ROSTER_RUNTIME_JS,
    css: `${boardStructureCss()}

/* The board - one frosted surface wide enough to read as a line-up at a glance. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(20px * var(--scale));
  min-width: calc(1000px * var(--scale));
  padding: calc(28px * var(--scale)) calc(33px * var(--scale)) calc(32px * var(--scale));
  border-radius: var(--panel-radius);
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent - a soft rule under the heading. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 85%, transparent),
    color-mix(in srgb, var(--accent) 10%, transparent));
  transform-origin: left center;
}

/* The heading keeps the glass family's rounded, measured voice. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

.${P}-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest rests on a quiet glass plate until an image lands in it. */
.${P}-logo {
  border-radius: calc(18px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  padding: calc(10px * var(--scale));
}
.${P}-logo.has-image {
  background: transparent;
}

/* Each player is a softly-keylined tile inside the main panel. */
.${P}-row {
  position: relative;
  padding: calc(11px * var(--scale)) calc(18px * var(--scale));
  border-radius: calc(14px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.${P}-row-index {
  min-width: calc(30px * var(--scale));
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(29px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

.${P}-row-note {
  flex-shrink: 0;
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The spotlight is a machine state: the selected tile brightens and takes an accent ring. */
.${P}-spotlit .${P}-row {
  opacity: 0.42;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

.${P}-row-on .${P}-row-note {
  color: var(--accent);
}`,
  }),
);

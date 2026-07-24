// The INFOGRAPHIC-category sports type: the fixtures and results board.
//
// It declares no machine, and that is the point rather than an omission. Its content is a LIST
// the operator types, its motion is MEASURED from the rendered rows (igMotion.ts), and neither
// of those is state: a results column that gained a row is a longer cascade, not a new pointer
// position. `deriveMachine` gives it the correct one-group linear machine on read, so
// `machine: {}` here compiles to NO machine key at all and the emitted template is exactly what
// the design alone produced (docs/GRAPHIC_TYPES.md §2).
//
// It uses the canonical repeating-data system (infographics/sportsRuntimes.ts): one hidden
// textarea, one item per line, `|` between an item's parts, and one rebuild every design of the
// type reuses unchanged.
//
// WHAT IS DELIBERATELY NOT HERE. An earlier draft of this pack also declared `lineup`,
// `standings` and `stat-compare`. Main already ships all three — as `roster`, `standings` and
// `head-to-head` in the COMPETITION pack (types/competitionBoards.ts, types/matchups.ts), on
// the `results-board` prefix with the `comp-*` presets, and each with an operator affordance
// this pack's versions lacked (a spotlight the caster moves, a highlighted row, a final state).
// Shipping a second `standings` would have been a straight id collision, and a second roster
// and head-to-head would have been two near-identical types in one catalog. They were dropped
// rather than renamed: one graphic, one type is the premise the whole registry rests on.

import { paletteById } from '../../model/wizard';
import { ig26 } from '../infographics/ig26';
import { ig27 } from '../infographics/ig27';
import { ig28 } from '../infographics/ig28';
import { ig29 } from '../infographics/ig29';
import type { GraphicType } from './graphicType';

/** The list board's parts: the panel, the rendered rows, and the heading. The rows selector is
 *  the load-bearing one — it is what the shared rebuild writes into and what the
 *  `rows-cascade` builder measures. */
const LIST_PARTS = [
  { id: 'box', selector: '.infographic-box', kind: 'panel' as const, required: true },
  { id: 'rows', selector: '#infographic-rows', kind: 'block' as const, required: true },
  { id: 'heading', selector: '#f1', kind: 'line' as const, required: true },
];

/**
 * FIXTURES / RESULTS — upcoming matches and finished ones, on one board.
 *
 * A fixture row and a result row differ only by whether a score was typed, so the runtime
 * renders both from one shape and the design styles the played state differently. An operator
 * moving from the weekend preview to the round-up edits text rather than swapping graphics —
 * which is also why a single row with no score works as a next-match board beside a countdown.
 */
export const fixturesType: GraphicType = {
  id: 'fixtures',
  name: 'Fixtures & results',
  description: 'Matches upcoming and played — the preview, the round-up, and the next-match board.',
  structure: { prefix: 'infographic', category: 'infographic', parts: LIST_PARTS },
  fields: [
    {
      key: 'matches',
      label: 'Fixtures',
      kind: 'lines',
      value: 'SAT 15:00 | Arsenal | 2-1 | Chelsea',
      role: 'line',
    },
    { key: 'heading', label: 'Heading', kind: 'text', value: 'THIS WEEKEND', role: 'line' },
    { key: 'note', label: 'Competition / round', kind: 'text', value: 'Matchday 24', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'ig26',
      name: 'House Fixtures',
      description: 'The house fixtures and results board: one row per match, played or upcoming.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      samples: {
        matches: ig26.suggestedLines[0].sample,
        heading: 'THIS WEEKEND', note: 'Matchday 24',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig26.create(options),
    },
    {
      id: 'ig27',
      name: 'Volt Fixtures',
      description: 'A sport slab round-up: an accent heading bar, heavy caps, results in filled blocks.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        matches: ig27.suggestedLines[0].sample,
        heading: 'AROUND THE LEAGUE', note: 'WEEK 12',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig27.create(options),
    },
    {
      id: 'ig28',
      name: 'Frost Fixtures',
      description: 'A frosted fixtures board: soft rows with the score in an accent-tinted pill.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: {
        matches: ig28.suggestedLines[0].sample,
        heading: 'MAIN ROUND', note: 'Group 1',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig28.create(options),
    },
    {
      id: 'ig29',
      name: 'Club Fixtures',
      description: 'The amateur results board: full club names on a flat panel, scores in accent.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        matches: ig29.suggestedLines[0].sample,
        heading: 'SATURDAY’S RESULTS', note: 'Division One',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig29.create(options),
    },
  ],
};

// The INFOGRAPHIC-category sports types: the team sheet, the standings table, the stat
// comparison, and the fixtures/results board.
//
// None of these declares a machine, and that is the point rather than an omission. Their
// content is a LIST the operator types, their motion is MEASURED from the rendered rows
// (igMotion.ts), and neither of those is state: a lineup with a late change is the same
// graphic showing different data, and a table that gained a row is a longer cascade, not a new
// pointer position. `deriveMachine` gives each of them the correct one-group linear machine on
// read, so `machine: {}` here compiles to NO machine key at all and the emitted template is
// exactly what the design alone produced (docs/GRAPHIC_TYPES.md §2).
//
// What they DO share is the canonical repeating-data system (infographics/sportsRuntimes.ts):
// one hidden textarea, one item per line, `|` between an item's parts, and a per-TYPE rebuild
// that every design of that type reuses unchanged. A squad is not twenty-six fields, and a
// league table is not a field per column — which is what makes these editable live, on a
// control page, by someone holding a phone.

import { paletteById } from '../../model/wizard';
import { ig26 } from '../infographics/ig26';
import { ig27 } from '../infographics/ig27';
import { ig28 } from '../infographics/ig28';
import { ig29 } from '../infographics/ig29';
import { ig30 } from '../infographics/ig30';
import { ig31 } from '../infographics/ig31';
import { ig32 } from '../infographics/ig32';
import { ig33 } from '../infographics/ig33';
import { ig34 } from '../infographics/ig34';
import { ig35 } from '../infographics/ig35';
import { ig36 } from '../infographics/ig36';
import { ig37 } from '../infographics/ig37';
import { ig38 } from '../infographics/ig38';
import { ig39 } from '../infographics/ig39';
import { ig40 } from '../infographics/ig40';
import { ig41 } from '../infographics/ig41';
import type { GraphicType } from './graphicType';

/** Every list board promises the same three parts: the panel, the rendered rows, and the
 *  heading. The rows selector is the load-bearing one — it is what the shared rebuild writes
 *  into and what the `rows-cascade` builder measures. */
const LIST_PARTS = [
  { id: 'box', selector: '.infographic-box', kind: 'panel' as const, required: true },
  { id: 'rows', selector: '#infographic-rows', kind: 'block' as const, required: true },
  { id: 'heading', selector: '#f1', kind: 'line' as const, required: true },
];

// ── LINEUP ───────────────────────────────────────────────────────────────────

/** LINEUP / ROSTER — the team sheet, the squad, the start list, the lane draw. */
export const lineupType: GraphicType = {
  id: 'lineup',
  name: 'Lineup',
  description: 'Who is playing: a team sheet, a squad list or a start list, one player per line.',
  structure: { prefix: 'infographic', category: 'infographic', parts: LIST_PARTS },
  fields: [
    // The squad is ONE repeating field. Both the shirt number and the position are optional in
    // the rebuild, which is what lets the same board serve a Champions League team sheet and a
    // Sunday-league one where neither exists.
    { key: 'players', label: 'Lineup', kind: 'lines', value: 'Ada Hegerberg | ST', role: 'line' },
    { key: 'heading', label: 'Heading', kind: 'text', value: 'STARTING XI', role: 'line' },
    { key: 'sub', label: 'Formation / subtitle', kind: 'text', value: '4-3-3', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultZone: 'mid-left',
  },
  designs: [
    {
      id: 'ig26',
      name: 'House Lineup',
      description: 'The house team sheet: a mono heading, the formation, and one row per player.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      samples: {
        players: ig26.suggestedLines[0].sample,
        heading: 'STARTING XI',
        sub: '4-3-3',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig26.create(options),
    },
    {
      id: 'ig27',
      name: 'Volt Lineup',
      description: 'A sport slab team sheet: an accent heading bar and heavy rows with number blocks.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        players: ig27.suggestedLines[0].sample,
        heading: 'STARTING FIVE',
        sub: 'GOLDEN STATE',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig27.create(options),
    },
    {
      id: 'ig28',
      name: 'Frost Lineup',
      description: 'A frosted start list: a soft heading, and airy rows with the number in a glass pill.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: {
        players: ig28.suggestedLines[0].sample,
        heading: 'START LIST',
        sub: "Women's 1500m final",
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig28.create(options),
    },
    {
      id: 'ig29',
      name: 'Club Lineup',
      description: 'The amateur team sheet: full names, a hairline stack, numbers and positions optional.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        players: ig29.suggestedLines[0].sample,
        heading: 'TODAY’S SQUAD',
        sub: 'Ashton United',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig29.create(options),
    },
  ],
};

// ── STANDINGS ────────────────────────────────────────────────────────────────

/**
 * STANDINGS / TABLE — a league table, a championship, a medal count, a race classification.
 *
 * The COLUMNS are a data field, and that single decision is what collapses four graphics into
 * one: a football table's P/W/D/L/Pts, a motorsport championship's starts/wins/podiums/points
 * and an athletics final's single time column differ only in what the heading strip says.
 */
export const standingsType: GraphicType = {
  id: 'standings',
  name: 'Standings',
  description: 'A ranked table — league, championship, medal count or classification.',
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [
      ...LIST_PARTS,
      { id: 'head', selector: '#infographic-head', kind: 'block', required: true },
    ],
  },
  fields: [
    { key: 'rows', label: 'Table', kind: 'lines', value: 'Arsenal | 24 | 18 | 4 | 2 | 58', role: 'line' },
    { key: 'heading', label: 'Heading', kind: 'text', value: 'PREMIER LEAGUE', role: 'line' },
    // The heading strip, as data — see the note above.
    { key: 'columns', label: 'Columns', kind: 'text', value: 'TEAM | P | W | D | L | PTS', role: 'line' },
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
      id: 'ig30',
      name: 'House Table',
      description: 'The house standings board: a ranked table whose columns are data, not markup.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      samples: {
        rows: ig30.suggestedLines[0].sample,
        heading: 'PREMIER LEAGUE',
        columns: 'TEAM | P | W | D | L | PTS',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig30.create(options),
    },
    {
      id: 'ig31',
      name: 'Volt Table',
      description: 'A sport slab table: an accent heading bar, ranks in blocks, points in the accent.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        rows: ig31.suggestedLines[0].sample,
        heading: 'DRIVERS’ CHAMPIONSHIP',
        columns: 'DRIVER | R | WIN | POD | PTS',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig31.create(options),
    },
    {
      id: 'ig32',
      name: 'Frost Table',
      description: 'A frosted standings table: a soft heading, glass keylines, ranks in tinted pills.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: {
        rows: ig32.suggestedLines[0].sample,
        heading: 'MAIN ROUND · GROUP 1',
        columns: 'NATION | P | W | L | PTS',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig32.create(options),
    },
    {
      id: 'ig33',
      name: 'Club Table',
      description: 'The amateur league table: full club names, a hairline grid, narrow value columns.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        rows: ig33.suggestedLines[0].sample,
        heading: 'NORTHERN LEAGUE DIVISION ONE',
        columns: 'CLUB | P | W | D | L | PTS',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig33.create(options),
    },
  ],
};

// ── STAT COMPARISON ──────────────────────────────────────────────────────────

/**
 * STAT COMPARISON — team stats, player stats, a head-to-head.
 *
 * The bars are each side's SHARE of the pair, not its raw figure, so "Possession | 62 | 38"
 * (already a split) and "Shots | 14 | 9" (a pair of counts) both draw correctly with nothing
 * for the operator to convert. The printed figures are always exactly what was typed.
 */
export const statCompareType: GraphicType = {
  id: 'stat-compare',
  name: 'Stat comparison',
  description: 'Two sides compared stat by stat — team stats, player stats, a head-to-head.',
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [
      ...LIST_PARTS,
      { id: 'sideA', selector: '#f2', kind: 'line', required: true },
      { id: 'sideB', selector: '#f3', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'stats', label: 'Stats', kind: 'lines', value: 'Possession % | 62 | 38', role: 'line' },
    { key: 'heading', label: 'Heading', kind: 'text', value: 'MATCH STATS', role: 'line' },
    { key: 'sideA', label: 'Side A', kind: 'text', value: 'HOME', role: 'line' },
    { key: 'sideB', label: 'Side B', kind: 'text', value: 'AWAY', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 4,
    logo: 'none',
    // Measured motion: the bars growing to their share IS the entrance. A cascade is offered
    // as the alternative because the rows are also direct children of `#infographic-rows`.
    animationPresets: ['bars-grow', 'rows-cascade'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'ig34',
      name: 'House Head to Head',
      description: 'The house stat comparison: one row per stat, bars growing out from the centre.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      samples: {
        stats: ig34.suggestedLines[0].sample,
        heading: 'MATCH STATS', sideA: 'HOME', sideB: 'AWAY',
      },
      animationPresets: ['bars-grow', 'rows-cascade'],
      create: (_type, options) => ig34.create(options),
    },
    {
      id: 'ig35',
      name: 'Volt Head to Head',
      description: 'A sport slab stat board: an accent header bar and heavy centre-out comparison bars.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        stats: ig35.suggestedLines[0].sample,
        heading: 'TEAM STATS', sideA: 'LAKERS', sideB: 'CELTICS',
      },
      animationPresets: ['bars-grow', 'rows-cascade'],
      create: (_type, options) => ig35.create(options),
    },
    {
      id: 'ig36',
      name: 'Frost Head to Head',
      description: 'A frosted comparison card: two named competitors over rounded centre-out bars.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: {
        stats: ig36.suggestedLines[0].sample,
        heading: 'FIGHT STATS', sideA: 'Adesanya', sideB: 'Pereira',
      },
      animationPresets: ['bars-grow', 'rows-cascade'],
      create: (_type, options) => ig36.create(options),
    },
    {
      id: 'ig37',
      name: 'Club Head to Head',
      description: 'The amateur stat board: big figures, thin bars, full club names, a flat panel.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        stats: ig37.suggestedLines[0].sample,
        heading: 'MATCH STATS', sideA: 'Ashton United', sideB: 'Marske Town',
      },
      animationPresets: ['bars-grow', 'rows-cascade'],
      create: (_type, options) => ig37.create(options),
    },
  ],
};

// ── FIXTURES ─────────────────────────────────────────────────────────────────

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
      id: 'ig38',
      name: 'House Fixtures',
      description: 'The house fixtures and results board: one row per match, played or upcoming.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      samples: {
        matches: ig38.suggestedLines[0].sample,
        heading: 'THIS WEEKEND', note: 'Matchday 24',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig38.create(options),
    },
    {
      id: 'ig39',
      name: 'Volt Fixtures',
      description: 'A sport slab round-up: an accent heading bar, heavy caps, results in filled blocks.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        matches: ig39.suggestedLines[0].sample,
        heading: 'AROUND THE LEAGUE', note: 'WEEK 12',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig39.create(options),
    },
    {
      id: 'ig40',
      name: 'Frost Fixtures',
      description: 'A frosted fixtures board: soft rows with the score in an accent-tinted pill.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: {
        matches: ig40.suggestedLines[0].sample,
        heading: 'MAIN ROUND', note: 'Group 1',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig40.create(options),
    },
    {
      id: 'ig41',
      name: 'Club Fixtures',
      description: 'The amateur results board: full club names on a flat panel, scores in accent.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        matches: ig41.suggestedLines[0].sample,
        heading: 'SATURDAY’S RESULTS', note: 'Division One',
      },
      animationPresets: ['rows-cascade'],
      create: (_type, options) => ig41.create(options),
    },
  ],
};

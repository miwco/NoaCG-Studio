// The sports pack's FIELD CONTRACTS for the infographic category.
//
// Same rule as the scoreboard half (scoreboards/scorebugShared.ts): the field contract belongs
// to the graphic TYPE, so four designs of one type emit the same fields in the same order, and
// each design passes its OWN sample values because the SPX definition's default and the text
// painted in the markup have to be the same string.
//
// Every board here is a LIST board, so field 0 is always the hidden repeating source
// (`kind: 'lines'` -> an SPX textarea) that the runtimes in `sportsRuntimes.ts` render from.
// The visible fields after it are the board's own furniture — a heading, a column strip, the
// names of the two sides — never the list itself.

import type { SpxField } from '../../model/types';

/** Escape a value for a text node in generated markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** LINEUP / ROSTER — the squad source, a heading, and a formation or subtitle line. */
export function lineupFields(rows: string, heading: string, sub: string): SpxField[] {
  return [
    { field: 'f0', ftype: 'textarea', title: 'Lineup', value: rows },
    { field: 'f1', ftype: 'textfield', title: 'Heading', value: heading },
    { field: 'f2', ftype: 'textfield', title: 'Formation / subtitle', value: sub },
  ];
}

/**
 * STANDINGS / TABLE — the table source, a heading, and the COLUMN HEADINGS as data.
 *
 * The columns are a field rather than markup because their count is not fixed: a football
 * table has P/W/D/L/Pts, a championship has starts/wins/podiums/points, and a race
 * classification has one time column. One board covers all of them only if the heading strip
 * is typed alongside the rows.
 */
export function standingsFields(rows: string, heading: string, columns: string): SpxField[] {
  return [
    { field: 'f0', ftype: 'textarea', title: 'Table', value: rows },
    { field: 'f1', ftype: 'textfield', title: 'Heading', value: heading },
    { field: 'f2', ftype: 'textfield', title: 'Columns', value: columns },
  ];
}

/** STAT COMPARISON — the stat source, a heading, and the two sides' names. */
export function compareFields(rows: string, heading: string, sideA: string, sideB: string): SpxField[] {
  return [
    { field: 'f0', ftype: 'textarea', title: 'Stats', value: rows },
    { field: 'f1', ftype: 'textfield', title: 'Heading', value: heading },
    { field: 'f2', ftype: 'textfield', title: 'Side A', value: sideA },
    { field: 'f3', ftype: 'textfield', title: 'Side B', value: sideB },
  ];
}

/** FIXTURES / RESULTS — the fixture source, a heading, and a competition or round note. */
export function fixtureFields(rows: string, heading: string, note: string): SpxField[] {
  return [
    { field: 'f0', ftype: 'textarea', title: 'Fixtures', value: rows },
    { field: 'f1', ftype: 'textfield', title: 'Heading', value: heading },
    { field: 'f2', ftype: 'textfield', title: 'Competition / round', value: note },
  ];
}

// ── The shared DOM contract ──────────────────────────────────────────────────
//
// The MARKUP of a list board belongs to the type too, not to each skin, for the same reason
// the fields do: the runtime writes into `#infographic-rows`, the `rows-cascade` builder
// animates its direct children, and the type's `parts` promise those selectors exist. Four
// designs disagreeing about the DOM would be four graphics, not one graphic in four skins.
//
// What stays a DESIGN decision is every pixel of the CSS — which is where a house void panel
// and a frosted card actually differ, and where the four cells of a matrix row earn their keep.

/** A list board: a heading, an optional subtitle chip, a keyline, and the rendered rows. */
export function listBoardHtml(args: {
  heading: string;
  /** The second visible field (formation, competition, columns) — omitted when the board has none. */
  sub?: string;
  /** Field id of the subtitle, when there is one. */
  subField?: string;
  /** Rendered above the rows: the standings column strip. */
  headStrip?: boolean;
  /** The hidden repeating source's text. */
  rows: string;
  /** Extra hidden sources (the standings columns field). */
  extraSources?: string;
  /** A short comment naming the board, for the emitted HTML. */
  note: string;
}): string {
  const sub = args.sub !== undefined && args.subField !== undefined
    ? `\n        <div class="infographic-sub" id="${args.subField}">${esc(args.sub)}</div>`
    : '';
  const strip = args.headStrip
    ? '\n      <!-- Column headings — rendered from the columns field, so any column count lines up. -->\n      <div id="infographic-head" class="infographic-head"></div>'
    : '';
  return `    <!-- ${args.note} -->
    <div class="infographic-box">
      <!-- The header: the heading, and the board's second line where it has one. -->
      <div class="infographic-header">
        <div class="infographic-heading" id="f1">${esc(args.heading)}</div>${sub}
      </div>
      <!-- The rule — a keyline closing the header block. -->
      <div class="infographic-rule"></div>${strip}
      <!-- Rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden repeating source — SPX writes field f0 here; JS renders it. One item per line. -->
    <div id="f0" style="display: none">${esc(args.rows)}</div>${args.extraSources ?? ''}`;
}

/** The hidden column-headings source the standings runtime renders its strip from. */
export function columnsSourceHtml(value: string): string {
  return `
    <!-- Hidden column headings — SPX writes field f2 here; JS renders the strip above. -->
    <div id="f2" style="display: none">${esc(value)}</div>`;
}

/** A stat-comparison board: the heading, the two side names, the keyline, and the rows. */
export function compareBoardHtml(args: {
  heading: string;
  sideA: string;
  sideB: string;
  rows: string;
  note: string;
}): string {
  return `    <!-- ${args.note} -->
    <div class="infographic-box">
      <!-- The header: the heading, with the two sides named either side of it. -->
      <div class="infographic-header">
        <div class="infographic-side infographic-side-a" id="f2">${esc(args.sideA)}</div>
        <div class="infographic-heading" id="f1">${esc(args.heading)}</div>
        <div class="infographic-side infographic-side-b" id="f3">${esc(args.sideB)}</div>
      </div>
      <!-- The rule — a keyline closing the header block. -->
      <div class="infographic-rule"></div>
      <!-- Stat rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden stat source — SPX writes field f0 here. One "label | home | away" per line. -->
    <div id="f0" style="display: none">${esc(args.rows)}</div>`;
}

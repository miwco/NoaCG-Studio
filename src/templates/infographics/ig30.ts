// ig30 "House Table" — the NoaCG standings board, sibling of ig26 "House Lineup" and lt11
// "House Strap". A league table, a championship classification, a medal count or a race order:
// a void panel with an amber-lit rank column, the competitor, and however many value columns
// the operator typed.
//
// The COLUMN HEADINGS are a data field, not markup, and that is what makes one board serve all
// of those. A football table's P/W/D/L/Pts, a motorsport championship's starts/wins/podiums/
// points and an athletics final's single time column are the same graphic with a different
// heading strip. Rows are never re-sorted: an operator pastes the order they mean, and a
// graphic that guessed at tie-break rules would be wrong for most competitions.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { standingsRowsRuntimeJs } from './sportsRuntimes';
import { columnsSourceHtml, listBoardHtml, standingsFields } from './sportsFields';

const ROWS = [
  'Arsenal | 24 | 18 | 4 | 2 | 58',
  'Liverpool | 24 | 17 | 5 | 2 | 56',
  'Manchester City | 24 | 17 | 4 | 3 | 55',
  'Aston Villa | 24 | 14 | 4 | 6 | 46',
  'Tottenham | 24 | 13 | 5 | 6 | 44',
].join('\n');
const COLUMNS = 'TEAM | P | W | D | L | PTS';

export const ig30: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig30',
    category: 'infographic',
    name: 'House Table',
    styleTag: 'noacg',
    description: 'The house standings board: a ranked table whose columns are data, not markup.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Table', sample: ROWS },
      { title: 'Heading', sample: 'PREMIER LEAGUE' },
      { title: 'Columns', sample: COLUMNS },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Table',
    description:
      'The NoaCG standings board, sibling of ig26 House Lineup and lt11 House Strap: a void ' +
      'panel with an amber top edge, a mono heading, a dim column strip, and ranked rows with ' +
      'the position in amber and the last column emphasised as the points figure. The columns ' +
      'are typed, so the same board serves a league table, a championship and a race order.',
    uicolor: '4',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'PREMIER LEAGUE';
    const columnsText = o.lines[2]?.sample || COLUMNS;

    return {
      html: listBoardHtml({
        note: 'House Table: void panel — mono heading, column strip, then the ranked rows.',
        heading: headingText,
        headStrip: true,
        rows: rowsText,
        extraSources: columnsSourceHtml(columnsText),
      }),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, sized as a table with the family's amber top edge. */
.infographic-box {
  min-width: calc(600px * var(--scale));  /* a table, not a strap — the columns need room */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(24px * var(--scale)) calc(30px * var(--scale)) calc(16px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* Heading — the house mono accent kicker. */
.infographic-heading {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
  text-wrap: balance;              /* a long competition name wraps into even rows */
}

/* The rule — a dim keyline under the heading. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(14px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.14);  /* dim, not accent — the colour stays in the heading */
}

/* ── The table grid ──
   The heading strip and every row share ONE flex shape — a fixed rank slot, a flexible name
   cell, then equal fixed value cells — so any column count lines up without a shared width
   table and without the runtime knowing anything about layout. */
.infographic-head,
.infographic-table-row {
  display: flex;                   /* rank, name and the value cells in one row */
  align-items: baseline;           /* every cell sits on one text baseline */
  gap: calc(10px * var(--scale));  /* air between the cells */
}
.infographic-head {
  padding: calc(10px * var(--scale)) 0 calc(8px * var(--scale));  /* the strip's own rhythm */
}
.infographic-table-row {
  padding: calc(9px * var(--scale)) 0;  /* even vertical rhythm down the table */
}
.infographic-table-row + .infographic-table-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);  /* keyline hairline between rows */
}

/* The rank column — amber, tabular, in a shared slot the heading strip leaves empty. */
.infographic-rank {
  flex-shrink: 0;                  /* the rank never gives up width */
  min-width: calc(30px * var(--scale));  /* one shared slot — the names align under the strip */
  font-family: var(--font-label);  /* mono: a position is data, not display type */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 500;                /* medium, in one mono voice with the heading */
  color: var(--accent);            /* the ranks carry the accent */
  font-variant-numeric: tabular-nums;  /* equal-width digits — ranks align down the column */
}

/* A value cell — a fixed, shared column so the table reads as columns rather than as text. */
.infographic-cell {
  flex-shrink: 0;                  /* value columns never squeeze — the name gives up width */
  min-width: calc(46px * var(--scale));  /* one shared column width across the whole table */
  text-align: right;               /* figures align on their right edge, as a table should */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.25;               /* even rhythm down the table */
  color: var(--text-dim);          /* dim — the middle columns are reference */
  font-variant-numeric: tabular-nums;  /* the columns line up across rows */
}

/* The name cell — the row's anchor, taking all the spare width. */
.infographic-cell-name {
  flex: 1;                         /* the competitor takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  text-align: left;                /* names read from the left, unlike the figures */
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}

/* The LAST column is the points figure — the one number a viewer actually looks for. */
.infographic-table-row .infographic-cell:last-child {
  color: var(--text-color);        /* full white, unlike the reference columns */
}

/* The heading strip's own cells — the smallest, dimmest type on the board. */
.infographic-head .infographic-cell {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* the strip reads as labels, whatever is typed */
  color: var(--text-dim);          /* dim — the strip is reference, never headline */
}
.infographic-head .infographic-cell-name { color: var(--text-dim); }  /* the name heading too */`,

      tokens: {
        labelTracking: '0.2em',
      },
      fields: standingsFields(rowsText, headingText, columnsText),

      // The shared standings rebuild — one "name | value | value | …" per line, plus the
      // column strip from f2 (sportsRuntimes.ts).
      runtimeExtraJs: standingsRowsRuntimeJs(),
    };
  },
);

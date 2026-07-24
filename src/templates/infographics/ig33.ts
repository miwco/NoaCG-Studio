// ig33 "Club Table" — the minimal standings board, and the pack's amateur one. Sibling of
// ig29 "Club Lineup" and lt01 "Hairline".
//
// A district-league table, a school sports-day standing, a university league. Flat panel, one
// keyline, full club names in sentence case, and columns narrow enough that a five-column table
// still fits a 1280-wide stream without the names being trimmed to initials.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { standingsRowsRuntimeJs } from './sportsRuntimes';
import { columnsSourceHtml, listBoardHtml, standingsFields } from './sportsFields';

const ROWS = [
  'Ashton United | 18 | 12 | 3 | 3 | 39',
  'Marske Town | 18 | 11 | 4 | 3 | 37',
  'Guisborough | 18 | 9 | 5 | 4 | 32',
  'Redcar Athletic | 18 | 7 | 4 | 7 | 25',
  'Thornaby | 18 | 4 | 3 | 11 | 15',
].join('\n');
const COLUMNS = 'CLUB | P | W | D | L | PTS';

export const ig33: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig33',
    category: 'infographic',
    name: 'Club Table',
    styleTag: 'minimal',
    description: 'The amateur league table: full club names, a hairline grid, narrow value columns.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Table', sample: ROWS },
      { title: 'Heading', sample: 'NORTHERN LEAGUE DIVISION ONE' },
      { title: 'Columns', sample: COLUMNS },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Club Table',
    description:
      'The local and amateur league table, sibling of ig29 Club Lineup and lt01 Hairline: a ' +
      'flat panel with a small tracked heading, a hairline grid, full club names in sentence ' +
      'case and narrow value columns, so a six-column table still fits a 1280-wide club stream ' +
      'without the names being trimmed.',
    uicolor: '1',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'NORTHERN LEAGUE DIVISION ONE';
    const columnsText = o.lines[2]?.sample || COLUMNS;

    return {
      html: listBoardHtml({
        note: 'Club Table: flat panel — small heading, hairline column strip, then the rows.',
        heading: headingText,
        headStrip: true,
        rows: rowsText,
        extraSources: columnsSourceHtml(columnsText),
      }),

      css: `${labelFontFaceCss(fontById('inter'))}

/* The panel — flat and solid. No blur: a club stream's bitrate cannot afford one. */
.infographic-box {
  min-width: calc(540px * var(--scale));  /* a table, not a strap — the columns need room */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(20px * var(--scale)) calc(24px * var(--scale)) calc(12px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  border-left: var(--accent-weight) solid var(--accent);  /* the family's one accent rule */
}

/* Heading — a small tracked caps label. */
.infographic-heading {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* small: this line is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-wrap: balance;              /* a long league name wraps into even rows */
}

/* The rule — the family's one divider. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(12px * var(--scale));  /* air between the heading and the rule */
  background: rgba(255, 255, 255, 0.20);  /* the family's divider */
}

/* ── The table grid ──
   The heading strip and every row share one flex shape, so any column count lines up. */
.infographic-head,
.infographic-table-row {
  display: flex;                   /* rank, name and the value cells in one row */
  align-items: baseline;           /* every cell sits on one text baseline */
  gap: calc(8px * var(--scale));   /* tight: a club table often runs to six columns */
}
.infographic-head {
  padding: calc(9px * var(--scale)) 0 calc(6px * var(--scale));  /* the strip's own rhythm */
}
.infographic-table-row {
  padding: calc(7px * var(--scale)) 0;  /* even vertical rhythm down the table */
}
.infographic-table-row + .infographic-table-row {
  border-top: 1px solid rgba(255, 255, 255, 0.10);  /* keyline hairline between rows */
}

/* The rank — accent, tabular, in a narrow shared slot. */
.infographic-rank {
  flex-shrink: 0;                  /* the rank never gives up width */
  min-width: calc(22px * var(--scale));  /* narrow — the club names need the width more */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 700;                /* bold — the rank is a marker */
  color: var(--accent);            /* the ranks carry the accent */
  font-variant-numeric: tabular-nums;  /* equal-width digits — ranks align down the column */
}

/* A value cell — narrow, so six columns and a full club name coexist. */
.infographic-cell {
  flex-shrink: 0;                  /* value columns never squeeze — the name gives up width */
  min-width: calc(34px * var(--scale));  /* deliberately narrow — see the note above */
  text-align: right;               /* figures align on their right edge, as a table should */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: 500;                /* medium — a club table is a list, not a headline */
  line-height: 1.3;                /* even rhythm down the table */
  color: var(--text-dim);          /* dim — the middle columns are reference */
  font-variant-numeric: tabular-nums;  /* the columns line up across rows */
}

/* The name cell — full club names in sentence case, taking all the spare width. */
.infographic-cell-name {
  flex: 1;                         /* the club takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  text-align: left;                /* names read from the left, unlike the figures */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* a step up: the name is the row */
  font-weight: 500;                /* medium, matching the value columns' voice */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}

/* The LAST column is the points figure — full white and bold, the number people look for. */
.infographic-table-row .infographic-cell:last-child {
  color: var(--text-color);        /* full white, unlike the reference columns */
  font-weight: 700;                /* and bold, so it reads first */
}

/* The heading strip's own cells — the smallest, dimmest type on the board. */
.infographic-head .infographic-cell {
  font-size: calc(11px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the strip reads as labels, whatever is typed */
  color: var(--text-dim);          /* dim — the strip is reference, never headline */
}
.infographic-head .infographic-cell-name {
  font-size: calc(11px * var(--scale) * var(--type-scale));  /* the name heading matches the rest */
  font-weight: 600;                /* …and its weight */
  color: var(--text-dim);          /* …and its dimming */
}`,
      fields: standingsFields(rowsText, headingText, columnsText),

      // The shared standings rebuild — rows from f0, the column strip from f2.
      runtimeExtraJs: standingsRowsRuntimeJs(),
    };
  },
);

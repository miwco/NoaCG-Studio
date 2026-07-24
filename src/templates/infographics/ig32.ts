// ig32 "Frost Table" — the glass standings board, sibling of ig28 "Frost Lineup" and lt08
// "Frosted Card". A frosted table: a soft heading, a dimmed column strip, and rows separated
// by glass keylines with the rank in an accent-tinted pill.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { standingsRowsRuntimeJs } from './sportsRuntimes';
import { columnsSourceHtml, listBoardHtml, standingsFields } from './sportsFields';

const ROWS = [
  'Norway | 7 | 6 | 1 | 13',
  'Denmark | 7 | 5 | 2 | 11',
  'France | 7 | 4 | 3 | 9',
  'Sweden | 7 | 3 | 4 | 7',
  'Hungary | 7 | 1 | 6 | 3',
].join('\n');
const COLUMNS = 'NATION | P | W | L | PTS';

export const ig32: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig32',
    category: 'infographic',
    name: 'Frost Table',
    styleTag: 'glass',
    description: 'A frosted standings table: a soft heading, glass keylines, ranks in tinted pills.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Table', sample: ROWS },
      { title: 'Heading', sample: 'MAIN ROUND · GROUP 1' },
      { title: 'Columns', sample: COLUMNS },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Table',
    description:
      'The glass standings board, sibling of ig28 Frost Lineup and lt08 Frosted Card: a frosted ' +
      'table with a soft tracked heading, a dimmed column strip, rows separated by glass ' +
      'keylines, and the rank in an accent-tinted pill. The columns are typed, so a group ' +
      'table, a medal count and a race classification are all the same board.',
    uicolor: '5',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'MAIN ROUND · GROUP 1';
    const columnsText = o.lines[2]?.sample || COLUMNS;

    return {
      html: listBoardHtml({
        note: 'Frost Table: frosted card — soft heading, column strip, rows in glass keylines.',
        heading: headingText,
        headStrip: true,
        rows: rowsText,
        extraSources: columnsSourceHtml(columnsText),
      }),

      css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface holding the whole table. */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a table, not a strap — the columns need room */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(22px * var(--scale)) calc(26px * var(--scale)) calc(14px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
}

/* Heading — a soft tracked caps label. */
.infographic-heading {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-wrap: balance;              /* a long round name wraps into even rows */
}

/* The rule — a glass keyline under the heading. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(12px * var(--scale));  /* air between the heading and the rule */
  background: rgba(255, 255, 255, 0.22);  /* the glass keyline */
}

/* ── The table grid ──
   The heading strip and every row share one flex shape, so any column count lines up. */
.infographic-head,
.infographic-table-row {
  display: flex;                   /* rank, name and the value cells in one row */
  align-items: center;             /* the rank pill and the text share a centre line */
  gap: calc(10px * var(--scale));  /* air between the cells */
}
.infographic-head {
  padding: calc(10px * var(--scale)) 0 calc(6px * var(--scale));  /* the strip's own rhythm */
}
.infographic-table-row {
  padding: calc(9px * var(--scale)) 0;  /* even vertical rhythm down the table */
}
.infographic-table-row + .infographic-table-row {
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the glass keyline, dimmed */
}

/* The rank — an accent-tinted pill. */
.infographic-rank {
  flex-shrink: 0;                  /* the rank never gives up width */
  min-width: calc(30px * var(--scale));  /* one shared pill width — the names align */
  padding: calc(3px * var(--scale)) 0;  /* the pill's own frame */
  text-align: center;              /* the figure is centred in its pill */
  border-radius: calc(999px * var(--scale));  /* a true pill at any scale */
  background: color-mix(in srgb, var(--accent) 26%, transparent);  /* the accent, softened */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 800;                /* heavy at pill size so it reads through the softening */
  color: var(--text-color);        /* white inside the tinted pill */
  font-variant-numeric: tabular-nums;  /* equal-width digits — pills stay the same size */
}
/* The heading strip's rank slot is empty — it must not paint a pill. */
.infographic-head .infographic-rank { background: none; }

/* A value cell — a fixed, shared column. */
.infographic-cell {
  flex-shrink: 0;                  /* value columns never squeeze — the name gives up width */
  min-width: calc(46px * var(--scale));  /* one shared column width across the whole table */
  text-align: right;               /* figures align on their right edge, as a table should */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: 600;                /* semibold — the family's voice */
  line-height: 1.25;               /* even rhythm down the table */
  color: var(--text-dim);          /* dim — the middle columns are reference */
  font-variant-numeric: tabular-nums;  /* the columns line up across rows */
}

/* The name cell — the row's anchor, taking all the spare width. */
.infographic-cell-name {
  flex: 1;                         /* the competitor takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  text-align: left;                /* names read from the left, unlike the figures */
  color: var(--text-color);        /* primary text on the frost */
  overflow-wrap: break-word;       /* break a very long unbroken nation or club name */
}

/* The LAST column is the points figure — it takes the accent. */
.infographic-table-row .infographic-cell:last-child {
  color: var(--accent);            /* the one number a viewer actually looks for */
  font-weight: 800;                /* and the heaviest, so it reads first */
}

/* The heading strip's own cells — the smallest, dimmest type on the board. */
.infographic-head .infographic-cell {
  font-size: calc(12px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the strip reads as labels, whatever is typed */
  color: var(--text-dim);          /* dim — the strip is reference, never headline */
}
.infographic-head .infographic-cell-name { color: var(--text-dim); }  /* the name heading too */`,
      fields: standingsFields(rowsText, headingText, columnsText),

      // The shared standings rebuild — rows from f0, the column strip from f2.
      runtimeExtraJs: standingsRowsRuntimeJs(),
    };
  },
);

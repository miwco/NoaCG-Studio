// ig19 "Volt Table" — the sport standings board, sibling of ig15 "Volt Lineup" and lt06
// "Split Bar". A hard slab table: the heading on a solid accent bar, ranks in filled blocks,
// and the last column carrying the accent as the points figure.
//
// Same typed-columns contract as ig18, so this one covers a motorsport championship
// (starts/wins/podiums/points) and a race classification as readily as a league table.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { standingsRowsRuntimeJs } from './sportsRuntimes';
import { columnsSourceHtml, listBoardHtml, standingsFields } from './sportsFields';

const ROWS = [
  'VERSTAPPEN | 14 | 9 | 12 | 314',
  'NORRIS | 14 | 2 | 8 | 238',
  'LECLERC | 14 | 1 | 7 | 212',
  'PIASTRI | 14 | 1 | 5 | 179',
  'SAINZ | 14 | 1 | 4 | 162',
].join('\n');
const COLUMNS = 'DRIVER | R | WIN | POD | PTS';

export const ig19: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig19',
    category: 'infographic',
    name: 'Volt Table',
    styleTag: 'sport',
    description: 'A sport slab table: an accent heading bar, ranks in blocks, points in the accent.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Table', sample: ROWS },
      { title: 'Heading', sample: 'DRIVERS’ CHAMPIONSHIP' },
      { title: 'Columns', sample: COLUMNS },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Table',
    description:
      'The sport standings board, sibling of ig15 Volt Lineup and lt06 Split Bar: a hard slab ' +
      'with the heading on a solid accent bar, a dark column strip, ranks in filled blocks and ' +
      'the points column in the accent. The columns are typed, so it serves a motorsport ' +
      'championship and a race classification as readily as a league table.',
    uicolor: '2',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'DRIVERS’ CHAMPIONSHIP';
    const columnsText = o.lines[2]?.sample || COLUMNS;

    return {
      html: listBoardHtml({
        note: 'Volt Table: sport slab — accent heading bar, column strip, ranked blocks.',
        heading: headingText,
        headStrip: true,
        rows: rowsText,
        extraSources: columnsSourceHtml(columnsText),
      }),

      css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. Contrast, not blur, carries this family. */
.infographic-box {
  min-width: calc(600px * var(--scale));  /* a table, not a strap — the columns need room */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the accent bar stops at the slab's edge */
}

/* The header — a solid accent bar carrying the heading. */
.infographic-header {
  padding: calc(12px * var(--scale)) calc(24px * var(--scale));  /* the bar's height */
  background: var(--accent);       /* the one big accent surface */
}
.infographic-heading {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the bar IS the label */
  font-weight: 700;                /* solid: a sport label is never light */
  line-height: 1.15;               /* compact bar leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a banner, whatever the operator types */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
  text-wrap: balance;              /* a long competition name wraps into even rows */
}

/* No separate rule: the accent bar IS the header's edge. */
.infographic-rule { display: none; }

/* ── The table grid ──
   The heading strip and every row share one flex shape, so any column count lines up. */
.infographic-head,
.infographic-table-row {
  display: flex;                   /* rank, name and the value cells in one row */
  align-items: center;             /* the rank block and the text share a centre line */
  gap: calc(10px * var(--scale));  /* air between the cells */
  padding-left: calc(24px * var(--scale));   /* the slab's side margins… */
  padding-right: calc(24px * var(--scale));  /* …on both edges */
}
.infographic-head {
  padding-top: calc(10px * var(--scale));    /* the strip's own rhythm */
  padding-bottom: calc(8px * var(--scale));  /* tight under the bar */
  background: rgba(255, 255, 255, 0.05);     /* one step off the slab */
}
.infographic-table-row {
  padding-top: calc(8px * var(--scale));     /* even vertical rhythm down the table */
  padding-bottom: calc(8px * var(--scale));  /* the same, so rows are symmetric */
}
.infographic-table-row + .infographic-table-row {
  border-top: 1px solid rgba(255, 255, 255, 0.09);  /* keyline hairline between rows */
}
#infographic-rows { padding-bottom: calc(10px * var(--scale)); }  /* air under the last row */

/* The rank — a filled block, the fastest thing on the board to find. */
.infographic-rank {
  flex-shrink: 0;                  /* the rank never gives up width */
  min-width: calc(32px * var(--scale));  /* one shared block width — the names align */
  padding: calc(3px * var(--scale)) 0;  /* the block's own frame */
  text-align: center;              /* the figure is centred in its block */
  background: rgba(255, 255, 255, 0.10);  /* a hard tile, not a colour */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  color: var(--text-color);        /* paper white on the tile */
  font-variant-numeric: tabular-nums;  /* equal-width digits — blocks stay the same size */
}
/* The heading strip's rank slot is empty — it must not paint a tile. */
.infographic-head .infographic-rank { background: none; }

/* A value cell — a fixed, shared column. */
.infographic-cell {
  flex-shrink: 0;                  /* value columns never squeeze — the name gives up width */
  min-width: calc(48px * var(--scale));  /* one shared column width across the whole table */
  text-align: right;               /* figures align on their right edge, as a table should */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.2;                /* even rhythm down the table */
  color: var(--text-dim);          /* dim — the middle columns are reference */
  font-variant-numeric: tabular-nums;  /* the columns line up across rows */
}

/* The name cell — heavy condensed caps, taking the spare width. */
.infographic-cell-name {
  flex: 1;                         /* the competitor takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  text-align: left;                /* names read from the left, unlike the figures */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* a sport table runs in caps */
  color: var(--text-color);        /* paper white on the slab */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}

/* The LAST column is the points figure — it takes the accent. */
.infographic-table-row .infographic-cell:last-child { color: var(--accent); }

/* The heading strip's own cells — the smallest, dimmest type on the board. */
.infographic-head .infographic-cell {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
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

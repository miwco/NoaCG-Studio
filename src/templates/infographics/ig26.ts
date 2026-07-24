// ig26 "House Fixtures" — the NoaCG fixtures and results board, sibling of ig08 "House
// Schedule" and ig30 "House Table". Upcoming matches, today's results, the round just played.
//
// One board for both, and that is the design decision worth defending: a fixture row and a
// result row differ only by whether a score was typed, so "SAT 20:00 | Arsenal | 2-1 | Chelsea"
// and "SAT 20:00 | Arsenal | Chelsea" render through the same runtime. An operator moving from
// the preview to the round-up mid-programme edits text rather than changing graphics.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { fixtureRowsRuntimeJs } from './sportsRuntimes';
import { fixtureFields, listBoardHtml } from './sportsFields';

const ROWS = [
  'SAT 12:30 | Arsenal | 2-1 | Chelsea',
  'SAT 15:00 | Brighton | 0-0 | Everton',
  'SAT 17:30 | Liverpool | Newcastle',
  'SUN 14:00 | Aston Villa | Tottenham',
].join('\n');

export const ig26: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig26',
    category: 'infographic',
    name: 'House Fixtures',
    styleTag: 'noacg',
    description: 'The house fixtures and results board: one row per match, played or upcoming.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Fixtures', sample: ROWS },
      { title: 'Heading', sample: 'THIS WEEKEND' },
      { title: 'Competition / round', sample: 'Matchday 24' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Fixtures',
    description:
      'The NoaCG fixtures and results board, sibling of ig08 House Schedule and ig30 House ' +
      'Table: a void panel with a mono heading, the round beside it, and one row per match — ' +
      'the kick-off, the two clubs, and either the score in an amber chip or a dim "v". The ' +
      'same board serves upcoming fixtures and finished results.',
    uicolor: '4',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'THIS WEEKEND';
    const noteText = o.lines[2]?.sample || 'Matchday 24';

    return {
      html: listBoardHtml({
        note: 'House Fixtures: void panel — mono heading, then one row per match.',
        heading: headingText,
        sub: noteText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, with the family's amber top edge. */
.infographic-box {
  min-width: calc(580px * var(--scale));  /* a board — two club names and a score per row */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(24px * var(--scale)) calc(30px * var(--scale)) calc(14px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The header — the heading and the round on one row. */
.infographic-header {
  display: flex;                   /* heading and round in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(18px * var(--scale));  /* the round never crowds a long heading */
}
.infographic-heading {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
  text-wrap: balance;              /* a long heading wraps at spaces into even rows */
}
.infographic-sub {
  flex-shrink: 0;                  /* the round keeps its width whatever the heading does */
  font-family: var(--font-label);  /* one mono voice across the header */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 500;                /* matches the heading's weight */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  color: var(--text-dim);          /* dimmed — never full accent twice in one header */
  white-space: nowrap;             /* "Matchday 24" stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* The rule — a thin dim keyline under the header. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(14px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.14);  /* dim, not accent — the colour stays in the chips */
}

/* The board — match rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one match row under another */
}

/* One match row: [kick-off] [home] [score chip or v] [away]. */
.infographic-fixture-row {
  display: flex;                   /* every part of the match on one line */
  align-items: center;             /* the chip and the names share a centre line */
  gap: calc(14px * var(--scale));  /* clear air between the columns */
  padding: calc(11px * var(--scale)) 0;  /* even vertical rhythm down the board */
}
.infographic-fixture-row + .infographic-fixture-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);  /* keyline hairline between matches */
}

/* The kick-off — mono, dim, in a shared column so the clubs line up down the board. */
.infographic-fixture-when {
  flex-shrink: 0;                  /* a long club name never squeezes the time */
  min-width: calc(96px * var(--scale));  /* one shared column width — the clubs align */
  font-family: var(--font-label);  /* mono: a kick-off is data, not display type */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 500;                /* medium, in one mono voice with the header */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* "sat" reads as "SAT", whatever is typed */
  color: var(--text-dim);          /* dimmed — the clubs carry the row */
  font-variant-numeric: tabular-nums;  /* times align down the column */
  white-space: nowrap;             /* "SAT 12:30" stays on one line */
}

/* The two clubs — the row's anchors, in house display type. */
.infographic-fixture-side {
  flex: 1;                         /* the two clubs share the row's spare width evenly */
  min-width: 0;                    /* allow a long club name to shrink and wrap */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.25;               /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-fixture-home { text-align: right; }  /* the two clubs face the middle… */
.infographic-fixture-away { text-align: left; }   /* …so the score sits between them */

/* The middle — an amber score chip on a finished match, a dim "v" on an upcoming one. */
.infographic-fixture-mid {
  flex-shrink: 0;                  /* the middle keeps its width whatever the names do */
  min-width: calc(64px * var(--scale));  /* one shared column — the clubs align either side */
  text-align: center;              /* centred between the two clubs */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* a "v" is quiet by nature */
  font-weight: 500;                /* medium — this is the unplayed state */
  color: var(--text-dim);          /* dimmed — nothing has happened yet */
}
/* A played match: the score becomes an amber chip, so results read at a glance among fixtures. */
.infographic-fixture-played .infographic-fixture-mid {
  padding: calc(4px * var(--scale)) calc(10px * var(--scale));  /* the chip's own frame */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);  /* a thin amber keyline */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* a result is louder than a fixture */
  font-weight: var(--display-weight);  /* the house display weight */
  color: var(--accent);            /* the results wear the accent */
  font-variant-numeric: tabular-nums;  /* scores align down the column */
}`,

      tokens: {
        labelTracking: '0.2em',
      },
      fields: fixtureFields(rowsText, headingText, noteText),

      // The shared fixtures rebuild — "when | home | result | away", or without the result
      // for an upcoming match (sportsRuntimes.ts).
      runtimeExtraJs: fixtureRowsRuntimeJs(),
    };
  },
);

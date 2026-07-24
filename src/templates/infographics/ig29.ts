// ig29 "Club Fixtures" — the minimal fixtures and results board, and the pack's amateur one.
// Sibling of ig33 "Club Table" and ig29 "Club Lineup".
//
// The board a district league posts on a Saturday evening: every result from the division on
// one flat panel, full club names, no blur and no glow, so it survives being screenshotted and
// pushed to a club's social feed by whoever ran the stream.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { fixtureRowsRuntimeJs } from './sportsRuntimes';
import { fixtureFields, listBoardHtml } from './sportsFields';

const ROWS = [
  'SAT 15:00 | Ashton United | 2-2 | Marske Town',
  'SAT 15:00 | Guisborough | 1-0 | Thornaby',
  'SAT 15:00 | Redcar Athletic | 3-1 | Billingham',
  'TUE 19:45 | Shildon | Newton Aycliffe',
].join('\n');

export const ig29: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig29',
    category: 'infographic',
    name: 'Club Fixtures',
    styleTag: 'minimal',
    description: 'The amateur results board: full club names on a flat panel, scores in accent.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Fixtures', sample: ROWS },
      { title: 'Heading', sample: 'SATURDAY’S RESULTS' },
      { title: 'Competition / round', sample: 'Division One' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Club Fixtures',
    description:
      'The local and amateur fixtures and results board, sibling of ig33 Club Table and ig29 ' +
      'Club Lineup: a flat panel with a small heading, the division beside it, and one row per ' +
      'match with full club names and the score in the accent. No blur and no glow — it is ' +
      'drawn to stay legible after someone screenshots it for a club feed.',
    uicolor: '1',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'SATURDAY’S RESULTS';
    const noteText = o.lines[2]?.sample || 'Division One';

    return {
      html: listBoardHtml({
        note: 'Club Fixtures: flat panel — small heading, then one row per match.',
        heading: headingText,
        sub: noteText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('inter'))}

/* The panel — flat and solid. No blur: a club stream's bitrate cannot afford one. */
.infographic-box {
  min-width: calc(943px * var(--scale));  /* a board — two full club names and a score per row */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(34px * var(--scale)) calc(40px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  border-left: var(--accent-weight) solid var(--accent);  /* the family's one accent rule */
}

/* The header — a small tracked heading with the division beside it. */
.infographic-header {
  display: flex;                   /* heading and division in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(27px * var(--scale));  /* the division never crowds the heading */
}
.infographic-heading {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* small: this line is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-wrap: balance;              /* a long heading wraps into even rows */
}
.infographic-sub {
  flex-shrink: 0;                  /* the division keeps its width */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* level with the heading */
  font-weight: 500;                /* medium — quieter than the heading beside it */
  color: var(--text-dim);          /* dimmed — never full accent twice in one header */
  white-space: nowrap;             /* "Division One" stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* The rule — the family's one divider. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(20px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.20);  /* the family's divider */
}

/* The board — match rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one match row under another */
}

/* One match row: [kick-off] [home] [score or v] [away]. */
.infographic-fixture-row {
  display: flex;                   /* every part of the match on one line */
  align-items: baseline;           /* the text sizes sit on one baseline */
  gap: calc(20px * var(--scale));  /* clear air between the columns */
  padding: calc(15px * var(--scale)) 0;  /* even vertical rhythm down the board */
}
.infographic-fixture-row + .infographic-fixture-row {
  border-top: 1px solid rgba(255, 255, 255, 0.10);  /* keyline hairline between matches */
}

/* The kick-off — small, dim, in a shared column so the clubs line up. */
.infographic-fixture-when {
  flex-shrink: 0;                  /* a long club name never squeezes the time */
  min-width: calc(148px * var(--scale));  /* one shared column width — the clubs align */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* "sat" reads as "SAT", whatever is typed */
  color: var(--text-dim);          /* dimmed — the clubs carry the row */
  font-variant-numeric: tabular-nums;  /* times align down the column */
  white-space: nowrap;             /* "SAT 15:00" stays on one line */
}

/* The two clubs — full names in sentence case, facing the middle. */
.infographic-fixture-side {
  flex: 1;                         /* the two clubs share the row's spare width evenly */
  min-width: 0;                    /* allow a long club name to shrink and wrap */
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: 500;                /* medium — a results board is a list, not a headline */
  line-height: 1.3;                /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-fixture-home { text-align: right; }  /* the two clubs face the middle… */
.infographic-fixture-away { text-align: left; }   /* …so the score sits between them */

/* The middle — the score in the accent, or a dim "v" on a match not yet played. */
.infographic-fixture-mid {
  flex-shrink: 0;                  /* the middle keeps its width whatever the names do */
  min-width: calc(98px * var(--scale));  /* one shared column — the clubs align either side */
  text-align: center;              /* centred between the two clubs */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* a "v" is quiet by nature */
  font-weight: 500;                /* medium — this is the unplayed state */
  color: var(--text-dim);          /* dimmed — nothing has happened yet */
}
/* A played match: the score takes the accent and the weight, with no chrome around it —
   this family marks with type, not with tiles. */
.infographic-fixture-played .infographic-fixture-mid {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* a result is louder than a fixture */
  font-weight: 700;                /* bold — the score is the point of a results board */
  color: var(--accent);            /* the results wear the accent */
  font-variant-numeric: tabular-nums;  /* scores align down the column */
}`,
      fields: fixtureFields(rowsText, headingText, noteText),

      // The shared fixtures rebuild — "when | home | result | away", or without the result
      // for an upcoming match (sportsRuntimes.ts).
      runtimeExtraJs: fixtureRowsRuntimeJs(),
    };
  },
);

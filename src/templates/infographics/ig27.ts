// ig27 "Volt Fixtures" — the sport fixtures and results board, sibling of ig19 "Volt Table"
// and ig10 "Volt Schedule". A hard slab round-up: the heading on an accent bar, matches in
// heavy caps, results in filled accent blocks.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { fixtureRowsRuntimeJs } from './sportsRuntimes';
import { fixtureFields, listBoardHtml } from './sportsFields';

const ROWS = [
  'FRI 19:00 | RANGERS | 4-3 | BRUINS',
  'SAT 18:00 | OILERS | 2-1 | KINGS',
  'SAT 20:30 | AVALANCHE | STARS',
  'SUN 17:00 | PANTHERS | LIGHTNING',
].join('\n');

export const ig27: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig27',
    category: 'infographic',
    name: 'Volt Fixtures',
    styleTag: 'sport',
    description: 'A sport slab round-up: an accent heading bar, heavy caps, results in filled blocks.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Fixtures', sample: ROWS },
      { title: 'Heading', sample: 'AROUND THE LEAGUE' },
      { title: 'Competition / round', sample: 'WEEK 12' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Fixtures',
    description:
      'The sport fixtures and results board, sibling of ig19 Volt Table and ig10 Volt Schedule: ' +
      'a hard slab with the heading on a solid accent bar, the round beside it, and one row per ' +
      'match in heavy caps — the score in a filled accent block on a finished match, a dim "v" ' +
      'on an upcoming one.',
    uicolor: '2',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'AROUND THE LEAGUE';
    const noteText = o.lines[2]?.sample || 'WEEK 12';

    return {
      html: listBoardHtml({
        note: 'Volt Fixtures: sport slab — accent heading bar, then one row per match.',
        heading: headingText,
        sub: noteText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. Contrast, not blur, carries this family. */
.infographic-box {
  min-width: calc(600px * var(--scale));  /* a board — two club names and a score per row */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the accent bar stops at the slab's edge */
}

/* The header — a solid accent bar carrying the heading, with the round beside it. */
.infographic-header {
  display: flex;                   /* heading and round in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(18px * var(--scale));  /* the round never crowds the heading */
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
}
.infographic-sub {
  flex-shrink: 0;                  /* the round keeps its width */
  font-family: var(--font-label);  /* one label voice across the bar */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* a sport bar runs in caps throughout */
  color: color-mix(in srgb, var(--accent-ink) 75%, transparent);  /* the ink, stepped back */
  white-space: nowrap;             /* "WEEK 12" stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* No separate rule: the accent bar IS the header's edge. */
.infographic-rule { display: none; }

/* The board — match rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one match row under another */
  padding: calc(6px * var(--scale)) calc(24px * var(--scale)) calc(14px * var(--scale));
}

/* One match row: [kick-off] [HOME] [score block or v] [AWAY]. */
.infographic-fixture-row {
  display: flex;                   /* every part of the match on one line */
  align-items: center;             /* the block and the names share a centre line */
  gap: calc(14px * var(--scale));  /* clear air between the columns */
  padding: calc(9px * var(--scale)) 0;  /* even vertical rhythm down the board */
}
.infographic-fixture-row + .infographic-fixture-row {
  border-top: 1px solid rgba(255, 255, 255, 0.09);  /* keyline hairline between matches */
}

/* The kick-off — tracked caps, dim, in a shared column. */
.infographic-fixture-when {
  flex-shrink: 0;                  /* a long club name never squeezes the time */
  min-width: calc(96px * var(--scale));  /* one shared column width — the clubs align */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* "fri" reads as "FRI", whatever is typed */
  color: var(--text-dim);          /* dimmed — the clubs carry the row */
  font-variant-numeric: tabular-nums;  /* times align down the column */
  white-space: nowrap;             /* "FRI 19:00" stays on one line */
}

/* The two clubs — heavy condensed caps, facing the middle. */
.infographic-fixture-side {
  flex: 1;                         /* the two clubs share the row's spare width evenly */
  min-width: 0;                    /* allow a long club name to shrink and wrap */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* tight — condensed caps need little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* a sport round-up runs in caps */
  color: var(--text-color);        /* paper white on the slab */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-fixture-home { text-align: right; }  /* the two clubs face the middle… */
.infographic-fixture-away { text-align: left; }   /* …so the score sits between them */

/* The middle — a filled accent block on a finished match, a dim "v" on an upcoming one. */
.infographic-fixture-mid {
  flex-shrink: 0;                  /* the middle keeps its width whatever the names do */
  min-width: calc(66px * var(--scale));  /* one shared column — the clubs align either side */
  text-align: center;              /* centred between the two clubs */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a "v" is quiet by nature */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* the marker reads as a label */
  color: var(--text-dim);          /* dimmed — nothing has happened yet */
}
/* A played match: the score becomes a filled accent block, the fastest thing on the board. */
.infographic-fixture-played .infographic-fixture-mid {
  padding: calc(4px * var(--scale)) calc(8px * var(--scale));  /* the block's own frame */
  background: var(--accent);       /* the block itself */
  font-family: inherit;            /* the score is display type, not a label */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a result is louder than a fixture */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  letter-spacing: normal;          /* a score is not tracked */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
  font-variant-numeric: tabular-nums;  /* scores align down the column */
}`,
      fields: fixtureFields(rowsText, headingText, noteText),

      // The shared fixtures rebuild — "when | home | result | away", or without the result
      // for an upcoming match (sportsRuntimes.ts).
      runtimeExtraJs: fixtureRowsRuntimeJs(),
    };
  },
);

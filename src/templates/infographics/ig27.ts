// ig27 "Volt Lineup" — the sport team sheet, sibling of ig10 "Volt Schedule" and lt06
// "Split Bar". A hard slab column: the heading on a solid accent bar, then one heavy row per
// player with the shirt number in an accent block.
//
// Numbers get their own filled block here rather than a coloured column, because a sport
// lineup is read at speed from a wide shot: the eye finds the block, then the name.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { rosterRowsRuntimeJs } from './sportsRuntimes';
import { lineupFields, listBoardHtml } from './sportsFields';

const ROWS = [
  '30 | CURRY | PG',
  '22 | WIGGINS | SF',
  '23 | GREEN | PF',
  '5 | LOONEY | C',
  '3 | PODZIEMSKI | SG',
].join('\n');

export const ig27: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig27',
    category: 'infographic',
    name: 'Volt Lineup',
    styleTag: 'sport',
    description: 'A sport slab team sheet: an accent heading bar and heavy rows with number blocks.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Lineup', sample: ROWS },
      { title: 'Heading', sample: 'STARTING FIVE' },
      { title: 'Formation / subtitle', sample: 'GOLDEN STATE' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Lineup',
    description:
      'The sport team sheet, sibling of ig10 Volt Schedule and lt06 Split Bar: a hard slab with ' +
      'the heading on a solid accent bar, the team name beside it, and one heavy row per player ' +
      'with the shirt number in a filled accent block. Type one "number | name | position" line ' +
      'per player; both the number and the position are optional.',
    uicolor: '2',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'STARTING FIVE';
    const subText = o.lines[2]?.sample || 'GOLDEN STATE';

    return {
      html: listBoardHtml({
        note: 'Volt Lineup: sport slab — accent heading bar, then number-blocked player rows.',
        heading: headingText,
        sub: subText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. Contrast, not blur, carries this family. */
.infographic-box {
  min-width: calc(440px * var(--scale));  /* a team sheet column, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the accent bar stops at the slab's edge */
}

/* The header — a solid accent bar carrying the heading, with the team name beside it. */
.infographic-header {
  display: flex;                   /* heading and team name in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(18px * var(--scale));  /* the team name never crowds the heading */
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
  flex-shrink: 0;                  /* the team name keeps its width */
  font-family: var(--font-label);  /* one label voice across the bar */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* a sport bar runs in caps throughout */
  color: color-mix(in srgb, var(--accent-ink) 75%, transparent);  /* the ink, stepped back */
  white-space: nowrap;             /* a club name stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* No separate rule: the accent bar IS the header's edge. */
.infographic-rule { display: none; }

/* The board — player rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one player row under another */
  padding: calc(6px * var(--scale)) calc(24px * var(--scale)) calc(14px * var(--scale));
}

/* One player row: [number block] [NAME] [POS]. */
.infographic-roster-row {
  display: flex;                   /* number, name and position share one line */
  align-items: center;             /* the block and the text share a centre line */
  gap: calc(16px * var(--scale));  /* clear air between the columns */
  padding: calc(8px * var(--scale)) 0;  /* even vertical rhythm down the sheet */
}
.infographic-roster-row + .infographic-roster-row {
  border-top: 1px solid rgba(255, 255, 255, 0.09);  /* keyline hairline between players */
}

/* The shirt number — a filled accent block, the fastest thing on the board to find. */
.infographic-num {
  flex-shrink: 0;                  /* a long name never squeezes the block */
  min-width: calc(42px * var(--scale));  /* one shared block width — the names align */
  padding: calc(4px * var(--scale)) calc(6px * var(--scale));  /* the block's own frame */
  text-align: center;              /* the figure is centred in its block */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.2;                /* the figure fills its block */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
  background: var(--accent);       /* the block itself */
  font-variant-numeric: tabular-nums;  /* equal-width digits — blocks stay the same size */
}

/* The player's name — heavy condensed caps, the sport family's voice. */
.infographic-player {
  flex: 1;                         /* the name takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* tight — condensed caps need little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* a sport lineup runs in caps */
  color: var(--text-color);        /* paper white on the slab */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}

/* The position — dimmed, tracked, closing the row. */
.infographic-role {
  flex-shrink: 0;                  /* the position keeps its width */
  min-width: calc(40px * var(--scale));  /* a shared column — positions align down the sheet */
  text-align: right;               /* aligned to the slab's right edge */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* position codes are caps, whatever is typed */
  color: var(--text-dim);          /* dimmed — the position is reference, not headline */
  white-space: nowrap;             /* "PG" and "LWB" stay on one line */
}`,
      fields: lineupFields(rowsText, headingText, subText),

      // The shared team-sheet rebuild — one "number | name | position" per line.
      runtimeExtraJs: rosterRowsRuntimeJs(),
    };
  },
);

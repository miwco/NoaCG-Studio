// ig14 "House Lineup" — the NoaCG team sheet, sibling of ig08 "House Schedule" and lt11
// "House Strap". The starting eleven (or the squad, or the relay order) as a void panel:
// a mono heading, the formation beside it, then one row per player.
//
// The squad is ONE repeating field — "number | name | position", one player per line — which
// is what keeps this usable. A board with a field per player would need twenty-six of them and
// would still be wrong for a five-a-side; a board with one textarea takes a squad pasted out of
// a team sheet, and adding a late change is typing a line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { rosterRowsRuntimeJs } from './sportsRuntimes';
import { lineupFields, listBoardHtml } from './sportsFields';

const ROWS = [
  '1 | Raya | GK',
  '4 | White | RB',
  '6 | Gabriel | CB',
  '2 | Saliba | CB',
  '35 | Zinchenko | LB',
  '41 | Rice | CM',
  '8 | Ødegaard | CM',
  '29 | Havertz | CM',
  '7 | Saka | RW',
  '9 | Jesus | ST',
  '19 | Trossard | LW',
].join('\n');

export const ig14: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig14',
    category: 'infographic',
    name: 'House Lineup',
    styleTag: 'noacg',
    description: 'The house team sheet: a mono heading, the formation, and one row per player.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Lineup', sample: ROWS },
      { title: 'Heading', sample: 'STARTING XI' },
      { title: 'Formation / subtitle', sample: '4-3-3' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-left',
  },
  {
    name: 'House Lineup',
    description:
      'The NoaCG team sheet, sibling of ig08 House Schedule and lt11 House Strap: a void panel ' +
      'with an amber top edge, a tracked mono heading with the formation on a chip beside it, ' +
      'and one row per player — shirt number in an amber column, name in display type, position ' +
      'dimmed at the end. Type one "number | name | position" line per player; the number and ' +
      'the position are optional, so an amateur team sheet works unchanged.',
    uicolor: '4',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'STARTING XI';
    const subText = o.lines[2]?.sample || '4-3-3';

    return {
      html: listBoardHtml({
        note: 'House Lineup: void panel — heading + formation chip, then the player rows.',
        heading: headingText,
        sub: subText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, sized as a tall board with the family's amber top edge. */
.infographic-box {
  min-width: calc(460px * var(--scale));  /* a team sheet column, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(26px * var(--scale)) calc(32px * var(--scale)) calc(16px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The header — the heading and the formation chip on one row. */
.infographic-header {
  display: flex;                   /* heading and chip in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(20px * var(--scale));  /* the chip never crowds a long heading */
}

/* Heading — the house mono accent kicker, the panel's loudest colour moment. */
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

/* The formation — a small mono chip, dimmed: it is context, not the headline. */
.infographic-sub {
  flex-shrink: 0;                  /* the chip keeps its width whatever the heading does */
  font-family: var(--font-label);  /* one mono voice across the header */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 500;                /* matches the heading's weight */
  line-height: 1.2;                /* compact inside the chip */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  color: var(--text-dim);          /* dimmed — never full accent twice in one header */
  white-space: nowrap;             /* "4-2-3-1" stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* The rule — a thin dim keyline under the header, closing the header block. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(16px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.14);  /* dim, not accent — the colour stays in the header */
}

/* The board — player rows stacked; each row carries its own separator. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one player row under another */
}

/* One player row: [amber number] [name] [position]. */
.infographic-roster-row {
  display: flex;                   /* number, name and position share one line */
  align-items: baseline;           /* the three text sizes sit on one baseline */
  gap: calc(18px * var(--scale));  /* clear air between the columns */
  padding: calc(9px * var(--scale)) 0;  /* even vertical rhythm down the sheet */
}
.infographic-roster-row + .infographic-roster-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);  /* keyline hairline between players */
}

/* The shirt number — amber, tabular, in a shared column so the names line up. */
.infographic-num {
  flex-shrink: 0;                  /* a long name never squeezes the number */
  min-width: calc(38px * var(--scale));  /* one shared column width — the names align */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.2;                /* on the row's baseline */
  color: var(--accent);            /* the numbers carry the accent */
  font-variant-numeric: tabular-nums;  /* equal-width digits — numbers align down the column */
}

/* The player's name — the row's anchor, in house display type. */
.infographic-player {
  flex: 1;                         /* the name takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.25;               /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}

/* The position — dimmed and small, closing the row. */
.infographic-role {
  flex-shrink: 0;                  /* the position keeps its width */
  min-width: calc(42px * var(--scale));  /* a shared column — positions align down the sheet */
  text-align: right;               /* aligned to the panel's right edge */
  font-family: var(--font-label);  /* mono: a position code is data, not display type */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* position codes are caps, whatever is typed */
  color: var(--text-dim);          /* dimmed — the position is reference, not headline */
  white-space: nowrap;             /* "GK" and "LWB" stay on one line */
}`,

      tokens: {
        labelTracking: '0.2em',
      },
      fields: lineupFields(rowsText, headingText, subText),

      // The shared team-sheet rebuild — one "number | name | position" per line.
      runtimeExtraJs: rosterRowsRuntimeJs(),
    };
  },
);

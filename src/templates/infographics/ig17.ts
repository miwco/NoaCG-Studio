// ig17 "Club Lineup" — the minimal team sheet, and the pack's amateur one. Sibling of ig06
// "Schedule Board" and lt01 "Hairline".
//
// Built for the club that types its team sheet an hour before kick-off from a group chat, so
// it assumes the least: no shirt numbers, no position codes, full names in sentence case. The
// runtime treats both of those as optional, and this design is drawn so a sheet of bare names
// still reads as a considered graphic rather than as a list with two empty columns.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { rosterRowsRuntimeJs } from './sportsRuntimes';
import { lineupFields, listBoardHtml } from './sportsFields';

const ROWS = [
  'Tom Braithwaite | GK',
  'Dan Whitehead',
  'Sam Okoye',
  'Ryan Pearce',
  'Jack Milburn',
  'Callum Reid',
  'Owen Fletcher',
].join('\n');

export const ig17: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig17',
    category: 'infographic',
    name: 'Club Lineup',
    styleTag: 'minimal',
    description: 'The amateur team sheet: full names, a hairline stack, numbers and positions optional.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Lineup', sample: ROWS },
      { title: 'Heading', sample: 'TODAY’S SQUAD' },
      { title: 'Formation / subtitle', sample: 'Ashton United' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Club Lineup',
    description:
      'The local and amateur team sheet, sibling of ig06 Schedule Board and lt01 Hairline: a ' +
      'flat panel with a small heading over the club name, a keyline, and full player names in ' +
      'sentence case. Shirt numbers and positions are optional and the layout does not reserve ' +
      'empty columns for them — a sheet of bare names still reads as a finished graphic.',
    uicolor: '1',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'TODAY’S SQUAD';
    const subText = o.lines[2]?.sample || 'Ashton United';

    return {
      html: listBoardHtml({
        note: 'Club Lineup: flat panel — heading over the club name, then the player rows.',
        heading: headingText,
        sub: subText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('inter'))}

/* The panel — flat and solid. No blur: a club stream's bitrate cannot afford one. */
.infographic-box {
  min-width: calc(400px * var(--scale));  /* a team sheet column, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(22px * var(--scale)) calc(26px * var(--scale)) calc(14px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  border-left: var(--accent-weight) solid var(--accent);  /* the family's one accent rule */
}

/* The header — a small tracked heading over the club name. */
.infographic-header {
  display: flex;                   /* heading and club name… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(3px * var(--scale));   /* the two read as one block */
}
.infographic-heading {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* small: this line is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}
.infographic-sub {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the header's anchor */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.25;               /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text on the panel */
  text-wrap: balance;              /* a long club name wraps into even rows */
}

/* The rule — the family's one divider. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(14px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.20);  /* the family's divider */
}

/* The board — player rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one player row under another */
}

/* One row: [optional number] [name] [optional position]. Nothing reserves space for the
   optional parts, so a sheet of bare names closes up rather than leaving gaps. */
.infographic-roster-row {
  display: flex;                   /* number, name and position share one line */
  align-items: baseline;           /* the text sizes sit on one baseline */
  gap: calc(12px * var(--scale));  /* clear air between whatever parts are present */
  padding: calc(7px * var(--scale)) 0;  /* even vertical rhythm down the sheet */
}
.infographic-roster-row + .infographic-roster-row {
  border-top: 1px solid rgba(255, 255, 255, 0.10);  /* keyline hairline between players */
}

/* The shirt number — accent, tabular, and only present when one was typed. */
.infographic-num {
  flex-shrink: 0;                  /* a long name never squeezes the number */
  min-width: calc(26px * var(--scale));  /* narrow: most club sheets have no numbers at all */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: 700;                /* bold — the number is a marker */
  line-height: 1.2;                /* on the row's baseline */
  color: var(--accent);            /* the numbers carry the accent */
  font-variant-numeric: tabular-nums;  /* equal-width digits — numbers align down the column */
}

/* The player's name — full names in sentence case, the row's anchor. */
.infographic-player {
  flex: 1;                         /* the name takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: 500;                /* medium — a club sheet is a list, not a headline */
  line-height: 1.3;                /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}

/* The position — dimmed, small, and only present when one was typed. */
.infographic-role {
  flex-shrink: 0;                  /* the position keeps its width */
  font-size: calc(12px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* position codes are caps, whatever is typed */
  color: var(--text-dim);          /* dimmed — the position is reference, not headline */
  white-space: nowrap;             /* "GK" stays on one line */
}`,
      fields: lineupFields(rowsText, headingText, subText),

      // The shared team-sheet rebuild — one "number | name | position" per line.
      runtimeExtraJs: rosterRowsRuntimeJs(),
    };
  },
);

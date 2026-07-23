// ig16 "Frost Lineup" — the glass team sheet, sibling of ig09 "Frost Schedule" and lt08
// "Frosted Card". A frosted column: a soft heading with the squad's context beside it, then
// one airy row per athlete with the number in a glass pill.
//
// Drawn with more air per row than the other three, because the individual sports this family
// serves — swimming heats, athletics lane draws, a fight card — list fewer entries and read
// better spaced than packed.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { rosterRowsRuntimeJs } from './sportsRuntimes';
import { lineupFields, listBoardHtml } from './sportsFields';

const ROWS = [
  '4 | Sifan Hassan | NED',
  '2 | Gudaf Tsegay | ETH',
  '7 | Faith Kipyegon | KEN',
  '5 | Laura Muir | GBR',
  '3 | Jessica Hull | AUS',
].join('\n');

export const ig16: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig16',
    category: 'infographic',
    name: 'Frost Lineup',
    styleTag: 'glass',
    description: 'A frosted start list: a soft heading, and airy rows with the number in a glass pill.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Lineup', sample: ROWS },
      { title: 'Heading', sample: 'START LIST' },
      { title: 'Formation / subtitle', sample: "Women's 1500m final" },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-left',
  },
  {
    name: 'Frost Lineup',
    description:
      'The glass team sheet and start list, sibling of ig09 Frost Schedule and lt08 Frosted ' +
      'Card: a frosted column with a soft heading, the event named beneath it, and airy rows ' +
      'carrying a lane or shirt number in a glass pill. Spaced for the individual sports — ' +
      'heats, lane draws, fight cards — where a list is short and read slowly.',
    uicolor: '5',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'START LIST';
    const subText = o.lines[2]?.sample || "Women's 1500m final";

    return {
      html: listBoardHtml({
        note: 'Frost Lineup: frosted column — soft heading, event line, then glass-pilled rows.',
        heading: headingText,
        sub: subText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface, with more air than the other lineup boards. */
.infographic-box {
  min-width: calc(440px * var(--scale));  /* a start list column, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(24px * var(--scale)) calc(28px * var(--scale)) calc(16px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
}

/* The header — the heading over the event line, stacked rather than side by side: an event
   name is a sentence, and a sentence beside a label crowds both. */
.infographic-header {
  display: flex;                   /* heading and event line… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(4px * var(--scale));   /* the two read as one block */
}
.infographic-heading {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}
.infographic-sub {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the header's anchor */
  font-weight: 600;                /* semibold — present without shouting */
  line-height: 1.25;               /* comfortable for a mixed-case event name */
  color: var(--text-color);        /* primary text on the frost */
  text-wrap: balance;              /* a long event name wraps into even rows */
}

/* The rule — a glass keyline under the header. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(16px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.22);  /* the glass keyline */
}

/* The board — athlete rows stacked, generously. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one athlete row under another */
}

/* One row: [glass pill] [name] [nation]. */
.infographic-roster-row {
  display: flex;                   /* pill, name and nation share one line */
  align-items: center;             /* all three on the row's centre line */
  gap: calc(16px * var(--scale));  /* clear air between the columns */
  padding: calc(12px * var(--scale)) 0;  /* airy vertical rhythm — the family's register */
}
.infographic-roster-row + .infographic-roster-row {
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the glass keyline, dimmed */
}

/* The lane or shirt number — a soft glass pill. */
.infographic-num {
  flex-shrink: 0;                  /* a long name never squeezes the pill */
  min-width: calc(34px * var(--scale));  /* one shared pill width — the names align */
  padding: calc(4px * var(--scale)) calc(8px * var(--scale));  /* the pill's own frame */
  text-align: center;              /* the figure is centred in its pill */
  border-radius: calc(999px * var(--scale));  /* a true pill at any scale */
  background: rgba(255, 255, 255, 0.14);  /* a second, lighter layer of glass */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);  /* the glass keyline */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* reference scale, not display */
  font-weight: 800;                /* heavy at pill size so it reads through the softening */
  line-height: 1.2;                /* compact inside the pill */
  color: var(--accent);            /* the numbers carry the accent */
  font-variant-numeric: tabular-nums;  /* equal-width digits — pills stay the same size */
}

/* The athlete's name — the row's anchor, in the family's rounded sans. */
.infographic-player {
  flex: 1;                         /* the name takes the row's spare width */
  min-width: 0;                    /* allow it to shrink and wrap inside flex */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: 600;                /* semibold — present without shouting */
  line-height: 1.25;               /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the frost */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}

/* The nation or position — dimmed and tracked, closing the row. */
.infographic-role {
  flex-shrink: 0;                  /* the code keeps its width */
  min-width: calc(46px * var(--scale));  /* a shared column — codes align down the list */
  text-align: right;               /* aligned to the card's right edge */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* nation codes are caps, whatever is typed */
  color: var(--text-dim);          /* dimmed — the code is reference, not headline */
  white-space: nowrap;             /* "NED" and "RSA" stay on one line */
}`,
      fields: lineupFields(rowsText, headingText, subText),

      // The shared team-sheet rebuild — one "number | name | position" per line.
      runtimeExtraJs: rosterRowsRuntimeJs(),
    };
  },
);

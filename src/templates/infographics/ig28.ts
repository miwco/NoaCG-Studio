// ig28 "Frost Fixtures" — the glass fixtures and results board, sibling of ig32 "Frost Table"
// and ig09 "Frost Schedule". A frosted round-up with the score in a soft accent pill.
//
// This is also the pack's UPCOMING-MATCH board in its lightest form: with a single row and no
// score typed, it reads as "next match", which is exactly what a hold screen or a break bumper
// wants beside the clock.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { fixtureRowsRuntimeJs } from './sportsRuntimes';
import { fixtureFields, listBoardHtml } from './sportsFields';

const ROWS = [
  'THU 18:00 | Norway | 31-28 | Denmark',
  'FRI 20:15 | France | Sweden',
  'SAT 15:00 | Hungary | Germany',
].join('\n');

export const ig28: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig28',
    category: 'infographic',
    name: 'Frost Fixtures',
    styleTag: 'glass',
    description: 'A frosted fixtures board: soft rows with the score in an accent-tinted pill.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Fixtures', sample: ROWS },
      { title: 'Heading', sample: 'MAIN ROUND' },
      { title: 'Competition / round', sample: 'Group 1' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Fixtures',
    description:
      'The glass fixtures and results board, sibling of ig32 Frost Table and ig09 Frost ' +
      'Schedule: a frosted card with a soft heading, the round beside it, and one airy row per ' +
      'match — the score in an accent-tinted pill, or a quiet "v" when the match has not been ' +
      'played. With one row and no score it reads as a next-match board.',
    uicolor: '5',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'MAIN ROUND';
    const noteText = o.lines[2]?.sample || 'Group 1';

    return {
      html: listBoardHtml({
        note: 'Frost Fixtures: frosted card — soft heading, then one airy row per match.',
        heading: headingText,
        sub: noteText,
        subField: 'f2',
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface holding the whole round-up. */
.infographic-box {
  min-width: calc(862px * var(--scale));  /* a board — two names and a score per row */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(34px * var(--scale)) calc(40px * var(--scale)) calc(18px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
}

/* The header — the heading and the round on one row. */
.infographic-header {
  display: flex;                   /* heading and round in one row */
  align-items: baseline;           /* both on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(25px * var(--scale));  /* the round never crowds the heading */
}
.infographic-heading {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-wrap: balance;              /* a long heading wraps into even rows */
}
.infographic-sub {
  flex-shrink: 0;                  /* the round keeps its width */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 600;                /* semibold — present without shouting */
  color: var(--text-dim);          /* dimmed — never full accent twice in one header */
  white-space: nowrap;             /* "Group 1" stays on one line */
  text-wrap: nowrap;               /* the longhand that beats the assembler's \`balance\` */
}

/* The rule — a glass keyline under the header. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(18px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.22);  /* the glass keyline */
}

/* The board — match rows stacked, with the family's generous spacing. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one match row under another */
}

/* One match row: [kick-off] [home] [score pill or v] [away]. */
.infographic-fixture-row {
  display: flex;                   /* every part of the match on one line */
  align-items: center;             /* the pill and the names share a centre line */
  gap: calc(22px * var(--scale));  /* clear air between the columns */
  padding: calc(18px * var(--scale)) 0;  /* airy vertical rhythm — the family's register */
}
.infographic-fixture-row + .infographic-fixture-row {
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the glass keyline, dimmed */
}

/* The kick-off — a small tracked label in a shared column. */
.infographic-fixture-when {
  flex-shrink: 0;                  /* a long name never squeezes the time */
  min-width: calc(142px * var(--scale));  /* one shared column width — the names align */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* reference scale */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* "thu" reads as "THU", whatever is typed */
  color: var(--text-dim);          /* dimmed — the names carry the row */
  font-variant-numeric: tabular-nums;  /* times align down the column */
  white-space: nowrap;             /* "THU 18:00" stays on one line */
}

/* The two sides — the row's anchors, in the family's rounded sans. */
.infographic-fixture-side {
  flex: 1;                         /* the two sides share the row's spare width evenly */
  min-width: 0;                    /* allow a long name to shrink and wrap */
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* the biggest text in the row */
  font-weight: 600;                /* semibold — present without shouting */
  line-height: 1.25;               /* relaxed leading in case a long name wraps */
  color: var(--text-color);        /* primary text on the frost */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}
.infographic-fixture-home { text-align: right; }  /* the two sides face the middle… */
.infographic-fixture-away { text-align: left; }   /* …so the score sits between them */

/* The middle — an accent-tinted pill on a finished match, a quiet "v" on an upcoming one. */
.infographic-fixture-mid {
  flex-shrink: 0;                  /* the middle keeps its width whatever the names do */
  min-width: calc(108px * var(--scale));  /* one shared column — the names align either side */
  text-align: center;              /* centred between the two sides */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* a "v" is quiet by nature */
  font-weight: 600;                /* semibold — this is the unplayed state */
  color: var(--text-dim);          /* dimmed — nothing has happened yet */
}
/* A played match: the score becomes a soft pill, so results read among fixtures. */
.infographic-fixture-played .infographic-fixture-mid {
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));  /* the pill's own frame */
  border-radius: calc(999px * var(--scale));  /* a true pill at any scale */
  background: color-mix(in srgb, var(--accent) 26%, transparent);  /* the accent, softened */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.20);  /* the glass keyline */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* a result is louder than a fixture */
  font-weight: 800;                /* heavy at pill size so it reads through the softening */
  color: var(--text-color);        /* white inside the tinted pill */
  font-variant-numeric: tabular-nums;  /* scores align down the column */
}`,
      fields: fixtureFields(rowsText, headingText, noteText),

      // The shared fixtures rebuild — "when | home | result | away", or without the result
      // for an upcoming match (sportsRuntimes.ts).
      runtimeExtraJs: fixtureRowsRuntimeJs(),
    };
  },
);

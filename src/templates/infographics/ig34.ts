// ig34 "Seat Board" - the EDITORIAL seat-count board, sibling of lt25 "Masthead" and card59
// "Edition Title". The election night mini-pack's first graphic (ig34-ig36): a flat ink sheet
// with a printed masthead rule, a tracked kicker naming the chamber, and one bar row per party
// - the name set on the left, a bar that grows against the biggest party, and the seat figure
// counting up at the bar's tip.
//
// The parties are ONE hidden textarea ("Party | seats" per line), not a field per party
// (dataRuntimes.ts, the canonical repeating-data system): a chamber has as many parties as it
// has, the control page stays one editor, and adding a party mid-count is typing a line. The
// motion is MEASURED for the same reason - both the number of bars and how far each one grows
// are the operator's content, so 'bars-grow' reads them at play time (igMotion.ts).
//
// It is the editorial counterpart of ig07 "Election Bars" (minimal), and deliberately a
// different graphic rather than a reskin: ig07 is a three-candidate PERCENTAGE board with a
// fixed field per candidate, this is an open-ended SEAT board whose rows are typed.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { seatBarsRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

// One line per party, in the order the desk wants them read - the runtime keeps that order and
// marks the leader itself, so a board can run in ballot order or in seat order.
const PARTIES_SAMPLE = [
  'Social Democrats | 46',
  'National Coalition | 41',
  'Centre | 28',
  'Greens | 19',
  'Left Alliance | 16',
].join('\n');

export const ig34: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig34',
    category: 'infographic',
    name: 'Seat Board',
    styleTag: 'editorial',
    description: 'A printed seat board: one bar per party, growing to the seats it has won.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Parties', sample: PARTIES_SAMPLE },
      { title: 'Chamber', sample: 'PARLIAMENT' },
      { title: 'Status', sample: '94% COUNTED' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Seat Board',
    description:
      'The editorial seat-count board, sibling of the lt25 Masthead lower third: a flat ink ' +
      'sheet with a printed rule, the chamber named in tracked caps beside the count status, ' +
      'and one bar row per party whose seat figure counts up at the tip. Type one ' +
      '"Party | seats" line per party - add, remove or reorder rows freely. The bars are drawn ' +
      'against the biggest party (so the board compares parties, not a half-empty chamber) and ' +
      'the leading row takes the accent by itself.',
    uicolor: '6',
  },
  (o) => {
    const partiesText = o.lines[0]?.sample || PARTIES_SAMPLE;
    const chamberText = o.lines[1]?.sample || 'PARLIAMENT';
    const statusText = o.lines[2]?.sample || '94% COUNTED';

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 1020,
      html: `    <!-- Seat Board: [printed rule] / [chamber + status] / one bar row per party. -->
    <div class="infographic-box">
      <!-- The masthead rule - the printed line the whole sheet hangs from. -->
      <div class="infographic-rule"></div>
      <!-- The head - the chamber on the left, how much of it is counted on the right. -->
      <div class="infographic-head">
        <div class="infographic-chamber" id="f1">${chamberText}</div>
        <div class="infographic-status" id="f2">${statusText}</div>
      </div>
      <!-- The rows - rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
      <!-- The unit line - what the figures at the bar tips are. A FIELD, not furniture: the
           same board counts seats, mandates or delegates, and it counts them in the language
           the channel broadcasts in. -->
      <div class="infographic-unit" id="f3">SEATS</div>
    </div>
    <!-- Hidden parties source - SPX writes field f0 here; JS renders it.
         One "Party | seats" per line. -->
    <div id="f0" class="noacg-data-source">${partiesText}</div>`,

      css: `/* The sheet - a flat printed surface, square corners, one restrained lift. Fixed width
   because the bar tracks need a stable run to be compared along. */
.infographic-box {
  width: calc(1020px * var(--scale));  /* fixed board width - every track is one length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(34px * var(--scale)) calc(52px * var(--scale)) calc(30px * var(--scale));  /* generous printed margins */
  background: var(--panel-bg);     /* the editorial ink or paper surface */
  border-radius: var(--panel-radius);  /* the family token is exactly zero */
  box-shadow: var(--panel-shadow); /* printed sheet lifted from the picture */
  text-align: left;                /* the zone centres a bottom-centre graphic's lines; a TABLE
                                      still reads from its own left edge (DESIGN_LANGUAGE §1 -
                                      centring wants a symmetric composition, and rows are not one) */
}

/* The masthead rule - the family's 2px printed line, drawn across the sheet's measure. */
.infographic-rule {
  height: var(--accent-weight);    /* the family's exact 2px printed rule */
  background: var(--accent);       /* the single accent colour */
}

/* The head - chamber and status share one baseline under the rule. */
.infographic-head {
  display: flex;                   /* chamber hugs left, status hugs right */
  justify-content: space-between;  /* pushed to the sheet's opposite edges */
  align-items: baseline;           /* both caps lines sit on one baseline */
  gap: calc(36px * var(--scale));  /* the two labels never touch */
  margin: calc(20px * var(--scale)) 0 calc(28px * var(--scale));  /* air under the rule, air before the rows */
}

/* The chamber - the sheet's masthead: set, not shouted (the editorial display weight). */
.infographic-chamber {
  min-width: 0;                    /* allow a long name to shrink and wrap inside flex */
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* masthead size - the rows still lead */
  font-weight: var(--display-weight);  /* the exact editorial 600 */
  line-height: 1.1;                /* large type sits tight */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  text-transform: uppercase;       /* masthead voice, whatever the operator types */
  color: var(--text-color);        /* primary ink */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The status - the count's own line, in the family's tracked accent caps. */
.infographic-status {
  flex-shrink: 0;                  /* a long chamber name never squeezes it */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 700;                /* labels stay crisp */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* label voice */
  white-space: nowrap;             /* a short status never wraps mid-word */
  font-variant-numeric: tabular-nums;  /* "94% COUNTED" climbs all night - no jitter */
  color: var(--label-color);       /* the accent-coloured editorial label */
}

/* The rows - one party row under another, on an even printed rhythm. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one party under another */
}

/* One party row: [name][track]. A hairline between rows is the editorial way to separate
   them - a printed table rules its rows, it does not float them apart. */
.infographic-row {
  display: flex;                   /* name and bar share one line */
  align-items: center;             /* the bar sits on the name's middle */
  gap: calc(28px * var(--scale));  /* name and track never touch */
  padding: calc(13px * var(--scale)) 0;  /* even air above and below each row */
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);  /* the printed row rule */
}
.infographic-row:last-child {
  border-bottom: none;             /* the last row is closed by the unit line, not a rule */
}

/* The party name - the row's reading line, in a fixed column so every track starts level. */
.infographic-party {
  width: calc(300px * var(--scale));  /* one shared column - the bars align vertically */
  flex-shrink: 0;                  /* the bar never squeezes the name */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly the row's primary line */
  font-weight: 500;                /* set type: the leading row carries emphasis, not every row */
  line-height: 1.2;                /* a wrapped long name stays compact */
  color: var(--text-color);        /* primary ink */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The leading party - the accent follows the count. The row's own weight steps up with it, so
   the lead survives a palette where the accent is quiet. */
.infographic-row.is-leading .infographic-party {
  font-weight: 700;                /* the lead is set heavier, not larger - the rhythm holds */
  color: var(--accent);            /* the sheet's one accent moment among the rows */
}
.infographic-row.is-leading .infographic-bar-fill {
  background: var(--accent);       /* the leading bar is the accent's main surface */
}

/* The track - the lane the fill grows inside. The right margin reserves a landing lane for the
   seat figure, so the biggest party's readout never leaves the sheet. */
.infographic-bar-track {
  position: relative;              /* the fill's percent width is measured against this */
  flex: 1;                         /* the track takes the row's remaining width */
  height: calc(26px * var(--scale));  /* a printed bar: solid, not a hairline */
  margin-right: calc(78px * var(--scale));  /* the readout's reserved landing lane */
  background: rgba(255, 255, 255, 0.08);  /* the empty lane on the ink sheet */
}

/* The fill - the bars-grow preset grows its width from 0% to its data-value percent.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens WIDTH
   because scaleX would squash its readout cap and drag the cap's anchor wrongly; the lane is
   one short strip per row, so the relayout stays cheap. */
.infographic-bar-fill {
  position: relative;              /* anchors the readout cap to the fill's tip */
  width: 0;                        /* fallback - the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  background: rgba(255, 255, 255, 0.30);  /* the trailing parties: one printed ink tone */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The readout cap - the seat figure just past the fill's tip; it rides the growth for free. */
.infographic-bar-cap {
  position: absolute;              /* anchored to the fill, not the lane */
  left: 100%;                      /* at the fill's tip... */
  top: 50%;                        /* ...on the bar's centre line */
  transform: translate(calc(16px * var(--scale)), -50%);  /* a thin seam past the tip */
  white-space: nowrap;             /* a seat figure never wraps */
}

/* The seat figure - the news of the row; infographicBarsGrow() counts it up from 0. */
.infographic-bar-num {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* louder than the name - the figure is the count */
  font-weight: 700;                /* the heaviest thing in the row */
  line-height: 1;                  /* hugs the bar's centre line */
  font-variant-numeric: tabular-nums;  /* digits keep one width - no jitter while counting */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-color);        /* primary ink */
}

/* The unit line - what the figures are, in the quiet register under the last row. */
.infographic-unit {
  margin-top: calc(16px * var(--scale));  /* clear air after the last row */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 400;                /* the quietest voice on the sheet */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-align: right;               /* sits under the readout lane it names */
  color: var(--text-dim);          /* subordinate ink */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Parties', value: partiesText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Chamber', value: chamberText },
        { field: 'f2', ftype: 'textfield', title: o.lines[2]?.title || 'Status', value: statusText },
        { field: 'f3', ftype: 'textfield', title: 'Figures label', value: 'SEATS' },
      ],

      // Shared seat-count rebuild - one "Party | seats" per line (dataRuntimes.ts).
      runtimeExtraJs: seatBarsRuntimeJs(),
    };
  },
);

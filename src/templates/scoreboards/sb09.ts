// sb09 "House Match Board" — the NoaCG full scoreboard, sibling of sb05 "House Scorebug" and
// lt11 "House Strap". The board shown at kick-off, at the interval and at full time: crests,
// full club names, the score pair, the clock, and the period-by-period breakdown underneath.
//
// The breakdown is ONE repeating field rather than a column per period, which is why this is
// not four sport-specific boards: "Q1 | 28 | 24" and "SET 2 | 6 | 4" and "P3 | 1 | 0" are the
// same line, so basketball, tennis and ice hockey are what the operator types rather than
// which template they picked.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { matchBoardRuntimeJs } from './boardRuntimes';
import {
  clipOneLineCss,
  clockSpanHtml,
  colourHoldersHtml,
  matchBoardFields,
  periodSourceHtml,
} from './scorebugShared';

const PERIODS = 'Q1 | 24 | 19\nQ2 | 22 | 25\nQ3 | 30 | 21\nQ4 | 12 | 19';

export const sb09: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb09',
    category: 'scoreboard',
    name: 'House Match Board',
    styleTag: 'noacg',
    description: 'The house match board: crests, club names, the score pair, clock and period breakdown.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'built-in',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Match Board',
    description:
      'The NoaCG full scoreboard, sibling of sb05 House Scorebug and lt11 House Strap: a void ' +
      'panel with an amber top edge, a status row carrying the period and the clock, two crests ' +
      'against full club names either side of a big amber score pair, and a period-by-period ' +
      'breakdown along the bottom. The breakdown is one repeating field, so quarters, periods ' +
      'and sets are all the same board.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- House Match Board: void panel — status row, crest/name/score/name/crest, breakdown. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the amber top rule, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Status row: the period on the left, the match clock on the right. -->
      <div class="scoreboard-head">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">Q4</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '10:00')}</div>
      </div>
      <!-- The main row: the two clubs meeting around the score pair. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <!-- Crest slot — empty shows the placeholder ring, never a broken image. -->
          <div class="scoreboard-crest"><img id="f9" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        </div>
        <div class="scoreboard-scores">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">88</span></div>
          <div class="scoreboard-dash">–</div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">84</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <div class="scoreboard-crest"><img id="f10" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        </div>
      </div>
      <!-- The breakdown — rendered by rebuildPeriods() from the hidden source below. -->
      <div id="scoreboard-periods" class="scoreboard-periods"></div>
${periodSourceHtml('f6', PERIODS)}
${colourHoldersHtml('f7', 'f8', '#f6a623', '#7dd3fc')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The board — the house void, sized as a panel with the family's amber top edge. */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  min-width: calc(620px * var(--scale));  /* a board, not a strap — short club names keep air */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(22px * var(--scale)) calc(30px * var(--scale)) calc(16px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The accent edge — the amber bar down the left, doubling as the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the board's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The status row — period on the left, clock on the right, split by a dim keyline. */
.scoreboard-head {
  display: flex;                   /* the two ends of the row… */
  align-items: baseline;           /* …on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  padding-bottom: calc(12px * var(--scale));  /* air above the keyline */
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);  /* the house keyline */
}

/* The period — the house mono accent label. */
.scoreboard-phase {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
  white-space: nowrap;             /* "SECOND OVERTIME" stays on one line */
}

/* The match clock — mono, tabular, so a ticking second never moves the row. */
.scoreboard-clock {
  font-family: var(--font-label);  /* mono: a clock is data, not display type */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 500;                /* one mono voice with the period label */
  color: var(--text-color);        /* primary white — the clock is read constantly */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter */
}

/* The main row — crest+name · scores · name+crest, the scores holding the centre. */
.scoreboard-main {
  display: flex;                   /* the three blocks in one row */
  align-items: center;             /* everything on the board's centre line */
  gap: calc(24px * var(--scale));  /* air between the clubs and the scores */
  padding: calc(20px * var(--scale)) 0;  /* the row's vertical rhythm */
}

/* One club block — the crest above nothing, beside the name. */
.scoreboard-side {
  display: flex;                   /* crest and name side by side */
  align-items: center;             /* both on the row's centre line */
  gap: calc(16px * var(--scale));  /* air between the crest and the name */
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* lets a long club name shrink, not overflow */
}
/* The away club mirrors, so the crests sit at the board's outer edges. */
.scoreboard-side-b { flex-direction: row-reverse; }

/* The crest slot — the club's own mark, or a colour-tinted placeholder ring. */
.scoreboard-crest {
  position: relative;              /* the placeholder ring is drawn against this */
  flex-shrink: 0;                  /* crests never squeeze — names give up width instead */
  width: calc(56px * var(--scale));   /* a consistent slot whatever the crest's own shape is */
  height: calc(56px * var(--scale));  /* square, so round and shield crests both sit well */
  display: flex;                   /* centers the image… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
}
.scoreboard-logo {
  max-width: 100%;                 /* the crest fits its slot… */
  max-height: 100%;                /* …both ways, whatever its aspect */
  object-fit: contain;             /* never distorted to fill */
}
/* No crest uploaded: a ring in the club's own colour. A board with missing crests must look
   deliberate, because most club broadcasts will never have them. */
.scoreboard-crest::after {
  content: '';                     /* the placeholder mark */
  position: absolute;              /* centred over the empty slot */
  inset: calc(6px * var(--scale)); /* inset from the slot's edge */
  border-radius: 50%;              /* a ratio cap — stays round at any scale */
  border: calc(2px * var(--scale)) solid var(--team-a, var(--accent));  /* the club colour */
  opacity: 0.55;                   /* clearly a placeholder, not a crest */
}
.scoreboard-side-b .scoreboard-crest::after {
  border-color: var(--team-b, var(--text-dim));  /* the away club's colour */
}
/* An uploaded crest hides the ring (setFieldValue adds .has-image to the slot). */
.scoreboard-crest.has-image::after { content: none; }

/* The club name — house display type. */
.scoreboard-team {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-team', 260)}

/* The score pair — the loudest thing on the board, held dead centre. */
.scoreboard-scores {
  display: flex;                   /* the two figures and the dash in one row */
  align-items: center;             /* on one centre line */
  gap: calc(14px * var(--scale));  /* air around the dash */
  flex-shrink: 0;                  /* the scores never give up width */
}
.scoreboard-score {
  min-width: calc(66px * var(--scale));  /* a shared column, so 8 and 108 both sit centred */
  text-align: center;              /* the figure is centred in its own column */
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* the board's headline */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* the figure fills its column */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}
.scoreboard-dash {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* a step under the figures */
  font-weight: var(--display-weight);  /* solid, not a hairline */
  line-height: 1;                  /* on the figures' centre line */
  color: var(--text-dim);          /* dim — the dash separates, it does not compete */
}

/* The breakdown — one column per period, above a dim keyline. */
.scoreboard-periods {
  display: flex;                   /* the period columns in one row */
  justify-content: center;         /* centred under the score pair */
  gap: calc(26px * var(--scale));  /* air between the columns */
  padding-top: calc(14px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* the house keyline */
}
.scoreboard-period {
  display: flex;                   /* label over the two figures… */
  flex-direction: column;          /* …as one column */
  align-items: center;             /* centred on the column's axis */
  gap: calc(3px * var(--scale));   /* the three rows read as one unit */
  min-width: calc(52px * var(--scale));  /* a shared column width — the periods align */
}
.scoreboard-period-label {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dim — the breakdown is reference, not headline */
  white-space: nowrap;             /* "SET 5" stays on one line */
}
.scoreboard-period-score {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* even rhythm down the column */
  color: var(--text-color);        /* primary text — these are still scores */
  font-variant-numeric: tabular-nums;  /* the columns line up across periods */
}
/* An empty breakdown collapses its rule rather than leaving a stray keyline. */
.scoreboard-periods:empty { display: none; }

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock is held, so it and the period step back. */
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }

/* A period that ran out — the clock takes the accent. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the scores settle to white; the match is decided, nothing is live any more. */
.scoreboard-final .scoreboard-score { color: var(--text-color); }
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }`,
    hasAccent: true,
    fields: matchBoardFields({
      teamA: 'HOME', scoreA: '88', teamB: 'AWAY', scoreB: '84',
      period: 'Q4', clock: '10:00', periods: PERIODS,
      colourA: '#f6a623', colourB: '#7dd3fc',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: matchBoardRuntimeJs(),
  }),
);

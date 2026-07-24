// sb10 "Volt Match Board" — the sport full scoreboard, sibling of sb06 "Volt Scorebug" and
// lt06 "Split Bar". The stadium board: a hard slab with a full-bleed club-colour band behind
// each side, oversized crests, a huge score pair, and the period breakdown as accent-topped
// cells along the bottom.
//
// Drawn for the sports where the board goes full-frame at the interval — football, ice hockey,
// motorsport session results — so it leads with weight and contrast rather than with air.

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

const PERIODS = 'P1 | 1 | 0\nP2 | 1 | 2\nP3 | 2 | 1';

export const sb10: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb10',
    category: 'scoreboard',
    name: 'Volt Match Board',
    styleTag: 'sport',
    description: 'A stadium slab board: club-colour bands, big crests, a huge score pair, period cells.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'RANGERS' }],
    logo: 'built-in',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Match Board',
    description:
      'The sport full scoreboard, sibling of sb06 Volt Scorebug and lt06 Split Bar: a hard slab ' +
      'with a club-colour band behind each side, oversized crests, full club names, a huge score ' +
      'pair on a leaning accent plate, and the period breakdown as accent-topped cells. Built ' +
      'for the interval and full-time full-frame moment.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Volt Match Board: sport slab — status bar, colour-banded sides, score plate, period cells. -->
    <div class="scoreboard-box">
      <!-- The accent cap — the leaning slab edge, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Status bar: the period and the clock, caps and condensed. -->
      <div class="scoreboard-head">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">3RD PERIOD</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '20:00')}</div>
      </div>
      <!-- The main row: each club sits on a band of its own colour. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <div class="scoreboard-crest"><img id="f9" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">RANGERS</span></div>
        </div>
        <div class="scoreboard-scores">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">4</span></div>
          <div class="scoreboard-dash">:</div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">3</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <div class="scoreboard-crest"><img id="f10" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">BRUINS</span></div>
        </div>
      </div>
      <!-- The breakdown — rendered by rebuildPeriods() from the hidden source below. -->
      <div id="scoreboard-periods" class="scoreboard-periods"></div>
${periodSourceHtml('f6', PERIODS)}
${colourHoldersHtml('f7', 'f8', '#0033a0', '#fcb514')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. A sport board earns weight from contrast, not blur. */
.scoreboard-box {
  position: relative;              /* anchors the accent cap */
  min-width: calc(1088px * var(--scale));  /* a full-frame board, not a strip */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the colour bands stop at the slab's edge */
}

/* The accent cap — a leaning wedge across the slab's top, the family's signature shape. */
.scoreboard-accent {
  position: absolute;              /* pinned across the slab's top edge */
  left: 0;                         /* full width, left… */
  right: 0;                        /* …to right */
  top: 0;                          /* along the top */
  height: calc(11px * var(--scale));  /* a visible rule, not a hairline */
  background: var(--accent);       /* the one accent surface */
}

/* The status bar — period and clock at opposite ends, on a darker strip. */
.scoreboard-head {
  display: flex;                   /* the two ends of the bar… */
  align-items: center;             /* …on one centre line */
  justify-content: space-between;  /* pushed to opposite ends */
  padding: calc(27px * var(--scale)) calc(47px * var(--scale)) calc(17px * var(--scale));
  background: rgba(255, 255, 255, 0.05);  /* one step off the slab */
}
.scoreboard-phase {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid: a sport label is never light */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* "SECOND OVERTIME" stays on one line */
}
.scoreboard-clock {
  font-size: calc(47px * var(--scale) * var(--type-scale));  /* the bar's anchor */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  color: var(--text-color);        /* white while there is time left */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter */
}

/* The main row: two colour-banded club blocks around the score plate. */
.scoreboard-main {
  display: flex;                   /* the three blocks in one row */
  align-items: stretch;            /* every block is the full height of the row */
}

/* One club block — its band is the club's own colour, faded so the name stays legible. */
.scoreboard-side {
  position: relative;              /* the band is drawn against this */
  display: flex;                   /* crest and name side by side */
  align-items: center;             /* both on the row's centre line */
  gap: calc(31px * var(--scale));  /* air between the crest and the name */
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* lets a long club name shrink, not overflow */
  padding: calc(37px * var(--scale)) calc(44px * var(--scale));  /* the row's height comes from here */
  background: linear-gradient(90deg, color-mix(in srgb, var(--team-a, var(--accent)) 38%, transparent), transparent);
}
.scoreboard-side-b {
  flex-direction: row-reverse;     /* the away crest sits at the board's right edge */
  background: linear-gradient(270deg, color-mix(in srgb, var(--team-b, var(--text-dim)) 38%, transparent), transparent);
}

/* The crest slot — big, because at full frame the crest is what a viewer recognises first. */
.scoreboard-crest {
  position: relative;              /* the placeholder mark is drawn against this */
  flex-shrink: 0;                  /* crests never squeeze — names give up width instead */
  width: calc(121px * var(--scale));   /* a consistent slot whatever the crest's shape is */
  height: calc(121px * var(--scale));  /* square, so round and shield crests both sit well */
  display: flex;                   /* centers the image… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
}
.scoreboard-logo {
  max-width: 100%;                 /* the crest fits its slot… */
  max-height: 100%;                /* …both ways, whatever its aspect */
  object-fit: contain;             /* never distorted to fill */
}
/* No crest uploaded: a hard square mark in the club's colour. Most club and amateur
   broadcasts will never upload one, so the empty state has to look intended. */
.scoreboard-crest::after {
  content: '';                     /* the placeholder mark */
  position: absolute;              /* centred over the empty slot */
  inset: calc(17px * var(--scale));  /* inset from the slot's edge */
  border: calc(5px * var(--scale)) solid var(--team-a, var(--accent));  /* the club colour */
  opacity: 0.6;                    /* clearly a placeholder, not a crest */
}
.scoreboard-side-b .scoreboard-crest::after { border-color: var(--team-b, var(--text-dim)); }
.scoreboard-crest.has-image::after { content: none; }

/* The club name — heavy condensed caps, the sport family's voice. */
.scoreboard-team {
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.05;               /* tight — condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* club names are caps on a stadium board */
  color: var(--text-color);        /* paper white over the colour band */
}
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-team', 300)}

/* The score plate — a leaning accent block holding the centre of the board. */
.scoreboard-scores {
  display: flex;                   /* the two figures and the divider in one row */
  align-items: center;             /* on one centre line */
  gap: calc(20px * var(--scale));  /* air around the divider */
  flex-shrink: 0;                  /* the plate never gives up width */
  padding: 0 calc(51px * var(--scale));  /* the plate's own side margins */
  background: rgba(0, 0, 0, 0.55); /* a hard dark plate under the figures */
  box-shadow: inset 0 calc(-6px * var(--scale)) 0 0 var(--accent);  /* the accent underline */
}
.scoreboard-score {
  min-width: calc(104px * var(--scale));  /* a shared column, so 4 and 104 both sit centred */
  text-align: center;              /* the figure is centred in its own column */
  font-size: calc(107px * var(--scale) * var(--type-scale));  /* the board's headline */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* the figure fills its column */
  color: var(--text-color);        /* white on the plate — the accent is the underline */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}
.scoreboard-dash {
  font-size: calc(67px * var(--scale) * var(--type-scale));  /* a step under the figures */
  font-weight: var(--display-weight);  /* solid, not a hairline */
  line-height: 1;                  /* on the figures' centre line */
  color: var(--accent);            /* the divider carries the accent */
}

/* The breakdown — accent-topped cells along the bottom of the slab. */
.scoreboard-periods {
  display: flex;                   /* the period cells in one row */
  justify-content: center;         /* centred under the score plate */
  gap: calc(3px * var(--scale));   /* the cells almost touch — a run of periods, not a list */
  padding: calc(20px * var(--scale)) calc(44px * var(--scale)) calc(27px * var(--scale));
  background: rgba(255, 255, 255, 0.05);  /* the same strip treatment as the status bar */
}
.scoreboard-period {
  display: flex;                   /* label over the two figures… */
  flex-direction: column;          /* …as one column */
  align-items: center;             /* centred on the cell's axis */
  gap: calc(3px * var(--scale));   /* the three rows read as one unit */
  min-width: calc(98px * var(--scale));  /* a shared cell width — the periods align */
  padding: calc(12px * var(--scale)) calc(14px * var(--scale));  /* the cell's own frame */
  background: rgba(0, 0, 0, 0.45); /* a hard dark cell */
  border-top: calc(3px * var(--scale)) solid var(--accent);  /* the accent cap on every cell */
}
.scoreboard-period-label {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dim — the breakdown is reference, not headline */
  white-space: nowrap;             /* "SET 5" stays on one line */
}
.scoreboard-period-score {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* even rhythm down the cell */
  color: var(--text-color);        /* primary text — these are still scores */
  font-variant-numeric: tabular-nums;  /* the cells line up across periods */
}
/* An empty breakdown collapses its strip rather than leaving an empty band. */
.scoreboard-periods:empty { display: none; }

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock is held and stops shouting. */
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }

/* The period ran out — the clock turns accent, the cue the sport itself gives. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the accent moves to the scores; the plate's underline has done its job. */
.scoreboard-final .scoreboard-score { color: var(--accent); }
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }`,
    hasAccent: true,
    fields: matchBoardFields({
      teamA: 'RANGERS', scoreA: '4', teamB: 'BRUINS', scoreB: '3',
      period: '3RD PERIOD', clock: '20:00', periods: PERIODS,
      colourA: '#0033a0', colourB: '#fcb514',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: matchBoardRuntimeJs(),
  }),
);

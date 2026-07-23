// sb12 "Club Match Board" — the minimal full scoreboard, and the pack's amateur full-frame
// board. Sibling of sb08 "Club Scorebug" and lt01 "Hairline".
//
// The board a school, a university or a district club puts up at half time and at the whistle.
// It assumes the things those broadcasts actually have — full club names, no crest files, a
// referee's watch rather than a stadium clock — and it is drawn flat, on a solid panel, with
// hairlines instead of glows, so it survives a 2 Mbit stream and an OBS scale to 720p.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { matchBoardRuntimeJs } from './boardRuntimes';
import {
  clampTwoLinesCss,
  clockSpanHtml,
  colourHoldersHtml,
  matchBoardFields,
  periodSourceHtml,
} from './scorebugShared';

const PERIODS = '1st half | 1 | 0\n2nd half | 1 | 2';

export const sb12: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb12',
    category: 'scoreboard',
    name: 'Club Match Board',
    styleTag: 'minimal',
    description: 'The amateur full-time board: full club names, a flat panel, halves along the bottom.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Ashton United' }],
    logo: 'built-in',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Club Match Board',
    description:
      'The local and amateur full scoreboard, sibling of sb08 Club Scorebug and lt01 Hairline: ' +
      'a flat solid panel with a hairline status row, full club names either side of the score ' +
      'pair, small crest slots that read as intentional when empty, and the halves along the ' +
      'bottom. No blur and no glow — it is drawn for a low-bitrate club stream scaled to 720p.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Club Match Board: flat panel — status row, two clubs around the score, halves below. -->
    <div class="scoreboard-box">
      <!-- The accent rule — the panel's top edge, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Status row: which half, and the referee's clock. -->
      <div class="scoreboard-head">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">Full time</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'up', '90:00')}</div>
      </div>
      <!-- The main row: the two clubs meeting around the score pair. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <div class="scoreboard-crest"><img id="f9" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Ashton United</span></div>
        </div>
        <div class="scoreboard-scores">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">2</span></div>
          <div class="scoreboard-dash">–</div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">2</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <div class="scoreboard-crest"><img id="f10" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Marske Town</span></div>
        </div>
      </div>
      <!-- The halves — rendered by rebuildPeriods() from the hidden source below. -->
      <div id="scoreboard-periods" class="scoreboard-periods"></div>
${periodSourceHtml('f6', PERIODS)}
${colourHoldersHtml('f7', 'f8', '#d92b2b', '#1f4fd8')}
    </div>`,
    css: `${labelFontFaceCss(fontById('inter'))}

/* The panel — flat and solid. No blur: a club stream's bitrate cannot afford one, and the
   panel is what makes the board legible over a handheld shot of a grass pitch. */
.scoreboard-box {
  position: relative;              /* anchors the accent rule */
  min-width: calc(600px * var(--scale));  /* a board, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(20px * var(--scale)) calc(28px * var(--scale)) calc(14px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

/* The accent rule — a thin top edge, and the machine's flag marker. Flat, never glowing. */
.scoreboard-accent {
  position: absolute;              /* pinned across the panel's top edge */
  left: 0;                         /* full width, left… */
  right: 0;                        /* …to right */
  top: 0;                          /* along the top */
  height: var(--accent-weight);    /* the family's rule weight */
  background: var(--accent);       /* the one accent surface */
}

/* The status row — which half, and the clock, at opposite ends above a keyline. */
.scoreboard-head {
  display: flex;                   /* the two ends of the row… */
  align-items: baseline;           /* …on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  padding-bottom: calc(10px * var(--scale));  /* air above the keyline */
  border-bottom: 1px solid rgba(255, 255, 255, 0.20);  /* the family's one divider */
}
.scoreboard-phase {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* small: this row is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* "AFTER EXTRA TIME" stays on one line */
}
.scoreboard-clock {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* a reference figure, not a display one */
  font-weight: 600;                /* matches the status label */
  color: var(--text-dim);          /* dimmed — the score is what matters on a club stream */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter */
}

/* The main row — club · scores · club, the scores holding the centre. */
.scoreboard-main {
  display: flex;                   /* the three blocks in one row */
  align-items: center;             /* everything on the board's centre line */
  gap: calc(20px * var(--scale));  /* air between the clubs and the scores */
  padding: calc(18px * var(--scale)) 0;  /* the row's vertical rhythm */
}

/* One club block — a small crest slot beside the full club name. */
.scoreboard-side {
  display: flex;                   /* crest and name side by side */
  align-items: center;             /* both on the row's centre line */
  gap: calc(14px * var(--scale));  /* air between the crest and the name */
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* lets a long club name shrink and wrap, not overflow */
}
.scoreboard-side-b { flex-direction: row-reverse; text-align: right; }

/* The crest slot — small, and the EMPTY state is the normal one here: most district clubs
   have no crest file, so the placeholder has to read as a considered mark, not a gap. */
.scoreboard-crest {
  position: relative;              /* the placeholder mark is drawn against this */
  flex-shrink: 0;                  /* crests never squeeze — names give up width instead */
  width: calc(40px * var(--scale));   /* a consistent slot whatever the crest's shape is */
  height: calc(40px * var(--scale));  /* square, so round and shield crests both sit well */
  display: flex;                   /* centers the image… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
}
.scoreboard-logo {
  max-width: 100%;                 /* the crest fits its slot… */
  max-height: 100%;                /* …both ways, whatever its aspect */
  object-fit: contain;             /* never distorted to fill */
}
.scoreboard-crest::after {
  content: '';                     /* the placeholder mark — a filled club-colour square */
  position: absolute;              /* centred over the empty slot */
  inset: calc(9px * var(--scale)); /* inset from the slot's edge */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
  opacity: 0.75;                   /* a deliberate mark, quieter than a real crest */
}
.scoreboard-side-b .scoreboard-crest::after { background: var(--team-b, var(--text-dim)); }
.scoreboard-crest.has-image::after { content: none; }

/* The club name — FULL names in sentence case, allowed two lines. */
.scoreboard-team {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.22;               /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clampTwoLinesCss('.scoreboard-team')}

/* The score pair — the one thing a viewer joining late needs. */
.scoreboard-scores {
  display: flex;                   /* the two figures and the dash in one row */
  align-items: center;             /* on one centre line */
  gap: calc(12px * var(--scale));  /* air around the dash */
  flex-shrink: 0;                  /* the scores never give up width */
}
.scoreboard-score {
  min-width: calc(52px * var(--scale));  /* a shared column, so 2 and 12 both sit centred */
  text-align: center;              /* the figure is centred in its own column */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the board's headline */
  font-weight: 700;                /* bold — the score is the point */
  line-height: 1;                  /* the figure fills its column */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}
.scoreboard-dash {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* a step under the figures */
  font-weight: 600;                /* solid, not a hairline */
  line-height: 1;                  /* on the figures' centre line */
  color: var(--text-dim);          /* dim — the dash separates, it does not compete */
}

/* The halves — a quiet row of columns under a keyline. */
.scoreboard-periods {
  display: flex;                   /* the columns in one row */
  justify-content: center;         /* centred under the score pair */
  gap: calc(30px * var(--scale));  /* generous air — there are usually only two */
  padding-top: calc(12px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.20);  /* the family's one divider */
}
.scoreboard-period {
  display: flex;                   /* label over the two figures… */
  flex-direction: column;          /* …as one column */
  align-items: center;             /* centred on the column's axis */
  gap: calc(2px * var(--scale));   /* the three rows read as one unit */
  min-width: calc(66px * var(--scale));  /* a shared column width — the halves align */
}
.scoreboard-period-label {
  font-size: calc(11px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dim — the breakdown is reference, not headline */
  white-space: nowrap;             /* "EXTRA TIME" stays on one line */
}
.scoreboard-period-score {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: 600;                /* semibold, in keeping with the family */
  line-height: 1.2;                /* even rhythm down the column */
  color: var(--text-color);        /* primary text — these are still scores */
  font-variant-numeric: tabular-nums;  /* the columns line up across halves */
}
/* An empty breakdown collapses its rule rather than leaving a stray keyline. */
.scoreboard-periods:empty { display: none; }

/* ── Match state (the machine's groups add these to the root) ── */

/* Half time: the clock is held, and the status row says so by stepping back further. */
.scoreboard-break .scoreboard-clock { opacity: 0.6; }

/* A period that ran out — the clock takes the accent. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the scores settle to white; the match is decided. */
.scoreboard-final .scoreboard-score { color: var(--text-color); }
.scoreboard-final .scoreboard-clock { opacity: 0.6; }`,
    hasAccent: true,
    fields: matchBoardFields({
      teamA: 'Ashton United', scoreA: '2', teamB: 'Marske Town', scoreB: '2',
      period: 'Full time', clock: '90:00', periods: PERIODS,
      colourA: '#d92b2b', colourB: '#1f4fd8',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: matchBoardRuntimeJs(),
  }),
);

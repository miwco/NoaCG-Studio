// sb11 "Frost Match Board" — the glass full scoreboard, sibling of sb07 "Frost Scorebug" and
// lt08 "Frosted Card". A frosted card with the two competitors STACKED as rows rather than
// facing each other, which is the racket-sport shape: name, then the set/game columns, then
// the current score, one row per player.
//
// Stacking is not a style choice here. Tennis, badminton and table tennis boards are read
// down a column ("who has won which set"), and a facing layout forces the eye to cross the
// board for every comparison. The same markup still serves any sport — the rows are two
// competitors and the columns are whatever the operator typed.

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

const PERIODS = 'SET 1 | 6 | 4\nSET 2 | 3 | 6\nSET 3 | 7 | 5';

export const sb11: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb11',
    category: 'scoreboard',
    name: 'Frost Match Board',
    styleTag: 'glass',
    description: 'A frosted card board: competitors stacked as rows, set columns, and a match clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Świątek' }],
    logo: 'built-in',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Match Board',
    description:
      'The glass full scoreboard, sibling of sb07 Frost Scorebug and lt08 Frosted Card: a ' +
      'frosted card with a status row, the two competitors stacked as rows with a colour dot, ' +
      'a crest and their current score, and the set-by-set columns beneath. The stacked shape ' +
      'is the racket-sport one — a set record is read down a column, not across a facing board.',
    uicolor: '5',
  },
  () => ({
    html: `    <!-- Frost Match Board: frosted card — status row, two stacked competitor rows, set columns. -->
    <div class="scoreboard-box">
      <!-- The accent bar — a soft glass edge, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Status row: where the match stands, and the elapsed clock. -->
      <div class="scoreboard-head">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">Set 3 · 5-5</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'up', '2:14')}</div>
      </div>
      <!-- The competitors, stacked: dot, crest, name, current score. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-crest"><img id="f9" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Świątek</span></div>
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">2</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-crest"><img id="f10" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Sabalenka</span></div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">1</span></div>
        </div>
      </div>
      <!-- The set columns — rendered by rebuildPeriods() from the hidden source below. -->
      <div id="scoreboard-periods" class="scoreboard-periods"></div>
${periodSourceHtml('f6', PERIODS)}
${colourHoldersHtml('f7', 'f8', '#dc143c', '#0057b7')}
    </div>`,
    css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface. Everything is drawn INSIDE it, never bolted on. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  min-width: calc(996px * var(--scale));  /* a card, not a strip */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(36px * var(--scale)) calc(47px * var(--scale)) calc(29px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
  overflow: hidden;                /* the accent bar is clipped to the card's radius */
}

/* The accent bar — a soft vertical edge inside the card's radius, and the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  opacity: 0.9;                    /* the glass family softens its accents rather than glowing */
}

/* The status row — where the match stands, and the elapsed clock. */
.scoreboard-head {
  display: flex;                   /* the two ends of the row… */
  align-items: baseline;           /* …on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  padding-bottom: calc(21px * var(--scale));  /* air above the keyline */
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);  /* the glass keyline */
}
.scoreboard-phase {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* a long status stays on one line */
}
.scoreboard-clock {
  font-size: calc(39px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 700;                /* matches the status label's weight */
  color: var(--text-color);        /* primary white — the clock is read constantly */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter */
}

/* The competitors, stacked as rows. */
.scoreboard-main {
  display: flex;                   /* the two competitor rows… */
  flex-direction: column;          /* …stacked as one column */
  padding: calc(11px * var(--scale)) 0;  /* the block's own breathing room */
}

/* One competitor row: colour dot, crest, name, current score. */
.scoreboard-side {
  display: flex;                   /* everything in the row shares one line */
  align-items: center;             /* on the row's centre line */
  gap: calc(24px * var(--scale));  /* air inside the row */
  padding: calc(18px * var(--scale)) 0;  /* the stack's vertical rhythm */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}
/* A hairline between the two competitors, never above the first. */
.scoreboard-side + .scoreboard-side {
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the glass keyline, dimmed */
}

/* The colour dot — small and soft, the glass family's way of carrying a hard colour. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the dot keeps its size whatever the text does */
  width: calc(20px * var(--scale));  /* small on purpose — a marker, not a badge */
  height: calc(20px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--team-a, var(--accent));  /* the competitor's colour, or the accent */
  box-shadow: 0 0 0 calc(3px * var(--scale)) rgba(255, 255, 255, 0.18);  /* a soft glass ring */
}
.scoreboard-side-b .scoreboard-colour-chip {
  background: var(--team-b, var(--text-dim));  /* the other competitor's colour */
}

/* The crest slot — small here: a stacked board leads with the NAME, not the badge. */
.scoreboard-crest {
  position: relative;              /* the placeholder ring is drawn against this */
  flex-shrink: 0;                  /* crests never squeeze — names give up width instead */
  width: calc(68px * var(--scale));   /* a consistent slot whatever the crest's shape is */
  height: calc(68px * var(--scale));  /* square, so round and shield crests both sit well */
  display: flex;                   /* centers the image… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
}
.scoreboard-logo {
  max-width: 100%;                 /* the crest fits its slot… */
  max-height: 100%;                /* …both ways, whatever its aspect */
  object-fit: contain;             /* never distorted to fill */
}
/* No crest uploaded: a soft ring rather than a gap. Individual sports rarely have one. */
.scoreboard-crest::after {
  content: '';                     /* the placeholder mark */
  position: absolute;              /* centred over the empty slot */
  inset: calc(7px * var(--scale)); /* inset from the slot's edge */
  border-radius: 50%;              /* a ratio cap — stays round at any scale */
  border: calc(3px * var(--scale)) solid rgba(255, 255, 255, 0.28);  /* a neutral glass ring */
}
.scoreboard-crest.has-image::after { content: none; }

/* The name — the glass family's rounded sans, sentence case, taking the row's spare width. */
.scoreboard-team {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 600;                /* semibold — present without shouting */
  line-height: 1.2;                /* comfortable for a mixed-case name */
  color: var(--text-color);        /* primary text on the frost */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
  flex: 1;                         /* the name takes the row's spare width */
}

${clipOneLineCss('.scoreboard-team', 300)}

/* The current score — the one figure per row, in a shared right-hand column. */
.scoreboard-score {
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  min-width: calc(82px * var(--scale));  /* a shared column, so both rows line up */
  text-align: right;               /* two-digit scores stay aligned with single ones */
  font-size: calc(60px * var(--scale) * var(--type-scale));  /* the loudest figure in the row */
  font-weight: 800;                /* the heaviest thing on the card */
  line-height: 1;                  /* sits tight on the row */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The set columns — beneath the rows, above a keyline. */
.scoreboard-periods {
  display: flex;                   /* the set columns in one row */
  justify-content: flex-end;       /* aligned to the score column above them */
  gap: calc(32px * var(--scale));  /* air between the columns */
  padding-top: calc(21px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.22);  /* the glass keyline */
}
.scoreboard-period {
  display: flex;                   /* label over the two figures… */
  flex-direction: column;          /* …as one column */
  align-items: center;             /* centred on the column's axis */
  gap: calc(6px * var(--scale));   /* the three rows read as one unit */
  min-width: calc(86px * var(--scale));  /* a shared column width — the sets align */
}
.scoreboard-period-label {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the card */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dim — the set record is reference, not headline */
  white-space: nowrap;             /* "SET 5" stays on one line */
}
.scoreboard-period-score {
  font-size: calc(33px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: 700;                /* matches the family's semibold voice, a step up */
  line-height: 1.2;                /* even rhythm down the column */
  color: var(--text-color);        /* primary text — these are still scores */
  font-variant-numeric: tabular-nums;  /* the columns line up across sets */
}
/* An empty set record collapses its rule rather than leaving a stray keyline. */
.scoreboard-periods:empty { display: none; }

/* ── Match state (the machine's groups add these to the root) ── */

/* A break between sets: the glass dims rather than changing colour. */
.scoreboard-break .scoreboard-clock { opacity: 0.6; }

/* A counting-down period that reached zero — the clock takes the accent. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Match over — the winner is whoever the operator left on top; the clock steps back. */
.scoreboard-final .scoreboard-clock { opacity: 0.6; }
.scoreboard-final .scoreboard-score { color: var(--text-color); }`,
    hasAccent: true,
    fields: matchBoardFields({
      teamA: 'Świątek', scoreA: '2', teamB: 'Sabalenka', scoreB: '1',
      period: 'Set 3 · 5-5', clock: '2:14', periods: PERIODS,
      colourA: '#dc143c', colourB: '#0057b7',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 name · f1 score · f2 name · f3 score · f4 status · f5 clock
    runtimeExtraJs: matchBoardRuntimeJs(),
  }),
);

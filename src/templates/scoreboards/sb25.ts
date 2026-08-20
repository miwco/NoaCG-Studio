// sb25 "Court Board" - the corner match board: the two clubs STACKED as plates with the
// clock detached into its own module beside them. Sport family, sibling of sb06 "Volt
// Scorebug" and lt05 "Angle Slab".
//
// Why it is a different board from sb10 "Volt Match Board" rather than a re-skin of it: sb10
// is the symmetric full-frame slab shown at the interval - crest, name, SCORE : SCORE, name,
// crest, read left to right across the middle of the picture. This is the board that stays up
// while play continues, so it is anchored in a CORNER and reads top to bottom: one plate per
// club, the score fused to the end of each plate in a darker shade of that club's own colour,
// and the clock lifted out into a chamfered module that keeps the match's own information off
// the clubs' plates.
//
// The bottom strip is the period-breakdown field doing what it is shaped for. "FOULS | 4 | 2"
// is exactly "label | home | away", so the same repeating field that carries quarters on sb09
// carries team fouls and timeouts here - the operator types what the sport counts, and the
// board never needs a template per competition.

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

// The counted facts a basketball or handball bench actually watches, one per line. Any sport's
// tallies fit the same shape - it is the operator's vocabulary, not the template's.
const TALLIES = ['FOULS | 4 | 2', 'TIMEOUTS | 2 | 3', 'BONUS | YES | NO'].join('\n');

export const sb25: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb25',
    category: 'scoreboard',
    name: 'Court Board',
    styleTag: 'sport',
    description: 'A corner board: club plates stacked with fused score cells, a chamfered clock module.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'TIGERS' }],
    logo: 'built-in',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'oswald',
    defaultZone: 'top-left',
  },
  {
    name: 'Court Board',
    description:
      'The corner match board: one plate per club stacked over the other, each with its crest ' +
      'well at the head and its score fused to the tail in a darker shade of the club colour, ' +
      'and the clock lifted into a chamfered module beside them. Under the plates, the ' +
      'repeating breakdown field carries whatever the bench counts - "FOULS | 4 | 2", ' +
      '"TIMEOUTS | 2 | 3" - one line per tally.',
    uicolor: '2',
  },
  () => ({
    // Structure: [stacked club plates + tally strip] [chamfered period/clock module].
    html: `    <!-- Court Board: stacked club plates with fused score cells beside a chamfered clock module. -->
    <div class="scoreboard-box">
      <!-- The stack - the two clubs, one plate under the other. -->
      <div class="scoreboard-stack">
        <!-- The accent tally marks - the sport family's one drawn flourish, and the marker the
             result group dims at full time. -->
        <div class="scoreboard-accent"></div>
        <!-- Home plate: crest well, club-colour name band, score fused to the tail. -->
        <div class="scoreboard-row scoreboard-row-a">
          <div class="scoreboard-crest"><img id="f9" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-band">
            <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">TIGERS</span></div>
          </div>
          <div class="scoreboard-scorecell">
            <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">98</span></div>
          </div>
        </div>
        <!-- Guest plate: the identical casting in the away club's colour. -->
        <div class="scoreboard-row scoreboard-row-b">
          <div class="scoreboard-crest"><img id="f10" class="scoreboard-logo" alt=""></div>
          <div class="scoreboard-band">
            <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">FALCONS</span></div>
          </div>
          <div class="scoreboard-scorecell">
            <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">101</span></div>
          </div>
        </div>
        <!-- The tally strip - rendered by rebuildPeriods() from the hidden source below. -->
        <div id="scoreboard-periods" class="scoreboard-periods"></div>
      </div>
      <!-- The match module - period over clock, chamfered so it reads as separate hardware. -->
      <div class="scoreboard-module">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">Q4</span></div>
        <div class="scoreboard-module-rule"></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '01:32')}</div>
      </div>
${periodSourceHtml('f6', TALLIES)}
${colourHoldersHtml('f7', 'f8', '#d4470f', '#12409f')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The board - two pieces side by side with a seam of picture between them, never one panel:
   the clubs' plates and the match's module are different things and are drawn as such. */
.scoreboard-box {
  display: flex;                   /* the stack and the module in one row */
  align-items: flex-start;         /* both hang from the board's top edge */
  gap: calc(10px * var(--scale));  /* the seam between the two castings */
}

/* The stack - the club plates and the tally strip under them. */
.scoreboard-stack {
  position: relative;              /* anchors the accent tally marks */
  display: flex;                   /* plate over plate over strip… */
  flex-direction: column;          /* …stacked downward */
  gap: calc(4px * var(--scale));   /* a hard seam between the castings */
  padding-left: calc(26px * var(--scale));  /* the gutter the accent marks live in */
}

/* The accent marks - four short slashes down the stack's leading edge. The sport family's
   accent is a shape, and this is the shape a scoring board wears: a tally. */
.scoreboard-accent {
  position: absolute;              /* pinned into the stack's gutter */
  left: 0;                         /* against the leading edge */
  top: calc(10px * var(--scale));  /* aligned with the first plate's type */
  width: calc(18px * var(--scale)); /* short marks, not a rail */
  height: calc(74px * var(--scale)); /* four marks tall */
  background: repeating-linear-gradient(
    180deg,
    var(--accent) 0 calc(8px * var(--scale)),      /* the mark… */
    transparent calc(8px * var(--scale)) calc(20px * var(--scale))  /* …and the gap after it */
  );
  transform: skewX(-12deg);        /* the marks lean, like every edge in this family */
  transform-origin: left center;   /* the line-reveal preset draws them from the left */
}

/* One club plate - crest well, colour band, score cell, in one row. */
.scoreboard-row {
  display: flex;                   /* the three parts of a plate… */
  align-items: stretch;            /* …all the plate's full height */
  min-width: 0;                    /* lets a long club name shrink rather than push the board */
  box-shadow: var(--panel-shadow); /* the family's hard offset lift */
}

/* The crest well - a dark square at the plate's head. It states its own height so an operator's
   crest can never set the plate's, whatever shape their artwork is. */
.scoreboard-crest {
  display: flex;                   /* the mark sits on the well's centre */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  flex-shrink: 0;                  /* the well never gives up its width */
  width: calc(76px * var(--scale)); /* a square well… */
  height: calc(76px * var(--scale)); /* …stated in both dimensions */
  padding: calc(9px * var(--scale)); /* the mark's clear space inside the well */
  background: rgba(6, 8, 12, 0.92); /* the casing's dark head */
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) rgba(255, 255, 255, 0.9); /* the keyline frame */
}
.scoreboard-logo {
  max-width: 100%;                 /* the artwork fits the well… */
  max-height: 100%;                /* …in both dimensions, uncropped */
  object-fit: contain;             /* a crest is never cropped to fill */
}

/* The name band - the club colour, and the plate's only wide element. */
.scoreboard-band {
  display: flex;                   /* the name sits on the band's centre line */
  align-items: center;             /* vertically centred */
  flex: 1;                         /* the band absorbs the plate's spare width, so both plates end flush */
  min-width: calc(300px * var(--scale));  /* a broadcast-width plate even for a short code */
  padding: calc(10px * var(--scale)) calc(26px * var(--scale));  /* the band's own frame */
  background: var(--team-a, var(--accent));  /* the home club's colour */
}
.scoreboard-row-b .scoreboard-band { background: var(--team-b, #12409f); }  /* the away club's */
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

/* The club name - heavy condensed caps, leaning with the family. */
.scoreboard-team {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the plate's headline */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.02;               /* tight - condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* club names are shouted on a court board */
  color: #ffffff;                  /* white on the club colour, whichever colour they chose */
}

${clipOneLineCss('.scoreboard-team', 330)}

/* The score cell - fused to the plate's tail in a DARKER shade of the same club colour, so the
   score belongs to that club without a second colour entering the graphic. */
.scoreboard-scorecell {
  display: flex;                   /* the figure on the cell's centre line */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  min-width: calc(132px * var(--scale)); /* three digits fit without the plate resizing */
  padding: calc(10px * var(--scale)) calc(20px * var(--scale));  /* the cell's frame */
  background: color-mix(in srgb, var(--team-a, var(--accent)) 72%, #05070b);  /* the club's shade, darkened */
}
.scoreboard-row-b .scoreboard-scorecell {
  background: color-mix(in srgb, var(--team-b, #12409f) 72%, #05070b);  /* the away club's shade */
}
.scoreboard-score {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* the biggest figure on the plates */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* the figure sits tight in its cell */
  color: #ffffff;                  /* white, so a dark club shade still carries it */
  font-variant-numeric: tabular-nums;  /* digits share one width - no jitter as scores tick */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-score', 190)}

/* The tally strip - the breakdown field, laid out as labelled cells under the plates. */
.scoreboard-periods {
  display: flex;                   /* the tallies in one row */
  flex-wrap: wrap;                 /* a fourth tally starts a second row rather than overflowing */
  gap: calc(4px * var(--scale));   /* the cells almost touch */
  padding: calc(10px * var(--scale)) calc(16px * var(--scale));  /* the strip's own frame */
  background: rgba(6, 8, 12, 0.9); /* a dark rail under the colour plates */
}
.scoreboard-period {
  display: flex;                   /* the label and its two figures in one row */
  align-items: center;             /* on one centre line */
  gap: calc(10px * var(--scale));  /* the three parts read as one tally */
  padding: 0 calc(14px * var(--scale));  /* air between neighbouring tallies */
  border-right: 1px solid rgba(255, 255, 255, 0.16);  /* a hairline between tallies */
}
.scoreboard-period:last-child { border-right: 0; }  /* nothing hangs off the strip's end */
.scoreboard-period-label {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dim - a tally is reference, not headline */
  white-space: nowrap;             /* "TIMEOUTS" stays on one line */
}
/* Each figure sits in a keyline box wearing its own club's colour - the colour is the FRAME,
   never the type, so a dark club colour can never take a figure's contrast with it. */
.scoreboard-period-score {
  min-width: calc(34px * var(--scale));  /* the two boxes are the same width */
  padding: calc(2px * var(--scale)) calc(8px * var(--scale));  /* a tight box */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.2;                /* the figure sits centred in its box */
  text-align: center;              /* centred in the box */
  color: var(--text-color);        /* primary text - these are still counts */
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--team-a, var(--accent));  /* the home frame */
  font-variant-numeric: tabular-nums;  /* the boxes line up across tallies */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}
.scoreboard-period-score + .scoreboard-period-score {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--team-b, #12409f);  /* the away frame */
}
/* An empty breakdown collapses its strip rather than leaving an empty rail. */
.scoreboard-periods:empty { display: none; }

/* The match module - the clock's own casing, chamfered at two corners so it reads as a
   separate piece of hardware rather than as the plates' continuation. */
.scoreboard-module {
  display: flex;                   /* period, rule, clock… */
  flex-direction: column;          /* …stacked down the module */
  align-items: center;             /* centred on its axis */
  gap: calc(8px * var(--scale));   /* even rhythm down the casing */
  min-width: calc(268px * var(--scale)); /* wide enough for "104:00" at module size */
  padding: calc(18px * var(--scale)) calc(30px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);     /* the family's near-black casing */
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 26px), calc(100% - 26px) 100%, 0 100%);  /* the chamfer */
  box-shadow: var(--panel-shadow); /* the family's hard offset lift */
}

/* The period - the module's label. */
.scoreboard-phase {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* larger than a strip label: this is a module */
  font-weight: 700;                /* sport labels are never light */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever they typed */
  color: var(--text-color);        /* full strength - the period leads this module */
}

${clipOneLineCss('.scoreboard-phase', 210)}

/* The module's rule - a hairline in the accent, separating the label from the clock. */
.scoreboard-module-rule {
  width: calc(150px * var(--scale)); /* short - it divides, it does not underline */
  height: calc(2px * var(--scale)); /* a printed hairline */
  background: var(--accent);       /* the module's one accent dose */
}

/* The clock - the module's anchor and the second-loudest figure on the board. */
.scoreboard-clock {
  font-size: calc(62px * var(--scale) * var(--type-scale));  /* big: this is what the bench watches */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* one tight row of figures */
  color: var(--text-color);        /* white while there is time left */
  font-variant-numeric: tabular-nums;  /* the whole point: no width change per second */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-clock', 240)}

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock is held, and the module's rule stops shouting. */
.scoreboard-break .scoreboard-module-rule { background: var(--text-dim); }
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }

/* The period ran out - the clock takes the accent, the cue the sport itself gives. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time - the tally marks go quiet and the clock steps back behind the final scores. */
.scoreboard-final .scoreboard-accent { opacity: 0.35; }
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }`,
    hasAccent: true,
    // The stage: the width this board holds a full match at (two long club names, two-digit
    // scores) without giving any of them up. Short names leave the room where the anchor is.
    stageWidth: 980,
    fields: matchBoardFields({
      teamA: 'TIGERS', scoreA: '98', teamB: 'FALCONS', scoreB: '101',
      period: 'Q4', clock: '01:32', periods: TALLIES,
      colourA: '#d4470f', colourB: '#12409f',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: matchBoardRuntimeJs(),
  }),
);

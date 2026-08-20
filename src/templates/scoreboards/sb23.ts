// sb23 "Wire Bug" - the EDITORIAL compact scorebug, sibling of lt25 "Masthead" and al11
// "Breaking Edition". The scorebug type's editorial cell: the agency-wire look a newspaper's
// live blog and a results service both use, where nothing is drawn that is not information.
//
// THE COMPOSITION, and what makes it a different graphic rather than a re-skin of sb06: the
// board is a ROW OF FLAT CELLS with a hard seam between each, and the club colour is the CELL
// ITSELF rather than a bar or a chip beside the code. Every other bug in the pack draws a
// panel and places things on it; this one has no panel at all - the cells butt against each
// other and the strip's shape is the sum of them. The three kinds of number are told apart by
// their GROUND rather than by their size: a score sits on the palette's own printed surface, a
// clock on that surface stepped hard toward the ink, a period on it stepped half way.
//
// Those grounds are mixed FROM the palette rather than written as hex, which is what lets the
// strip keep working when the Style panel hands it a palette it was not drawn in: in the
// editorial ink-and-paper pair the scores read dark-on-light and the clock light-on-dark, and
// in a dark palette the same three steps simply run the other way.
//
// No radius, no blur, one flat drop - the editorial family's printed surface, at the smallest
// size a scoreboard is ever set.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb23: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb23',
    category: 'scoreboard',
    name: 'Wire Bug',
    styleTag: 'editorial',
    description: 'A flat wire-service bug: club-colour name cells, paper score cells, an ink clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'ARC' }],
    logo: 'none',
    animationPresets: ['mask-wipe', 'line-reveal', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'top-left',
  },
  {
    name: 'Wire Bug',
    description:
      'The editorial compact scorebug, sibling of the lt25 Masthead lower third: a row of flat ' +
      'cells with a hard seam between them and no panel behind. Each club code sits on its own ' +
      'colour, each score in a paper cell, and the clock and period in ink cells at the end - ' +
      'so the reading order is club, score, club, score, time, without a single drawn ' +
      'decoration. Counts up, for the sports whose clock does.',
    uicolor: '6',
  },
  () => ({
    // Structure: an accent rule over [ARC | 2] [seam] [YLE | 1] [67:14] [2ND].
    html: `    <!-- Wire Bug: editorial flat cells - colour name cell, paper score cell, ink clock cells. -->
    <div class="scoreboard-box">
      <!-- The accent rule - a printed line across the strip's head, and the marker the machine dims. -->
      <div class="scoreboard-accent"></div>
      <!-- Team A: the club colour IS the cell, the score sits in paper beside it. -->
      <div class="scoreboard-cell scoreboard-name-cell scoreboard-name-a">
        <div class="scoreboard-mask"><span id="f0" class="scoreboard-team">ARC</span></div>
      </div>
      <div class="scoreboard-cell scoreboard-score-cell">
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">2</span></div>
      </div>
      <!-- Team B: the identical pair, so neither side reads as the home team by its drawing. -->
      <div class="scoreboard-cell scoreboard-name-cell scoreboard-name-b">
        <div class="scoreboard-mask"><span id="f2" class="scoreboard-team">YLE</span></div>
      </div>
      <div class="scoreboard-cell scoreboard-score-cell">
        <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">1</span></div>
      </div>
      <!-- The clock cell - ink ground, counting UP (football, rugby, the sports that add time). -->
      <div class="scoreboard-cell scoreboard-time-cell">
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'up', '67:14')}</div>
      </div>
      <!-- The period cell - the same ink ground one step quieter, so it reads as the caption. -->
      <div class="scoreboard-cell scoreboard-phase-cell">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">2ND</span></div>
      </div>
${colourHoldersHtml('f6', 'f7', '#12409f', '#6b2fa0')}
    </div>`,
    css: `/* The strip - NO panel: the cells are the graphic, and their seams are its only lines. */
.scoreboard-box {
  position: relative;              /* anchors the accent cap */
  display: flex;                   /* every cell in one row */
  align-items: stretch;            /* each cell runs the full height of the strip */
  box-shadow: var(--panel-shadow); /* the editorial family's single flat lift */
}

/* The accent rule - a printed line across the strip's head, which is the editorial family's
   accent geometry (a 2px rule, never a chip). It is the design's one drawn element and the
   marker the result group dims at full time, and it is drawn OVER the cells rather than beside
   them: a block at the end of the row would be a chip, which this family does not use. */
.scoreboard-accent {
  position: absolute;              /* pinned across the strip's top edge */
  left: 0;                         /* edge to edge… */
  right: 0;                        /* …of the whole row of cells */
  top: 0;                          /* along the top */
  height: var(--accent-weight);    /* the family's rule weight */
  background: var(--accent);       /* the one accent surface on the whole strip */
  transform-origin: left center;   /* the line-reveal preset draws it from the left */
  z-index: 1;                      /* over the cells, so the rule is never half-covered */
}

/* A cell - the shared box. Cells butt against each other; the seam is a border, not a gap. */
.scoreboard-cell {
  display: flex;                   /* the value sits on the cell's centre line */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  padding: calc(10px * var(--scale)) calc(18px * var(--scale));  /* printed-cell padding */
  min-width: 0;                    /* lets a long club code shrink rather than push the strip */
}

/* The club-code cell - the club colour is the ground, not an ornament beside the words. */
.scoreboard-name-cell {
  flex: 1 1 0;                     /* the two club cells share the stage's spare room between them */
  padding-left: calc(24px * var(--scale));  /* codes get more air than figures do */
  padding-right: calc(24px * var(--scale)); /* symmetric, so the cell reads as a block */
}
.scoreboard-name-a { background: var(--team-a, var(--accent)); }   /* home club colour */
.scoreboard-name-b { background: var(--team-b, var(--text-dim)); }  /* away club colour */

/* The team code - condensed caps, the size a three-letter code is read at from a sofa. */
.scoreboard-team {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* the code's glance size */
  font-weight: 700;                /* solid on a coloured ground */
  line-height: 1.05;               /* one tight row */
  letter-spacing: 0.02em;          /* caps on colour need a hair of air */
  text-transform: uppercase;       /* codes are caps, whatever the operator types */
  color: #ffffff;                  /* white on the club colour, whichever colour they chose */
}

${clipOneLineCss('.scoreboard-team', 190)}

/* The score cell - the PANEL's own ground. A score is the figure the eye goes to, so it gets
   the graphic's printed surface (paper in the editorial palettes, the panel in any other), and
   its type takes the matching text colour - so the pair is legible in whatever palette the
   Style panel hands this design, without a hex being written here. */
.scoreboard-score-cell {
  min-width: calc(72px * var(--scale));  /* two digits always fit without the strip breathing */
  background: var(--panel-bg);     /* the palette's printed surface */
}
.scoreboard-score {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* level with the code beside it */
  font-weight: 700;                /* the printed figure's weight */
  line-height: 1;                  /* the digit sits on the cell's centre line */
  color: var(--text-color);        /* the palette's ink, on the palette's paper */
  font-variant-numeric: tabular-nums;  /* digits share one width - no jitter as scores tick */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-score', 120)}

/* The clock cell - the third kind of number, told apart by its ground: the panel STEPPED
   TOWARD the ink, so it separates from the score cells in a light palette and in a dark one. */
.scoreboard-time-cell {
  min-width: calc(140px * var(--scale)); /* holds "104:00" without the strip resizing */
  background: color-mix(in srgb, var(--text-color) 88%, var(--panel-bg));  /* the inked cell */
}
.scoreboard-clock {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* under the score, over the caption */
  font-weight: 600;                /* a shade lighter than the scores it must not outshout */
  line-height: 1;                  /* single row */
  color: var(--panel-bg);          /* the paper colour, inverted onto the inked cell */
  font-variant-numeric: tabular-nums;  /* the whole point: the strip never twitches per second */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-clock', 190)}

/* The period cell - the caption at the end of the strip: the same inked ground one step
   lighter, so the seam between clock and caption reads without a second colour. */
.scoreboard-phase-cell {
  background: color-mix(in srgb, var(--text-color) 82%, var(--panel-bg));
}
.scoreboard-phase {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* label scale, above the type floor */
  font-weight: 700;                /* a printed caption is set solid */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a caption, whatever they typed */
  color: color-mix(in srgb, var(--panel-bg) 90%, var(--text-color));  /* the paper colour, a step back from the clock beside it */
}

${clipOneLineCss('.scoreboard-phase', 150)}

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock cell steps back to the caption's ground, so it stops reading as live. */
.scoreboard-break .scoreboard-time-cell { background: color-mix(in srgb, var(--text-color) 74%, var(--panel-bg)); }
.scoreboard-break .scoreboard-clock { color: color-mix(in srgb, var(--panel-bg) 62%, var(--text-color)); }

/* The period ran out - the clock takes the accent, the cue the sport itself gives. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time - the cap goes quiet and the scores take the accent's ground. */
.scoreboard-final .scoreboard-accent { background: var(--text-dim); }
.scoreboard-final .scoreboard-score-cell { background: var(--accent); }
.scoreboard-final .scoreboard-score { color: var(--accent-ink); }`,
    hasAccent: true,
    // The stage: the width this board holds a full match at (two long club names, two-digit
    // scores) without giving any of them up. Short names leave the room where the anchor is.
    stageWidth: 960,
    fields: scorebugFields({
      teamA: 'ARC', scoreA: '2', teamB: 'YLE', scoreB: '1',
      period: '2ND', clock: '67:14', colourA: '#12409f', colourB: '#6b2fa0',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

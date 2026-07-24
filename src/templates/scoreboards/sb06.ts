// sb06 "Volt Scorebug" — the sport compact scorebug, sibling of sb01 "Match Strip" and
// lt06 "Split Bar". The stadium look: a hard black slab with a leaning accent cap, club
// colours as full-height bars behind the team codes, and a countdown clock in its own tile.
//
// This is the pack's basketball / ice-hockey shaped bug: the clock counts DOWN (data-count
// "down"), stops itself at zero and flashes the tile, because in those sports the period ends
// when the clock does and nobody presses anything to make that true.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb06: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb06',
    category: 'scoreboard',
    name: 'Volt Scorebug',
    styleTag: 'sport',
    description: 'A hard sport slab bug: colour bars behind team codes, scores, and a shot-style countdown.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'LAL' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-left',
  },
  {
    name: 'Volt Scorebug',
    description:
      'The sport compact scorebug, sibling of sb01 Match Strip and lt06 Split Bar: a hard black ' +
      'slab with a leaning accent cap, each team code sitting on its own club-colour bar, and a ' +
      'countdown clock in a tile that flashes accent when the period runs out. Built for the ' +
      'clock-down sports — basketball, ice hockey, handball.',
    uicolor: '2',
  },
  () => ({
    // Structure: [leaning cap] [colour bar + LAL 88] [colour bar + BOS 84] [Q4 / 2:41 tile].
    html: `    <!-- Volt Scorebug: sport slab — leaning cap, two colour-barred team codes, countdown tile. -->
    <div class="scoreboard-box">
      <!-- The accent cap — the leaning slab edge that also serves as the flag marker. -->
      <div class="scoreboard-accent"></div>
      <!-- Team A: the club colour is the bar the code sits on. -->
      <div class="scoreboard-team-block scoreboard-team-a">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">LAL</span></div>
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">88</span></div>
      </div>
      <!-- Team B: identical block, so neither side reads as the favourite. -->
      <div class="scoreboard-team-block scoreboard-team-b">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">BOS</span></div>
        <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">84</span></div>
      </div>
      <!-- The clock tile — the period over a clock that runs DOWN and stops itself at zero. -->
      <div class="scoreboard-clockblock">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">Q4</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '12:00')}</div>
      </div>
${colourHoldersHtml('f6', 'f7', '#fdb927', '#007a33')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. A sport board earns its weight from contrast, not blur. */
.scoreboard-box {
  position: relative;              /* anchors the accent cap */
  display: flex;                   /* team blocks and the clock tile in one row */
  align-items: stretch;            /* every block is the full height of the slab */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the colour bars and seams stop at the slab's edge */
}

/* The accent cap — a leaning wedge closing the left end, the family's one signature shape.
   It is also the flag marker the machine's flag group pulses. */
.scoreboard-accent {
  position: absolute;              /* pinned over the slab's left end */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: calc(18px * var(--scale));  /* a visible wedge, not a hairline */
  background: var(--accent);       /* the one accent surface */
  clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);  /* the sport lean, cut into the wedge */
}

/* One team block: the club colour bar, the code, the score. */
.scoreboard-team-block {
  position: relative;              /* the colour bar is placed against this */
  display: flex;                   /* bar, code and score in one row */
  align-items: center;             /* all three on the slab's center line */
  gap: calc(16px * var(--scale));  /* air inside the block */
  padding: calc(11px * var(--scale)) calc(22px * var(--scale));  /* the slab's height comes from here */
  min-width: 0;                    /* lets a long code shrink rather than overflow */
}
.scoreboard-team-a { padding-left: calc(34px * var(--scale)); }  /* clear the leaning cap */
.scoreboard-team-b {
  box-shadow: inset calc(1px * var(--scale)) 0 0 0 rgba(255, 255, 255, 0.10);  /* hairline seam between the sides */
}

/* The club colour bar — a full-height stripe behind the code, the loudest club signal here. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* never gives up width */
  width: calc(8px * var(--scale)); /* a bar, not a dot — visible at broadcast distance */
  align-self: stretch;             /* full height of the team block */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-team-b .scoreboard-colour-chip {
  background: var(--team-b, var(--text-dim));  /* the away club's colour, or a quiet neutral */
}

/* The team code — heavy condensed caps, the sport family's voice. */
.scoreboard-team {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* a three-letter code at glance size */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.05;               /* tight — condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* codes are caps, whatever the operator types */
  color: var(--text-color);        /* paper white on the slab */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

${clipOneLineCss('.scoreboard-team', 200)}

${clipOneLineCss('.scoreboard-score', 130)}

/* The score — the biggest figure on the slab, tabular so a change never shifts the layout. */
.scoreboard-score {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* scores lead a scoreboard */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* the figure sits tight on the center line */
  color: var(--text-color);        /* white: on this design the ACCENT belongs to the clock */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The clock tile — an accent-underlined block closing the slab. */
.scoreboard-clockblock {
  display: flex;                   /* period and clock… */
  flex-direction: column;          /* …stacked as one column */
  align-items: center;             /* both centered on the tile's axis */
  justify-content: center;         /* vertically centered in the slab */
  gap: calc(1px * var(--scale));   /* the two rows read as one unit */
  padding: calc(8px * var(--scale)) calc(24px * var(--scale));  /* snug frame around the two rows */
  background: rgba(255, 255, 255, 0.06);  /* one step off the slab, so the tile reads as separate */
  border-bottom: calc(3px * var(--scale)) solid var(--accent);  /* the accent underline */
}

/* The period label — the sport label face, tracked wide. */
.scoreboard-phase {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid: a sport label is never light */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

${clipOneLineCss('.scoreboard-phase', 150)}

/* The countdown — the tile's anchor, tabular so the last minute never jitters. */
.scoreboard-clock {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the loudest thing in the tile */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.05;               /* tight under the period label */
  color: var(--text-color);        /* white while there is time left */
  font-variant-numeric: tabular-nums;  /* the whole point: digits never shift width */
}

${clipOneLineCss('.scoreboard-clock', 150)}

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock is held, and the tile stops shouting. */
.scoreboard-break .scoreboard-clockblock { border-bottom-color: var(--text-dim); }
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }

/* The period ran out — the clock turns accent, which is the cue the sport itself gives. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the accent moves to the scores, and the clock steps back. */
.scoreboard-final .scoreboard-score { color: var(--accent); }
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }`,
    hasAccent: true,
    fields: scorebugFields({
      teamA: 'LAL', scoreA: '88', teamB: 'BOS', scoreB: '84',
      period: 'Q4', clock: '12:00', colourA: '#fdb927', colourB: '#007a33',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

// sb24 "Arena Board" - the venue scoreboard, drawn as the object hanging over the court
// rather than as a strip laid over the picture. Sport family, sibling of sb06 "Volt Scorebug"
// and lt05 "Angle Slab", and a deliberately different graphic from it: sb06 is a flat
// broadcast slab, this is a piece of HARDWARE.
//
// THE COMPOSITION: three leaning plates - the home plate, the centre column, the guest plate -
// each with a recessed digit WELL sunk into it. The score is not text on a panel; it is a lit
// readout inside a dark window, with the panel's own colour on the frame around it. The centre
// column stacks the period well over the clock well, so the middle of the board reads
// top-to-bottom while the sides read left-to-right, which is how a real arena board is laid
// out and why it survives being read from the back of a stand.
//
// The lit look is drawn ON THE WELL, never as a text-shadow on the figure: every line here
// sits inside an `.scoreboard-mask` reveal wrapper whose `overflow: hidden` would clip a glow
// off the type, and a half-clipped glow reads as a rendering fault.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb24: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb24',
    category: 'scoreboard',
    name: 'Arena Board',
    styleTag: 'sport',
    description: 'The venue board: leaning club plates with lit score wells around a period-over-clock column.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'snap-stinger', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'oswald',
    defaultZone: 'top-center',
  },
  {
    name: 'Arena Board',
    description:
      'The arena scoreboard as an object: two leaning club plates, each with its score sunk ' +
      'into a lit readout well, around a centre column stacking the period over the match ' +
      'clock. The plates wear the club colours, the readouts wear the accent, and the clock ' +
      'counts DOWN and stops itself at zero - the board a venue actually hangs over a court.',
    uicolor: '3',
  },
  () => ({
    // Structure: [HOME plate + well] [PERIOD well / CLOCK well] [GUEST plate + well].
    html: `    <!-- Arena Board: two leaning club plates with lit score wells around a period/clock column. -->
    <div class="scoreboard-box">
      <!-- The home plate - the club colour is the casing, the score is the readout inside it. -->
      <div class="scoreboard-plate scoreboard-plate-a">
        <div class="scoreboard-plate-inner">
          <div class="scoreboard-mask scoreboard-plate-title"><span id="f0" class="scoreboard-team">HOME</span></div>
          <div class="scoreboard-well">
            <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">87</span></div>
          </div>
        </div>
      </div>
      <!-- The centre column - the board's own casing, the only part that is not a club's. -->
      <div class="scoreboard-column">
        <!-- The accent rail across the column's head: the design's accent element, drawn as its
             own node so the line-reveal preset scales a RAIL rather than the whole casing. -->
        <div class="scoreboard-accent"></div>
        <div class="scoreboard-column-inner">
          <div class="scoreboard-mask scoreboard-column-title"><span id="f4" class="scoreboard-phase">PERIOD 4</span></div>
          <div class="scoreboard-well scoreboard-well-clock">
            <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '03:14')}</div>
          </div>
        </div>
      </div>
      <!-- The guest plate - the same casing in the away club's colour. -->
      <div class="scoreboard-plate scoreboard-plate-b">
        <div class="scoreboard-plate-inner">
          <div class="scoreboard-mask scoreboard-plate-title"><span id="f2" class="scoreboard-team">GUEST</span></div>
          <div class="scoreboard-well">
            <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">82</span></div>
          </div>
        </div>
      </div>
${colourHoldersHtml('f6', 'f7', '#1c4fd8', '#c8202e')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The board - three plates in a row, no panel behind them. The plates ARE the object. */
.scoreboard-box {
  display: flex;                   /* the three plates sit side by side */
  align-items: stretch;            /* the centre column runs the plates' full height */
  gap: calc(6px * var(--scale));   /* a hairline seam of picture between the castings */
}

/* A club plate - a leaning casing. The lean is the sport family's -8 degrees, and the
   contents counter-skew so no digit is ever printed at an angle. */
.scoreboard-plate {
  padding: calc(14px * var(--scale)) calc(26px * var(--scale)); /* the casing's frame around the readout */
  transform: skewX(-8deg);         /* SKEW: the family's lean, applied to the casing only */
  box-shadow: var(--panel-shadow); /* the family's hard offset lift */
}
.scoreboard-plate-a { background: var(--team-a, var(--accent)); }  /* the home club's casing */
.scoreboard-plate-b { background: var(--team-b, #7a1420); }        /* the away club's casing */
.scoreboard-plate-inner {
  display: flex;                   /* title over readout… */
  flex-direction: column;          /* …stacked */
  align-items: center;             /* both centred on the plate's axis */
  gap: calc(8px * var(--scale));   /* the two read as one unit */
  transform: skewX(8deg);          /* undo the casing's lean - contents stand upright */
}

/* The club name on the casing - a plate is labelled, not captioned: solid caps, no tracking
   games, because it is silk-screened onto metal in the reference this is drawn from. */
.scoreboard-plate-title { max-width: calc(260px * var(--scale)); }  /* the casing's own measure */
.scoreboard-team {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* label size on the casing */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* one tight row */
  letter-spacing: 0.03em;          /* caps on colour need a hair of air */
  text-transform: uppercase;       /* a plate is always shouted */
  color: #ffffff;                  /* white on the club colour, whichever colour they chose */
}

${clipOneLineCss('.scoreboard-team', 250)}

/* The readout well - a window sunk into the casing. The inset shadow is the recess, the outer
   glow is the light escaping it, and both live HERE rather than on the figure: the figure sits
   in a reveal mask whose overflow would clip a glow in half. */
.scoreboard-well {
  display: flex;                   /* the figure sits on the well's centre line */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  min-width: calc(168px * var(--scale)); /* three digits fit without the casing resizing */
  padding: calc(6px * var(--scale)) calc(20px * var(--scale));  /* the dark margin around the light */
  background: #0a0b0f;             /* the unlit window - near-black, never pure black */
  box-shadow:
    inset 0 calc(3px * var(--scale)) calc(10px * var(--scale)) rgba(0, 0, 0, 0.8),  /* the recess */
    0 0 calc(26px * var(--scale)) color-mix(in srgb, var(--accent) 34%, transparent);  /* escaping light */
}

/* The score - the lit figure. Tabular by contract: a readout that changes width per digit is
   the single most visible way an on-air board reads as amateur. */
.scoreboard-score {
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* the loudest thing on the board */
  font-weight: 700;                /* a lit segment is solid, never light */
  line-height: 1;                  /* the figure fills its window */
  letter-spacing: 0.04em;          /* segments stand apart, as on real hardware */
  color: var(--accent);            /* the lit colour - the graphic's one accent */
  font-variant-numeric: tabular-nums;  /* digits share one width - no twitch per bucket */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-score', 220)}

/* The centre column - the board's own casing rather than a club's, so it takes the panel
   colour and carries the accent hairline that marks it as the match's own information. */
.scoreboard-column {
  position: relative;              /* anchors the accent rail across its head */
  padding: calc(14px * var(--scale)) calc(24px * var(--scale));  /* the same frame as a plate */
  background: var(--panel-bg);     /* the family's near-black casing */
  transform: skewX(-8deg);         /* the same lean as the plates beside it */
  box-shadow: var(--panel-shadow); /* the family's hard offset lift */
}

/* The accent rail - the one accent surface on the casing, and the marker the result group
   dims at full time. Its own node, so the line-reveal preset draws a rail rather than
   squashing the column it sits on. */
.scoreboard-accent {
  position: absolute;              /* pinned across the column's head */
  left: 0;                         /* edge to edge… */
  right: 0;                        /* …of the casing */
  top: 0;                          /* along its top edge */
  height: var(--accent-weight);    /* the family's accent weight */
  background: var(--accent);       /* the accent surface */
  transform-origin: left center;   /* the line-reveal preset draws it from the left */
}
.scoreboard-column-inner {
  display: flex;                   /* period over clock… */
  flex-direction: column;          /* …stacked, so the middle reads downward */
  align-items: center;             /* centred on the column's axis */
  gap: calc(8px * var(--scale));   /* the two rows read as one unit */
  transform: skewX(8deg);          /* undo the column's lean */
}

/* The period label - the board's caption, in the family's label face. */
.scoreboard-column-title { max-width: calc(220px * var(--scale)); }  /* the column's own measure */
.scoreboard-phase {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale, above the type floor */
  font-weight: 700;                /* sport labels are never light */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever they typed */
  color: var(--label-color);       /* the family's label colour */
}

${clipOneLineCss('.scoreboard-phase', 200)}

/* The clock well - the same window, sized for "12:00" rather than for a score. */
.scoreboard-well-clock {
  min-width: calc(196px * var(--scale)); /* holds "104:00" without the column resizing */
}
.scoreboard-clock {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* under the scores, over the label */
  font-weight: 700;                /* lit segments are solid */
  line-height: 1;                  /* fills its window */
  letter-spacing: 0.04em;          /* segments stand apart */
  color: var(--accent);            /* lit in the graphic's accent, like the scores */
  font-variant-numeric: tabular-nums;  /* the whole point: no width change per second */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

${clipOneLineCss('.scoreboard-clock', 240)}

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the clock window goes dark, which is exactly what a held board looks like. */
.scoreboard-break .scoreboard-well-clock { box-shadow: inset 0 calc(3px * var(--scale)) calc(10px * var(--scale)) rgba(0, 0, 0, 0.8); }
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }

/* The period ran out - the clock window burns at full brightness. */
.scoreboard-expired .scoreboard-well-clock {
  box-shadow:
    inset 0 calc(3px * var(--scale)) calc(10px * var(--scale)) rgba(0, 0, 0, 0.8),  /* the recess */
    0 0 calc(40px * var(--scale)) color-mix(in srgb, var(--accent) 62%, transparent);  /* full brightness */
}

/* Full time - the clock steps back and the accent rail goes quiet over the final figures. */
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }
.scoreboard-final .scoreboard-accent { background: var(--text-dim); }`,
    hasAccent: true,
    // The stage: the width this board holds a full match at (two long club names, two-digit
    // scores) without giving any of them up. Short names leave the room where the anchor is.
    stageWidth: 870,
    fields: scorebugFields({
      teamA: 'HOME', scoreA: '87', teamB: 'GUEST', scoreB: '82',
      period: 'PERIOD 4', clock: '03:14', colourA: '#1c4fd8', colourB: '#c8202e',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

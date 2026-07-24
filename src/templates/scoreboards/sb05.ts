// sb05 "House Scorebug" — the NoaCG compact scorebug, sibling of sb03 "House Score" and
// lt11 "House Strap". The smallest honest live board: two club colour chips, two abbreviated
// team names against their scores, and a clock block carrying the period and the running time.
//
// A scorebug is the graphic that stays on air for ninety minutes, so it is drawn to be ignored:
// one void panel, one amber edge, no glow on anything that moves, and tabular figures so a
// ticking clock never shifts the layout by a pixel.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb05: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb05',
    category: 'scoreboard',
    name: 'House Scorebug',
    styleTag: 'noacg',
    description: 'The house scorebug: colour chips, two teams, a period chip and a running clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-center',
  },
  {
    name: 'House Scorebug',
    description:
      'The NoaCG compact scorebug, sibling of sb03 House Score: a void blur strip with an amber ' +
      'top edge, a club colour chip beside each team, scores in void chips, and a clock block ' +
      'holding the period and the match clock. The clock counts up and can be corrected on air; ' +
      'half time dims the board and full time settles the scores to white.',
    uicolor: '4',
  },
  () => ({
    // Structure: [amber edge] [chip HOME 0] [chip AWAY 0] [period / clock tile].
    html: `    <!-- House Scorebug: void strip — colour chip, team, score · twice · then the clock tile. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the design's accent AND the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Team A: club colour chip, name, score. -->
      <div class="scoreboard-team-block scoreboard-team-a">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">0</span></div>
      </div>
      <!-- Team B: the same block, so the two sides read identically. -->
      <div class="scoreboard-team-block scoreboard-team-b">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">0</span></div>
      </div>
      <!-- The clock tile — the period over the running match clock. -->
      <div class="scoreboard-clockblock">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">1H</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'up', '0:00')}</div>
      </div>
${colourHoldersHtml('f6', 'f7', '#f6a623', '#7dd3fc')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void, with the family's amber top edge. */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  display: flex;                   /* the two team blocks and the clock block in one row */
  align-items: stretch;            /* every block is the full height of the strip */
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
  overflow: hidden;                /* the block separators stop at the panel's edge */
}

/* The accent edge — the amber bar fused to the left, doubling as the machine's flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the strip's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* One team block: colour chip, name, score. The first block clears the accent edge. */
.scoreboard-team-block {
  display: flex;                   /* chip, name and score share one row */
  align-items: center;             /* all three on the strip's center line */
  gap: calc(18px * var(--scale));  /* air inside the block */
  padding: calc(16px * var(--scale)) calc(25px * var(--scale));  /* the strip's height comes from here */
  min-width: 0;                    /* lets a long team name shrink and wrap, not overflow */
}
.scoreboard-team-a { padding-left: calc(33px * var(--scale)); }  /* clear the accent edge */

/* The club colour chip — the one place a team's own colour appears on this bug. It falls
   back to the graphic's accent, so a board with no colours set still looks deliberate. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the chip never gives up width */
  width: calc(8px * var(--scale)); /* a slim vertical mark, not a badge */
  align-self: stretch;             /* full height of the team block */
  border-radius: calc(4px * var(--scale));  /* softened ends, house chip family */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-team-b .scoreboard-colour-chip {
  background: var(--team-b, var(--text-dim));  /* the away club's colour, or a quiet neutral */
}

/* The team name — house display type, a step under the scores. */
.scoreboard-team {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* readable at a glance, quiet next to the score */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

${clipOneLineCss('.scoreboard-team', 240)}

${clipOneLineCss('.scoreboard-score', 130)}

/* The score — the loudest figure on the strip, in the accent, tabular so it never jitters. */
.scoreboard-score {
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* scores lead a scoreboard */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* the figure sits tight on the center line */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The clock block — a denser void tile closing the strip, period over clock. */
.scoreboard-clockblock {
  display: flex;                   /* period and clock… */
  flex-direction: column;          /* …stacked as one column */
  align-items: center;             /* both centered on the block's axis */
  justify-content: center;         /* vertically centered in the strip */
  gap: calc(3px * var(--scale));   /* the two rows read as one unit */
  padding: calc(11px * var(--scale)) calc(28px * var(--scale));  /* snug frame around the two rows */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset calc(1px * var(--scale)) 0 0 0 rgba(255, 255, 255, 0.08);  /* a hairline seam from the team blocks */
}

/* The period chip — the house mono label, in the accent. */
.scoreboard-phase {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

${clipOneLineCss('.scoreboard-phase', 150)}

/* The match clock — mono digits, tabular, so a ticking second never moves the strip. */
.scoreboard-clock {
  font-family: var(--font-label);  /* mono: a clock is data, not display type */
  font-size: calc(33px * var(--scale) * var(--type-scale));  /* clearly the block's anchor */
  font-weight: 500;                /* matches the label's weight — one mono voice */
  line-height: 1.05;               /* tight under the period chip */
  color: var(--text-color);        /* primary white — the clock is read constantly */
  font-variant-numeric: tabular-nums;  /* the whole point: digits never shift width */
}

${clipOneLineCss('.scoreboard-clock', 150)}

/* ── Match state (the machine's groups add these to the root) ── */

/* Half time / an interval: the clock is held, so it steps back and says so. */
.scoreboard-break .scoreboard-clock { color: var(--text-dim); }
.scoreboard-break .scoreboard-phase { color: var(--text-dim); }

/* A counting-down period that reached zero — the amber the operator cannot miss. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the scores settle to white; the match is decided, nothing is live any more. */
.scoreboard-final .scoreboard-score { color: var(--text-color); }
.scoreboard-final .scoreboard-clock { color: var(--text-dim); }`,
    hasAccent: true,
    fields: scorebugFields(),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

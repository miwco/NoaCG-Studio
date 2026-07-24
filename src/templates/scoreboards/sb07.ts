// sb07 "Frost Scorebug" — the glass compact scorebug, sibling of sb04 "Frost Score" and
// lt08 "Frosted Card". A single frosted pill: the two clubs' colours as soft dots, the score
// pair in the middle around a hairline divider, and the period and clock riding the right end.
//
// The glass family's shape is one rounded surface rather than a row of tiles, so this bug does
// not segment: the seams are hairlines inside one pill, which is what keeps it feeling like a
// pane of frosted glass laid over the picture rather than a control panel bolted to it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb07: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb07',
    category: 'scoreboard',
    name: 'Frost Scorebug',
    styleTag: 'glass',
    description: 'A frosted scorebug pill: soft colour dots, a centred score pair, period and clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Sweden' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-center',
  },
  {
    name: 'Frost Scorebug',
    description:
      'The glass compact scorebug, sibling of sb04 Frost Score and lt08 Frosted Card: one ' +
      'frosted pill holding two club colour dots, the team names against a centred score pair, ' +
      'and a hairline-separated clock end carrying the period and the running time. Drawn for ' +
      'handball and the indoor sports — the clock counts down and the pill glows when a period ends.',
    uicolor: '5',
  },
  () => ({
    // Structure: one pill — [dot Sweden 24] [ : ] [26 Denmark dot] [hairline] [2H / 8:12].
    html: `    <!-- Frost Scorebug: one frosted pill — two teams around a centred score pair, then the clock. -->
    <div class="scoreboard-box">
      <!-- The accent bar — a soft glass edge that doubles as the flag marker. -->
      <div class="scoreboard-accent"></div>
      <!-- Team A: colour dot, name, score. -->
      <div class="scoreboard-team-block scoreboard-team-a">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Sweden</span></div>
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">24</span></div>
      </div>
      <!-- The divider — a soft colon holding the two scores together. -->
      <div class="scoreboard-colon">:</div>
      <!-- Team B: mirrored, so the two scores meet in the middle of the pill. -->
      <div class="scoreboard-team-block scoreboard-team-b">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Denmark</span></div>
        <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">26</span></div>
      </div>
      <!-- The clock end — behind a hairline, inside the same pane of glass. -->
      <div class="scoreboard-clockblock">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">2H</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'down', '30:00')}</div>
      </div>
${colourHoldersHtml('f6', 'f7', '#fecc02', '#c60c30')}
    </div>`,
    css: `${labelFontFaceCss(fontById('manrope'))}

/* The pill — one frosted surface. Everything else is drawn INSIDE it, never bolted on. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  display: flex;                   /* teams, colon and clock end in one row */
  align-items: center;             /* everything shares the pill's center line */
  gap: calc(20px * var(--scale));  /* air between the blocks */
  padding: calc(15px * var(--scale)) calc(33px * var(--scale)) calc(15px * var(--scale)) calc(38px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
  overflow: hidden;                /* the accent bar is clipped to the pill's radius */
}

/* The accent bar — a soft vertical edge inside the pill's radius, and the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the pill's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  opacity: 0.9;                    /* the glass family softens its accents rather than glowing */
}

/* One team group: colour dot, name, score, reading as a unit. */
.scoreboard-team-block {
  display: flex;                   /* dot, name and score in one row */
  align-items: center;             /* all three on the pill's center line */
  gap: calc(15px * var(--scale));  /* air inside the group */
  min-width: 0;                    /* lets a long name shrink and clip, not overflow */
}
/* Group B mirrors, so both scores end up beside the colon. */
.scoreboard-team-b { flex-direction: row-reverse; }

/* The club colour dot — small and soft, the glass family's way of carrying a hard colour. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the dot keeps its size whatever the text does */
  width: calc(15px * var(--scale));  /* small on purpose — a marker, not a badge */
  height: calc(15px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
  box-shadow: 0 0 0 calc(3px * var(--scale)) rgba(255, 255, 255, 0.18);  /* a soft glass ring */
}
.scoreboard-team-b .scoreboard-colour-chip {
  background: var(--team-b, var(--text-dim));  /* the away club's colour, or a quiet neutral */
}

/* The team name — the glass family's rounded sans, sentence case: full names, not codes. */
.scoreboard-team {
  font-size: calc(33px * var(--scale) * var(--type-scale));  /* readable, deliberately quiet */
  font-weight: 600;                /* semibold: present without shouting */
  line-height: 1.15;               /* comfortable for a mixed-case name */
  color: var(--text-color);        /* primary text on the frost */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

${clipOneLineCss('.scoreboard-team', 230)}

${clipOneLineCss('.scoreboard-score', 130)}

/* The score — the pill's anchor, tabular so a change never nudges the colon off centre. */
.scoreboard-score {
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* scores lead a scoreboard */
  font-weight: 800;                /* the heaviest thing on the pill */
  line-height: 1;                  /* sits tight on the center line */
  color: var(--text-color);        /* white — the accent stays in the bar and the dots */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The colon — a soft accent divider between the two scores. */
.scoreboard-colon {
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: 700;                /* solid, not a hairline */
  line-height: 1;                  /* on the center line with the figures */
  color: var(--accent);            /* the accent that ties the pill together */
  opacity: 0.85;                   /* softened, like everything else in this family */
}

/* The clock end — same pane of glass, separated by a hairline rather than a seam. */
.scoreboard-clockblock {
  display: flex;                   /* period and clock… */
  flex-direction: column;          /* …stacked as one column */
  align-items: center;             /* both centered on the block's axis */
  gap: calc(3px * var(--scale));   /* the two rows read as one unit */
  padding-left: calc(25px * var(--scale));  /* air after the hairline */
  margin-left: calc(5px * var(--scale));    /* the hairline's own breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.22);  /* the glass keyline, not a border */
}

/* The period label — a soft tracked caps label. */
.scoreboard-phase {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

${clipOneLineCss('.scoreboard-phase', 150)}

/* The countdown — tabular, so the last minute of a half never shifts the pill's width. */
.scoreboard-clock {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the block's anchor */
  font-weight: 700;                /* matches the period label's weight */
  line-height: 1.05;               /* tight under the label */
  color: var(--text-color);        /* primary white — the clock is read constantly */
  font-variant-numeric: tabular-nums;  /* the whole point: digits never shift width */
}

${clipOneLineCss('.scoreboard-clock', 150)}

/* ── Match state (the machine's groups add these to the root) ── */

/* An interval: the glass dims rather than changing colour — the family's quiet register. */
.scoreboard-break .scoreboard-clockblock { opacity: 0.65; }

/* The period ran out — the clock takes the accent, the one loud moment this design allows. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the scores take the accent and the clock end steps back. */
.scoreboard-final .scoreboard-score { color: var(--accent); }
.scoreboard-final .scoreboard-clockblock { opacity: 0.7; }`,
    hasAccent: true,
    fields: scorebugFields({
      teamA: 'Sweden', scoreA: '24', teamB: 'Denmark', scoreB: '26',
      period: '2H', clock: '30:00', colourA: '#fecc02', colourB: '#c60c30',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

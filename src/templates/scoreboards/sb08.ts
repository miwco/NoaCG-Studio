// sb08 "Club Scorebug" — the minimal compact scorebug, and the pack's LOCAL / AMATEUR board.
// Sibling of sb02 "Quiet Score" and lt01 "Hairline".
//
// This one is drawn for the club with one camera and a laptop, and every decision follows from
// that: FULL club names rather than three-letter codes (a district league has no codes and its
// viewers know the villages, not abbreviations), a panel-free corner stack so it survives being
// keyed over a handheld shot of a grass pitch, a count-up clock because that is what an amateur
// referee's watch does, and no glow, blur or gradient anywhere — those cost quality on the low
// bitrates a club stream actually goes out at.
//
// It is the same graphic TYPE as the stadium bugs, with the same fields and the same machine.
// That is the point of the type model: an amateur club is not offered a lesser scorebug, it is
// offered the same one drawn for its own conditions.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clampTwoLinesCss, clockSpanHtml, colourHoldersHtml, scorebugFields } from './scorebugShared';

export const sb08: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb08',
    category: 'scoreboard',
    name: 'Club Scorebug',
    styleTag: 'minimal',
    description: 'The amateur club bug: full team names, a hairline stack, and a count-up clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Ashton United' }],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-left',
  },
  {
    name: 'Club Scorebug',
    description:
      'The local and amateur sports bug, sibling of sb02 Quiet Score and lt01 Hairline: a ' +
      'panel-free corner stack with one team per row, a club colour rule down the left, full ' +
      'club names against their scores, and a period and count-up clock on a quiet footer row. ' +
      'No blur, no glow and no gradient — it is drawn to survive a low-bitrate club stream.',
    uicolor: '1',
  },
  () => ({
    // Structure: a stack — one row per club, then a quiet footer carrying the period and clock.
    html: `    <!-- Club Scorebug: panel-free stack — one row per club, then a period/clock footer. -->
    <div class="scoreboard-box">
      <!-- The accent rule — the left edge of the whole stack, and the flag marker. -->
      <div class="scoreboard-accent"></div>
      <!-- Team A row: club colour rule, full name, score. -->
      <div class="scoreboard-team-block scoreboard-team-a">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Ashton United</span></div>
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">1</span></div>
      </div>
      <!-- Team B row: identical, so neither club reads as the home side by styling alone. -->
      <div class="scoreboard-team-block scoreboard-team-b">
        <span class="scoreboard-colour-chip"></span>
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Marske Town</span></div>
        <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">1</span></div>
      </div>
      <!-- The footer — the period and the count-up clock, the quietest row on the graphic. -->
      <div class="scoreboard-clockblock">
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-phase">2nd half</span></div>
        <div class="scoreboard-mask">${clockSpanHtml('f5', 'up', '58:00')}</div>
      </div>
${colourHoldersHtml('f6', 'f7', '#d92b2b', '#1f4fd8')}
    </div>`,
    css: `${labelFontFaceCss(fontById('inter'))}

/* The stack — panel-free. A club stream is keyed over a handheld shot, and a translucent panel
   over moving grass reads as mud; a hairline stack over the picture stays legible. */
.scoreboard-box {
  position: relative;              /* anchors the accent rule */
  display: flex;                   /* the two club rows and the footer… */
  flex-direction: column;          /* …stacked as one column */
  padding-left: calc(23px * var(--scale));  /* clear the accent rule */
  text-shadow: 0 calc(1px * var(--scale)) calc(4px * var(--scale)) rgba(0, 0, 0, 0.85);  /* legibility over any picture, with no panel */
}

/* The accent rule — a thin edge down the whole stack, and the machine's flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned down the stack's left side */
  left: 0;                         /* flush with the box's left edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's rule weight */
  background: var(--accent);       /* the one accent surface — flat, never glowing */
}

/* One club row: colour rule, name, score. */
.scoreboard-team-block {
  display: flex;                   /* rule, name and score in one row */
  align-items: baseline;           /* the name and the score share a text baseline */
  gap: calc(18px * var(--scale));  /* air inside the row */
  padding: calc(6px * var(--scale)) 0;  /* the stack's vertical rhythm */
  min-width: 0;                    /* lets a long club name shrink and wrap, not overflow */
}

/* The club colour rule — a short mark before the name, the only club colour on the graphic. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(5px * var(--scale)); /* a hairline mark, in keeping with the family */
  height: calc(25px * var(--scale));  /* about a cap height — it sits with the name */
  align-self: center;              /* centred against the row rather than the baseline */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-team-b .scoreboard-colour-chip {
  background: var(--team-b, var(--text-dim));  /* the visiting club's colour, or a quiet neutral */
}

/* The club name — FULL names in sentence case, because a district league has no codes. */
.scoreboard-team {
  font-size: calc(33px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.2;                /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text, straight over the picture */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
  flex: 1;                         /* the name takes the row's spare width… */
  max-width: calc(400px * var(--scale));  /* …up to the cap a corner stack allows */
}

${clampTwoLinesCss('.scoreboard-team')}

/* The score — the one figure that has to be readable from across a clubhouse. */
.scoreboard-score {
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  min-width: calc(43px * var(--scale));  /* a shared column, so both scores line up */
  text-align: right;               /* two-digit scores stay aligned with single ones */
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* the loudest figure on the stack */
  font-weight: 700;                /* bold — the score is the point */
  line-height: 1.1;                /* tight on the row */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The footer — the period and the clock, deliberately the quietest row here. */
.scoreboard-clockblock {
  display: flex;                   /* period and clock in one row */
  align-items: baseline;           /* both on one text baseline */
  gap: calc(15px * var(--scale));  /* air between the two */
  margin-top: calc(8px * var(--scale));  /* separated from the club rows */
  padding-top: calc(9px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.20);  /* a true keyline — the family's one divider */
}

/* The period — a small tracked caps label. */
.scoreboard-phase {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* small: this row is reference, not headline */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* "EXTRA TIME" stays on one line */
}

/* The clock — counts UP, the way an amateur referee's watch does. */
.scoreboard-clock {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a reference figure, not a display one */
  font-weight: 600;                /* matches the period label */
  line-height: 1.2;                /* on the footer's baseline */
  color: var(--text-dim);          /* dimmed — the score is what matters on a club stream */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as the clock ticks */
}

/* ── Match state (the machine's groups add these to the root) ── */

/* Half time: the clock is held, and the footer says so by stepping back further. */
.scoreboard-break .scoreboard-clock { opacity: 0.6; }

/* A period that ran out — the clock takes the accent. */
.scoreboard-expired .scoreboard-clock { color: var(--accent); }

/* Full time — the scores settle to white and the footer quietens; the match is decided. */
.scoreboard-final .scoreboard-score { color: var(--text-color); }
.scoreboard-final .scoreboard-clockblock { opacity: 0.7; }`,
    hasAccent: true,
    fields: scorebugFields({
      teamA: 'Ashton United', scoreA: '1', teamB: 'Marske Town', scoreB: '1',
      period: '2nd half', clock: '58:00', colourA: '#d92b2b', colourB: '#1f4fd8',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 period · f5 clock
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

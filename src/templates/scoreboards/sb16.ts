// sb16 "Club Status Card" — the minimal match-status and final-score card, and the pack's
// amateur result graphic. Sibling of sb12 "Club Match Board" and lt01 "Hairline".
//
// The graphic a school or district club posts at the whistle, and the one most likely to be
// screenshotted and put straight on a club's social feed. So it is drawn flat and left-aligned
// with a solid panel: it stays legible cropped, rescaled, and re-encoded by someone else's app.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clampTwoLinesCss, colourHoldersHtml, matchStatusFields } from './scorebugShared';

export const sb16: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb16',
    category: 'scoreboard',
    name: 'Club Status Card',
    styleTag: 'minimal',
    description: 'The amateur result card: a hairline status row, full club names, and the score.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Ashton United' }],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Club Status Card',
    description:
      'The local and amateur match-status and final-score card, sibling of sb12 Club Match ' +
      'Board and lt01 Hairline: a flat solid panel with a left-aligned status row and live pip, ' +
      'full club names stacked with their scores, and a note row. Drawn to stay legible after ' +
      'someone crops it and posts it to a club feed.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Club Status Card: flat panel — status row, two stacked club rows, note. -->
    <div class="scoreboard-box">
      <!-- The accent rule — the left edge of the card, and the flag marker. -->
      <div class="scoreboard-accent"></div>
      <!-- The status row: a live pip and the status line. -->
      <div class="scoreboard-statusrow">
        <span class="scoreboard-pip"></span>
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-status">Full time</span></div>
      </div>
      <!-- The clubs, stacked: colour mark, full name, score. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Ashton United</span></div>
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">2</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Marske Town</span></div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">2</span></div>
        </div>
      </div>
      <!-- The note — the competition, the round, the ground. -->
      <div class="scoreboard-mask"><span id="f5" class="scoreboard-note">Northern League Division One</span></div>
${colourHoldersHtml('f6', 'f7', '#d92b2b', '#1f4fd8')}
    </div>`,
    css: `${labelFontFaceCss(fontById('inter'))}

/* The card — flat and solid. No blur: this graphic is meant to survive being re-encoded. */
.scoreboard-box {
  position: relative;              /* anchors the accent rule */
  min-width: calc(640px * var(--scale));  /* a card, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(27px * var(--scale)) calc(35px * var(--scale)) calc(24px * var(--scale)) calc(40px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

/* The accent rule — a thin left edge, and the machine's flag marker. Flat, never glowing. */
.scoreboard-accent {
  position: absolute;              /* pinned down the card's left side */
  left: 0;                         /* flush with the box's left edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's rule weight */
  background: var(--accent);       /* the one accent surface */
}

/* The status row — the pip and the status line, above a keyline. */
.scoreboard-statusrow {
  display: flex;                   /* pip and status in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(13px * var(--scale));  /* air between them */
  padding-bottom: calc(13px * var(--scale));  /* air above the keyline */
  border-bottom: 1px solid rgba(255, 255, 255, 0.20);  /* the family's one divider */
}
.scoreboard-pip {
  flex-shrink: 0;                  /* the pip keeps its size whatever the text does */
  width: calc(12px * var(--scale)); /* small on purpose — a marker, not a badge */
  height: calc(12px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--accent);       /* the live signal wears the accent */
}
.scoreboard-status {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* small: this row is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The clubs, stacked as rows. */
.scoreboard-main {
  display: flex;                   /* the two club rows… */
  flex-direction: column;          /* …stacked as one column */
  padding: calc(16px * var(--scale)) 0 calc(13px * var(--scale));  /* air above and below */
}
.scoreboard-side {
  display: flex;                   /* mark, name and score share one row */
  align-items: center;             /* on the row's centre line */
  gap: calc(17px * var(--scale));  /* air inside the row */
  padding: calc(9px * var(--scale)) 0;  /* the stack's vertical rhythm */
  min-width: 0;                    /* lets a long club name shrink and wrap, not overflow */
}

/* The club colour mark — a short vertical rule before the name. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(5px * var(--scale)); /* a hairline mark, in keeping with the family */
  height: calc(35px * var(--scale));  /* about a cap height — it sits with the name */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-side-b .scoreboard-colour-chip { background: var(--team-b, var(--text-dim)); }

/* The club name — FULL names in sentence case, allowed two lines. */
.scoreboard-team {
  font-size: calc(37px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.22;               /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
  flex: 1;                         /* the name takes the row's spare width */
}

${clampTwoLinesCss('.scoreboard-team')}

/* The score — one figure per row, in a shared right-hand column. */
.scoreboard-score {
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  min-width: calc(59px * var(--scale));  /* a shared column, so both rows line up */
  text-align: right;               /* two-digit scores stay aligned with single ones */
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* the card's headline */
  font-weight: 700;                /* bold — the score is the point */
  line-height: 1;                  /* sits tight on the row */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The note — the competition and the ground, the quietest row on the card. */
.scoreboard-note {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* reference type, not display */
  font-weight: 400;                /* regular — contrast comes from the names above */
  line-height: 1.35;               /* relaxed leading in case it wraps */
  color: var(--text-dim);          /* dimmed — never full white twice on one card */
  overflow-wrap: break-word;       /* break a very long unbroken competition name */
}

/* ── Match state (the machine's status group adds these to the root) ── */

/* Half time: the pip loses the accent — held, not live. */
.scoreboard-break .scoreboard-pip { background: var(--text-dim); }

/* Full time — the pip goes entirely and the scores settle to white. */
.scoreboard-final .scoreboard-pip { display: none; }
.scoreboard-final .scoreboard-score { color: var(--text-color); }`,
    hasAccent: true,
    fields: matchStatusFields({
      teamA: 'Ashton United', scoreA: '2', teamB: 'Marske Town', scoreB: '2',
      status: 'Full time', note: 'Northern League Division One',
      colourA: '#d92b2b', colourB: '#1f4fd8',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 status · f5 note
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

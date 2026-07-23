// sb13 "House Status Card" — the NoaCG match-status and final-score card, sibling of sb09
// "House Match Board" and card06 "House Topic".
//
// One card covers three moments — LIVE, the interval, and the result — because they are the
// same graphic in three states, not three graphics. The status TEXT is data the operator
// writes ("HALF TIME", "FULL TIME", "ABANDONED — WATERLOGGED"); whether the card LOOKS live,
// held or finished is a state the machine holds. Keeping those apart is what stops a typo
// putting a live match on air as a result, and what lets a board be taken final while its
// status line still says something specific about why.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHoldersHtml, matchStatusFields } from './scorebugShared';

export const sb13: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb13',
    category: 'scoreboard',
    name: 'House Status Card',
    styleTag: 'noacg',
    description: 'The house status card: a live pip, the status line, the score pair, and a note.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Status Card',
    description:
      'The NoaCG match-status and final-score card, sibling of sb09 House Match Board: a void ' +
      'panel with an amber top edge, a pulsing live pip beside the status line, the two clubs ' +
      'around a big amber score pair, and a quiet note row. One card serves live, half time ' +
      'and full time — the status text is data, the look is the machine.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- House Status Card: void panel — live pip + status, clubs around the score, note row. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the amber left bar, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- The status row: a live pip the machine hides at full time, then the status line. -->
      <div class="scoreboard-statusrow">
        <span class="scoreboard-pip"></span>
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-status">HALF TIME</span></div>
      </div>
      <!-- The main row: the two clubs meeting around the score pair. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        </div>
        <div class="scoreboard-scores">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">1</span></div>
          <div class="scoreboard-dash">–</div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">0</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        </div>
      </div>
      <!-- The note — venue, competition, round: whatever context the moment needs. -->
      <div class="scoreboard-mask"><span id="f5" class="scoreboard-note">Emirates Stadium · Matchday 24</span></div>
${colourHoldersHtml('f6', 'f7', '#f6a623', '#7dd3fc')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void, with the family's amber top edge. */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  min-width: calc(560px * var(--scale));  /* a card, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(24px * var(--scale)) calc(34px * var(--scale)) calc(20px * var(--scale)) calc(40px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The accent edge — the amber bar down the left, doubling as the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The status row — the live pip and the status line, reading as one label. */
.scoreboard-statusrow {
  display: flex;                   /* pip and status in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(12px * var(--scale));  /* air between them */
}

/* The live pip — a small amber dot. The machine hides it at full time, which is the whole
   signal: a card with no pip is a result, a card with one is a match still in progress. */
.scoreboard-pip {
  flex-shrink: 0;                  /* the pip keeps its size whatever the text does */
  width: calc(10px * var(--scale));  /* small on purpose — a marker, not a badge */
  height: calc(10px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--accent);       /* the live signal wears the accent */
  box-shadow: var(--accent-glow);  /* the house glow, on the pip */
}

/* The status line — the house mono accent label. */
.scoreboard-status {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* The main row — club · scores · club, the scores holding the centre. */
.scoreboard-main {
  display: flex;                   /* the three blocks in one row */
  align-items: center;             /* everything on the card's centre line */
  gap: calc(22px * var(--scale));  /* air between the clubs and the scores */
  padding: calc(20px * var(--scale)) 0 calc(16px * var(--scale));  /* the row's vertical rhythm */
}
.scoreboard-side {
  display: flex;                   /* colour chip and name side by side */
  align-items: center;             /* both on the row's centre line */
  gap: calc(14px * var(--scale));  /* air between them */
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* lets a long club name shrink, not overflow */
}
.scoreboard-side-b { flex-direction: row-reverse; }

/* The club colour chip — a slim vertical mark before each name. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the chip never gives up width */
  width: calc(6px * var(--scale)); /* a slim mark, not a badge */
  height: calc(30px * var(--scale));  /* about a cap height — it sits with the name */
  border-radius: calc(3px * var(--scale));  /* softened ends, house chip family */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-side-b .scoreboard-colour-chip { background: var(--team-b, var(--text-dim)); }

/* The club name — house display type. */
.scoreboard-team {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-team', 240)}

/* The score pair — the loudest thing on the card, held dead centre. */
.scoreboard-scores {
  display: flex;                   /* the two figures and the dash in one row */
  align-items: center;             /* on one centre line */
  gap: calc(14px * var(--scale));  /* air around the dash */
  flex-shrink: 0;                  /* the scores never give up width */
}
.scoreboard-score {
  min-width: calc(60px * var(--scale));  /* a shared column, so 1 and 11 both sit centred */
  text-align: center;              /* the figure is centred in its own column */
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* the card's headline */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* the figure fills its column */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}
.scoreboard-dash {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* a step under the figures */
  font-weight: var(--display-weight);  /* solid, not a hairline */
  line-height: 1;                  /* on the figures' centre line */
  color: var(--text-dim);          /* dim — the dash separates, it does not compete */
}

/* The note — venue, competition, round: the quietest row on the card. */
.scoreboard-note {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* reference type, not display */
  font-weight: 400;                /* regular — contrast comes from the names above */
  line-height: 1.35;               /* relaxed leading in case it wraps */
  color: var(--text-dim);          /* dimmed — never full white twice on one card */
  overflow-wrap: break-word;       /* break a very long unbroken venue name */
}

/* ── Match state (the machine's status group adds these to the root) ── */

/* An interval: the pip stops carrying the accent — the match is not running. */
.scoreboard-break .scoreboard-pip {
  background: var(--text-dim);     /* held, not live */
  box-shadow: none;                /* the glow belongs to the live state only */
}

/* Full time — the pip goes entirely and the scores settle to white. A result is not live,
   and the absence of the pip is the clearest way a card can say so. */
.scoreboard-final .scoreboard-pip { display: none; }
.scoreboard-final .scoreboard-score { color: var(--text-color); }
.scoreboard-final .scoreboard-status { color: var(--text-color); }`,
    hasAccent: true,
    fields: matchStatusFields({
      teamA: 'HOME', scoreA: '1', teamB: 'AWAY', scoreB: '0',
      status: 'HALF TIME', note: 'Emirates Stadium · Matchday 24',
      colourA: '#f6a623', colourB: '#7dd3fc',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 status · f5 note
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

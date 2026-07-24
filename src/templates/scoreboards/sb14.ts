// sb14 "Volt Status Card" — the sport match-status and final-score card, sibling of sb10
// "Volt Match Board" and lt06 "Split Bar". The full-time slate: a solid accent banner carrying
// the status word, then the two clubs and an oversized score pair beneath it.
//
// The banner is the design's whole argument. A result graphic has one job — be readable in a
// clip, a screenshot and a thumbnail — and a word in solid accent across the top survives all
// three at sizes where a hairline label does not.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHoldersHtml, matchStatusFields } from './scorebugShared';

export const sb14: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb14',
    category: 'scoreboard',
    name: 'Volt Status Card',
    styleTag: 'sport',
    description: 'A sport result slate: a solid accent status banner over the clubs and a huge score.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'ARSENAL' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Status Card',
    description:
      'The sport match-status and final-score card, sibling of sb10 Volt Match Board and lt06 ' +
      'Split Bar: a solid accent banner carrying the status word, then the two clubs on their ' +
      'own colour bands around an oversized score pair, and a note strip below. Drawn to stay ' +
      'readable in a clip, a screenshot and a thumbnail.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Volt Status Card: sport slab — accent status banner, colour-banded clubs, huge score. -->
    <div class="scoreboard-box">
      <!-- The status banner — solid accent, the loudest surface in the pack. -->
      <div class="scoreboard-statusrow">
        <span class="scoreboard-pip"></span>
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-status">FULL TIME</span></div>
      </div>
      <!-- The accent rule under the banner, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- The main row: the two clubs meeting around the score pair. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">ARSENAL</span></div>
        </div>
        <div class="scoreboard-scores">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">3</span></div>
          <div class="scoreboard-dash">:</div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">1</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">CHELSEA</span></div>
        </div>
      </div>
      <!-- The note strip — competition, round, venue. -->
      <div class="scoreboard-noterow">
        <div class="scoreboard-mask"><span id="f5" class="scoreboard-note">PREMIER LEAGUE · MATCHDAY 24</span></div>
      </div>
${colourHoldersHtml('f6', 'f7', '#ef0107', '#034694')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. Contrast, not blur, is what carries this family. */
.scoreboard-box {
  position: relative;              /* the accent rule is placed against this */
  min-width: calc(775px * var(--scale));  /* a result slate, not a strip */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the colour bands stop at the slab's edge */
}

/* The status banner — solid accent with dark text on it. */
.scoreboard-statusrow {
  display: flex;                   /* pip and status word in one row */
  align-items: center;             /* both on the banner's centre line */
  justify-content: center;         /* centred across the slab */
  gap: calc(15px * var(--scale));  /* air between them */
  padding: calc(14px * var(--scale)) calc(33px * var(--scale));  /* the banner's height */
  background: var(--accent);       /* the one big accent surface in the pack */
}

/* The live pip — dark on the accent banner. The machine hides it at full time. */
.scoreboard-pip {
  flex-shrink: 0;                  /* the pip keeps its size whatever the text does */
  width: calc(14px * var(--scale));  /* small on purpose — a marker, not a badge */
  height: calc(14px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--accent-ink);   /* the family's ink colour for text ON the accent */
}

/* The status word — heavy condensed caps in the accent's ink colour. */
.scoreboard-status {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the banner IS the label */
  font-weight: 700;                /* solid: a sport label is never light */
  line-height: 1.15;               /* compact banner leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a banner, whatever the operator types */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
}

/* The accent rule under the banner — also the flag marker the machine pulses. */
.scoreboard-accent {
  height: calc(4px * var(--scale));  /* a hard rule closing the banner */
  background: color-mix(in srgb, var(--accent) 55%, transparent);  /* a softer echo of the banner */
}

/* The main row: two colour-banded club blocks around the score pair. */
.scoreboard-main {
  display: flex;                   /* the three blocks in one row */
  align-items: stretch;            /* every block is the full height of the row */
}
.scoreboard-side {
  display: flex;                   /* colour chip and name side by side */
  align-items: center;             /* both on the row's centre line */
  gap: calc(18px * var(--scale));  /* air between them */
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* lets a long club name shrink, not overflow */
  padding: calc(30px * var(--scale)) calc(30px * var(--scale));  /* the row's height comes from here */
  background: linear-gradient(90deg, color-mix(in srgb, var(--team-a, var(--accent)) 34%, transparent), transparent);
}
.scoreboard-side-b {
  flex-direction: row-reverse;     /* the away club faces outward */
  background: linear-gradient(270deg, color-mix(in srgb, var(--team-b, var(--text-dim)) 34%, transparent), transparent);
}

/* The club colour chip — a hard vertical bar, no radius: this family does not soften. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the bar never gives up width */
  width: calc(10px * var(--scale)); /* visible at broadcast distance */
  align-self: stretch;             /* full height of the club block */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-side-b .scoreboard-colour-chip { background: var(--team-b, var(--text-dim)); }

/* The club name — heavy condensed caps, the sport family's voice. */
.scoreboard-team {
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.05;               /* tight — condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* club names are caps on a sport slate */
  color: var(--text-color);        /* paper white over the colour band */
}
.scoreboard-team-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-team', 270)}

/* The score pair — oversized, on a hard dark plate. */
.scoreboard-scores {
  display: flex;                   /* the two figures and the divider in one row */
  align-items: center;             /* on one centre line */
  gap: calc(15px * var(--scale));  /* air around the divider */
  flex-shrink: 0;                  /* the plate never gives up width */
  padding: 0 calc(35px * var(--scale));  /* the plate's own side margins */
  background: rgba(0, 0, 0, 0.55); /* a hard dark plate under the figures */
}
.scoreboard-score {
  min-width: calc(73px * var(--scale));  /* a shared column, so 3 and 13 both sit centred */
  text-align: center;              /* the figure is centred in its own column */
  font-size: calc(78px * var(--scale) * var(--type-scale));  /* the slate's headline */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* the figure fills its column */
  color: var(--text-color);        /* white on the plate — the accent is the banner */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}
.scoreboard-dash {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* a step under the figures */
  font-weight: var(--display-weight);  /* solid, not a hairline */
  line-height: 1;                  /* on the figures' centre line */
  color: var(--accent);            /* the divider carries the accent */
}

/* The note strip — competition and round, on the darker footer band. */
.scoreboard-noterow {
  display: flex;                   /* the note centred… */
  justify-content: center;         /* …across the slab */
  padding: calc(13px * var(--scale)) calc(30px * var(--scale)) calc(15px * var(--scale));
  background: rgba(255, 255, 255, 0.05);  /* one step off the slab */
}
.scoreboard-note {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* reference type, not display */
  font-weight: 700;                /* solid at label size */
  line-height: 1.3;                /* relaxed leading in case it wraps */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* the footer reads as a label */
  color: var(--text-dim);          /* dimmed — never full white twice on one slate */
  text-align: center;              /* centred with the banner above it */
  overflow-wrap: break-word;       /* break a very long unbroken competition name */
}

/* ── Match state (the machine's status group adds these to the root) ── */

/* An interval: the banner steps back to a dark bar with accent text — held, not live. */
.scoreboard-break .scoreboard-statusrow { background: rgba(255, 255, 255, 0.08); }
.scoreboard-break .scoreboard-status { color: var(--accent); }
.scoreboard-break .scoreboard-pip { background: var(--text-dim); }

/* Full time — the pip goes; the banner keeps its accent, because the result IS the headline. */
.scoreboard-final .scoreboard-pip { display: none; }
.scoreboard-final .scoreboard-score { color: var(--accent); }`,
    hasAccent: true,
    fields: matchStatusFields({
      teamA: 'ARSENAL', scoreA: '3', teamB: 'CHELSEA', scoreB: '1',
      status: 'FULL TIME', note: 'PREMIER LEAGUE · MATCHDAY 24',
      colourA: '#ef0107', colourB: '#034694',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 team · f1 score · f2 team · f3 score · f4 status · f5 note
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

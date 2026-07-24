// sb18 "Volt Event Card" — the sport match-event card, sibling of sb06 "Volt Scorebug" and
// lt06 "Split Bar". A hard slab strap: the club-colour block carries the minute, the accent
// bar carries the event kind, and the two facts sit in a dark panel beside them.
//
// Laid out as a horizontal strap rather than a stacked card because a sport event graphic runs
// over live action at the bottom of frame, where height costs more than width.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHolderHtml, matchEventFields } from './scorebugShared';

export const sb18: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb18',
    category: 'scoreboard',
    name: 'Volt Event Card',
    styleTag: 'sport',
    description: 'A sport event strap: a colour minute block, an accent kind bar, and the two facts.',
    maxLines: 1,
    suggestedLines: [{ title: 'Event', sample: 'PENALTY' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Volt Event Card',
    description:
      'The sport match-event card, sibling of sb06 Volt Scorebug and lt06 Split Bar: a hard ' +
      'horizontal strap with the minute in a club-colour block, the event kind on an accent ' +
      'bar, and the club plus the two facts in a dark panel. Serves penalties, bookings, ' +
      'substitutions and goals, and clears itself on a timer.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Volt Event Card: sport strap — [minute block][accent kind bar][club + two facts]. -->
    <div class="scoreboard-box">
      <!-- The minute block — the club's own colour, carrying the time stamp. -->
      <div class="scoreboard-eventhead">
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-minute">34'</span></div>
      </div>
      <!-- The accent bar — the event kind, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent">
        <div class="scoreboard-mask"><span id="f0" class="scoreboard-event">PENALTY</span></div>
      </div>
      <!-- The body: the club, then the two facts. -->
      <div class="scoreboard-eventbody">
        <div class="scoreboard-mask scoreboard-club-mask"><span id="f2" class="scoreboard-club">TAMPA BAY</span></div>
        <div class="scoreboard-people">
          <div class="scoreboard-person scoreboard-person-a">
            <span class="scoreboard-rolemark"></span>
            <div class="scoreboard-mask scoreboard-name-mask"><span id="f3" class="scoreboard-name">TRIPPING · 2 MIN</span></div>
          </div>
          <div class="scoreboard-person scoreboard-person-b">
            <span class="scoreboard-rolemark"></span>
            <div class="scoreboard-mask scoreboard-name-mask"><span id="f4" class="scoreboard-name">V. HEDMAN</span></div>
          </div>
        </div>
      </div>
${colourHolderHtml('f5', '#002868')}
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The strap — flat, hard-edged and opaque, laid out as one horizontal row. */
.scoreboard-box {
  display: flex;                   /* minute block, kind bar and body in one row */
  align-items: stretch;            /* every block is the full height of the strap */
  min-width: calc(600px * var(--scale));  /* a strap, wide rather than tall — wide enough that
                                             the event bar at label size does not squeeze the body */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the blocks stop at the strap's edge */
}

/* The minute block — the club's own colour, the strap's leading edge. */
.scoreboard-eventhead {
  display: flex;                   /* centers the minute… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  flex-shrink: 0;                  /* the block keeps its width whatever the names do */
  min-width: calc(86px * var(--scale));  /* room for "90+4'" without reflowing */
  padding: 0 calc(14px * var(--scale));  /* the block's own side margins */
  background: var(--team-a, var(--accent));  /* the club colour, or the graphic's accent */
}
.scoreboard-minute {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the stamp is read at a glance */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* the figure fills its block */
  color: var(--text-color);        /* white on the club colour — the safest pairing here */
  text-shadow: 0 calc(1px * var(--scale)) calc(3px * var(--scale)) rgba(0, 0, 0, 0.5);  /* legible on a light club colour too */
  font-variant-numeric: tabular-nums;  /* digits share one width across successive cards */
  white-space: nowrap;             /* "90+4'" stays on one line */
}

/* The kind bar — a vertical accent block carrying the event word, and the flag marker. */
.scoreboard-accent {
  display: flex;                   /* centers the event word… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  flex-shrink: 1;                  /* a long event word gives ground before the body does */
  min-width: 0;                    /* …which it can only do if it may shrink below its content */
  max-width: calc(260px * var(--scale));  /* and never more than this share of the strap */
  padding: 0 calc(16px * var(--scale));  /* the bar's own side margins */
  background: var(--accent);       /* the one accent surface */
}
.scoreboard-event {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid: a sport label is never light */
  line-height: 1.15;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
  white-space: nowrap;             /* "SECOND YELLOW" stays on one line */
}

/* The body — the club over the two facts. */
.scoreboard-eventbody {
  display: flex;                   /* club and facts… */
  flex-direction: column;          /* …stacked as one column */
  justify-content: center;         /* centred in the strap's height */
  gap: calc(4px * var(--scale));   /* the block reads as one unit */
  min-width: 0;                    /* lets a long name shrink, not overflow */
  padding: calc(12px * var(--scale)) calc(22px * var(--scale));  /* the strap's height comes from here */
}

/* The club — heavy condensed caps, the sport family's voice. */
.scoreboard-club {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the body's anchor */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.05;               /* tight — condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* club names are caps on a sport strap */
  color: var(--text-color);        /* paper white on the slab */
}
.scoreboard-club-mask { display: block; }  /* the club owns its own row */

${clipOneLineCss('.scoreboard-club', 360)}

${clipOneLineCss('.scoreboard-event', 228)}

/* The two facts — marked rows, tight under the club. */
.scoreboard-people {
  display: flex;                   /* the two rows… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(3px * var(--scale));   /* the rows read as a pair */
}
.scoreboard-person {
  display: flex;                   /* mark and name in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(10px * var(--scale));  /* air between them */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}

/* The role mark — a hard square, no radius: this family does not soften. */
.scoreboard-rolemark {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(9px * var(--scale)); /* small — it marks the row, it does not label it */
  height: calc(9px * var(--scale));  /* square, in keeping with the slab */
  background: rgba(255, 255, 255, 0.35);  /* neutral on the first row */
}
.scoreboard-person-b .scoreboard-rolemark {
  background: var(--accent);       /* the second row is the emphasised one, in every reading */
}

/* The names — clearly subordinate to the club. */
.scoreboard-name {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a step under the club */
  font-weight: 600;                /* semibold — the club above carries the weight */
  line-height: 1.25;               /* comfortable at this size */
  letter-spacing: var(--label-tracking);  /* tracked, in keeping with the family */
  text-transform: uppercase;       /* a sport strap runs in caps throughout */
  color: var(--text-dim);          /* dimmed on the first row */
}
.scoreboard-person-b .scoreboard-name { color: var(--text-color); }  /* the emphasised row is white */
.scoreboard-name-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-name', 360)}`,
    hasAccent: true,
    fields: matchEventFields({
      event: 'PENALTY', minute: "34'", team: 'TAMPA BAY',
      detail: 'TRIPPING · 2 MIN', player: 'V. HEDMAN', colour: '#002868',
    }),
    // Nothing pops: every field changes at once when a new event is staged, and four
    // simultaneous pops read as a glitch rather than as emphasis.
    popFields: [],
    lineCount: 5, // f0 event · f1 minute · f2 club · f3 detail · f4 player
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

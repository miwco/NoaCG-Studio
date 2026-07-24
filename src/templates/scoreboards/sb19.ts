// sb19 "Frost Event Card" — the glass match-event card, sibling of sb07 "Frost Scorebug" and
// lt08 "Frosted Card". A frosted card with the minute in a soft chip, the event kind as a
// tracked label, and the two facts as rows behind a hairline.
//
// The one place this family's softness is functional rather than decorative: an event card
// appears and clears every few minutes, and a hard slab flashing on and off over play is
// tiring to watch across a two-hour broadcast in a way a frosted pane is not.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHolderHtml, matchEventFields } from './scorebugShared';

export const sb19: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb19',
    category: 'scoreboard',
    name: 'Frost Event Card',
    styleTag: 'glass',
    description: 'A frosted event card: a minute chip, a tracked event label, and the two facts.',
    maxLines: 1,
    suggestedLines: [{ title: 'Event', sample: 'SUBSTITUTION' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Frost Event Card',
    description:
      'The glass match-event card, sibling of sb07 Frost Scorebug and lt08 Frosted Card: a ' +
      'frosted card with the minute in a soft colour chip, the event kind as a tracked label, ' +
      'the club beneath, and the two facts as marked rows behind a hairline. Serves ' +
      'substitutions, bookings and penalties, and clears itself on a timer.',
    uicolor: '5',
  },
  () => ({
    html: `    <!-- Frost Event Card: frosted card — minute chip + kind label, club, then two marked rows. -->
    <div class="scoreboard-box">
      <!-- The accent bar — a soft glass edge, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- The header: the minute in a soft chip, then the event kind. -->
      <div class="scoreboard-eventhead">
        <div class="scoreboard-mask scoreboard-minute-chip"><span id="f1" class="scoreboard-minute">72'</span></div>
        <div class="scoreboard-mask"><span id="f0" class="scoreboard-event">SUBSTITUTION</span></div>
      </div>
      <!-- The club it happened to. -->
      <div class="scoreboard-mask scoreboard-club-mask"><span id="f2" class="scoreboard-club">Norway</span></div>
      <!-- The two facts: off/on, or player/offence. -->
      <div class="scoreboard-people">
        <div class="scoreboard-person scoreboard-person-a">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f3" class="scoreboard-name">S. Solberg</span></div>
        </div>
        <div class="scoreboard-person scoreboard-person-b">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f4" class="scoreboard-name">H. Reistad</span></div>
        </div>
      </div>
${colourHolderHtml('f5', '#ba0c2f')}
    </div>`,
    css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface, soft enough to appear and clear repeatedly over play. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  min-width: calc(420px * var(--scale));  /* a card, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(16px * var(--scale)) calc(24px * var(--scale)) calc(16px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
  overflow: hidden;                /* the accent bar is clipped to the card's radius */
}

/* The accent bar — a soft edge down the card's left side, and the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  opacity: 0.9;                    /* the glass family softens its accents rather than glowing */
}

/* The header — the minute chip and the event kind on one line. */
.scoreboard-eventhead {
  display: flex;                   /* chip and label in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(12px * var(--scale));  /* air between them */
}

/* The minute chip — a soft pill in the club's own colour. */
.scoreboard-minute-chip {
  flex-shrink: 0;                  /* the chip keeps its size whatever the label does */
  padding: calc(4px * var(--scale)) calc(12px * var(--scale));  /* the chip's own frame */
  border-radius: calc(999px * var(--scale));  /* a true pill at any scale */
  background: color-mix(in srgb, var(--team-a, var(--accent)) 70%, transparent);  /* the club colour, softened */
}
.scoreboard-minute {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a stamp, not a headline */
  font-weight: 800;                /* heavy at chip size so it reads through the softening */
  line-height: 1.2;                /* compact inside the chip */
  color: var(--text-color);        /* white on the club colour — the safest pairing here */
  font-variant-numeric: tabular-nums;  /* digits share one width across successive cards */
  white-space: nowrap;             /* "90+4'" stays on one line */
}

/* The event kind — a soft tracked caps label. */
.scoreboard-event {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* "SECOND YELLOW" stays on one line */
}

/* The club — the card's biggest line, in the family's rounded sans. */
.scoreboard-club {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* the card's anchor */
  font-weight: 700;                /* bold — the club leads the card */
  line-height: 1.2;                /* comfortable for a mixed-case name */
  color: var(--text-color);        /* primary text on the frost */
}
.scoreboard-club-mask {
  display: block;                  /* the club owns its own row */
  margin-top: calc(10px * var(--scale));  /* air under the header */
}

${clipOneLineCss('.scoreboard-club', 320)}

/* The two facts — marked rows behind a glass hairline. */
.scoreboard-people {
  display: flex;                   /* the two rows… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(6px * var(--scale));   /* the rows read as a pair */
  margin-top: calc(12px * var(--scale));  /* air above the hairline */
  padding-top: calc(12px * var(--scale));  /* air under the hairline */
  border-top: 1px solid rgba(255, 255, 255, 0.20);  /* the glass keyline */
}
.scoreboard-person {
  display: flex;                   /* mark and name in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(12px * var(--scale));  /* air between them */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}

/* The role mark — a soft dot, ringed in glass; the accent marks the second row. */
.scoreboard-rolemark {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(10px * var(--scale));  /* small — it marks the row, it does not label it */
  height: calc(10px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: rgba(255, 255, 255, 0.35);  /* neutral on the first row */
}
.scoreboard-person-b .scoreboard-rolemark {
  background: var(--accent);       /* the second row is the emphasised one, in every reading */
  box-shadow: 0 0 0 calc(2px * var(--scale)) rgba(255, 255, 255, 0.18);  /* a soft glass ring */
}

/* The names — clearly subordinate to the club. */
.scoreboard-name {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a step under the club */
  font-weight: 500;                /* medium — the club above carries the weight */
  line-height: 1.25;               /* comfortable at this size */
  color: var(--text-dim);          /* dimmed on the first row */
}
.scoreboard-person-b .scoreboard-name { color: var(--text-color); }  /* the emphasised row is white */
.scoreboard-name-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-name', 310)}`,
    hasAccent: true,
    fields: matchEventFields({
      event: 'SUBSTITUTION', minute: "72'", team: 'Norway',
      detail: 'S. Solberg', player: 'H. Reistad', colour: '#ba0c2f',
    }),
    // Nothing pops: every field changes at once when a new event is staged, and four
    // simultaneous pops read as a glitch rather than as emphasis.
    popFields: [],
    lineCount: 5, // f0 event · f1 minute · f2 club · f3 detail · f4 player
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);

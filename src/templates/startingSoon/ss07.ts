// ss07 "Intermission" — the interval card for a concert, a play, a gala or a long conference
// session. Glass family, sibling of ss03 (Frost Hold) and lt08 (Frosted Card).
//
// An interval is scheduled, not improvised: the house knows the second half starts at 20:15,
// and everyone in the room is checking a watch against it. So this card counts to a WALL-CLOCK
// TIME. Three lines, because an interval card has three jobs: name the break, name what comes
// back, and tell the room what to do (return to your seats, refreshments in the foyer).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss07: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss07',
    category: 'starting-soon',
    name: 'Intermission',
    styleTag: 'glass',
    description: 'The interval card — names the break, what returns, and counts to the scheduled resume time.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'INTERMISSION' },
      { title: 'Returning with', sample: 'Act Two' },
      { title: 'Note', sample: 'Please take your seats' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Intermission',
    description:
      'The glass interval card: a tracked kicker naming the break, the returning act as the ' +
      'headline, a line of house instruction, and the countdown resting in a soft capsule ' +
      'that breathes. Set the resume time (e.g. 20:15) and the clock chases the wall.',
    uicolor: '2',
  },
  (o) => ({
    lineCount: 3,
    clock: 'start-time',
    clockMinutes: '20',
    lineDefaults: [
      { title: 'Kicker', sample: 'INTERMISSION' },
      { title: 'Returning with', sample: 'Act Two' },
      { title: 'Note', sample: 'Please take your seats' },
    ],
    html: `    <!-- Intermission: frosted card — kicker, returning act, house note, clock capsule. -->
    <div class="starting-soon-box">
      <!-- Kicker (f0) — the tracked caps label naming the break. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'INTERMISSION'}</span></div>
      <!-- Returning act (f1) — the headline: what the audience is coming back for. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'Act Two'}</span></div>
      <!-- Note (f2) — the house instruction, in the quiet secondary voice. -->
      <div class="starting-soon-mask"><span id="f2" class="starting-soon-note">${o.lines[2]?.sample || 'Please take your seats'}</span></div>
      <!-- The clock capsule — starting-soon-pulse is the hold-loop's breath target. -->
      <div class="starting-soon-pill starting-soon-pulse">
        <span class="starting-soon-clock">20:00</span>
      </div>
    </div>`,
    css: `/* The frosted card — ss03's glass, laid out for three lines instead of two. */
.starting-soon-box {
  display: flex;                   /* the lines stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered under the mid anchor */
  text-align: center;              /* wrapped rows center too */
  padding: calc(48px * var(--scale)) calc(76px * var(--scale));  /* front-door air, not strap padding */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Kicker — the quiet accent label naming the break. */
.starting-soon-title {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact single-line label */
  letter-spacing: var(--label-tracking);  /* the kicker's authored tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
}

/* The returning act — the headline the audience came back for. */
.starting-soon-show {
  margin-top: calc(14px * var(--scale));  /* kicker and headline read as one unit */
  font-size: calc(66px * var(--scale) * var(--type-scale));  /* the card's loudest line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The house note — an instruction to the room, spoken rather than announced. */
.starting-soon-note {
  margin-top: calc(14px * var(--scale));  /* clear of the headline, still part of the block */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.5:1 under the headline */
  font-weight: 400;                /* conversational weight */
  line-height: 1.35;               /* a sentence may wrap; give it room */
  color: var(--text-dim);          /* secondary text color */
}

/* The clock capsule — lt09's glass pill, slowed for the interval (the breath target). */
.starting-soon-pill {
  display: inline-flex;            /* hug the clock; centered by the card */
  align-items: center;             /* the time sits on the capsule's centerline */
  margin-top: calc(34px * var(--scale));  /* clear air — the clock is its own moment */
  padding: calc(14px * var(--scale)) calc(46px * var(--scale));  /* generous capsule padding */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is not scaled */
  background: var(--panel-bg);     /* a second layer of the same glass reads slightly denser */
  box-shadow: var(--panel-keyline);  /* the family keyline, again */
  position: relative;              /* anchors the ::after accent ring to the capsule */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* Accent ring — drawn by a pseudo-element so the border stays pure var(--accent) (the Style
   panel retints it) and opacity does the softening. */
.starting-soon-pill::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned over the capsule, out of the flex flow */
  inset: 0;                        /* cover the whole pill */
  border: calc(2px * var(--scale)) solid var(--accent);  /* the accent-tinted edge */
  border-radius: inherit;          /* follow the capsule's full rounding */
  opacity: 0.4;                    /* a glow at rest — .starting-soon-done brings it to full */
  pointer-events: none;            /* purely decorative overlay */
}

/* The countdown — painted by the clock runtime; H:MM:SS when the interval is over an hour. */
.starting-soon-clock {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the second-biggest thing on the card */
  font-weight: 600;                /* solid digits without going heavy */
  line-height: 1;                  /* the capsule's padding sets the height */
  letter-spacing: 0.04em;          /* digits get a little air */
  font-variant-numeric: tabular-nums;  /* every digit same width — no jiggle as seconds tick */
  color: var(--text-color);        /* primary text — the accent stays in its small doses */
}

/* Time's up — the second half is starting. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* the zero moment borrows the accent */
}
.starting-soon-done .starting-soon-pill::after {
  opacity: 1;                      /* the halo comes to full strength */
}`,
    tokens: { labelTracking: '0.18em' },
  }),
);

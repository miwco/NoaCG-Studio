// ss05 "Countdown to Start" — the holding screen that counts to a TIME, not a duration.
//
// The difference matters on air. A duration restarts from the top every time the graphic is
// taken up, so a producer who re-takes the hold at 19:26 puts five fresh minutes back on a
// screen that should say four. A start time cannot drift: the operator types 19:30 once and
// the number always agrees with the clock on the wall. The duration field stays as the
// fallback for a hold with no fixed start.
//
// Minimal family, sibling of ss01 (Quiet Hold) and lt01 (Hairline): the same centered stack
// of type and whitespace, with the clock promoted from a detail to the composition's subject —
// on this card the remaining time is the thing the audience came to read.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss05: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss05',
    category: 'starting-soon',
    name: 'Countdown to Start',
    styleTag: 'minimal',
    description: 'Counts down to a wall-clock start time you type once — the number never drifts on a re-take.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'Evening Service' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Countdown to Start',
    description:
      'A pre-show hold built around a real start time: a tracking-wide caps title, the show ' +
      'name, and the countdown at full size below them. Type "19:30" into the start-time ' +
      'field and the clock chases it; leave it empty and the duration takes over.',
    uicolor: '1',
  },
  (o) => ({
    lineCount: 2,
    clock: 'start-time',
    clockMinutes: '10',
    lineDefaults: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'Evening Service' },
    ],
    // Kicker (f0) → show name (f1) → the clock, which is the point of this card → the
    // scheduled-time caption. The thin rule between name and clock is the breath target.
    html: `    <!-- Countdown to Start: caps title, show name, breathing hairline, the countdown. -->
    <div class="starting-soon-box">
      <!-- The small tracking-wide caps title (field f0). -->
      <div class="starting-soon-mask"><span class="starting-soon-kicker" id="f0">${o.lines[0]?.sample || 'STARTING SOON'}</span></div>
      <!-- The show name (field f1). -->
      <div class="starting-soon-mask"><span class="starting-soon-show" id="f1">${o.lines[1]?.sample || 'Evening Service'}</span></div>
      <!-- The hairline separator — the single accent moment; the hold preset breathes it. -->
      <div class="starting-soon-rule starting-soon-pulse"></div>
      <!-- The countdown — the clock runtime paints the remaining time here every quarter second. -->
      <div class="starting-soon-clock">10:00</div>
    </div>`,
    css: `/* The stack: no panel — centered type and whitespace carry the card, like ss01. */
.starting-soon-box {
  display: flex;                   /* stack the lines vertically… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* every line sits on the same center axis */
  text-align: center;              /* wrapped rows stay centered too */
  gap: calc(16px * var(--scale));  /* even, generous air between the lines */
}

/* The caps title — a quiet tracking-wide label above the show name. */
.starting-soon-kicker {
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* label scale — clearly subordinate */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the hold label's authored tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
}

/* The show name — large, but deliberately quieter than ss01's: here the clock leads. */
.starting-soon-show {
  font-size: calc(64px * var(--scale) * var(--type-scale)); /* ~0.6 of the clock — the clock is the subject */
  font-weight: var(--display-weight);  /* the show's authored display weight */
  line-height: 1.1;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* The hairline — the design's single accent moment, and the hold-loop breath target. */
.starting-soon-rule {
  width: calc(84px * var(--scale));  /* a short stroke — a mark, not a rule across the card */
  height: var(--accent-weight);    /* the hold's authored accent weight */
  margin: calc(10px * var(--scale)) 0;  /* extra air above and below the separator */
  background: var(--accent);       /* the one small, sharp dose of accent color */
  will-change: transform;          /* hint the browser: the breath scales this */
}

/* The countdown — the biggest thing on the card, in light tabular figures. */
.starting-soon-clock {
  font-size: calc(118px * var(--scale) * var(--type-scale)); /* the subject of the composition */
  font-weight: 300;                /* light: at this size weight would shout, and a wait is quiet */
  line-height: 1;                  /* a single tight row of digits */
  letter-spacing: 0.01em;          /* a touch of air between the light figures */
  font-variant-numeric: tabular-nums; /* every digit same width — no width wobble per tick */
  color: var(--text-color);        /* primary text color */
}

/* Time's up — the clock takes the accent, the card's only other color moment. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
    tokens: {
      accentWeight: 'calc(2px * var(--scale))',
      labelTracking: '0.24em',
      displayWeight: '600',
    },
  }),
);

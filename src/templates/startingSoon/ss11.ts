// ss11 "Doors Open" — the venue hold: a match, a gig, a tournament night, an awards dinner.
// Sport family, sibling of ss02 and lt05 (Angle Slab): leaning slabs, condensed caps, the
// accent used boldly rather than as a hairline.
//
// It counts to a wall-clock time because a venue's schedule is public — the ticket says 19:30
// and the screen has to agree with the ticket. The time is the loudest thing in the frame:
// this card is read from the back of a room, on a big screen, by people standing up.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss11: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss11',
    category: 'starting-soon',
    name: 'Doors Open',
    styleTag: 'sport',
    description: 'The venue hold — leaning slab, condensed caps, and a big clock counting to the ticketed time.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Kicker', sample: 'DOORS OPEN' },
      { title: 'Event', sample: 'CITY ARENA · FINALS NIGHT' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Doors Open',
    description:
      'The sport venue hold: a leaning accent slab carrying the kicker, the event in ' +
      'condensed caps, and the countdown at full stadium size beneath them. Counts to the ' +
      'ticketed door time, so the screen and the ticket never disagree.',
    uicolor: '3',
  },
  (o) => ({
    lineCount: 2,
    clock: 'start-time',
    clockMinutes: '30',
    lineDefaults: [
      { title: 'Kicker', sample: 'DOORS OPEN' },
      { title: 'Event', sample: 'CITY ARENA · FINALS NIGHT' },
    ],
    // The slab chip carries the kicker AND the breath: in the sport family the accent is a
    // solid shape, so breathing the shape is more honest than breathing a hairline.
    html: `    <!-- Doors Open: leaning accent slab, condensed event caps, stadium-size clock. -->
    <div class="starting-soon-box">
      <!-- Kicker (f0) inside the leaning accent slab — the sport family's accent-as-shape. -->
      <div class="starting-soon-slab starting-soon-pulse">
        <span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'DOORS OPEN'}</span>
      </div>
      <!-- Event (f1) — condensed caps, read from the back of the room. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'CITY ARENA · FINALS NIGHT'}</span></div>
      <!-- The countdown — the loudest element; the clock runtime paints it. -->
      <div class="starting-soon-clock">30:00</div>
    </div>`,
    css: `/* The stack: no panel behind the whole card — the slab is the sport family's panel. */
.starting-soon-box {
  display: flex;                   /* stack the pieces vertically… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered under the mid anchor */
  text-align: center;              /* wrapped rows center too */
  gap: calc(22px * var(--scale));  /* even air between slab, event and clock */
}

/* The kicker slab — a leaning accent block, lt05's motif at holding-screen size. */
.starting-soon-slab {
  display: inline-flex;            /* hug the kicker text */
  align-items: center;             /* the caps sit on the slab's centerline */
  padding: calc(10px * var(--scale)) calc(30px * var(--scale));  /* tight chip, wide sides */
  background: var(--accent);       /* the sport family uses accent as a solid shape */
  border-radius: var(--panel-radius);  /* the family's panel radius (0 — hard corners) */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  transform: skewX(-8deg);         /* SKEW: the slab leans forward, sport shape language */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* The kicker text — counter-skewed so the letters stand upright inside the leaning slab. */
.starting-soon-title {
  display: inline-block;           /* so the counter-skew applies to the text box */
  transform: skewX(8deg);          /* undo the slab's lean — text is never skewed */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* label scale on the slab */
  font-weight: 700;                /* bold caps on a solid chip */
  line-height: 1.2;                /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* sport labels are always caps */
  color: var(--accent-ink);        /* the dark-on-accent ink token */
}

/* The event line — condensed caps, the second-loudest element. */
.starting-soon-show {
  font-size: calc(62px * var(--scale) * var(--type-scale));  /* big, but under the clock */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;               /* tight — condensed caps need little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* names are shouted, not spoken */
  color: var(--text-color);        /* primary text color */
}

/* The countdown — stadium scale. This is the number people are standing there for. */
.starting-soon-clock {
  font-size: calc(148px * var(--scale) * var(--type-scale));  /* the loudest element in the frame */
  font-weight: 800;                /* heavy: sport figures are built, not drawn */
  line-height: 0.95;               /* very tight — a single row of huge digits */
  letter-spacing: -0.02em;         /* big figures tighten */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no wobble per tick */
  color: var(--text-color);        /* primary text color */
}

/* Doors are open — the clock takes the accent at zero. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
    tokens: {
      labelTracking: '0.14em',
    },
  }),
);

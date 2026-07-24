// ss13 "Up Next" — the schedule hold: the card that sits between items in a day-long
// programme (a conference track, a festival stage, a telethon, a church programme). House
// style, sibling of ss04 and ss09, so a channel's whole holding set reads as one family.
//
// A schedule hold answers a different question from a starting-soon card. Nobody is asking
// "when does the show start" — the show is already running. They are asking "what is next,
// and when". So the three lines are the next item, who is bringing it, and the countdown
// chases the scheduled slot time rather than a duration the operator has to re-type all day.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineStartingSoonVariant } from './shared';

export const ss13: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss13',
    category: 'starting-soon',
    name: 'Up Next',
    styleTag: 'noacg',
    description: 'The between-items schedule hold — what is next, who brings it, and the slot time it starts.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'UP NEXT' },
      { title: 'Item', sample: 'Designing for Live Broadcast' },
      { title: 'Presenter', sample: 'Dr. Ada Fenwick · Main Stage' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Up Next',
    description:
      'The house schedule hold: a mono "UP NEXT" kicker, the next item as the headline, the ' +
      'presenter and room beneath it, and a countdown to the slot time along an amber rail. ' +
      'Type the slot time once and the card is right all day.',
    uicolor: '4',
  },
  (o) => ({
    lineCount: 3,
    clock: 'start-time',
    clockMinutes: '10',
    lineDefaults: [
      { title: 'Kicker', sample: 'UP NEXT' },
      { title: 'Item', sample: 'Designing for Live Broadcast' },
      { title: 'Presenter', sample: 'Dr. Ada Fenwick · Main Stage' },
    ],
    // The rail is a vertical accent stroke down the left of the text block — the house's
    // left-edge grammar, turned upright. It is the breath target, so the card lives without
    // anything jumping.
    html: `    <!-- Up Next: void panel — amber rail, mono kicker, item headline, presenter, countdown. -->
    <div class="starting-soon-box">
      <!-- The amber rail — the house accent edge; the hold-loop breathes it. -->
      <div class="starting-soon-rail starting-soon-pulse"></div>
      <!-- The text block: kicker, item, presenter, then the countdown row. -->
      <div class="starting-soon-stack">
        <!-- Kicker (f0) — the mono accent label. -->
        <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'UP NEXT'}</span></div>
        <!-- Item (f1) — the display headline: what is actually next. -->
        <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'Designing for Live Broadcast'}</span></div>
        <!-- Presenter / room (f2) — the secondary line. -->
        <div class="starting-soon-mask"><span id="f2" class="starting-soon-note">${o.lines[2]?.sample || 'Dr. Ada Fenwick · Main Stage'}</span></div>
        <!-- The countdown row — label plus the time the clock runtime paints. -->
        <div class="starting-soon-wait">
          <span class="starting-soon-label">STARTS IN</span>
          <span class="starting-soon-clock">10:00</span>
        </div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, with the rail and the text block side by side. */
.starting-soon-box {
  display: flex;                   /* rail beside the text block */
  align-items: stretch;            /* the rail runs the full height of the text */
  gap: calc(30px * var(--scale));  /* air between the rail and the words */
  padding: calc(42px * var(--scale)) calc(56px * var(--scale));  /* front-door air */
  text-align: left;                /* a schedule is read down a left edge, never centered */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
}

/* The rail — a vertical accent stroke, the house's left-edge grammar turned upright. */
.starting-soon-rail {
  flex: none;                      /* never squeezed by long text */
  width: var(--accent-weight);     /* the family's accent weight, used as a width here */
  background: var(--accent);       /* the one sharp dose of accent color */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent element only */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* The text block — everything to the right of the rail. */
.starting-soon-stack {
  display: flex;                   /* the lines stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: flex-start;         /* all four rows start on the same left edge */
}

/* The kicker (f0) — the house mono label. */
.starting-soon-title {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* The item (f1) — the display headline: the thing people are waiting for. */
.starting-soon-show {
  margin-top: calc(16px * var(--scale));  /* kicker and item read as one unit */
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* headline scale for a session title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;               /* a session title often wraps to two rows */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The presenter / room (f2) — the secondary line under the title. */
.starting-soon-note {
  margin-top: calc(12px * var(--scale));  /* close enough to belong to the title above */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.2:1 under the headline */
  font-weight: 400;                /* conversational weight */
  line-height: 1.3;                /* may wrap on a long name-and-room pair */
  color: var(--text-dim);          /* secondary text color */
}

/* The countdown row — a labelled figure, set apart from the words above it. */
.starting-soon-wait {
  display: inline-flex;            /* label and time on one row */
  align-items: baseline;           /* they share a baseline */
  gap: calc(16px * var(--scale));  /* a small, even gap between the two */
  margin-top: calc(28px * var(--scale));  /* clear air — the number is its own beat */
}

/* "STARTS IN" — the mono label that gives the figure its meaning. */
.starting-soon-label {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest type on the card */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  color: var(--text-dim);          /* quieter than the accent kicker above it */
}

/* The countdown — mono tabular figures, sized as a strong caption rather than a headline. */
.starting-soon-clock {
  font-family: var(--font-label);  /* the house mono face */
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* clearly a figure, clearly not the title */
  font-weight: 500;                /* medium — size carries the moment */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.04em;          /* a touch of air between figures */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no tick wobble */
  color: var(--text-color);        /* primary text color */
}

/* The slot has arrived — the countdown takes the accent. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
    tokens: {
      accentWeight: 'calc(4px * var(--scale))',
      labelTracking: '0.24em',
    },
  }),
);

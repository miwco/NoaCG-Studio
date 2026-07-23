// ss06 "Short Break" — the BRB card, house style. Sibling of ss04 (House Hold) and lt11
// (House Strap), turned around for the middle of a stream rather than the front door.
//
// A break card is a promise, so it carries a countdown: "back in 5" with nothing counting is
// the single most annoying thing a stream does. The duration restarts every time the card is
// taken up, which is exactly right here — a break begins when the operator says it begins.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineStartingSoonVariant } from './shared';

export const ss06: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss06',
    category: 'starting-soon',
    name: 'Short Break',
    styleTag: 'noacg',
    description: 'The house BRB card — big headline, a line of reassurance, and a countdown that restarts each take.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Headline', sample: 'BE RIGHT BACK' },
      { title: 'Note', sample: 'Grab a coffee — we resume in a moment' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Short Break',
    description:
      'The house break screen: the headline in big display type, one quiet line of ' +
      'reassurance beneath it, and the countdown across the bottom of the void panel as a ' +
      'wide amber-keylined bar. The bar breathes while the clock runs.',
    uicolor: '4',
  },
  (o) => ({
    lineCount: 2,
    clock: 'minutes',
    clockMinutes: '5',
    lineDefaults: [
      { title: 'Headline', sample: 'BE RIGHT BACK' },
      { title: 'Note', sample: 'Grab a coffee — we resume in a moment' },
    ],
    // Headline (f0) → note (f1) → the clock bar. The bar spans the panel, which is what
    // separates a break card from the front door: the wait is the whole message.
    html: `    <!-- Short Break: void panel — headline, note, and a wide breathing clock bar. -->
    <div class="starting-soon-box">
      <!-- Headline (f0) — the display line that says what is happening. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-show">${o.lines[0]?.sample || 'BE RIGHT BACK'}</span></div>
      <!-- Note (f1) — one quiet line of reassurance under the headline. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-note">${o.lines[1]?.sample || 'Grab a coffee — we resume in a moment'}</span></div>
      <!-- The clock bar — starting-soon-pulse is the hold-loop's breath target. -->
      <div class="starting-soon-bar starting-soon-pulse">
        <span class="starting-soon-label">BACK IN</span>
        <span class="starting-soon-clock">5:00</span>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, sized for the middle of a show rather than its front door. */
.starting-soon-box {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered under the mid anchor */
  text-align: center;              /* wrapped rows center too */
  padding: calc(46px * var(--scale)) calc(64px * var(--scale));  /* front-door air */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house amber top edge */
}

/* The headline (f0) — what is happening, in the house display voice. */
.starting-soon-show {
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* the loudest thing on the card */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;               /* tight leading — big text needs less */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The note (f1) — a human sentence, deliberately much quieter than the headline. */
.starting-soon-note {
  margin-top: calc(16px * var(--scale));  /* headline and note read as one unit */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.8:1 under the headline */
  font-weight: 400;                /* conversational weight — this line is spoken, not shouted */
  line-height: 1.35;               /* a sentence may wrap; give it room to breathe */
  color: var(--text-dim);          /* secondary text color */
}

/* The clock bar — a wide void chip with the house amber keyline; the breath target. */
.starting-soon-bar {
  display: inline-flex;            /* label and figures on one row */
  align-items: baseline;           /* the label sits on the digits' baseline */
  gap: calc(20px * var(--scale));  /* air between the label and the time */
  margin-top: calc(34px * var(--scale));  /* clear air — the countdown is its own moment */
  padding: calc(14px * var(--scale)) calc(40px * var(--scale));  /* generous chip padding */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);  /* the amber keyline */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* "BACK IN" — the mono label that turns a bare number into a promise. */
.starting-soon-label {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* label scale — it introduces the figure */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  color: var(--label-color);       /* the label carries the accent */
}

/* The countdown — mono figures, tabular so nothing jitters as it ticks. */
.starting-soon-clock {
  font-family: var(--font-label);  /* the house mono face */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the bar's focal figure */
  font-weight: 500;                /* medium — size carries the moment */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.04em;          /* a touch of air between figures */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no tick wobble */
  color: var(--text-color);        /* the brightest element on the bar */
}

/* Time's up — the clock runtime adds .starting-soon-done to the root at 0:00. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* the zero moment borrows the accent */
}`,
    tokens: {
      labelTracking: '0.24em',
    },
  }),
);

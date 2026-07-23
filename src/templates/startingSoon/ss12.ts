// ss12 "Back Shortly" — the compact returning-soon strip. Glass family, sibling of ss03 and
// lt09 (Gradient Pill).
//
// The other holding screens take the whole frame. This one deliberately does not: it is a
// single capsule that sits at the bottom of the picture so the camera, the slate, the
// waiting-room shot or the music-bed still fills the screen behind it. That is what a lot of
// productions actually want from a "back shortly" — not a card that hides the room, but a
// line that reassures over the top of it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss12: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss12',
    category: 'starting-soon',
    name: 'Back Shortly',
    styleTag: 'glass',
    description: 'A compact glass capsule over the picture — reassurance and a countdown without hiding the shot.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Headline', sample: 'Back shortly' },
      { title: 'Note', sample: 'Stay with us' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Back Shortly',
    description:
      'A single frosted capsule at the bottom of frame: a breathing accent dot, the ' +
      'headline, a quiet note, and the countdown behind a divider — all on one row, so the ' +
      'shot behind it keeps playing. The lightest holding screen in the set.',
    uicolor: '2',
  },
  (o) => ({
    lineCount: 2,
    clock: 'minutes',
    clockMinutes: '3',
    lineDefaults: [
      { title: 'Headline', sample: 'Back shortly' },
      { title: 'Note', sample: 'Stay with us' },
    ],
    // One row: dot · headline · note · divider · clock. The DOT carries the breath — on a
    // strip this small, breathing the whole capsule would read as a wobble.
    html: `    <!-- Back Shortly: one frosted capsule on the picture — dot, lines, divider, clock. -->
    <div class="starting-soon-box">
      <!-- The accent dot — the only moving element; the hold-loop breathes it. -->
      <span class="starting-soon-dot starting-soon-pulse"></span>
      <!-- Headline (f0) — the reassurance, in the primary voice. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-show">${o.lines[0]?.sample || 'Back shortly'}</span></div>
      <!-- Note (f1) — one short phrase in the secondary voice. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-note">${o.lines[1]?.sample || 'Stay with us'}</span></div>
      <!-- The divider, then the countdown the clock runtime paints. -->
      <span class="starting-soon-divider"></span>
      <div class="starting-soon-clock">3:00</div>
    </div>`,
    css: `/* The capsule — lt09's glass pill grown into a one-row strip. */
.starting-soon-box {
  display: flex;                   /* everything on one row… */
  align-items: center;             /* …sharing one centerline */
  gap: calc(18px * var(--scale));  /* even air between the pieces */
  padding: calc(16px * var(--scale)) calc(34px * var(--scale));  /* comfortable strip padding */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is not scaled */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The accent dot — a live indicator, and the only thing on the strip that moves. */
.starting-soon-dot {
  flex: none;                      /* never squeezed when the text is long */
  width: calc(12px * var(--scale));   /* a small, definite mark */
  height: calc(12px * var(--scale));  /* square, so the pill radius makes it a circle */
  border-radius: 999px;            /* a circle at any size */
  background: var(--accent);       /* the one dose of accent color */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* The headline — the reassurance. Sentence case: this line is spoken, not announced. */
.starting-soon-show {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* strip scale, not front-door scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.2;                /* one tight row */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The note — the quiet half of the pair. */
.starting-soon-note {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ~1.25:1 under the headline */
  font-weight: 400;                /* conversational weight */
  line-height: 1.25;               /* one row, matching the headline's rhythm */
  color: var(--text-dim);          /* secondary text color */
}

/* The divider — a hairline that separates the message from the number. */
.starting-soon-divider {
  flex: none;                      /* holds its width whatever the text does */
  width: 1px;                      /* a true hairline — never scaled up into a bar */
  align-self: stretch;             /* full height of the strip's content */
  background: rgba(255, 255, 255, 0.22);  /* the glass family's keyline value */
}

/* The countdown — tabular figures so the strip never changes width as it ticks. */
.starting-soon-clock {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* level with the headline */
  font-weight: 600;                /* solid digits without going heavy */
  line-height: 1.2;                /* shares the row's rhythm */
  letter-spacing: 0.03em;          /* digits get a little air */
  font-variant-numeric: tabular-nums;  /* fixed-width digits — the capsule never jitters */
  color: var(--text-color);        /* primary text color */
}

/* Time's up — the clock takes the accent. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
    tokens: { displayWeight: '600' },
  }),
);

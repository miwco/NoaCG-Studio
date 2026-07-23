// ss10 "Service Begins Soon" — the ceremony hold: a church service, a memorial, a wedding
// stream waiting for the processional. Minimal family, and the quietest card in the set.
//
// What makes it different from ss01 is restraint about the number. A congregation gathering
// for a service does not want a game-show clock counting them down, but the people joining at
// home genuinely need to know whether to make tea. So the countdown is here, and it is small:
// set under the title in the secondary voice, at label size, where it informs without
// dominating. It chases a wall-clock start time, because a service starts when it starts.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss10: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss10',
    category: 'starting-soon',
    name: 'Service Begins Soon',
    styleTag: 'minimal',
    description: 'A quiet ceremony hold — the occasion in serif-weight display type, the countdown deliberately small.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Occasion', sample: 'Sunday Morning Service' },
      { title: 'Note', sample: 'You are welcome to join us' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    // Ivory, not Porcelain: this card carries no panel, so its text sits straight on the
    // programme. Light type survives that; Porcelain's near-black text would vanish.
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Service Begins Soon',
    description:
      'The ceremony holding screen: the occasion set large and quiet, a line of welcome ' +
      'beneath it, and a small countdown in the secondary voice — informative without ' +
      'turning a service into an event with a shot clock. Counts to a set start time.',
    uicolor: '1',
  },
  (o) => ({
    lineCount: 2,
    clock: 'start-time',
    clockMinutes: '15',
    lineDefaults: [
      { title: 'Occasion', sample: 'Sunday Morning Service' },
      { title: 'Note', sample: 'You are welcome to join us' },
    ],
    // Occasion (f0) → note (f1) → rule → the small countdown row. The rule is the breath
    // target: on this card nothing else moves at all, which is the whole point.
    html: `    <!-- Service Begins Soon: the occasion, a welcome, a breathing rule, a small countdown. -->
    <div class="starting-soon-box">
      <!-- The occasion (f0) — the card's one large line. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-show">${o.lines[0]?.sample || 'Sunday Morning Service'}</span></div>
      <!-- The welcome (f1) — one quiet line beneath it. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-note">${o.lines[1]?.sample || 'You are welcome to join us'}</span></div>
      <!-- The hairline — the design's only accent, and the only thing that moves. -->
      <div class="starting-soon-rule starting-soon-pulse"></div>
      <!-- The countdown row — a label and the time, both at label scale on purpose. -->
      <div class="starting-soon-wait">
        <span class="starting-soon-label">BEGINS IN</span>
        <span class="starting-soon-clock">15:00</span>
      </div>
    </div>`,
    css: `/* The stack: no panel at all — this card is type, space, and one hairline. */
.starting-soon-box {
  display: flex;                   /* stack the pieces vertically… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* every line sits on the same center axis */
  text-align: center;              /* wrapped rows stay centered too */
  gap: calc(20px * var(--scale));  /* even, unhurried air between the lines */
}

/* The occasion — large, and set in the graphic's own face rather than shouted in caps.
   A service is named, not announced, so there is no text-transform here. */
.starting-soon-show {
  font-size: calc(84px * var(--scale) * var(--type-scale));  /* full-frame display scale */
  font-weight: var(--display-weight);  /* the card's authored display weight */
  line-height: 1.08;               /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* The welcome — one quiet sentence, at a comfortable reading measure. */
.starting-soon-note {
  max-width: calc(720px * var(--scale));  /* keeps the welcome to a readable row length */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* ~3:1 under the occasion */
  font-weight: 400;                /* conversational weight */
  line-height: 1.4;                /* prose leading — this line is read, not scanned */
  color: var(--text-dim);          /* secondary text color */
}

/* The hairline — the design's single accent moment, and the hold's breath target. */
.starting-soon-rule {
  width: calc(72px * var(--scale));  /* short: a mark, not a divider across the frame */
  height: var(--accent-weight);    /* the card's authored accent weight */
  margin: calc(12px * var(--scale)) 0;  /* a little extra air around the only moving thing */
  background: var(--accent);       /* the one small dose of accent color */
  will-change: transform;          /* hint the browser: the breath scales this */
}

/* The countdown row — deliberately at label scale. The number informs; it does not preside. */
.starting-soon-wait {
  display: inline-flex;            /* label and time on one row */
  align-items: baseline;           /* they share a baseline, like a caption */
  gap: calc(14px * var(--scale));  /* a small, even gap between the two */
}

/* "BEGINS IN" — the tracked caps label that gives the number its meaning. */
.starting-soon-label {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a label */
  color: var(--label-color);       /* the family's label color */
}

/* The countdown itself — the same quiet voice, only the figures are tabular. */
.starting-soon-clock {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* a shade above the label, no more */
  font-weight: 500;                /* medium so the digits read cleanly at this size */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.02em;          /* a touch of air between the figures */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no wobble per tick */
  color: var(--text-dim);          /* secondary voice: it informs, it does not preside */
}

/* The moment it begins — the countdown takes the accent, and only then. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
    tokens: {
      accentWeight: 'calc(2px * var(--scale))',
      labelTracking: '0.22em',
      displayWeight: '500',
    },
  }),
);

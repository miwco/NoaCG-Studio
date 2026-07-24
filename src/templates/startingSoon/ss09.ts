// ss09 "Thanks for Watching" — the sign-off card that holds after the show ends: the last
// thing on the channel before the stream goes down, or the still that sits under the outro
// music. House style, sibling of ss04 (House Hold) — deliberately the same void panel, so a
// channel's first and last frames read as one pair.
//
// No clock: nothing is coming. A countdown on a sign-off card invents an event that does not
// exist. What an ending card DOES need is the next appointment, which is what the third line
// is for ("Back Thursday at 19:00") — a sentence the operator types, not a timer.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineStartingSoonVariant } from './shared';

export const ss09: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss09',
    category: 'starting-soon',
    name: 'Thanks for Watching',
    styleTag: 'noacg',
    description: 'The sign-off / offline card — thanks, the show name, and when you are back next.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'THANKS FOR WATCHING' },
      { title: 'Show name', sample: 'The Late Line' },
      { title: 'Next time', sample: 'Back next Thursday at 19:00' },
    ],
    logo: 'none',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Thanks for Watching',
    description:
      'The house sign-off screen, the closing pair to ss04 House Hold: a mono kicker in the ' +
      'accent color, the show name in display type, an amber rule that breathes, and the ' +
      'next appointment underneath. No countdown — an ended show is not waiting for anything.',
    uicolor: '4',
  },
  (o) => ({
    lineCount: 3,
    clock: 'none',
    lineDefaults: [
      { title: 'Kicker', sample: 'THANKS FOR WATCHING' },
      { title: 'Show name', sample: 'The Late Line' },
      { title: 'Next time', sample: 'Back next Thursday at 19:00' },
    ],
    html: `    <!-- Thanks for Watching: void panel — mono kicker, show name, amber rule, next time. -->
    <div class="starting-soon-box">
      <!-- Kicker (f0) — the mono accent label carrying the thanks. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'THANKS FOR WATCHING'}</span></div>
      <!-- Show name (f1) — the display headline signing off. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'The Late Line'}</span></div>
      <!-- The amber rule — the design's one accent moment, and the breath target. -->
      <div class="starting-soon-rule starting-soon-pulse"></div>
      <!-- Next time (f2) — the real appointment, typed by the operator, never timed. -->
      <div class="starting-soon-mask"><span id="f2" class="starting-soon-note">${o.lines[2]?.sample || 'Back next Thursday at 19:00'}</span></div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the same house void as ss04, so the channel's first and last frames pair up. */
.starting-soon-box {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered under the mid anchor */
  text-align: center;              /* wrapped rows center too */
  padding: calc(46px * var(--scale)) calc(72px * var(--scale));  /* front-door air */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house amber top edge */
}

/* The kicker (f0) — the house label voice, carrying the thanks. */
.starting-soon-title {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* The show name (f1) — the display headline signing off. */
.starting-soon-show {
  margin-top: calc(18px * var(--scale));  /* kicker and name read as one unit */
  font-size: calc(68px * var(--scale) * var(--type-scale));  /* front-door headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The amber rule — the accent moment that separates the sign-off from the appointment. */
.starting-soon-rule {
  width: calc(96px * var(--scale));  /* a short stroke — a mark, not a rule across the panel */
  height: var(--accent-weight);    /* the family's accent weight */
  margin: calc(28px * var(--scale)) 0;  /* clear air on both sides of the rule */
  background: var(--accent);       /* the one sharp dose of accent color */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent element only */
  will-change: transform;          /* hint the browser: the breath scales this */
}

/* Next time (f2) — the real appointment. Quiet, but the most useful line on the card. */
.starting-soon-note {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.6:1 under the headline */
  font-weight: 400;                /* conversational weight — this line is spoken */
  line-height: 1.35;               /* it may wrap; give it room */
  color: var(--text-dim);          /* secondary text color */
}`,
    tokens: {
      accentWeight: 'calc(3px * var(--scale))',
      labelTracking: '0.24em',
    },
  }),
);

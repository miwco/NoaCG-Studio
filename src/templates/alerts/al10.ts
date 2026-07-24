// al10 "Standby Notice" — the house holding message. Not an emergency and not an apology:
// the graphic that goes up when a programme is paused, a feed is being re-established, or a
// meeting has been adjourned, and the audience needs to be told to wait rather than leave.
//
// It is the quietest thing in the pack. Alerts are read; a standby notice is LIVED WITH, so
// it is sized for someone glancing at it every few minutes rather than reading it once.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { alertLineMasks, defineAlertVariant } from './shared';

export const al10: TemplateVariant = defineAlertVariant(
  {
    id: 'al10',
    category: 'alert',
    name: 'Standby Notice',
    styleTag: 'noacg',
    description: 'A quiet house standby card: what is happening, and when to come back.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Status', sample: 'Standby' },
      { title: 'What is happening', sample: 'This session is paused' },
      { title: 'When', sample: 'We expect to resume at 14:30' },
    ],
    logo: 'optional',
    animationPresets: ['fade', 'blur-in', 'slide-up'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Standby Notice',
    description:
      'The house standby card: a mono status kicker over a plain statement and a time to ' +
      'come back for. Deliberately calm and low-contrast against the pack’s alerts — a pause ' +
      'is not an incident, and the graphic should not imply one.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Standby Notice: mono kicker, statement, and the time to come back. -->
    <div class="alert-box">
${alertLineMasks(o, '      ')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void panel, centred and unhurried. */
.alert-box {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* kicker, statement, time */
  align-items: center;             /* a centred card centres its own text */
  gap: calc(14px * var(--scale));  /* generous air — this graphic is lived with, not scanned */
  width: calc(860px * var(--scale));   /* a card, not a band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(44px * var(--scale)) calc(52px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: center;              /* the card's own axis, whatever the anchor zone is */
}

/* An optional logo leads the box — the markup and its rules come from the shared slot
   (shared/logoSlot.ts), appended after this stylesheet, so nothing is restated here. */

/* The status kicker — the house mono voice, tracked wide. */
.alert-name {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(18px * var(--scale) * var(--type-scale)); /* small: the kicker labels, it does not shout */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--label-color);       /* the accent, in the house family */
}

/* The statement — what is happening, in one plain sentence. */
.alert-title {
  font-size: calc(40px * var(--scale) * var(--type-scale)); /* the card's headline */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.14;               /* a wrapped statement stays one block */
  color: var(--text-color);        /* primary text color */
}

/* The time to come back — the only actionable fact on the card. */
.alert-extra {
  font-size: calc(22px * var(--scale) * var(--type-scale)); /* subordinate to the statement */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.3;                /* comfortable across a wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
  }),
);

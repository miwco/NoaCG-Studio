// al06 "Civil Emergency" — the take-the-screen card. When a broadcaster interrupts for a
// civil-protection message the graphic stops sharing the frame with anything: one centred
// block, one hazard line, one instruction, one source.
//
// Everything here is sized for the worst viewing case rather than the best — a small screen,
// a noisy room, a viewer who did not choose to watch. The instruction line is deliberately
// larger than the detail line on the other alerts: it is the only line that asks the viewer
// to DO something.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al06: TemplateVariant = defineAlertVariant(
  {
    id: 'al06',
    category: 'alert',
    name: 'Civil Emergency',
    styleTag: 'minimal',
    description: 'A full-width emergency card: severity cap, hazard, instruction and source.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Hazard', sample: 'Chemical release — industrial estate' },
      { title: 'What to do', sample: 'Go indoors. Close all windows and doors. Wait for the all-clear.' },
      { title: 'Source', sample: 'Civil Protection Authority' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'blur-in', 'slide-up'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Civil Emergency',
    description:
      'The interrupt card: a centred block that takes the frame, with the severity flag as a ' +
      'full-width cap, the hazard, the instruction, and the issuing authority. Sized for the ' +
      'worst viewing case, not the best.',
    uicolor: '1',
  },
  (o) => ({
    hasLevels: true,
    html: `    <!-- Civil Emergency: severity cap on top, hazard and instruction beneath. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The card — a wide centred block. It is opaque and flat: an emergency message must
   never be legible only against a particular background. */
.alert-box {
  display: flex;                   /* cap over column */
  flex-direction: column;          /* the cap is a row of its own */
  width: calc(1500px * var(--scale));  /* takes the frame, inside the safe areas */
  min-height: calc(520px * var(--scale)); /* the block reads as an interruption, not a strap */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
}

${ALERT_LEVEL_CSS}

/* The flag as a CAP: full width, fixed height, so the level word sits over the whole card. */
.alert-flag {
  align-self: auto;                /* a row in the column, not a stretched side slab */
  width: 100%;                     /* the cap spans the card */
  min-width: 0;                    /* the column, not the word, sets the width here */
  height: calc(96px * var(--scale));  /* fixed: the card must not jump on a level change */
}
.alert-flag > div {
  justify-content: flex-start;     /* the level word reads from the card's left edge */
  padding: 0 calc(52px * var(--scale)); /* aligned with the text column below */
  font-size: calc(38px * var(--scale) * var(--type-scale)); /* the biggest severity word in the pack */
}

/* The text column — three lines, centred in the block's remaining height. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* hazard, instruction, source */
  justify-content: center;         /* centred in the card's body */
  flex-grow: 1;                    /* take the height the cap leaves */
  gap: calc(22px * var(--scale));  /* three separate statements, not one paragraph */
  padding: calc(44px * var(--scale)) calc(52px * var(--scale));
  text-align: left;                /* an instruction reads left to right, whatever the zone */
}

/* The hazard — what has happened. */
.alert-name {
  font-size: calc(64px * var(--scale) * var(--type-scale)); /* the loudest text in the pack */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.06;               /* a wrapped hazard stays one block */
  color: var(--text-color);        /* primary text color */
}

/* The instruction — the only line that asks the viewer to act, so it is the second-largest
   thing on screen rather than a footnote. */
.alert-title {
  font-size: calc(38px * var(--scale) * var(--type-scale)); /* large enough to act on at a glance */
  font-weight: 500;                /* a touch of presence without shouting */
  line-height: 1.3;                /* short sentences, easy to scan across a wrap */
  color: var(--text-color);        /* NOT dimmed — an instruction is never secondary */
}

/* The hairline above the attribution, drawn on the MASK rather than on the span: a span is
   inline-block, so a rule on it would only be as wide as the words — and on a card this size
   that reads as a mistake rather than a flourish. */
.alert-lines > .alert-mask:last-child {
  margin-top: calc(8px * var(--scale)); /* a beat of separation */
  padding-top: calc(20px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.14); /* divides instruction from attribution */
}

/* The issuing authority — who is telling you this. */
.alert-extra {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* quiet, but never small print */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

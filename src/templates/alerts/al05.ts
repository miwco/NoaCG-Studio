// al05 "Weather Warning" — the met-office card: the severity flag as a full-width CAP over a
// stacked headline, and the area / valid-until line under it. The cap layout is what weather
// services use, and it is not decoration: the level is read first, before the eye reaches the
// place name, which is the order a viewer needs when the graphic is on screen for four
// seconds during a bulletin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al05: TemplateVariant = defineAlertVariant(
  {
    id: 'al05',
    category: 'alert',
    name: 'Weather Warning',
    styleTag: 'minimal',
    description: 'A weather-warning card: severity cap on top, headline, area and validity below.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Warning', sample: 'Coastal flooding' },
      { title: 'Area and validity', sample: 'Southern coast · valid 18:00 today until 06:00 tomorrow' },
      { title: 'Source', sample: 'National Weather Service' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Weather Warning',
    description:
      'The met-office card: the severity flag runs the full width as a cap, with the warning ' +
      'type, the affected area and the validity window stacked beneath it. Reading order is ' +
      'the design — level first, then place, then how long it lasts.',
    uicolor: '2',
  },
  (o) => ({
    hasLevels: true,
    html: `    <!-- Weather Warning: severity cap on top, the text stack beneath. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The card — a contained column, flag on top. */
.alert-box {
  display: flex;                   /* cap over column */
  flex-direction: column;          /* the cap is a row of its own */
  width: calc(700px * var(--scale));   /* a bulletin card, not a band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
}

${ALERT_LEVEL_CSS}

/* The flag as a CAP: full width, fixed height, so the level word sits over the whole card
   instead of beside it. The min-width from the shared rule is irrelevant here — the height
   is what has to stay constant, so a level change never re-flows the card. */
.alert-flag {
  align-self: auto;                /* a row in the column, not a stretched side slab */
  width: 100%;                     /* the cap spans the card */
  min-width: 0;                    /* the column, not the word, sets the width here */
  height: calc(62px * var(--scale));  /* fixed: the card must not jump on a level change */
}
.alert-flag > div {
  justify-content: flex-start;     /* the level word reads from the card's left edge */
  padding: 0 calc(26px * var(--scale)); /* aligned with the text column below */
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* the cap's voice */
}

/* The text column under the cap. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* warning, area/validity, source */
  gap: calc(8px * var(--scale));   /* the three lines are one statement */
  padding: calc(22px * var(--scale)) calc(26px * var(--scale)) calc(24px * var(--scale));
  text-align: left;                /* a warning reads left to right, whatever the zone */
}

/* The warning type — the two or three words that name the hazard. */
.alert-name {
  font-size: calc(44px * var(--scale) * var(--type-scale)); /* the loudest text in the card */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.08;               /* a wrapped hazard name stays one block */
  color: var(--text-color);        /* primary text color */
}

/* The area and the validity window — the two facts a viewer needs after the hazard. */
.alert-title {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* clearly subordinate to the hazard */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.35;               /* comfortable across a wrap */
  color: var(--text-dim);          /* secondary text color */
}

/* The hairline above the attribution, drawn on the MASK rather than on the span: a span is
   inline-block, so a rule on it would only be as wide as the words. */
.alert-lines > .alert-mask:last-child {
  margin-top: calc(6px * var(--scale)); /* a beat of separation */
  padding-top: calc(12px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* divides fact from attribution */
}

/* The issuing service — an unattributed warning is a rumour. */
.alert-extra {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale)); /* the quietest voice in the card */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

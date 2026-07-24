// al02 "House Alert" — the NoaCG alert bar: the house void panel turned into a warning
// banner, with the brand's mono label voice on the severity flag and a half-strength accent
// rule under the text column. Sibling of lt11 House Strap and tk05 House Wire.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al02: TemplateVariant = defineAlertVariant(
  {
    id: 'al02',
    category: 'alert',
    name: 'House Alert',
    styleTag: 'noacg',
    description: 'The house void bar as an alert: mono severity flag, headline, detail, source.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Power outage affecting the eastern grid' },
      { title: 'Detail', sample: 'Repair crews on site — restoration expected by 21:00' },
      { title: 'Source', sample: 'City Energy Authority' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Alert',
    description:
      'The NoaCG alert bar: a void blur panel edged by a half-strength accent line, the ' +
      'severity flag in the house mono label face, and a headline / detail / source stack. ' +
      'The severity colour is the one thing here that never follows the project palette.',
    uicolor: '4',
  },
  (o) => ({
    hasLevels: true,
    html: `    <!-- House Alert: severity flag left, the text stack filling the bar. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The bar — the house void turned horizontal, with a half-strength accent bottom edge. The
   backdrop blur is the family's signature; the panel stays opaque enough that the text never
   depends on what is behind it. */
.alert-box {
  display: flex;                   /* flag left, text column filling the rest */
  align-items: stretch;            /* the flag spans the bar's full height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  min-height: calc(148px * var(--scale)); /* the bar grows if the headline wraps */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-bottom: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
}

${ALERT_LEVEL_CSS}

/* The text column — three lines, centred against the flag. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* headline, detail, source */
  justify-content: center;         /* centred against the flag's height */
  gap: calc(7px * var(--scale));   /* tight — the three lines are one statement */
  padding: calc(22px * var(--scale)) calc(40px * var(--scale)); /* generous house air */
  min-width: 0;                    /* let a long headline wrap instead of stretching the flex row */
  text-align: left;                /* an alert reads from the flag outward, always */
}

/* The headline — the sentence someone acts on. */
.alert-name {
  font-size: calc(42px * var(--scale) * var(--type-scale)); /* the loudest text in the graphic */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.1;                /* wrapped headlines stay one block */
  color: var(--text-color);        /* primary text color */
}

/* The detail — what, where, and until when. */
.alert-title {
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* clearly subordinate to the headline */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.25;               /* comfortable for a full sentence */
  color: var(--text-dim);          /* secondary text color */
}

/* The source — who says so, in the house mono voice. */
.alert-extra {
  margin-top: calc(4px * var(--scale)); /* a beat of separation from the detail */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(16px * var(--scale) * var(--type-scale)); /* the quietest voice in the graphic */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the accent, in the house family */
}`,
    hasAccent: false,
    // The flag carries the mono label face at a slightly tighter track than the family's
    // 0.2em: a severity word is longer than a kicker and opens up too far at full tracking.
    tokens: { labelTracking: '0.16em' },
  }),
);

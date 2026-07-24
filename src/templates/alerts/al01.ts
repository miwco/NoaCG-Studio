// al01 "Signal Alert" — the minimal alert banner, sibling of lt01/lt02 and tk01. A flat
// near-black band the full working width, a solid severity flag holding the left end, and
// three lines of text: the headline, the detail, and the source that makes it official.
//
// The severity flag is the graphic's first voice — it is read before the headline, which is
// why it sits on the reading edge and carries the only colour in the design.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
  type AlertDesign,
} from './shared';

export const al01: TemplateVariant = defineAlertVariant(
  {
    id: 'al01',
    category: 'alert',
    name: 'Signal Alert',
    styleTag: 'minimal',
    description: 'Flat alert band with a severity flag, a headline, a detail line and a source.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Severe weather warning for coastal districts' },
      { title: 'Detail', sample: 'High winds and flooding expected from 18:00 until midnight' },
      { title: 'Source', sample: 'National Weather Service' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'mask-wipe', 'blur-in', 'snap-stinger'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Signal Alert',
    description:
      'The minimal alert band: a flat near-black bar the working width of the frame, a solid ' +
      'severity flag on the reading edge, and a headline / detail / source stack. Nothing ' +
      'moves that does not have to — an alert is read, not admired.',
    uicolor: '1',
  },
  (o) => signalAlert(o),
);

/** The Signal Alert look. Exported because al05 Weather Warning wears the same band with
 *  weather copy — the two share a face, not a purpose. */
export function signalAlert(o: ResolvedOptions): AlertDesign {
  return {
    hasLevels: true,
    html: `    <!-- Signal Alert: severity flag left, the text stack filling the band. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The band — flat, opaque, and as wide as the safe area allows. An alert must not
   depend on what is behind it, so there is no blur and no transparency to read through. */
.alert-box {
  display: flex;                   /* flag left, text column filling the rest */
  align-items: stretch;            /* the flag spans the band's full height */
  width: calc(2240px * var(--scale));  /* near full-width, inside the safe areas */
  min-height: calc(187px * var(--scale)); /* the band grows if the headline wraps */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
}

${ALERT_LEVEL_CSS}

/* The text column — three lines, centred against the flag. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* headline, detail, source */
  justify-content: center;         /* centred against the flag's height */
  gap: calc(8px * var(--scale));   /* tight — the three lines are one statement */
  padding: calc(27px * var(--scale)) calc(45px * var(--scale)); /* air inside the band */
  min-width: 0;                    /* let a long headline wrap instead of stretching the flex row */
  text-align: left;                /* an alert reads from the flag outward, always */
}

/* The headline — the sentence someone acts on. */
.alert-name {
  font-size: calc(53px * var(--scale) * var(--type-scale)); /* the loudest text in the graphic */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.12;               /* wrapped headlines stay one block */
  color: var(--text-color);        /* primary text color */
}

/* The detail — what, where, and until when. */
.alert-title {
  font-size: calc(32px * var(--scale) * var(--type-scale)); /* clearly subordinate to the headline */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.25;               /* comfortable for a full sentence */
  color: var(--text-dim);          /* secondary text color */
}

/* The source — who says so. Small, tracked, and never dropped: an unattributed warning is
   a rumour. */
.alert-extra {
  margin-top: calc(5px * var(--scale)); /* a beat of separation from the detail */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the graphic */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  };
}

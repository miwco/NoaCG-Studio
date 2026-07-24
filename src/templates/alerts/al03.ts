// al03 "Frost Alert" — the glass alert card. Where al01 is a band across the frame, this one
// is a contained rounded panel that sits in a corner: the shape a streaming or magazine
// programme uses when an alert has to coexist with a busy picture rather than take it over.
// Sibling of lt08/lt09 and card03.
//
// The frosted panel is the family's signature, but an alert cannot be read THROUGH: the panel
// keeps a solid floor under the blur so the headline never fights the video behind it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al03: TemplateVariant = defineAlertVariant(
  {
    id: 'al03',
    category: 'alert',
    name: 'Frost Alert',
    styleTag: 'glass',
    description: 'A frosted alert panel with a full-height severity flag — for a busy picture.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Travel disruption on the northern line' },
      { title: 'Detail', sample: 'Replacement buses running between Central and Harbour' },
      { title: 'Source', sample: 'Regional Transport Authority' },
    ],
    logo: 'none',
    animationPresets: ['slide-left', 'fade', 'pop-spring', 'blur-in'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Frost Alert',
    description:
      'A frosted, rounded alert panel with the severity flag running its full height. Built ' +
      'to sit beside the action rather than across it — the panel keeps a solid floor under ' +
      'its blur so the headline is never read through moving video.',
    uicolor: '5',
  },
  (o) => ({
    hasLevels: true,
    html: `    <!-- Frost Alert: a contained panel — severity flag left, text stack right. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The panel — frosted, rounded, and CLIPPED so the severity flag takes the panel's own
   corner radius instead of squaring off its left edge. */
.alert-box {
  display: flex;                   /* flag left, text column filling the rest */
  align-items: stretch;            /* the flag spans the panel's full height */
  width: calc(880px * var(--scale));   /* a contained panel, not a full-width band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  min-height: calc(150px * var(--scale)); /* grows with a wrapped headline */
  overflow: hidden;                /* the flag inherits the panel's rounded corners */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  /* The family's translucent fill over an opaque floor: the blur reads as glass, the floor
     keeps the text off the moving picture. */
  background: linear-gradient(var(--panel-bg), var(--panel-bg)), rgba(8, 12, 18, 0.82);
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
}

${ALERT_LEVEL_CSS}

/* This panel is narrower than the full-width bands, so the flag is too — the word still
   fits, and the text column keeps the room it needs. */
.alert-flag {
  min-width: calc(214px * var(--scale) * var(--type-scale));  /* still fits the longest level word */
}
.alert-flag > div {
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* scaled to the narrower slab */
}

/* The text column — three lines, centred against the flag. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* headline, detail, source */
  justify-content: center;         /* centred against the flag's height */
  gap: calc(6px * var(--scale));   /* tight — the three lines are one statement */
  padding: calc(20px * var(--scale)) calc(28px * var(--scale)); /* air inside the panel */
  min-width: 0;                    /* let a long headline wrap instead of stretching the flex row */
  text-align: left;                /* an alert reads from the flag outward, always */
}

/* The headline — the sentence someone acts on. */
.alert-name {
  font-size: calc(32px * var(--scale) * var(--type-scale)); /* the loudest text in the panel */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.15;               /* wrapped headlines stay one block */
  color: var(--text-color);        /* primary text color */
}

/* The detail — what, where, and until when. */
.alert-title {
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* clearly subordinate to the headline */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.3;                /* comfortable for a full sentence */
  color: var(--text-dim);          /* secondary text color */
}

/* The source — who says so. */
.alert-extra {
  margin-top: calc(3px * var(--scale)); /* a beat of separation from the detail */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the accent, in the glass family */
}`,
    hasAccent: false,
  }),
);

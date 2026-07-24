// al04 "Volt Alert" — the sport alert rail: a hard-edged slab with the severity flag leaning
// into the text, heavy condensed caps, and a hard offset shadow. The graphic a match feed
// uses for an abandonment, a crowd-safety announcement or a venue instruction.
// Sibling of lt05/lt06 and tk02.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al04: TemplateVariant = defineAlertVariant(
  {
    id: 'al04',
    category: 'alert',
    name: 'Volt Alert',
    styleTag: 'sport',
    description: 'A hard-edged alert rail with a leaning severity flag and heavy caps.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'MATCH SUSPENDED — SEVERE WEATHER' },
      { title: 'Detail', sample: 'Spectators asked to leave the stands and use the concourse' },
      { title: 'Source', sample: 'Venue Safety Officer' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-left', 'slide-up', 'fade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Alert',
    description:
      'The sport alert rail: a square-cut slab on a hard offset shadow, the severity flag ' +
      'leaning into the text the way a sport chip does, and condensed heavy caps for the ' +
      'headline. Loud in shape, never in motion.',
    uicolor: '3',
  },
  (o) => ({
    hasLevels: true,
    html: `    <!-- Volt Alert: leaning severity flag left, the text stack filling the rail. -->
    <div class="alert-box">
${alertLevelStackHtml('      ')}
      <!-- The text column. Each line is a real SPX field inside its own reveal mask. -->
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The rail — square corners, flat fill, and the family's hard offset shadow. */
.alert-box {
  display: flex;                   /* flag left, text column filling the rest */
  align-items: stretch;            /* the flag spans the rail's full height */
  width: calc(1640px * var(--scale));  /* near full-width, inside the safe areas */
  min-height: calc(181px * var(--scale)); /* the rail grows if the headline wraps */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  border-radius: var(--panel-radius);  /* the family's radius — square */
  background: var(--panel-bg);     /* flat near-black slab */
  box-shadow: var(--panel-shadow); /* the family's hard offset */
}

${ALERT_LEVEL_CSS}

/* The lean: the sport chip's skew, applied to the flag and taken back off the word so the
   level stays upright and readable. A skewed severity word would be a style choice paid for
   in comprehension. */
.alert-flag {
  transform: skewX(-9deg);         /* the family's lean */
  min-width: calc(371px * var(--scale) * var(--type-scale));  /* the skew eats horizontal room — give it back */
  margin-right: calc(13px * var(--scale)); /* the lean must not touch the headline */
}
.alert-flag > div {
  transform: skewX(9deg);          /* stand the word back up inside the leaning slab */
  font-size: calc(37px * var(--scale) * var(--type-scale)); /* heavier voice than the other families */
}

/* The text column — three lines, centred against the flag. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* headline, detail, source */
  justify-content: center;         /* centred against the flag's height */
  gap: calc(5px * var(--scale));   /* condensed type needs less air between rows */
  padding: calc(24px * var(--scale)) calc(40px * var(--scale)); /* air inside the rail */
  min-width: 0;                    /* let a long headline wrap instead of stretching the flex row */
  text-align: left;                /* an alert reads from the flag outward, always */
}

/* The headline — condensed heavy caps, the sport voice at its most direct. */
.alert-name {
  font-size: calc(53px * var(--scale) * var(--type-scale)); /* the loudest text in the graphic */
  font-weight: var(--display-weight);  /* the family's heavy heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.06;               /* condensed caps sit close */
  text-transform: uppercase;       /* the family shouts in caps */
  color: var(--text-color);        /* primary text color */
}

/* The detail — sentence case on purpose: the instruction has to be READ, not scanned. */
.alert-title {
  font-size: calc(29px * var(--scale) * var(--type-scale)); /* clearly subordinate to the headline */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.28;               /* comfortable for a full sentence */
  color: var(--text-dim);          /* secondary text color */
}

/* The source — who says so. */
.alert-extra {
  margin-top: calc(4px * var(--scale)); /* a beat of separation from the detail */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the graphic */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

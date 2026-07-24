// pi06 "Health Advisory" — the public-health panel: what is going around, what to do about
// it, and the number to call. The helpline is a field of its own and is set in the largest
// type on the card after the heading, because it is the only thing on screen a viewer might
// need to read out loud to somebody else.
//
// The tone is deliberately not the alert category's. Health information is given to people
// who are already worried; a graphic that looks like an emergency makes that worse and is
// read less carefully, not more.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi06: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi06',
    category: 'public-info',
    name: 'Health Advisory',
    styleTag: 'glass',
    description: 'A public-health panel: the advice, and the helpline number, set to be read aloud.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Heading', sample: 'Health advice' },
      { title: 'Advice', sample: 'Seasonal flu is circulating. Stay home if you have a fever and call before visiting a clinic.' },
      { title: 'Helpline', sample: 'Health line 116 117 — open 24 hours' },
      { title: 'Issued by', sample: 'Regional Health Authority' },
    ],
    logo: 'optional',
    animationPresets: ['fade', 'slide-up', 'blur-in', 'pop-spring'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Health Advisory',
    description:
      'The public-health panel: calm frosted glass, the advice in plain prose, and the ' +
      'helpline in its own high-contrast band — the one line on the card a viewer may need ' +
      'to read out to someone else.',
    uicolor: '7',
  },
  (o) => ({
    html: `    <!-- Health Advisory: heading, advice, helpline band, issuing authority. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body'], [2, 'public-info-helpline'], [3, 'public-info-source']])}
    </div>`,
    css: `/* The panel — frosted glass over an opaque floor, calm by construction. */
.public-info-box {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* heading, advice, helpline, issuer */
  gap: calc(18px * var(--scale));  /* unhurried spacing — this is not an alert */
  width: calc(1025px * var(--scale));   /* a card, not a band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(38px * var(--scale)) calc(40px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's corner radius */
  background: linear-gradient(var(--panel-bg), var(--panel-bg)), rgba(8, 14, 16, 0.82);
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  text-align: left;                /* advice reads left to right, whatever the zone */
}

/* The heading — what kind of message this is. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the accent, in the glass family */
}

/* The advice — plain prose, generously spaced. Someone worried reads more slowly. */
.public-info-body {
  font-size: calc(33px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.38;               /* the most generous leading in the pack, on purpose */
  color: var(--text-color);        /* primary text color — never dimmed */
}

/* The helpline — the one line that might be read out loud. Its own band, full contrast,
   tabular figures so a phone number never shuffles as it wraps. */
.public-info-helpline {
  padding: calc(18px * var(--scale)) calc(23px * var(--scale));
  border-left: var(--accent-weight) solid var(--accent); /* the accent marks the actionable line */
  border-radius: calc(5px * var(--scale)); /* barely rounded — a band, not a chip */
  background: rgba(255, 255, 255, 0.12); /* a lifted surface inside the glass */
  font-size: calc(38px * var(--scale) * var(--type-scale)); /* the largest text after the advice */
  font-weight: 700;                /* a number to be read aloud needs weight */
  font-variant-numeric: tabular-nums;   /* even digits across the number */
  line-height: 1.24;               /* comfortable across a wrap */
  color: var(--text-color);        /* full contrast: this is the line that gets acted on */
}

/* The hairline above the attribution, drawn on the MASK — a span is inline-block, so a rule
   on it would only be as wide as the words. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(18px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.16); /* divides advice from attribution */
}

/* The issuing authority — whose advice this is. */
.public-info-source {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the accent, in the glass family */
}`,
    hasAccent: false,
  }),
);

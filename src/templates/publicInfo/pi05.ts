// pi05 "Municipal Notice" — the council card: a heading, the decision or notice itself, the
// reference someone can quote back at the authority, and who issued it.
//
// The reference line is the whole reason this is a separate design rather than a themed
// pi01. Municipal, planning and licensing notices are actionable: a viewer who wants to
// object, appeal or ask a question needs the case number and the deadline, and putting them
// in a field of their own is what stops an operator burying them at the end of the notice.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi05: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi05',
    category: 'public-info',
    name: 'Municipal Notice',
    styleTag: 'glass',
    description: 'A council notice with its own reference-and-deadline line and issuing office.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Heading', sample: 'Planning notice' },
      { title: 'Notice', sample: 'An application has been made to extend the harbour terminal building.' },
      { title: 'Reference and deadline', sample: 'Ref. 2026/PL/0184 · comments by 30 April' },
      { title: 'Issued by', sample: 'City Planning Office' },
    ],
    logo: 'optional',
    animationPresets: ['fade', 'slide-up', 'pop-spring', 'blur-in'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-right',
  },
  {
    name: 'Municipal Notice',
    description:
      'The council card: a frosted panel carrying a heading, the notice, and — in a chip of ' +
      'its own — the case reference and the deadline to respond by. The two facts a viewer ' +
      'has to write down get a place they cannot be buried in.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Municipal Notice: heading, notice, reference chip, issuing office. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body'], [2, 'public-info-ref'], [3, 'public-info-source']])}
    </div>`,
    css: `/* The panel — frosted glass over an opaque floor: a notice must be readable whatever is
   playing behind it. */
.public-info-box {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* heading, notice, reference, issuer */
  gap: calc(15px * var(--scale));  /* the four lines are one statement */
  width: calc(950px * var(--scale));   /* a card, not a band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(38px * var(--scale)) calc(40px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's corner radius */
  background: linear-gradient(var(--panel-bg), var(--panel-bg)), rgba(8, 12, 18, 0.82);
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

/* The heading — what KIND of notice this is. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the accent, in the glass family */
}

/* The notice itself — prose, at a comfortable reading size. */
.public-info-body {
  font-size: calc(33px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.34;               /* generous: this line will wrap */
  color: var(--text-color);        /* primary text color — never dimmed */
}

/* The reference chip — the case number and the date to act by, boxed so they cannot be
   mistaken for the end of the sentence above. */
.public-info-ref {
  padding: calc(11px * var(--scale)) calc(18px * var(--scale));
  border-radius: calc(8px * var(--scale)); /* a chip, softer than the panel's own corners */
  background: rgba(255, 255, 255, 0.10); /* a lifted surface inside the glass */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* readable enough to copy down */
  font-weight: 600;                /* weight, not size, keeps a reference legible */
  font-variant-numeric: tabular-nums;   /* even digits — this line is mostly numbers */
  color: var(--text-color);        /* full contrast: it is meant to be written down */
}

/* The hairline above the attribution, drawn on the MASK — a span is inline-block, so a rule
   on it would only be as wide as the words. */
.public-info-box > .public-info-mask:last-child {
  margin-top: calc(3px * var(--scale)); /* a beat of separation */
  padding-top: calc(18px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.16); /* divides notice from attribution */
}

/* The issuing office — who to take this up with. */
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

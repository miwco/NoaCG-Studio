// pi01 "Public Notice" — the plain official notice. A heading, the notice itself, and the
// body that issued it. It is the category's reference design: everything else here is this
// with something added.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi01: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi01',
    category: 'public-info',
    name: 'Public Notice',
    styleTag: 'minimal',
    description: 'A plain official notice: heading, the notice itself, and the issuing body.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Heading', sample: 'Public notice' },
      { title: 'Notice', sample: 'The harbour road will be closed to all traffic on Saturday from 06:00 to 18:00 for bridge inspection.' },
      { title: 'Issued by', sample: 'City Roads Department' },
    ],
    logo: 'optional',
    animationPresets: ['fade', 'slide-up', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Public Notice',
    description:
      'The reference public notice: a small tracked heading, the notice in comfortable ' +
      'reading type, and the issuing body under a hairline. An accent rule on the reading ' +
      'edge marks it as official without shouting.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Public Notice: accent rule, heading, notice, issuing body. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body'], [2, 'public-info-source']])}
    </div>`,
    css: `/* The panel — flat and opaque. A notice must be legible over anything. */
.public-info-box {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* heading, notice, issuer */
  gap: calc(13px * var(--scale));  /* the three lines are one statement */
  width: calc(1440px * var(--scale));  /* a wide card — a notice is a paragraph, not a strap */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(37px * var(--scale)) calc(45px * var(--scale));
  border-left: var(--accent-weight) solid var(--accent);  /* the official mark, on the reading edge */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

/* The heading — what KIND of message this is, before the message itself. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the family's label colour */
}

/* The notice — the sentence people are here for. Set at a comfortable reading size rather
   than a headline size: this is prose, and prose in display type is slower to read. */
.public-info-body {
  font-size: calc(37px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.34;               /* generous: this line will wrap */
  color: var(--text-color);        /* primary text color — never dimmed */
}

/* The hairline between the notice and its attribution. It is drawn on the MASK, not on the
   span: a span is inline-block, so a rule on it would only be as wide as the words, and the
   line presets slide the span inside its mask — a divider that travelled with the text would
   read as part of the sentence. */
.public-info-box > .public-info-mask:last-child {
  margin-top: calc(5px * var(--scale)); /* a beat of separation */
  padding-top: calc(19px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* divides notice from attribution */
}

/* The issuing body — an unattributed public notice is a rumour. */
.public-info-source {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

// pi07 "Bilingual Panel" — the same notice in two languages, side by side, both on screen at
// once. The form used where two languages are official rather than where one is a courtesy
// translation: a bilingual municipality, a border region, an international venue.
//
// Both columns are set at the SAME size, weight and contrast, and the separator between them
// is a neutral keyline rather than a hierarchy. That is a deliberate editorial position, not
// a styling default: dimming the second language is the most common way a bilingual graphic
// tells half its audience it is an afterthought. If a broadcaster does want a lead language,
// they have the sizes right here to change — but the shipped default does not choose one.
//
// Side by side costs width, which is why the companion rotator (pi08/pi09) exists: when there
// is no room for two columns, the languages take turns instead.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi07: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi07',
    category: 'public-info',
    name: 'Bilingual Panel',
    styleTag: 'minimal',
    description: 'One notice in two languages, side by side, both given equal weight.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading (language 1)', sample: 'Public notice' },
      { title: 'Notice (language 1)', sample: 'The ferry terminal closes at 22:00 tonight for maintenance.' },
      { title: 'Heading (language 2)', sample: 'Yleinen tiedote' },
      { title: 'Notice (language 2)', sample: 'Lauttaterminaali suljetaan tänään klo 22.00 huoltotöiden vuoksi.' },
      { title: 'Issued by', sample: 'Port Authority' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Bilingual Panel',
    description:
      'One notice, two languages, both on screen: equal columns divided by a neutral keyline, ' +
      'with a single shared attribution beneath. Neither language is dimmed — the panel does ' +
      'not decide which half of the audience matters more.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Bilingual Panel: two equal language columns over one shared attribution. -->
    <div class="public-info-box">
      <div class="public-info-cols">
        <!-- Language 1. -->
        <div class="public-info-col">
${piMasks(o, [[0, 'public-info-kicker'], [1, 'public-info-body']], '          ')}
        </div>
        <!-- Language 2 — same sizes, same contrast, same everything. -->
        <div class="public-info-col">
${piMasks(o, [[2, 'public-info-kicker'], [3, 'public-info-body']], '          ')}
        </div>
      </div>
${piMasks(o, [[4, 'public-info-source']])}
    </div>`,
    css: `/* The panel — flat and opaque, wide enough for two columns of prose. */
.public-info-box {
  display: flex;                   /* the columns block, then the attribution */
  flex-direction: column;          /* stacked */
  gap: calc(27px * var(--scale));  /* air above the attribution */
  width: calc(1480px * var(--scale));  /* two columns of prose need the width */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(40px * var(--scale)) calc(48px * var(--scale));
  border-top: var(--accent-weight) solid var(--accent);  /* the official mark */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

/* The two columns. Equal fractions, not content-sized: a translation that happens to be
   shorter must not be given a narrower column, or the layout starts making the point the
   typography is careful not to. */
.public-info-cols {
  display: grid;                   /* two columns */
  grid-template-columns: 1fr 1fr;  /* equal — deliberately not auto */
  gap: calc(53px * var(--scale));  /* the gutter the keyline sits in */
}

/* One language column. */
.public-info-col {
  display: flex;                   /* stack the heading and the notice */
  flex-direction: column;          /* heading over notice */
  gap: calc(13px * var(--scale));  /* the two lines are one statement */
  min-width: 0;                    /* let prose wrap instead of stretching the grid */
}

/* The divider — a neutral keyline in the gutter, drawn on the second column so it never
   appears when only one language has been filled in. */
.public-info-col + .public-info-col {
  padding-left: calc(53px * var(--scale)); /* the keyline's own breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.14); /* neutral: not the accent, not a hierarchy */
}

/* The headings — one per language. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the family's label colour */
}

/* The notices — identical treatment in both columns. */
.public-info-body {
  font-size: calc(35px * var(--scale) * var(--type-scale)); /* comfortable at a distance */
  font-weight: 400;                /* regular — prose, not a headline */
  line-height: 1.34;               /* generous: these lines will wrap */
  color: var(--text-color);        /* primary text color — in BOTH languages */
}

/* The hairline above the shared attribution, drawn on the MASK — a span is inline-block, so
   a rule on it would only be as wide as the words. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(21px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* divides notice from attribution */
}

/* The issuing body — one attribution for both languages. */
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

// pi04 "Disclaimer Strip" — the full-width band of small print: a legal notice, a sponsorship
// declaration, a "views expressed are the contributor's own", a gambling or health warning.
//
// The design problem here is the opposite of every other graphic in the pack. Small print is
// required to be present and required NOT to dominate, and the failure mode broadcasters
// actually hit is illegibility, not clutter: text set too small, too thin, and too low in
// contrast to survive an encode. So this strip sets its floor deliberately — 18px at 1080p,
// weight 500, full-contrast ink — and gets its restraint from the band's height instead.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi04: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi04',
    category: 'public-info',
    name: 'Disclaimer Strip',
    styleTag: 'minimal',
    description: 'A full-width band for legal small print — legible by design, quiet by height.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Disclaimer', sample: 'The views expressed by contributors are their own and do not represent those of this station.' },
      { title: 'Reference', sample: 'Broadcast code of practice, section 4.2' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Disclaimer Strip',
    description:
      'The small-print band: full working width, low height, and text set at the legibility ' +
      'floor rather than below it. A disclaimer nobody can read has not been given.',
    uicolor: '6',
  },
  (o) => ({
    html: `    <!-- Disclaimer Strip: the disclaimer, with its reference at the right. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-fine'], [1, 'public-info-ref']])}
    </div>`,
    css: `/* The band — the full working width, kept low. Height is what makes this graphic
   unobtrusive; shrinking the type would only make it unreadable. */
.public-info-box {
  display: flex;                   /* disclaimer left, reference right */
  align-items: baseline;           /* the two texts share a baseline */
  justify-content: space-between;  /* the reference holds the far end */
  gap: calc(40px * var(--scale));  /* the two never touch */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(18px * var(--scale)) calc(35px * var(--scale));
  background: rgba(10, 12, 16, 0.88); /* opaque enough that the print never sits on video */
  text-align: left;                /* small print reads left to right, whatever the zone */
}

/* The MASKS are the band's flex children (each line lives inside its reveal mask), so the
   sizing rules belong to them and not to the spans inside. */
.public-info-box > .public-info-mask:first-child {
  flex: 1 1 auto;                  /* the disclaimer takes the width the reference leaves */
  min-width: 0;                    /* wrap rather than push the reference off the band */
}
.public-info-box > .public-info-mask:last-child {
  flex-shrink: 0;                  /* the reference is never squeezed by a long disclaimer */
}

/* The disclaimer — the required words. At the legibility floor, not below it. */
.public-info-fine {
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* the floor for legible on-air text */
  font-weight: 500;                /* weight, not size, is what keeps small text readable */
  line-height: 1.32;               /* comfortable across a wrap */
  color: var(--text-color);        /* full contrast — small AND dim is how print becomes decoration */
}

/* The reference — the clause or code this comes from. */
.public-info-ref {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice on the band */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a citation stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);

// lt67 "Matte Window" - the framed cut-out: a paper mat with a WINDOW of live picture in it,
// the name floating inside the window, the caption printed on the mat below it.
//
// The absence this answers is docs/CATALOG_WORK_QUEUE.md §1's last line, and it is the one the
// queue calls the clear add: every other lower third is a plate ON the picture, and this one
// inverts figure and ground - the drawn thing is the field, the strap is the HOLE in it, and
// the picture itself becomes the name's backdrop. A gallery mat around a detail of the frame.
//
// THREE decisions carry it:
//
//  1. THE FIELD IS THE PANEL TOKEN. The mat is drawn in `--panel-bg` (paper, in the default
//     Broadsheet), so a palette repaints the whole field exactly as it repaints any reading
//     surface (docs/CATALOG_VARIETY.md §5). The fillet rule inside the window is the family's
//     2px printed rule in the accent.
//  2. THE NAME IS LITERAL WHITE, and that is argued rather than an oversight: it sits on the
//     PICTURE, not on any palette surface, and no token can promise contrast against video a
//     palette cannot repaint. That is the cinematic families' standing posture (panel-less text
//     is welded to the picture - docs/CATALOG_VARIETY.md §5.2), bought here with the same tools:
//     a soft drop-shadow on the BOX, never a text-shadow on the line, which the line's own
//     overflow-hidden mask would clip (DESIGN_LANGUAGE §3).
//  3. THE CAPTION SITS ON THE MAT, not in the window. The kicker and the role are printed on
//     the paper below the window - the gallery-label move - so both read at AA on a surface the
//     palette owns, and the window keeps one line only: the name the mat exists to present.
//
// Editorial, in Broadsheet: a paper field with a navy fillet, set in the serif. Light backdrops
// are seven designs of 105, so the tone widens the shelf along with the silhouette.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt67: TemplateVariant = defineVariant(
  {
    id: 'lt67',
    category: 'lower-third',
    name: 'Matte Window',
    styleTag: 'editorial',
    description: 'A paper mat with a window of picture: the name floats inside, the caption prints below.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'TONIGHT’S GUEST' },
      { title: 'Name', sample: 'Vera Lindholm' },
      { title: 'Role', sample: 'Composer & Conductor' },
    ],
    // No mark slot. The mat is the identity here; a crest beside the caption would crowd the
    // one printed band the composition has.
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'fade', 'slide-up', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'playfair-display',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Matte Window',
    description:
      'The framed cut-out: a paper mat holding a window of the live picture, with the name set ' +
      'in a serif inside the window over a navy fillet rule, and the kicker and role printed on ' +
      'the mat below it like a gallery label. The first lower third that is a hole in a colour ' +
      'field rather than a plate on the picture.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Matte Window: the mat's window (fillet rule + the name over live picture), then the printed caption band. -->
    <div class="lower-third-box">
      <div class="lower-third-window">
        <div class="lower-third-accent"></div>
${maskLine('lower-third', o, 1, 'lower-third-name', '        ')}
      </div>
      <div class="lower-third-plate">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-kicker', '        '),
  maskLine('lower-third', o, 2, 'lower-third-role', '        '),
])}
      </div>
    </div>`,
    css: `/* The mat as a whole. It hugs its text like any strap (the wrap cap still binds), with a
   floor wide enough that a short name still leaves a MAT - a matte cut to two words reads as a
   sticker, not a window. Capacity-safe by construction: long text already exceeds any min-width
   (DESIGN_LANGUAGE §5, the strap floor). */
.lower-third-box {
  min-width: calc(560px * var(--scale));  /* the mat's floor - the window survives a short name */
  /* ONE soft shadow, as a FILTER rather than a box-shadow, and that choice is load-bearing
     twice: a box-shadow on this element would fill the window (the shadow paints behind the
     border box, and the window is transparent, so the hole would go grey); and the filter is
     also what separates the white name from a bright picture - it follows the rendered alpha,
     so the letters carry it too (the cinematic doctrine: separation on the BOX, never a
     text-shadow inside a line mask). */
  filter: drop-shadow(0 calc(10px * var(--scale)) calc(30px * var(--scale)) rgba(0, 0, 0, 0.45));
}

/* The window: paper on three sides, open at the foot where the caption band continues the mat.
   The interior is TRANSPARENT - the live picture is the backdrop, which is the whole design. */
.lower-third-window {
  position: relative;              /* anchors the fillet rule below */
  border: calc(20px * var(--scale)) solid var(--panel-bg);  /* the mat - a palette repaints this field */
  border-bottom: 0;                /* the caption band below closes the fourth side */
  padding: calc(30px * var(--scale)) calc(34px * var(--scale)) calc(26px * var(--scale));
  min-height: calc(96px * var(--scale));  /* the window stays a window even around one short row */
}

/* The fillet - the family's 2px printed rule, run right around the window's inside like the
   gold line inside a gallery mat. It is the accent's one dose, and it is a FRAME rather than a
   bar, so an entrance that scales it on X draws it across the window. */
.lower-third-accent {
  position: absolute;              /* drawn on the window, never a flex item in it */
  inset: calc(10px * var(--scale));  /* just inside the paper's edge */
  border: var(--accent-weight) solid var(--accent);  /* the family's printed rule, around the hole */
  pointer-events: none;            /* decoration only */
  transform-origin: left center;   /* the entrance draws the fillet from the leading edge */
  will-change: transform;          /* hints the exact property the entrance animates */
}

/* The name, floating on the live picture inside the window. LITERAL white, argued at the top of
   this file: the picture is not a palette surface, so no token can answer for it - white plus
   the box's drop-shadow is the one palette-independent answer, and it is the cinematic
   families' standing posture for exactly this situation. */
.lower-third-name {
  position: relative;              /* sits above the fillet where the two overlap */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* display scale - the mat presents one line */
  font-weight: var(--display-weight);  /* the family's heading weight */
  line-height: 1.2;                /* the tightest stack the line mask holds (lt64's floor) */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: #ffffff;                  /* on the PICTURE, not on paper - see the file head */
}

/* The caption band: the mat's foot, carrying the printed lines. It is the same paper as the
   window's border, so the two read as one mat with a hole in it. When the operator clears both
   caption lines the band stays as the mat's plain foot - a mat needs its fourth side, so an
   emptied band degrading to bare paper is the design holding its shape, not a defect. */
.lower-third-plate {
  padding: calc(12px * var(--scale)) calc(30px * var(--scale)) calc(18px * var(--scale));
  background: var(--panel-bg);     /* the same field - a palette repaints mat and band together */
}

/* The kicker - the printed strapline on the mat, in the family's tracked caps and its accent
   colour (the editorial kicker convention), at AA on the paper it sits on. */
.lower-third-kicker {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type here, at the floor */
  font-weight: 600;                /* small caps need weight at broadcast sizes */
  line-height: 1.3;                /* may wrap on a narrow mat */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* a kicker is set in caps whatever the operator types */
  color: var(--label-color);       /* the family's kicker colour - the accent, printed */
}

/* The role, printed under the kicker in the mat's quiet ink. */
.lower-third-role {
  margin-top: calc(4px * var(--scale));  /* the caption lines read as one label */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* above the secondary floor */
  font-weight: 500;                /* the reading weight */
  line-height: 1.25;               /* may wrap on a narrow mat */
  letter-spacing: 0.01em;          /* text this size needs no help */
  color: var(--text-dim);          /* dimmed ink on paper - AA on its own surface */
}

/* A cleared caption line leaves no gap - the mask stays for the presets, at zero height. */
.lower-third-kicker:empty,
.lower-third-role:empty {
  display: none;                   /* the operator can clear either caption line */
}`,
    hasAccent: true,
  }),
);

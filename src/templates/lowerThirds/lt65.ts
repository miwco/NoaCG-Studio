// lt65 "Edge Rail" - the side column: a narrow rail standing against the frame edge with the
// name set VERTICALLY down it, the way a spine, a banner or a festival credit is set.
//
// The absence this answers is docs/CATALOG_WORK_QUEUE.md §1. 99 of the 103 lower thirds render
// as `strap/thin`, and the reason is deeper than the shape: every one of them sets its type
// horizontally, so every one of them is as wide as its longest word. `writing-mode` is used ZERO
// times in the whole catalog. Turning the type is what makes a genuinely different silhouette
// available at all - a rail is narrow because the letters run down it, not because the name is
// short.
//
// THE ORIENTATION IS `vertical-lr`, and the choice is structural rather than stylistic:
//
//  - It puts the BLOCK axis left-to-right, so the lines stack outward from the frame edge in
//    reading order - the name against the edge, the role beside it. `vertical-rl` stacks them
//    the other way and would put the role nearest the edge.
//  - It needs NO rotation. The obvious way to set bottom-to-top type is a 180-degree rotate on
//    the line, and that would be a silent bug here: the animation presets drive `x`/`y` on these
//    same elements through GSAP, which writes the `transform` property - a CSS rotate on a line
//    is overwritten the moment the entrance runs, and the design would play upright and land
//    sideways. Writing mode is layout, so nothing in the timeline can undo it.
//
// IT IS DRAWN FOR A LEFT EDGE, and a right zone is a mirror it does not do. The block axis is a
// property of the writing mode, so at a right zone the rail still stacks name-then-role outward
// to the RIGHT, which puts the name furthest from the edge it is standing against. Fixing that
// means `vertical-rl`, which is a second design rather than a branch inside this one - the same
// answer the catalog already gives for mirrored straps (lt21 Right Rail beside lt01, lt42 Right
// Slam beside lt05). It renders correctly and stays inside the safe area at every zone; only the
// stacking order stops meaning what it means on the left.
//
// It HUGS, like every other lower third - but rotated, so what it hugs is the height: a longer
// name makes a longer rail, exactly as a longer name makes a wider strap. The one floor is a
// minimum height, because a rail is furniture standing at the edge of the picture and a short
// one reads as a chip that drifted.
//
// Sport, in Volt: chartreuse is the single thinnest accent bucket in the category (ONE design of
// 103), and the face is Big Shoulders - a condensed grotesk, which is what a narrow rail wants
// and which docs/CATALOG_VARIETY.md §3 item 4 records as bundled and barely used.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt65: TemplateVariant = defineVariant(
  {
    id: 'lt65',
    category: 'lower-third',
    name: 'Edge Rail',
    styleTag: 'sport',
    description: 'A narrow rail against the frame edge with the name set vertically down it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'RUBEN CASTELLANOS' },
      { title: 'Role', sample: 'Head Coach' },
      { title: 'Detail', sample: 'Matchday 14' },
    ],
    // No mark slot. A mark is drawn upright; the words here are not, so there is no "beside the
    // words" that reads as a lockup rather than as a sticker stuck to a rail.
    logo: 'none',
    animationPresets: ['blur-in', 'fade', 'slide-up', 'line-reveal', 'pop-spring', 'slide-left'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'big-shoulders',
    defaultZone: 'mid-left',
  },
  {
    name: 'Edge Rail',
    description:
      'The lower third as a side rail: a narrow slab standing against the edge of the frame ' +
      'under a short accent cap, with the name set vertically down it in condensed caps and the ' +
      'role running beside it. The only design in the catalog whose type is turned.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Edge Rail: an accent cap over a narrow rail whose lines are set vertically, name nearest the edge. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-name', '      '),
  maskLine('lower-third', o, 1, 'lower-third-role', '      '),
  maskLine('lower-third', o, 2, 'lower-third-detail', '      '),
])}
    </div>`,
    css: `/* THE RAIL. \`writing-mode\` turns the type and the layout together: the inline axis runs
   DOWN the frame (so a line's length becomes the rail's height) and the block axis runs left to
   right (so the lines stack outward from the edge). Everything inside inherits it - the masks and
   the spans the structure contract wraps each line in included. See the file head for why this is
   \`vertical-lr\` and why it is not a rotate. */
.lower-third-box {
  writing-mode: vertical-lr;       /* the whole point: the type runs down, the lines stack across */
  /* PIN THE LINES TO THE HEAD OF THE RAIL, and this one is not a preference either. The anchor
     zone emits a physical text-align on the root - left, center or right - and the lines inherit
     it. Turned, that physical value lands on the INLINE axis, which now runs DOWN the frame: a
     right zone reads as "align to the bottom" and a centre zone as "align to the middle". Both
     were measured on this rail and both are the same defect - the three columns stop sharing a
     top edge and hang at different heights (at mid-right: the name starting 144px lower than at
     mid-left, the role 361px lower, the detail 384px). The logical value start is what the
     turned axis actually means, and it holds the columns level in all nine zones. */
  text-align: start;               /* the columns share the rail's head, whatever the zone said */
  min-height: calc(560px * var(--scale));  /* a rail stands - a short name must not shrink it to a chip */
  padding: calc(34px * var(--scale)) calc(18px * var(--scale));  /* generous down the run, tight across it */
  background: var(--panel-bg);     /* the slab - the family's panel surface, so a palette repaints it */
  border-radius: var(--panel-radius);  /* the family's corner */
  box-shadow: var(--panel-shadow);  /* the sport family's hard offset */
}

/* WHY EVERY LINE BELOW SETS line-height: 1.2, AND WHY IT IS A FLOOR RATHER THAN A TASTE CHOICE.
   Turned, a line's line-height is no longer the gap between rows - it is the THICKNESS of the
   column, so line-height: 1 draws a column exactly one em wide. A Latin glyph run needs about
   1.1 em from ascender to descender, and the structure contract's mask carries overflow: hidden,
   so the difference is not a tight column: it is a clipped one. Measured at line-height: 1 on
   this rail, the name reported scrollWidth 44 inside a clientWidth of 40 and the role 26 inside
   23 - four and three pixels of letter cut off down the whole length of the rail. 1.2 is the
   face's own content box, and it is the number to keep if these sizes ever change. */

/* The accent cap, sitting ON the rail's head. It is a SIBLING of the box, in the root's ordinary
   horizontal flow, for two reasons: inside the turned box it would stack as another vertical
   column rather than as a cap, and out here \`scaleX\` still draws it across the way the presets
   that animate an accent expect to draw one. */
.lower-third-accent {
  width: calc(64px * var(--scale));  /* the rail's own width - the cap reads as its head, not as a rule */
  height: var(--accent-weight);    /* the sport family's heavy bar weight */
  margin-bottom: calc(10px * var(--scale));  /* a hair of air above the slab */
  background: var(--accent);       /* the one bold accent dose */
  box-shadow: var(--accent-glow);  /* the family's accent treatment */
  transform-origin: left center;   /* the entrance draws the cap from the leading edge */
  will-change: transform;          /* hints the exact property the entrance animates */
}

/* The name, running down the rail nearest the picture's edge. Condensed caps are what makes a
   long name a workable rail height rather than a rail that runs off the bottom of the frame. */
.lower-third-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* display scale for a narrow rail */
  font-weight: var(--display-weight);  /* the family's heading weight */
  line-height: 1.2;                /* THE COLUMN THICKNESS, and 1.2 is a floor rather than taste - see the note under the rail */
  letter-spacing: 0.06em;          /* turned caps need air between glyphs to stay countable */
  text-transform: uppercase;       /* a rail is set in caps whatever the operator types */
  color: var(--text-color);        /* primary text colour */
}

/* The role, in the column beside the name - further from the edge, one step quieter. */
.lower-third-role {
  margin-left: calc(14px * var(--scale));  /* the gap between the two turned columns */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* above the secondary floor */
  font-weight: 600;                /* small turned type needs weight */
  line-height: 1.2;                /* its own column thickness, at the same floor as the name */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* set in caps to pair the name */
  color: var(--text-dim);          /* secondary text colour */
}

/* The standing detail - a matchday, a round, a venue - in the outermost column, behind its own
   rule. In a turned layout a \`border-left\` is the rule BEFORE the column, which is the divider
   a horizontal design would have written as a border-top. */
.lower-third-detail {
  margin-left: calc(14px * var(--scale));  /* air before the rule */
  padding-left: calc(14px * var(--scale));  /* …and after it */
  border-left: 1px solid color-mix(in srgb, var(--text-color) 24%, transparent);  /* the rail's one divider */
  font-family: var(--font-label);  /* the design-owned label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* the smallest type here, above the floor */
  line-height: 1.2;                /* its own column thickness, at the same floor as the name */
  letter-spacing: var(--label-tracking);  /* tracked like the label it is */
  text-transform: uppercase;       /* set in caps to pair the rest */
  color: var(--label-color);       /* the family's label colour */
}

/* A cleared line takes its column - and the detail's rule - with it, so a name-only rail is a
   narrow rail rather than a wide one with empty columns in it. */
.lower-third-role:empty,
.lower-third-detail:empty {
  display: none;                   /* the operator can clear any line without leaving a gap */
}`,
    hasAccent: true,
  }),
);

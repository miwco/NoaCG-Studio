// lt66 "Top Corner" - the corner block: a standing slab block fused into the frame's top-right
// corner, the tag at its head, the name stacked large, the role signed off at the foot.
//
// The absence this answers is docs/CATALOG_WORK_QUEUE.md §1: the frame corner is bug territory -
// 36 corner bugs live there and not one lower third does. A NAME in the corner is a different
// offer from a strap along the bottom: it clears the whole lower band for play, scores and
// captions, which is why sport coverage tags its analysts high while the action runs below.
//
// TWO decisions carry it:
//
//  1. IT DECLARES A STAGE, the lt64 posture (src/templates/AGENTS.md: hugging is the category
//     default, not a prohibition, and the exception argues itself in its own source). A corner
//     block that hugged its text would grow LEFTWARD into the picture the moment a long name was
//     typed, and a block that stretches toward centre frame is a strap that happens to start
//     high - the blockness is the silhouette, so the width is the design's and the text wraps
//     inside it.
//  2. THE BLOCK IS NEARLY SQUARE, and the foot anchor is what makes the height honest: the tag
//     and the name hold the head, the role signs off at the foot, and the air between them is
//     deliberate composition rather than slack (lt64's foot-anchor pattern, same reasoning).
//
// Sport, in Royal: azure is one of the catalog's thin accent buckets (five designs of 105), so
// the shape and the hue both widen the shelf. No skew, though the family allows it: the block
// sits flush in a frame corner, and angling an edge against the two frame edges it touches
// reads as a misregistration rather than as energy - argued here so the next reader does not
// add the token back.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt66: TemplateVariant = defineVariant(
  {
    id: 'lt66',
    category: 'lower-third',
    name: 'Top Corner',
    styleTag: 'sport',
    description: 'A slab block standing in the top corner: tag, stacked name, role at the foot.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Tag', sample: 'ANALYSIS' },
      // A name that BREAKS. fitStagedText reserves each line the rows the design's own sample
      // occupies, so a one-row sample would tell the runtime this design wants a one-row name
      // and every longer one would be shrunk flat instead of stacked (lt64's rule). Oswald is
      // condensed, so the sample has to be genuinely long to break at this width.
      { title: 'Name', sample: 'Juho-Pekka Hiltunen' },
      { title: 'Role', sample: 'Head Coach' },
    ],
    // No mark slot. The lower-third rule puts a mark BESIDE the words; a 380px block in a frame
    // corner has no beside, and a mark above the tag is the placement the rule excludes.
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-right', 'mask-wipe', 'line-reveal', 'fade', 'slide-down'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'oswald',
    defaultZone: 'top-right',
  },
  {
    name: 'Top Corner',
    description:
      'The corner block: a hard slab standing in the top corner of the frame under a bold ' +
      'accent bar, with the tag at its head, the name stacked in condensed capitals and the ' +
      'role signed off at the foot. The first lower third that lives where the corner bugs do - ' +
      'it leaves the whole lower band clear for the action.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Top Corner: accent slab over a standing block; tag / stacked name / role at the foot. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-tag', '      '),
  maskLine('lower-third', o, 1, 'lower-third-name', '      '),
  maskLine('lower-third', o, 2, 'lower-third-role', '      '),
])}
    </div>`,
    css: `/* The slab. The width came from \`stageWidth\` below; the height floor is the other half of
   the block contract - a corner block is nearly square, and without the floor three short lines
   collapse it back into the thin strap silhouette the category already has 99 of. */
.lower-third-box {
  display: flex;                   /* so the role can be pushed to the foot */
  flex-direction: column;          /* the block stacks */
  justify-content: flex-start;     /* overrides the stage's slack rule, which is written for a ROW: on a column axis it would move the words instead of leaving air */
  align-items: flex-end;           /* right-anchored block: the lines rag toward the corner */
  min-height: calc(330px * var(--scale));  /* the standing height - what makes this a block and not a strap */
  padding: calc(26px * var(--scale)) calc(28px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);     /* the solid sport slab - a palette repaints this */
  border-radius: var(--panel-radius);  /* 0 - the family's hard corner */
  box-shadow: var(--panel-shadow); /* the family's hard offset drop */
  text-align: right;               /* align toward the anchor: a right-anchored graphic right-aligns */
}

/* The accent slab that opens the block, fused to its top edge and running its full width -
   the family's bold accent dose, sized by the family's own slab weight. A sibling of the box
   rather than a child so it cannot become a flex item in the column. */
.lower-third-accent {
  height: var(--accent-weight);    /* the sport slab weight */
  background: var(--accent);       /* the one accent dose */
  transform-origin: right center;  /* right-anchored: the entrance draws the slab from the corner */
  will-change: transform;          /* hints the exact property the entrance animates */
}

/* The tag - what this person is here to DO, set as tracked condensed caps at the head. */
.lower-third-tag {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* small, above the floor */
  font-weight: 600;                /* holds at broadcast sizes without shouting over the name */
  line-height: 1.3;                /* may wrap in a block this narrow */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a tag is set in caps whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The name - condensed display caps, drawn to wrap: at this width most full names break to two
   rows, and the stack is the composition rather than an overflow being tolerated. */
.lower-third-name {
  margin-top: calc(16px * var(--scale));  /* air under the tag */
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* display scale, sized to wrap in 380px */
  font-weight: var(--display-weight);  /* the family's heavy weight */
  /* 1.3 IS A MEASURED FLOOR, not taste - and it is Oswald's, not the category's. lt64's 1.2
     rule assumed a face whose ink stays inside a 1.2em line box; Oswald at weight 800 paints
     4.4px PAST one at this size (canvas actualBoundingBox over 'ÅÖĝjpqy...'), so at 1.2 the
     line mask cuts the ring off an Å - a real letter in the Nordic names this block will
     carry. 1.3 covers the measured ink with margin. The overflow sweep still reports a
     -mask:y row, because it measures the face's GLYPH box (1.48em for Oswald - mostly built-in
     line gap, not ink); that row is baselined as benign. */
  line-height: 1.3;                /* covers Oswald's measured ink at 800 - see above */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the sport voice: condensed caps */
  color: var(--text-color);        /* primary text colour */
}

/* THE FOOT ANCHOR, on the MASK rather than on the line: the flex items in this column are the
   masks the structure contract wraps each line in, and an auto margin on the line inside one is
   absorbed by the mask and moves nothing (lt64's measurement). Anchoring the last mask is what
   turns the height floor into composition - head and foot occupied, the air between deliberate. */
.lower-third-box > .lower-third-mask:last-child {
  margin-top: auto;                /* the role sits at the foot, whatever the name's height */
}

/* The role, signed off at the foot, one step quieter. */
.lower-third-role {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* above the secondary floor */
  font-weight: 500;                /* the reading weight */
  line-height: 1.3;                /* wraps in this width; covers Oswald's ink like the name above */
  letter-spacing: 0.02em;          /* condensed faces open slightly at reading sizes */
  color: var(--text-dim);          /* secondary text colour */
}`,
    hasAccent: true,
    // THE STAGE. Lower thirds hug their text by default; this one cannot - see the file head.
    // 380px at 1080p is the width the block was drawn at, and it is the width it keeps.
    stageWidth: 380,
  }),
);

// lt64 "Portrait Column" - the tall panel: a narrow portrait block standing at one side of the
// frame with the name stacked down it, rather than a horizontal strap lying across the bottom.
//
// The absence this answers is docs/CATALOG_WORK_QUEUE.md §1: 99 of 103 lower thirds render as
// `strap/thin`, and the category assumes a HORIZONTAL strap so completely that nothing in it is
// taller than it is wide. This is the other orientation, and it is the shape a talk format wants
// when the subject sits to one side and the other side is dead air.
//
// IT IS ALSO INTENDED for vertical and square crops, where a strap spanning the width of a 9:16
// frame takes a far larger share of the picture than the same strap does at 16:9. Read that as
// the design's INTENT, not as a demonstrated result - see the 9:16 note at the foot of this
// header for exactly how far it has been checked.
//
// TWO decisions carry it:
//
//  1. IT DECLARES A STAGE, which lower thirds normally do not (src/templates/AGENTS.md: the
//     category HUGS its text, because a strap cut to the guest's name is the broadcast
//     convention). A portrait block cannot hug: the moment a long name is typed, a hugging box
//     grows sideways and the panel stops being portrait - the silhouette would be a property of
//     the operator's text rather than of the design. So the width is the design's (`stageWidth`),
//     the text wraps inside it, and `e2e/catalog/footprint-stability.spec.ts` holds it there.
//     The height is floored the same way for the same reason: a one-line name must still stand.
//  2. THE NAME IS MEANT TO WRAP. At this column width most full names break across two or three
//     rows, and that stack IS the composition - it is why the line-height is set tight and the
//     tracking pulled in. A name that happens to fit on one row still reads, but the design is
//     drawn for the wrapped case rather than tolerating it.
//
// Glass, in Orchid: violet is one of the catalog's thinnest accent buckets (four designs of 103),
// so the shape and the hue both widen the shelf. The reading surface is the family's `--panel-bg`
// token, so a palette repaints it (docs/CATALOG_VARIETY.md §5).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt64: TemplateVariant = defineVariant(
  {
    id: 'lt64',
    category: 'lower-third',
    name: 'Portrait Column',
    styleTag: 'glass',
    description: 'A tall frosted column standing at one side, the name stacked down it.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Segment', sample: 'IN CONVERSATION' },
      // A name that BREAKS. The sample is not decoration here: fitStagedText reserves each line
      // the number of rows the design's own sample occupies, so a one-row sample would tell the
      // runtime this design wants a one-row name and every longer one would be shrunk flat
      // instead of stacked. The stack is the design, so the sample stacks.
      { title: 'Name', sample: 'Amara Okonkwo' },
      { title: 'Role', sample: 'Chief Curator' },
      { title: 'Detail', sample: 'Museum of Modern Art' },
    ],
    // No mark slot. The lower-third rule puts a mark BESIDE the words; this column is 380px wide
    // and has no room beside anything. A mark above the stack is the placement the rule excludes.
    logo: 'none',
    animationPresets: ['slide-left', 'blur-in', 'line-reveal', 'fade', 'pop-spring', 'slide-right'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'sora',
    defaultZone: 'mid-left',
  },
  {
    name: 'Portrait Column',
    description:
      'The lower third turned upright: a narrow frosted column standing at one side of the ' +
      'frame, opened by a short accent bar, with the segment label at the top, the name stacked ' +
      'large down the middle and a detail line signed off at the foot. Drawn for vertical and ' +
      'square crops and for one-sided studio framings.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Portrait Column: accent bar / segment / stacked name / role / foot detail, in one upright column. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-segment', '      '),
  maskLine('lower-third', o, 1, 'lower-third-name', '      '),
  maskLine('lower-third', o, 2, 'lower-third-role', '      '),
  maskLine('lower-third', o, 3, 'lower-third-detail', '      '),
])}
    </div>`,
    css: `/* The column. The width came from \`stageWidth\` above; this is the other half of the
   portrait contract - a HEIGHT FLOOR, so a short name still leaves a standing block rather
   than collapsing the design back into a chip. */
.lower-third-box {
  display: flex;                   /* so the foot detail can be pushed to the bottom */
  flex-direction: column;          /* the column's own axis */
  justify-content: flex-start;     /* overrides the stage's slack rule, which is written for a ROW: on a column axis it would move the words up and down instead of leaving the side room */
  min-height: calc(620px * var(--scale));  /* the standing height - what makes this a panel and not a chip */
  padding: calc(30px * var(--scale)) calc(28px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* the glass tint - a palette repaints this */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift, then the glass edge */
}

/* The accent bar that opens the column: short and horizontal, so the presets that draw an accent
   across (line-reveal scales it on X) draw it the way it is meant to be read. */
.lower-third-accent {
  width: calc(56px * var(--scale));  /* a cap rule, not a full-width edge */
  height: var(--accent-weight);    /* the family's bar weight */
  margin-bottom: calc(26px * var(--scale));  /* clear air before the label */
  background: var(--accent);       /* the one bold accent dose */
  box-shadow: var(--accent-glow);  /* the family's accent treatment */
  transform-origin: left center;   /* the entrance draws the bar from the leading edge */
  will-change: transform;          /* hints the exact property the entrance animates */
}

/* The segment label - what this conversation IS, set as small tracked caps at the head. */
.lower-third-segment {
  font-family: var(--font-label);  /* the design-owned label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type here, above the floor */
  font-weight: 600;                /* small caps need weight to hold at broadcast sizes */
  line-height: 1.3;                /* may wrap in a column this narrow */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a segment label is set in caps whatever the operator types */
  color: var(--accent);            /* the accent's second, small appearance */
}

/* The name. This is the line the design exists for: at this column width most names break to two
   or three rows, and that stack is the composition rather than an overflow being tolerated. */
.lower-third-name {
  margin-top: calc(20px * var(--scale));  /* air under the label */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* display scale, sized to wrap in 380px */
  font-weight: var(--display-weight);  /* the family's heading weight */
  /* 1.2 IS A FLOOR HERE, NOT A TASTE CHOICE - and the reason changed on 2026-08-23, so the number
     stayed while its justification did not. It used to be the STAGE FIT: that runtime reserved a
     line box and tested the excess against a content box, so any line-height under the face's own
     content ratio overflowed at the design's own sample and the design was shrunk against itself
     (measured then: 1.02 shipped 41.9px, 1.1 43.4px, 1.15 44.7px, 1.2 the declared 46px). That is
     fixed - shared/stageFit.ts now measures both in the same box - and this line ships 46px at any
     leading.
     What still holds the floor is the LINE MASK. Every line here sits in a .lower-third-mask with
     overflow: hidden sized to the line box, and Sora's glyph box is 1.2em whatever line-height
     says, so a tighter value pushes the letters out of the mask rather than out of the panel.
     Measured at 1.05: the mask clips the name by 4px on the y axis, and
     scripts/overflow-sweep.mjs reports it as a regression. Tightening this still does not tighten
     the stack - it cuts the tops and tails off the name. */
  line-height: 1.2;                /* the face's own content box: the tightest stack the mask holds */
  letter-spacing: -0.02em;         /* stacked display type closes up */
  color: var(--text-color);        /* primary text colour */
}

/* The role, under the name and one step quieter. */
.lower-third-role {
  margin-top: calc(14px * var(--scale));  /* clear of the name's descenders */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* above the secondary floor */
  font-weight: 500;                /* the reading weight */
  line-height: 1.25;               /* wraps in this width */
  letter-spacing: 0.005em;         /* text this size needs no help */
  color: var(--text-dim);          /* secondary text colour */
}

/* THE FOOT ANCHOR, and it has to be on the MASK rather than on the line. The flex items in this
   column are the masks the structure contract wraps each line in; an auto margin on the line
   inside one is absorbed by the mask and moves nothing, which is exactly what the first draft of
   this design did - the foot line sat directly under the role with 300px of empty glass beneath
   it. Anchoring the last mask is what turns the height floor into a composition: the label and
   the name at the head, the standing detail signed off at the foot, and the air between them
   deliberate. */
.lower-third-box > .lower-third-mask:last-child {
  margin-top: auto;                /* the last line sits at the foot, whatever the name's height */
}

/* The foot detail - the institution, the location, the programme. It is set as a BLOCK, unlike
   the inline-block the structure contract gives every line, so its rule spans the column instead
   of stopping at the end of the words; and the rule is on the line rather than on the mask so
   that clearing the line clears the rule with it, on every engine (see lt63 for the :has() this
   avoids). The block override has to be written through the mask: the contract's own
   .lower-third-mask > span rule carries a class AND a type, so a bare class here loses the
   cascade to it and the line silently stays inline-block. */
.lower-third-mask > .lower-third-detail {
  display: block;                  /* so the rule below spans the column, not just the words */
}

.lower-third-detail {
  padding-top: calc(22px * var(--scale));  /* air above its own rule */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent);  /* the column's one divider */
  font-family: var(--font-label);  /* the design-owned label face, pairing the head */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type here - 20px IS the catalog's floor, not a margin above it */
  line-height: 1.35;               /* may wrap to two rows */
  letter-spacing: var(--label-tracking);  /* tracked like the label it answers */
  text-transform: uppercase;       /* set in caps to pair the head */
  color: var(--label-color);       /* the family's label colour */
}

/* The foot rule belongs to the detail line, so clearing the line clears its rule too - and the
   auto margin above keeps the remaining stack at the top instead of floating it. */
.lower-third-detail:empty {
  display: none;                   /* the operator can clear the line without leaving a hairline */
}`,
    hasAccent: true,
    // THE STAGE. Lower thirds hug their text by default; this one cannot - see the file head.
    // 380px at 1080p is the width the column was drawn at, and it is the width it keeps.
    stageWidth: 380,
  }),
);

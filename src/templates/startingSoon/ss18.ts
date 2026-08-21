// ss18 "Paper Programme" - the holding screen as a printed sheet lying on a desk: a masthead
// rule, the programme title in a display serif, and the countdown in its own ruled side column.
//
// Every one of the seventeen holding screens before it was drawn for a dark programme surface -
// which is the catalog-wide fact docs/CATALOG_VARIETY.md §3 absence 5 records, and §5.3 measures
// the cost of: a light PALETTE offered to a design with no reading surface to repaint cannot be
// honoured. So this screen repaints the surface itself. The category's programme background is
// category-owned CSS, and a design's own stylesheet is emitted after it, which is the seam used
// here: the full frame becomes the desk, the box becomes the SHEET, and the technical grid
// becomes the column rules of a printed page.
//
// Three decisions make it a page rather than a card, and cr13 makes the same three, so the two
// read as one printed package:
//   - there is no `text-transform` anywhere on it. A programme sets its labels in roman and lets
//     tracking do the work, and 88.5% of the catalog shouting in caps (absence 3) is what makes
//     that worth spending a design on.
//   - there is ONE font weight on the whole page. Hierarchy is size and tracking, the way a
//     single-weight text serif carries a printed page; the catalog's own mode is two or three
//     weights, and a serif that has to shout to be read is the wrong serif.
//   - the countdown is a SIDE column across a folio rule, not a line under the title. That is
//     where a printed programme puts the time, and it is why the page reads as two columns.
//
// The clock is the reason the pairing in the numerals contract exists. Playfair Display has no
// tabular figures (measured - docs/DESIGN_LANGUAGE.md §1), so `--font-numeric` resolves to its
// bundled sibling Source Serif 4 and the countdown stays a SERIF number rather than dropping to
// a monospaced code face on a printed page. That costs one more woff2 in the package and is the
// whole difference between a paper programme and a paper programme with a terminal on it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { NUMERIC_FIGURES } from '../shared/numerals';
import { defineStartingSoonVariant } from './shared';

export const ss18: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss18',
    category: 'starting-soon',
    name: 'Paper Programme',
    styleTag: 'editorial',
    description:
      'A holding screen printed on paper: a masthead rule, a serif title, and the countdown in a ruled side column.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Programme', sample: 'The Evening Review' },
      { title: 'Note', sample: 'Tonight’s edition begins shortly' },
      { title: 'Countdown label', sample: 'On air in' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'playfair-display',
    defaultZone: 'mid-center',
  },
  {
    name: 'Paper Programme',
    description:
      'The printed programme as a holding screen: a paper sheet with a print register lying on ' +
      'a desk, a masthead rule over a display-serif title, one line of note, and the countdown ' +
      'set in serif figures in its own ruled column. Counts to a wall-clock start time when ' +
      'one is given.',
    uicolor: '4',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1180,
    lineCount: 3,
    clock: 'start-time',
    clockMinutes: '10',
    lineDefaults: [
      { title: 'Programme', sample: 'The Evening Review' },
      { title: 'Note', sample: 'Tonight’s edition begins shortly' },
      // The countdown label is a FIELD, not a baked-in word: house style and language both
      // change it, and neither should need the code editor (the field policy, root AGENTS.md).
      { title: 'Countdown label', sample: 'On air in' },
    ],
    html: `    <!-- Paper Programme: the sheet, with the page column and the countdown column on it. -->
    <div class="starting-soon-box">
      <!-- The page column: the masthead rule, the title, the note. -->
      <div class="starting-soon-page">
        <!-- The masthead rule, and the one thing that moves while the hold is on air. -->
        <div class="starting-soon-rule starting-soon-pulse"></div>
        <!-- The programme title (f0) - the page's one large line. -->
        <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'The Evening Review'}</span></div>
        <!-- The note (f1) - one quiet sentence under the title. -->
        <div class="starting-soon-mask"><span id="f1" class="starting-soon-note">${o.lines[1]?.sample || 'Tonight’s edition begins shortly'}</span></div>
      </div>
      <!-- The countdown column, across the folio rule: the label, then the figures. -->
      <div class="starting-soon-wait">
        <span id="f2" class="starting-soon-label">${o.lines[2]?.sample || 'On air in'}</span>
        <span class="starting-soon-clock">10:00</span>
      </div>
    </div>`,
    css: `/* ── The desk. These three rules repaint the category's own programme background, which
   is authored for a dark screen; a design's CSS is emitted after it. ── */

/* The surface the sheet lies on - the palette's paper, darkened, so the sheet reads as a sheet.
   The opaque base is a literal for the same reason the category's #080b10 is one: it guarantees
   the output is never see-through, and the palette's own tone is washed over it. */
.starting-soon-background {
  background-color: #d6d3ca;  /* the opaque desk base - output is never transparent */
  background-image: linear-gradient(color-mix(in srgb, var(--text-color) 16%, var(--panel-bg)), color-mix(in srgb, var(--text-color) 16%, var(--panel-bg)));  /* the desk: the palette's paper darkened enough that the sheet on it reads as a sheet */
}

/* The light pool becomes a wash of ink rather than a glow - paper does not emit light. */
.starting-soon-ambient {
  background: radial-gradient(circle at 86% 18%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%);
  opacity: 0.55;  /* very restrained: the type is what the viewer is meant to look at */
}

/* The technical grid becomes the column rules of a printed page: verticals only, in ink. */
.starting-soon-grid {
  background-image: linear-gradient(90deg, color-mix(in srgb, var(--text-color) 8%, transparent) 1px, transparent 1px);
  background-size: calc(150px * var(--scale)) 100%;  /* a printed column measure, not a technical mesh */
  opacity: 0.5;  /* the rules are structure the eye barely registers */
}

/* ── The sheet ── */

/* The printed page itself, laid out as two columns: the page proper, and the countdown across
   a folio rule. This is what a programme does with a time - it does not put it in the headline. */
.starting-soon-box {
  display: grid;  /* the page and its countdown column sit side by side */
  grid-template-columns: minmax(0, 1fr) auto;  /* the page takes the measure, the countdown hugs its figures */
  align-items: stretch;  /* so the folio rule runs the full height of the page beside it */
  text-align: left;  /* a printed page reads from one edge; the centred zone positions the SHEET, not the type */
  column-gap: calc(46px * var(--scale));  /* the gutter between the page and the folio rule */
  /* A sheet is a FIXED size - that is what a sheet is. Sizing it to its content would make the
     page a different shape for every programme name, and the measure the title is set against
     is the thing that stops a long name breaking into three rows. */
  width: calc(1180px * var(--scale));  /* the printed sheet's own measure */
  max-width: calc(1180px * var(--scale));  /* overrides the category cap: this page sets its own size */
  padding: calc(56px * var(--scale)) calc(60px * var(--scale));  /* the sheet's printed margins */
  background-color: var(--panel-bg);  /* the palette's paper - the sheet, brighter than the desk */
  background-image: repeating-linear-gradient(0deg, color-mix(in srgb, var(--text-color) 4%, transparent) 0 1px, transparent 1px calc(4px * var(--scale)));  /* the print register: how stock takes ink */
  border-radius: var(--panel-radius);  /* the family's corner language (editorial: square) */
  clip-path: polygon(0 0, calc(100% - 64px * var(--scale)) 0, 100% calc(64px * var(--scale)), 100% 100%, 0 100%);  /* the trimmed corner a printed proof carries - the pack's paper signature (card80, cr13) */
  filter: drop-shadow(0 calc(12px * var(--scale)) calc(36px * var(--scale)) rgba(0, 0, 0, 0.28));  /* the sheet lifts off the desk */
}
/* The shadow is a FILTER rather than the family's box-shadow token, and that is the trimmed
   corner's price: clip-path clips a box's paint, shadow included, so var(--panel-shadow)
   would simply never be drawn. drop-shadow follows the clipped silhouette instead, which is
   also the only way the cut corner casts a shadow of its own. Its value is the editorial
   family's own (DESIGN_LANGUAGE §8) restated in filter syntax. */

/* The page column. min-width:0 is load-bearing - a grid item refuses to shrink by default,
   which is exactly what pushes a long programme title past the sheet's edge. */
.starting-soon-page {
  min-width: 0;  /* lets a long title wrap instead of widening the sheet */
  max-width: calc(760px * var(--scale));  /* the page's own reading measure */
}

/* The masthead rule - drawn first, and the only thing the hold loop breathes. */
.starting-soon-rule {
  width: calc(300px * var(--scale));  /* a masthead rule, not a divider across the frame */
  height: var(--accent-weight);  /* the family's printed-rule weight */
  margin-bottom: calc(26px * var(--scale));  /* clear air under the rule before the title */
  background: var(--accent);  /* the one accent dose above the fold */
  will-change: transform;  /* hint the browser: the breath scales this */
}

/* The programme title - the display serif, set rather than announced. */
.starting-soon-title {
  /* The sheet is a FIXED width, so its lines have to be told to stay inside it. An
     inline-block takes its max-content width unless something caps it, and the category's
     overflow-wrap: break-word only breaks once the box is constrained - so without this the
     title simply runs out over the countdown column instead of wrapping. Every other holding
     screen escapes it by being width: fit-content, where the box grows to the words. */
  display: inline-block;  /* so the cap below applies to the line itself */
  max-width: 100%;  /* the page column's own measure, whatever the sheet has settled at */
  font-size: calc(112px * var(--scale) * var(--type-scale));  /* full-frame display scale */
  font-weight: 400;  /* THE page weight - see the note under the sheet rule: this design has one */
  line-height: 1.02;  /* big serif type sits tight */
  color: var(--text-color);  /* the ink */
}

/* The note - one sentence at a comfortable reading measure. */
.starting-soon-note {
  display: inline-block;  /* so the measure below applies to the line itself */
  max-width: min(calc(620px * var(--scale)), 100%);  /* a readable row length, never wider than the sheet */
  margin-top: calc(22px * var(--scale));  /* separates the note from the title above it */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* reading size, comfortably above the floor */
  font-weight: 400;  /* the page weight, unchanged: hierarchy here is size, not weight */
  line-height: 1.4;  /* prose leading - this line is read, not scanned */
  color: var(--text-dim);  /* secondary ink */
}

/* The countdown column, across the folio rule. The rule stretches to the page's full height
   while the figures settle on its bottom line, the way a folio sits at the foot of a page. */
.starting-soon-wait {
  display: flex;  /* so the words settle low while the RULE stretches */
  flex-direction: column;  /* the label over the figures */
  justify-content: flex-end;  /* they sit at the foot of the column */
  padding-left: calc(46px * var(--scale));  /* air between the rule and the words */
  border-left: 1px solid color-mix(in srgb, var(--text-color) 26%, transparent);  /* the folio rule */
}

/* The label that gives the number its meaning. No text-transform anywhere on this design: a
   programme sets a label in roman and lets the tracking do the work. */
.starting-soon-label {
  display: block;  /* the label sits on its own line above the figures */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* label scale, above the broadcast floor */
  font-weight: 400;  /* the page weight - the tracking alone is what makes this a label */
  letter-spacing: var(--label-tracking);  /* the family's masthead tracking */
  color: var(--label-color);  /* the family's label colour - editorial accents its kickers */
}

/* The countdown. It repaints every second, so it carries BOTH halves of the numerals contract -
   and on this design that resolves to Source Serif 4, so a serif page keeps a serif number. */
.starting-soon-clock {
  ${NUMERIC_FIGURES}
  display: block;  /* the figures take their own line under the label */
  margin-top: calc(12px * var(--scale));  /* the label belongs to the number under it */
  font-size: calc(84px * var(--scale) * var(--type-scale));  /* the page's second voice */
  font-weight: 400;  /* the page weight - the figures are large, not heavy */
  line-height: 1;  /* one tight row of digits */
  color: var(--text-color);  /* the ink - the number is content, not a caption */
}

/* The moment it begins - the figures take the accent, and only then. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);  /* 0:00 lights up in the accent colour */
}`,
  }),
);

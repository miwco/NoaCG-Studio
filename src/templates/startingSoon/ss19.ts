// ss19 "Poster Countdown" - the break card where the clock is not a detail on the screen, it IS
// the screen: the figures run at 280px, knocked out of a solid accent block, with the label, the
// show and its detail set in a narrow column beside them.
//
// Two absences meet here (docs/CATALOG_VARIETY.md §3): condensed-poster typography, which three
// bundled faces exist to do and four designs of 459 use (absence 4), and type as the composition
// (absence 8). Every other holding screen in the category leads with words and puts the number
// underneath - ss10 deliberately makes it small - so a design where the count is the composition
// is a genuinely different graphic rather than a re-skin of one.
//
// The accent SLAB is the deliberate rule-break DESIGN_LANGUAGE §2 allows the sport family: the
// accent is normally a small sharp dose, and here it is the ground the figures are cut out of.
// That is also why the digits are painted with `--accent-ink` rather than the text colour - the
// family token exists precisely for type sitting on an accent fill - and why the block carries
// the family's own -8 degree lean with the figures counter-skewed back upright.
//
// The numerals contract is what makes any of it possible. Big Shoulders has no tabular figures
// (measured - docs/DESIGN_LANGUAGE.md §1), and at 280px a proportional "1" against a "0" would
// move the whole layout on every tick; `--font-numeric` resolves to its bundled pairing Saira,
// so the figures stay condensed AND stay put. The mono fallback would have been visible from the
// back of a room.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { NUMERIC_FIGURES } from '../shared/numerals';
import { defineStartingSoonVariant } from './shared';

export const ss19: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss19',
    category: 'starting-soon',
    name: 'Poster Countdown',
    styleTag: 'sport',
    description:
      'The break card as a poster: the countdown knocked out of a leaning accent slab, with the show billed beside it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Label', sample: 'BACK IN' },
      { title: 'Show', sample: 'THE MIDNIGHT SET' },
      { title: 'Detail', sample: 'Studio B · live at 23:00' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'big-shoulders',
    // Left-anchored, and the composition follows it: a poster lockup reads from one edge, and
    // DESIGN_LANGUAGE §1's "align toward the anchor" is what makes that honest rather than a
    // centred block sitting off-centre.
    defaultZone: 'mid-left',
  },
  {
    name: 'Poster Countdown',
    description:
      'A break card built around the clock: the countdown set at poster scale in condensed ' +
      'figures, knocked out of a solid accent block leaning on the sport family’s own angle, ' +
      'and the label, show and detail billed in a column beside it.',
    uicolor: '5',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1530,
    lineCount: 3,
    clock: 'minutes',
    clockMinutes: '10',
    lineDefaults: [
      // All three are FIELDS: "BACK IN" is house style in one control room and something else
      // in the next, and the field policy (root AGENTS.md) is that a baked-in word is a word
      // nobody downstream can change.
      { title: 'Label', sample: 'BACK IN' },
      { title: 'Show', sample: 'THE MIDNIGHT SET' },
      { title: 'Detail', sample: 'Studio B · live at 23:00' },
    ],
    html: `    <!-- Poster Countdown: the clock slab, then the billing column beside it. -->
    <div class="starting-soon-box">
      <!-- The accent block. The figures are knocked out of it; the bar under it breathes. -->
      <div class="starting-soon-slab">
        <div class="starting-soon-clock">10:00</div>
      </div>
      <!-- The billing column: label over the show, with the detail under a heavy rule. -->
      <div class="starting-soon-bill">
        <div class="starting-soon-mask"><span id="f0" class="starting-soon-label">${o.lines[0]?.sample || 'BACK IN'}</span></div>
        <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'THE MIDNIGHT SET'}</span></div>
        <!-- The heavy rule, and the one thing that breathes while the hold is on air. -->
        <div class="starting-soon-bar starting-soon-pulse"></div>
        <div class="starting-soon-mask"><span id="f2" class="starting-soon-detail">${o.lines[2]?.sample || 'Studio B · live at 23:00'}</span></div>
      </div>
    </div>`,
    css: `/* The poster lockup: the clock block and the billing column, side by side. */
.starting-soon-box {
  display: grid;  /* two columns, not a stack: the figures and the words share a line */
  grid-template-columns: auto minmax(0, 1fr);  /* the slab hugs its digits; the billing takes the rest */
  align-items: center;  /* the block and the words share one centre line */
  column-gap: calc(48px * var(--scale));  /* the gutter between the block and the bill */
  max-width: calc(1560px * var(--scale));  /* the poster measure, inside the safe area */
}

/* The accent block the figures are cut out of - the family's licensed bold slab, leaning on
   the sport family's own angle (DESIGN_LANGUAGE §8: skewX(-8deg), counter-skewed text). */
.starting-soon-slab {
  padding: calc(26px * var(--scale)) calc(48px * var(--scale));  /* the block's own margins around the figures */
  background: var(--accent);  /* the deliberate rule-break: the accent is the ground here */
  transform: skewX(-8deg);  /* the sport family's exact lean - the block leans, the digits do not */
  box-shadow: var(--panel-shadow);  /* the family's hard offset - a sticker slab, not a glow */
}

/* The countdown at poster scale. It repaints every second, so it carries BOTH halves of the
   numerals contract - which resolves to Saira here, so the figures stay condensed AND even. */
.starting-soon-clock {
  ${NUMERIC_FIGURES}
  transform: skewX(8deg);  /* the counter-skew: the block leans, the figures stand upright */
  font-size: calc(280px * var(--scale) * var(--type-scale));  /* poster scale - the count IS the composition */
  font-weight: 700;  /* heavy, the way a poster sets a figure */
  line-height: 0.86;  /* the digits sit tight against their own cap height */
  letter-spacing: -0.02em;  /* very big figures close up */
  color: var(--accent-ink);  /* the family's dark ink for type sitting ON an accent fill */
}

/* The billing column. min-width:0 is load-bearing - a grid item refuses to shrink by default,
   which is exactly what pushes a long show name off the frame. */
.starting-soon-bill {
  min-width: 0;  /* lets a long show name wrap instead of widening the lockup */
}

/* The label - the smallest thing here, and the widest tracked. */
.starting-soon-label {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* label scale, well above the broadcast floor */
  font-weight: 600;  /* firm enough for small caps to carry */
  line-height: 1.2;  /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's tracked-caps value */
  text-transform: uppercase;  /* reads as a label whatever the operator types */
  color: var(--label-color);  /* the family's label colour */
}

/* The show - the bill's headline, in the condensed voice the whole card is set in. */
.starting-soon-show {
  margin-top: calc(10px * var(--scale));  /* the label belongs to the name under it */
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* readable from the back of a room */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 0.98;  /* condensed display type stacks tight when it wraps */
  letter-spacing: -0.01em;  /* big type closes up slightly */
  text-transform: uppercase;  /* the card is set in caps throughout */
  color: var(--text-color);  /* primary text colour */
}

/* The heavy rule between the show and its detail. */
.starting-soon-bar {
  width: calc(220px * var(--scale));  /* a short heavy bar - a poster rule, not a divider */
  height: var(--accent-weight);  /* the sport family's heavy bar weight */
  margin: calc(24px * var(--scale)) 0 calc(20px * var(--scale));  /* even air above and below */
  background: var(--accent);  /* the accent's second appearance, at poster weight */
  will-change: transform;  /* hint the browser: the breath scales this */
}

/* The detail - the venue, the time, the billing note. */
.starting-soon-detail {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* secondary voice, above the broadcast floor */
  font-weight: 500;  /* medium keeps small condensed type legible */
  line-height: 1.3;  /* may wrap to a second row */
  letter-spacing: 0.06em;  /* small condensed type needs air */
  color: var(--text-dim);  /* secondary text colour */
}

/* An empty detail takes no space, so a show-only bill is a shorter column. */
.starting-soon-detail:empty {
  display: none;  /* the operator can clear the line without leaving a hole */
}

/* Time up - the block inverts, which reads from across a room in a way a colour change does
   not: the slab goes to ink and the figures come up in the accent. */
.starting-soon-done .starting-soon-slab {
  background: var(--accent-ink);  /* the ground and the figures trade places */
}
.starting-soon-done .starting-soon-clock {
  color: var(--accent);  /* 0:00 lights up in the accent colour */
}`,
  }),
);

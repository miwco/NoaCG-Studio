// ig38 "Results Rail" - the count-night SIDE DASHBOARD: a full-height column standing against
// one edge of the frame with a row per district, while the picture keeps the other two thirds.
// House family, sibling of lt11 "House Strap" and ig08 "House Schedule".
//
// WHY A RAIL AND NOT ANOTHER BOARD. ig34-ig36 are the election pack's centre-frame boards -
// shown full, read, cleared. This is the one that stays UP: an anchor talks over a map or a
// studio wall for twenty minutes while the shares move underneath, so the graphic has to live
// where a presenter is not standing and keep a stable row order while it updates. That makes it
// the catalog's first side-panel infographic, which is a placement no other design here has.
//
// The rows are the canonical repeating field ("District | share" per line) rendered by the same
// seat-board runtime ig34 uses, so a district can be added, removed or reordered by typing -
// and the leading row takes the accent by itself, which on a count night changes several times.
// The bar behind each row is drawn as a WASH across the row rather than as a track beside the
// label, because in a column this narrow a bar and a figure cannot both have the width they
// need: the row itself becomes the bar, and the figure stays pinned at the rail's edge.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { seatBarsRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

// One line per district, in the order the desk wants them read. The runtime keeps that order.
const DISTRICTS = [
  'North District | 52',
  'Central District | 47',
  'Coastal District | 61',
  'Lakes District | 38',
].join('\n');

export const ig38: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig38',
    category: 'infographic',
    name: 'Results Rail',
    styleTag: 'noacg',
    description: 'A full-height side dashboard: one district row per line, each with its share.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Districts', sample: DISTRICTS },
      { title: 'Kicker', sample: 'ANALYSIS' },
      { title: 'Heading', sample: 'Election Night Dashboard' },
      { title: 'Standfirst', sample: 'Live updates and regional swings' },
      { title: 'Unit', sample: '% OF VOTE COUNTED' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-right',
  },
  {
    name: 'Results Rail',
    description:
      'The count-night side dashboard: a kicker chip, a two-line heading, a standfirst, and ' +
      'then one row per district - the name on the left, the share at the rail\'s edge, and the ' +
      'row itself washed to how far that share has run. Type one "District | share" line per ' +
      'row; add, remove or reorder them freely. The leading row takes the accent on its own, ' +
      'so the board follows the count without anyone marking it up.',
    uicolor: '4',
  },
  (o) => {
    const districts = o.lines[0]?.sample || DISTRICTS;
    const kicker = o.lines[1]?.sample || 'ANALYSIS';
    const heading = o.lines[2]?.sample || 'Election Night Dashboard';
    const standfirst = o.lines[3]?.sample || 'Live updates and regional swings';
    const unit = o.lines[4]?.sample || '% OF VOTE COUNTED';

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 560,
      html: `    <!-- Results Rail: [kicker] / [heading] / [standfirst] / one washed row per district. -->
    <div class="infographic-box">
      <!-- The kicker chip - what this rail IS, in the house label face. -->
      <div class="infographic-kicker" id="f1">${kicker}</div>
      <!-- The heading - the count's own name, wrapping to two lines at rail width. -->
      <div class="infographic-heading" id="f2">${heading}</div>
      <!-- The accent rule under the heading - the house bar, turned horizontal. -->
      <div class="infographic-accent"></div>
      <!-- The standfirst - one quiet line saying what the rows are. -->
      <div class="infographic-standfirst" id="f3">${standfirst}</div>
      <!-- The rows - rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
      <!-- The unit line - what the figures in the rows ARE. A FIELD, not furniture: the same
           rail carries a vote share, a turnout or a count of returned boxes, in the language
           the channel broadcasts in - and stating it once beats repeating a mark per row. -->
      <div class="infographic-unit" id="f4">${unit}</div>
    </div>
    <!-- Hidden districts source - SPX writes field f0 here; JS renders it.
         One "District | share" per line. -->
    <div id="f0" class="noacg-data-source">${districts}</div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The rail - a fixed-width column standing at the frame's edge. Its width is stated rather than
   hugged: every row's figure has to land on one right edge, and a rail that resized itself as
   districts came in would move the whole column mid-count. */
.infographic-box {
  width: calc(560px * var(--scale));  /* the rail's stated width - the figures share one edge */
  box-sizing: border-box;          /* the padding stays inside that width */
  display: flex;                   /* head, rule, standfirst and rows… */
  flex-direction: column;          /* …down the column */
  padding: calc(30px * var(--scale)) calc(28px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);     /* the house void panel */
  border-radius: var(--panel-radius);  /* the family's radius (0 on a house panel) */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the family's lift and inner edge */
  backdrop-filter: var(--panel-blur);  /* the family's blur, safe when a theme sets none */
  text-align: left;                /* a rail is read from its leading edge, never centred */
}

/* The kicker - a solid accent chip in the house label face, dark ink on accent. */
.infographic-kicker {
  align-self: flex-start;          /* the chip hugs its word */
  padding: calc(6px * var(--scale)) calc(16px * var(--scale));  /* a tight chip */
  background: var(--accent);       /* the house label chip */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale, above the type floor */
  font-weight: 700;                /* solid on a filled chip */
  line-height: 1.2;                /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a kicker is always caps */
  color: var(--accent-ink);        /* the dark-on-accent ink token */
}

/* The heading - the rail's headline, sized to wrap to two lines at this width. */
.infographic-heading {
  margin-top: calc(20px * var(--scale));  /* clear air under the chip */
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* the loudest thing on the rail */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.04;               /* tight for a wrapping display line */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text colour */
  text-wrap: balance;              /* a wrapped heading gets even rows */
}

/* The accent rule - the house bar laid horizontally under the heading. */
.infographic-accent {
  margin-top: calc(16px * var(--scale));  /* under the heading it closes */
  width: 100%;                     /* across the rail */
  height: var(--accent-weight);    /* the family's accent weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the house glow belongs to the accent alone */
  transform-origin: left center;   /* the cascade draws it from the leading edge */
}

/* The standfirst - the quiet line under the rule. */
.infographic-standfirst {
  margin-top: calc(14px * var(--scale));  /* air under the rule */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* readable, clearly subordinate */
  font-weight: 400;                /* a sentence, not a label */
  line-height: 1.3;                /* running-text leading */
  color: var(--text-dim);          /* stepped back from the heading */
}

/* The rows - one district under another, each its own washed block. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one row under the next */
  gap: calc(10px * var(--scale));  /* the rows read as separate blocks, not as a table */
  margin-top: calc(24px * var(--scale));  /* clear air under the standfirst */
}

/* One district row. The RUNTIME's markup decides the shape here, and it is worth stating: a row
   holds the label and then a TRACK, with the figure's cap nested inside the track's fill (the
   seat-board structure ig34 uses, where the cap rides the growing tip). This design wants the
   opposite - a wash across the whole row with the figure pinned at the rail's edge - so the
   track is taken OUT OF FLOW over the row and the cap is pinned against it. The row's own
   right padding is what reserves the figure's lane, since an out-of-flow cap reserves nothing. */
.infographic-row {
  position: relative;              /* the wash is drawn against the row */
  display: flex;                   /* the label sits on the row's centre line */
  align-items: center;             /* vertically centred */
  min-height: calc(74px * var(--scale));  /* every row is the same height, however short its name */
  padding: calc(14px * var(--scale)) calc(124px * var(--scale)) calc(14px * var(--scale)) calc(16px * var(--scale));
  background: rgba(255, 255, 255, 0.05);  /* one step off the panel, so a row reads as a block */
  border-left: calc(4px * var(--scale)) solid var(--text-dim);  /* the row's own colour edge */
  overflow: hidden;                /* the wash stops at the row's edge */
}

/* The wash - the measured element. It is the same .infographic-bar-fill every bar design grows,
   drawn here as a tint ACROSS the row rather than as a track beside the label: at rail width a
   bar and a figure cannot both have the room they need, so the row becomes the bar. */
.infographic-bar-track {
  position: absolute;              /* over the row, out of its flow */
  inset: 0;                        /* the row's whole area is the track */
}
.infographic-bar-fill {
  height: 100%;                    /* the wash runs the row's full height */
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--text-dim) 26%, transparent),  /* stronger at the leading edge… */
    transparent);                                          /* …fading out along the run */
  transform-origin: left center;   /* the growth starts at the leading edge */
}

/* The district name - the row's label, clipped to one line so a long name never doubles a row. */
.infographic-party {
  position: relative;              /* paints over the wash, which follows it in the markup */
  min-width: 0;                    /* lets a long name shrink rather than push the figure out */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* the row's reading size */
  font-weight: 600;                /* firm, under the figure beside it */
  line-height: 1.15;               /* one tight row */
  color: var(--text-color);        /* primary text colour */
  overflow: hidden;                /* a very long district is cut… */
  text-overflow: ellipsis;         /* …and the cut is marked */
  white-space: nowrap;             /* one line - a rail's row height is fixed by design */
}

/* The share - pinned at the rail's edge rather than riding the wash's tip. It is nested inside
   the fill, so taking it out of flow makes it resolve against the TRACK (the row's whole area)
   instead of against the fill's width - which is exactly the lane the row's padding reserved. */
.infographic-bar-cap {
  position: absolute;              /* out of the fill's flow */
  right: calc(20px * var(--scale));  /* in the lane the row's padding keeps clear */
  top: 50%;                        /* on the row's centre line… */
  transform: translateY(-50%);     /* …exactly, whatever the figure's height */
}
.infographic-bar-num {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* the figure leads each row */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* the figure sits on the row's centre line */
  color: var(--text-color);        /* primary text - the accent is the leader's alone */
  font-variant-numeric: tabular-nums;  /* the figures share one width down the column */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}
/* The unit line - stated once under the rows rather than repeated as a mark on every figure,
   which is what keeps it an editable FIELD instead of a character baked into the design. */
.infographic-unit {
  margin-top: calc(18px * var(--scale));  /* clear air after the last row */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the rail */
  font-weight: 700;                /* solid at label size, over a moving picture */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a caption, whatever the operator types */
  text-align: right;               /* sits under the figure lane it names */
  color: var(--text-dim);          /* subordinate to every row above it */
}

/* The leading district - DERIVED by the runtime, never typed. The accent follows the count. */
.infographic-row.is-leading {
  border-left-color: var(--accent);  /* the leader's edge takes the accent… */
}
.infographic-row.is-leading .infographic-bar-fill {
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 34%, transparent),  /* …and so does its wash */
    transparent);
}
.infographic-row.is-leading .infographic-bar-num { color: var(--accent); }  /* …and its figure */`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Districts', value: districts },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Kicker', value: kicker },
        { field: 'f2', ftype: 'textfield', title: o.lines[2]?.title || 'Heading', value: heading },
        { field: 'f3', ftype: 'textfield', title: o.lines[3]?.title || 'Standfirst', value: standfirst },
        { field: 'f4', ftype: 'textfield', title: o.lines[4]?.title || 'Unit', value: unit },
      ],

      runtimeExtraJs: seatBarsRuntimeJs(),
    };
  },
);

// ig36 "Turnout Dial" - the EDITORIAL turnout ring, sibling of lt25 "Masthead", ig34 "Seat
// Board" and ig35 "Majority Meter". The election night mini-pack's third graphic: a flat ink
// sheet with a printed rule, a drawn dial whose ring fills to the turnout while the figure
// counts up inside it, and the swing against the last election set beside it.
//
// THE RING IS DRAWN AS A PRINTED DIAL, not as the glass family's donut (ig04 "Poll Ring"): the
// stroke is a rule weight rather than a chunky band, the track is a hairline circle, and the
// figure inside is set rather than shouted. That is what keeps a ring in a family whose accent
// geometry is printed rules - the shape is a dial because turnout is a proportion of one whole,
// and the WEIGHT is what makes it editorial.
//
// The motion is the shared 'ring-fill': one figure drives both the ring's angle and the count,
// because on a turnout graphic that figure IS the percentage. The swing is derived from a
// hidden previous-turnout source (dataRuntimes.ts turnoutRuntimeJs) - clear that field and the
// swing line disappears, which is how a first election or a boundary change is handled.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { turnoutRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig36: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig36',
    category: 'infographic',
    name: 'Turnout Dial',
    styleTag: 'editorial',
    description: 'A printed dial filling to the turnout, with the swing against the last vote.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Turnout', sample: '71.4' },
      { title: 'Heading', sample: 'TURNOUT' },
      { title: 'Previous turnout', sample: '68.3' },
      { title: 'Comparison', sample: 'VS 2022' },
    ],
    logo: 'none',
    animationPresets: ['ring-fill'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-right',
  },
  {
    name: 'Turnout Dial',
    description:
      'The editorial turnout dial, sibling of the lt25 Masthead lower third and the ig34 Seat ' +
      'Board: a printed rule and tracked heading over a drawn dial that fills to the turnout ' +
      'while the figure counts up inside it, with the swing against the last election set ' +
      'beside it. Type the turnout as a plain number (0-100) and the previous turnout beside ' +
      'it - the swing ("+3.1 pts") is worked out. Clear the previous figure and the swing line ' +
      'disappears.',
    uicolor: '6',
  },
  (o) => {
    const turnoutText = o.lines[0]?.sample || '71.4';
    const headingText = o.lines[1]?.sample || 'TURNOUT';
    const previousText = o.lines[2]?.sample || '68.3';
    const compareText = o.lines[3]?.sample || 'VS 2022';

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 650,
      html: `    <!-- Turnout Dial: [printed rule] / [heading] / [dial + the swing beside it]. -->
    <div class="infographic-box">
      <!-- The masthead rule - the printed line the sheet hangs from. -->
      <div class="infographic-rule"></div>
      <!-- The heading - what the dial is measuring, in the family's tracked accent caps. -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The body - the dial on the reading edge, the comparison set beside it. -->
      <div class="infographic-body">
        <!-- The dial - an SVG circle with the readout centred in it. -->
        <div class="infographic-ring">
          <svg class="infographic-ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <!-- The track - the hairline circle the accent ring is drawn over. -->
            <circle class="infographic-ring-track" cx="100" cy="100" r="88" />
            <!-- The fill - pathLength 100 makes the dash math read as percent:
                 dashoffset 100 = empty, dashoffset 100 - percent = filled to that percent.
                 The SVG-attribute rotation only moves the circle's start point from
                 3 o'clock to 12 o'clock - geometry setup, not an animated CSS transform. -->
            <circle class="infographic-ring-fill" cx="100" cy="100" r="88" pathLength="100"
                    stroke-dasharray="100" stroke-dashoffset="100"
                    transform="rotate(-90 100 100)" />
          </svg>
          <!-- The readout - the figure and its static % sign, centred in the dial. -->
          <div class="infographic-figure">
            <!-- The figure - the ring-fill preset counts this element's text from 0. -->
            <span class="infographic-value" id="f0">${turnoutText}</span>
            <!-- The % sign - its own static element so the counter never rewrites it. -->
            <span class="infographic-pct">%</span>
          </div>
        </div>
        <!-- The comparison - the swing the rebuild derives, over the period it is measured against. -->
        <div class="infographic-compare">
          <div class="infographic-swing" id="infographic-swing"></div>
          <div class="infographic-against" id="f3">${compareText}</div>
        </div>
      </div>
    </div>
    <!-- Hidden previous-turnout source - SPX writes field f2 here; the rebuild reads it and
         derives the swing. Clear it and the swing line empties. -->
    <div id="f2" class="noacg-data-source">${previousText}</div>`,

      css: `/* The sheet - a flat printed surface, square corners, one restrained lift. */
.infographic-box {
  padding: calc(32px * var(--scale)) calc(46px * var(--scale)) calc(34px * var(--scale));  /* generous printed margins */
  background: var(--panel-bg);     /* the editorial ink or paper surface */
  border-radius: var(--panel-radius);  /* the family token is exactly zero */
  box-shadow: var(--panel-shadow); /* printed sheet lifted from the picture */
}

/* The masthead rule - the family's 2px printed line. */
.infographic-rule {
  height: var(--accent-weight);    /* the family's exact 2px printed rule */
  background: var(--accent);       /* the single accent colour */
}

/* The heading - the family's tracked accent caps naming what is measured. */
.infographic-heading {
  margin-top: calc(18px * var(--scale));  /* air under the rule */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 700;                /* labels stay crisp */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the accent-coloured editorial label */
}

/* The body - the dial on the reading edge, the comparison beside it. Left-aligned, not
   centred: a left-anchored graphic aligns toward its anchor (DESIGN_LANGUAGE §1). */
.infographic-body {
  display: flex;                   /* dial and comparison share one row */
  align-items: center;             /* the comparison sits on the dial's centre line */
  gap: calc(32px * var(--scale));  /* the two blocks never touch */
  margin-top: calc(20px * var(--scale));  /* air between the heading and the dial */
}

/* The dial block - the SVG circle with the readout anchored over its centre. */
.infographic-ring {
  position: relative;              /* anchor for the centred readout */
  flex-shrink: 0;                  /* a long comparison label never squashes the dial */
  width: calc(230px * var(--scale));   /* dial diameter - the hero of the sheet */
  height: calc(230px * var(--scale));  /* square: the SVG circle fills it exactly */
}

/* The SVG canvas - fills the block; no baseline gap below it. */
.infographic-ring-svg {
  display: block;                  /* kill the inline-image baseline gap */
  width: 100%;                     /* the .infographic-ring box sets the real size */
  height: 100%;                    /* keep the 1:1 viewBox mapping */
}

/* The track - a hairline circle, the printed dial's own rule. */
.infographic-ring-track {
  fill: none;                      /* a ring, not a disc */
  stroke: rgba(255, 255, 255, 0.16);  /* the empty part of the dial */
  stroke-width: 5;                 /* viewBox units - a printed rule weight, not a glass band */
}

/* The fill - the ring-fill preset tweens stroke-dashoffset 100 -> 100 - percent. */
.infographic-ring-fill {
  fill: none;                      /* a ring, not a disc */
  stroke: var(--accent);           /* the drawn part of the dial is the accent moment */
  stroke-width: 5;                 /* same weight as the track - the fill sits exactly on it */
  will-change: stroke-dashoffset;  /* hint the browser: this property animates */
}

/* The readout - the figure and its % sign, centred in the dial's hole. */
.infographic-figure {
  position: absolute;              /* pinned over the SVG */
  inset: 0;                        /* cover the whole dial block */
  display: flex;                   /* figure and % sit side by side */
  align-items: baseline;           /* the sign rests on the figure's baseline */
  justify-content: center;         /* centred on the dial's axis */
}

/* The figure - the sheet's one large number; the ring-fill preset counts it from 0. */
.infographic-value {
  align-self: center;              /* the pair sits on the dial's centre line */
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* sized to sit inside the dial's hole */
  font-weight: var(--display-weight);  /* the exact editorial 600 - set, not shouted */
  line-height: 1;                  /* no dead leading inside the dial */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  font-variant-numeric: tabular-nums;  /* digits keep one width - no jitter while counting */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-color);        /* primary ink */
}

/* The % sign - small and dimmed, clearly subordinate to the figure. */
.infographic-pct {
  align-self: center;              /* rides with the figure on the dial's centre line */
  margin-left: calc(4px * var(--scale));  /* a hair of air - beside the number, never inside it */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* well under the figure - clear hierarchy */
  font-weight: 600;                /* matches the figure's voice at its smaller size */
  line-height: 1;                  /* hugs its baseline */
  color: var(--text-dim);          /* subordinate ink - the accent stays on the dial */
}

/* The comparison block - the swing over the period it is measured against. */
.infographic-compare {
  min-width: 0;                    /* allow a long comparison label to wrap in its column */
}

/* The swing - the derived change, in points. Accent when turnout is up; a fall reads in the
   quiet ink rather than in a second colour, because a graphic carries one accent. */
.infographic-swing {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* the second figure on the sheet */
  font-weight: 700;                /* bold - it is a headline number of its own */
  line-height: 1.1;                /* tight: it reads as one unit with the label under it */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  white-space: nowrap;             /* "+3.1 pts" never wraps mid-figure */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--accent);            /* turnout up - the sheet's second accent surface */
}
.infographic-swing.is-down {
  color: var(--text-dim);          /* turnout down - stated, not coloured in */
}
.infographic-swing:empty {
  display: none;                   /* no previous figure = no swing, and no gap left behind */
}

/* The comparison label - which election the swing is measured against. */
.infographic-against {
  margin-top: calc(6px * var(--scale));  /* swing and label read as one unit */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 400;                /* the quietest voice on the sheet */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* subordinate ink */
  overflow-wrap: break-word;       /* break very long unbroken words */
}`,

      fields: [
        // The two turnout figures are NUMBERS: the % sign is its own span and the swing is
        // derived, so both carry digits alone - and a turnout figure is nudged, not retyped.
        { field: 'f0', ftype: 'number', title: o.lines[0]?.title || 'Turnout', value: turnoutText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
        { field: 'f2', ftype: 'number', title: o.lines[2]?.title || 'Previous turnout', value: previousText },
        { field: 'f3', ftype: 'textfield', title: o.lines[3]?.title || 'Comparison', value: compareText },
      ],

      // Shared turnout rebuild - the swing against the hidden previous figure (dataRuntimes.ts).
      runtimeExtraJs: turnoutRuntimeJs(),
    };
  },
);

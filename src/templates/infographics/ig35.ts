// ig35 "Majority Meter" - the EDITORIAL coalition meter, sibling of lt25 "Masthead" and ig34
// "Seat Board". The election night mini-pack's second graphic: a flat ink sheet with a printed
// rule, the coalition named in tracked caps, one big counting seat figure, and a track whose
// fill runs across the chamber toward a drawn MAJORITY LINE.
//
// It is the goal meter's shape (ig05 / ig22: one figure over a measured track, everything else
// derived from a hidden target) with one number more - see majorityMeterRuntimeJs() in
// dataRuntimes.ts for why the majority is a line drawn ACROSS the track rather than the track's
// end. The operator types three figures: what the coalition holds, what a majority needs, and
// how big the chamber is. The share, the line's position, the distance to it and the caption
// are all worked out from those.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { majorityMeterRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig35: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig35',
    category: 'infographic',
    name: 'Majority Meter',
    styleTag: 'editorial',
    description: 'A coalition\'s seats running across the chamber toward a drawn majority line.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Coalition seats', sample: '94' },
      { title: 'Majority needed', sample: '101' },
      { title: 'Seats in chamber', sample: '200' },
      { title: 'Coalition', sample: 'GOVERNMENT BLOC' },
    ],
    logo: 'none',
    animationPresets: ['count-up'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Majority Meter',
    description:
      'The editorial coalition meter, sibling of the lt25 Masthead lower third and the ig34 ' +
      'Seat Board: a printed rule, the coalition in tracked caps, its seat total counting up, ' +
      'and a track running across the whole chamber with the majority marked as a line on it. ' +
      'Type three plain numbers - the seats held, the seats a majority needs and the size of ' +
      'the chamber - and the share, the line, the distance to it ("13 SHORT" / "+27 OVER") and ' +
      'the caption are all derived.',
    uicolor: '6',
  },
  (o) => {
    const seatsText = o.lines[0]?.sample || '94';
    const majorityText = o.lines[1]?.sample || '101';
    const totalText = o.lines[2]?.sample || '200';
    const coalitionText = o.lines[3]?.sample || 'GOVERNMENT BLOC';

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 880,
      html: `    <!-- Majority Meter: [printed rule] / [coalition + margin] / [figure] / [track with the
         majority line] / [caption]. -->
    <div class="infographic-box">
      <!-- The masthead rule - the printed line the sheet hangs from. -->
      <div class="infographic-rule"></div>
      <!-- The head - who is being counted, and how far off the line they are. -->
      <div class="infographic-head">
        <div class="infographic-coalition" id="f3">${coalitionText}</div>
        <!-- The margin - "13 SHORT" or "+27 OVER", written by the rebuild, never typed. -->
        <div class="infographic-margin" id="infographic-margin"></div>
      </div>
      <!-- The seat total - the count-up preset tweens this element's text from 0. -->
      <div class="infographic-seats" id="f0">${seatsText}</div>
      <!-- The track - the WHOLE chamber. The fill is the coalition's share of it; the marker
           stands where a majority begins. -->
      <div class="infographic-track">
        <div class="infographic-bar-fill" data-value="0"></div>
        <!-- The majority line - positioned by the rebuild at majority/chamber. -->
        <div class="infographic-majority" id="infographic-majority">
          <span class="infographic-majority-label" id="infographic-majority-label"></span>
        </div>
      </div>
      <!-- The caption - "of 200 seats", written by the rebuild. -->
      <div class="infographic-seat-line" id="infographic-seat-line"></div>
    </div>
    <!-- Hidden sources - SPX writes f1 (the majority) and f2 (the chamber) here; the rebuild
         reads both. Neither is drawn: they are what the drawing is measured against. -->
    <div id="f1" class="noacg-data-source">${majorityText}</div>
    <div id="f2" class="noacg-data-source">${totalText}</div>`,

      css: `/* The sheet - a flat printed surface, square corners, one restrained lift. Fixed width
   because the track IS the chamber: a track that changed length with the text would move the
   majority line without any seat changing hands. */
.infographic-box {
  width: calc(880px * var(--scale));  /* fixed sheet width - the chamber keeps one length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(34px * var(--scale)) calc(52px * var(--scale)) calc(32px * var(--scale));  /* generous printed margins */
  background: var(--panel-bg);     /* the editorial ink or paper surface */
  border-radius: var(--panel-radius);  /* the family token is exactly zero */
  box-shadow: var(--panel-shadow); /* printed sheet lifted from the picture */
  text-align: left;                /* the zone centres a bottom-centre graphic's lines; this
                                      sheet's rows run edge to edge, so its figure and caption
                                      align to the reading edge like the rest of them */
}

/* The masthead rule - the family's 2px printed line. */
.infographic-rule {
  height: var(--accent-weight);    /* the family's exact 2px printed rule */
  background: var(--accent);       /* the single accent colour */
}

/* The head - the coalition on the left, the margin held apart on the right. */
.infographic-head {
  display: flex;                   /* coalition and margin share one row */
  justify-content: space-between;  /* pushed to the sheet's opposite edges */
  align-items: baseline;           /* both caps lines sit on one baseline */
  gap: calc(32px * var(--scale));  /* the two labels never touch */
  margin-top: calc(20px * var(--scale));  /* air under the rule */
}

/* The coalition - the family's tracked accent caps naming who this meter is about. */
.infographic-coalition {
  min-width: 0;                    /* allow a long name to shrink and wrap inside flex */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 700;                /* labels stay crisp */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the accent-coloured editorial label */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* The margin - the derived distance to the line. Dim until the line is crossed: a coalition
   that is short is stating a fact, one that is over has the story. */
.infographic-margin {
  flex-shrink: 0;                  /* a long coalition name never squeezes it */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* a second voice, clearly under the figure */
  font-weight: 700;                /* it is a headline number of its own */
  line-height: 1.3;                /* matches the label row's leading */
  letter-spacing: 0.04em;          /* a touch of air between the caps */
  white-space: nowrap;             /* "+27 OVER" never wraps */
  font-variant-numeric: tabular-nums;  /* the figure moves all night - no jitter */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-dim);          /* subordinate ink while the coalition is short */
}
.infographic-box.is-reached .infographic-margin {
  color: var(--accent);            /* crossing the line is the sheet's accent moment */
}

/* The seat total - the sheet's one enormous number; the count-up preset tweens it from 0. */
.infographic-seats {
  margin-top: calc(10px * var(--scale));  /* label and figure read as one unit */
  font-size: calc(104px * var(--scale) * var(--type-scale));  /* the whole design IS this number (1080p reference) */
  font-weight: var(--display-weight);  /* the exact editorial 600 - set, not shouted */
  line-height: 1;                  /* no dead leading - the track sets the gap below */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  font-variant-numeric: tabular-nums;  /* digits keep one width - no jitter while counting */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-color);        /* primary ink */
}

/* The track - the whole chamber, as a printed lane. The top margin leaves room for the
   majority line's label, which stands above the lane. */
.infographic-track {
  position: relative;              /* the fill's width and the marker's left are measured here */
  height: calc(22px * var(--scale));  /* a printed bar: solid, not a hairline */
  margin-top: calc(52px * var(--scale));  /* air for the majority label standing above it */
  background: rgba(255, 255, 255, 0.08);  /* the empty chamber on the ink sheet */
}

/* The fill - the coalition's share of the chamber. The count-up preset grows its width from 0%
   to its data-value percent once the figure has landed.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens WIDTH
   because scaleX would squash its end against the majority line it has to meet exactly. */
.infographic-bar-fill {
  width: 0;                        /* fallback - the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  background: var(--accent);       /* the bar is the accent's main surface */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The majority line - a full-height mark standing on the track where a majority begins. It is
   drawn over the fill on purpose: the moment the bar reaches it is the graphic. */
.infographic-majority {
  position: absolute;              /* placed by the rebuild at majority/chamber */
  top: calc(-10px * var(--scale));  /* the mark overshoots the lane above... */
  bottom: calc(-10px * var(--scale));  /* ...and below, so it reads as a line, not a segment */
  width: calc(3px * var(--scale)); /* a drawn line, a shade heavier than the printed rule */
  margin-left: calc(-1.5px * var(--scale));  /* centred on its own position */
  background: var(--text-color);   /* ink, not accent - the line is the rule, not the news */
}

/* The line's label - the majority figure, standing above the mark. */
.infographic-majority-label {
  position: absolute;              /* hung off the line itself */
  bottom: 100%;                    /* directly above the mark */
  left: 50%;                       /* ...centred on it */
  transform: translate(-50%, calc(-8px * var(--scale)));  /* a thin seam above the line */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 700;                /* labels stay crisp */
  line-height: 1.2;                /* a single compact line */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  white-space: nowrap;             /* "MAJORITY 101" never wraps */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-color);        /* primary ink - it names the rule of the chamber */
}

/* The caption - what the track is measured against, written by the rebuild. */
.infographic-seat-line {
  margin-top: calc(14px * var(--scale));  /* small gap down from the track */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* broadcast-safe small caps */
  font-weight: 400;                /* the quietest voice on the sheet */
  line-height: 1.3;                /* tracked caps need air */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-dim);          /* subordinate ink */
}`,

      fields: [
        // Three NUMBERS: the rebuild derives every other figure on the sheet from them, and a
        // seat total on a count night is bumped far more often than it is retyped.
        { field: 'f0', ftype: 'number', title: o.lines[0]?.title || 'Coalition seats', value: seatsText },
        { field: 'f1', ftype: 'number', title: o.lines[1]?.title || 'Majority needed', value: majorityText },
        { field: 'f2', ftype: 'number', title: o.lines[2]?.title || 'Seats in chamber', value: totalText },
        { field: 'f3', ftype: 'textfield', title: o.lines[3]?.title || 'Coalition', value: coalitionText },
      ],

      // Shared majority-meter rebuild - seats, the majority line and the chamber (dataRuntimes.ts).
      runtimeExtraJs: majorityMeterRuntimeJs(),
    };
  },
);

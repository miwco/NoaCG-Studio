// tk16 "Breaking Crawl" — the crawl that runs under a developing story. The label block
// carries a live dot: a slow, single-property breath that says the strip is current rather
// than a caption somebody left up.
//
// The breath is 1.8 seconds and never goes below 35% opacity. That is a deliberate ceiling on
// urgency: anything faster reads as a flashing warning, and flashing graphics are a
// photosensitivity hazard before they are a taste question. It is authored as an ordinary
// looping track in the animation data, so it is visible and editable on the timeline — not a
// CSS animation the editor cannot see.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk16: TemplateVariant = defineTickerVariant(
  {
    id: 'tk16',
    category: 'ticker',
    name: 'Breaking Crawl',
    styleTag: 'minimal',
    description: 'A breaking-news crawl whose label carries a slow live dot — never a flash.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Lines',
        sample: [
          'Emergency services confirm all passengers have been accounted for',
          'Transport minister to make a statement within the hour',
          'The line will remain closed for the rest of the day',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Breaking' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Breaking Crawl',
    description:
      'The developing-story crawl: a solid accent label with a slowly breathing live dot, ' +
      'and the story lines travelling beside it. The dot is paced to read as "current", not ' +
      'as an alarm — no strobe, ever.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Breaking Crawl: live dot and label left, lines travelling right. -->
    <div class="ticker-box">
      <!-- The label block. The dot is a sibling of the field, so the operator's word can be
           anything ("Breaking", "Developing", "Live") without disturbing it. -->
      <div class="ticker-label">
        <span class="ticker-dot" aria-hidden="true"></span>
        <span id="f1">${o.lines[1]?.sample || 'Breaking'}</span>
      </div>
      <!-- The scrolling window — rebuildTicker() injects the lines into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip — a flat dark bar edged by a heavy accent along its top. */
.ticker-box {
  display: flex;                   /* label left, viewport filling the rest */
  align-items: stretch;            /* the label block spans the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(84px * var(--scale));   /* the strip's fixed height */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the strip's authored accent weight */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink, with room for the dot. */
.ticker-label {
  display: flex;                   /* the dot and the word sit on one line */
  align-items: center;             /* vertical centering */
  gap: calc(14px * var(--scale));  /* air between the dot and the word */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(30px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(22px * var(--scale) * var(--type-scale)); /* read before the lines */
  font-weight: 800;                /* heavy caps carry at a distance */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
  white-space: nowrap;             /* the label never wraps */
}

/* The live dot — drawn in the accent's own ink so it reads as part of the label block. Its
   breath is a looping opacity track in the animation data, not a CSS animation: the timeline
   has to be able to see it, slow it down, or take it off. */
.ticker-dot {
  width: calc(14px * var(--scale));   /* a dot, not a bullet */
  height: calc(14px * var(--scale));  /* square, then rounded */
  border-radius: 50%;              /* the dot */
  background: var(--accent-ink);   /* the label block's ink colour */
  will-change: opacity;            /* the breath animates exactly this */
}

/* The scrolling window. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label leaves */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of lines. */
#ticker-track {
  display: inline-flex;            /* lines in a single row, width = content */
  align-items: center;             /* lines and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(36px * var(--scale)); /* air between the label and the first line */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One line. */
.ticker-item {
  font-size: calc(26px * var(--scale) * var(--type-scale)); /* larger than a routine crawl's */
  font-weight: 500;                /* a touch of presence without shouting */
  color: var(--text-color);        /* primary text color */
}

/* The separator between lines. */
.ticker-sep {
  margin: 0 calc(32px * var(--scale)); /* even air on both sides */
  font-size: calc(16px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--accent);            /* the accent as punctuation, chaining the lines */
}`,
    rowBuilderJs: `// renderTickerItem(text): one line followed by a small accent dot separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
}`,
    doubleItems: true,
    tokens: { accentWeight: 'calc(4px * var(--scale))', labelTracking: '0.12em' },
  }),
  // The live dot's breath, added to the entrance step as a LOOPING opacity track. It is a
  // refinement rather than something the preset emits because the dot belongs to this design
  // alone — every other ticker shares the same three motion presets, and a preset that
  // animated an element only one variant has would write a phantom timeline layer everywhere
  // else. 1.8s, yoyo, floor 0.35: a breath, never a blink.
  () => (data) => {
    const steps = data.steps.map((step, i) =>
      i !== 0
        ? step
        : {
            ...step,
            layers: {
              ...step.layers,
              '.ticker-dot': {
                opacity: [
                  { time: 0, value: 1 },
                  { time: 0.9, value: 0.35 },
                ],
              },
            },
            loops: {
              ...(step.loops ?? {}),
              '.ticker-dot': { opacity: { repeat: -1, yoyo: true } },
            },
          },
    );
    return { ...data, steps };
  },
);

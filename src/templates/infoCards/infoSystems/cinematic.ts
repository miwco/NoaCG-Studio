// The CINEMATIC information system. Every design is a sibling of lt32 "Scrim": no panel edge,
// one 1 px hairline, light wide type, a soft directional scrim and a restrained sine fade.
// Separation is a box-level drop-shadow so reveal masks never clip it.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { typeLines } from '../../types/graphicType';
import {
  NOW_NEXT_FIELDS,
  STATEMENT_FIELDS,
  TITLE_CARD_FIELDS,
} from '../../pack4/content';
import { defineCardVariant } from '../shared';
import { CINEMATIC_MASK_ROOM_CSS, emptySystemLines, systemMasks } from './shared';

const cinematicMotion = ['fade', 'line-reveal', 'slide-up'] as const;

export const CINEMATIC_CHAPTER_SAMPLES = {
  title: 'The River Remembers',
  kicker: 'Chapter Three',
  subtitle: 'A journey through the lower delta',
};

/** card67 "Chapter Scrim" - cinematic chapter title, sibling of lt32 Scrim. */
export const card67: TemplateVariant = defineCardVariant(
  {
    id: 'card67',
    category: 'info-card',
    name: 'Chapter Scrim',
    styleTag: 'cinematic',
    description: 'Chapter title on a soft directional scrim with one hairline and wide light type.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, CINEMATIC_CHAPTER_SAMPLES),
    logo: 'optional',
    animationPresets: [...cinematicMotion],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Chapter Scrim',
    description:
      'The chapter opener in the lt32 Scrim family: a single 1 px hairline, dimmed wide-tracked ' +
      'chapter label and light display title on a directional scrim. The default fade uses sine easing.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Chapter Scrim: chapter label, title and context on a directional scrim. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [1, 'info-card-chapter-label'],
  [0, 'info-card-chapter-title'],
  [2, 'info-card-chapter-support'],
])}
    </div>`,
    css: `/* The scrim - no edge, radius, blur panel or box shadow. */
.info-card-box {
  padding: calc(72px * var(--scale)) calc(220px * var(--scale)) calc(68px * var(--scale)) calc(46px * var(--scale));
  background: linear-gradient(90deg,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 70%, transparent) 48%,
              transparent 100%);  /* disappears into the shot */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

.info-card-accent {
  width: calc(330px * var(--scale)); /* the only drawn element */
  height: var(--accent-weight);     /* exact cinematic 1 px hairline */
  margin-bottom: calc(28px * var(--scale)); /* generous separation */
  background: var(--accent);       /* quiet bone or ember */
  transform-origin: left center;   /* line reveals from the reading edge */
  will-change: transform;          /* animated by the preset */
}

.info-card-chapter-label {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* smallest cinematic voice */
  font-weight: 500;                /* light but legible */
  line-height: 1.4;                /* wide caps need room */
  letter-spacing: var(--label-tracking); /* exact 0.34em cinematic spacing */
  text-transform: uppercase;       /* chapter marker */
  color: var(--label-color);       /* dimmed, never accented */
}

.info-card-chapter-title {
  margin-top: calc(18px * var(--scale)); /* title clears the wide label */
  font-size: calc(70px * var(--scale) * var(--type-scale)); /* chapter-title scale */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.12;               /* light type needs air */
  letter-spacing: var(--display-tracking); /* exact +0.06em cinematic opening */
  color: var(--text-color);        /* primary white */
}

.info-card-chapter-support {
  margin-top: calc(21px * var(--scale)); /* contextual line is its own breath */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* quiet support */
  font-weight: 400;                /* light reading weight */
  line-height: 1.35;               /* supports wrap */
  letter-spacing: 0.03em;          /* restrained openness */
  color: var(--text-dim);          /* subordinate */
}

${CINEMATIC_MASK_ROOM_CSS}

${emptySystemLines([
  '.info-card-chapter-label',
  '.info-card-chapter-title',
  '.info-card-chapter-support',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

export const CINEMATIC_NOW_PLAYING_SAMPLES = {
  nowLabel: 'NOW PLAYING',
  now: 'Ordinary Light',
  nowMeta: 'The Hollow Coast · Live at the Roundhouse',
  nextLabel: 'NEXT',
  next: 'The Last Harbour · 21:15',
};

/** card68 "Now Playing Scrim" - cinematic now playing, sibling of lt35 Letterbox. */
export const card68: TemplateVariant = defineCardVariant(
  {
    id: 'card68',
    category: 'info-card',
    name: 'Now Playing Scrim',
    styleTag: 'cinematic',
    description: 'Now-playing and next cue on a low letterbox scrim with one hairline.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, CINEMATIC_NOW_PLAYING_SAMPLES),
    logo: 'optional',
    animationPresets: [...cinematicMotion],
    defaultPalette: paletteById('ember'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Now Playing Scrim',
    description:
      'The now-playing card in the lt35 Letterbox family: current title and detail over a ' +
      'hairline, with the next cue kept quiet on the same soft scrim. The default fade uses sine easing.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Now Playing Scrim: current track above the next cue. -->
    <div class="info-card-box">
      <div class="info-card-current-block">
${systemMasks(o, [
  [0, 'info-card-now-label'],
  [1, 'info-card-now-title'],
  [2, 'info-card-now-detail'],
], '        ')}
      </div>
      <div class="info-card-accent info-card-divider"></div>
      <div class="info-card-next-block">
${systemMasks(o, [
  [3, 'info-card-next-label'],
  [4, 'info-card-next-title'],
], '        ')}
      </div>
    </div>`,
    css: `/* The low scrim - no visible panel edge. */
.info-card-box {
  display: grid;                   /* current title above the next cue */
  grid-template-columns: minmax(0, 1fr) minmax(calc(410px * var(--scale)), auto); /* current information leads */
  grid-template-rows: auto auto;   /* content over the joining rule */
  column-gap: calc(58px * var(--scale)); /* quiet separation */
  align-items: end;                /* both blocks share the lower baseline */
  padding: calc(52px * var(--scale)) calc(210px * var(--scale)) calc(48px * var(--scale)) calc(42px * var(--scale));
  background: linear-gradient(90deg,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 65%, transparent) 58%,
              transparent 100%);  /* scrim dissolves into the picture */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

.info-card-current-block {
  grid-column: 1;                  /* current information owns the leading measure */
  grid-row: 1;                     /* aligned beside the next cue */
  min-width: 0;                    /* permits measured text fitting */
}

.info-card-now-label,
.info-card-next-label {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* label at broadcast floor */
  font-weight: 500;                /* light cinematic marker */
  line-height: 1.35;               /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact cinematic spacing */
  text-transform: uppercase;       /* cue labels */
  color: var(--label-color);       /* dimmed, never accented */
}

.info-card-now-title {
  display: block;                  /* title owns the current-story measure */
  margin-top: calc(11px * var(--scale)); /* tied to the now label */
  font-size: calc(54px * var(--scale) * var(--type-scale)); /* primary title */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.2;                /* light type needs enough air for a wrapped title */
  letter-spacing: var(--display-tracking); /* exact +0.06em */
  color: var(--text-color);        /* primary text */
}

.info-card-now-detail {
  margin-top: calc(8px * var(--scale)); /* one unit with the title */
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* secondary detail */
  font-weight: 400;                /* regular */
  line-height: 1.35;               /* supports wrap */
  letter-spacing: 0.03em;          /* gentle openness */
  color: var(--text-dim);          /* subordinate */
}

.info-card-accent {
  grid-column: 1 / -1;             /* one hairline joins the two beats */
  grid-row: 2;                     /* rule sits beneath both information blocks */
  width: 100%;                     /* spans the occupied measure */
  height: var(--accent-weight);    /* exact cinematic 1 px */
  margin: calc(24px * var(--scale)) 0; /* equal air around the rule */
  background: var(--accent);       /* the only drawn element */
  opacity: 0.72;                   /* restrained against the footage */
  transform-origin: left center;   /* line-reveal draws from the edge */
  will-change: transform;          /* preset animates it */
}

.info-card-next-block {
  grid-column: 2;                  /* next cue stays on the far side */
  grid-row: 1;                     /* aligned beside the current title */
  min-width: 0;                    /* permits measured text fitting */
  max-width: calc(420px * var(--scale)); /* prevents an overlong next cue dominating */
  text-align: right;               /* aligns toward the open frame edge */
}

.info-card-next-title {
  margin-top: calc(10px * var(--scale)); /* tied to its cue */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* below the current title */
  font-weight: 400;                /* quiet next item */
  line-height: 1.3;                /* supports wrap */
  letter-spacing: 0.03em;          /* restrained openness */
  color: var(--text-color);        /* still readable */
}

${CINEMATIC_MASK_ROOM_CSS}

${emptySystemLines([
  '.info-card-now-label',
  '.info-card-now-title',
  '.info-card-now-detail',
  '.info-card-next-label',
  '.info-card-next-title',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

export const CINEMATIC_QUOTE_SAMPLES = {
  label: 'FIELD NOTES · DAY 17',
  primary:
    'The first thing you hear is not the wind. It is the ice moving beneath the lake.',
  secondary: '',
  attribution: 'Dr Lina Maren · Glaciologist',
};

/** card69 "Documentary Quote" - cinematic quotation, sibling of lt32 Scrim. */
export const card69: TemplateVariant = defineCardVariant(
  {
    id: 'card69',
    category: 'info-card',
    name: 'Documentary Quote',
    styleTag: 'cinematic',
    description: 'Long documentary quotation with field-note label and attribution on a soft scrim.',
    maxLines: 4,
    suggestedLines: typeLines(STATEMENT_FIELDS, CINEMATIC_QUOTE_SAMPLES),
    logo: 'optional',
    animationPresets: [...cinematicMotion],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Documentary Quote',
    description:
      'The documentary quotation in the lt32 Scrim family: one 1 px hairline, a dimmed field-note ' +
      'label, light wide prose and an attribution on a left-to-right scrim. The default fade uses sine easing.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Documentary Quote: field note, quotation, optional translation and attribution. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-quote-label'],
  [1, 'info-card-quote-primary'],
  [2, 'info-card-quote-secondary'],
  [3, 'info-card-quote-source'],
])}
    </div>`,
    css: `/* The quote scrim - open to the shot, with no panel edge. */
.info-card-box {
  padding: calc(66px * var(--scale)) calc(250px * var(--scale)) calc(62px * var(--scale)) calc(46px * var(--scale));
  background: linear-gradient(90deg,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 66%, transparent) 55%,
              transparent 100%);  /* fades into the footage */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

.info-card-accent {
  width: calc(250px * var(--scale)); /* the only drawn element */
  height: var(--accent-weight);     /* exact cinematic 1 px */
  margin-bottom: calc(25px * var(--scale)); /* space before the field note */
  background: var(--accent);       /* quiet bone or ember */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* animated by line-reveal */
}

.info-card-quote-label {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* label at broadcast floor */
  font-weight: 500;                /* light but legible */
  line-height: 1.4;                /* wide caps need room */
  letter-spacing: var(--label-tracking); /* exact cinematic spacing */
  text-transform: uppercase;       /* field-note marker */
  color: var(--label-color);       /* dimmed, never accented */
}

.info-card-quote-primary {
  display: block;                  /* quotation owns the reading measure */
  max-width: calc(950px * var(--scale)); /* comfortable prose line length */
  margin-top: calc(20px * var(--scale)); /* clear of the label */
  font-size: calc(42px * var(--scale) * var(--type-scale)); /* quotation scale */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.34;               /* prose needs air */
  letter-spacing: 0.025em;         /* restrained openness, below display tracking */
  color: var(--text-color);        /* primary text */
}

.info-card-quote-secondary {
  display: block;                  /* optional translation is its own paragraph */
  max-width: calc(950px * var(--scale)); /* same reading measure */
  margin-top: calc(21px * var(--scale)); /* new language beat */
  font-size: calc(29px * var(--scale) * var(--type-scale)); /* below the primary quote */
  font-weight: 400;                /* regular */
  line-height: 1.4;                /* comfortable paragraph leading */
  letter-spacing: 0.02em;          /* gentle openness */
  color: var(--text-dim);          /* subordinate translation */
}

.info-card-quote-source {
  display: block;                  /* attribution closes the quotation */
  margin-top: calc(24px * var(--scale)); /* separate source */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 500;                /* light label voice */
  line-height: 1.4;                /* wide caps need room */
  letter-spacing: var(--label-tracking); /* exact cinematic spacing */
  text-transform: uppercase;       /* credit line */
  color: var(--label-color);       /* dimmed */
}

${CINEMATIC_MASK_ROOM_CSS}

${emptySystemLines([
  '.info-card-quote-label',
  '.info-card-quote-primary',
  '.info-card-quote-secondary',
  '.info-card-quote-source',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

/** card70 "Location Scrim" - cinematic location card, sibling of lt35 Letterbox. */
export const card70: TemplateVariant = defineCardVariant(
  {
    id: 'card70',
    category: 'info-card',
    name: 'Location Scrim',
    styleTag: 'cinematic',
    description: 'Place, region and context on a compact directional scrim with one hairline.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Place', sample: 'Lake Tana' },
      { title: 'Region', sample: 'Amhara Region · Ethiopia' },
      { title: 'Context', sample: 'Dawn · 12°C' },
    ],
    logo: 'none',
    animationPresets: [...cinematicMotion],
    defaultPalette: paletteById('ember'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Location Scrim',
    description:
      'The location identifier in the lt35 Letterbox family: a compact directional scrim, ' +
      'one 1 px hairline, light wide place name and two dimmed context rows. The default fade uses sine easing.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Location Scrim: place, region and context. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-location-place'],
  [1, 'info-card-location-region'],
  [2, 'info-card-location-context'],
])}
    </div>`,
    css: `/* The compact location scrim - no card edge. */
.info-card-box {
  padding: calc(44px * var(--scale)) calc(175px * var(--scale)) calc(42px * var(--scale)) calc(38px * var(--scale));
  background: linear-gradient(90deg,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 62%, transparent) 60%,
              transparent 100%);  /* disappears toward the subject */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

.info-card-accent {
  width: calc(160px * var(--scale)); /* the only drawn element */
  height: var(--accent-weight);     /* exact cinematic 1 px */
  margin-bottom: calc(19px * var(--scale)); /* space before the place */
  background: var(--accent);       /* quiet bone or ember */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* animated rule */
}

.info-card-location-place {
  display: block;                  /* place name owns the location measure */
  font-size: calc(51px * var(--scale) * var(--type-scale)); /* place name dominates */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.2;                /* light type needs enough air for wide capitals */
  letter-spacing: var(--display-tracking); /* exact +0.06em */
  color: var(--text-color);        /* primary text */
}

.info-card-location-region {
  margin-top: calc(11px * var(--scale)); /* tied to the place */
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* regional context */
  font-weight: 400;                /* quiet */
  line-height: 1.35;               /* supports wrap */
  letter-spacing: 0.04em;          /* gently open */
  color: var(--text-dim);          /* subordinate */
}

.info-card-location-context {
  margin-top: calc(15px * var(--scale)); /* separate production context */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 500;                /* tracked caps stay crisp */
  line-height: 1.4;                /* room for tracking */
  letter-spacing: var(--label-tracking); /* exact cinematic spacing */
  text-transform: uppercase;       /* production-note voice */
  color: var(--label-color);       /* dimmed */
}

${CINEMATIC_MASK_ROOM_CSS}

${emptySystemLines([
  '.info-card-location-place',
  '.info-card-location-region',
  '.info-card-location-context',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 800,
  }),
);

/** card71 "Prepared Lyric" - cinematic prepared caption/lyric, sibling of lt34 Title Strap. */
export const card71: TemplateVariant = defineCardVariant(
  {
    id: 'card71',
    category: 'info-card',
    name: 'Prepared Lyric',
    styleTag: 'cinematic',
    description: 'Prepared caption or lyric line with the next line held quietly beneath it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Current line', sample: 'Carry the light across the water' },
      { title: 'Next line', sample: 'Let the harbour lead us home' },
      { title: 'Cue or source', sample: 'Verse 2 · prepared caption' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Prepared Lyric',
    description:
      'The prepared caption and lyric in the centred lt34 Title Strap family: current line, ' +
      'next line and cue over a low scrim, divided by one 1 px hairline. It is prepared text, not a timed-text runtime.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Prepared Lyric: current line, next line and cue. -->
    <div class="info-card-box">
${systemMasks(o, [
  [0, 'info-card-lyric-current'],
  [1, 'info-card-lyric-next'],
])}
      <div class="info-card-accent"></div>
${systemMasks(o, [[2, 'info-card-lyric-cue']])}
    </div>`,
    css: `/* The low caption scrim - edge-free and centred. */
.info-card-box {
  width: calc(1500px * var(--scale)); /* broad caption measure */
  max-width: none;                 /* deliberate full-width band inside the safe area */
  padding: calc(50px * var(--scale)) calc(90px * var(--scale)) calc(42px * var(--scale));
  background: linear-gradient(180deg,
              transparent 0%,
              color-mix(in srgb, var(--panel-bg) 68%, transparent) 38%,
              var(--panel-bg) 100%); /* soft letterbox scrim */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  text-align: center;              /* this centre-anchored composition is genuinely symmetric */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

.info-card-lyric-current {
  display: block;                  /* current line owns the measure */
  font-size: calc(40px * var(--scale) * var(--type-scale)); /* primary prepared line */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.28;               /* lyrical line breathes */
  letter-spacing: 0.035em;         /* restrained openness */
  color: var(--text-color);        /* primary text */
}

.info-card-lyric-next {
  display: block;                  /* next line sits beneath */
  margin-top: calc(12px * var(--scale)); /* close enough to preview the progression */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* secondary line */
  font-weight: 400;                /* quiet */
  line-height: 1.35;               /* supports wrap */
  letter-spacing: 0.03em;          /* gentle openness */
  color: var(--text-dim);          /* next line stays subordinate */
}

.info-card-accent {
  width: calc(240px * var(--scale)); /* the only drawn element */
  height: var(--accent-weight);     /* exact cinematic 1 px */
  margin: calc(22px * var(--scale)) auto calc(17px * var(--scale)); /* centred breath */
  background: var(--accent);       /* quiet bone or ember */
  transform-origin: center center; /* symmetric line reveal */
  will-change: transform;          /* animated rule */
}

.info-card-lyric-cue {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* cue at broadcast floor */
  font-weight: 500;                /* light but legible */
  line-height: 1.4;                /* wide caps need room */
  letter-spacing: var(--label-tracking); /* exact cinematic spacing */
  text-transform: uppercase;       /* cue voice */
  color: var(--label-color);       /* dimmed */
}

${CINEMATIC_MASK_ROOM_CSS}

${emptySystemLines(['.info-card-lyric-current', '.info-card-lyric-next', '.info-card-lyric-cue'])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1500,
  }),
);

// The EDITORIAL information system. Every design is a sibling of lt25 "Masthead": printed
// rules, flat ink or paper surfaces, set hierarchy and whitespace. There are no rounded cards,
// glass blur treatments or palette-swapped versions of another family.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { typeLines } from '../../types/graphicType';
import {
  HEADLINE_FIELDS,
  NOTICE_FIELDS,
  NOW_NEXT_FIELDS,
  TITLE_CARD_FIELDS,
} from '../../pack4/content';
import { defineCardVariant } from '../shared';
import { emptySystemLines, systemMasks } from './shared';

const editorialMotion = ['line-reveal', 'fade', 'slide-up', 'mask-wipe'] as const;

export const EDITORIAL_TITLE_SAMPLES = {
  title: 'Designing the Public Record',
  kicker: 'Session 04 · Editorial Systems',
  subtitle: '14:30 · Assembly Hall',
};

/** card59 "Edition Title" - editorial session/segment title, sibling of lt25 Masthead. */
export const card59: TemplateVariant = defineCardVariant(
  {
    id: 'card59',
    category: 'info-card',
    name: 'Edition Title',
    styleTag: 'editorial',
    description: 'Printed session or segment title with a masthead rule and generous paper spacing.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, EDITORIAL_TITLE_SAMPLES),
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-left',
  },
  {
    name: 'Edition Title',
    description:
      'The session and segment opener in the lt25 Masthead family: one printed rule, a tracked ' +
      'kicker, a set display title and a practical supporting line on a flat paper surface.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Edition Title: masthead rule, kicker, title, practical detail. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [1, 'info-card-kicker'],
  [0, 'info-card-display'],
  [2, 'info-card-support'],
])}
    </div>`,
    css: `/* The printed surface - flat paper, square corners, one restrained lift. */
.info-card-box {
  padding: calc(42px * var(--scale)) calc(58px * var(--scale)) calc(46px * var(--scale));
  background: var(--panel-bg);     /* the editorial paper or ink surface */
  border-radius: var(--panel-radius); /* the family token is exactly zero */
  box-shadow: var(--panel-shadow); /* printed sheet lifted from the picture */
}

/* The masthead rule - the first thing the line-reveal entrance draws. */
.info-card-accent {
  width: calc(410px * var(--scale)); /* long enough to organise the title column */
  height: var(--accent-weight);     /* the family's exact 2 px printed rule */
  margin-bottom: calc(24px * var(--scale)); /* generous air below the rule */
  background: var(--accent);       /* the single accent colour */
  transform-origin: left center;   /* the rule draws from the reading edge */
  will-change: transform;          /* the preset animates this rule */
}

.info-card-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast-safe small caps */
  font-weight: 700;                /* labels stay crisp */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking); /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* masthead voice */
  color: var(--label-color);       /* the accent-coloured editorial label */
}

.info-card-display {
  margin-top: calc(18px * var(--scale)); /* title clears the kicker */
  font-size: calc(70px * var(--scale) * var(--type-scale)); /* opener scale */
  font-weight: var(--display-weight); /* the exact editorial 600 */
  line-height: 1.06;               /* large type sits tight */
  letter-spacing: var(--display-tracking); /* the exact -0.015em editorial setting */
  color: var(--text-color);        /* primary ink */
}

.info-card-support {
  margin-top: calc(18px * var(--scale)); /* practical detail is its own beat */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* clear second voice */
  font-weight: 400;                /* hierarchy comes from weight contrast */
  line-height: 1.3;                /* supports a wrapped venue line */
  color: var(--text-dim);          /* subordinate ink */
}

${emptySystemLines(['.info-card-kicker', '.info-card-display', '.info-card-support'])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

export const EDITORIAL_NOW_NEXT_SAMPLES = {
  nowLabel: 'TOPIC',
  now: 'What the numbers really show',
  nowMeta: 'Evidence desk · live analysis',
  nextLabel: 'COMING UP',
  next: 'Questions from the audience · 15:10',
};

/** card60 "Rundown Column" - topic/coming-up card, sibling of lt26 Byline. */
export const card60: TemplateVariant = defineCardVariant(
  {
    id: 'card60',
    category: 'info-card',
    name: 'Rundown Column',
    styleTag: 'editorial',
    description: 'Topic and coming-up hierarchy organised by a column rule and printed labels.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, EDITORIAL_NOW_NEXT_SAMPLES),
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-left',
  },
  {
    name: 'Rundown Column',
    description:
      'The topic and coming-up card in the lt26 Byline family: a full-height printed rule, ' +
      'wide-tracked section labels and two clearly separated editorial beats.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Rundown Column: one topic, its context, then the next item. -->
    <div class="info-card-box">
      <div class="info-card-accent info-card-divider"></div>
      <div class="info-card-copy">
${systemMasks(o, [
  [0, 'info-card-kicker'],
  [1, 'info-card-current'],
  [2, 'info-card-detail'],
  [3, 'info-card-next-label'],
  [4, 'info-card-next'],
], '        ')}
      </div>
    </div>`,
    css: `/* The column - structure comes from the rule and whitespace, never a rounded card. */
.info-card-box {
  display: flex;                   /* rule beside the copy */
  align-items: stretch;            /* rule spans the whole hierarchy */
  gap: calc(31px * var(--scale));  /* editorial whitespace */
  padding: calc(18px * var(--scale)) 0; /* open to the picture above and below */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.55));
}

.info-card-accent {
  width: var(--accent-weight);     /* exact 2 px editorial rule */
  background: var(--accent);       /* the one accent colour */
  flex: none;                      /* never squeezed by long text */
  transform-origin: center top;    /* the entrance draws downward */
  will-change: transform;          /* the preset animates this rule */
}

.info-card-copy {
  min-width: 0;                    /* long copy wraps inside the safe measure */
  max-width: calc(850px * var(--scale)); /* readable editorial line length */
}

.info-card-kicker,
.info-card-next-label {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* never below the floor */
  font-weight: 700;                /* tracked caps stay crisp */
  line-height: 1.3;                /* room for tracking */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* section labels */
  color: var(--label-color);       /* accent colour is reserved for labels and the rule */
}

.info-card-current {
  margin-top: calc(12px * var(--scale)); /* tied to its label */
  font-size: calc(55px * var(--scale) * var(--type-scale)); /* current topic dominates */
  font-weight: var(--display-weight); /* exact editorial display weight */
  line-height: 1.1;                /* controlled wrap */
  letter-spacing: var(--display-tracking); /* exact editorial setting */
  color: var(--text-color);        /* primary type */
}

.info-card-detail {
  margin-top: calc(8px * var(--scale)); /* current topic and detail are one unit */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* secondary reading line */
  font-weight: 400;                /* quiet context */
  line-height: 1.32;               /* readable when wrapped */
  color: var(--text-dim);          /* subordinate */
}

.info-card-next-label {
  margin-top: calc(30px * var(--scale)); /* a new editorial section */
  padding-top: calc(20px * var(--scale)); /* air under the neutral divider */
  border-top: 1px solid rgba(255, 255, 255, 0.20); /* neutral - the accent remains singular */
}

.info-card-next {
  margin-top: calc(10px * var(--scale)); /* tied to its label */
  font-size: calc(31px * var(--scale) * var(--type-scale)); /* clearly below the current topic */
  font-weight: 500;                /* enough presence for a glance */
  line-height: 1.24;               /* supports two rows */
  color: var(--text-color);        /* still actionable information */
}

${emptySystemLines([
  '.info-card-kicker',
  '.info-card-current',
  '.info-card-detail',
  '.info-card-next-label',
  '.info-card-next',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 890,
  }),
);

export const EDITORIAL_FACT_CHECK_SAMPLES = {
  kicker: 'FACT CHECK · VERIFIED',
  headline: 'Claim: household energy use rose by 40%',
  body:
    'The official series shows a 14% rise after seasonal adjustment. The larger figure ' +
    'compares one winter month with a summer low.',
  source: 'Source · National Statistics Office, release 28 July 2026',
};

/** card61 "Fact Check Desk" - quote/fact-check card, sibling of lt25 Masthead. */
export const card61: TemplateVariant = defineCardVariant(
  {
    id: 'card61',
    category: 'info-card',
    name: 'Fact Check Desk',
    styleTag: 'editorial',
    description: 'Claim, finding, context and source arranged as a printed fact-check panel.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, EDITORIAL_FACT_CHECK_SAMPLES),
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-left',
  },
  {
    name: 'Fact Check Desk',
    description:
      'The quote and fact-check card in the lt25 Masthead family: a status kicker above the ' +
      'claim, a neutral finding block and an explicit source on a flat printed surface.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Fact Check Desk: status, claim, finding, source. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-kicker'],
  [1, 'info-card-claim'],
  [2, 'info-card-finding'],
  [3, 'info-card-source'],
])}
    </div>`,
    css: `/* The fact-check sheet - flat paper with square corners. */
.info-card-box {
  padding: calc(40px * var(--scale)) calc(52px * var(--scale)) calc(38px * var(--scale));
  background: var(--panel-bg);     /* printed paper, not glass */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* one restrained printed-sheet lift */
}

.info-card-accent {
  width: calc(100% - 4px);         /* the rule organises the whole measure */
  height: var(--accent-weight);    /* exact 2 px printed rule */
  margin-bottom: calc(22px * var(--scale)); /* whitespace before the status */
  background: var(--accent);       /* single accent colour */
  transform-origin: left center;   /* draws from the reading edge */
  will-change: transform;          /* animated by line-reveal */
}

.info-card-kicker {
  font-family: var(--font-label);  /* family label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* status label at the floor */
  font-weight: 700;                /* crisp caps */
  line-height: 1.3;                /* tracked text breathes */
  letter-spacing: var(--label-tracking); /* exact 0.24em */
  text-transform: uppercase;       /* status stamp */
  color: var(--label-color);       /* accent-coloured label */
}

.info-card-claim {
  margin-top: calc(16px * var(--scale)); /* claim follows the status */
  font-size: calc(47px * var(--scale) * var(--type-scale)); /* primary assertion */
  font-weight: var(--display-weight); /* exact editorial 600 */
  line-height: 1.12;               /* balanced wrapped headline */
  letter-spacing: var(--display-tracking); /* exact editorial setting */
  color: var(--text-color);        /* primary ink */
}

.info-card-finding {
  margin-top: calc(24px * var(--scale)); /* finding is a second section */
  padding-top: calc(20px * var(--scale)); /* air after the divider */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 24%, transparent); /* neutral rule */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* readable explanation */
  font-weight: 400;                /* prose weight */
  line-height: 1.38;               /* comfortable for two or three rows */
  color: var(--text-color);        /* the finding must not be dimmed away */
}

.info-card-source {
  margin-top: calc(20px * var(--scale)); /* separate attribution */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.35;               /* supports a wrapped citation */
  color: var(--text-dim);          /* subordinate but legible */
}

${emptySystemLines(['.info-card-kicker', '.info-card-claim', '.info-card-finding', '.info-card-source'])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

export const EDITORIAL_EXPLAINER_SAMPLES = {
  kicker: 'EXPLAINER',
  headline: 'Why the river changes course',
  body:
    'Sediment builds on the inside of each bend while the outside bank erodes. Over time, ' +
    'the loop tightens until the river cuts a shorter path.',
  source: 'Field notes · Delta Research Unit',
};

/** card62 "Explainer Folio" - editorial explainer, sibling of lt27 Column Rule. */
export const card62: TemplateVariant = defineCardVariant(
  {
    id: 'card62',
    category: 'info-card',
    name: 'Explainer Folio',
    styleTag: 'editorial',
    description: 'Headline and readable explanation set beside a printed column rule.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, EDITORIAL_EXPLAINER_SAMPLES),
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-right',
  },
  {
    name: 'Explainer Folio',
    description:
      'The explainer in the lt27 Column Rule family: a vertical printed rule, a tracked ' +
      'section label, one set headline, readable prose and an explicit source.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Explainer Folio: column rule beside label, headline, prose and source. -->
    <div class="info-card-box">
      <div class="info-card-copy">
${systemMasks(o, [
  [0, 'info-card-kicker'],
  [1, 'info-card-heading'],
  [2, 'info-card-body'],
  [3, 'info-card-source'],
], '        ')}
      </div>
      <div class="info-card-accent"></div>
    </div>`,
    css: `/* The open folio - the rule and whitespace are the structure. */
.info-card-box {
  display: flex;                   /* copy beside the outer rule */
  align-items: stretch;            /* rule follows the text height */
  gap: calc(32px * var(--scale));  /* generous editorial whitespace */
  padding: calc(18px * var(--scale)) 0; /* no card edge */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.58));
}

.info-card-copy {
  min-width: 0;                    /* long words wrap rather than push the rule */
  max-width: calc(820px * var(--scale)); /* readable prose measure */
  text-align: right;               /* aligns toward the right anchor and its rule */
}

.info-card-accent {
  width: var(--accent-weight);     /* exact 2 px editorial rule */
  background: var(--accent);       /* one accent colour */
  flex: none;                      /* never squeezed */
  transform-origin: center bottom; /* draws upward beside the story */
  will-change: transform;          /* preset animates the rule */
}

.info-card-kicker {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small caps at the floor */
  font-weight: 700;                /* crisp label */
  line-height: 1.3;                /* room for tracking */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* editorial section label */
  color: var(--label-color);       /* accent-coloured label */
}

.info-card-heading {
  margin-top: calc(14px * var(--scale)); /* tied to the kicker */
  font-size: calc(52px * var(--scale) * var(--type-scale)); /* primary heading */
  font-weight: var(--display-weight); /* exact editorial display weight */
  line-height: 1.1;                /* balanced wrap */
  letter-spacing: var(--display-tracking); /* exact editorial setting */
  color: var(--text-color);        /* primary text */
}

.info-card-body {
  margin-top: calc(22px * var(--scale)); /* prose begins a new beat */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* readable running text */
  font-weight: 400;                /* prose weight */
  line-height: 1.42;               /* comfortable reading */
  color: var(--text-color);        /* the explanation is never dimmed */
}

.info-card-source {
  margin-top: calc(19px * var(--scale)); /* separate citation */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* attribution survives compression */
  line-height: 1.35;               /* supports wrap */
  color: var(--text-dim);          /* subordinate */
}

${emptySystemLines(['.info-card-kicker', '.info-card-heading', '.info-card-body', '.info-card-source'])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 860,
  }),
);

export const EDITORIAL_NOTICE_SAMPLES = {
  label: 'PUBLIC NOTICE',
  headline: 'Library entrance closed for essential repairs',
  body: 'Use the east entrance on Market Street. Step-free access remains available.',
  action: 'Allow an extra five minutes for entry',
  contact: 'City Library · 020 7946 0142',
};

/** card63 "Public Notice Sheet" - editorial public notice, sibling of lt25 Masthead. */
export const card63: TemplateVariant = defineCardVariant(
  {
    id: 'card63',
    category: 'info-card',
    name: 'Public Notice Sheet',
    styleTag: 'editorial',
    description: 'Official notice with a printed authority header, action line and contact.',
    maxLines: 5,
    suggestedLines: typeLines(NOTICE_FIELDS, EDITORIAL_NOTICE_SAMPLES),
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Public Notice Sheet',
    description:
      'The official notice in the lt25 Masthead family: a flat paper surface, printed top rule, ' +
      'undimmed action line and explicit issuing authority. Its existing notice-level machine ' +
      'can escalate the wash without replacing the card.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Public Notice Sheet: authority label, notice, action and contact. -->
    <div class="info-card-box">
      <div class="info-card-alert"></div>
      <div class="info-card-content">
        <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-label'],
  [1, 'info-card-heading'],
  [2, 'info-card-body'],
  [3, 'info-card-action'],
  [4, 'info-card-contact'],
], '        ')}
      </div>
    </div>`,
    css: `/* The flat public sheet - square, opaque and fast to read. */
.info-card-box {
  position: relative;              /* contains the escalation wash */
  overflow: hidden;                /* wash never escapes the sheet */
  background: var(--panel-bg);     /* printed paper */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* restrained lift */
}

.info-card-alert {
  position: absolute;              /* level wash sits behind the words */
  inset: 0;                        /* covers the full notice */
  background: color-mix(in srgb, var(--accent) 16%, transparent); /* restrained escalation */
  opacity: 0;                      /* standard level rests clear */
  will-change: opacity;            /* the notice machine animates this layer */
}

.info-card-content {
  position: relative;              /* words stay above the wash */
  z-index: 1;                      /* guarantee readable text */
  padding: calc(38px * var(--scale)) calc(52px * var(--scale)) calc(42px * var(--scale));
}

.info-card-accent {
  width: 100%;                     /* printed rule spans the notice */
  height: var(--accent-weight);    /* exact editorial 2 px */
  margin-bottom: calc(21px * var(--scale)); /* air before the authority */
  background: var(--accent);       /* one accent colour */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* preset animates it */
}

.info-card-label {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* public label at the floor */
  font-weight: 700;                /* clear authority stamp */
  line-height: 1.3;                /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* notice register */
  color: var(--label-color);       /* accent-coloured label */
}

.info-card-heading {
  margin-top: calc(15px * var(--scale)); /* headline follows authority */
  font-size: calc(48px * var(--scale) * var(--type-scale)); /* primary notice */
  font-weight: var(--display-weight); /* exact editorial display weight */
  line-height: 1.12;               /* supports a two-row warning */
  letter-spacing: var(--display-tracking); /* exact editorial setting */
  color: var(--text-color);        /* primary ink */
}

.info-card-body {
  margin-top: calc(18px * var(--scale)); /* explanation follows the event */
  font-size: calc(27px * var(--scale) * var(--type-scale)); /* readable once, at speed */
  font-weight: 400;                /* prose weight */
  line-height: 1.4;                /* comfortable body leading */
  color: var(--text-color);        /* obligatory information is never dimmed */
}

.info-card-action {
  margin-top: calc(24px * var(--scale)); /* action is a distinct section */
  padding-top: calc(18px * var(--scale)); /* air after the rule */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent); /* neutral divider */
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* action line stays prominent */
  font-weight: 600;                /* actionable information */
  line-height: 1.3;                /* supports wrapping */
  color: var(--text-color);        /* never dim the instruction */
}

.info-card-contact {
  margin-top: calc(16px * var(--scale)); /* issuing authority and contact */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.35;               /* supports wrap */
  color: var(--text-dim);          /* subordinate but present */
}

${emptySystemLines([
  '.info-card-label',
  '.info-card-heading',
  '.info-card-body',
  '.info-card-action',
  '.info-card-contact',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 960,
  }),
);

/** card64 "Results Ledger" - agenda/results board, sibling of lt28 Feature Center. */
export const card64: TemplateVariant = defineCardVariant(
  {
    id: 'card64',
    category: 'info-card',
    name: 'Results Ledger',
    styleTag: 'editorial',
    description: 'Agenda or compact results board arranged as a ruled editorial ledger.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading', sample: 'SESSION RESULTS' },
      { title: 'Row 1', sample: '01 · North District · 42' },
      { title: 'Row 2', sample: '02 · Central District · 37' },
      { title: 'Row 3', sample: '03 · Harbour District · 31' },
      { title: 'Source', sample: 'Certified 18:42 · Returning officer' },
    ],
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Results Ledger',
    description:
      'The compact agenda and results board in the lt28 Feature Center family: a flat paper ' +
      'ledger with one masthead rule, aligned rows and a source line. No sports slabs or full-frame treatment.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Results Ledger: heading, three operator rows, certification/source. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-ledger-title'],
  [1, 'info-card-ledger-row'],
  [2, 'info-card-ledger-row'],
  [3, 'info-card-ledger-row'],
  [4, 'info-card-ledger-source'],
])}
    </div>`,
    css: `/* The ledger - a flat printed board with no chip or glass treatment. */
.info-card-box {
  width: calc(1040px * var(--scale)); /* stable columns inside the safe area */
  max-width: calc(1040px * var(--scale)); /* rows wrap before they leave the board */
  padding: calc(37px * var(--scale)) calc(52px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);     /* paper surface */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* one restrained lift */
}

.info-card-accent {
  width: 100%;                     /* rule spans the ledger */
  height: var(--accent-weight);    /* exact editorial 2 px */
  margin-bottom: calc(21px * var(--scale)); /* space before the heading */
  background: var(--accent);       /* single accent colour */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* animated rule */
}

.info-card-ledger-title {
  display: block;                  /* owns the full row */
  padding-bottom: calc(17px * var(--scale)); /* air before the data rows */
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* masthead scale */
  font-weight: 700;                /* crisp section head */
  line-height: 1.25;               /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* ledger heading */
  color: var(--label-color);       /* accent-coloured masthead */
}

.info-card-ledger-row {
  display: block;                  /* each field owns one ruled row */
  padding: calc(15px * var(--scale)) 0; /* generous row rhythm */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent); /* printed rule */
  font-size: calc(29px * var(--scale) * var(--type-scale)); /* results remain readable */
  font-weight: 500;                /* set, not shouted */
  line-height: 1.25;               /* compact rows */
  font-variant-numeric: tabular-nums; /* values align */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  color: var(--text-color);        /* primary ink */
}

.info-card-ledger-source {
  display: block;                  /* source closes the ledger */
  padding-top: calc(18px * var(--scale)); /* space after the last row */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent); /* closing rule */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* certification survives compression */
  line-height: 1.35;               /* supports wrap */
  color: var(--text-dim);          /* subordinate */
}

${emptySystemLines([
  '.info-card-ledger-title',
  '.info-card-ledger-row',
  '.info-card-ledger-source',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1040,
  }),
);

/** card65 "Sponsor Read" - editorial sponsor-read panel, sibling of lt29 Imprint. */
export const card65: TemplateVariant = defineCardVariant(
  {
    id: 'card65',
    category: 'info-card',
    name: 'Sponsor Read',
    styleTag: 'editorial',
    description: 'Prepared sponsor copy with disclosure, offer and destination in a print-led hierarchy.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Disclosure', sample: 'SPONSORED BY NORTHSTAR COFFEE' },
      { title: 'Read', sample: 'Roasted this week and delivered direct from independent growers.' },
      { title: 'Offer', sample: '20% off your first order with code LIVE20' },
      { title: 'Destination', sample: 'northstar.example · Terms apply' },
    ],
    logo: 'optional',
    animationPresets: [...editorialMotion],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Sponsor Read',
    description:
      'The sponsor-read panel in the lt29 Imprint family: a disclosure-first printed rule, ' +
      'prepared read, offer and destination. The logo is optional and never replaces the disclosure.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Sponsor Read: disclosure, prepared read, offer and destination. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-sponsor-label'],
  [1, 'info-card-sponsor-read'],
  [2, 'info-card-sponsor-offer'],
  [3, 'info-card-sponsor-link'],
])}
    </div>`,
    css: `/* The sponsor folio - flat ink, ruled like an advertisement rather than a badge. */
.info-card-box {
  padding: calc(31px * var(--scale)) calc(44px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);     /* flat printed ink */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* one restrained lift */
}

.info-card-accent {
  width: calc(240px * var(--scale)); /* short disclosure rule */
  height: var(--accent-weight);     /* exact 2 px editorial rule */
  margin-bottom: calc(18px * var(--scale)); /* space before disclosure */
  background: var(--accent);       /* single accent colour */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* animated rule */
}

.info-card-sponsor-label {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* disclosure at the floor */
  font-weight: 700;                /* never visually lost */
  line-height: 1.3;                /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* disclosure register */
  color: var(--label-color);       /* accent-coloured disclosure */
}

.info-card-sponsor-read {
  margin-top: calc(13px * var(--scale)); /* attached to disclosure */
  font-size: calc(34px * var(--scale) * var(--type-scale)); /* prepared read is primary */
  font-weight: var(--display-weight); /* exact editorial 600 */
  line-height: 1.23;               /* readable across two rows */
  letter-spacing: var(--display-tracking); /* exact editorial setting */
  color: var(--text-color);        /* primary text */
}

.info-card-sponsor-offer {
  margin-top: calc(19px * var(--scale)); /* offer begins a new beat */
  padding-top: calc(16px * var(--scale)); /* air after divider */
  border-top: 1px solid rgba(255, 255, 255, 0.20); /* neutral divider */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* offer line */
  font-weight: 600;                /* actionable */
  line-height: 1.3;                /* wraps cleanly */
  color: var(--text-color);        /* full contrast */
}

.info-card-sponsor-link {
  margin-top: calc(11px * var(--scale)); /* tied to the offer */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* destination at floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.35;               /* supports wrap */
  color: var(--text-dim);          /* subordinate terms line */
}

${emptySystemLines([
  '.info-card-sponsor-label',
  '.info-card-sponsor-read',
  '.info-card-sponsor-offer',
  '.info-card-sponsor-link',
])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1080,
  }),
);

/** card66 "Prepared Caption" - editorial caption, sibling of lt31 Standfirst. */
export const card66: TemplateVariant = defineCardVariant(
  {
    id: 'card66',
    category: 'info-card',
    name: 'Prepared Caption',
    styleTag: 'editorial',
    description: 'Prepared caption band with a speaker label, full sentence and source.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Speaker or cue', sample: 'DR MAYA SINGH' },
      { title: 'Caption', sample: 'The work begins with listening carefully to the people who live here.' },
      { title: 'Source', sample: 'Recorded interview · 24 July 2026' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Prepared Caption',
    description:
      'The prepared caption in the compact lt31 Standfirst family: a shallow flat ink band ' +
      'beneath a printed rule, with a cue, full sentence and source. It is prepared text, not a timed-text runtime.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Prepared Caption: cue, full prepared sentence and source. -->
    <div class="info-card-box">
      <div class="info-card-accent"></div>
${systemMasks(o, [
  [0, 'info-card-caption-cue'],
  [1, 'info-card-caption-text'],
  [2, 'info-card-caption-source'],
])}
    </div>`,
    css: `/* The caption band - flat ink and printed rules, never a rounded glass subtitle card. */
.info-card-box {
  width: calc(1500px * var(--scale)); /* wide caption measure inside the safe area */
  max-width: none;                 /* deliberate full-width band inside the safe area */
  padding: calc(22px * var(--scale)) calc(36px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);     /* flat ink surface */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* restrained lift */
}

.info-card-accent {
  width: 100%;                     /* rule spans the prepared line */
  height: var(--accent-weight);    /* exact editorial 2 px */
  margin-bottom: calc(15px * var(--scale)); /* space before cue */
  background: var(--accent);       /* one accent colour */
  transform-origin: left center;   /* draws first */
  will-change: transform;          /* animated rule */
}

.info-card-caption-cue {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* cue at broadcast floor */
  font-weight: 700;                /* clear speaker marker */
  line-height: 1.25;               /* tracked caps breathe */
  letter-spacing: var(--label-tracking); /* exact editorial tracking */
  text-transform: uppercase;       /* cue voice */
  color: var(--label-color);       /* accent-coloured cue */
}

.info-card-caption-text {
  display: block;                  /* prepared sentence owns the row */
  margin-top: calc(9px * var(--scale)); /* tied to its cue */
  font-size: calc(31px * var(--scale) * var(--type-scale)); /* caption reading size */
  font-weight: 500;                /* set but not headline-heavy */
  line-height: 1.32;               /* comfortable over two rows */
  letter-spacing: -0.005em;        /* prose stays natural */
  color: var(--text-color);        /* full contrast */
}

.info-card-caption-source {
  display: block;                  /* source closes the band */
  margin-top: calc(11px * var(--scale)); /* separate attribution */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.3;                /* supports wrap */
  color: var(--text-dim);          /* subordinate source */
}

${emptySystemLines(['.info-card-caption-cue', '.info-card-caption-text', '.info-card-caption-source'])}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1500,
  }),
);

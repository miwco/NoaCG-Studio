// ss08 "Please Stand By" — the technical-pause card. Minimal family, sibling of ss01 and lt02.
//
// This is the one holding screen with NO CLOCK, and that is the design decision, not an
// omission. When a desk has lost a feed nobody knows when it comes back, so a countdown here
// is a promise the gallery cannot keep — and a card that reaches 0:00 while the picture is
// still black is worse than no number at all. The card holds calmly and says only what is
// true: something is being fixed, and the show has not been abandoned.
//
// It ships on the "Quiet hold" preset, which is the hold loop with the countdown calls
// removed. The breath is on the accent rule, so the screen visibly lives while it waits.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss08: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss08',
    category: 'starting-soon',
    name: 'Please Stand By',
    styleTag: 'minimal',
    description: 'The technical-pause card — deliberately no countdown, because nobody can promise one.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Headline', sample: 'PLEASE STAND BY' },
      { title: 'Note', sample: 'We are resolving a technical problem and will return shortly' },
    ],
    logo: 'none',
    animationPresets: ['hold-still'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Please Stand By',
    description:
      'A calm technical-pause screen: tracked caps headline over one honest sentence, ' +
      'separated by a breathing accent rule. No countdown by design — a technical fault has ' +
      'no known end, and a clock that runs out on a black picture reads as abandonment.',
    uicolor: '1',
  },
  (o) => ({
    lineCount: 2,
    clock: 'none',
    lineDefaults: [
      { title: 'Headline', sample: 'PLEASE STAND BY' },
      { title: 'Note', sample: 'We are resolving a technical problem and will return shortly' },
    ],
    // Headline (f0) → breathing rule → note (f1). The rule sits BETWEEN the two lines here
    // (rather than under them as in ss01) so the eye lands on the headline first and the
    // explanation second, which is the order a viewer needs them in.
    html: `    <!-- Please Stand By: caps headline, breathing accent rule, one honest sentence. -->
    <div class="starting-soon-box">
      <!-- Headline (f0) — tracked caps: the announcement voice. -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-show">${o.lines[0]?.sample || 'PLEASE STAND BY'}</span></div>
      <!-- The accent rule — the design's one color moment, and the breath target. -->
      <div class="starting-soon-rule starting-soon-pulse"></div>
      <!-- Note (f1) — the sentence that says what is actually happening. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-note">${o.lines[1]?.sample || 'We are resolving a technical problem and will return shortly'}</span></div>
    </div>`,
    css: `/* The stack: no panel — centered type and whitespace, like every minimal hold. */
.starting-soon-box {
  display: flex;                   /* stack the pieces vertically… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* every line sits on the same center axis */
  text-align: center;              /* wrapped rows stay centered too */
  gap: calc(26px * var(--scale));  /* generous, even air — the card is not in a hurry */
}

/* The headline — tracked caps at announcement size. */
.starting-soon-show {
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* full-frame headline scale */
  font-weight: var(--display-weight);  /* the card's authored display weight */
  line-height: 1.1;                /* big text sits tight */
  letter-spacing: 0.06em;          /* caps at this size need air between them */
  text-transform: uppercase;       /* the announcement voice, whatever the operator types */
  color: var(--text-color);        /* primary text color */
}

/* The accent rule — the one small dose of color, and the hold's breath target. */
.starting-soon-rule {
  width: calc(120px * var(--scale));  /* a short stroke — a mark, not a rule across the card */
  height: var(--accent-weight);    /* the card's authored accent weight */
  background: var(--accent);       /* the single color moment */
  will-change: transform;          /* hint the browser: the breath scales this */
}

/* The note — the honest sentence. Wider measure than the headline: it is read, not scanned. */
.starting-soon-note {
  max-width: calc(760px * var(--scale));  /* a comfortable reading measure, ~10 words a row */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* ~2.5:1 under the headline */
  font-weight: 400;                /* conversational weight — this line is spoken */
  line-height: 1.4;                /* prose leading: this may wrap to two or three rows */
  color: var(--text-dim);          /* secondary text color */
}`,
    tokens: {
      accentWeight: 'calc(2px * var(--scale))',
      displayWeight: '600',
    },
  }),
);

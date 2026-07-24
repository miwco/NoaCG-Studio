// al07 "Technical Notice" — the apology strip. A transmission fault, a lost feed, a delayed
// start: the calmest graphic in the pack, because the one thing a technical problem must not
// do is look like an emergency.
//
// It carries NO severity flag and NO level machine, and that is the design rather than an
// omission: "we have a problem" has exactly one level. A graphic that offered an Emergency
// button here would be claiming a state it has no meaning for.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { alertLineMasks, defineAlertVariant } from './shared';

export const al07: TemplateVariant = defineAlertVariant(
  {
    id: 'al07',
    category: 'alert',
    name: 'Technical Notice',
    styleTag: 'minimal',
    description: 'A calm technical-difficulty strip — no severity flag, because there is no level.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Notice', sample: 'We are aware of a problem with this transmission' },
      { title: 'Reassurance', sample: 'Normal service will resume as soon as possible' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'blur-in', 'mask-wipe'],
    defaultPalette: paletteById('porcelain'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Technical Notice',
    description:
      'The apology strip: a pale, quiet band with a small keyline mark, a plain statement of ' +
      'the fault and a line of reassurance. Deliberately the least alarming graphic in the ' +
      'pack — a technical problem should never wear an emergency face.',
    uicolor: '6',
  },
  (o) => ({
    html: `    <!-- Technical Notice: a keyline mark, then two calm lines. -->
    <div class="alert-box">
      <!-- The mark. A neutral bracket, not a warning sign: it says "a message", nothing more. -->
      <div class="alert-mark" aria-hidden="true"></div>
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The band — pale and flat. The porcelain palette inverts the pack's usual dark
   panel on purpose: a light notice reads as information, a dark one as a warning. */
.alert-box {
  display: flex;                   /* mark left, text column filling the rest */
  align-items: center;             /* everything on one centreline */
  gap: calc(26px * var(--scale));  /* air between the mark and the words */
  width: calc(1280px * var(--scale));  /* wide, but not the whole safe area */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(26px * var(--scale)) calc(36px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's corner radius */
  background: var(--panel-bg);     /* the palette's panel — pale, in porcelain */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
}

/* The mark — a plain vertical rule in the accent. The pack's one place where a coloured
   element is NOT a severity signal, which is exactly why it is a rule and not a chip. */
.alert-mark {
  flex-shrink: 0;                  /* never squeezed by the text */
  align-self: stretch;             /* the rule spans the text block's height */
  width: var(--accent-weight);     /* the family's accent thickness */
  background: var(--accent);       /* the one accent surface in this design */
}

/* The text column — two lines, no hierarchy games. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* notice, then reassurance */
  gap: calc(6px * var(--scale));   /* the two lines are one thought */
  min-width: 0;                    /* let a long line wrap instead of stretching the flex row */
  text-align: left;                /* a notice reads left to right, whatever the zone */
}

/* The notice — what has happened, in plain words. */
.alert-name {
  font-size: calc(30px * var(--scale) * var(--type-scale)); /* present, not loud */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.18;               /* a wrapped notice stays one block */
  color: var(--text-color);        /* primary text color */
}

/* The reassurance — the second half of the sentence a viewer actually wants. */
.alert-title {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* clearly subordinate */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.3;                /* comfortable across a wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
  }),
);

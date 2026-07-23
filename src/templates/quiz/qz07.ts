// qz07 "Frost Split" — the GLASS two-answer board, sibling of qz03 "Frost Quiz" and lt08
// "Frosted Card". A frosted panel carrying the question over two equal glass answer blocks,
// each capped by a softly-rounded accent letter chip: the shape a true/false, a this-or-that
// and an A/B call all take on air.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, TWO_ANSWER_CONTENT } from './shared';

const C = TWO_ANSWER_CONTENT;

export const qz07: TemplateVariant = defineQuizVariant(
  {
    id: 'qz07',
    category: 'quiz',
    name: 'Frost Split',
    styleTag: 'glass',
    description: 'A frosted board for two answers: the question over two equal glass answer blocks.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Split',
    description:
      'The glass two-answer board, sibling of qz03 Frost Quiz and lt08 Frosted Card: a frosted ' +
      'panel with the question over two equal glass blocks, each led by a softly-rounded accent ' +
      'letter chip. On Continue the correct block floods accent while the other fades.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: the frosted card holds the masked question and a two-column answer grid. The
    // grid keeps the blocks EQUAL however uneven the two answers are.
    html: `    <!-- Frost Split: frosted card — question on top, two equal glass answer blocks. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The two answers. Each block carries .quiz-option (the shared look the reveal marks
           through) and .quiz-option-N (its own animation identity for the staggered entrance). -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
      </div>
    </div>`,
    css: `/* The card — the frosted glass panel; presets tween this element (y + opacity). */
.quiz-box {
  padding: calc(30px * var(--scale)) calc(40px * var(--scale));  /* generous card air */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The question — the family's heavier weight, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The two answers: a GRID, not a flex row. Two 1fr tracks stay equal whatever the answers
   say, so a one-word answer beside a long one still reads as two halves of one choice. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: grid;                   /* two tracks… */
  grid-template-columns: 1fr 1fr;  /* …of exactly equal width */
  gap: calc(12px * var(--scale));  /* the split between the two blocks */
}

/* One answer block — a second layer of glass; the reveal repaints it through .quiz-correct. */
.quiz-option {
  position: relative;              /* anchors the painted block chip (::before) */
  display: flex;                   /* chip and text stack… */
  flex-direction: column;          /* …one above the other */
  align-items: center;             /* centered on the block's axis */
  justify-content: center;         /* and centered in its height */
  gap: calc(12px * var(--scale));  /* air between the chip and the answer */
  min-width: calc(200px * var(--scale));  /* a block never shrinks to its text */
  min-height: calc(128px * var(--scale)); /* both halves keep the same standing height */
  padding: calc(20px * var(--scale)) calc(18px * var(--scale));  /* room around the answer */
}

/* The block chip — a faint layer of glass with a soft keyline. */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the block exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter chip and the text */
  background: rgba(255, 255, 255, 0.08);  /* a faint layer of glass */
  border-radius: calc(12px * var(--scale));  /* a softly-rounded glass block */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);  /* a soft keyline */
}

/* The letter chip — a rounded accent square naming the answer, dark ink on the accent. */
.quiz-letter {
  width: calc(48px * var(--scale));   /* a chunky block… */
  height: calc(48px * var(--scale));  /* …the chip is the answer's marker */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  border-radius: calc(12px * var(--scale));  /* the family's soft glass radius */
  background: var(--accent);       /* the accent block */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answer */
  font-weight: 800;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The answer — centered under its chip. */
.quiz-text {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* a two-answer board can shout louder */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.2;                /* leading if a long answer wraps */
  text-align: center;              /* the answer sits under the middle of its chip */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the block floods accent, the money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint glass becomes the loud accent slab */
  box-shadow: none;                /* the flood replaces the keyline */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* dark ink on the flooded block */
  font-weight: 700;                /* the winner steps up a weight */
}
.quiz-correct .quiz-letter {
  background: rgba(255, 255, 255, 0.9);  /* the chip inverts — a pale marker on the accent block */
  color: var(--accent);            /* accent letter on the pale chip */
}

/* Dim — fade the block's LAYERS, not the block (the entrance tween leaves an inline opacity
   on .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* the losing half drops back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the pick, before the reveal. An accent keyline ring only. */
.quiz-sel::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked half steps back so the chosen block is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong — the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
}
.quiz-wrong .quiz-letter {
  background: #e57a7d;             /* the losing block's marker carries the colour */
  color: #ffffff;                  /* pale ink on the down-colour chip */
}`,
    hasAccent: false, // the accent moments are the letter chips and the reveal, not a .quiz-accent element
  }),
  undefined,
  TWO_ANSWER_CONTENT,
);

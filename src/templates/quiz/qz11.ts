// qz11 "Frost Triple" — the GLASS three-answer board, sibling of qz03 "Frost Quiz" and lt08
// "Frosted Card". A frosted panel with the question over three glass answer chips, each led by
// a softly-rounded accent letter block. Three answers earn the room the fourth row would have
// used: the chips stand taller and the answer type steps up.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, THREE_ANSWER_CONTENT } from './shared';

const C = THREE_ANSWER_CONTENT;

export const qz11: TemplateVariant = defineQuizVariant(
  {
    id: 'qz11',
    category: 'quiz',
    name: 'Frost Triple',
    styleTag: 'glass',
    description: 'A frosted board for three answers: the question over three tall glass answer chips.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Triple',
    description:
      'The glass three-answer board, sibling of qz03 Frost Quiz and lt08 Frosted Card: a frosted ' +
      'panel with the question over three tall glass answer chips, each led by a softly-rounded ' +
      'accent letter block. On Continue the correct chip floods accent while the other two fade.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: the frosted card holds the masked question and three answer chips.
    html: `    <!-- Frost Triple: frosted card — question on top, three glass answer chips below. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The answers: accent letter block + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">${C.answers[2]}</span></div>
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

/* The answer stack — three tall chips under the question. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one chip per answer */
  gap: calc(13px * var(--scale));  /* even air between the chips */
}

/* One answer chip — a softly-rounded layer of glass; the reveal repaints it. */
.quiz-option {
  position: relative;              /* anchors the painted chip (::before) */
  display: flex;                   /* letter block + answer text side by side */
  align-items: center;             /* text centers on the letter block's height */
  min-height: calc(56px * var(--scale));  /* uniform chip height; grows if an answer wraps */
}

/* The chip's glass — a faint layer with a soft keyline. */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the chip exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter block and the text */
  background: rgba(255, 255, 255, 0.08);  /* a faint layer of glass */
  border-radius: calc(12px * var(--scale));  /* a softly-rounded glass chip */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);  /* a soft keyline */
}

/* The letter block — a rounded accent block leading each chip, dark ink on the accent. */
.quiz-letter {
  flex-shrink: 0;                  /* the block never squeezes; text takes the rest */
  align-self: stretch;             /* the block fills the chip's full height, however tall */
  width: calc(54px * var(--scale));   /* a chunky block */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  margin-right: calc(18px * var(--scale));  /* air between the block and the answer text */
  border-radius: calc(12px * var(--scale)) 0 0 calc(12px * var(--scale));  /* rounds the chip's leading corner */
  background: var(--accent);       /* the accent block */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answers */
  font-weight: 800;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The answer text — a step up from the four-answer board's list scale. */
.quiz-text {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* subordinate to the question, louder than a list */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.25;               /* leading if a long answer wraps */
  color: var(--text-color);        /* primary text color */
  padding: calc(8px * var(--scale)) calc(20px * var(--scale)) calc(8px * var(--scale)) 0;  /* text never touches the chip's right edge */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the chip floods accent, the money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint glass becomes the loud accent slab */
  box-shadow: none;                /* the flood replaces the keyline */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* dark ink on the flooded chip */
  font-weight: 700;                /* the winner steps up a weight */
}
.quiz-correct .quiz-letter {
  background: rgba(255, 255, 255, 0.9);  /* the block inverts — a pale leading edge on the accent chip */
  color: var(--accent);            /* accent letter on the pale block */
}

/* Dim — fade the wrong chips' LAYERS, not the chip (the entrance tween leaves an inline
   opacity on .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the pick, before the reveal. An accent keyline ring only. */
.quiz-sel::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked chips step back so the chosen one is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong — the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
}
.quiz-wrong .quiz-letter {
  background: #e57a7d;             /* the losing chip's leading edge carries the colour */
  color: #ffffff;                  /* pale ink on the down-colour block */
}`,
    hasAccent: false, // the accent moments are the letter blocks and the reveal, not a .quiz-accent element
  }),
  undefined,
  THREE_ANSWER_CONTENT,
);

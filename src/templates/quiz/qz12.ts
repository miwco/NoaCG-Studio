// qz12 "Clean Triple" — the MINIMAL three-answer board, sibling of qz04 "Clean Quiz" and lt01
// "Hairline". A restrained near-black panel: the question over a dim keyline, then three answer
// rows separated by thin hairlines, each led by a small accent letter in a keyline ring. Three
// answers earn the room the fourth row would have used, so the rows breathe.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, THREE_ANSWER_CONTENT } from './shared';

const C = THREE_ANSWER_CONTENT;

export const qz12: TemplateVariant = defineQuizVariant(
  {
    id: 'qz12',
    category: 'quiz',
    name: 'Clean Triple',
    styleTag: 'minimal',
    description: 'A quiet board for three answers: a question over a keyline, three hairline-split rows.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Triple',
    description:
      'The minimal three-answer board, sibling of qz04 Clean Quiz and lt01 Hairline: a restrained ' +
      'near-black panel with the question over a dim keyline and three answer rows split by thin ' +
      'hairlines, each led by a small accent letter in a keyline ring. On Continue the correct row ' +
      'fills accent while the other two fade.',
    uicolor: '1',
  },
  (o) => ({
    // Structure: the quiet card holds the masked question, a keyline, and three answer rows.
    html: `    <!-- Clean Triple: quiet card — question, keyline, three hairline-separated answer rows. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The keyline — a dim rule closing the question block. -->
      <div class="quiz-rule"></div>
      <!-- The answers: a small accent letter + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">${C.answers[2]}</span></div>
      </div>
    </div>`,
    css: `/* The card — restrained and near-black, the minimal family's quiet slab. */
.quiz-box {
  padding: calc(30px * var(--scale)) calc(40px * var(--scale));  /* generous card air */
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
}

/* The question — confident display type, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The keyline — a thin dim rule under the question. */
.quiz-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin: calc(20px * var(--scale)) 0;  /* air above and below the rule */
  background: rgba(255, 255, 255, 0.16);  /* dim, not accent — the color stays in the letters */
}

/* The answer stack — three rows separated by thin hairlines. */
.quiz-options {
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per answer */
}

/* One answer row — no chip, just the letter, the text, and a hairline below. Taller than the
   four-answer board's rows: three answers can afford the air. */
.quiz-option {
  position: relative;              /* anchors the row's hairline (::before) */
  display: flex;                   /* letter + answer text side by side */
  align-items: center;             /* text centers on the letter's height */
  gap: calc(18px * var(--scale));  /* air between the letter and the text */
  min-height: calc(62px * var(--scale));  /* uniform row height; grows if an answer wraps */
  padding: calc(8px * var(--scale)) 0;    /* keeps a wrapped answer off the hairlines */
}

/* Thin dim separators between rows (not below the last). */
.quiz-option:not(:last-child)::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* pinned to the row's bottom edge */
  left: 0;                         /* full width… */
  right: 0;                        /* …edge to edge */
  bottom: 0;                       /* at the very bottom of the row */
  height: 1px;                     /* a true keyline */
  background: rgba(255, 255, 255, 0.10);  /* a quiet hairline between rows */
}

/* The letter — a small accent glyph in a thin keyline ring. */
.quiz-letter {
  flex-shrink: 0;                  /* the ring never squeezes; text takes the rest */
  width: calc(40px * var(--scale));   /* a small square ring… */
  height: calc(40px * var(--scale));  /* …the answer's marker */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  border-radius: calc(4px * var(--scale));  /* the family's near-square radius */
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);  /* a thin accent keyline ring */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* the letter — a marker, not a headline */
  font-weight: 700;                /* bold keeps the small glyph legible */
  color: var(--accent);            /* the letter wears the accent */
}

/* The answer text — a step up from the four-answer board's list scale. */
.quiz-text {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* subordinate to the question, louder than a list */
  font-weight: 400;                /* regular — the minimal family is quiet */
  line-height: 1.25;               /* leading if a long answer wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the letter's ring fills accent and the answer steps up; the row is the winner. */
.quiz-correct .quiz-letter {
  background: var(--accent);       /* the ring fills */
  color: var(--accent-ink);        /* dark ink on the filled letter */
}
.quiz-correct .quiz-text {
  color: var(--accent);            /* the winning answer wears the accent */
  font-weight: 600;                /* and steps up a weight */
}

/* Dim — fade the wrong rows' contents (the entrance tween leaves an inline opacity on
   .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the pick, before the reveal: the letter's ring goes solid-thick. */
.quiz-sel .quiz-letter {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked rows step back so the chosen row is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong — the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong .quiz-letter {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
  color: #e57a7d;                  /* the losing letter carries the down-colour */
}`,
    hasAccent: false, // the accent moments are the letter rings and the reveal, not a .quiz-accent element
  }),
  undefined,
  THREE_ANSWER_CONTENT,
);

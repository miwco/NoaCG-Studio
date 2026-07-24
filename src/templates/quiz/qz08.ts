// qz08 "Clean Split" — the MINIMAL two-answer board, sibling of qz04 "Clean Quiz" and lt01
// "Hairline". A restrained near-black panel: the question over a dim keyline, then two answer
// blocks separated by a single hairline rule rather than by boxes. Whitespace does the work;
// the reveal is the one loud moment.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, TWO_ANSWER_CONTENT } from './shared';

const C = TWO_ANSWER_CONTENT;

export const qz08: TemplateVariant = defineQuizVariant(
  {
    id: 'qz08',
    category: 'quiz',
    name: 'Clean Split',
    styleTag: 'minimal',
    description: 'A quiet board for two answers: the question over two halves split by a hairline.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Split',
    description:
      'The minimal two-answer board, sibling of qz04 Clean Quiz and lt01 Hairline: a restrained ' +
      'near-black panel with the question over a dim keyline and two equal answer halves divided ' +
      'by a single hairline, each led by an accent letter in a keyline ring. On Continue the ' +
      'correct half fills accent while the other fades.',
    uicolor: '1',
  },
  (o) => ({
    // Structure: the quiet card holds the masked question, a keyline, and a two-column answer
    // grid. The grid keeps the halves EQUAL however uneven the two answers are.
    html: `    <!-- Clean Split: quiet card — question, keyline, two answer halves side by side. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The keyline — a dim rule closing the question block. -->
      <div class="quiz-rule"></div>
      <!-- The two answers. Each half carries .quiz-option (the shared look the reveal marks
           through) and .quiz-option-N (its own animation identity for the staggered entrance). -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
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

/* The two answers: a GRID, not a flex row. Two 1fr tracks stay equal whatever the answers
   say, so a one-word answer beside a long one still reads as two halves of one choice. */
.quiz-options {
  display: grid;                   /* two tracks… */
  grid-template-columns: 1fr 1fr;  /* …of exactly equal width */
}

/* One answer half — no chip, just the letter, the answer, and a hairline dividing the two. */
.quiz-option {
  position: relative;              /* anchors the divider (::before) */
  display: flex;                   /* letter and text stack… */
  flex-direction: column;          /* …one above the other */
  align-items: center;             /* centered in the half */
  justify-content: center;         /* and centered in its height */
  gap: calc(14px * var(--scale));  /* air between the letter and the answer */
  min-width: calc(190px * var(--scale));  /* a half never shrinks to its text */
  min-height: calc(120px * var(--scale)); /* both halves keep the same standing height */
  padding: calc(6px * var(--scale)) calc(22px * var(--scale));  /* room around the answer */
}

/* The single hairline between the halves — the minimal family divides with a rule, not a box. */
.quiz-option:not(:last-child)::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* pinned to the half's right edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  right: 0;                        /* on the boundary between the two halves */
  width: 1px;                      /* a true keyline */
  background: rgba(255, 255, 255, 0.10);  /* a quiet hairline */
}

/* The letter — a small accent glyph in a thin keyline ring. */
.quiz-letter {
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

/* The answer — centered under its letter. */
.quiz-text {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* a two-answer board can speak up a little */
  font-weight: 400;                /* regular — the minimal family is quiet */
  line-height: 1.2;                /* leading if a long answer wraps */
  text-align: center;              /* the answer sits under the middle of its letter */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the letter's ring fills accent and the answer steps up; the half is the winner. */
.quiz-correct .quiz-letter {
  background: var(--accent);       /* the ring fills */
  color: var(--accent-ink);        /* dark ink on the filled letter */
}
.quiz-correct .quiz-text {
  color: var(--accent);            /* the winning answer wears the accent */
  font-weight: 600;                /* and steps up a weight */
}

/* Dim — fade the half's contents (the entrance tween leaves an inline opacity on
   .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* the losing half drops back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the pick, before the reveal: the letter's ring goes solid-thick. */
.quiz-sel .quiz-letter {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked half steps back so the chosen one is the standing answer. */
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
  TWO_ANSWER_CONTENT,
);

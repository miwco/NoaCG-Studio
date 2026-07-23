// qz09 "Volt Triple" — the SPORT three-answer board, sibling of qz01 "Arena Quiz" and lt06
// "Split Bar". Three answers is the shape most audience polls and pub-quiz rounds actually
// take, and it earns the room the fourth row would have used: the rows stand taller and the
// answer type steps up, so the board reads from further back than the four-answer card.
//
// Everything sport-shaped is painted on ::before layers (the -8deg lean, the block fills), so
// the preset can tween .quiz-box and .quiz-option without ever touching the family's signature.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, THREE_ANSWER_CONTENT } from './shared';

const C = THREE_ANSWER_CONTENT;

export const qz09: TemplateVariant = defineQuizVariant(
  {
    id: 'qz09',
    category: 'quiz',
    name: 'Volt Triple',
    styleTag: 'sport',
    description: 'A leaning sport board for three answers: tall lettered rows under the question.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Triple',
    description:
      'The sport three-answer board, sibling of qz01 Arena Quiz and lt06 Split Bar: a leaning ' +
      'dark slab carries the question in condensed heavy caps over three tall answer rows, each ' +
      'led by a solid accent letter block. On Continue the correct row floods accent while the ' +
      'other two fade.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: the leaning card holds the masked question and three answer rows. Each row
    // carries .quiz-option (the shared look the reveal marks through) and .quiz-option-N (its
    // own animation identity, so the entrance walks them in one after another).
    html: `    <!-- Volt Triple: leaning sport card — question on top, three answer rows below. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The answers: letter block + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">${C.answers[2]}</span></div>
      </div>
    </div>`,
    css: `/* The card: the preset tweens THIS element (y + opacity), so it carries no lean of its
   own — the slab and the accent edge are painted on pseudo-layers below. */
.quiz-box {
  position: relative;              /* anchors the painted slab (::before) and edge (::after) */
  padding: calc(30px * var(--scale)) calc(48px * var(--scale));  /* wide sides keep text clear
                                      of the slab's slanted edges */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens. */
.quiz-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* paints behind the question and the rows */
  background: var(--panel-bg);     /* near-black slab behind everything */
  border-radius: var(--panel-radius);  /* the family's panel corner radius */
  transform: skewX(-8deg);         /* SKEW: the whole card leans forward, mid-sprint */
}

/* The accent edge: a chunky slab fused to the card's leaning left side. */
.quiz-box::after {
  content: '';                     /* second painted layer on the same box */
  position: absolute;              /* pinned over the slab's left edge… */
  left: 0;                         /* …flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  z-index: -1;                     /* behind the text, above ::before (later layer wins) */
  width: var(--accent-weight);     /* the family's accent edge weight */
  background: var(--accent);       /* the family's loud color moment */
  transform: skewX(-8deg);         /* leans with the slab so the two fuse into one shape */
}

/* The question: condensed heavy caps — the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* quiz questions are shouted, not spoken */
  color: var(--text-color);        /* primary text on the dark slab */
}

/* The answer stack: three tall rows under the question, zero-radius sport rhythm. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per answer */
  gap: calc(13px * var(--scale));  /* even air between the rows */
}

/* One answer row: taller than the four-answer board's — three rows can afford the height. */
.quiz-option {
  position: relative;              /* anchors the painted row chip (::before) */
  display: flex;                   /* letter block + answer text side by side */
  align-items: center;             /* text centers on the letter block's height */
  min-height: calc(58px * var(--scale));  /* uniform row height; grows if an answer wraps */
}

/* The row chip: a faint slab behind each answer. color-mix keeps it on-palette. */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the row exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter block and the text */
  background: color-mix(in srgb, var(--text-color) 8%, transparent);  /* faint on-palette tint */
  border-radius: 0;                /* hard corners — sport shape language */
  transform: skewX(-8deg);         /* the family lean, parallel to the card slab */
}

/* The letter block: a solid accent slab leading each row. It leans on ITS ::before, so the
   letter itself stays dead straight with no counter-skew needed. */
.quiz-letter {
  position: relative;              /* anchors the painted accent block (::before) */
  flex-shrink: 0;                  /* the block never squeezes; text takes the rest */
  align-self: stretch;             /* the block fills the row's full height, however tall */
  width: calc(58px * var(--scale));   /* a chunky square-ish block */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  margin-right: calc(20px * var(--scale));  /* air between the block and the answer text */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answers */
  font-weight: 800;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The letter block's paint: solid accent, leaning with the rest of the family. */
.quiz-letter::before {
  content: '';                     /* painted layer behind the letter */
  position: absolute;              /* fills the block exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter glyph */
  background: var(--accent);       /* three small accent doses — sport uses accent boldly */
  transform: skewX(-8deg);         /* the family lean — fuses with the row chip's edge */
}

/* The answer text: condensed caps, a step up from the four-answer board's list scale. */
.quiz-text {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* subordinate to the question, louder than a list */
  font-weight: 700;                /* heavy enough to read at a glance */
  letter-spacing: 0.04em;          /* slight air between the caps */
  line-height: 1.2;                /* leading if a long answer wraps */
  text-transform: uppercase;       /* the whole card shouts */
  color: var(--text-color);        /* primary text on the dark slab */
  padding: calc(8px * var(--scale)) calc(22px * var(--scale)) calc(8px * var(--scale)) 0;  /* text never touches the chip's slanted edge */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct: the row's chip floods solid accent — the game-show money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint chip becomes the loud accent slab */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* the family's ink on an accent-filled row */
  font-weight: 800;                /* the winner steps up a weight */
}

/* Correct: the letter block inverts — a strong dark edge leading the flooded row. */
.quiz-correct .quiz-letter {
  color: var(--accent);            /* accent letter… */
}
.quiz-correct .quiz-letter::before {
  background: var(--panel-bg);     /* …on a dark block — the row's hard leading edge */
}

/* Dim: fade the row's LAYERS, not the row — the entrance tween leaves an inline opacity on
   .quiz-option itself, which would override a plain .quiz-dim opacity rule. */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected: the pick, before anyone knows if it is right. A keyline ring only — the flood is
   reserved for the reveal, so the two moments never look alike. */
.quiz-sel::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked: the unpicked rows step back, so the chosen row is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong: the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
}
.quiz-wrong .quiz-letter {
  color: #e57a7d;                  /* the losing row's leading edge carries the colour */
}`,
    hasAccent: false, // the accent edge is a painted ::after layer, not a .quiz-accent element
    tokens: {
      displayTracking: '0.01em',
    },
  }),
  undefined,
  THREE_ANSWER_CONTENT,
);

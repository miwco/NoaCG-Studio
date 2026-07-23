// qz05 "Volt Split" — the SPORT two-answer board, sibling of qz01 "Arena Quiz" and lt06
// "Split Bar". Two answers are not a short list, they are a CHOICE, so this board drops the
// stacked rows for two equal slabs standing side by side under the question: the shape a
// true/false, a this-or-that and an A/B call all take on air.
//
// Everything sport-shaped is painted on ::before layers (the -8deg lean, the block fills), so
// the preset can tween .quiz-box and .quiz-option without ever touching the family's signature.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant, TWO_ANSWER_CONTENT } from './shared';

const C = TWO_ANSWER_CONTENT;

export const qz05: TemplateVariant = defineQuizVariant(
  {
    id: 'qz05',
    category: 'quiz',
    name: 'Volt Split',
    styleTag: 'sport',
    description: 'A leaning sport board for two answers: the question over two equal accent slabs.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Split',
    description:
      'The sport two-answer board, sibling of qz01 Arena Quiz and lt06 Split Bar: a leaning ' +
      'dark slab carries the question in condensed heavy caps over two equal answer blocks, ' +
      'each led by a solid accent letter chip. On Continue the correct block floods accent ' +
      'while the other fades.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: the leaning card holds the masked question and a two-column answer grid. The
    // grid keeps the blocks EQUAL however uneven the two answers are — "True" next to a full
    // sentence still reads as one choice, not as a large option and a small one.
    html: `    <!-- Volt Split: leaning sport card — question on top, two equal answer blocks below. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The two answers. Each block carries .quiz-option (the shared look the reveal marks
           through) and .quiz-option-N (its own animation identity, so the entrance can walk
           them in one after the other and each stays separately editable). -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
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
  z-index: -1;                     /* paints behind the question and the blocks */
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

/* The two answers: a GRID, not a flex row. Two 1fr tracks stay equal whatever the answers
   say, so a one-word answer beside a long one still reads as two halves of one choice. */
.quiz-options {
  margin-top: calc(26px * var(--scale));  /* clear break between question and answers */
  display: grid;                   /* two tracks… */
  grid-template-columns: 1fr 1fr;  /* …of exactly equal width */
  gap: calc(14px * var(--scale));  /* the split between the two blocks */
}

/* One answer block: the letter chip above the answer, centered. The preset staggers these in
   and pops the winner, so the block itself is never skewed — its fill leans on ::before. */
.quiz-option {
  position: relative;              /* anchors the painted block fill (::before) */
  display: flex;                   /* chip and text stack… */
  flex-direction: column;          /* …one above the other */
  align-items: center;             /* centered on the block's axis */
  justify-content: center;         /* and centered in its height */
  gap: calc(12px * var(--scale));  /* air between the chip and the answer */
  min-width: calc(210px * var(--scale));  /* a block never shrinks to its text */
  min-height: calc(132px * var(--scale)); /* both halves keep the same standing height */
  padding: calc(20px * var(--scale)) calc(18px * var(--scale));  /* room around the answer */
}

/* The block fill: a faint slab behind each answer. color-mix keeps it on-palette — it is the
   text color at 8%, so the Style panel retints it along with everything else. */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the block exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the chip and the text */
  background: color-mix(in srgb, var(--text-color) 8%, transparent);  /* faint on-palette tint */
  border-radius: 0;                /* hard corners — sport shape language */
  transform: skewX(-8deg);         /* the family lean, parallel to the card slab */
}

/* The letter chip: a solid accent block naming the answer. It leans on ITS ::before, so the
   letter itself stays dead straight with no counter-skew needed. */
.quiz-letter {
  position: relative;              /* anchors the painted accent block (::before) */
  width: calc(52px * var(--scale));   /* a chunky square block… */
  height: calc(52px * var(--scale));  /* …the chip is the answer's marker */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answer */
  font-weight: 800;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The chip's paint: solid accent, leaning with the rest of the family. */
.quiz-letter::before {
  content: '';                     /* painted layer behind the letter */
  position: absolute;              /* fills the chip exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter glyph */
  background: var(--accent);       /* two small accent doses — sport uses accent boldly */
  transform: skewX(-8deg);         /* the family lean — fuses with the block's edge */
}

/* The answer: condensed caps, centered under its chip. */
.quiz-text {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* a two-answer board can shout louder */
  font-weight: 700;                /* heavy enough to read at a glance */
  letter-spacing: 0.04em;          /* slight air between the caps */
  line-height: 1.15;               /* leading if a long answer wraps */
  text-align: center;              /* the answer sits under the middle of its chip */
  text-transform: uppercase;       /* the whole card shouts */
  color: var(--text-color);        /* primary text on the dark slab */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct: the block floods solid accent — the game-show money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint fill becomes the loud accent slab */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
  font-weight: 800;                /* the winner steps up a weight */
}

/* Correct: the chip inverts — a dark marker on the flooded block. */
.quiz-correct .quiz-letter {
  color: var(--accent);            /* accent letter… */
}
.quiz-correct .quiz-letter::before {
  background: var(--panel-bg);     /* …on a dark chip */
}

/* Dim: fade the block's LAYERS, not the block — the entrance tween leaves an inline opacity
   on .quiz-option itself, which would override a plain .quiz-dim opacity rule. */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* the losing half drops back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected: the pick, before anyone knows if it is right. A keyline ring only — the flood is
   reserved for the reveal, so the two moments never look alike. */
.quiz-sel::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked: the unpicked half steps back, so the chosen block is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong: the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
}
.quiz-wrong .quiz-letter {
  color: #e57a7d;                  /* the losing block's marker carries the colour */
}`,
    hasAccent: false, // the accent edge is a painted ::after layer, not a .quiz-accent element
    tokens: {
      displayTracking: '0.01em',
    },
  }),
  undefined,
  TWO_ANSWER_CONTENT,
);

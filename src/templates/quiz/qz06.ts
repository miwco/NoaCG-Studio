// qz06 "House Split" — the NoaCG two-answer board, sibling of qz02 "House Quiz" and lt11
// "House Strap". The house void panel with its amber accent edge, the question in display
// type, and two equal answer blocks divided by a hairline: the shape a true/false, a
// this-or-that and an A/B call all take on air. No lean — the house family paints flat panels.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineQuizVariant, TWO_ANSWER_CONTENT } from './shared';

const C = TWO_ANSWER_CONTENT;

export const qz06: TemplateVariant = defineQuizVariant(
  {
    id: 'qz06',
    category: 'quiz',
    name: 'House Split',
    styleTag: 'noacg',
    description: 'The house board for two answers: a void panel, amber edge, two equal answer blocks.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: C.question }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Split',
    description:
      'The NoaCG two-answer board, sibling of qz02 House Quiz and lt11 House Strap: the house ' +
      'void panel with an amber accent edge, the question in display type over two equal answer ' +
      'blocks led by mono letter chips. On Continue the correct block floods amber with dark ink ' +
      'while the other fades.',
    uicolor: '4',
  },
  (o) => ({
    // Structure: the void card holds the accent edge, the masked question and a two-column
    // answer grid. The grid keeps the blocks EQUAL however uneven the two answers are.
    html: `    <!-- House Split: void card — accent edge, question on top, two equal answer blocks. -->
    <div class="quiz-box">
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="quiz-accent"></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || C.question}</span></div>
      <!-- The two answers. Each block carries .quiz-option (the shared look the reveal marks
           through) and .quiz-option-N (its own animation identity for the staggered entrance). -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">${C.answers[0]}</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">${C.answers[1]}</span></div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void panel; presets tween this element (y + opacity). */
.quiz-box {
  position: relative;              /* anchors the accent edge */
  padding: calc(30px * var(--scale)) calc(44px * var(--scale)) calc(30px * var(--scale)) calc(48px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* The accent edge — the house amber bar, fused to the card's left side with the house glow. */
.quiz-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The question — house display type, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}

/* The two answers: a GRID, not a flex row. Two 1fr tracks stay equal whatever the answers
   say, so a one-word answer beside a long one still reads as two halves of one choice. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: grid;                   /* two tracks… */
  grid-template-columns: 1fr 1fr;  /* …of exactly equal width */
  gap: calc(12px * var(--scale));  /* the split between the two blocks */
}

/* One answer block — a faint void chip; the reveal repaints this through .quiz-correct. */
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

/* The block chip — a faint on-palette tint behind each answer (house radius 6). */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the block exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter chip and the text */
  background: color-mix(in srgb, var(--text-color) 7%, transparent);  /* faint on-palette tint */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
}

/* The letter chip — a solid amber square naming the answer, dark ink on the accent. */
.quiz-letter {
  width: calc(48px * var(--scale));   /* a chunky square block… */
  height: calc(48px * var(--scale));  /* …the chip is the answer's marker */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: var(--accent);       /* the accent block */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answer */
  font-weight: 700;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The answer — centered under its chip. */
.quiz-text {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* a two-answer board can shout louder */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.2;                /* leading if a long answer wraps */
  text-align: center;              /* the answer sits under the middle of its chip */
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the block's chip floods amber, the money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint chip becomes the loud accent slab */
  box-shadow: var(--accent-glow);  /* the house glow, on the winning block */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* dark ink on the flooded chip */
  font-weight: 700;                /* the winner steps up a weight */
}
.quiz-correct .quiz-letter {
  background: var(--panel-bg);     /* the chip inverts — a dark marker on the amber block */
  color: var(--accent);            /* amber letter on the dark chip */
}

/* Dim — fade the block's LAYERS, not the block (the entrance tween leaves an inline opacity
   on .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* the losing half drops back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the pick, before the reveal. An amber keyline ring only. */
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
  color: var(--panel-bg);          /* dark ink on the down-colour chip */
}`,
    hasAccent: true,
  }),
  undefined,
  TWO_ANSWER_CONTENT,
);

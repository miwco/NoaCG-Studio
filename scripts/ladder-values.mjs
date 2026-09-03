// THE SPACE THE FIT LADDER IS SWEPT OVER - one copy, read by both the instrument
// (`scripts/svg-import-sweep.mjs --ladder`) and the gate (`e2e/import-svg-corpus.spec.ts`).
//
// They are deliberately different things: the gate pins the answers one board is KNOWN to give,
// at tolerances measured on it; the instrument asserts what has to hold for any artwork, and
// reports rather than failing. What they may never differ about is the SPACE - the options and
// the value lengths - because the sweep's whole claim is that it covers what the gate covers and
// more. Kept in one file so that claim is structural rather than a promise in a comment.

/** Question values from the length the designer drew for out to absurd.
 *
 *  `unbroken` is the case the owner found by accident ("I make spaces in a word, and it sometimes
 *  understands that it should be big"): a run with no break opportunity CANNOT wrap, so shrink
 *  really is the right answer at its second rung. It is swept so that the behaviour reads as
 *  word-breaking rather than as the randomness it looked like from the keyboard. */
export const LADDER_VALUES = {
  short: 'Who won?',
  over1: 'Which of these chess openings begins with the moves one e four e five?',
  over2: 'Which of these chess openings begins with the moves one e four e five two knight f three?',
  over3:
    'Which of these famous chess openings begins with the moves one e four, e five, two knight f three, and is named after an Italian player?',
  absurd:
    'Which of these famous chess openings begins with the moves one e four, e five, two knight f three, and is named after an Italian player who wrote about it in the sixteenth century in a book that is still read today?',
  unbroken: 'Whichofthesechessopeningsbeginswiththemovesoneefourefive',
};

/** The four rungs of the too-long ladder, spelled as the mapping step's own select spells them
 *  (`MapSvgFieldsStep.tsx`, `StretchMode`). */
export const LADDER_MODES = ['shrink', 'grow-x', 'grow-xy', 'grow-y'];

/** The two longest breakable values - the ones a growth rule has to answer for. Everything
 *  shorter can legitimately fit the room the design already had. */
export const LADDER_LONG = ['over3', 'absurd'];

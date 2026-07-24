// QUIZ BOARD — the flagship, and the type that has to prove the model at its far end.
//
// The test it answers (docs/noacg-master-goals.md §1.4): a question and four answers; reveal
// them; select any answer; change the selection freely; LOCK it, after which selection is
// structurally illegal; reveal the correct one; show the picked and the correct answer
// differently; reset cleanly for the next question.
//
// A naive machine gets this wrong in a specific way: it makes a state per answer, then a
// state per (answer × locked), and a four-option quiz needs a dozen states that are all the
// same picture with a different row highlighted. The model's answer is that the PICK is data.
// There is one `selected` state; which answer it means is the `selectedAnswer` field, applied
// atomically as the event's payload. Adding a fifth option would not add a state.
//
// And "structurally illegal" is meant literally. Nothing evaluates a condition to reject a
// late selection — there simply is no `select` arrow leaving `locked`, so the event finds no
// transition and is dropped along with its payload. That is the entire guard.
//
// The arc itself now lives in `answerBoard.ts` and is shared with the two- and three-answer
// boards, which is the same claim from the other direction: because the pick is data, a board
// with half the rows needs exactly the same states, and the three types cannot drift apart.

import { paletteById } from '../../model/wizard';
import { qz01 } from '../quiz/qz01';
import { qz02 } from '../quiz/qz02';
import { qz03 } from '../quiz/qz03';
import { qz04 } from '../quiz/qz04';
import { ANSWER_BOARD_CONTROLS, ANSWER_BOARD_MACHINE, ANSWER_BOARD_STRUCTURE } from './answerBoard';
import type { GraphicType } from './graphicType';

export const quizBoardType: GraphicType = {
  id: 'quiz-board',
  name: 'Quiz board',
  description: 'A question, four answers, a locked-in pick, and the reveal.',
  structure: ANSWER_BOARD_STRUCTURE,
  fields: [
    { key: 'question', label: 'Question', kind: 'text', value: 'Which planet is known as the Red Planet?', role: 'line' },
    { key: 'answerA', label: 'Answer A', kind: 'text', value: 'Venus', role: 'line' },
    { key: 'answerB', label: 'Answer B', kind: 'text', value: 'Mars', role: 'line' },
    { key: 'answerC', label: 'Answer C', kind: 'text', value: 'Pluto', role: 'line' },
    { key: 'answerD', label: 'Answer D', kind: 'text', value: 'Titan', role: 'line' },
    // Both dropdowns are the sanctioned exception to the broadcast field policy: four letters
    // is a genuinely constrained choice, which is exactly what that exception is for.
    {
      key: 'correctAnswer', label: 'Correct answer', kind: 'select', value: 'B', role: 'data',
      options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' }],
    },
    {
      key: 'selectedAnswer', label: 'Selected answer', kind: 'select', value: '', role: 'data',
      options: [
        { label: '—', value: '' },
        { label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' },
      ],
    },
  ],
  machine: ANSWER_BOARD_MACHINE,
  controls: ANSWER_BOARD_CONTROLS,
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'qz01',
      name: 'Arena Quiz',
      description: 'The game-show board: a leaning question slab over four lettered answer rows.',
      styleTag: 'sport',
      // The board's own authored pairing — royal behind the accent edge, archivo in the
      // letter chips. This entry had transcribed the sport family's volt/oswald instead.
      palette: paletteById('royal'),
      fontId: 'archivo',
      create: (_type, options) => qz01.create(options),
    },
    {
      // Designed FOR this cell: no noacg quiz existed. The house void card with an amber accent
      // edge and amber letter blocks — sibling of lt11 House Strap and card05 House Title.
      id: 'qz02',
      name: 'House Quiz',
      description: 'The house quiz card: a void panel, amber accent edge, four amber-lettered answer rows.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => qz02.create(options),
    },
    {
      // Designed FOR this cell: no glass quiz existed. A frosted card with softly-rounded glass
      // answer chips — sibling of lt08 Frosted Card and card09 Frost Title.
      id: 'qz03',
      name: 'Frost Quiz',
      description: 'A frosted quiz card with softly-rounded answer chips led by accent letter blocks.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      create: (_type, options) => qz03.create(options),
    },
    {
      // Designed FOR this cell: no minimal quiz existed. A quiet card with hairline-separated
      // rows and accent letter rings — sibling of lt01 Hairline and card01 Hairline Card.
      id: 'qz04',
      name: 'Clean Quiz',
      description: 'A quiet quiz card: a question over a keyline, four hairline-separated answer rows.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => qz04.create(options),
    },
  ],
};

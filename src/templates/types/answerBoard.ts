// THE ANSWER-BOARD FAMILY — one question, n answers, a locked-in pick, and the reveal.
//
// Two, three and four answers are the SAME graphic with a different number of rows, so they
// share this file's machine rather than each restating it. That sharing is only possible
// because of the model's central rule: the pick is DATA. There is one `selected` state and a
// `selectedAnswer` field, so the arc below is literally identical whether the board offers two
// options or four — adding a row adds a field, never a state.
//
// The other half of the rule is that "locked" is STRUCTURAL. Nothing evaluates a condition to
// reject a late selection — there simply is no `select` arrow leaving `locked`, so the event
// finds no transition and is dropped along with its payload. That is the entire guard, and it
// is the same guard on all three boards.
//
// The FOUR-answer board (quizBoard.ts) is the flagship and keeps its own file; it imports the
// machine from here so the three boards can never drift apart.

import { paletteById } from '../../model/wizard';
import { qz05 } from '../quiz/qz05';
import { qz06 } from '../quiz/qz06';
import { qz07 } from '../quiz/qz07';
import { qz08 } from '../quiz/qz08';
import { qz09 } from '../quiz/qz09';
import { qz10 } from '../quiz/qz10';
import { qz11 } from '../quiz/qz11';
import { qz12 } from '../quiz/qz12';
import type { GraphicType, TypeControlEvent, TypeMachine, TypeStructure } from './graphicType';

/**
 * The selection arc, shared by every answer board.
 *
 * The walk is question -> reveal -> out, so `next` alone still runs the whole thing: a board
 * dropped into any playout server without a control page degrades to "show the question,
 * reveal the answer, take it off" and nothing breaks.
 */
export const ANSWER_BOARD_MACHINE: TypeMachine = {
  main: {
    pathEvents: ['judge'],
    branches: [
      {
        id: 'selected',
        name: 'Answer selected',
        // Entering (or RE-entering) this state repaints the highlight from the data, which is
        // what makes "change the selection freely" a self-transition rather than a state.
        timeline: {
          name: 'Select',
          duration: 0.25,
          ease: 'in',
          calls: [{ time: 0, call: 'applySelection' }],
          layers: {},
        },
        edges: [
          { from: { waypoint: 0 }, to: 'selected', trigger: 'operator', event: 'select' },
          { from: 'selected', to: 'selected', trigger: 'operator', event: 'select' },
        ],
      },
      {
        id: 'locked',
        name: 'Locked in',
        timeline: {
          name: 'Lock',
          duration: 0.25,
          ease: 'in',
          calls: [{ time: 0, call: 'applyLock' }],
          layers: {},
        },
        edges: [
          { from: 'selected', to: 'locked', trigger: 'operator', event: 'lock' },
          // From here the ONLY way on is the reveal. No `select` arrow leaves this state,
          // which is what makes a late selection impossible rather than merely refused.
          { from: 'locked', to: { waypoint: 1 }, trigger: 'operator', event: 'judge' },
          // And the rejoin, so an operator who locked in can still just press Next.
          { from: 'locked', to: { waypoint: 1 }, trigger: 'operator', event: 'next' },
        ],
      },
    ],
  },
};

/** The three buttons every answer board's control page carries. */
export const ANSWER_BOARD_CONTROLS: TypeControlEvent[] = [
  { event: 'select', label: 'Select answer', section: 'Answer', order: 1, payload: ['selectedAnswer'] },
  { event: 'lock', label: 'Lock it in', section: 'Answer', order: 2 },
  { event: 'judge', label: 'Reveal correct', section: 'Answer', order: 3 },
];

/** Every answer board promises the same three parts, whatever its row count. */
export const ANSWER_BOARD_STRUCTURE: TypeStructure = {
  prefix: 'quiz',
  category: 'quiz',
  parts: [
    { id: 'box', selector: '.quiz-box', kind: 'panel', required: true },
    { id: 'question', selector: '#f0', kind: 'line', required: true },
    { id: 'options', selector: '.quiz-options', kind: 'block', required: true },
  ],
};

/** The board's two dropdowns. Four letters is a genuinely constrained choice, which is exactly
 *  what the broadcast field policy's dropdown exception is for. */
function answerDropdowns(letters: string[]): GraphicType['fields'] {
  const options = letters.map((letter) => ({ label: letter, value: letter }));
  return [
    { key: 'correctAnswer', label: 'Correct answer', kind: 'select', value: letters[1], role: 'data', options },
    {
      key: 'selectedAnswer',
      label: 'Selected answer',
      kind: 'select',
      value: '',
      role: 'data',
      options: [{ label: '—', value: '' }, ...options],
    },
  ];
}

// ── The two-answer board ─────────────────────────────────────────────────────

/** TWO-ANSWER BOARD — true/false, this-or-that, an A/B call. The commonest audience question
 *  there is, and the one that reads as a CHOICE rather than a list: its designs put the two
 *  answers side by side instead of stacking them. */
export const twoAnswerBoardType: GraphicType = {
  id: 'answer-board-2',
  name: 'Two-answer board',
  description: 'A question and two answers — true/false, this or that — with the locked-in pick and the reveal.',
  structure: ANSWER_BOARD_STRUCTURE,
  fields: [
    { key: 'question', label: 'Question', kind: 'text', value: 'The human body has 206 bones.', role: 'line' },
    { key: 'answerA', label: 'Answer A', kind: 'text', value: 'True', role: 'line' },
    { key: 'answerB', label: 'Answer B', kind: 'text', value: 'False', role: 'line' },
    ...answerDropdowns(['A', 'B']),
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
      id: 'qz05',
      name: 'Volt Split',
      description: 'A leaning sport board for two answers: the question over two equal accent slabs.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => qz05.create(options),
    },
    {
      id: 'qz06',
      name: 'House Split',
      description: 'The house board for two answers: a void panel, amber edge, two equal answer blocks.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => qz06.create(options),
    },
    {
      id: 'qz07',
      name: 'Frost Split',
      description: 'A frosted board for two answers: the question over two equal glass answer blocks.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      create: (_type, options) => qz07.create(options),
    },
    {
      id: 'qz08',
      name: 'Clean Split',
      description: 'A quiet board for two answers: the question over two halves split by a hairline.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => qz08.create(options),
    },
  ],
};

// ── The three-answer board ───────────────────────────────────────────────────

/** THREE-ANSWER BOARD — the shape most audience polls and pub-quiz rounds actually take. It
 *  earns the room the fourth row would have used: its designs stand the rows taller and step
 *  the answer type up, so the board reads from further back. */
export const threeAnswerBoardType: GraphicType = {
  id: 'answer-board-3',
  name: 'Three-answer board',
  description: 'A question and three answers, with the locked-in pick and the reveal.',
  structure: ANSWER_BOARD_STRUCTURE,
  fields: [
    { key: 'question', label: 'Question', kind: 'text', value: 'Which ocean is the largest?', role: 'line' },
    { key: 'answerA', label: 'Answer A', kind: 'text', value: 'Atlantic', role: 'line' },
    { key: 'answerB', label: 'Answer B', kind: 'text', value: 'Pacific', role: 'line' },
    { key: 'answerC', label: 'Answer C', kind: 'text', value: 'Indian', role: 'line' },
    ...answerDropdowns(['A', 'B', 'C']),
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
      id: 'qz09',
      name: 'Volt Triple',
      description: 'A leaning sport board for three answers: tall lettered rows under the question.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => qz09.create(options),
    },
    {
      id: 'qz10',
      name: 'House Triple',
      description: 'The house board for three answers: a void panel, amber edge, three tall lettered rows.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => qz10.create(options),
    },
    {
      id: 'qz11',
      name: 'Frost Triple',
      description: 'A frosted board for three answers: the question over three tall glass answer chips.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      create: (_type, options) => qz11.create(options),
    },
    {
      id: 'qz12',
      name: 'Clean Triple',
      description: 'A quiet board for three answers: a question over a keyline, three hairline-split rows.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => qz12.create(options),
    },
  ],
};

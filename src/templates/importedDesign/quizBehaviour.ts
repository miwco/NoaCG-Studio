// THE QUIZ BEHAVIOUR, bound to imported artwork (docs/GRAPHIC_BEHAVIOUR_PLAN.md).
//
// The pilot answer to the question the plan poses: how does a graphic somebody else DREW get
// the behaviour a show needs, without its author writing code?
//
// What is reused, unchanged, from the catalog quiz:
//
//   * THE MACHINE — `ANSWER_BOARD_MACHINE` (templates/types/answerBoard.ts), minus its audience
//     branch. Not a copy: the branch is filtered out of the shipped declaration below, so the
//     two can never drift. Selecting, locking, sealing and the reveal are literally the arcs the
//     catalog boards walk, guards included — "locked" is structural here for the same reason it
//     is there, because no `select` arrow leaves that state.
//   * THE CONTROLS — `ANSWER_BOARD_CONTROLS` verbatim. `compileControls` drops a declared
//     control whose event no arrow carries, so removing the audience branch removes its button
//     with no second list to keep in step.
//   * THE ATTACH — `attachMachine`, which already writes a compiled machine into any template.
//
// What had to be NEW, and why: the PAINT. The catalog's `applySelection` adds a class to a row
// it drew itself, and that class means something because our stylesheet says so. On artwork we
// did not draw, nothing can be inferred — so the designer draws each state as its own layer and
// this module only decides WHEN each one is visible (plan §4, model L2). That is the whole
// difference between the two implementations.
//
// DELIBERATELY NOT GENERALISED. There is no behaviour registry and no plugin shape here: the
// third behaviour is what would tell us the right abstraction, and it does not exist yet
// (plan §6). The seams that would carry a second one — the `DesignSvgBehaviour` union in
// model/wizard.ts and this file's shape — are in place; nothing else pretends to be generic.

import type { SpxField } from '../../model/types';
import type { DesignSvg, DesignSvgQuizBehaviour } from '../../model/wizard';
import { SVG_CANDIDATE_ATTR } from '../../assets/svgImport';
import type { AnimData, AnimStep } from '../../blocks/animData';
import { ANSWER_BOARD_CONTROLS, ANSWER_BOARD_MACHINE } from '../types/answerBoard';
import type { GraphicType, TypeField, TypeMachine } from '../types/graphicType';
import { DATA_SOURCE_CLASS } from '../shared/base';
import { PREFIX } from './shared';

/** The class every drawn state layer carries. A CLASS and never an inline style: snap clears
 *  inline properties but never classes, so a state painted inline would vanish on recovery
 *  while the machine still said it was current (the trap quiz/shared.ts documents). */
export const QUIZ_STATE_CLASS = `${PREFIX}-qstate`;

/** Added beside `QUIZ_STATE_CLASS` while that state is the one showing. */
export const QUIZ_ON_CLASS = `${PREFIX}-qon`;

/** Row letters in row order — A, B, C, … The pick is DATA (one `selected` state and a letter),
 *  which is why a board can have any number of rows without gaining a state. */
export function quizLetters(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

/** The id we stamp on a drawn state layer. Ours, not the designer's: an Illustrator file may
 *  already carry any id at all, and these have to be predictable for the runtime to find. */
function layerId(role: 'sel' | 'cor' | 'wrong', row: number): string {
  return `q-${role}-${row + 1}`;
}

/** The board-level "locked in" drawing's id. */
const LOCK_ID = 'q-lock';

/** Every id the behaviour stamps, so the binder can move a designer's colliding id aside the
 *  same way it does for the `fN` namespace. */
export function behaviourLayerIds(behaviour: DesignSvgQuizBehaviour): string[] {
  const rows = behaviour.rows.flatMap((_, i) => [layerId('sel', i), layerId('cor', i), layerId('wrong', i)]);
  return [...rows, LOCK_ID];
}

/**
 * Stamp the chosen drawings so the runtime can find them: our id, plus the state class that
 * hides them until a state shows them. Called from the markup bind, where every candidate is
 * still addressable by its marker.
 *
 * A layer the author did not pick is left completely alone — including one they drew and never
 * bound, which stays exactly as hidden (or as visible) as they exported it.
 */
export function markQuizLayers(root: Element, quiz: DesignSvgQuizBehaviour): void {
  const stamp = (candidateId: string | undefined, id: string): void => {
    if (!candidateId) return;
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
    if (!el) return;
    el.setAttribute('id', id);
    const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    if (!own.includes(QUIZ_STATE_CLASS)) own.push(QUIZ_STATE_CLASS);
    el.setAttribute('class', own.join(' '));
    // The designer hid this layer to see their base look; the stylesheet hides it now, so the
    // file's own display/visibility would fight the class that shows it.
    el.removeAttribute('display');
    el.removeAttribute('visibility');
    const style = el.getAttribute('style');
    if (style) {
      const kept = style
        .split(';')
        .filter((d) => !/^\s*(display|visibility)\s*:/i.test(d))
        .join(';');
      if (kept.trim()) el.setAttribute('style', kept);
      else el.removeAttribute('style');
    }
  };
  quiz.rows.forEach((row, i) => {
    stamp(row.selected, layerId('sel', i));
    stamp(row.correct, layerId('cor', i));
    stamp(row.wrong, layerId('wrong', i));
  });
  stamp(quiz.locked, LOCK_ID);
}

/** The two rules that make a drawn state a state. `inline` rather than `block`: these are SVG
 *  elements, and `inline` is the initial value SVG content is laid out with. */
export const quizBehaviourCss = `/* ── Drawn states (the quiz behaviour) ──
   Each layer below is artwork the DESIGNER drew for one moment — the pick, the lock, the
   verdict. NoaCG only decides when each is visible; nothing here is redrawn or generated.
   Delete a rule to see every state at once. */
.${QUIZ_STATE_CLASS} {
  display: none;                   /* drawn, and waiting for its state */
}
.${QUIZ_STATE_CLASS}.${QUIZ_ON_CLASS} {
  display: inline;                 /* SVG content lays out inline — never block */
}`;

/**
 * The two fields the behaviour adds after the artwork's own: the answer key and the pick.
 *
 * Both are dropdowns of the row letters. That is the broadcast field policy's dropdown
 * exception exactly as the catalog boards use it — four letters is a genuinely constrained
 * choice — and it is what makes the operator's "Select answer" button a pick rather than typing.
 */
export function quizBehaviourFields(quiz: DesignSvgQuizBehaviour, from: number): SpxField[] {
  const letters = quizLetters(quiz.answers.length);
  return [
    {
      field: `f${from}`,
      ftype: 'dropdown',
      title: 'Correct answer',
      value: letters[0],
      // The answer KEY: read by the reveal, never shown. Set by the producer before air.
      items: letters.map((letter) => ({ text: letter, value: letter })),
    },
    {
      field: `f${from + 1}`,
      ftype: 'dropdown',
      title: 'Selected answer',
      value: '',
      // The contestant's pick. Empty until somebody picks — and the empty string is not a
      // letter, which the runtime has to check BEFORE the lookup (see qRow).
      items: [{ text: '—', value: '' }, ...letters.map((letter) => ({ text: letter, value: letter }))],
    },
  ];
}

/** The hidden holders SPX writes the two letters into. Input-only values: never drawn, read by
 *  the runtime, exactly like a countdown's minutes. */
export function quizBehaviourHtml(quiz: DesignSvgQuizBehaviour, from: number): string {
  return `
    <!-- The quiz's two letters. SPX writes them here; the paint below reads them. Neither is
         ever drawn — the artwork's own layers are what the audience sees. -->
    <div id="f${from}" class="${DATA_SOURCE_CLASS}">${quizLetters(quiz.answers.length)[0]}</div>
    <div id="f${from + 1}" class="${DATA_SOURCE_CLASS}"></div>`;
}

/**
 * The reveal as a real STEP, and the entrance named for what it shows.
 *
 * Both for the reasons quiz/shared.ts gives. The reveal is a lifecycle CALL rather than layer
 * motion, so it has to be authored as data or SPX's `steps` would say one and stop sending
 * Continue; and an operator reading a state chip needs the first step to say "Question", not
 * the importer's generic "Enter".
 */
export function withQuizSteps(data: AnimData): AnimData {
  const reveal: AnimStep = {
    name: 'Reveal',
    duration: 0.45,
    ease: data.steps[data.steps.length - 1]?.ease ?? 'power2.in',
    calls: [{ time: 0, call: 'revealAnswer' }],
    layers: {},
  };
  const steps = data.steps.map((s, i) => (i === 0 ? { ...s, name: 'Question' } : { ...s }));
  steps.splice(steps.length - 1, 0, reveal);
  return { ...data, steps };
}

/** The answer board's arc WITHOUT the audience branch: this pilot binds drawn states for the
 *  pick, the lock and the verdict, and percentages painted as chips are a fifth thing nobody
 *  has drawn. Filtered from the shipped declaration rather than restated, so the arcs that DO
 *  survive can never drift from the catalog's. */
const IMPORTED_QUIZ_MACHINE: TypeMachine = {
  main: {
    ...ANSWER_BOARD_MACHINE.main,
    branches: (ANSWER_BOARD_MACHINE.main?.branches ?? []).filter((b) => b.id !== 'audience'),
  },
};

/**
 * The type `attachMachine` compiles against.
 *
 * `fields` exists for ONE job: `fieldIdFor` resolves a control's logical payload key by its
 * INDEX in this array, so the array has to mirror the template's real field order exactly —
 * the artwork's own fields first, then the two the behaviour added. Get that wrong and the
 * "Select answer" button would carry the wrong `fN` and the operator's pick would land in
 * somebody's team name.
 */
export function importedQuizType(svg: DesignSvg): GraphicType {
  const artwork: TypeField[] = [...svg.fields, ...svg.images].map((f, i) => ({
    key: `svg${i}`,
    label: 'title' in f ? f.title : `Layer ${i + 1}`,
    kind: 'text',
    value: '',
    role: 'data',
  }));
  return {
    id: 'imported-quiz',
    name: 'Imported quiz board',
    description: 'Imported artwork driven by the answer board’s arc: select, lock, reveal.',
    // The artwork IS the structure. Nothing is required, because the author's own drawing is
    // what the parts would name and we did not draw it — `missingParts` has nothing to check.
    structure: { prefix: PREFIX, category: 'quiz', parts: [] },
    fields: [
      ...artwork,
      { key: 'correctAnswer', label: 'Correct answer', kind: 'select', value: 'A', role: 'data' },
      { key: 'selectedAnswer', label: 'Selected answer', kind: 'select', value: '', role: 'data' },
    ],
    machine: IMPORTED_QUIZ_MACHINE,
    controls: ANSWER_BOARD_CONTROLS,
    capabilities: { maxLines: 1, logo: 'none', animationPresets: [], defaultZone: 'mid-center' },
    designs: [],
  };
}

/**
 * The paint: the whole difference between this and the catalog quiz.
 *
 * Every function here shows and hides layers the DESIGNER drew. The machine names these
 * functions in its state timelines (`applySelection`, `applyLock`) and the Reveal step names
 * `revealAnswer`; `paintQuizState` is what update() calls, so a data write on a board mid-lock
 * keeps showing the lock, and a snap recovery repaints from the state rather than from what
 * happened to be on screen.
 */
export function quizBehaviourJs(quiz: DesignSvgQuizBehaviour, from: number): string {
  const letters = quizLetters(quiz.answers.length);
  return `
// ── The quiz behaviour ───────────────────────────────────────────────────────
// The layers below are YOUR drawings. This code only turns them on and off:
//   #q-sel-N    the pick        #q-cor-N  the right answer
//   #q-wrong-N  a wrong answer  #q-lock   the board, locked in
// A layer you did not draw is simply absent, and every function here skips it.

var QUIZ_ROWS = ${quiz.answers.length};
var QUIZ_LETTERS = '${letters.join('')}';

// qShow(id, on): one drawn state, visible or not. Classes only — a snap clears inline styles
// but never classes, so a state painted inline would disappear on recovery while the machine
// still held it.
function qShow(id, on) {
  var el = document.getElementById(id);
  if (!el) return;                 // not drawn — nothing to show, and that is a valid board
  if (on) el.classList.add('${QUIZ_ON_CLASS}');
  else el.classList.remove('${QUIZ_ON_CLASS}');
}

// qRow(letter): the row index a letter names, or -1. THE EMPTY STRING IS NOT A LETTER and has
// to be rejected before the lookup: ''.indexOf() is 0 in every engine, so an unset pick would
// otherwise resolve to row A and mark an answer nobody chose.
function qRow(letter) {
  var name = String(letter || '').trim().toUpperCase();
  return name ? QUIZ_LETTERS.indexOf(name) : -1;
}

// qClear(): back to the base artwork — every drawn state off.
function qClear() {
  for (var i = 1; i <= QUIZ_ROWS; i++) {
    qShow('q-sel-' + i, false);
    qShow('q-cor-' + i, false);
    qShow('q-wrong-' + i, false);
  }
  qShow('${LOCK_ID}', false);
}

// applySelection(): show the pick's drawing, hide the others'. Named by the machine's
// \`selected\` state, which re-enters on every select — which is what makes changing the pick a
// self-transition rather than a new state.
function applySelection() {
  var at = qRow(document.getElementById('f${from + 1}').textContent);
  for (var i = 0; i < QUIZ_ROWS; i++) qShow('q-sel-' + (i + 1), i === at);
}

// applyLock(): the board is locked in. The drawing says so; the MACHINE is what makes it true,
// by simply having no select arrow leaving that state.
function applyLock() {
  qShow('${LOCK_ID}', true);
}

// revealAnswer(): the money moment. The right row's drawing comes on, every other row gets its
// wrong drawing if the designer made one.
function revealAnswer() {
  var at = qRow(document.getElementById('f${from}').textContent);
  if (at === -1) return;           // no answer key set — reveal nothing rather than guess
  for (var i = 0; i < QUIZ_ROWS; i++) {
    qShow('q-cor-' + (i + 1), i === at);
    qShow('q-wrong-' + (i + 1), i !== at);
  }
}

// paintQuizState(): repaint from the MACHINE's state plus the two letters. update() calls this,
// so a live edit never erases a pick the machine still holds; a snap replays states with
// callbacks suppressed, so this is also what puts the marks back after a recovery.
function paintQuizState() {
  var state = '';
  if (typeof noacgMachineState === 'function') state = (noacgMachineState().groups || {}).main || '';
  qClear();
  if (state === 'selected' || state === 'locked') applySelection();
  if (state === 'locked' || state === 'sealed') applyLock();
  if (state === 'reveal') revealAnswer();
}
`;
}

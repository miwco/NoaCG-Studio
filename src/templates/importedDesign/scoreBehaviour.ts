// THE SCORE BEHAVIOUR, bound to imported artwork (docs/backlog/scoreboard-behaviour.md).
//
// A student draws their own scoreboard - two teams, four quiz groups, six classes - says which
// layers are each team's name and figure, and runs the score from the dashboard: one press adds a
// point and plays the flash they drew, one press takes it back, one press starts a new game.
// Nobody writes a line of code, and nothing about the artwork is redrawn.
//
// TWO OR MORE TEAMS, NEVER TWO (owner, 2026-09-03: *"a simple score tracker with two or more
// teams"*). "Goal A / Goal B" is the football case, not the shape: a quiz show with four
// contestants and a class split into six groups are the same graphic with a different row count,
// which is the lesson the poll already learned about its option rows.
//
// THE FOURTH BEHAVIOUR, and what it adds to what the third one settled (behaviour.ts). The seam
// stayed exactly as it was; three things are new inside it.
//
//   * THE BINDING IS MIXED, and it is the first one that is. A quiz's answers are things an
//     operator TYPES, so the quiz binds field INDICES; a poll's layers are things the audience
//     plane WRITES, so the poll binds candidate ids. A score row is both at once - the name and
//     the figure are the operator's own fields, the flash is a moment the designer drew - so this
//     module uses both vocabularies. Nothing had to be invented for that: the seam already
//     carried each of them, one per behaviour, and this is the first module to want them together.
//   * THE PAINT IS THE QUIZ'S (drawn states, drawnState.ts), which is the first time a behaviour
//     has NOT needed a new one. The plan deferred the abstraction until a third case; the third
//     case said the paint is different in kind every time. The fourth says it is not always -
//     which is a weaker claim than a registry would need, and still the right one.
//   * THE SCORE MOVES ON THE SAME PRESS AS THE FLASH, through the catalog scoreboard's own
//     mechanism (`adjust`, templates/types/scoreboard.ts): the surface sends the event carrying
//     that row's score moved by one, the machine applies it exactly when it accepts the event,
//     and the operator's own field box reads the new figure at once. Nothing in the template
//     counts. That is the owner's 2026-08-23 ruling - *"no reason to play the goal animation if
//     the number doesn't change"* - reaching hand-drawn artwork.
//
// WHY A RESET NEEDED A NEW CONTROL ROAD. `payload` rides a field at whatever it reads and
// `adjust` rides it moved by a fixed delta; neither can say "make it zero". Written instead as a
// runtime call, a reset would put air and the operator's cue out of step - the board showing 0
// while the box still said 4, and the next ✎ Update pushing 4 straight back - which is the exact
// drift `adjust` exists to prevent. So `set` was added beside them (blocks/animData.ts), the
// third member of one family, and every surface that fires an event writes its figures back the
// same way it already wrote an adjust's.
//
// WHICH ROW FLASHED IS DATA, NOT A STATE. One `Flash` state, and the row is read from the
// numbers - never four near-identical `scored-1..4` states, which is what
// docs/STATE_MACHINE_SCHEMA.md forbids in as many words ("parameterize with data, not states").
// The payload lands BEFORE the state's timeline calls run (animRuntime `noacgProcessOne`), so by
// the time `scoreFlash` looks, the score that moved has already moved: the row that went up is
// the row that scored. A bare ± correction fires no event and therefore flashes nothing, which
// is right twice over - data never causes a transition, and a mis-press is not a moment.

import type { SpxField } from '../../model/types';
import type { DesignSvg, DesignSvgScoreBehaviour } from '../../model/wizard';
import { SVG_CANDIDATE_ATTR } from '../../assets/svgImport';
import type { AnimData } from '../../blocks/animData';
import { scoreboardType } from '../types/scoreboard';
import type { GraphicType, TypeBranch, TypeControlEvent, TypeField, TypeGroup, TypeMachine } from '../types/graphicType';
import { motionSpeedJs } from '../shared/base';
import { clearDrawnHiding, drawnStateCss, drawnStateShowJs } from './drawnState';
import { PREFIX } from './shared';

/** The class every DRAWN state layer of a score board carries - a row's flash, the full-time
 *  mark. Its own pair rather than the quiz's or the poll's, for the reason drawnState.ts states:
 *  an exported board's classes are a contract with a file somebody already has. */
export const SCORE_STATE_CLASS = `${PREFIX}-sstate`;

/** Added beside `SCORE_STATE_CLASS` while that layer is showing. */
export const SCORE_ON_CLASS = `${PREFIX}-son`;

/**
 * HOW MANY TEAMS A BOARD MAY CARRY.
 *
 * Eight, which is where the poll caps its option rows - and the reason is the same shape of
 * reason rather than the same constraint. A poll's eight is the audience round's own limit; here
 * it is the control surface: every row earns two buttons, so eight teams is already a wall of
 * nineteen. Nothing structural breaks above it; the number is the point at which a board stops
 * being operable live, which is the only thing worth capping on.
 *
 * The survey agrees from both sides (docs/SCORE_CONTROL_SURVEY.md). Everything built for a MATCH
 * stops at two - the consoles, SPX, NewBlue, CueSport. The tools built for a room full of groups,
 * which is what a class quiz board is, cluster at four to eight: MyClassScreen four, Games4ESL and
 * 8-Bit Academy six, Scoreboard On The Go eight. The ones that go higher are leaderboards read off
 * a page rather than boards driven live.
 */
export const SCORE_MAX_ROWS = 8;

/** The ids we stamp on the picked drawings. Ours, not the designer's: an Illustrator file may
 *  already carry any id at all, and these have to be predictable for the runtime to find. */
const FINAL_ID = 's-final';
const flashId = (row: number): string => `s-flash-${row + 1}`;

/** Every id the behaviour stamps, so the binder can move a designer's colliding id aside the
 *  same way it does for the `fN` namespace. */
export function scoreLayerIds(score: DesignSvgScoreBehaviour): string[] {
  return [...score.rows.map((_, i) => flashId(i)), FINAL_ID];
}

/**
 * Stamp the picked drawings so the runtime can find them: our id, plus the state class that hides
 * them until a state shows them.
 *
 * ONLY THE DRAWN MOMENTS ARE STAMPED. A row's name and score are ordinary operator fields and
 * already carry their own `fN` - the binder put it there - so this behaviour never touches them.
 * That is the whole difference from the poll, which writes into layers the operator cannot type.
 */
export function markScoreLayers(root: Element, score: DesignSvgScoreBehaviour): void {
  const stamp = (candidateId: string | undefined, id: string): void => {
    if (!candidateId) return;
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
    if (!el) return;
    el.setAttribute('id', id);
    const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    if (!own.includes(SCORE_STATE_CLASS)) own.push(SCORE_STATE_CLASS);
    el.setAttribute('class', own.join(' '));
    // The designer switched this layer off to see their base look; the stylesheet hides it now,
    // so the file's own display/visibility would fight the class that shows it.
    clearDrawnHiding(el);
  };
  score.rows.forEach((row, i) => stamp(row.flash, flashId(i)));
  stamp(score.final, FINAL_ID);
}

/** The drawn states of a score board: each row's flash and the full-time mark. */
export const scoreBehaviourCss = drawnStateCss(
  SCORE_STATE_CLASS,
  SCORE_ON_CLASS,
  'Drawn states (the score tracker)',
  `   Each layer below is artwork the DESIGNER drew for one moment - the GOAL! plate a team gets
   when its point lands, the full-time mark. NoaCG only decides when each is visible; nothing
   here is redrawn or generated. The scores themselves are not in this list: they are ordinary
   operator fields, and a press moves the figure the designer drew.
   Delete a rule to see every state at once.`,
);

/**
 * THE BEHAVIOUR ADDS NO FIELDS OF ITS OWN, and that is a finding rather than an omission.
 *
 * A quiz needed two (the key and the pick) and a poll five (the wire to the audience plane),
 * because in both cases the thing the operator drives is not a thing the artwork draws. A score
 * board is the opposite: every value it drives - each team's name, each team's figure - is a
 * layer the designer already drew and the binder already bound. Adding a shadow copy would give
 * the operator two boxes for one number and let them disagree.
 *
 * It is still DERIVED, never typed (behaviour.ts `fieldCount`, and
 * docs/backlog/behaviour-fieldcount-derived-rule.md, which named this module as the third one to
 * face the rule). `scoreBehaviourFields(0).length` is zero because this function returns nothing,
 * and it will be one the day it returns one thing.
 */
export function scoreBehaviourFields(): SpxField[] {
  return [];
}

/** No hidden holders: there are no behaviour-owned values to hold (see above). */
export function scoreBehaviourHtml(): string {
  return '';
}

/**
 * The entrance, named for what a score board IS, with one call on it.
 *
 * NO EXTRA STEP, unlike the quiz's Reveal and the poll's Result. A scoreboard has no reveal
 * sequence - the catalog type says it in as many words: "it just comes on air and stays" - so
 * everything interesting is beside the default path, in the two parallel groups. What the step
 * does gain is the same thing the poll's entrance gained: something has to put the board in a
 * known state when it arrives, because every drawn state starts hidden and the runtime's memory
 * of each score starts empty.
 */
export function withScoreSteps(data: AnimData): AnimData {
  return {
    ...data,
    steps: data.steps.map((s, i) =>
      i === 0
        ? { ...s, name: 'On air', calls: [...(s.calls ?? []), { time: 0, call: 'scoreOnAir' }] }
        : { ...s },
    ),
  };
}

/** The catalog scoreboard's own group, by id - the shape, the durations and the eases this
 *  behaviour reuses rather than re-chooses. */
function catalogGroup(id: string): TypeGroup | undefined {
  return (scoreboardType.machine?.parallel ?? []).find((g) => g.id === id);
}

/** One state of a catalog group with its LAYER TRACKS dropped and a call put on it.
 *
 *  The catalog's flag animates a `.scoreboard-accent` part and its full time pops a
 *  `.scoreboard-box`; neither exists on artwork we did not draw, and an unresolved part name in a
 *  timeline compiles to a selector that matches nothing. So the timing survives - it is the
 *  catalog board's, and this module has no better opinion about how long a goal flash lasts - and
 *  the layer track is replaced by the one call that shows the layer the DESIGNER drew. It is the
 *  poll's own move on its closing badge, made twice. */
function drawnStateBranch(group: TypeGroup | undefined, id: string, call: string, edges: TypeBranch['edges']): TypeBranch {
  const source = group?.states.find((s) => s.id === id);
  const name = source?.name ?? id;
  const existing = source?.timeline?.calls ?? [];
  // The catalog's full time already calls `markFinal` - it is the catalog's own arrow and we kept
  // its name - so appending would author it twice. Harmless to run twice and still wrong to say
  // twice: a reader of the emitted data block would see a duplicate and go looking for the second
  // meaning.
  const calls = existing.some((c) => c.call === call) ? existing : [...existing, { time: 0, call }];
  return {
    id,
    ...(source?.name ? { name: source.name } : {}),
    timeline: source?.timeline
      ? { ...source.timeline, calls, layers: {} }
      // The catalog's `live` is POSE-ONLY (a match does not un-finish, so entering it plays
      // nothing). This board can un-finish, because New game exists, and a state that plays
      // nothing would leave the full-time mark on air after it - so it gets a timeline of its own.
      : { name, duration: 0.22, ease: 'out', calls: [{ time: 0, call }], layers: {} },
    edges,
  };
}

/** The event names, one set, so the machine and the controls cannot spell them differently. */
const scoreEvent = (row: number): string => `score${row + 1}`;
const unscoreEvent = (row: number): string => `unscore${row + 1}`;
const CLEAR_EVENT = 'clearFlag';
const FINAL_EVENT = 'final';
const NEW_GAME_EVENT = 'newGame';

/**
 * The score board's arc, derived from the catalog scoreboard's rather than restated.
 *
 * TWO PARALLEL GROUPS, which is the catalog type's own answer to the hardest thing a scorebug
 * asks: a flash is up or it is not, a match is live or it is final, and neither cares what the
 * other is doing. Two small graphs beat one graph of every combination.
 *
 * Three changes, each forced and each named:
 *
 * 1. THE EDGES ARE REGENERATED, because the catalog names `goalA` and `goalB` and this board has
 *    however many rows the designer drew. Everything else about the two groups - the state ids,
 *    the names an operator reads on a state chip, the durations, the eases - is the catalog's.
 * 2. THE TIMELINES PAINT NOTHING (drawnStateBranch above): the parts they animate are ours and
 *    this artwork is not.
 * 3. THE `live` STATE GAINS A TIMELINE. The catalog's is pose-only, which is right for a board
 *    that can never un-final; this one can, because New game exists, and a state that plays
 *    nothing would leave the full-time mark on air after it.
 *
 * A CORRECTION TAKES THE FLASH DOWN WITH THE POINT. `unscoreN` lands in `none` from either state:
 * a press that should not have happened leaves nothing of itself behind, which is what makes it a
 * correction rather than a second event the operator has to remember to follow it with.
 */
function importedScoreMachine(score: DesignSvgScoreBehaviour): TypeMachine {
  const rows = score.rows.map((_, i) => i);
  const flag = catalogGroup('flag');
  const result = catalogGroup('result');
  const op = (from: string, to: string, event: string) => ({ from, to, trigger: 'operator' as const, event });
  return {
    parallel: [
      {
        id: 'flag',
        initial: 'none',
        states: [
          drawnStateBranch(flag, 'none', 'scoreClearFlash', [
            op('shown', 'none', CLEAR_EVENT),
            // Both ends, so a correction and a new game are legal wherever the board is - an
            // event with no arrow out of the current state is DROPPED, and an operator whose
            // minus button silently does nothing because the flash happens to be down would be
            // worse off than one with no minus button at all.
            ...rows.flatMap((i) => [op('shown', 'none', unscoreEvent(i)), op('none', 'none', unscoreEvent(i))]),
            op('shown', 'none', NEW_GAME_EVENT),
            op('none', 'none', NEW_GAME_EVENT),
          ]),
          drawnStateBranch(
            flag,
            'shown',
            'scoreFlash',
            // A second point while the flash is still up is the SELF-TRANSITION, which replays
            // the flash and bumps again - the catalog's own rule, and the reason both ends are
            // authored there too.
            rows.flatMap((i) => [op('none', 'shown', scoreEvent(i)), op('shown', 'shown', scoreEvent(i))]),
          ),
        ],
      },
      {
        id: 'result',
        initial: 'live',
        states: [
          drawnStateBranch(result, 'live', 'scoreLive', [
            op('final', 'live', NEW_GAME_EVENT),
            op('live', 'live', NEW_GAME_EVENT),
          ]),
          drawnStateBranch(result, 'final', 'markFinal', [op('live', 'final', FINAL_EVENT)]),
        ],
      },
    ],
  };
}

/** The logical key of one row's score in the type's field mirror. The artwork's own fields are
 *  keyed by their INDEX (`svg3`), which is what `fieldIdFor` resolves back to `f3`. */
const scoreKey = (index: number): string => `svg${index}`;

/** What a row is CALLED on the control page: the team layer's own label, else its number. The
 *  designer named it for the operator, so it is the operator's word for that half of the board -
 *  the same reason the cue editor borrows a side's name for its band heading. */
function rowTitle(svg: DesignSvg, index: number, row: number): string {
  return svg.fields[index]?.title.trim() || `Team ${row + 1}`;
}

/**
 * THE BUTTONS, AND EVERY ONE OF THEM IS THE CONVENTIONAL ANSWER.
 *
 * Nothing here was invented. `docs/SCORE_CONTROL_SURVEY.md` reads SPX's own scoreboard extension,
 * the CasparCG community clients, vMix, Singular, four OBS tools, NewBlue Titler Live, the
 * Daktronics / OES / Sportable venue consoles and a dozen classroom and consumer scorekeepers, and
 * the four decisions below are what they agree on. The method is the standing one: a design
 * default is not a taste question (docs/acceptance/OWNER_QUEUE.md). That page also names what was
 * NOT surveyed, which is as load-bearing - the professional control rooms are a real gap.
 *
 *   * PLUS ONE, per row, and it is the only button that plays anything. Every product surveyed
 *     offers a ROW of amounts instead (Daktronics' +1/+2/+3/-1, SPX's shipped -1/+1/+2/+5,
 *     Sportable's different keypad per sport) - and every one of them makes that SET
 *     author-configurable, because the right amounts are the sport's own scoring rules and a
 *     generic tool cannot know them. A student's board is not modelling a sport, and a
 *     customization surface is exactly what the owner ruled out on 2026-08-22, so one is the
 *     shipped amount and the survey is where a second one gets argued from. It carries the point
 *     with it (`adjust`), so the figure and the flash can never disagree.
 *   * MINUS ONE, per row, beside it. This is the survey's clearest single result: a symmetric
 *     minus of the smallest increment is in nearly every product read, and two of them frame it
 *     by what it is FOR rather than as scoring ("a (-) button if you need to remove a goal";
 *     "tap minus when they blurt an answer out of turn"). Undo is the minority answer and never a
 *     replacement - where it exists it sits BESIDE a minus. It fires an event rather than editing
 *     the field so that it can also take the flash back down.
 *   * TYPING THE TRUE SCORE is the survey's second correction, present in every professional
 *     product read (Daktronics' EDIT, OES's keypad, Singular's Set button, NewBlue's score field,
 *     vMix's absolute SetText) for the case where the operator has lost track rather than fumbled.
 *     It needs no button here: the score IS an operator field, so every NoaCG surface already
 *     draws it as a box with a ± stepper. That is the whole reason the scores stayed the
 *     artwork's own fields rather than becoming behaviour-owned holders.
 *   * NEW GAME, once, for the board. "Reset" conventionally means a fresh contest and clears more
 *     than the scores - Daktronics' "clear all data for the current game in progress", Sportable's
 *     "clear out the status of an existing game" - and a product that clears only points says so
 *     in the label. This one really does clear everything the graphic holds (every score to zero,
 *     the flash down, full time undone), so it carries the console's own word for that. FULL TIME
 *     is the match's own end. Both are marked destructive, which is how the surveyed tools guard a
 *     reset that has no confirmation dialog: as a danger control rather than a modal.
 *
 * WHAT IS DELIBERATELY NOT CLAMPED: minus at zero goes to minus one. Nothing surveyed documents a
 * clamp either way, and clamping here would mean the graphic disagreeing with the operator's own
 * box - the drift every other decision in this module exists to avoid. The operator sees it in the
 * field they are looking at and presses plus.
 *
 * ONE SECTION PER TEAM, named with the designer's own word for that team, and the button label is
 * the signed amount and nothing else. That is the survey's label finding exactly: every product
 * writes `+1` and `-1` on the key, and the team comes from the column, the colour or the heading -
 * nobody writes "Add point". Sections ARE that column on every NoaCG surface, and it is the same
 * claim the cue editor's bands make about the same board: what belongs to one team belongs
 * together (control/cueFieldGroups.ts, owner 2026-08-21).
 */
function scoreControls(svg: DesignSvg, score: DesignSvgScoreBehaviour): TypeControlEvent[] {
  const perRow = score.rows.flatMap((row, i): TypeControlEvent[] => {
    const section = rowTitle(svg, row.name, i);
    return [
      { event: scoreEvent(i), label: '+1', section, order: i * 2 + 1, adjust: { [scoreKey(row.score)]: 1 } },
      { event: unscoreEvent(i), label: '−1', section, order: i * 2 + 2, adjust: { [scoreKey(row.score)]: -1 } },
    ];
  });
  return [
    ...perRow,
    // Ordered past any row's pair, whatever the row count: the board's own verbs come last on
    // every surface rather than landing in the middle of the teams.
    { event: CLEAR_EVENT, label: 'Clear flash', section: 'Board', order: 900 },
    { event: FINAL_EVENT, label: 'Full time', section: 'Board', order: 901, destructive: true },
    {
      event: NEW_GAME_EVENT,
      label: 'New game',
      section: 'Board',
      order: 902,
      destructive: true,
      // ZERO, never the figure the designer drew. A sample score of "12" is a designer showing
      // what the board looks like mid-match, not stating where a game starts.
      set: Object.fromEntries(score.rows.map((row) => [scoreKey(row.score), '0'])),
    },
  ];
}

/**
 * The type `attachMachine` compiles against.
 *
 * `fields` mirrors the template's real field order - the artwork's own, and nothing after them,
 * because this behaviour adds none - for the reason `importedQuizType` states: `fieldIdFor`
 * resolves a control's payload key by its INDEX in this array. Here that is load-bearing rather
 * than merely correct: every +1 button carries an `adjust` through it, so an array out of step
 * with the template would move somebody else's number.
 *
 * EACH ROW'S SCORE IS DECLARED `number`, and it is the one place this type differs from the quiz's
 * and the poll's flat `text` mirror. `compileControls` refuses an `adjust` on a field that is not
 * a number - which is right, because a delta on a name is meaningless - so the mirror has to say
 * what the artwork already said: the layer held a plain figure, so the binder emitted `ftype:
 * number`, so the operator has a stepper, so a delta is arithmetic rather than string work.
 */
export function importedScoreType(svg: DesignSvg, score: DesignSvgScoreBehaviour): GraphicType {
  const scoreIndices = new Set(score.rows.map((r) => r.score));
  const artwork: TypeField[] = [...svg.fields, ...svg.images].map((f, i) => ({
    key: scoreKey(i),
    label: 'title' in f ? f.title : `Layer ${i + 1}`,
    kind: scoreIndices.has(i) && i < svg.fields.length ? 'number' : 'text',
    value: '',
    role: 'data',
  }));
  return {
    id: 'imported-score',
    name: 'Imported score board',
    description: 'Imported artwork driven by the scoreboard’s arc: a point, a flash, a correction, full time.',
    // The artwork IS the structure. Nothing is required, because the author's own drawing is what
    // the parts would name and we did not draw it - `missingParts` has nothing to check.
    structure: { prefix: PREFIX, category: 'scoreboard', parts: [] },
    fields: artwork,
    machine: importedScoreMachine(score),
    controls: scoreControls(svg, score),
    capabilities: { maxLines: 1, logo: 'none', animationPresets: [], defaultZone: 'top-center' },
    designs: [],
  };
}

/**
 * The paint.
 *
 * Every function here shows and hides layers the DESIGNER drew, or reads a figure out of a field
 * the binder bound. The machine names `scoreFlash`, `scoreClearFlash`, `scoreLive` and
 * `markFinal` in its state timelines - `markFinal` keeping the catalog's own name because it is
 * the catalog's own arrow - the entrance step names `scoreOnAir`, and `paintScoreState` is what
 * update() calls, so a score edit never erases a state the machine still holds and a snap
 * recovery repaints from the machine rather than from what happened to be on screen.
 */
export function scoreBehaviourJs(score: DesignSvgScoreBehaviour): string {
  const fields = score.rows.map((row) => `'f${row.score}'`).join(', ');
  // Numbered rather than named after the team layer: the emitted code has to read the same on a
  // board whose rows the designer left unnamed, and the id IS the number.
  const names = score.rows.map((_, i) => `//   #${flashId(i)}   row ${i + 1}'s flash`).join('\n');
  return `
// ── The score tracker ────────────────────────────────────────────────────────
// The layers below are YOUR drawings. This code only turns them on and off:
${names}
//   #${FINAL_ID}    the board at full time
// A layer you did not draw is simply absent, and every function here skips it.
//
// The SCORES are ordinary fields on your own layers (${fields}), so nothing here writes a number
// that the operator cannot see and correct. A "+1" press sends the new figure WITH the event, so
// the score and the flash land together or neither does; a "−1" press sends the old one back and
// takes the flash down; "New game" sends every score at zero.

${motionSpeedJs}

var SCORE_ROWS = ${score.rows.length};
var SCORE_FIELDS = [${fields}];

// Each row's figure as this board last saw it, and which row's flash is up. Both are DATA rather
// than states in the machine: there is one Flash state, and which team it belongs to is the
// number that moved (docs/STATE_MACHINE_SCHEMA.md - parameterize with data, not states).
var scoreLast = [];
var scoreFlashRow = -1;

${drawnStateShowJs('sShow', SCORE_ON_CLASS)}

// scoreValue(row): one row's figure as an integer, or 0.
//
// Read through svgFitValue where the fit ladder is present: a wrapped block holds its value as
// one tspan per line and textContent joins those with nothing between. A score never wraps, but
// reading it the way every other value on this graphic is read costs nothing and cannot go
// stale if a designer ever binds a score inside a block that does.
function scoreValue(row) {
  var el = document.getElementById(SCORE_FIELDS[row]);
  if (!el) return 0;
  var text = typeof svgFitValue === 'function' ? svgFitValue(el) : el.textContent;
  return parseInt(String(text || '').replace(/[^0-9-]/g, ''), 10) || 0;
}

// scoreSync(): remember every figure as it now stands. Called after every paint, so the NEXT
// event compares against what this one settled on rather than against the start of the match.
function scoreSync() {
  for (var i = 0; i < SCORE_ROWS; i++) scoreLast[i] = scoreValue(i);
}

// scorePaint(): the drawn states, from what the runtime holds. One function, so an event, a data
// write and a snap recovery cannot describe the same board three different ways.
function scorePaint() {
  for (var i = 0; i < SCORE_ROWS; i++) sShow('s-flash-' + (i + 1), i === scoreFlashRow);
}

// ── The beats, each named by the state or step that plays it ─────────────────

// scoreOnAir(): the board arrives. Named by the entrance step, because every drawn state starts
// hidden and the runtime's memory of each score starts empty - without this the first press would
// compare a real figure against nothing and read every row as having scored.
function scoreOnAir() {
  scoreFlashRow = -1;
  sShow('${FINAL_ID}', false);
  scorePaint();
  scoreSync();
}

// scoreFlash(): a point landed. WHICH team is the row whose figure went up, which is knowable
// here and nowhere else: the payload rides the event and is applied before this call runs
// (animRuntime noacgProcessOne), so the new score is already in the layer.
//
// A press that moved nothing flashes nothing rather than guessing - the honest answer for a
// snap into this state during recovery, where no press happened at all. Two rows moving at once
// is not a case the controls can produce, and the first one wins rather than both: a flash is a
// moment, and two moments at once is not one.
function scoreFlash() {
  scoreFlashRow = -1;
  for (var i = 0; i < SCORE_ROWS; i++) {
    if (scoreValue(i) > (scoreLast[i] === undefined ? 0 : scoreLast[i])) { scoreFlashRow = i; break; }
  }
  scorePaint();
  scoreSync();
  if (scoreFlashRow === -1) return;
  var mark = document.getElementById('s-flash-' + (scoreFlashRow + 1));
  // The mark is the designer's own drawing; the pop is ours - the same shape as the vote board's
  // winner call, and for the same reason: which row gets it depends on the data, so no static
  // keyframe can name it.
  if (mark) gsap.fromTo(mark, { scale: 1.04 }, { scale: 1, duration: 0.28 / motionSpeed(), ease: 'back.out(2)' });
}

// scoreClearFlash(): the flash goes. The SCORES do not - clearing a flash is not a correction,
// and a board that blanked its figures because the plate came down would be unusable.
function scoreClearFlash() {
  scoreFlashRow = -1;
  scorePaint();
  scoreSync();
}

// markFinal(): full time. The catalog scoreboard's own name for the same beat, because it is the
// catalog's own arrow.
function markFinal() {
  sShow('${FINAL_ID}', true);
}

// scoreLive(): the match is live again - what New game undoes the full-time mark with. The
// catalog board has no such arrow (a match does not un-finish) and this one does, because a class
// plays the next game on the same graphic rather than importing it a second time.
function scoreLive() {
  sShow('${FINAL_ID}', false);
  scoreSync();
}

// paintScoreState(): the board, repainted from the MACHINE plus the figures. update() calls this,
// so A SCORE EDIT MOVES THE NUMBER WITHOUT ANY TRANSITION FIRING - data never causes a state
// change (docs/STATE_MACHINE_SCHEMA.md), and the ± stepper beside the field is therefore a silent
// correction rather than a second way to play the flash. A snap replays states with callbacks
// suppressed, so this is also what puts the board back after a recovery.
function paintScoreState() {
  var groups = {};
  if (typeof noacgMachineState === 'function') groups = noacgMachineState().groups || {};
  if (groups.flag !== 'shown') scoreFlashRow = -1;
  sShow('${FINAL_ID}', groups.result === 'final');
  scorePaint();
  scoreSync();
}
`;
}

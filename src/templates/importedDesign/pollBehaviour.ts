// THE POLL BEHAVIOUR, bound to imported artwork (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12).
//
// A student draws their own vote board, says which layers are the question, the options and the
// bars, and runs a live audience vote from the dashboard: votes arrive from /join, the tally
// moves on air, and nobody writes a line of code.
//
// THE THIRD BEHAVIOUR, and what it says. The quiz pilot deferred the abstraction until a third
// case could show what varies (plan §6). This is that case, and the answer it gives is:
//
//   * The MACHINE is free again - `LIVE_POLL_MACHINE` from the catalog live vote, filtered.
//   * The BUTTONS are free again - `LIVE_POLL_CONTROLS`, verbatim.
//   * The PAINT is new AGAIN, and in a way the quiz's model cannot express. That is the finding.
//
// WHY THE PAINT IS DIFFERENT IN KIND. The quiz's answer to "what does a state look like on
// somebody else's artwork" is L2: the designer draws each moment as its own layer and NoaCG picks
// one (plan §4). A BAR HAS NO MOMENTS. It has one pose per share, so there is nothing to draw and
// nothing to pick - the designer draws the bar at its FULL length and the runtime interpolates
// between that and nothing. Call it L4: the designer draws the EXTREME and NoaCG reads it as a
// range. Both models are here, side by side, and which one a picker uses is a property of the
// layer rather than of the behaviour: the VOTE NOW badge and the winner mark are L2 drawn states,
// the bars are L4, and the labels and figures are neither - they are text the runtime writes.
//
// WHERE THE NUMBERS COME FROM, and why nothing new plumbs them. The audience plane has counted
// votes since Phase 6 (docs/INTERACTIVE_PLAYOUT_PLAN.md), and it already hands them to a graphic
// the only way anything reaches air here: as an ordinary CUE's field values, taken by an operator.
// `ProductionAudienceWorkspace.tallyValues` writes a round's counts as "Label | count" lines into
// a field titled `Options`, and `pollFieldMap` decides which graphic can hold them by looking for
// fields titled `Question`, `Options`, `Vote count`, `Vote status` and `Live figures`. So the join
// between the audience plane and a hand-drawn board is a FIELD NAMING CONTRACT, and this module
// keeps its half of it by owning those five fields itself - the artwork's own layers are display
// targets, never the wire. The structural guarantee the workspace exists to make holds untouched:
// there is still no path from a viewer's vote to Program that does not pass through an operator
// pressing Take (src/audience/audienceTypes.ts states the rule; the interface has no method that
// could bypass it).
//
// EVERYTHING A CONTROLLER NEEDS IS IN A FIELD, and that is a wire constraint rather than a
// preference. Over the OGraf Server API a GRAPHIC's action responses carry its instance id, a
// status string and (on play) the step; a `result` object is UNDECLARED on them, so a controller
// written against the published document has nowhere to read one, and `RenderTargetInfo` reports
// no instance state either. Machine state does not cross that boundary. FIELDS do
// (docs/OGRAF_STATE_IN_FIELDS.md). So the counts ride the `Options` field and the open/closed
// status rides a field of its OWN - `pollVotingClosed` reads that back, so a controller that can
// only send data can still stop the board saying VOTE NOW.
//
// THE STATUS IS ITS OWN FIELD BECAUSE THE COUNT LINE IS FOR A HUMAN. It first rode INSIDE that
// line - `tallyValues` writes "4 votes · voting open", and the runtime read the word back with a
// regex. That works exactly as long as nobody translates or rewords the sentence an operator
// reads: a station writing "4 ääntä · äänestys suljettu" got a board saying VOTE NOW through a
// closed vote, silently, on air, with both halves behaving as written. One field, one fact
// (docs/OGRAF_STATE_IN_FIELDS.md R7). The count line is still read as a FALLBACK, because a board
// exported before the status field existed still carries only the sentence.
//
// ANIMATION: BARS MOVE ON DATA, NOT ON STATE. The state-machine model is explicit that data
// updates never cause transitions (root AGENTS.md), and a vote landing is data. So the growth
// lives INSIDE whatever state the board is in: `update()` calls `paintPollState()`, which tweens
// each bar from where it is to its new share. Only Close voting, Show result and Call the winner
// are transitions. The motion itself is the catalog board's, imported rather than restated -
// `BAR_GROW`, `BAR_STAGGER` and power3.out from poll/pollMotion.ts, with no overshoot ease ever
// applied to a vote bar, because a bar that overshoots reads as the wrong figure.

import type { SpxField } from '../../model/types';
import type { DesignSvg, DesignSvgPollBehaviour } from '../../model/wizard';
import { SVG_CANDIDATE_ATTR } from '../../assets/svgImport';
import type { AnimData, AnimStep } from '../../blocks/animData';
import { BAR_GROW, BAR_STAGGER, pollWireJs } from '../poll/pollMotion';
import { LIVE_POLL_CONTROLS, LIVE_POLL_MACHINE } from '../types/livePoll';
import type { GraphicType, TypeField, TypeMachine } from '../types/graphicType';
import { DATA_SOURCE_CLASS, motionSpeedJs } from '../shared/base';
import { clearDrawnHiding, drawnStateCss, drawnStateShowJs } from './drawnState';
import { PREFIX } from './shared';

/** The class every DRAWN state layer of a poll carries - the badge and the winner marks. Its own
 *  pair rather than the quiz's, because an exported board's classes are a contract with a file
 *  somebody already has; the MECHANISM is shared (behaviour.ts), the names are not. */
export const POLL_STATE_CLASS = `${PREFIX}-pstate`;

/** Added beside `POLL_STATE_CLASS` while that layer is showing. */
export const POLL_ON_CLASS = `${PREFIX}-pon`;

/** The ids we stamp on the picked layers. Ours, not the designer's: an Illustrator file may
 *  already carry any id at all, and these have to be predictable for the runtime to find. */
const QUESTION_ID = 'p-q';
const TOTAL_ID = 'p-total';
const BADGE_ID = 'p-open';
const rowId = (role: 'opt' | 'bar' | 'val' | 'win', row: number): string => `p-${role}-${row + 1}`;

/** Every id the behaviour stamps, so the binder can move a designer's colliding id aside the
 *  same way it does for the `fN` namespace. */
export function pollLayerIds(poll: DesignSvgPollBehaviour): string[] {
  const rows = poll.rows.flatMap((_, i) => [rowId('opt', i), rowId('bar', i), rowId('val', i), rowId('win', i)]);
  return [...rows, QUESTION_ID, TOTAL_ID, BADGE_ID];
}

/**
 * Stamp the picked layers so the runtime can find them.
 *
 * Two kinds of layer, and the difference is the whole shape of this behaviour:
 *
 *  - a DRAWN STATE (the badge, a winner mark) also takes the state class, which hides it until
 *    the machine says otherwise. Its own hiding is cleared, because the stylesheet owns that now.
 *  - a WRITTEN or MEASURED layer (the question, an option label, a figure, a bar) takes the id
 *    alone and is left exactly as the designer drew it. A figure is the one hybrid: it is written
 *    AND it waits for the result, so it takes both.
 *
 * A layer the author did not pick is left completely alone.
 */
export function markPollLayers(root: Element, poll: DesignSvgPollBehaviour): void {
  const stamp = (candidateId: string | undefined, id: string, drawnState: boolean): void => {
    if (!candidateId) return;
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
    if (!el) return;
    el.setAttribute('id', id);
    if (!drawnState) return;
    const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    if (!own.includes(POLL_STATE_CLASS)) own.push(POLL_STATE_CLASS);
    el.setAttribute('class', own.join(' '));
    // The designer switched this layer off to see their base look; the stylesheet hides it now,
    // so the file's own display/visibility would fight the class that shows it.
    clearDrawnHiding(el);
  };
  stamp(poll.question, QUESTION_ID, false);
  stamp(poll.total, TOTAL_ID, false);
  stamp(poll.badge, BADGE_ID, true);
  poll.rows.forEach((row, i) => {
    stamp(row.label, rowId('opt', i), false);
    stamp(row.bar, rowId('bar', i), false);
    // The figures wait for the result, exactly as they do on a catalog board - so they are drawn
    // states as well as write targets.
    stamp(row.value, rowId('val', i), true);
    stamp(row.winner, rowId('win', i), true);
  });
}

/** The drawn states of a poll: the badge, the figures and the winner marks. */
export const pollBehaviourCss = drawnStateCss(
  POLL_STATE_CLASS,
  POLL_ON_CLASS,
  'Drawn states (the live vote)',
  `   Each layer below is artwork the DESIGNER drew for one moment - the VOTE NOW badge, the
   percentage figures, the winner mark. NoaCG only decides when each is visible; nothing here is
   redrawn or generated. The BARS are not in this list: a bar has no moments, so it is measured
   at the length it was drawn and scaled to its share instead.
   Delete a rule to see every state at once.`,
);

/**
 * THE STATUS FIELD'S TITLE AND ITS VOCABULARY.
 *
 * Exported because the production dashboard writes this field and has to find it by title
 * (`pollFieldMap` / `tallyValues` in components/home/ProductionAudienceWorkspace.tsx). A title
 * that a NoaCG surface must FIND is a contract, so it is named once, in the module that owns it,
 * rather than spelled out again at the far end (docs/OGRAF_STATE_IN_FIELDS.md R6).
 *
 * The vocabulary is two tokens. An EMPTY value means "not stated", which is what a board saved
 * before this field existed reports and what a controller that only writes the count line leaves
 * behind - `pollVotingClosed` falls back to the count line for exactly that, and for nothing else:
 * a value that is stated and not understood reads as CLOSED rather than reaching the sentence.
 */
export const POLL_STATUS_TITLE = 'Vote status';
export const POLL_STATUS_OPEN = 'open';
export const POLL_STATUS_CLOSED = 'closed';

/** The three choices an operator is offered, in one place: the SPX field wants `{ text, value }`
 *  and the type mirror wants `{ label, value }`, and two hand-written lists of the same three
 *  would be two lists to keep in step. */
const POLL_STATUS_CHOICES: { label: string; value: string }[] = [
  { label: 'Not stated (follow the count line)', value: '' },
  { label: 'Voting open', value: POLL_STATUS_OPEN },
  { label: 'Voting closed', value: POLL_STATUS_CLOSED },
];

/**
 * WHEN THE PERCENTAGE FIGURES APPEAR - the owner's ruling of 2026-08-30, in his words: *"Usually
 * people will use it just to show the results, so the poll does not have to automatically update.
 * However, we should give that possibility to those who want it."*
 *
 * So the shipped behaviour stays what a catalog vote board does - the figures are the RESULT's
 * beat, held back until the operator presses Show result - and running them live is an opt-in a
 * production ticks once (the checkbox in components/home/ProductionAudienceWorkspace.tsx).
 *
 * It rides a FIELD for the same reason the status does: machine state does not cross the OGraf
 * boundary and fields do (docs/OGRAF_STATE_IN_FIELDS.md), so a board on somebody else's playout
 * can be put in either mode by a controller that can only send data. And it is a field rather
 * than a build-time choice because a production changes its mind between rounds - the graphic is
 * the same graphic either way.
 *
 * ONLY THE EXACT TOKEN TURNS IT ON. Empty is the default and anything unrecognised reads as
 * empty, which is the opposite convention from the status field's - and deliberately so, because
 * the safe half of not knowing is different in the two cases. For the status, not knowing means
 * closing a badge that would otherwise invite votes nobody counts. Here, not knowing means TODAY'S
 * behaviour, byte for byte: a board that has never heard of this field, or a controller sending a
 * word we do not know, holds the figures for the result exactly as it always did.
 */
export const POLL_LIVE_TITLE = 'Live figures';
export const POLL_LIVE_ON = 'live';

const POLL_LIVE_CHOICES: { label: string; value: string }[] = [
  { label: 'Wait for Show result', value: '' },
  { label: 'Update live while voting', value: POLL_LIVE_ON },
];

/** The one conversion between the two shapes a choice list has to be in: the type mirror wants
 *  `{ label, value }` and an SPX dropdown wants `{ text, value }`. Written once so a third token
 *  field cannot spell it a third way. */
const asSpxItems = (choices: { label: string; value: string }[]) =>
  choices.map((c) => ({ text: c.label, value: c.value }));

/**
 * THE FIVE FIELDS THAT ARE THE WIRE, and their titles are a contract.
 *
 * `Question`, `Options`, `Vote count`, `Vote status` and `Live figures` are exactly the titles
 * `pollFieldMap` (components/home/ProductionAudienceWorkspace.tsx) looks for when it decides which
 * graphic in a production can hold a vote. Naming them anything else would leave a bound board
 * invisible to the workspace and the operator with nowhere to stage the counts - so these strings
 * are not copy, they are the join, and the reason they are the behaviour's own rather than the
 * artwork's is that the designer's layer is called whatever the designer called it.
 *
 * All five are hidden holders (the html below): the artwork's own layers are what the audience
 * sees, and the runtime writes them from here.
 */
export function pollBehaviourFields(from: number): SpxField[] {
  return [
    { field: `f${from}`, ftype: 'textfield', title: 'Question', value: '' },
    {
      field: `f${from + 1}`,
      // A textarea, because the options arrive as LINES - "Label | count", one per option. It is
      // the same box a rehearsing operator types into by hand and the same one an audience round
      // fills automatically, which is what makes rehearsal and air the same graphic.
      ftype: 'textarea',
      title: 'Options',
      value: '',
    },
    // The count line is a SENTENCE A HUMAN READS - "4 votes · voting open" - written into the
    // designer's own total layer. It is display copy, and it is localisable, so nothing machine-
    // readable may depend on its wording. The status below is the machine's half.
    { field: `f${from + 2}`, ftype: 'textfield', title: 'Vote count', value: '' },
    // THE STATUS, AS ITS OWN FACT. Over the OGraf wire this is the only way a controller learns
    // whether the vote is still running - machine state does not cross that boundary and fields
    // do - so it is a token, not a phrase: `open` or `closed`, drawn nowhere, meaning the same
    // thing in every language (docs/OGRAF_STATE_IN_FIELDS.md §4b, R7). `pollVotingClosed` reads
    // it; `tallyValues` writes it beside the human count line.
    //
    // A DROPDOWN because the value is machine-read: an operator picks one of three rather than
    // getting the punctuation of a sentence right, and a generated form on somebody else's
    // playout offers the same three (the OGraf export turns `items` into a schema `enum`).
    //
    // APPENDED LAST on purpose. The artwork's fields compile first and the wire's after, so a
    // field added at the END moves no existing `fN` index - which is what makes this additive
    // rather than a migration (root AGENTS.md, "every persisted format carries a version").
    {
      field: `f${from + 3}`,
      ftype: 'dropdown',
      title: POLL_STATUS_TITLE,
      value: '',
      items: asSpxItems(POLL_STATUS_CHOICES),
    },
    // WHEN THE FIGURES APPEAR, and it is APPENDED AFTER the status for the reason the status was
    // appended after the count line: a behaviour's fields compile after the artwork's and
    // `fieldIdFor` resolves a control's payload key by INDEX, so a field added at the END moves
    // no existing `fN` and every board already saved or exported keeps its own numbering. That
    // is what makes this additive rather than a migration (root AGENTS.md rule 6).
    {
      field: `f${from + 4}`,
      ftype: 'dropdown',
      title: POLL_LIVE_TITLE,
      value: '',
      items: asSpxItems(POLL_LIVE_CHOICES),
    },
  ];
}

/** The hidden holders SPX writes the vote into. Input-only values: never drawn, read by the
 *  runtime, exactly like a countdown's minutes. */
export function pollBehaviourHtml(from: number): string {
  return `
    <!-- The live vote's five values. SPX (or the production dashboard, from an audience round)
         writes them here; the paint below reads them and writes them into YOUR layers. None of
         these divs is ever drawn - the artwork is what the audience sees. The fourth is the
         vote's STATUS as a token ("open" / "closed"), which is what the badge obeys - the count
         line above it is a sentence for a human and no code reads its wording. The fifth says
         whether the percentage figures run live while the vote is open, or wait for Show
         result, which is what they do unless a production asks otherwise. -->
    <div id="f${from}" class="${DATA_SOURCE_CLASS}"></div>
    <div id="f${from + 1}" class="${DATA_SOURCE_CLASS}"></div>
    <div id="f${from + 2}" class="${DATA_SOURCE_CLASS}"></div>
    <div id="f${from + 3}" class="${DATA_SOURCE_CLASS}"></div>
    <div id="f${from + 4}" class="${DATA_SOURCE_CLASS}"></div>`;
}

/**
 * The result as a real STEP, and the entrance named for what it is.
 *
 * Same two reasons the quiz's Reveal is a step: showing the figures is a lifecycle CALL rather
 * than layer motion, so it has to be authored as data or SPX's `steps` would say one and stop
 * sending Continue; and an operator reading a state chip needs the first state to say "Voting",
 * not the importer's generic "Enter".
 *
 * The step NAMES are load-bearing beyond the chip: a derived state's id is its step name folded
 * (blocks/animMachine.ts `deriveMachine`), so these two words are what `paintPollState` matches
 * on and what `LIVE_POLL_MACHINE`'s waypoints resolve to.
 */
export function withPollSteps(data: AnimData): AnimData {
  const result: AnimStep = {
    name: 'Result',
    duration: 0.45,
    ease: data.steps[data.steps.length - 1]?.ease ?? 'power2.in',
    calls: [{ time: 0, call: 'pollShowResult' }],
    layers: {},
  };
  const steps = data.steps.map((s, i) =>
    i === 0
      ? {
          ...s,
          name: 'Voting',
          // THE ENTRANCE OPENS THE VOTE. Every drawn state starts hidden (that is what the state
          // class is for), so without this the VOTE NOW badge the designer drew would never come
          // up: entering a state plays its timeline, and nothing else repaints until the next
          // data write. It is the same shape as a countdown's `startClock` on this same step.
          calls: [...(s.calls ?? []), { time: 0, call: 'pollOpenVoting' }],
        }
      : { ...s },
  );
  steps.splice(steps.length - 1, 0, result);
  return { ...data, steps };
}

/**
 * The live vote's arc, with two changes to the catalog's - both derived from it rather than
 * restated, exactly as the quiz derives the answer board's, so every arc that survives can never
 * drift from the shipped one.
 *
 * 1. NO AUTOMATIC VOTING WINDOW. The catalog board arms a 20-second timer from the voting state
 *    as a safety net behind the presenter's "that's it, voting is closed" (types/livePoll.ts).
 *    On a board fed by a real audience that timer is not a safety net, it is a hazard: the votes
 *    arrive over minutes, and an arrow nobody drew would close the vote under the operator
 *    twenty seconds after the take.
 * 2. CLOSING IS A CALL, NOT KEYFRAMES. The catalog fades a `.poll-cue` element it drew itself;
 *    here the badge is a layer the DESIGNER drew, so the state's own keyframes would name a part
 *    that does not exist. The timing stays the catalog's - 0.35s, out - and the layer track is
 *    replaced by the one call that hides the drawn badge.
 *
 * `compileControls` drops a control whose event no arrow carries, so the button list needs no
 * matching edit; `close`, `result` and `call` all still have their arrows.
 */
const IMPORTED_POLL_MACHINE: TypeMachine = {
  main: {
    ...LIVE_POLL_MACHINE.main,
    branches: (LIVE_POLL_MACHINE.main?.branches ?? []).map((b) =>
      b.id !== 'closed'
        ? b
        : {
            ...b,
            edges: b.edges.filter((e) => e.trigger !== 'timer'),
            timeline: b.timeline && {
              ...b.timeline,
              calls: [...(b.timeline.calls ?? []), { time: 0, call: 'pollCloseVoting' }],
              layers: {},
            },
          },
    ),
  },
};

/**
 * The type `attachMachine` compiles against.
 *
 * `fields` mirrors the template's real field order - the artwork's own first, then the wire's
 * three - for the reason `importedQuizType` states: `fieldIdFor` resolves a control's payload key
 * by its INDEX in this array. None of the live vote's three buttons carries a payload today, so
 * nothing would break if it were wrong; it is right anyway, because the day one does is not the
 * day to discover it.
 *
 * The `closed` branch's timeline names a `cue` part the catalog resolves to `.poll-cue`. There is
 * no such part here and there must not be: the badge is a layer the DESIGNER drew, so it is a
 * drawn state painted by `paintPollState`, and an unresolved part name in a timeline is left as a
 * literal selector that matches nothing - which is exactly the right behaviour for a board whose
 * badge the designer chose not to draw.
 */
export function importedPollType(svg: DesignSvg): GraphicType {
  const artwork: TypeField[] = [...svg.fields, ...svg.images].map((f, i) => ({
    key: `svg${i}`,
    label: 'title' in f ? f.title : `Layer ${i + 1}`,
    kind: 'text',
    value: '',
    role: 'data',
  }));
  return {
    id: 'imported-poll',
    name: 'Imported vote board',
    description: 'Imported artwork driven by the live vote’s arc: voting, closed, result, winner.',
    // The artwork IS the structure. Nothing is required, because the author's own drawing is what
    // the parts would name and we did not draw it - `missingParts` has nothing to check.
    structure: { prefix: PREFIX, category: 'poll', parts: [] },
    fields: [
      ...artwork,
      { key: 'question', label: 'Question', kind: 'text', value: '', role: 'data' },
      { key: 'options', label: 'Options', kind: 'lines', value: '', role: 'data' },
      { key: 'footnote', label: 'Vote count', kind: 'text', value: '', role: 'data' },
      // LAST, and that is the whole migration story: `fieldIdFor` resolves a control's payload
      // key by INDEX here, so a field appended at the end moves nothing that already existed.
      {
        key: 'status',
        label: POLL_STATUS_TITLE,
        kind: 'select',
        value: '',
        role: 'data',
        options: POLL_STATUS_CHOICES,
      },
      // …and this one after it, same rule, same reason.
      {
        key: 'live',
        label: POLL_LIVE_TITLE,
        kind: 'select',
        value: '',
        role: 'data',
        options: POLL_LIVE_CHOICES,
      },
    ],
    machine: IMPORTED_POLL_MACHINE,
    controls: LIVE_POLL_CONTROLS,
    capabilities: { maxLines: 1, logo: 'none', animationPresets: [], defaultZone: 'mid-center' },
    designs: [],
  };
}

/**
 * The paint.
 *
 * Everything here writes into layers the DESIGNER drew, or measures one. The machine names
 * `pollCallWinner` (the catalog's own name for the same beat, because it is the catalog's own
 * arrow), the Result step names `pollShowResult`, and `paintPollState` is what update() calls -
 * so a vote landing moves the bars without any transition firing, and a snap recovery repaints
 * from the machine rather than from whatever happened to be on screen.
 */
export function pollBehaviourJs(poll: DesignSvgPollBehaviour, from: number): string {
  return `
// ── The live vote ────────────────────────────────────────────────────────────
// The layers below are YOUR drawings. This code only writes into them and sizes them:
//   #p-q       the question       #p-opt-N  an option's label
//   #p-bar-N   its bar            #p-val-N  its percentage
//   #p-win-N   the winner mark    #p-total  the vote count      #p-open  the VOTE NOW badge
// A layer you did not draw is simply absent, and every function here skips it.
//
// The counts arrive in the hidden "Options" holder as one "Label | count" line per option -
// typed by hand when you rehearse, written by the production dashboard when a real audience is
// voting. Either way the board only ever reads text out of a field. Whether the vote is still
// OPEN is its own field ("Vote status": "open" or "closed"), never a word inside the count line,
// so rewording or translating that line cannot change what the board does. Whether the percentage
// figures run live while the vote is open is its own field too ("Live figures"); left empty they
// wait for Show result, which is what a vote board normally does.

${motionSpeedJs}

var POLL_OPTIONS = ${poll.rows.length};

// The board's two pieces of runtime STATE. Both are data, not states in the machine: whether the
// figures are showing, and whether a winner has been called.
var pollRevealed = false;
var pollWinnerCalled = false;

// Every bar's own DRAWN length, remembered the first time it is asked for. Measured AT REST and
// never re-read, for the reason the layout runtime states in full: read it after a pass and the
// last pass's length silently becomes this pass's 100%, so a bar that has ever shown 40% can
// never show more than 40% again.
var pollBarFull = {};

${drawnStateShowJs('pShow', POLL_ON_CLASS)}

// pWrite(id, text): one drawn text layer, written. Leaves the layer exactly as drawn when the
// wire has nothing to say - an empty round must not blank a board the designer filled in.
function pWrite(id, text) {
  if (text === null || text === undefined || text === '') return;
  var el = document.getElementById(id);
  if (el) el.textContent = String(text);
}

// pField(id): one hidden holder's value, or ''.
function pField(id) {
  var el = document.getElementById(id);
  return el ? el.textContent : '';
}

${pollWireJs(`f${from + 1}`)}

// pollVotingClosed(): has the vote stopped, according to the DATA?
//
// The counts and the status both live in FIELDS on purpose. Over the OGraf wire a controller can
// read a graphic's currentStep and a status string and nothing else - a \`result\` object is
// undeclared on a graphic's action responses and the render target reports no instance state - so
// anything that lives only in the machine is invisible to every controller but ours. A FIELD is
// what a foreign controller can both read and SEND.
//
// THE STATUS IS A TOKEN, NOT A SENTENCE. It is read from the "Vote status" field, which holds
// "open" or "closed" and nothing else. It used to be read out of the count line ("4 votes -
// voting closed") with a pattern match, and that line is a sentence a HUMAN reads: translate it
// or reword it and the board says VOTE NOW through a closed vote, with nothing reporting the
// fault. One field, one fact.
//
// The count line is still read AS A FALLBACK, and only when the status field is EMPTY - so a
// board exported before that field existed, or a controller that still only writes the sentence,
// closes exactly as it did before. A board that suddenly ignored its own status line would be a
// worse failure than the one this replaced.
//
// A value that is neither token but is not empty either has been STATED AND NOT UNDERSTOOD, and
// that reads as closed rather than falling back to the sentence - falling back would put the whole
// defect straight back, answering a controller's own word for "closed" with a pattern match on
// English display copy. Closed is also the safe half of not knowing: a board wrongly showing VOTE
// NOW invites votes that will not count, while a board wrongly not showing it only looks plain.
//
// The two closers do not fight, because they are not equals: pressing Close voting takes the
// machine OUT of the voting state, so the badge stays down whatever the data later says, while a
// data close follows the data - a controller that puts the vote back on gets its badge back.
function pollVotingClosed() {
  var status = pField('f${from + 3}').trim().toLowerCase();
  if (status !== '') return status !== '${POLL_STATUS_OPEN}';
  return /voting\\s+closed/i.test(pField('f${from + 2}'));   // nothing stated: the old count line
}

// pollLiveFigures(): should the percentages be on screen WHILE the vote is running?
//
// No, unless a production said so. That is the owner's ruling of 2026-08-30 - most shows put a
// vote board up to show the RESULT, so the figures are the result's beat and the board stays a
// question until the operator answers it - and the exception is a checkbox a production ticks.
//
// ONLY THE EXACT TOKEN COUNTS. An empty field, a word we do not recognise, a board saved before
// this field existed: all three wait for Show result, which is what the board did before this
// field existed at all. There is no fallback to any other value, because the safe half of not
// knowing here is doing exactly what shipped.
function pollLiveFigures() {
  return pField('f${from + 4}').trim().toLowerCase() === '${POLL_LIVE_ON}';
}

// pollOverflowed(rows): did this round bring MORE OPTIONS than the designer drew rows for?
//
// It is the one way a board fed by a real audience can lie without anything being wrong with the
// code: a student draws four rows, the show runs a five-option round, and the board paints the
// four it has. Every figure on it is TRUE - each is that option's share of the whole vote, which
// is why the drawn bars visibly fail to fill the board - but the row that WON can be the one that
// was never drawn, and nothing on screen says a word about it.
//
// So two things happen, and neither of them invents artwork:
//
//   * the winner is never called on a row the designer did not draw (pollApplyTally below), so
//     the board can say nothing rather than something untrue;
//   * the OPERATOR is told, through the channel that already exists for exactly this - the fit
//     ladder's "this value does not fit the design" report (noacgTextOverflow(), svg.ts). The
//     value that does not fit is the Options list, and it is flagged on the cue editor, on the
//     hosted control page and in the exported controller, BEFORE a Take, because the preview
//     monitor reports it as soon as the values are staged.
//
// Reported rather than refused: a round that overflows is still a round, and dropping it in the
// middle of a broadcast would be a worse answer than airing the rows that fit and saying so.
function pollReportOverflow(over) {
  // The fit ladder's own map, shared because it is the same question asked of the same field.
  // Guarded: a board built before the ladder existed would not have it.
  if (typeof svgFitOver === 'undefined') return;
  svgFitOver['f${from + 1}'] = !!over;
}

// pollShares(): each option's share of the total, 0..1, in row order. No votes yet means every
// share is zero - never a division by zero, and never a board showing an even split nobody
// voted for.
function pollShares() {
  var rows = pollRows();
  var total = 0;
  for (var i = 0; i < rows.length; i++) total += rows[i].count;
  var out = [];
  for (var j = 0; j < rows.length; j++) out.push(total > 0 ? rows[j].count / total : 0);
  return out;
}

// pollBarLength(el): the bar as the designer drew it, which is what 100% means on this board.
// A <rect> states its own width; anything else (a path, a group) is measured - getBBox reports
// the element's own user space, so it answers the same whatever we have scaled it to since.
function pollBarLength(el) {
  var key = el.id;
  if (pollBarFull[key] === undefined) {
    var w = el.hasAttribute('width') ? parseFloat(el.getAttribute('width')) : NaN;
    if (isNaN(w) || !(w > 0)) {
      try { w = el.getBBox().width; } catch (e) { w = 0; }
    }
    // ONLY A REAL MEASUREMENT IS REMEMBERED. getBBox throws in some engines and answers zero in
    // others while the element is still unlaid-out, and caching that would retire the bar for the
    // life of the page: every later call would see a length of 0 and give up. A failed read is
    // asked again next time instead.
    if (w > 0) pollBarFull[key] = w;
    return w > 0 ? w : 0;
  }
  return pollBarFull[key];
}

// pollSetBar(el, share, animate, row): one bar at one share.
//
// A RECTANGLE'S WIDTH IS TWEENED, NEVER ITS SCALE - scaling squashes a rounded cap, so a bar
// drawn with round ends would be a different shape at every share. Anything else the designer
// drew is scaled about its own LEFT edge (svgOrigin), so it grows to the right from where it
// starts instead of spreading from its middle.
//
// The numbers are the catalog vote board's, imported rather than re-chosen: ${BAR_GROW}s per bar,
// ${BAR_STAGGER}s between them, and power3.out WHATEVER ease the graphic's entrance uses - a vote bar
// has to land exactly on its share, and a back.out overshoot reads as the wrong figure.
function pollSetBar(el, share, animate, row) {
  var full = pollBarLength(el);
  if (!(full > 0)) return;
  var speed = motionSpeed();
  var motion = { duration: ${BAR_GROW} / speed, ease: 'power3.out', delay: row * ${BAR_STAGGER} / speed };
  if (el.hasAttribute('width')) {
    var to = { attr: { width: full * share } };
    if (!animate) return gsap.set(el, to);
    to.duration = motion.duration; to.ease = motion.ease; to.delay = motion.delay;
    gsap.to(el, to);
    return;
  }
  var box;
  try { box = el.getBBox(); } catch (e) { return; }
  var origin = box.x + ' ' + (box.y + box.height / 2);
  var t = { scaleX: share, svgOrigin: origin };
  if (!animate) return gsap.set(el, t);
  t.duration = motion.duration; t.ease = motion.ease; t.delay = motion.delay;
  gsap.to(el, t);
}

// pollLeader(): the row with the most votes, or -1.
//
// A TIE IS NOT A WINNER. If two rows share the lead nothing is marked at all: a projected-winner
// graphic that picks one of two equal rows is reporting something untrue, and "whichever came
// first in the list" is not a result. Read from the WIRE rather than off the screen, so a bar
// still mid-tween can never decide who won.
function pollLeader() {
  var rows = pollRows();
  var best = -1, at = -1, tied = false;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].count > best) { best = rows[i].count; at = i; tied = false; }
    else if (rows[i].count === best) { tied = true; }
  }
  return (at === -1 || tied || best <= 0) ? -1 : at;
}

// pollApplyTally(animate): the whole board, from the wire. ONE function, so a vote landing, a
// state entry and a boot recovery cannot describe the same numbers three different ways -
// they differ only in whether the bars travel.
function pollApplyTally(animate) {
  var rows = pollRows();
  var shares = pollShares();
  var lead = pollWinnerCalled ? pollLeader() : -1;
  // A ROUND CAN BE BIGGER THAN THE BOARD, and when it is, two things are true at once: the rows
  // that were drawn still show their true share of the whole vote, and the winner may be a row
  // that is not on screen. NOTHING IS MARKED in that case - a projected-winner mark that lands on
  // the best of the rows that happened to fit would be reporting something untrue, which is the
  // one thing this graphic exists not to do. The operator is told instead (pollReportOverflow).
  if (lead >= POLL_OPTIONS) lead = -1;
  pollReportOverflow(rows.length > POLL_OPTIONS);
  // The figures are the RESULT's beat unless this production asked for them live (owner ruling,
  // 2026-08-30). Read on every paint rather than remembered, so ticking the box mid-round is an
  // ordinary field update - and, like every other field write, it fires no transition.
  var figures = pollRevealed || pollLiveFigures();
  pWrite('${QUESTION_ID}', pField('f${from}'));
  pWrite('${TOTAL_ID}', pField('f${from + 2}'));
  for (var i = 0; i < POLL_OPTIONS; i++) {
    var share = shares[i] === undefined ? 0 : shares[i];
    // The label is the ROUND's, when a round has one. A board with more rows drawn than the
    // round has options keeps the extra rows exactly as drawn, at zero - which is honest: the
    // designer drew four and this vote had three.
    if (rows[i]) pWrite('p-opt-' + (i + 1), rows[i].label);
    var bar = document.getElementById('p-bar-' + (i + 1));
    if (bar) pollSetBar(bar, share, animate, i);
    var value = document.getElementById('p-val-' + (i + 1));
    if (value) {
      value.textContent = pollPercentText(share * 100);
      // The figures come with the result, not before it - the same beat the catalog board plays,
      // and a class rather than an inline style so a snap cannot clear it. A production that
      // ticked "update live" gets them from the moment the board arrives instead.
      pShow('p-val-' + (i + 1), figures);
    }
    pShow('p-win-' + (i + 1), i === lead);
  }
}

// ── The four beats, each named by the state or step that plays it ────────────
// Every one of these paints from the WIRE, so they say nothing that the data does not; and none
// of them reads the machine - that is paintPollState's job below, and keeping it there is what
// makes a snap recovery repaint correctly instead of replaying beats that already happened.

// pollOpenVoting(): the vote is open. Named by the entrance step, because a drawn badge starts
// hidden like every drawn state and something has to put it up.
//
// THE BARS ARRIVE, THEY DO NOT TRAVEL, which is the difference between a board that comes up
// right and one that comes up wrong: a bar sits at the length the
// DESIGNER drew until something sizes it, so tweening from there to a share of zero would open
// every vote with full bars visibly collapsing to nothing over most of a second. The graphic
// arriving is not a change in the vote; travel is what an actual vote landing gets (update()).
function pollOpenVoting() {
  pollRevealed = false;
  pollWinnerCalled = false;
  pShow('${BADGE_ID}', !pollVotingClosed());
  pollApplyTally(false);
}

// pollCloseVoting(): the badge goes. The COUNTS do not - closing a vote does not mean the board
// stops showing what came in, and the figures are still the result's beat.
function pollCloseVoting() {
  pShow('${BADGE_ID}', false);
}

// pollShowResult(): the figures land. Named by the Result step on the default path, so pressing
// Continue on a bare playout server reaches it exactly as the control page's button does.
function pollShowResult() {
  pollRevealed = true;
  pShow('${BADGE_ID}', false);
  pollApplyTally(true);
}

// pollCallWinner(): the call. Which row wins depends on the votes, so it has no fixed target and
// no static keyframe can name it - honestly code-owned motion, exactly as the catalog board and
// the quiz's answer reveal are. The mark is the designer's own drawing; the pop is ours.
function pollCallWinner() {
  pollWinnerCalled = true;
  pollApplyTally(false);
  var at = pollLeader();
  if (at === -1) return;                       // a tie, or nothing to call yet
  // …or the winner is a row this board never drew, because the round carried more options than
  // the designer's artwork has rows. There is no honest mark for that, so there is no mark; the
  // Options field is flagged to the operator instead (pollReportOverflow above).
  if (at >= POLL_OPTIONS) return;
  var mark = document.getElementById('p-win-' + (at + 1));
  if (mark) gsap.fromTo(mark, { scale: 1.03 }, { scale: 1, duration: 0.45 / motionSpeed(), ease: 'back.out(2)' });
}

// paintPollState(): the board, repainted from the MACHINE plus the wire. update() calls this, so
// A VOTE LANDING MOVES THE BARS WITHOUT ANY TRANSITION FIRING - data never causes a state change
// (docs/STATE_MACHINE_SCHEMA.md), and the growth belongs inside whatever state the board is in.
// A snap replays states with callbacks suppressed, so this is also what puts the result back
// after a recovery: the flags below are read from the state, never remembered across one.
function paintPollState() {
  var state = '';
  if (typeof noacgMachineState === 'function') state = (noacgMachineState().groups || {}).main || '';
  // 'voting' and 'result' are the first and second steps of the default path, folded to ids
  // (blocks/animMachine.ts). 'closed' and 'called' are the machine's own branches.
  pollRevealed = state === 'result' || state === 'called';
  pollWinnerCalled = state === 'called';
  // The badge says a vote is open, and EITHER source can end that: the machine's Close voting, or
  // the "Vote status" field saying closed. A controller that cannot dispatch our events can still
  // send that field, which is what keeps this board honest on somebody else's playout.
  pShow('${BADGE_ID}', state === 'voting' && !pollVotingClosed());
  pollApplyTally(true);
}
`;
}

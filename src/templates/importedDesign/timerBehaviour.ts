// THE TIMER BEHAVIOUR, bound to imported artwork (docs/GRAPHIC_BEHAVIOUR_PLAN.md §13).
//
// A student draws the card their quiz puts up while the class answers - a clock, a bar draining
// under it, a red look for the last stretch, an AIKA plate for the moment it runs out - says
// which layer is which, and runs the count from the dashboard: Start, Pause, Reset. Nobody
// writes a line of code, and nothing about the artwork is redrawn.
//
// WHY THIS ONE, OUT OF EVERYTHING STILL MISSING. The survey (docs/BEHAVIOUR_SURVEY.md) ranks a
// countdown with start, pause and reset SECOND across the seventeen products it reads - ten of
// them ship it, behind only "comes on and off" - and `docs/backlog/playout-logic-for-all-common-
// graphics.md` puts a clock first on the owner's own list of what a graphic still cannot do.
// NoaCG already had it as a CATALOG type (templates/types/clocks.ts) and could not put it on
// artwork somebody drew, which is the exact gap the current push exists to close.
//
// THE FIFTH BEHAVIOUR, and the one new thing it says about the seam (behaviour.ts). Two findings
// stood before it: the paint is different in kind every time (§12, the vote's bars), except when
// it is not (scoreBehaviour.ts, the score board reusing the quiz's drawn states unchanged). This
// one adds a third axis, and it is about WHAT DRIVES the paint rather than what the paint is:
//
//   * The quiz paints from the MACHINE - a state changed, so repaint.
//   * The vote paints from DATA - update() wrote new counts, so repaint.
//   * A timer paints from NEITHER. The seconds change on a runtime tick with no event and no
//     update(), four times a second, for as long as the graphic is on air. The seam's
//     `updateHook` cannot reach that, and nothing else in it could either - so this module
//     joins the shared clock runtime's OWN paint hook (`clockPainted`, templates/shared/
//     clock.ts) and repaints from there. That hook already existed for a catalog design that
//     draws more than the digits (startingSoon/ss21.ts's minute rule); this is the first time a
//     BEHAVIOUR has needed it, and it needed nothing added to the seam to get it.
//
// IT BINDS NO CLOCK. The countdown is already a field: a text layer whose sample reads `M:SS`
// can be bound as a COUNTDOWN in the mapping step, which makes that node the readout and its
// field the length in minutes, and `assembleImportedSvg` then emits the shared runtime and puts
// `startClock` on the entrance. So this behaviour REQUIRES that binding and reads it, rather
// than asking a second time - one answer to "which layer is the clock", and no way for two to
// disagree. What it adds is everything the operator could not do to a running clock: hold it,
// let it go again, put it back to the top, and see the designer's own drawings while it runs.
//
// THE TAKE STARTS THE COUNT, and that is an owner ruling rather than a choice this module made:
// *"Timer/countdown: duration set beforehand, starts on TAKE, at zero HOLDS at 0:00 until taken
// out"* (docs/OWNER_RULINGS.md, operator-stories-2026-08-27). It also keeps two promises the
// earlier behaviours made. Attaching a behaviour never changes what the Take does to the same
// artwork - a countdown with NO behaviour has started on air since the day the clock field
// shipped, and it still does - and it is the vote board's own rule, where the entrance step IS
// the voting state and there is therefore no "Open vote" button (§12). A chair who wants to
// count the class in gets it from Reset, which costs no extra state and no extra button.

import type { SpxField } from '../../model/types';
import type { DesignSvg, DesignSvgTimerBehaviour } from '../../model/wizard';
import { SVG_CANDIDATE_ATTR } from '../../assets/svgImport';
import type { AnimData } from '../../blocks/animData';
import { countdownType } from '../types/clocks';
import type { GraphicType, TypeBranch, TypeControlEvent, TypeField, TypeGroup, TypeMachine } from '../types/graphicType';
import { DATA_SOURCE_CLASS } from '../shared/base';
import { clearDrawnHiding, drawnStateCss, drawnStateShowJs } from './drawnState';
import { PREFIX } from './shared';

/** The class every DRAWN state layer of a timer carries - the held mark, the last-stretch look,
 *  the time-up plate. Its own pair rather than the quiz's, for the reason drawnState.ts states:
 *  an exported board's classes are a contract with a file somebody already has. */
export const TIMER_STATE_CLASS = `${PREFIX}-tstate`;

/** Added beside `TIMER_STATE_CLASS` while that layer is showing. */
export const TIMER_ON_CLASS = `${PREFIX}-ton`;

/**
 * HOW LONG BEFORE ZERO THE LAST-STRETCH LOOK COMES UP, in seconds, when the operator has not
 * said otherwise.
 *
 * TEN, NOT THIRTY, and the graphic this ships for is why. A class quiz runs thirty-second
 * questions; a warning armed at thirty is on from the first tick of such a question, so it never
 * warns about anything - it is just a second base look. Ten is short enough to still mean
 * something on the shortest count anybody actually runs and long enough to be read on a long
 * one. It is a FIELD rather than a constant (see `timerBehaviourFields`), so a show that wants
 * thirty types thirty.
 */
const DEFAULT_WARN_SECONDS = 10;

/** The ids we stamp on the picked drawings. Ours, not the designer's: an Illustrator file may
 *  already carry any id at all, and these have to be predictable for the runtime to find. */
const BAR_ID = 't-bar';
const WARN_ID = 't-warn';
const HELD_ID = 't-held';
const UP_ID = 't-up';

/** Every id the behaviour stamps, so the binder can move a designer's colliding id aside the
 *  same way it does for the `fN` namespace. */
export function timerLayerIds(): string[] {
  return [BAR_ID, WARN_ID, HELD_ID, UP_ID];
}

/**
 * Stamp the picked drawings so the runtime can find them.
 *
 * THE BAR TAKES AN ID AND NOT THE STATE CLASS, which is the one asymmetry in this function and
 * the same one the vote board has. A drawn MOMENT is hidden until something shows it, so the
 * state class is what hides it; a BAR is on screen the whole time and only its LENGTH moves, so
 * giving it that class would hide the very thing the graphic is about.
 */
export function markTimerLayers(root: Element, timer: DesignSvgTimerBehaviour): void {
  const at = (candidateId: string | undefined): Element | null =>
    candidateId ? root.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`) : null;
  const bar = at(timer.bar);
  if (bar) bar.setAttribute('id', BAR_ID);
  const drawn: [string | undefined, string][] = [
    [timer.warning, WARN_ID],
    [timer.paused, HELD_ID],
    [timer.expired, UP_ID],
  ];
  for (const [candidateId, id] of drawn) {
    const el = at(candidateId);
    if (!el) continue;
    el.setAttribute('id', id);
    const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    if (!own.includes(TIMER_STATE_CLASS)) own.push(TIMER_STATE_CLASS);
    el.setAttribute('class', own.join(' '));
    // The designer switched this layer off to see their base look; the stylesheet hides it now,
    // so the file's own display/visibility would fight the class that shows it.
    clearDrawnHiding(el);
  }
}

/** The drawn states of a timer: the held mark, the last stretch, the moment it runs out. */
export const timerBehaviourCss = drawnStateCss(
  TIMER_STATE_CLASS,
  TIMER_ON_CLASS,
  'Drawn states (the countdown)',
  `   Each layer below is artwork the DESIGNER drew for one moment - the mark that says the clock
   is being held, the look the last seconds wear, the plate for the moment it runs out. NoaCG
   only decides when each is visible; nothing here is redrawn or generated. The draining BAR is
   not in this list: it is on screen the whole time and only its length moves.
   Delete a rule to see every state at once.`,
);

/**
 * THE ONE FIELD THIS BEHAVIOUR OWNS: how many seconds before zero the last-stretch look arrives.
 *
 * Neither earlier precedent decides this one. The vote owns five fields because an outside plane
 * WRITES them; the score board owns none because every value it drives is a layer the designer
 * already drew. A warning threshold is neither - it is operator data of exactly the same class as
 * the duration beside it, which the catalog countdown has always exposed as a field
 * (templates/types/clocks.ts). Making it a constant would put it out of reach on the one graphic
 * this ships for, and making it a question in the MAPPING step would put it in front of the
 * wrong person and be the author-side knob the owner ruled out on 2026-08-22. In the cue, beside
 * the minutes, is where it belongs.
 *
 * IT IS DELIBERATELY NOT PART OF THE CLOCK'S OWN SIGNATURE. `clockDataUpdated()` re-arms a
 * running count when the fields the LENGTH derives from change (templates/shared/clock.ts), and
 * that signature is the minutes holder and nothing else. So editing the threshold on air moves
 * the warning at the next paint and leaves the count exactly where it is, which is the only
 * behaviour that could be right: a correction to when the graphic turns red must never restart
 * the question the class is answering.
 *
 * DERIVED, NEVER TYPED (behaviour.ts `fieldCount`, docs/backlog/behaviour-fieldcount-derived-
 * rule.md). `timerBehaviourFields(0).length` is one because this function returns one thing.
 */
export function timerBehaviourFields(from: number): SpxField[] {
  return [
    {
      field: `f${from}`,
      ftype: 'number',
      title: 'Warn at (seconds)',
      value: String(DEFAULT_WARN_SECONDS),
    },
  ];
}

/** The hidden holder SPX writes the threshold into. Input-only - a bare "10" painted on air
 *  means nothing - and hidden by a CSS class rather than an inline style, because the editor's
 *  entrance reset clears inline properties across the whole root subtree (root AGENTS.md). */
export function timerBehaviourHtml(from: number): string {
  return `
    <!-- Warn at (f${from}) - how many seconds before zero the drawn "last stretch" layer comes up.
         Written by SPX like any field; read by the timer runtime in template.js. -->
    <div id="f${from}" class="${DATA_SOURCE_CLASS}">${DEFAULT_WARN_SECONDS}</div>`;
}

/**
 * The entrance, with one call on it - and the `startClock` the clock's own refinement already
 * put there is LEFT ALONE.
 *
 * NO EXTRA STEP on the default path, for the score board's reason: a countdown has no reveal
 * sequence, so everything interesting is beside the path, in the one parallel group. What the
 * step gains is what the poll's and the score's entrances gained - something to put the board
 * in a known state when it arrives, because every drawn state starts hidden.
 *
 * AT TIME 0, ahead of `startClock` (which the clock refinement appends at the entrance's END,
 * templates/importedDesign/svg.ts). Order matters: `timerOnAir` clears the drawn marks and
 * `startClock` then paints the first frame through `clockPainted`, so the board arrives showing
 * the full count with nothing lit. Reversed, the arriving frame would blank the bar the entrance
 * had just drawn.
 */
export function withTimerSteps(data: AnimData): AnimData {
  return {
    ...data,
    steps: data.steps.map((s, i) =>
      i === 0 ? { ...s, name: 'On air', calls: [{ time: 0, call: 'timerOnAir' }, ...(s.calls ?? [])] } : { ...s },
    ),
  };
}

/**
 * One state of the catalog countdown's clock group with its LAYER TRACKS dropped and our paint
 * call appended.
 *
 * THIS IS THE SCORE BOARD'S `drawnStateBranch` MADE AGAIN, deliberately and not shared. The two
 * are close - both take a catalog state, keep its timing, drop the tracks that animate parts we
 * did not draw, and hang one call on it - and they are not the same: the score board's guards
 * against re-appending a call the catalog already made, and this one has no such case. Folding
 * them together would be an abstraction over a sample of two, which is the move this whole area is
 * written to refuse (docs/GRAPHIC_BEHAVIOUR_PLAN.md §6). A third behaviour wanting it is when it
 * becomes one function.
 *
 * The catalog's two states dim and undim a `.game-timer-clock` part so an operator can SEE that
 * the clock is held. That part does not exist on artwork we did not draw, and an unresolved part
 * name in a timeline compiles to a selector that matches nothing. So the TIMING survives - it is
 * the catalog board's, and this module has no better opinion about how long a pause reads for -
 * and the dim is replaced by the layer the DESIGNER drew.
 *
 * ONE HONEST LOSS, worth writing down: a board whose designer drew no held mark now shows
 * NOTHING when the clock is paused, where the catalog board dims. Nothing can be done about that
 * without painting on somebody else's artwork, which is the whole L2 answer (§4).
 */
function clockBranch(group: TypeGroup | undefined, id: string, call: string, edges: TypeBranch['edges']): TypeBranch {
  const source = group?.states.find((s) => s.id === id);
  const existing = source?.timeline?.calls ?? [];
  return {
    id,
    ...(source?.name ? { name: source.name } : {}),
    timeline: source?.timeline
      ? { ...source.timeline, calls: [...existing, { time: 0, call }], layers: {} }
      : { name: id, duration: 0.25, ease: 'out', calls: [{ time: 0, call }], layers: {} },
    edges,
  };
}

/** The event names, one set, so the machine and the controls cannot spell them differently. */
const START_EVENT = 'start';
const PAUSE_EVENT = 'pause';
const RESET_EVENT = 'reset';

/**
 * The countdown's arc: one parallel group, three states, three events.
 *
 * THE CATALOG'S TWO STATES PLUS ONE. `running` and `paused` are the shipped countdown type's own
 * (templates/types/clocks.ts), reused with their timings; `armed` is what Reset needs, and it is
 * a real on-air look rather than a second copy of `running` - the card is up, the clock shows the
 * full length, and nothing is counting.
 *
 * WHY RESET NEEDED A THIRD STATE AT ALL. In this model an event's effect is the DESTINATION
 * state's timeline calls, so two events landing in one state necessarily run the same call:
 * "start again from where we were" and "put it back to the top" cannot both land in `running`.
 * Making the difference a payload would be the same drift the score board's `set` exists to
 * prevent - the runtime and the operator's own box telling different stories. A state says it
 * once, structurally, and the operator can see which one the board is in.
 *
 * ONE `start`, NOT A `start` AND A `resume`. Both mean go, and a control page with two buttons
 * that mean go is a page the operator has to read rather than press. The structural guard does
 * the rest: it is grey while the clock runs, and lit from either of the other two.
 *
 * RESET IS LEGAL EVERYWHERE, including from `armed` as a self-transition. An event with no arrow
 * out of the current state is DROPPED, and an operator whose Reset silently does nothing because
 * the board happens to be armed already would be worse off than one with no Reset at all - the
 * score board's rule, and the speaking timer's before it.
 *
 * ONE LIMIT THIS ARC CANNOT EXPRESS, and it is honest rather than hidden: Pause stays legal at
 * 0:00, because a structural guard reads states and not the clock. Pressing it there shows the
 * held mark over a stopped 0:00 - `pauseClock` has nothing to hold, so nothing else happens - and
 * Reset clears it. That is the operator's own press shown back to them.
 */
function importedTimerMachine(): TypeMachine {
  const op = (from: string, to: string, event: string) => ({ from, to, trigger: 'operator' as const, event });
  // The catalog countdown's own clock group - the state ids, the durations and the eases this
  // behaviour reuses rather than re-chooses. Found once and handed down, the way the score board
  // hands its two groups down.
  const clock = (countdownType.machine?.parallel ?? []).find((g) => g.id === 'clock');
  return {
    parallel: [
      {
        id: 'clock',
        // The take starts the count (the owner ruling in this file's header), and a parallel
        // group's initial state is where it RESTS rather than something it enters - so `running`
        // being initial is precisely what makes the entrance's own `startClock` the thing that
        // starts it, with no transition firing and no second opinion about when a clock begins.
        initial: 'running',
        states: [
          clockBranch(clock, 'running', 'timerRun', [
            op('paused', 'running', START_EVENT),
            op('armed', 'running', START_EVENT),
          ]),
          clockBranch(clock, 'paused', 'timerHold', [op('running', 'paused', PAUSE_EVENT)]),
          {
            id: 'armed',
            name: 'Armed',
            // Its own timeline rather than a pose: entering `armed` has to UNDO whatever the last
            // count left on screen - the time-up plate, the last-stretch look, a bar drained to
            // nothing - and a state that plays nothing would leave all three up.
            timeline: { name: 'Reset', duration: 0.25, ease: 'out', calls: [{ time: 0, call: 'timerArm' }], layers: {} },
            edges: [
              op('running', 'armed', RESET_EVENT),
              op('paused', 'armed', RESET_EVENT),
              op('armed', 'armed', RESET_EVENT),
            ],
          },
        ],
      },
    ],
  };
}

/**
 * THE BUTTONS, AND EVERY ONE OF THEM IS THE CONVENTIONAL ANSWER.
 *
 * `docs/BEHAVIOUR_SURVEY.md` reads seventeen products; ten ship a timer, and START, PAUSE and
 * RESET is what they agree on - Singular's uno Countdown (Play and Reset), the OBS scoreboard
 * plugin (pause and reset), NewBlue, XPression's Clock and Timers widget, Viz Trio's live start /
 * stop / continue, and H2R, whose Companion module publishes start timer and pause timer as
 * named verbs. The method is the standing one: a design default is not a taste question
 * (docs/acceptance/OWNER_QUEUE.md).
 *
 * WHAT THE SURVEY FOUND AND THIS DOES NOT SHIP, said out loud because it is the clearest thing
 * it turned up: ADD AND REMOVE TIME on a running clock. vMix has `AdjustCountdown` and H2R has
 * "add/remove time"; nobody else does, and it is a real need - a segment overruns and the clock
 * has to be corrected without being restarted. It is not here because the honest version needs a
 * mechanism this graphic does not have. An `adjust` on the minutes field would not add a minute
 * to what is LEFT: `clockDataUpdated()` re-arms a running count to the whole new length, so "+1
 * min" on a clock reading 0:20 of 5:00 would put 6:00 on air. Shifting the deadline in the
 * runtime instead would air a count the operator's own minutes box no longer describes, which is
 * the drift every other decision in this module exists to avoid. Filed rather than guessed:
 * docs/backlog/adjust-a-running-clock.md.
 *
 * THE LABELS ARE THE VERBS, not "Start clock" and "Pause clock". The catalog countdown says the
 * longer form because its control page may carry a whole scorebug's worth of buttons; here the
 * section IS the clock, so the noun would be printed twice on every key.
 */
function timerControls(): TypeControlEvent[] {
  return [
    { event: START_EVENT, label: 'Start', section: 'Clock', order: 1 },
    { event: PAUSE_EVENT, label: 'Pause', section: 'Clock', order: 2 },
    // Destructive for the score board's reason: it throws away a count that is on air, with no
    // confirmation dialog anywhere in this product. A danger control is how the surveyed tools
    // guard exactly that.
    { event: RESET_EVENT, label: 'Reset', section: 'Clock', order: 3, destructive: true },
  ];
}

/**
 * The type `attachMachine` compiles against.
 *
 * `fields` mirrors the template's real field order - the artwork's own, then this behaviour's one
 * - for the reason `importedQuizType` states: `fieldIdFor` resolves a control's payload key by
 * its INDEX in this array. No control here carries a payload, so nothing would MOVE if the
 * mirror slipped; it is kept exact anyway, because the next control that carries one would
 * inherit a mirror nobody had reason to keep right.
 */
export function importedTimerType(svg: DesignSvg): GraphicType {
  const clock = svg.fields.findIndex((f) => f.countdown);
  const artwork: TypeField[] = [...svg.fields, ...svg.images].map((f, i) => ({
    key: `svg${i}`,
    label: 'title' in f ? f.title : `Layer ${i + 1}`,
    // The countdown layer's own field is the LENGTH IN MINUTES, which the binder emits as a
    // number field so every surface draws it with steppers (templates/importedDesign/svg.ts).
    kind: i === clock ? 'number' : 'text',
    value: '',
    role: 'data' as const,
  }));
  return {
    id: 'imported-timer',
    name: 'Imported countdown',
    description: 'Imported artwork driven by the countdown’s arc: it starts on air, and holds, resumes and resets.',
    // The artwork IS the structure. Nothing is required, because the author's own drawing is what
    // the parts would name and we did not draw it - `missingParts` has nothing to check.
    structure: { prefix: PREFIX, category: 'game-timer', parts: [] },
    fields: [
      ...artwork,
      { key: 'warnAt', label: 'Warn at (seconds)', kind: 'number', value: String(DEFAULT_WARN_SECONDS), role: 'data' },
    ],
    machine: importedTimerMachine(),
    controls: timerControls(),
    capabilities: { maxLines: 1, logo: 'none', animationPresets: [], defaultZone: 'top-center' },
    designs: [],
  };
}

/**
 * The paint.
 *
 * TWO SOURCES, AND THEY ARE NOT THE SAME KIND OF THING - which is this behaviour's contribution
 * to the seam (see the header).
 *
 *   * THE HELD MARK COMES FROM THE MACHINE. It is a state: the operator pressed Pause. It is
 *     read out of `noacgMachineState()` and never out of the runtime's own `clockPaused`, so a
 *     snap recovery repaints it from the machine rather than from whatever the page happened to
 *     be doing.
 *   * THE BAR, THE LAST STRETCH AND THE TIME-UP PLATE COME FROM THE CLOCK. Nothing in the model
 *     could make them states honestly: a state changes on an operator event or an authored timer
 *     edge, and an authored timer is a fixed `after` armed when the state is entered - it cannot
 *     follow a count the operator pauses, re-arms with Update, or resets, so a `warning` state
 *     would drift the first time anybody pressed Pause. States would also multiply the group,
 *     since running-or-paused times plain-or-warning-or-up is six states with every arrow drawn
 *     twice, which is the explosion `docs/STATE_MACHINE_SCHEMA.md` forbids in as many words
 *     ("parameterize with data, not states"). The seconds left are already data-shaped - derived
 *     from a field and the wall clock, painted through one hook that also fires on a pause, a
 *     resume, an Update and the idle preview - so a look painted there is right on every road.
 *     The runtime's own time-up class is set on a tick and not by a state, and the vote board's
 *     bars are the same move.
 */
export function timerBehaviourJs(timer: DesignSvgTimerBehaviour, from: number): string {
  const drawn = [
    timer.bar ? `//   #${BAR_ID}      the bar, drawn FULL - its length is the time left` : '',
    timer.warning ? `//   #${WARN_ID}     the look the last seconds wear` : '',
    timer.paused ? `//   #${HELD_ID}     the mark that says the clock is being held` : '',
    timer.expired ? `//   #${UP_ID}       the moment it runs out` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `
// ── The countdown ────────────────────────────────────────────────────────────
// The layers below are YOUR drawings. This code only turns them on and off, and moves the bar:
${drawn || '//   (none bound - the clock still starts, holds, resumes and resets)'}
// A layer you did not draw is simply absent, and every function here skips it.
//
// The CLOCK itself is the shared countdown runtime above: the layer you bound as a Countdown is
// the readout, and its field is the length in minutes. Nothing here counts - this is only what
// your artwork does WHILE it counts.


var timerBarFull = 0;            // the bar as the designer drew it, measured once (see below)
var timerRanOut = 0;             // the length of the count that reached zero, or 0 (clockPainted)

${drawnStateShowJs('tShow', TIMER_ON_CLASS)}

// timerWarnSeconds(): the operator's threshold, or the shipped default when they cleared the box.
// Read on EVERY paint rather than remembered, so a correction typed on air lands at the next
// tick without re-arming the count under it.
function timerWarnSeconds() {
  var source = document.getElementById('f${from}');
  var value = source ? parseFloat(source.textContent) : NaN;
  return value >= 0 ? value : ${DEFAULT_WARN_SECONDS};
}

// timerBarLength(el): the bar as the designer drew it, which is what the WHOLE duration means on
// this board. Measured once and remembered - re-reading it after a pass would let the last pass's
// length become this pass's full length, so a bar that ever drained could never fill again (the
// lesson the vote board's bars and the growth runtime both paid for).
//
// A <rect> states its own width; anything else is measured, and getBBox reports the element's own
// user space, so it answers the same whatever we have scaled it to since. A failed read is asked
// again next time rather than cached: getBBox throws in some engines and answers zero in others
// while the element is still unlaid-out, and remembering that zero would retire the bar for the
// life of the page.
function timerBarLength(el) {
  if (timerBarFull > 0) return timerBarFull;
  var w = el.hasAttribute('width') ? parseFloat(el.getAttribute('width')) : NaN;
  if (isNaN(w) || !(w > 0)) {
    try { w = el.getBBox().width; } catch (e) { w = 0; }
  }
  if (w > 0) timerBarFull = w;
  return w > 0 ? w : 0;
}

// timerSetBar(left, total): the bar at the share of the count still to run.
//
// A RECTANGLE'S WIDTH IS SET, NEVER ITS SCALE - scaling squashes a rounded cap, so a bar drawn
// with round ends would be a different shape at every second. Anything else the designer drew is
// scaled about its own LEFT edge, so it drains from the right towards where it starts.
//
// TWEENED OVER THE PAINT INTERVAL, LINEARLY, AND FOR ONE REASON ONLY: the runtime paints four
// times a second, and a bar that jumped four times a second would read as broken rather than as
// draining. Linear because time is linear - an eased drain would be a bar disagreeing with the
// digits beside it, which is the same failure an overshooting vote bar was refused for.
//
// THE MOTION-SPEED KNOB DOES NOT REACH IT, and that is the same argument once more. Every other
// tween on this graphic is MOTION and slows down with the knob; a drain bar is a picture of the
// CLOCK, and a clock that ran at half speed while the digits did not would be the disagreement
// this whole function is written to avoid. It also removes a real defect rather than only an
// inconsistency: at 0.5x the tween would outlast the 250 ms interval, so every pass would leave a
// live tween for the next one to fight. The overwrite is belt to that brace - a late paint must
// replace the last target, never queue behind it.
function timerSetBar(left, total) {
  var el = document.getElementById('${BAR_ID}');
  if (!el) return;
  var full = timerBarLength(el);
  if (!(full > 0)) return;
  var share = total > 0 ? left / total : 0;
  if (share < 0) share = 0;
  if (share > 1) share = 1;
  if (el.hasAttribute('width')) {
    gsap.to(el, { attr: { width: full * share }, duration: 0.25, ease: 'none', overwrite: true });
    return;
  }
  var box;
  try { box = el.getBBox(); } catch (e) { return; }
  gsap.to(el, {
    scaleX: share,
    svgOrigin: box.x + ' ' + (box.y + box.height / 2),
    duration: 0.25,
    ease: 'none',
    overwrite: true,
  });
}

// clockPainted(secondsLeft, totalSeconds): THE JOIN. The shared clock runtime calls this on every
// paint it makes - the idle preview before the first play(), each tick, a pause, a resume, and an
// Update - so everything driven by the count is decided in one place and on every road. It is the
// runtime's own hook (templates/shared/clock.ts); this behaviour did not invent it and does not
// poll.
//
// ONCE IT HAS RUN OUT IT STAYS RUN OUT, which is the owner's own ruling ("at zero HOLDS at 0:00
// until taken out") and which needs saying here because the shared runtime does not hold it on
// its own. At zero, \`tickClock\` calls \`stopClock()\`, and that clears \`clockPaused\` as well as the
// interval - so the next \`clockDataUpdated()\` takes the "not counting, not paused" branch and
// re-derives \`clockSecondsLeft\` from the length, whatever the operator actually changed. Correct a
// typo in a caption while the board holds at 0:00 and the digits jump back to the full count with
// nothing having restarted. That is a defect in the shared runtime and it reaches every catalog
// countdown too (filed: docs/backlog/a-finished-clock-refills-on-an-unrelated-update.md); this
// module cannot fix it from here without changing what every clock in the catalog does, so it
// refuses to REPAINT the lie: the plate stays up and the bar stays empty.
//
// A NEW LENGTH IS THE ONE THING THAT UN-FINISHES IT, and the total is what says so. That is
// exactly the shared runtime's own intent one branch further down ("a finished countdown given a
// new length is no longer finished"), read off the number this hook is already handed rather than
// off a second signal.
function clockPainted(secondsLeft, totalSeconds) {
  if (timerRanOut > 0) {
    if (totalSeconds === timerRanOut) return;   // still the same count - it is still finished
    timerRanOut = 0;                            // a new length: this is a different count now
  }
  if (secondsLeft <= 0) timerRanOut = totalSeconds;
  timerSetBar(secondsLeft, totalSeconds);
  var up = secondsLeft <= 0;
  var warn = !up && secondsLeft <= timerWarnSeconds();
  tShow('${UP_ID}', up);
  tShow('${WARN_ID}', warn);
}

// ── The beats, each named by the state or step that plays it ─────────────────

// timerOnAir(): the card arrives. Named by the entrance step, because every drawn state starts
// hidden and the runtime's memory of the bar starts empty. It runs BEFORE the entrance's
// startClock, which then paints the first frame through clockPainted above.
function timerOnAir() {
  timerRanOut = 0;
  tShow('${HELD_ID}', false);
  tShow('${WARN_ID}', false);
  tShow('${UP_ID}', false);
}

// timerRun(): the clock is going. The catalog countdown's own resumeClock has already run on this
// same state (its call is kept ahead of ours), so all that is left is to take the held mark down.
function timerRun() {
  tShow('${HELD_ID}', false);
}

// timerHold(): the operator is holding the clock. pauseClock has already run on this state.
function timerHold() {
  tShow('${HELD_ID}', true);
}

// timerArm(): Reset. Put the count back to the length the operator asked for, stop it there, and
// undo everything the last run left on screen. The clock runtime's own idle paint does the
// counting half; this adds the stop and the marks.
function timerArm() {
  if (typeof stopClock === 'function') stopClock();
  var root = document.querySelector('.${PREFIX}');
  if (root) root.classList.remove('${PREFIX}-done');
  // Before the idle paint, or clockPainted would still be holding the finished count and refuse
  // to repaint the very thing Reset exists to undo.
  timerRanOut = 0;
  tShow('${HELD_ID}', false);
  if (typeof paintIdleClock === 'function') paintIdleClock();
}

// paintTimerState(): the board, repainted from the MACHINE. update() calls this, so a new
// duration or a new threshold moves what the clock shows WITHOUT any transition firing - data
// never causes a state change (docs/STATE_MACHINE_SCHEMA.md) - and a snap replays states with
// callbacks suppressed, so this is also what puts the held mark back after a recovery.
//
// Only the held mark is read here. Everything else this behaviour paints is decided by the count,
// and the count repaints itself: the clock's own clockDataUpdated() runs on the same update() and
// calls clockPainted above.
function paintTimerState() {
  var groups = {};
  if (typeof noacgMachineState === 'function') groups = noacgMachineState().groups || {};
  tShow('${HELD_ID}', groups.clock === 'paused');
}
`;
}

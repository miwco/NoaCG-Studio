// The DEBATE FLOOR's shared parts: the field contract, and the two-clock engine that runs it.
//
// It lives beside the boards rather than in the type, because a field list and a runtime are
// things a DESIGN emits — but the speaking-timer TYPE has to declare exactly the same fields it
// will compile against, and two hand-kept copies of one contract is how they come to disagree.
// So the contract is declared once here in the type's own `TypeField` vocabulary, the type
// spreads it, and the design compiles it to SPX DataFields through `typeFieldsToSpx`.
//
// The import points scoreboards/ -> types/graphicType.ts, which is a leaf: it reaches into
// model/ and blocks/ and never back into templates/, so there is no cycle to boot into.

import { typeFieldsToSpx, type TypeField } from '../types/graphicType';
import type { SpxField } from '../../model/types';

/**
 * The debate floor's ten fields.
 *
 * The ORDER is load-bearing twice over. `typeFieldsToSpx` numbers them f0..f9 in declaration
 * order and throws if a `line` field follows a non-line one; and the animation presets
 * choreograph `#f0 … #f{lineCount-1}`, so every field with a visible span has to come before
 * the one that does not. The penalty size is therefore last: it is the only value nothing
 * paints.
 *
 * WHY THE CLOCKS ARE FIELDS the operator can type into: the same reason the match clock is
 * (shared/matchClock.ts). A speaking clock drifts from the chair's stopwatch, and a clock that
 * cannot be corrected is one the chair stops trusting. Typing a time re-anchors the count.
 */
export const DEBATE_FLOOR_FIELDS: TypeField[] = [
  { key: 'round', label: 'Round label', kind: 'text', value: 'OPENING STATEMENTS', role: 'line' },
  { key: 'sideA', label: 'Side A', kind: 'text', value: 'PROPOSITION', role: 'line' },
  { key: 'speakerA', label: 'Speaker A', kind: 'text', value: 'MAYA OKONKWO', role: 'line' },
  { key: 'sideB', label: 'Side B', kind: 'text', value: 'OPPOSITION', role: 'line' },
  { key: 'speakerB', label: 'Speaker B', kind: 'text', value: 'LUCAS BERG', role: 'line' },
  // The two clocks. `data`, not `line`: they are numbers the engine paints and the chair
  // corrects, not text the wizard's line editor should be offering to rewrite.
  { key: 'clockA', label: 'Clock A', kind: 'text', value: '05:00', role: 'data' },
  { key: 'clockB', label: 'Clock B', kind: 'text', value: '05:00', role: 'data' },
  // The allowance is the number the clocks RESET to, and it is on screen: the audience reads
  // the same figure the chair typed, so nobody has to be told what "reset" will do.
  { key: 'allowance', label: 'Speaking time each', kind: 'text', value: '05:00', role: 'data' },
  { key: 'allowanceWord', label: 'Allowance word', kind: 'text', value: 'EACH', role: 'data' },
  // Input only — it lives in a display:none holder, so `hidden` is the honest role. `number`
  // is the control: a penalty is lengthened far more often than it is retyped.
  { key: 'penalty', label: 'Penalty (seconds)', kind: 'number', value: '10', role: 'hidden' },
];

/** The debate floor's fields as SPX DataFields — what the assembler writes into the definition. */
export const debateFloorSpxFields = (): SpxField[] => typeFieldsToSpx(DEBATE_FLOOR_FIELDS);

/** The `fN` id one logical key compiled to. Hand-written here so the runtime below can name
 *  its own elements without the design repeating the field order a third time. */
const idOf = (key: string): string => `f${DEBATE_FLOOR_FIELDS.findIndex((f) => f.key === key)}`;

/**
 * THE TWO-CLOCK ENGINE — playout, not motion, so the design emits it OUTSIDE the marked
 * ANIMATION region and the timeline can never rewrite it (the shared/clock.ts rule).
 *
 * The machine only CALLS into it by name: `runSpeakerA` / `runSpeakerB` when the floor passes,
 * `resetClocks` when the chair re-arms, `applyPenalty` / `clearPenaltyMark` for a docked speaker,
 * `holdClocks` on the way off air.
 *
 * WHAT IT IS HONEST ABOUT: the running count is anchored to a DEADLINE in this renderer's own
 * clock, recomputed every tick, so a late or coalesced interval is self-correcting rather than
 * cumulative — a five-minute speech still ends at 00:00 in the browser that started it. It is
 * NOT origin-stamped the way the match clock is (`"45:00@<epoch>"`, matchClock.ts §4), so two
 * renderers started a second apart stay a second apart, and a browser source RELOADED mid-speech
 * comes back at the time on the field rather than the time on the wall. Stamping needs a
 * control-plane writer per clock (src/control/matchClockWire.ts does it for the one match
 * clock), which this graphic does not have yet.
 */
export function debateFloorRuntimeJs(): string {
  return `// ---- The debate floor's two clocks (playout, not motion — the machine calls into this) ----
// One clock runs at a time: whoever holds the floor. The truth about how much time a speaker
// has left is the number ON SCREEN, which is also the field the chair can retype mid-debate.
var DEBATE_TICK_MS = 250;        // four times a second — a retyped correction is adopted fast
var debateTimer = null;          // the repaint interval while a clock runs, else null
var debateActive = null;         // 'a', 'b', or null when nobody holds the floor
var debateDeadline = 0;          // ms timestamp the running count is anchored to
var debateLastPaint = { a: '', b: '' };   // what WE last wrote (anything else is the operator)
var debateExpired = { a: false, b: false };
var debateDocked = null;         // the side wearing a just-taken penalty, or null

function debateClockEl(side) { return document.getElementById(side === 'a' ? '${idOf('clockA')}' : '${idOf('clockB')}'); }

// "05:00" -> 300 · "5:00" -> 300 · "300" -> 300 (a bare number is seconds). Anything else is 0,
// which is how a half-typed value stops the count instead of racing to a nonsense deadline.
function debateParseTime(text) {
  var raw = String(text == null ? '' : text).replace(/\\s+/g, '');
  if (!raw) return 0;
  var parts = raw.split(':');
  var total;
  if (parts.length === 1) {
    if (!/^\\d+$/.test(parts[0])) return 0;
    total = parseInt(parts[0], 10);
  } else {
    if (!/^\\d+$/.test(parts[0]) || !/^\\d+$/.test(parts[1])) return 0;
    total = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return total > 0 ? total : 0;
}

function debateFormat(total) {
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
}

// Paint one side's remaining time, and remember that it is out of time when it is.
function debatePaint(side, seconds) {
  var left = Math.max(0, seconds);
  var el = debateClockEl(side);
  if (el) {
    el.textContent = debateFormat(left);
    debateLastPaint[side] = el.textContent;
  }
  debateExpired[side] = left <= 0;
  debatePaintClockColors();
}

function debateRemaining(side) {
  var el = debateClockEl(side);
  return debateParseTime(el ? el.textContent : '');
}

// The allowance each speaker gets, and the size of one penalty.
function debateAllowance() {
  var el = document.getElementById('${idOf('allowance')}');
  var seconds = debateParseTime(el ? el.textContent : '');
  return seconds > 0 ? seconds : 300;
}

function debatePenaltySeconds() {
  var el = document.getElementById('${idOf('penalty')}');
  var seconds = parseInt(el ? String(el.textContent).replace(/\\s+/g, '') : '', 10);
  return seconds > 0 ? seconds : 10;
}

// Whose clock is running is said in COLOUR: the accent while it runs, the danger colour when it
// has just been docked or has run out, plain text otherwise. The machine's states carry the same
// colours as keyframes, so a parked or thumbnailed frame is right with no clock running at all;
// the engine re-asserts them here whenever the truth underneath changes.
function debateClockColorFor(side) {
  if (debateExpired[side] || debateDocked === side) return 'var(--penalty-color)';
  return (debateActive === side && debateTimer) ? 'var(--accent)' : 'var(--text-color)';
}

function debatePaintClockColors() {
  var sides = ['a', 'b'];
  for (var i = 0; i < sides.length; i++) {
    var el = debateClockEl(sides[i]);
    if (el) el.style.color = debateClockColorFor(sides[i]);
  }
}

function debateStopTimer() {
  if (debateTimer) { clearInterval(debateTimer); debateTimer = null; }
}

// One tick: recompute from the deadline rather than decrementing a counter, so nothing
// accumulates. If the number on screen is not the one we painted, the chair (or an update) has
// typed into the clock — adopt that as the new truth, and leave anything that is not a time
// exactly where they put it rather than overwriting a half-finished edit.
function debateTick() {
  if (!debateActive) return;
  var el = debateClockEl(debateActive);
  var shown = el ? String(el.textContent).replace(/\\s+/g, '') : '';
  if (shown !== debateLastPaint[debateActive]) {
    var typed = debateParseTime(shown);
    if (typed <= 0) { debateStopTimer(); debatePaintClockColors(); return; }
    debateDeadline = Date.now() + typed * 1000;
  }
  var left = Math.max(0, Math.ceil((debateDeadline - Date.now()) / 1000));
  debatePaint(debateActive, left);
  if (left <= 0) { debateStopTimer(); debatePaintClockColors(); }
}

// Freeze whoever is speaking at the value on screen.
function debateHold() {
  if (debateActive && debateTimer) {
    debatePaint(debateActive, Math.max(0, Math.ceil((debateDeadline - Date.now()) / 1000)));
  }
  debateStopTimer();
}

// Give one side the floor: the other stops where it is, this one picks up from its OWN number.
// That is the whole point of two clocks — a speaker who is interrupted does not lose the time.
function debateStart(side) {
  debateHold();
  debateActive = side;
  var left = debateRemaining(side);
  debateDeadline = Date.now() + left * 1000;
  debatePaint(side, left);
  if (left > 0) debateTimer = setInterval(debateTick, DEBATE_TICK_MS);
  debatePaintClockColors();
}

function runSpeakerA() { debateStart('a'); }
function runSpeakerB() { debateStart('b'); }

// The exit's call: nobody holds the floor once the board is off air.
function holdClocks() {
  debateHold();
  debateActive = null;
  debatePaintClockColors();
}

// Both clocks back to the set allowance, nothing running — the reset button's whole job.
// RESET IS TWO OPERATIONS and this is the DATA half: it puts the numbers back. The floor group
// walking to its own armed state is the visual half, and the machine owns that.
function resetClocks() {
  debateStopTimer();
  debateActive = null;
  var full = debateAllowance();
  debatePaint('a', full);
  debatePaint('b', full);
  debatePaintClockColors();
  clearPenaltyMark();
}

// Dock the penalty from whoever is speaking. The running clock keeps running, just shorter —
// a penalty is a deduction, not a stoppage.
function applyPenalty() {
  var badge = document.querySelector('.scoreboard-penalty');
  var cost = debatePenaltySeconds();
  if (badge) badge.textContent = '-' + cost;
  if (!debateActive) return;
  var live = debateTimer
    ? Math.max(0, Math.ceil((debateDeadline - Date.now()) / 1000))
    : debateRemaining(debateActive);
  var left = Math.max(0, live - cost);
  debatePaint(debateActive, left);
  if (left > 0) debateDeadline = Date.now() + left * 1000;
  else debateStopTimer();
  debateDocked = debateActive;
  debatePaintClockColors();
}

// The penalty group's other state calls this when the flash is over.
function clearPenaltyMark() {
  debateDocked = null;
  debatePaintClockColors();
}

// After update(): the chair may have retyped a clock or the allowance. Never repaint here —
// their text is theirs — just re-anchor the running count to what now stands on screen.
function debateAdoptTypedClock() {
  if (!debateActive) return;
  var left = debateRemaining(debateActive);
  if (left <= 0) return;
  debateDeadline = Date.now() + left * 1000;
  debateLastPaint[debateActive] = debateFormat(left);
  if (!debateTimer) { debateTimer = setInterval(debateTick, DEBATE_TICK_MS); debatePaintClockColors(); }
}

// Show the allowance on both clocks before the first play(), so a preview and the studio's
// parked view look like the board will. This file loads in <head> — wait for the DOM.
function paintIdleDebateClocks() {
  var full = debateAllowance();
  debatePaint('a', full);
  debatePaint('b', full);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', paintIdleDebateClocks);
} else {
  paintIdleDebateClocks();
}
`;
}

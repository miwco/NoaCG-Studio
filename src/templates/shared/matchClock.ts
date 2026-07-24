// The MATCH CLOCK — the sports clock a scorebug runs, and the sports pack's one piece of
// genuinely stateful playout logic.
//
// It is design-owned runtime JS, emitted OUTSIDE the marked ANIMATION region exactly like
// shared/clock.ts, for the same reason: a clock is playout, not motion. The state machine's
// `clock` group only CALLS into it (`startMatchClock` / `stopMatchClock` / `resetMatchClock`),
// so the timeline can rewrite the entrance all it likes and the clock keeps running.
//
// Three things make this an operator tool rather than a decoration:
//
//   1. IT COUNTS BOTH WAYS. Football counts up to 45:00, basketball and hockey count DOWN to
//      0:00, and a period that reaches zero has to stop itself and say so. The direction is a
//      DESIGN decision, declared on the clock element as `data-count="up" | "down"` — an
//      operator never has to pick it, and a template cannot end up in the wrong sport.
//   2. THE OPERATOR OWNS THE VALUE. The clock element IS a data field (`id="fN"`), so typing
//      "43:12" into the control page re-seeds the running clock. Every live clock drifts from
//      the stadium's, and a scorebug you cannot correct is a scorebug you stop trusting.
//   3. RESET IS A SEPARATE OPERATION. `resetMatchClock` returns to the element's own
//      `data-start`, never to zero-by-assumption — the same "reset is two operations" rule the
//      state machine holds for visual state and data (docs/STATE_MACHINE_SCHEMA.md).
//
// Everything here is prefix-parameterized, so a scoreboard-category board and an
// infographic-category match centre share one implementation.

/**
 * The match-clock runtime for a category prefix ('scoreboard', 'infographic').
 *
 * Contract with the design:
 *   - one `.{prefix}-clock` element, which SHOULD also carry a field id so the operator can
 *     correct it; `data-count="down"` counts down (default is up), `data-start="45:00"` is
 *     what `resetMatchClock` returns to (default is the element's initial text);
 *   - the root `.{prefix}` gains `.{prefix}-final` at full time, `.{prefix}-break` during an
 *     interval, and `.{prefix}-expired` when a counting-down clock reaches zero, so a design
 *     styles each of the three without any of them being a separate state to animate.
 */
export function matchClockJs(prefix: string): string {
  return `// ---- Match clock (playout, not motion — the machine's clock group calls into this) ----
// The clock element also carries a data field id, so an operator can correct a drifting
// clock by typing into it; matchClockUpdate() below re-seeds the tick from what they typed.

var matchClockTimer = null;      // the 1-second interval, or null while the clock is held
var matchSeconds = 0;            // the clock's value, in seconds — the single source of truth
var matchClockReady = false;     // true once the element has been read for its starting value

// matchClockEl(): the one clock element, or null on a design that has no clock.
function matchClockEl() {
  return document.querySelector('.${prefix}-clock');
}

// parseMatchClock(): "45:00" -> 2700 · "90" -> 90 seconds. Anything unparseable reads as 0
// rather than NaN, so a typo blanks the clock instead of painting "NaN:aN" on air.
function parseMatchClock(text) {
  var parts = String(text == null ? '' : text).trim().split(':');
  var mins = parseInt(parts[0], 10) || 0;
  if (parts.length < 2) return Math.max(0, mins);          // a bare number is seconds
  return Math.max(0, mins * 60 + (parseInt(parts[1], 10) || 0));
}

// formatMatchClock(): 2700 -> "45:00". Minutes are never zero-padded (broadcast reads "7:05",
// not "07:05"); seconds always are.
function formatMatchClock(total) {
  if (total < 0) total = 0;
  var s = total % 60;
  return Math.floor(total / 60) + ':' + (s < 10 ? '0' + s : s);
}

// initMatchClock(): read the element's own starting value once. The field's default text IS
// the starting value, so a design never repeats the number in two places.
function initMatchClock() {
  var el = matchClockEl();
  if (!el || matchClockReady) return;
  matchSeconds = parseMatchClock(el.getAttribute('data-start') || el.textContent);
  matchClockReady = true;
  paintMatchClock();
}

// paintMatchClock(): write the clock's value into the element. A clock that has counted down
// to zero marks the root .${prefix}-expired so the design can flash it — the period is over
// whether or not anyone pressed a button.
function paintMatchClock() {
  var el = matchClockEl();
  if (!el) return;                                  // a design without a clock: nothing to paint
  el.textContent = formatMatchClock(matchSeconds);
  var root = document.querySelector('.${prefix}');
  if (!root) return;
  var down = el.getAttribute('data-count') === 'down';
  if (down && matchSeconds === 0) root.classList.add('${prefix}-expired');
  else root.classList.remove('${prefix}-expired');
}

// tickMatchClock(): one second of match time, in the element's own direction. A counting-down
// clock stops itself at zero — nothing below it is a valid time.
function tickMatchClock() {
  var el = matchClockEl();
  var down = !!el && el.getAttribute('data-count') === 'down';
  if (down) {
    matchSeconds = matchSeconds - 1;
    if (matchSeconds <= 0) { matchSeconds = 0; stopMatchClock(); }
  } else {
    matchSeconds = matchSeconds + 1;
  }
  paintMatchClock();
}

// startMatchClock(): run from where the clock STANDS. A restart after a stoppage must never
// send the match back to 0:00 — that is what resetMatchClock() is for.
function startMatchClock() {
  initMatchClock();
  if (matchClockTimer) return;                      // already running: starting twice is a no-op
  var el = matchClockEl();
  if (el && el.getAttribute('data-count') === 'down' && matchSeconds === 0) return;  // nothing left to run
  matchClockTimer = setInterval(tickMatchClock, 1000);
}

// stopMatchClock(): hold the clock where it is. The value survives — a held clock is still the
// match time, it just is not moving.
function stopMatchClock() {
  if (matchClockTimer) { clearInterval(matchClockTimer); matchClockTimer = null; }
}

// resetMatchClock(): back to the period's own starting value (data-start, else the element's
// original text), held. Reset is deliberately a separate operation from stop, and it never
// assumes zero: a period that counts down from 12:00 resets to 12:00, not to nothing.
function resetMatchClock() {
  stopMatchClock();
  var el = matchClockEl();
  if (!el) return;
  matchSeconds = parseMatchClock(el.getAttribute('data-start') || '0');
  paintMatchClock();
}

// matchClockUpdate(key, value): called from update() for every field written. When the value
// lands in the CLOCK element, re-seed the tick from it — otherwise the next tick would
// overwrite the correction a second later and the operator's fix would look broken.
function matchClockUpdate(key, value) {
  var el = matchClockEl();
  if (!el || el.id !== key) return;
  matchSeconds = parseMatchClock(value);
  matchClockReady = true;
  paintMatchClock();
}

// ---- Match state markers (what the machine's non-clock groups call) ----
// Each is a CLASS on the root, never a separate animated state: "at full time" and "during the
// interval" are things the board LOOKS like, and a design decides what that means in CSS.

// markLive(): the match is running — clear the interval AND the full-time treatment. Used by
// a graphic whose status is a single group, where "back to live" really does undo both.
function markLive() {
  var root = document.querySelector('.${prefix}');
  if (root) { root.classList.remove('${prefix}-final'); root.classList.remove('${prefix}-break'); }
}

// markInPlay(): the interval is over — clear ONLY the interval treatment.
//
// This exists because a board's "is the clock running" and "is the match over" are separate
// parallel groups, and a group must answer for itself alone. If resuming play also cleared
// full time, an operator who ended the match and then resumed the clock by habit would take a
// finished board back to looking live — a group reaching into another group's state.
function markInPlay() {
  var root = document.querySelector('.${prefix}');
  if (root) root.classList.remove('${prefix}-break');
}

// markBreak(): an interval (half time, end of a quarter, between sets). The clock holds; the
// scores stay on air, because a viewer joining at half time still needs them.
function markBreak() {
  stopMatchClock();
  var root = document.querySelector('.${prefix}');
  if (root) { root.classList.add('${prefix}-break'); root.classList.remove('${prefix}-final'); }
}

// markFinal(): the match is over. The clock stops for good and the design's own full-time
// treatment takes over.
function markFinal() {
  stopMatchClock();
  var root = document.querySelector('.${prefix}');
  if (root) { root.classList.add('${prefix}-final'); root.classList.remove('${prefix}-break'); }
}

// Seed the clock once the elements exist. This file loads in <head> in an exported package,
// so the DOM may not be parsed yet (the shared/clock.ts guard pattern).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMatchClock);
} else {
  initMatchClock();                // DOM already parsed (e.g. an inline preview build)
}`;
}

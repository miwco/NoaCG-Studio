// The shared countdown-clock runtime, used by the starting-soon and game-timer categories.
// It emits teachable ES5 that lives OUTSIDE the marked ANIMATION region (it is playout
// logic, not motion): the animation presets only call startClock() / stopClock().
//
// Contract with the design:
//   - a hidden <div id="fN" style="display:none"> holds the duration in whole minutes
//     (decimals allowed: "0.5" is thirty seconds) — SPX writes into it like any field
//   - OPTIONALLY a second hidden field holds a wall-clock START TIME ("19:30"). When the
//     operator fills it in it WINS over the duration, which is what "counts down to the
//     start of the show" actually means: the number on screen agrees with the clock on
//     the wall, however long the graphic has been up.
//   - a .{prefix}-clock element displays the remaining time (M:SS, or H:MM:SS past an hour)
//   - when the clock hits zero the root gets a .{prefix}-done class, so the design's CSS
//     can flash, recolor, or swap text without any extra JS
//
// ACCURACY: the count is anchored to a DEADLINE timestamp, not decremented once per tick.
// A holding screen can sit on air for an hour, and `setInterval` drifts — it is throttled in
// a background tab, coalesced on a loaded playout machine, and never fires early. Recomputing
// the remaining time from the deadline on every tick makes a late tick self-correcting instead
// of cumulative, so the clock still agrees with the wall at 0:00. (Under the render service's
// virtual clock, Date.now() is virtualized too — src/render/runtimeScript.ts — so a rendered
// countdown stays a pure function of the frame.)

/** Emit the clock runtime functions for a category (prefix) and its duration field.
 *  `targetFieldId` opts the design into the wall-clock start-time field described above;
 *  omit it and the runtime reads the duration only (what every clock did before). */
export function clockRuntimeJs(prefix: string, minutesFieldId: string, targetFieldId?: string): string {
  const targetBlock = targetFieldId
    ? `
// Seconds until the wall-clock start time in #${targetFieldId} ("19:30", 24-hour), or 0 when the
// operator left it empty — which is how this field stays OPTIONAL: empty means "just count
// the duration". A time that has already gone past today counts to TOMORROW, so an overnight
// show holding at 23:50 for a 00:15 start shows 0:25:00 and never a negative number.
function clockTargetSeconds() {
  var source = document.getElementById('${targetFieldId}');
  var text = source ? String(source.textContent).trim() : '';
  var parts = /^(\\d{1,2})[:.](\\d{2})$/.exec(text);
  if (!parts) return 0;                       // empty or not a time — fall back to the duration
  var hours = parseInt(parts[1], 10);
  var minutes = parseInt(parts[2], 10);
  if (hours > 23 || minutes > 59) return 0;   // "25:99" is a typo, not a start time
  var now = new Date();
  var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  var seconds = Math.round((target.getTime() - now.getTime()) / 1000);
  if (seconds <= 0) seconds += 24 * 60 * 60;  // already past today — the show starts tomorrow
  return seconds;
}

// How long to count, right now: the start time when there is one, else the duration.
function clockSeconds() {
  return clockTargetSeconds() || clockDurationSeconds();
}`
    : `
// How long to count, right now. (This design has no start-time field, so it is simply the
// duration — the function exists so every clock reads its length through one name.)
function clockSeconds() {
  return clockDurationSeconds();
}`;

  return `// ── Countdown clock ─────────────────────────────────────────────────────
// The duration lives in the hidden #${minutesFieldId} field (whole minutes; "0.5" = 30 s).
// startClock()/stopClock() are called by the animation preset below.
var clockTimer = null;        // the polling interval while the clock runs
var clockSecondsLeft = 0;     // what renderClock() paints
var clockDeadline = 0;        // ms timestamp the count is anchored to (see the header note)

// How many seconds the operator asked for.
function clockDurationSeconds() {
  var source = document.getElementById('${minutesFieldId}');
  var minutes = source ? parseFloat(source.textContent) : NaN;
  if (!(minutes > 0)) minutes = 5;            // blank or nonsense — a sane five minutes
  return Math.max(1, Math.round(minutes * 60));
}
${targetBlock}

// M:SS, or H:MM:SS once there is an hour or more to wait.
function formatClock(total) {
  var hours = Math.floor(total / 3600);
  var minutes = Math.floor((total % 3600) / 60);
  var seconds = total % 60;
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  return hours > 0 ? hours + ':' + pad(minutes) + ':' + pad(seconds) : minutes + ':' + pad(seconds);
}

// Paint the remaining time into the clock element. A design without one (a holding screen
// that shows no numbers) simply has nothing to paint — never an error.
function renderClock() {
  var el = document.querySelector('.${prefix}-clock');
  if (el) el.textContent = formatClock(clockSecondsLeft);
}

// One tick: recompute from the deadline (self-correcting — see the header), and at zero stop
// and let the design's CSS say "time's up".
function tickClock() {
  clockSecondsLeft = Math.max(0, Math.ceil((clockDeadline - Date.now()) / 1000));
  if (clockSecondsLeft <= 0) {
    stopClock();
    var root = document.querySelector('.${prefix}');
    if (root) root.classList.add('${prefix}-done');
  }
  renderClock();
}

// Reset to the full length and start counting.
function startClock() {
  stopClock();
  var root = document.querySelector('.${prefix}');
  if (root) root.classList.remove('${prefix}-done');
  clockSecondsLeft = clockSeconds();
  clockDeadline = Date.now() + clockSecondsLeft * 1000;
  renderClock();
  // Polled four times a second so the painted second flips within a quarter second of the
  // real one; the value itself comes from the deadline, so the poll rate is only smoothness.
  clockTimer = setInterval(tickClock, 250);
}

function stopClock() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
}

// pauseClock()/resumeClock(): hold the count where it is and pick it up again. Unlike
// stopClock()/startClock() these keep the remaining time, which is what an operator means by
// pausing a game clock. The countdown type's machine drives them from a parallel state group.
function pauseClock() {
  if (!clockTimer) return;
  clearInterval(clockTimer);
  clockTimer = null;
  clockSecondsLeft = Math.max(0, Math.ceil((clockDeadline - Date.now()) / 1000));
  renderClock();
}

function resumeClock() {
  if (clockTimer || clockSecondsLeft <= 0) return;
  clockDeadline = Date.now() + clockSecondsLeft * 1000;   // re-anchor from where it was paused
  clockTimer = setInterval(tickClock, 250);
}

// Show the full length on load (before the first play()), so previews look right.
// This file loads in <head>, before the clock elements exist — wait for the DOM.
function paintIdleClock() {
  clockSecondsLeft = clockSeconds();
  renderClock();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', paintIdleClock);
} else {
  paintIdleClock();               // DOM already parsed (e.g. an inline preview build)
}`;
}

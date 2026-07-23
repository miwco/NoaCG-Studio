// The poll's MEASURED motion and its board state — the numbers a keyframe cannot describe.
//
// A poll's bars grow to shares that only exist once the operator's counts are in the DOM, and
// there is one bar per line they wrote. Neither magnitude nor row count is something a static
// keyframe can hold (docs/DYNAMIC_MOTION_SCOPE.md), so the growth is a named BUILDER: a plain
// function that measures the DOM and returns a GSAP object. The animation data references it by
// name (`"dynamics": [{ "build": "pollBarsGrow", … }]`) and the interpreter adds what it returns.
//
// These ship OUTSIDE the marked ANIMATION region — design-owned runtime, like the countdown
// clock engine — so the timeline never rewrites them and the growth can be tuned right here.
//
// WHAT IS DELIBERATELY *NOT* HERE. Three of the board's four visible changes are ordinary
// keyframes on the state timelines, not code:
//   · the VOTE NOW badge leaving when voting closes  -> a .poll-cue opacity track
//   · the percentages appearing with the result      -> a .poll-row-value opacity track
//   · the panel's own entrance and exit              -> the preset
// That matters beyond tidiness. `noacgSnap` replays a state's canonical route with GSAP's
// callbacks SUPPRESSED, so anything done in a `call` does not happen on a snap — but every
// keyframe lands exactly. Keeping the board's look in keyframes is what makes "jump straight to
// the result" (recovery, a control-page snap, the editor's parked preview) show the result.
//
// The one genuine exception is the WINNER, below: which row wins depends on the operator's
// counts, so it has no fixed target and no static keyframe can name it. That is honestly
// code-owned motion — the same posture as the quiz's revealAnswer().

import { motionSpeedJs } from '../shared/base';

/** How long one bar takes to grow, and how far apart the bars start. Speed-relative. */
const BAR_GROW = 0.9;
const BAR_STAGGER = 0.12;

/** The poll runtime, emitted before the marked region in every poll template. */
export const POLL_MOTION_JS = `// ---- The poll board (the animation data references these by name) ----
${motionSpeedJs}

// The board's two pieces of runtime STATE. Both are data, not states in the machine: whether
// the figures are showing, and whether a winner has been called. update() reads them so that
// re-typing the counts while the result is on air moves the bars instead of blanking them —
// which is what a live vote actually does.
var pollRevealed = false;         // the figures and bars are showing
var pollWinnerCalled = false;     // a winner has been called (and should survive a rebuild)

// escapeHtml(): the rows are built with innerHTML — operator text is escaped first so an
// option like "Under <£20" reads as text and never runs as markup.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// pollRows(): the hidden options source, parsed into { label, count } records — one per line,
// written "Label | count". A line with no count (the operator has typed the options but no
// votes have come in yet) counts as zero rather than being dropped: an option nobody has voted
// for is still an option, and hiding it would misreport the poll.
function pollRows() {
  var source = document.getElementById('f1');
  if (!source) return [];
  var out = [];
  var lines = source.textContent.split('\\n');
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (raw === '') continue;
    var at = raw.lastIndexOf('|');            // lastIndexOf: a label may contain a pipe
    var label = at === -1 ? raw : raw.slice(0, at).trim();
    var count = at === -1 ? 0 : parseFloat(raw.slice(at + 1).replace(/[^0-9.\\-]/g, ''));
    out.push({ label: label, count: isNaN(count) ? 0 : Math.max(0, count) });
  }
  return out;
}

// pollPercentText(): a share as broadcast writes it — one decimal, and no trailing ".0".
function pollPercentText(percent) {
  var rounded = Math.round(percent * 10) / 10;
  return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
}

// pollRebuild(): re-render the rows from the hidden source. Each fill carries its own share on
// data-value, which is what the growth builder below tweens to — so both the widths and the
// NUMBER of bars are the operator's content, not anything written down here.
function pollRebuild() {
  var host = document.getElementById('poll-rows');
  if (!host) return;
  var rows = pollRows();
  var total = 0;
  for (var i = 0; i < rows.length; i++) total += rows[i].count;
  var html = '';
  for (var j = 0; j < rows.length; j++) {
    // No votes yet means every share is zero — never a division by zero, and never a board
    // that shows an even split nobody voted for.
    var percent = total > 0 ? (rows[j].count / total) * 100 : 0;
    html += renderPollRow({
      label: rows[j].label,
      count: rows[j].count,
      percent: percent,
      percentText: pollPercentText(percent)
    });
  }
  host.innerHTML = html;
  pollPaintState();                 // a rebuild wipes the DOM; put the board back as it was
}

// pollPaintState(): re-apply what the board is currently SHOWING after a rebuild. Without this
// an update() during the result would blank the bars the viewer is looking at.
function pollPaintState() {
  if (!pollRevealed) return;
  var fills = document.querySelectorAll('.poll-bar-fill');
  for (var i = 0; i < fills.length; i++) {
    fills[i].style.width = fills[i].getAttribute('data-value') + '%';
  }
  var values = document.querySelectorAll('.poll-row-value');
  for (var j = 0; j < values.length; j++) values[j].style.opacity = 1;
  if (pollWinnerCalled) pollMarkWinner();
}

// pollResetBoard(): back to "voting is open" — no figures, no bars, no winner. play() calls
// this, so a replay never starts on the previous poll's result.
function pollResetBoard() {
  pollRevealed = false;
  pollWinnerCalled = false;
  var fills = document.querySelectorAll('.poll-bar-fill');
  for (var i = 0; i < fills.length; i++) fills[i].style.width = '';
  var values = document.querySelectorAll('.poll-row-value');
  for (var j = 0; j < values.length; j++) values[j].style.opacity = '';
  pollClearWinner();
}

// pollBarsGrow(): every bar grows to its OWN share, one after another, and each figure counts
// up in step with its bar so number and bar land together. MEASURED, because the target width
// is the operator's data — read here, at play time, never written into a keyframe.
function pollBarsGrow(target, opts) {
  var fills = document.querySelectorAll(target);
  if (!fills.length) return null;
  var speed = motionSpeed();
  var grow = ${BAR_GROW} / speed;                // one bar's growth time
  var stagger = ${BAR_STAGGER} / speed;          // bars arrive one after another
  pollRevealed = true;                           // the board is showing figures from now on

  var tl = gsap.timeline();
  // Deliberate width tween (not scaleX): scaling would squash the fill's rounded cap. And the
  // fills keep power3.out whatever the entrance ease — a vote bar must land exactly on its
  // share, so a back.out overshoot never applies to it (it would read as the wrong figure).
  tl.fromTo(fills,
    { width: '0%' },                             // fromTo = replay-safe (always starts empty)
    {
      width: function (i, bar) { return bar.getAttribute('data-value') + '%'; },
      duration: grow,
      ease: 'power3.out',
      stagger: stagger
    },
    0                                            // explicit position — the counts share the clock
  );
  // The figures FADE IN with their bars. This lives in the builder rather than in the result
  // step's keyframes for one reason: the rows are rendered at runtime, so there is no
  // .poll-row-value in the document at edit time for a keyframe track to name. It is the same
  // reason the widths are measured — the elements themselves are the operator's content.
  var values = document.querySelectorAll('.poll-row-value');
  if (values.length) {
    tl.fromTo(values,
      { opacity: 0 },                            // fromTo = replay-safe (figures always start hidden)
      { opacity: 1, duration: grow * 0.55, ease: 'power2.out', stagger: stagger },
      0);
  }
  // The figures: each row's percentage counts from zero to its own share over its bar's exact
  // length. The final text comes from data-target, so a mid-count interruption can never leave
  // a rounded number standing in for the real one.
  for (var i = 0; i < fills.length; i++) {
    var row = fills[i].closest ? fills[i].closest('.poll-row') : null;
    var num = row ? row.querySelector('.poll-row-value') : null;
    if (!num) continue;
    (function (el, share, at) {
      var counter = { value: 0 };                // a plain object GSAP can tween
      var text = el.getAttribute('data-target') || el.textContent;
      tl.set(el, { textContent: pollPercentText(0) }, at);
      tl.to(counter, {
        value: share,
        duration: grow,                          // the bar's exact length — they land together
        ease: 'power3.out',
        onUpdate: function () { el.textContent = pollPercentText(counter.value); },
        onComplete: function () { el.textContent = text; }
      }, at);
    })(num, parseFloat(fills[i].getAttribute('data-value')) || 0, i * stagger);
  }
  return tl;
}

// pollMarkWinner(): put the winner mark on the leading row. Split out from the call below so a
// rebuild can restore it without re-running the pop.
//
// A TIE IS NOT A WINNER. If two rows share the lead, nothing is marked and the board takes
// .poll-tied instead — a projected-winner graphic that picks one of two equal rows is simply
// reporting something untrue, and "whichever came first in the list" is not a result.
function pollMarkWinner() {
  var rows = document.querySelectorAll('.poll-row');
  var root = document.querySelector('.poll');
  var best = -1, at = -1, tied = false;
  for (var i = 0; i < rows.length; i++) {
    var fill = rows[i].querySelector('.poll-bar-fill');
    var share = fill ? parseFloat(fill.getAttribute('data-value')) : NaN;
    if (isNaN(share)) continue;
    if (share > best) { best = share; at = i; tied = false; }
    else if (share === best) { tied = true; }
  }
  if (root) root.classList.toggle('poll-tied', tied || best <= 0);
  if (at === -1 || tied || best <= 0) return null;   // no votes, or no single leader
  rows[at].classList.add('poll-winner');
  return rows[at];
}

// pollClearWinner(): drop the mark and the tie note (a replay, or fresh data, starts uncalled).
function pollClearWinner() {
  var rows = document.querySelectorAll('.poll-row');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('poll-winner');
  var root = document.querySelector('.poll');
  if (root) root.classList.remove('poll-tied');
}

// pollCallWinner(): the call. WHICH row wins depends on the counts the operator typed, so this
// is the one part of the board with no fixed target — honestly code-owned motion, fired by the
// "Winner called" state's timeline exactly the way a quiz fires its answer reveal.
function pollCallWinner() {
  pollWinnerCalled = true;
  pollClearWinner();
  var row = pollMarkWinner();
  if (!row) return;                              // a tie, or nothing to call yet
  gsap.fromTo(row, { scale: 1.03 }, { scale: 1, duration: 0.45 / motionSpeed(), ease: 'back.out(2)' });
}`;

// The data-driven infographic rebuild runtimes, shared across every design of a type.
//
// THIS IS THE CANONICAL REPEATING-DATA SYSTEM. A graphic whose content is a LIST the operator
// types — a running order, a poll's options, a starting eleven, a league table, a results
// column — keeps that list in ONE hidden textarea field, one item per line, with `|` between
// the parts of an item. A rebuild function named `rebuildInfographic()` turns it into rows,
// and the assembler calls that after every update(). Nothing about the list is ever expressed
// as more fields: a template does not grow `f7`…`f26` because a squad has twenty players.
//
// Three consequences that are the whole reason it works this way:
//   - the SPX definition stays small and stable, so the control page shows ONE multi-line
//     editor instead of a wall of inputs, and adding a substitute is typing a line;
//   - the MOTION is measured from the rendered rows (igMotion.ts), so a cascade runs for
//     exactly as many rows as they wrote — a number no keyframe could hold;
//   - the rebuild is per TYPE, not per design, so a house league table and a glass one differ
//     only in CSS. Every runtime here renders into `#infographic-rows` with one direct child
//     per item, which is precisely what the shared `rows-cascade` builder animates.
//
// This file holds the agenda, STAT-LIST, poll, goal, milestone and ELECTION NIGHT runtimes;
// `sportsRuntimes.ts` holds the sports pack's four (team sheet, league table, stat comparison,
// fixtures/results) under the same rules.
//
// A schedule board (the agenda type) and a bar chart (the poll type) each render their rows
// from a hidden textarea source the operator types into — and that rendering is identical for
// every style a type ships in: only the CSS differs between a house schedule board and a glass
// one. So the rebuild lives here, once, and each design passes it as its `runtimeExtraJs`.
//
// The emitted strings are exactly what ig06 and ig02 authored inline before this module
// existed, so extracting them moved no template's output — the catalog baseline holds.

/** The schedule-board rebuild: renders "time | show" rows into #infographic-rows.
 *  Structure per row: .infographic-row > .infographic-time · .infographic-dot · .infographic-show. */
export function scheduleRowsRuntimeJs(): string {
  return `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Movies <18" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "time | show" per line)
// and rebuild the #infographic-rows schedule. Only the FIRST pipe splits the line, so a show
// name may itself contain a "|". Lines without both parts are skipped, like ig02.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only — shows may contain one
    if (split === -1) return;                      // no pipe: not a "time | show" line
    var time = line.slice(0, split).trim();
    var show = line.slice(split + 1).trim();
    if (time === '' || show === '') return;        // skip half-empty rows
    html += '<div class="infographic-row">'
          +   '<span class="infographic-time">' + escapeHtml(time) + '</span>'
          +   '<span class="infographic-dot"></span>'
          +   '<span class="infographic-show">' + escapeHtml(show) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The STAT-LIST rebuild: renders "Label | figure" rows into #infographic-rows.
 * Structure per row: .infographic-row > .infographic-stat-label + .infographic-stat-figure.
 *
 * It is its own runtime rather than a reuse of the bar shapes, and the reason is the whole
 * point of the composition it serves. `barsRuntimeJs` and `seatBarsRuntimeJs` nest the figure's
 * cap INSIDE the bar's fill so the readout rides a growing tip, which means a design taking one
 * of those cannot express its figure as a grid COLUMN - ig38 had to lift the track out of flow
 * and reserve the lane with the row's own padding to get a figure pinned at one edge. A stat
 * list is a TABLE: label and figure are siblings, so the row really is two columns and the
 * figures share one right edge because they are in the same track, not because a padding
 * happens to clear the room.
 *
 * The figure is rendered as TEXT, exactly as typed. Nothing here parses it, so "€4.21bn",
 * "12.4 %" and "1,203" all survive intact - the tolerant number parse the goal and milestone
 * runtimes need exists because those DERIVE a share from their figures, and a stat list derives
 * nothing.
 *
 * The LAST pipe splits the line, not the first (the schedule board's rule): the figure is the
 * short final part, so a label may contain a "|" of its own.
 */
export function statListRuntimeJs(): string {
  return `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so a label like "Profit <2025" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | figure" per line) and
// rebuild the #infographic-rows table. The LAST pipe splits the line — the figure is the short
// final part, so a label may itself contain a "|". Lines without both parts are skipped.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.lastIndexOf('|');             // last pipe — labels may contain one
    if (split === -1) return;                      // no pipe: not a "Label | figure" line
    var label = line.slice(0, split).trim();
    var figure = line.slice(split + 1).trim();
    if (label === '' || figure === '') return;     // skip half-empty rows
    // The figure is written as typed: no parse, so a currency mark, a unit or a thousands
    // separator all survive. Nothing here derives a share from it.
    html += '<div class="infographic-row">'
          +   '<span class="infographic-stat-label">' + escapeHtml(label) + '</span>'
          +   '<span class="infographic-stat-figure">' + escapeHtml(figure) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

// Render once on load so the preview shows the table before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/** The tolerant number parse every figure in the pack reads through. Its own const because the
 *  election runtimes below need it WITHOUT the grouping: a seat count is never four digits, and
 *  a helper nothing calls is dead code sitting in a template the user is invited to read. */
const PARSE_NUMBER_JS = `// parseIgNumber(): read the number out of operator text — tolerant of the currency marks
// and thousand separators people paste in ("€124,213" -> 124213).
function parseIgNumber(text) {
  var n = parseFloat(String(text).replace(/[^0-9.+-]/g, ''));
  return isNaN(n) ? 0 : n;
}`;

/** The thousand grouping ig05 authored inline — money figures always group. */
const GROUP_DIGITS_JS = `// formatThousands(): 124213 -> "124,213" — broadcast figures always group digits.
function formatThousands(n) {
  return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}`;

/** Number helpers shared by the goal and milestone runtimes — the same tolerant parse and the
 *  same thousand-grouping ig05 authored inline, so every figure in the pack reads alike. */
const NUMBER_HELPERS_JS = `${PARSE_NUMBER_JS}

${GROUP_DIGITS_JS}`;

/**
 * The GOAL-METER rebuild, in its two drawn shapes.
 *
 * A goal meter is two numbers and everything else is derived: the operator types what has been
 * raised (#f0) and what the target is (the hidden #f1 source), and the graphic works out the
 * share, the formatted figures and the caption. Both fields stay PLAIN NUMBERS on purpose — a
 * currency mark typed into them would defeat the count-up's parse — so the unit is its own
 * field (#f3), rendered as a separate element beside the figure and hidden by `:empty` when
 * the goal is measured in subscribers rather than money.
 *
 * `shape` picks where the share is written: `bar` puts it on the progress fill's data-value
 * (the 'count-up' preset grows it), `ring` puts it on the SVG ring's (the 'goal-ring' preset
 * draws it). Everything else is identical, which is the point — a bar goal and a ring goal are
 * one graphic drawn two ways, not two graphics.
 */
export function goalRuntimeJs(shape: 'bar' | 'ring'): string {
  const writeShare =
    shape === 'bar'
      ? `  // Progress: the fill is rendered AT its value so an on-air update() shows fresh data at
  // once; on play() the 'count-up' preset empties it and grows it back to data-value.
  var fill = document.querySelector('.infographic-bar-fill');
  if (fill) {
    fill.setAttribute('data-value', percent);
    fill.style.width = percent + '%';
  }`
      : `  // Progress: the ring carries its OWN percent (raised/goal) — never the raised figure,
  // which is money and would clamp to a full ring. The 'goal-ring' preset reads it here.
  var ring = document.querySelector('.infographic-ring-fill');
  if (ring) {
    ring.setAttribute('data-value', percent);
    ring.style.strokeDashoffset = (100 - percent);
  }`;

  return `${NUMBER_HELPERS_JS}

// rebuildInfographic(): read the raised total (#f0) and the hidden goal (#f1), then derive
// everything the panel shows — the grouped figure, the share of the goal, the "of <goal>"
// caption, and the percent readout. Read from data-target where it exists: update() keeps it
// current, while the count-up preset rewrites the live textContent mid-count ("0", "43,207"…).
function rebuildInfographic() {
  var raisedEl = document.getElementById('f0');
  var goalEl = document.getElementById('f1');
  if (!raisedEl || !goalEl) return;
  var raised = parseIgNumber(raisedEl.getAttribute('data-target') || raisedEl.textContent);
  var goal = parseIgNumber(goalEl.getAttribute('data-target') || goalEl.textContent);
  var unitEl = document.getElementById('f3');
  var unit = unitEl ? unitEl.textContent.trim() : '';

  // The displayed total is always grouped; data-target holds the same text so the count-up
  // counts to it and restores exactly this formatting when it lands.
  var raisedText = formatThousands(raised);
  raisedEl.textContent = raisedText;
  raisedEl.setAttribute('data-target', raisedText);

  // The share, clamped to the 0-100 the drawn track can express. The FIGURES above are never
  // clamped: an appeal that passes its target must still show what it actually raised.
  var percent = goal > 0 ? Math.max(0, Math.min(100, (raised / goal) * 100)) : 0;

${writeShare}

  // The caption under the meter: what the target is, in the operator's own unit.
  var goalLine = document.getElementById('infographic-goal-line');
  if (goalLine) goalLine.textContent = 'of ' + unit + formatThousands(goal);

  // The percent readout — rounded, because a goal meter showing 43.7% reads as noise.
  var readout = document.getElementById('infographic-percent');
  if (readout) readout.textContent = Math.round(percent) + '%';
}

// Render once on load so the preview shows real figures before the first update().
// This file loads in <head>, before the panel elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The MILESTONE-TRACK rebuild: "Label | target" lines become evenly spaced nodes on a track,
 * with the ones already passed marked `.is-reached` and a progress line run out to where the
 * current figure sits between them.
 *
 * THE ONE THING WORTH KNOWING ABOUT THE GEOMETRY, because it is a truthfulness decision:
 * the nodes are spaced EVENLY, not in proportion to their targets. A tier track whose nodes sat
 * at target/max would bunch four milestones into the last fifth of the rail the moment someone
 * set a stretch goal, and the labels would collide. So the rail is read as "milestone 1 → 2 →
 * 3 → 4" and the progress line is interpolated BETWEEN THE NODES: at exactly milestone 2 the
 * line stops exactly on node 2, and between two milestones it sits proportionally between
 * them. That is what the drawn layout claims, so it is what the line does — the alternative
 * (a line at raised/max over evenly spaced nodes) would draw a position that means nothing.
 */
export function milestoneRuntimeJs(): string {
  return `${NUMBER_HELPERS_JS}

// escapeHtml(): the nodes below are built with innerHTML — operator text is escaped first so
// input like "1,000 & rising" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | target" per line) into the
// milestone columns, mark the ones the current figure (#f1) has passed, and set the progress
// line's percent. See milestoneRuntimeJs()'s comment for why the nodes are evenly spaced and
// the line is interpolated between them rather than plotted at current/max.
function rebuildInfographic() {
  var track = document.getElementById('infographic-nodes');
  var sourceEl = document.getElementById('f0');
  var currentEl = document.getElementById('f1');
  if (!track || !sourceEl || !currentEl) return;
  var current = parseIgNumber(currentEl.getAttribute('data-target') || currentEl.textContent);

  // Parse "Label | target" lines. Only the FIRST pipe splits, so a label may contain one.
  var stops = [];
  sourceEl.textContent.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');
    if (split === -1) return;                      // no pipe: not a "Label | target" line
    var label = line.slice(0, split).trim();
    var targetText = line.slice(split + 1).trim();
    var target = parseFloat(targetText.replace(/[^0-9.+-]/g, ''));
    if (label === '' || isNaN(target)) return;     // skip lines without a label or a number
    stops.push({ label: label, targetText: targetText, target: target });
  });

  // Even spacing: node i sits at the centre of its own column, so n nodes never bunch up.
  var n = stops.length;
  var positionAt = function (i) { return ((i + 0.5) / n) * 100; };

  var html = '';
  for (var i = 0; i < n; i++) {
    var reached = current >= stops[i].target;
    html += '<div class="infographic-node' + (reached ? ' is-reached' : '') + '"'
          +      ' data-at="' + positionAt(i).toFixed(2) + '">'
          +   '<span class="infographic-node-dot"></span>'
          +   '<span class="infographic-node-target">' + escapeHtml(stops[i].targetText) + '</span>'
          +   '<span class="infographic-node-label">' + escapeHtml(stops[i].label) + '</span>'
          + '</div>';
  }
  track.innerHTML = html;

  // Where the line stops: on a node when that milestone is exactly met, proportionally
  // between two when the figure sits between them, at the last node once they are all passed.
  var percent = 0;
  if (n > 0) {
    var passed = -1;
    for (var k = 0; k < n; k++) { if (current >= stops[k].target) passed = k; }
    if (passed === -1) {
      // Before the first milestone: run out of the rail's start toward node 1.
      var first = stops[0].target;
      percent = first > 0 ? positionAt(0) * Math.max(0, Math.min(1, current / first)) : 0;
    } else if (passed === n - 1) {
      percent = positionAt(n - 1);                 // every milestone met — the line rests on the last
    } else {
      var span = stops[passed + 1].target - stops[passed].target;
      var into = span > 0 ? (current - stops[passed].target) / span : 0;
      percent = positionAt(passed) + (positionAt(passed + 1) - positionAt(passed)) * Math.max(0, Math.min(1, into));
    }
  }

  // The fill is rendered AT its value so an on-air update() shows fresh data at once; on
  // play() the 'milestone-run' preset empties it and runs it back out.
  var fill = document.querySelector('.infographic-milestone-fill');
  if (fill) {
    fill.setAttribute('data-value', percent.toFixed(2));
    fill.style.width = percent.toFixed(2) + '%';
  }

  // The readout: the current figure, grouped, and how many milestones are behind it.
  var readout = document.getElementById('infographic-current');
  if (readout) readout.textContent = formatThousands(current);
  var counter = document.getElementById('infographic-reached');
  if (counter) {
    var done = 0;
    for (var j = 0; j < n; j++) { if (current >= stops[j].target) done++; }
    counter.textContent = done + ' / ' + n;
  }
}

// Render once on load so the preview shows the track before the first update().
// This file loads in <head>, before the track elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/** The bar-chart rebuild: renders "Label | value" rows into #infographic-bars.
 *  Structure per row: .infographic-row > .infographic-bar-head (label + value) + .infographic-bar-track > .infographic-bar-fill. */
export function barsRuntimeJs(): string {
  return `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Latency <500ms" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | value" per line)
// and rebuild the #infographic-bars rows. Each fill is rendered already at its value so an
// on-air update() shows fresh data at once; on play() the 'bars-grow' preset resets
// the fills to 0 and grows each one back to its data-value percent.
function rebuildInfographic() {
  var bars = document.getElementById('infographic-bars');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var parts = line.split('|');
    var label = parts[0].trim();
    var valueText = (parts[1] || '').trim();       // the figure exactly as the operator typed it
    var value = parseFloat(valueText);             // NaN when the value part is missing
    if (label === '' || isNaN(value)) return;      // skip lines without a label or a number
    var fill = Math.max(0, Math.min(100, value));  // clamp only the DRAWN fill to the 0-100 track
    html += '<div class="infographic-row">'
          +   '<div class="infographic-bar-head">'
          +     '<span class="infographic-bar-label">' + escapeHtml(label) + '</span>'
          +     '<span class="infographic-bar-value">' + escapeHtml(valueText) + '</span>'  // show the typed figure, never a silently altered one
          +   '</div>'
          +   '<div class="infographic-bar-track">'
          +     '<div class="infographic-bar-fill" data-value="' + fill + '" style="width: ' + fill + '%"></div>'
          +   '</div>'
          + '</div>';
  });
  bars.innerHTML = html;
}

// Render once on load so the preview shows the chart before the first update().
// This file loads in <head>, before the chart elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

// ── The ELECTION NIGHT runtimes (ig34-ig36) ─────────────────────────────────
//
// One count night needs three graphics and they share one habit: the operator types the few
// figures a returning officer actually reads out, and the board derives the rest. A seat share,
// a distance to the majority line and a swing against the last election are all arithmetic -
// asking anyone to type them during a live count is asking for the one number nobody checks.

/**
 * The SEAT-COUNT rebuild: "Party | seats" lines become one bar row per party, drawn into
 * `#infographic-rows` with a readout riding each fill's tip (ig07's cap structure, so the
 * shared `bars-grow` builder counts the seats up as the bar grows).
 *
 * THE ONE GEOMETRY DECISION, because it is a truthfulness one: the bars are scaled against the
 * BIGGEST party, not against the size of the chamber. A chamber-scaled board draws every bar
 * short - 76 of 200 seats is a 38% stub - and the comparison a results board exists to make,
 * party against party, is exactly what those stubs stop showing. The scale is a DRAWING choice
 * and nothing else: the figure at each bar's tip is the seat count the operator typed, never a
 * share, so the picture compares and the number states.
 */
export function seatBarsRuntimeJs(): string {
  return `${PARSE_NUMBER_JS}

// escapeHtml(): the rows below are built with innerHTML - operator text is escaped first so a
// party name like "Left & Green <2026>" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Party | seats" per line) and rebuild
// the #infographic-rows board. Only the FIRST pipe splits the line, so a party name may contain
// one. Lines without both parts are skipped rather than drawn as an empty row.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var source = document.getElementById('f0');
  if (!rows || !source) return;

  var parties = [];
  source.textContent.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only - names may contain one
    if (split === -1) return;                      // no pipe: not a "Party | seats" line
    var name = line.slice(0, split).trim();
    var seatsText = line.slice(split + 1).trim();
    var seats = parseFloat(seatsText.replace(/[^0-9.+-]/g, ''));
    if (name === '' || isNaN(seats) || seats < 0) return;  // skip lines without a name or a count
    parties.push({ name: name, seats: seats });
  });

  // The drawing scale: the biggest party's bar runs the full track and every other bar is drawn
  // against it. See this function's comment for why it is not the chamber's size.
  var largest = 0;
  for (var i = 0; i < parties.length; i++) {
    if (parties[i].seats > largest) largest = parties[i].seats;
  }

  var html = '';
  for (var j = 0; j < parties.length; j++) {
    var width = largest > 0 ? (parties[j].seats / largest) * 100 : 0;
    // The leading party is DERIVED, never typed - it changes several times on a count night,
    // and the accent following it by itself is the whole point of drawing the board live.
    var leading = largest > 0 && parties[j].seats === largest;
    html += '<div class="infographic-row' + (leading ? ' is-leading' : '') + '">'
          +   '<span class="infographic-party">' + escapeHtml(parties[j].name) + '</span>'
          +   '<div class="infographic-bar-track">'
          +     '<div class="infographic-bar-fill" data-value="' + width.toFixed(2) + '"'
          +          ' style="width: ' + width.toFixed(2) + '%">'
                   // The readout cap - anchored to the fill's tip in CSS, so it rides the growth,
                   // and carrying its own data-target so the count lands on the real seat figure.
          +       '<span class="infographic-bar-cap">'
          +         '<span class="infographic-bar-num" data-target="' + parties[j].seats + '">'
          +           parties[j].seats
          +         '</span>'
          +       '</span>'
          +     '</div>'
          +   '</div>'
          + '</div>';
  }
  rows.innerHTML = html;
}

// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist - wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The MAJORITY-METER rebuild: the goal meter's shape (a figure over a measured track, everything
 * else derived) with the goal being a coalition's route to a majority.
 *
 * It is a separate runtime from `goalRuntimeJs` for one reason, and it is the same reason the
 * goal ring is separate from the poll ring: a goal meter has TWO numbers and this has three. The
 * track is the whole chamber (#f2), the fill is the coalition's seats (#f0), and the majority
 * (#f1) is a LINE DRAWN ACROSS the track rather than the track's end. Running the meter to the
 * majority instead would draw a full bar at the moment a government is formed and have nothing
 * left to say about the seats won past it, which on a count night is most of the story.
 *
 * Nothing here reaches innerHTML: every derived string is written as textContent, so operator
 * text is inert by construction rather than by escaping.
 */
export function majorityMeterRuntimeJs(): string {
  return `${PARSE_NUMBER_JS}

// rebuildInfographic(): read the coalition's seats (#f0) and the two hidden sources - the seats
// a majority needs (#f1) and the size of the chamber (#f2) - then derive the whole panel: the
// fill's share, where the majority line sits, the distance to it, and the caption. Read from
// data-target where it exists: update() keeps it current, while the count-up preset rewrites the
// live textContent mid-count ("0", "84"…).
function rebuildInfographic() {
  var seatsEl = document.getElementById('f0');
  var majorityEl = document.getElementById('f1');
  var totalEl = document.getElementById('f2');
  if (!seatsEl || !majorityEl || !totalEl) return;
  var seats = parseIgNumber(seatsEl.getAttribute('data-target') || seatsEl.textContent);
  var majority = parseIgNumber(majorityEl.getAttribute('data-target') || majorityEl.textContent);
  var total = parseIgNumber(totalEl.getAttribute('data-target') || totalEl.textContent);

  // Both positions are shares of the CHAMBER, clamped to the 0-100 the drawn track can express.
  // The FIGURES are never clamped: a coalition is entitled to the seats it actually won.
  var share = total > 0 ? Math.max(0, Math.min(100, (seats / total) * 100)) : 0;
  var line = total > 0 ? Math.max(0, Math.min(100, (majority / total) * 100)) : 0;

  // The fill is rendered AT its value so an on-air update() shows fresh seats at once; on play()
  // the 'count-up' preset empties it and grows it back once the figure has landed.
  var fill = document.querySelector('.infographic-bar-fill');
  if (fill) {
    fill.setAttribute('data-value', share.toFixed(2));
    fill.style.width = share.toFixed(2) + '%';
  }

  // The majority line - a marker standing on the track at majority/chamber.
  var marker = document.getElementById('infographic-majority');
  if (marker) marker.style.left = line.toFixed(2) + '%';
  var markerLabel = document.getElementById('infographic-majority-label');
  if (markerLabel) markerLabel.textContent = 'MAJORITY ' + Math.round(majority);

  // The distance to the line, in the words a results desk uses. A majority of zero is not a
  // majority, so a cleared field reads as "not there yet" rather than as an instant win.
  var reached = majority > 0 && seats >= majority;
  var margin = document.getElementById('infographic-margin');
  if (margin) {
    margin.textContent = reached
      ? '+' + Math.round(seats - majority) + ' OVER'
      : Math.round(Math.max(0, majority - seats)) + ' SHORT';
  }
  // The panel says which of the two it is by CLASS, so the stylesheet owns the look - a runtime
  // that wrote colours would be a second style system the Style panel could not retint.
  var box = document.querySelector('.infographic-box');
  if (box) {
    if (reached) box.classList.add('is-reached');
    else box.classList.remove('is-reached');
  }

  // The caption under the track: what the meter is measured against.
  var caption = document.getElementById('infographic-seat-line');
  if (caption) caption.textContent = 'of ' + Math.round(total) + ' seats';
}

// Render once on load so the preview shows the meter before the first update().
// This file loads in <head>, before the panel elements exist - wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The TURNOUT rebuild: the ring itself is the shared `ring-fill` motion (it draws to #f0's own
 * percent, so it needs nothing from here) - this derives the SWING, the second figure every
 * turnout graphic carries.
 *
 * The comparison is optional by construction: clear the hidden previous-turnout source and the
 * swing line empties, which the `:empty` rule removes from the layout. A first election, or a
 * boundary change that makes the last one meaningless, then costs the operator one deletion
 * rather than a different graphic. Nothing here reaches innerHTML - textContent only.
 */
export function turnoutRuntimeJs(): string {
  return `${PARSE_NUMBER_JS}

// rebuildInfographic(): compare this turnout (#f0) with the hidden previous one (#f2) and write
// the swing. Read from data-target where it exists: update() keeps it current, while the
// ring-fill preset rewrites the live textContent mid-count ("0", "43"…).
function rebuildInfographic() {
  var turnoutEl = document.getElementById('f0');
  var previousEl = document.getElementById('f2');
  var swing = document.getElementById('infographic-swing');
  if (!turnoutEl || !previousEl || !swing) return;

  // No previous figure = no comparison to draw. The empty line collapses via :empty.
  var previousText = (previousEl.getAttribute('data-target') || previousEl.textContent).trim();
  if (previousText === '') {
    swing.textContent = '';
    swing.classList.remove('is-down');
    return;
  }

  var turnout = parseIgNumber(turnoutEl.getAttribute('data-target') || turnoutEl.textContent);
  var previous = parseIgNumber(previousText);
  // One decimal: turnout moves by tenths of a point, and a swing rounded to whole points would
  // report "0" for a real change on a night when the change IS the story.
  var change = Math.round((turnout - previous) * 10) / 10;

  swing.textContent = (change < 0 ? '-' : '+') + Math.abs(change).toFixed(1) + ' pts';
  // Direction is a CLASS, not a second colour written from JS: the stylesheet decides how a fall
  // reads, and the graphic keeps its single accent.
  if (change < 0) swing.classList.add('is-down');
  else swing.classList.remove('is-down');
}

// Render once on load so the preview shows the swing before the first update().
// This file loads in <head>, before the panel elements exist - wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

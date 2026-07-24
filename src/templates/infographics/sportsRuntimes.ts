// The SPORTS repeating-data rebuild runtimes — the sports pack's half of the canonical
// repeating-data system (the doctrine is in dataRuntimes.ts, which holds the agenda and poll
// runtimes; this file holds the four list shapes the sports pack needs).
//
// Four shapes cover every list graphic in the pack: a team sheet, a league table, a stat
// comparison, and a fixtures/results column. Each is written ONCE here and passed as every
// design's `runtimeExtraJs`, so a lineup board in the house skin and one in glass share their
// parsing exactly and differ only in CSS.
//
// All four obey the same three rules:
//   - operator text is escaped before it reaches innerHTML;
//   - a malformed line is SKIPPED, never rendered as a broken row — a half-typed substitution
//     must not put an empty box on air;
//   - rows land in `#infographic-rows`, one direct child per item, which is exactly what the
//     shared `rows-cascade` builder (igMotion.ts) animates, so none of this needs new motion.

/** Shared prologue: the escaper, the row splitter and the source reader every rebuild uses. */
const SPORTS_PROLOGUE = `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Kalvin <K> Phillips" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// splitRow(): one source line into its trimmed parts, so "7 |Ada  | GK" reads cleanly.
function splitRow(line) {
  var parts = line.split('|');
  var out = [];
  for (var i = 0; i < parts.length; i++) out.push(parts[i].trim());
  return out;
}

// sourceLines(): a hidden source field, as trimmed non-empty lines.
function sourceLines(id) {
  var el = document.getElementById(id);
  if (!el) return [];
  var raw = el.textContent.split('\\n');
  var out = [];
  for (var i = 0; i < raw.length; i++) { var line = raw[i].trim(); if (line !== '') out.push(line); }
  return out;
}`;

/** Shared epilogue: render once at load, DOM-ready guarded (template.js loads in <head>). */
const SPORTS_DOM_READY = `// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;

/**
 * LINEUP / ROSTER — one player per line, rendered into `#infographic-rows`.
 *
 *   `7 | Marcus Rashford | FW` · `Marcus Rashford | FW` · `Marcus Rashford`
 *
 * The shirt number and the position are both OPTIONAL, and that is a product decision rather
 * than leniency: the same board has to serve a Sunday-league team sheet as honestly as a
 * Champions League one, and an amateur club often has neither. A missing part leaves out its
 * element instead of rendering an empty box, so the row still reads.
 */
export function fixtureRowsRuntimeJs(): string {
  return `${SPORTS_PROLOGUE}

// rebuildInfographic(): parse the hidden #f0 fixture source and rebuild #infographic-rows.
// "when | home | result | away" prints the result; "when | home | away" prints the fixture
// marker instead — the same board covers results and upcoming matches.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  if (!rows) return;
  var html = '';
  var lines = sourceLines('f0');
  for (var i = 0; i < lines.length; i++) {
    var parts = splitRow(lines[i]);
    if (parts.length < 3) continue;              // a fixture needs a when and two sides
    var when = parts[0], home = parts[1];
    var played = parts.length >= 4;              // a result row, not an upcoming one
    var mid = played ? parts[2] : 'v';
    var away = played ? parts[3] : parts[2];
    if (home === '' || away === '') continue;
    html += '<div class="infographic-row infographic-fixture-row' + (played ? ' infographic-fixture-played' : '') + '">'
          +   '<span class="infographic-fixture-when">' + escapeHtml(when) + '</span>'
          +   '<span class="infographic-fixture-side infographic-fixture-home">' + escapeHtml(home) + '</span>'
          +   '<span class="infographic-fixture-mid">' + escapeHtml(mid) + '</span>'
          +   '<span class="infographic-fixture-side infographic-fixture-away">' + escapeHtml(away) + '</span>'
          + '</div>';
  }
  rows.innerHTML = html;
}

${SPORTS_DOM_READY}`;
}

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
export function rosterRowsRuntimeJs(): string {
  return `${SPORTS_PROLOGUE}

// rebuildInfographic(): parse the hidden #f0 squad source (one player per line) and rebuild
// the #infographic-rows team sheet. "number | name | position", where only the NAME is
// required — an amateur side may have no shirt numbers and no listed positions.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  if (!rows) return;
  var html = '';
  var lines = sourceLines('f0');
  for (var i = 0; i < lines.length; i++) {
    var parts = splitRow(lines[i]);
    // One part is a bare name; three are number + name + position. Two are ambiguous, and a
    // leading part that is only digits is what tells a shirt number from a position.
    var num = '', name = '', role = '';
    if (parts.length >= 3) { num = parts[0]; name = parts[1]; role = parts[2]; }
    else if (parts.length === 2) {
      if (/^[0-9]+$/.test(parts[0])) { num = parts[0]; name = parts[1]; }
      else { name = parts[0]; role = parts[1]; }
    } else { name = parts[0]; }
    if (name === '') continue;                   // a row with no player is not a row
    html += '<div class="infographic-row infographic-roster-row">'
          +   (num !== '' ? '<span class="infographic-num">' + escapeHtml(num) + '</span>' : '')
          +   '<span class="infographic-player">' + escapeHtml(name) + '</span>'
          +   (role !== '' ? '<span class="infographic-role">' + escapeHtml(role) + '</span>' : '')
          + '</div>';
  }
  rows.innerHTML = html;
}

${SPORTS_DOM_READY}`;
}

/**
 * STANDINGS / TABLE — one competitor per line, with any number of value columns.
 *
 *   rows (`#f0`):    `Arsenal | 24 | 18 | 4 | 2 | 58`
 *   columns (`#f2`): `TEAM | P | W | D | L | PTS`
 *
 * The column COUNT is deliberately not fixed: a football table has P/W/D/L/Pts, a motorsport
 * championship has starts/wins/podiums/points, and an athletics result list has one time
 * column. One board covers all of them because the heading strip is data too.
 *
 * Rows are ranked by their ORDER in the source and never re-sorted. An operator who pastes a
 * table from the federation's site gets exactly what they pasted, and a mid-race order is
 * whatever they say it is — a graphic that quietly re-sorted would be wrong the moment the
 * tie-break rules were not the ones it guessed.
 */
export function standingsRowsRuntimeJs(): string {
  return `${SPORTS_PROLOGUE}

// rebuildInfographic(): parse the hidden #f0 table source (one competitor per line, values
// separated by "|") and the #f2 column headings, and rebuild #infographic-rows. The first
// value of a row is the NAME; everything after it is a column. Rows keep the order they were
// typed in — this board never re-sorts what the operator pasted.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  if (!rows) return;
  var headEl = document.getElementById('infographic-head');
  var cols = sourceLines('f2');
  var heads = cols.length ? splitRow(cols[0]) : [];

  // The heading strip mirrors a row's cell structure exactly (rank slot, then one cell per
  // column), so headings and values line up at any column count without a shared width table.
  if (headEl) {
    var headHtml = '<span class="infographic-rank"></span>';
    for (var h = 0; h < heads.length; h++) {
      headHtml += '<span class="infographic-cell' + (h === 0 ? ' infographic-cell-name' : '') + '">'
                + escapeHtml(heads[h]) + '</span>';
    }
    headEl.innerHTML = heads.length ? headHtml : '';
  }

  var html = '';
  var lines = sourceLines('f0');
  for (var i = 0; i < lines.length; i++) {
    var parts = splitRow(lines[i]);
    if (parts[0] === '') continue;               // a row with no competitor is not a row
    var cells = '<span class="infographic-rank">' + (i + 1) + '</span>';
    for (var c = 0; c < parts.length; c++) {
      cells += '<span class="infographic-cell' + (c === 0 ? ' infographic-cell-name' : '') + '">'
             + escapeHtml(parts[c]) + '</span>';
    }
    html += '<div class="infographic-row infographic-table-row">' + cells + '</div>';
  }
  rows.innerHTML = html;
}

${SPORTS_DOM_READY}`;
}

/**
 * TEAM / PLAYER STAT COMPARISON — one stat per line, drawn as two bars meeting in the middle.
 *
 *   `Possession | 62 | 38` · `Shots on target | 7 | 4`
 *
 * Each bar is that side's SHARE of the pair rather than its raw figure, so a row reads
 * correctly whether the two values are percentages that already sum to 100 or counts that do
 * not (`Shots | 14 | 9` splits 61/39). The figures PRINTED are always exactly what was typed:
 * the drawing is derived, the text never is.
 *
 * Rows carry `.infographic-bar-fill` with a `data-value`, so the shared `bars-grow` builder
 * animates them with no new motion code, and they are direct children of `#infographic-rows`
 * so `rows-cascade` works on the same markup.
 */
export function compareRowsRuntimeJs(): string {
  return `${SPORTS_PROLOGUE}

// rebuildInfographic(): parse the hidden #f0 stat source (one "label | home | away" per line)
// and rebuild the #infographic-rows comparison. Each side's BAR is its share of the pair, so
// counts compare as fairly as percentages; each side's TEXT is the figure exactly as typed.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  if (!rows) return;
  var html = '';
  var lines = sourceLines('f0');
  for (var i = 0; i < lines.length; i++) {
    var parts = splitRow(lines[i]);
    if (parts.length < 3) continue;              // a comparison needs a label and two figures
    var label = parts[0], homeText = parts[1], awayText = parts[2];
    var home = parseFloat(homeText), away = parseFloat(awayText);
    if (label === '' || isNaN(home) || isNaN(away)) continue;
    if (home < 0) home = 0;
    if (away < 0) away = 0;
    var total = home + away;
    // Both sides at zero is a real state (0-0 on shots at kick-off), and it has to draw as an
    // even empty row rather than dividing by zero.
    var homeShare = total > 0 ? (home / total) * 100 : 0;
    var awayShare = total > 0 ? (away / total) * 100 : 0;
    html += '<div class="infographic-row infographic-compare-row">'
          +   '<div class="infographic-compare-head">'
          +     '<span class="infographic-compare-home">' + escapeHtml(homeText) + '</span>'
          +     '<span class="infographic-compare-label">' + escapeHtml(label) + '</span>'
          +     '<span class="infographic-compare-away">' + escapeHtml(awayText) + '</span>'
          +   '</div>'
          +   '<div class="infographic-compare-track">'
          +     '<div class="infographic-compare-side infographic-compare-side-a">'
          +       '<div class="infographic-bar-fill" data-value="' + homeShare + '" style="width: ' + homeShare + '%"></div>'
          +     '</div>'
          +     '<div class="infographic-compare-side infographic-compare-side-b">'
          +       '<div class="infographic-bar-fill" data-value="' + awayShare + '" style="width: ' + awayShare + '%"></div>'
          +     '</div>'
          +   '</div>'
          + '</div>';
  }
  rows.innerHTML = html;
}

${SPORTS_DOM_READY}`;
}

/**
 * FIXTURES / RESULTS — one match per line, rendered into `#infographic-rows`.
 *
 *   `SAT 20:00 | Arsenal | 2-1 | Chelsea`   (a result)
 *   `SAT 20:00 | Arsenal | Chelsea`         (an upcoming match)
 *
 * The middle part is the RESULT when there is one and a fixture marker when there is not,
 * which is what lets a single graphic serve both "today's results" and "this weekend's
 * fixtures": they are the same board with and without a score, and an operator moving between
 * them mid-programme should not have to change graphics to do it.
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

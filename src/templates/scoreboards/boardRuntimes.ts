// The MATCH BOARD runtimes — design-owned JS shared by every full-scoreboard design, emitted
// outside the marked ANIMATION region (the shared/matchClock.ts rule: playout, not motion).
//
// Two jobs, both of which are the same idea as the repeating-data system one category over:
// something the operator types has to become something the DOM can paint, and the translation
// belongs in ONE place per type rather than copied into each skin.
//
//   TEAM COLOURS. Every club has its own two colours and a broadcast board is expected to
//   wear them. They arrive as ordinary data (two `color` fields), land in hidden holders, and
//   this runtime lifts them onto the root as `--team-a` / `--team-b` custom properties. The
//   design then styles whatever it likes with them — a bar, a chip, a name underline — and
//   never has to know how the value got there. An empty value falls back to the graphic's own
//   accent and text colours, so a board with no club colours set still looks deliberate.
//
//   THE PERIOD BREAKDOWN. Quarters, periods, sets and rounds are the same shape — a label and
//   two figures per line — so one repeating source covers basketball's four quarters, ice
//   hockey's three periods and tennis's five sets. That is why there is no per-sport board:
//   the sport is what the operator types, not what the template is.

/**
 * The full match board's runtime: team colours lifted onto the root, plus the period/set
 * breakdown rebuilt from its own hidden source.
 *
 * Contract with the design:
 *   - `.scoreboard-colour-a` / `.scoreboard-colour-b` — hidden holders carrying the two colour
 *     fields' ids; their text becomes `--team-a` / `--team-b` on `.scoreboard`;
 *   - `#scoreboard-periods` — where the breakdown renders, one `.scoreboard-period` per line;
 *   - `.scoreboard-periods-src` — the hidden repeating source, `label | home | away` per line.
 */
export function matchBoardRuntimeJs(): string {
  return `// escapeHtml(): the period cells below are built with innerHTML — operator text is
// escaped first so input like "SET 1 <TB>" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// applyTeamColours(): lift the two club colours out of their hidden holders and onto the root
// as custom properties, so the design's CSS can wear them without knowing where they came
// from. An empty value clears the property and the design's own fallback takes over — a board
// with no colours set must still look deliberate, not broken.
function applyTeamColours() {
  var root = document.querySelector('.scoreboard');
  if (!root) return;
  var pairs = [['.scoreboard-colour-a', '--team-a'], ['.scoreboard-colour-b', '--team-b']];
  for (var i = 0; i < pairs.length; i++) {
    var el = document.querySelector(pairs[i][0]);
    var value = el ? String(el.textContent).trim() : '';
    if (value === '') root.style.removeProperty(pairs[i][1]);
    else root.style.setProperty(pairs[i][1], value);
  }
}

// rebuildPeriods(): parse the hidden period source (one "label | home | away" per line) and
// rebuild the #scoreboard-periods breakdown. Quarters, periods, sets and rounds are all this
// shape, which is why one board serves basketball, ice hockey and tennis without branching.
function rebuildPeriods() {
  var wrap = document.getElementById('scoreboard-periods');
  if (!wrap) return;
  var src = document.querySelector('.scoreboard-periods-src');
  var lines = src ? String(src.textContent).split('\\n') : [];
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '') continue;                   // blank lines are spacing in the editor, not data
    var parts = line.split('|');
    var label = (parts[0] || '').trim();
    var home = (parts[1] || '').trim();
    var away = (parts[2] || '').trim();
    if (label === '') continue;                  // a column with no label is not a column
    html += '<div class="scoreboard-period">'
          +   '<span class="scoreboard-period-label">' + escapeHtml(label) + '</span>'
          +   '<span class="scoreboard-period-score">' + escapeHtml(home) + '</span>'
          +   '<span class="scoreboard-period-score">' + escapeHtml(away) + '</span>'
          + '</div>';
  }
  wrap.innerHTML = html;
}

// rebuildScoreboard(): the hook the scoreboard runtime calls after every update(). Both jobs
// are cheap and idempotent, so there is nothing to be clever about here.
function rebuildScoreboard() {
  applyTeamColours();
  rebuildPeriods();
}

// Paint once on load so the preview and a freshly loaded overlay show the board before the
// first update(). This file loads in <head>, before the board exists — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildScoreboard);
} else {
  rebuildScoreboard();             // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The compact scorebug's runtime: team colours only.
 *
 * A scorebug has no period breakdown — it is one strip with the score and the clock — but it
 * still wears the clubs' colours, and the colour lift is the same code. Kept as its own
 * emitter rather than a flag on the one above, because a design should not carry a rebuild for
 * an element it does not have (the same rule `PresetConfig.hasBars` exists for: no phantom
 * runtime for absent markup).
 */
export function teamColoursRuntimeJs(): string {
  return `// applyTeamColours(): lift the two club colours out of their hidden holders and onto the
// root as custom properties, so the design's CSS can wear them without knowing where they came
// from. An empty value clears the property and the design's own fallback takes over — a bug
// with no colours set must still look deliberate, not broken.
function applyTeamColours() {
  var root = document.querySelector('.scoreboard');
  if (!root) return;
  var pairs = [['.scoreboard-colour-a', '--team-a'], ['.scoreboard-colour-b', '--team-b']];
  for (var i = 0; i < pairs.length; i++) {
    var el = document.querySelector(pairs[i][0]);
    var value = el ? String(el.textContent).trim() : '';
    if (value === '') root.style.removeProperty(pairs[i][1]);
    else root.style.setProperty(pairs[i][1], value);
  }
}

// rebuildScoreboard(): the hook the scoreboard runtime calls after every update().
function rebuildScoreboard() {
  applyTeamColours();
}

// Paint once on load so the preview and a freshly loaded overlay show the colours before the
// first update(). This file loads in <head>, before the bug exists — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildScoreboard);
} else {
  rebuildScoreboard();             // DOM already parsed (e.g. an inline preview build)
}`;
}

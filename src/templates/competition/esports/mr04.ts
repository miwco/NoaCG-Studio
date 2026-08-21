// mr04 "Map Veto" - the map ladder used as a live pick-and-ban board. The operator still
// moves one cursor through one parameterized list, but each row records an action and side
// instead of a map winner. That keeps the map-round machine reusable without pretending a
// veto and a played series say the same thing.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import type { TypeField } from '../../types/graphicType';
import { ESCAPE_HTML_JS, READY_GUARD_JS } from '../shared';
import { sportMapDesign } from './mr01';
import { defineEsportsVariant } from './shared';

const VETO_FIELDS: TypeField[] = [
  { key: 'title', label: 'Draft title', kind: 'text', value: 'MAP VETO - GRAND FINAL', role: 'line' },
  {
    key: 'maps',
    label: 'Decisions (one per line: "Map | BAN A / BAN B / PICK A / PICK B / -")',
    kind: 'lines',
    value: 'ANCIENT | BAN A\nDUST II | BAN B\nMIRAGE | PICK A\nNUKE | PICK B\nINFERNO | -',
    role: 'data',
  },
  { key: 'current', label: 'Current decision (1-based)', kind: 'number', value: '5', role: 'data' },
  { key: 'teamA', label: 'Side A name', kind: 'text', value: 'TEAM LIQUID', role: 'data' },
  { key: 'teamB', label: 'Side B name', kind: 'text', value: 'NATUS VINCERE', role: 'data' },
];

const VETO_RUNTIME_JS = `${ESCAPE_HTML_JS}

// compRebuild(): parse one editable veto decision per line. The action remains operator data;
// the machine owns only which decision is live and whether the veto has been completed.
function compRebuild() {
  var host = document.getElementById('esports-score-rows');
  if (!host) return;
  var source = (document.getElementById('f1') || { textContent: '' }).textContent;
  var nameA = (document.getElementById('f3') || { textContent: 'A' }).textContent.trim();
  var nameB = (document.getElementById('f4') || { textContent: 'B' }).textContent.trim();
  var html = '';
  var rowNumber = 0;
  source.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;
    var split = line.indexOf('|');
    var map = (split === -1 ? line : line.slice(0, split)).trim();
    var decision = (split === -1 ? '' : line.slice(split + 1)).trim().toUpperCase();
    if (map === '') return;
    rowNumber++;
    var pieces = decision.split(/\\s+/);
    var action = pieces[0] || '';
    var side = pieces[1] || '';
    var sideName = side === 'A' ? nameA : (side === 'B' ? nameB : '');
    var mark = action && action !== '-' ? action + (sideName ? ' - ' + sideName : '') : 'PENDING';
    var state = action === 'BAN' ? 'esports-score-won-a'
      : (action === 'PICK' ? 'esports-score-won-b' : 'esports-score-open');
    html += '<div class="esports-score-row ' + state + '" data-map="' + rowNumber + '">'
          +   '<span class="esports-score-row-index">' + rowNumber + '</span>'
          +   '<span class="esports-score-row-map">' + escapeHtml(map) + '</span>'
          +   '<span class="esports-score-row-mark">' + escapeHtml(mark) + '</span>'
          + '</div>';
  });
  host.innerHTML = html;
}

function currentRow() {
  var host = document.getElementById('esports-score-rows');
  var at = parseInt((document.getElementById('f2') || { textContent: '' }).textContent, 10);
  if (!host || isNaN(at)) return null;
  return host.querySelector('[data-map="' + at + '"]');
}

function compRepaint() {
  var host = document.getElementById('esports-score-rows');
  if (!host) return;
  var rows = host.querySelectorAll('.esports-score-row');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('esports-score-current');
  var row = currentRow();
  if (row) row.classList.add('esports-score-current');
}

function applyMapCursor() {
  compRepaint();
  var row = currentRow();
  if (!row) return;
  gsap.fromTo(row, { x: -14 }, { x: 0, duration: 0.28 / motionSpeed(), ease: 'back.out(1.6)' });
}

function markSeriesFinal() {
  var root = document.querySelector('.esports-score');
  if (!root) return;
  root.classList.add('esports-score-decided');
  gsap.fromTo(
    '.esports-score-box',
    { scale: 1.018 },
    { scale: 1, duration: 0.32 / motionSpeed(), ease: 'back.out(1.6)' }
  );
}

function compClearMarks() {
  var root = document.querySelector('.esports-score');
  if (root) root.classList.remove('esports-score-decided');
}

${READY_GUARD_JS}`;

export const mr04: TemplateVariant = defineEsportsVariant(
  {
    id: 'mr04',
    category: 'esports-score',
    name: 'Map Veto',
    styleTag: 'sport',
    description: 'A pick-and-ban ladder with the current decision moved atomically by the operator.',
    maxLines: 1,
    suggestedLines: [{ title: 'Draft title', sample: 'MAP VETO - GRAND FINAL' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-right',
  },
  {
    name: 'Map Veto',
    description:
      'A live pick-and-ban ladder: every decision remains editable operator data while one ' +
      'cursor advances atomically through the draft and the completed state closes the board.',
    uicolor: '5',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    ...sportMapDesign(o, VETO_FIELDS, VETO_RUNTIME_JS),
    stageWidth: 610,
  }),
);

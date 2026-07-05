// Google Sheets (or any published CSV) as a LIVE data source. This generates a teachable,
// fully-editable polling block that gets appended to the template's own JS: it fetches the
// CSV every few seconds, maps columns → fields, and calls the graphic's update(). It runs
// wherever the template runs (preview, OBS browser source, SPX/CasparCG). Because it lives
// in template.js as ordinary code, the user can read and edit the URL + mapping directly —
// true to the "code is the source of truth" pillar.
//
// CORS note baked into the generated comments: use the sheet's "Publish to web → CSV" link
// (those are served for public embedding); strict browsers may still block other links, in
// which case Era 5's gateway proxies it universally.

import type { SpxField } from '../model/types';

const OPEN = '/* == LIVE DATA (published CSV → update) — edit or delete this whole block == */';
const CLOSE = '/* == END LIVE DATA == */';

/** True when the template JS already carries a live-data block. */
export function hasLiveData(js: string): boolean {
  return js.includes(OPEN);
}

/** Remove an existing live-data block (so "Add" is really "replace"). */
export function stripLiveData(js: string): string {
  const start = js.indexOf(OPEN);
  const end = js.indexOf(CLOSE);
  if (start === -1 || end === -1) return js;
  return (js.slice(0, start) + js.slice(end + CLOSE.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** The default column→field map: each editable field guesses its sheet header from its title. */
function defaultMap(fields: SpxField[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    if (['textfield', 'textarea', 'number', 'dropdown', 'filelist', 'color'].includes(f.ftype)) {
      map[f.field] = f.title || f.field;
    }
  }
  return map;
}

export interface LiveDataOptions {
  csvUrl: string;
  pollSeconds: number;
  fields: SpxField[];
}

/** Generate the live-data polling block for appending to template.js. */
export function liveDataBlock({ csvUrl, pollSeconds, fields }: LiveDataOptions): string {
  const map = defaultMap(fields);
  const mapLines = Object.entries(map)
    .map(([field, header]) => `    ${JSON.stringify(field)}: ${JSON.stringify(header)},   // ← sheet column header`)
    .join('\n');

  return `${OPEN}
// Publish your sheet: File → Share → Publish to web → (sheet) → CSV, and paste the link below.
(function () {
  var CSV_URL = ${JSON.stringify(csvUrl)};
  var POLL_MS = ${Math.max(1, Math.round(pollSeconds)) * 1000};

  // Which sheet column feeds which field. The header name must match your sheet's first row.
  var MAP = {
${mapLines}
  };
  // Which data row to read (0 = the first row AFTER the header). Change for multi-row sheets.
  var ROW = 0;

  // Minimal CSV parser (handles quoted cells with commas / quotes).
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\\n' || c === '\\r') { if (c === '\\r' && text[i + 1] === '\\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function pull() {
    fetch(CSV_URL, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (text) {
      var rows = parseCsv(text);
      var headers = rows[0] || [];
      var data = rows[ROW + 1] || [];
      var out = {};
      for (var field in MAP) {
        var col = headers.indexOf(MAP[field]);
        if (col >= 0) out[field] = data[col];
      }
      if (typeof update === 'function') update(JSON.stringify(out));
    }).catch(function () { /* offline or CORS-blocked — see the note above; the graphic still runs */ });
  }

  pull();
  setInterval(pull, POLL_MS);
})();
${CLOSE}
`;
}

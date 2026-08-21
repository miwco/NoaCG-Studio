// THE MATCH CLOCK'S TIME ORIGIN, as vanilla JS for the GENERATED operator pages.
//
// `matchClockWire.ts` is the same arithmetic as a TypeScript module, and it is what the app and
// the hosted `/output` renderer import. The two generated operator surfaces — the standalone
// `controlpanel.html` and the exported production `controller.html` — cannot import anything:
// they ship as one self-contained file inside a zip. So the arithmetic exists twice, on purpose,
// and this module is the single copy of the SECOND one, shared by both pages rather than
// hand-written into each.
//
// THE WIRE FORMAT IS THE CONTRACT between the two implementations: a clock value is either a
// held time ("45:00") or a running one carrying the instant it was true ("45:00@1755600000000").
// Change one side and change the other, or an exported package and a hosted renderer will
// disagree about what a clock reads — which is a thing that shows on air and nowhere else.
//
// Emitted into a page's <script> as-is, so: no backticks and no `${`, both of which would end
// the template literal that carries it.

/**
 * The five pure clock functions every generated operator page needs: read a value's plain half,
 * read its origin stamp, parse, format, and derive what it reads at a given instant.
 *
 * Deliberately only the PURE half. What each verb does to the clock (`clockRowEffect`'s
 * decision) depends on where the page keeps its field values — panel state, or a cue's draft
 * overlay — so each page writes those few lines against its own model.
 */
export const MATCH_CLOCK_PAGE_JS = `// ---- Match clock: the time origin (control/matchClockPageJs.ts) ----
// A clock is the one value that keeps moving with nobody commanding it, so a log of what was
// SENT cannot rebuild it: a graphic reloaded 67 minutes into a match came back at whatever the
// last Take carried and re-ran from there — on air, at the moment something has already gone
// wrong. So a clock value carries the instant it was true ("45:00@1755600000000"), the runtime
// paints value +/- elapsed (templates/shared/matchClock.ts), and the operator page stamps it.
// A plain value with no "@" is a HELD time, which is what a typed correction sends.

// clockPlain(): the value a person reads, without the origin stamp.
function clockPlain(raw) {
  var t = String(raw == null ? '' : raw).trim();
  var at = t.indexOf('@');
  return at === -1 ? t : t.slice(0, at).trim();
}

// clockOrigin(): the stamp in epoch ms, or null for a held value. A stamp that is not a number
// reads as absent — a broken stamp must degrade to a held clock showing the right time, never
// to a clock counting from 1970.
function clockOrigin(raw) {
  var t = String(raw == null ? '' : raw);
  var at = t.indexOf('@');
  if (at === -1) return null;
  var stamp = parseInt(t.slice(at + 1), 10);
  return isFinite(stamp) && stamp > 0 ? stamp : null;
}

// clockSeconds(): "45:00" -> 2700 - "90" -> 90. The runtime's own parser, kept identical.
function clockSeconds(raw) {
  var parts = clockPlain(raw).split(':');
  var mins = parseInt(parts[0], 10) || 0;
  if (parts.length < 2) return Math.max(0, mins);      // a bare number is seconds
  return Math.max(0, mins * 60 + (parseInt(parts[1], 10) || 0));
}

// clockFormat(): 2700 -> "45:00". Minutes are never zero-padded (broadcast reads "7:05");
// seconds always are.
function clockFormat(total) {
  if (total < 0) total = 0;
  var s = total % 60;
  return Math.floor(total / 60) + ':' + (s < 10 ? '0' + s : s);
}

// clockValueAt(): what a clock value reads at that instant — a held value as it stands, a
// stamped one plus (or minus) the seconds since its origin.
function clockValueAt(raw, down, now) {
  var origin = clockOrigin(raw);
  var base = clockSeconds(raw);
  if (origin === null) return clockFormat(base);
  var elapsed = Math.floor((now - origin) / 1000);
  if (elapsed < 0) elapsed = 0;                        // a clock stamped in the future holds
  return clockFormat(down ? Math.max(0, base - elapsed) : base + elapsed);
}`;

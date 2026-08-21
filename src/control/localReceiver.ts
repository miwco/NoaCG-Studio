// The LOCAL RELAY receiver: a marked, commented, DELETABLE block appended to an exported
// overlay graphic so a control panel can drive it THROUGH the bundled localhost relay
// (export/local-relay/). BroadcastChannel cannot cross into OBS/vMix's separate browser
// engine and never works over file:// — the relay's ordered log is the local counterpart of
// the hosted control log, same command vocabulary, polled over same-origin fetch.
//
// Inert everywhere the relay is not: over file://, or when the files are served by a plain
// static server (/relay/ping missing), the block probes once and goes quiet.

const OPEN = '/* == LOCAL RELAY (NoaCG) — edit or delete this whole block == */';
const CLOSE = '/* == END LOCAL RELAY == */';

export function hasLocalReceiver(js: string): boolean {
  return js.includes(OPEN);
}

/** The raw JS block — what the single-file composer appends as an extra body script. */
export function localReceiverJs(graphicName: string): string {
  return `${OPEN}
// Drive this graphic through the package's LOCAL RELAY (start it with the bundled launcher;
// see GETTING-ON-AIR.md). The relay keeps an ordered command log; this block polls it and
// applies rows addressed to this graphic — the same update/play/stop/next/event/snap
// vocabulary every NoaCG control surface speaks. Delete the whole block to opt out.
(function () {
  var GRAPHIC = ${JSON.stringify(graphicName)};
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return; // file:// — no relay
  // Which stream this instance follows: /graphic.html?stream=preview renders the PREVIEW
  // feed; the default is the program feed that goes to air.
  var STREAM = 'program';
  try {
    var q = new URLSearchParams(location.search).get('stream');
    if (q) STREAM = q;
  } catch (e) { /* very old engine — program feed */ }

  function apply(m) {
    if (!m) return;
    if (m.t === 'play' && typeof play === 'function') play();
    else if (m.t === 'stop' && typeof stop === 'function') stop();
    else if (m.t === 'next' && typeof next === 'function') next();
    else if (m.t === 'update' && typeof update === 'function') update(JSON.stringify(m.data || {}));
    else if (m.t === 'event' && typeof noacgDispatch === 'function') noacgDispatch(m.event, m.payload);
    else if (m.t === 'snap' && typeof noacgSnap === 'function') noacgSnap(m.snap || null);
  }

  var cursor = null;
  var polling = false;
  function poll() {
    if (polling || cursor === null) return;
    polling = true;
    fetch('/relay/log?after=' + cursor)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        polling = false;
        if (!data || !data.rows) return;
        for (var i = 0; i < data.rows.length; i++) {
          var row = data.rows[i];
          cursor = row.id; // advance past every row — foreign rows must not be refetched
          if (row.graphic === GRAPHIC && (row.stream || 'program') === STREAM) apply(row.msg);
        }
      })
      .catch(function () { polling = false; });
  }

  // ── BOOT RECOVERY (docs/CLOUD_PLAYOUT.md's recovery discipline, local half) ───────────────
  // A browser source that reloads mid-show used to boot at the log HEAD and come back BLANK:
  // off air, every field at the design's own defaults, until an operator happened to press
  // something. Measured on an exported package: a board aired at 89-84 with the clock at 9:55
  // came back invisible, reading 88 and 10:00, with nine rows sitting unread in the log.
  //
  // The log IS the history, so recovery needs no report channel and no new protocol — it needs
  // a BOUNDED replay. Two things bound it, and both matter:
  //
  //   - it starts at the LAST "play" for this graphic and stream, so what is re-run is the
  //     current airing rather than the whole show. A graphic never played, or stopped since,
  //     is supposed to be blank and is left alone;
  //   - it runs OFF AIR. Replayed commands are ordinary commands and they animate, so a
  //     visible replay would put the outage's history on screen — recovery is never watchable.
  //     The page hides itself, replays, lets the motion settle, and comes back.
  //
  // The opacity goes on documentElement deliberately: the runtime's own entrance reset clears
  // inline styles across the GRAPHIC's root subtree, which would strip a hide set inside it.
  var SETTLE_MS = 1200;         // an entrance plus an exit; overshooting only costs blank frames
  var MAX_PAGES = 40;           // the tail RPC answers 500 rows at a time — the same ceiling
                                // the hosted renderer's catch-up walk uses

  function readLog(after, acc, pages, done) {
    if (pages >= MAX_PAGES) { done(acc); return; }
    fetch('/relay/log?after=' + after)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.rows) { done(acc); return; }
        for (var i = 0; i < data.rows.length; i++) acc.push(data.rows[i]);
        if (data.rows.length < 500) done(acc);
        else readLog(acc[acc.length - 1].id, acc, pages + 1, done);
      })
      .catch(function () { done(acc); });
  }

  function recover(head) {
    readLog(0, [], 0, function (all) {
      var mine = [];
      for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.graphic === GRAPHIC && (r.stream || 'program') === STREAM) mine.push(r);
      }
      // Where the current airing begins, and whether it is still on.
      var from = -1;
      for (var j = 0; j < mine.length; j++) {
        var t = mine[j].msg && mine[j].msg.t;
        if (t === 'play') from = j;
        else if (t === 'stop') from = -1;      // taken off air: blank is the correct picture
      }
      if (from === -1) { cursor = head; setInterval(poll, 400); return; }

      // The data half: EVERY value ever written to this graphic, merged in order - not merely
      // those up to the play. Two things depend on the whole set:
      //
      //   - a bump sent after the take is a PARTIAL update carrying one field, so the score is
      //     only in the later rows (measured: recovering from the pre-play values alone brought
      //     the board back at 88 when it had aired at 89);
      //   - the clock's value carries its origin stamp, written when the clock started, which
      //     is after the play. Merging in order means the newest write wins, and the operator
      //     surfaces stage the stamped value into the cue, so a later Take carries it too
      //     (control/matchClockWire.ts clockValueAfterUpdate) rather than reverting it.
      var data = {};
      var k, key;
      for (k = 0; k < mine.length; k++) {
        var m = mine[k].msg || {};
        if (m.t === 'update' && m.data) { for (key in m.data) data[key] = m.data[key]; }
        else if (m.t === 'event' && m.payload) { for (key in m.payload) data[key] = m.payload[key]; }
      }

      var root = document.documentElement;
      var prior = root.style.opacity;
      root.style.opacity = '0';
      if (typeof update === 'function') update(JSON.stringify(data));
      for (k = from; k < mine.length; k++) apply(mine[k].msg);
      // …and the data again, because a "snap" in the replay resets the graphic first and clears
      // the inline styles the DATA layer owns (an empty image field hides itself with one).
      if (typeof update === 'function') update(JSON.stringify(data));

      // Follow live from the head we read, then come back on air once the replay has settled.
      cursor = head;
      setInterval(poll, 400);
      setTimeout(function () { root.style.opacity = prior; }, SETTLE_MS);
    });
  }

  fetch('/relay/ping')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.ok) return; // plain static hosting — stay quiet
      recover(d.head || 0);
    })
    .catch(function () { /* no relay here */ });
})();
${CLOSE}`;
}

/** The same block wrapped as a <script> tag, for callers injecting into finished HTML. */
export function localReceiverScript(graphicName: string): string {
  return `<script>\n${localReceiverJs(graphicName)}\n</script>`;
}

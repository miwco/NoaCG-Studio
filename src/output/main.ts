// The browser-output renderer's entry (docs/CLOUD_PLAYOUT.md §3). Boot: resolve the
// production by its OUTPUT capability, build the stage (every graphic preloaded), rebuild each
// graphic from its last report (the data half, then the visual half — recovery is both), then
// follow the command log live through the shared recovery discipline (followControlLog).
//
// Nothing but graphics ever renders on air: no connection text, no UI. A disconnected renderer
// keeps its last applied state and recovers silently; `&debug=1` overlays a status readout for
// setup and rehearsal. The "not available" card exists only for a wrong URL or an offline
// build — states a live production can never be in.

import { isBackendConfigured } from '../backend/config';
import {
  CONTROL_TAIL_PAGE,
  controlOutputBySlug,
  controlOutputReport,
  controlOutputSeen,
  controlOutputTail,
  followControlLog,
  type ControlEventRow,
} from '../control/hostedControl';
import {
  clockSpecFromHtml,
  heldClockValue,
  rowInstant,
  startedClockValue,
  type ClockSpec,
} from '../control/matchClockWire';
import { createOutputStage } from './stage';

/** How long the recovered picture is given to settle off air before the stage comes back.
 *  Covers a typical entrance plus an exit; the cost of overshooting is a moment more of the
 *  blank a just-loaded page was showing anyway, the cost of undershooting is an animation
 *  finishing on air. */
const CATCH_UP_SETTLE_MS = 1200;
/** Runaway guard on the boot catch-up walk (the same ceiling followControlLog's refill uses). */
const MAX_CATCH_UP_PAGES = 40;

const params = new URLSearchParams(window.location.search);
const outputSlug = params.get('production');
const debug = params.get('debug') === '1';

const debugEl = debug ? document.createElement('pre') : null;
const debugState: Record<string, string> = {};
if (debugEl) {
  debugEl.style.cssText =
    'position:fixed;left:8px;bottom:8px;margin:0;padding:8px 10px;z-index:10;' +
    'font:12px/1.5 monospace;color:#ffb84d;background:rgba(10,10,12,0.82);border-radius:6px;';
  document.body.appendChild(debugEl);
}
function dbg(key: string, value: string): void {
  if (!debugEl) return;
  debugState[key] = value;
  debugEl.textContent = Object.entries(debugState)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/**
 * WHICH BROWSER ENGINE IS ACTUALLY RENDERING THIS. CasparCG's embedded CEF changed inside the
 * 2.3 line, so "I run 2.3.x" does not say whether a design using `color-mix()` will paint — and
 * the studio's compatibility report can only be as good as the number the operator brings to it.
 * There is exactly one machine that knows, and it is this one, so it says so on the debug
 * overlay. It costs nothing and settles a question that otherwise needs a changelog archaeology
 * session per install.
 */
if (debugEl) {
  const chrome = / (?:Chrome|Chromium)\/(\d+)/.exec(navigator.userAgent);
  dbg('engine', chrome ? `Chromium ${chrome[1]}` : navigator.userAgent.slice(0, 60));
}

/** The wrong-URL / offline card. Never part of a live production's air. */
function unavailable(reason: string): void {
  const card = document.createElement('div');
  card.style.cssText =
    // Longhands, not `inset` (Chromium 87): this card exists to explain a failure, and an old
    // CasparCG CEF is exactly where one happens — a card that unpositions itself there would
    // print its explanation into the corner of a live layer.
    'position:fixed;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;background:#0a0a0c;color:#8a8a92;' +
    'font:15px/1.6 system-ui,sans-serif;text-align:center;';
  card.innerHTML = `<div><div style="font-size:18px;color:#c9c9cf;margin-bottom:6px">Output not available</div>${reason}</div>`;
  document.body.appendChild(card);
}

async function boot(): Promise<void> {
  if (!outputSlug) {
    unavailable('This URL is missing its <code>?production=</code> token.');
    return;
  }
  if (!isBackendConfigured()) {
    unavailable('This build runs offline — browser output needs the cloud backend.');
    return;
  }
  const resolved = await controlOutputBySlug(outputSlug);
  if (!resolved) {
    unavailable('This link is invalid or the production was unpublished.');
    return;
  }
  dbg('production', resolved.title);
  if (!resolved.output || resolved.output.graphics.length === 0) {
    // Published before the payload existed (an older build) or an empty rundown: stay
    // transparent and honest — the operator page will say "re-publish".
    dbg('payload', 'none — re-publish the production');
    return;
  }

  const stage = createOutputStage(document.body, resolved.output);
  dbg('graphics', stage.graphics.join(', '));

  // ── Recovery baselines (0033): each live entry records the log row the renderer had applied
  // when it wrote that report, so a graphic's rebuilt state accounts for everything up to its
  // own baseline and nothing after it. Follow from the OLDEST baseline and skip, per graphic,
  // what its own snapshot already contains — reports are per graphic and debounced, so one can
  // be seconds fresher than another, and a single show-wide cursor would drop the difference.
  // An entry with no baseline (a pre-0033 server or renderer) is replayed from the oldest
  // baseline instead: replaying a command the snapshot already holds costs one re-animation,
  // skipping one loses the picture. Nothing reported at all (no renderer has ever run) starts
  // at the log head, because there is no snapshot the history would be filling in. ──
  const snapshotAt = new Map<string, number>();
  for (const key of stage.graphics) {
    const at = resolved.live[key]?.event;
    if (typeof at === 'number') snapshotAt.set(key, at);
  }
  const baselines = [...snapshotAt.values()];
  const followFrom = baselines.length > 0 ? Math.min(...baselines) : resolved.lastEventId;
  let lastAppliedId = followFrom;

  // ── Applied-truth bookkeeping (the panel event-log pattern, parent-side): the sandbox has
  // no DOM to harvest across, so the renderer reports what it FORWARDED — update data merged
  // per graphic, event payloads merged optimistically (the same rule the standalone panel's
  // log applies), machine state from the documents' own replies. Reports fire ONLY for
  // forwarded renderer commands and observed state changes — never for the log's status rows,
  // because control_output_report itself inserts a {t:'live'} status row, and reporting on it
  // would make the renderer feed its own subscription forever. ──
  const mergedData = new Map<string, Record<string, string>>();
  const lastReported = new Map<string, string>();
  const reportTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const scheduleReport = (graphic: string) => {
    clearTimeout(reportTimers.get(graphic));
    reportTimers.set(
      graphic,
      setTimeout(() => {
        const data = mergedData.get(graphic) ?? {};
        const state = stage.states.get(graphic) ?? null;
        // Byte-identical truth needs no second write (the 1 s state poll answers every second).
        const key = JSON.stringify([data, state]);
        if (key === lastReported.get(graphic)) return;
        lastReported.set(graphic, key);
        void controlOutputReport(outputSlug, graphic, data, state, lastAppliedId);
      }, 800),
    );
  };
  stage.onState((graphic) => scheduleReport(graphic));

  // ── Which graphics are LIVE (played/snapped and not yet stopped): only those can change
  // state on a timer, so only those need the 1 s machine-state poll — an idle stacked
  // graphic's machine cannot move without a command, and the renderer's main thread is the
  // one that must not miss frames. ──
  const liveGraphics = new Set<string>();
  setInterval(() => liveGraphics.forEach((g) => stage.requestState(g)), 1000);

  // ── THE MATCH CLOCK'S TIME ORIGIN (control/matchClockWire.ts). A clock is the one value that
  // keeps moving with nobody commanding it, so a snapshot of the commands cannot rebuild it: a
  // browser source reloaded at 67 minutes used to come back at 0:00. The clock's own field value
  // therefore carries the instant it was true (`"45:00@1755600000000"`), and this is where that
  // stamp is attached — DERIVED from the clockStart row's own server time, so every renderer
  // computes the same one and a boot-time replay of the log reconstructs it exactly. Stopping
  // banks the derived time back as a plain value; resetting banks the period's own start. All
  // three land in `mergedData`, which is what the report persists and what boot recovery
  // replays — which is the whole recovery. ──
  const clockSpecs = new Map<string, ClockSpec>();
  for (const spec of resolved.output.graphics) {
    const clock = clockSpecFromHtml(spec.html);
    if (clock) clockSpecs.set(spec.key, clock);
  }
  /** The clock value this row leaves behind, or null when the row does not move the clock. */
  const clockAfter = (row: ControlEventRow, clock: ClockSpec): string | null => {
    if (row.msg.t !== 'event') return null;
    const at = rowInstant(row.created_at, Date.now());
    const held = mergedData.get(row.graphic)?.[clock.field];
    if (row.msg.event === 'clockStart') return startedClockValue(held ?? clock.seed, clock.countsDown, at);
    if (row.msg.event === 'clockStop') return heldClockValue(held ?? clock.seed, clock.countsDown, at);
    // Reset is a separate operation, and `resetTo` is what the RUNTIME returns to rather than
    // what the element happens to read - the two must record the same number or a reboot after
    // a reset would recover a different time from the one on air.
    if (row.msg.event === 'clockReset') return clock.resetTo;
    return null;
  };
  const applyClock = (row: ControlEventRow, clock: ClockSpec, value: string) => {
    mergedData.set(row.graphic, { ...mergedData.get(row.graphic), [clock.field]: value });
    stage.apply(row.graphic, { t: 'update', data: { [clock.field]: value } });
  };

  const apply = (row: ControlEventRow) => {
    lastAppliedId = Math.max(lastAppliedId, row.id);
    const snapshot = snapshotAt.get(row.graphic);
    // Already inside the state this graphic was rebuilt from — replaying it would re-air it.
    if (snapshot !== undefined && row.id <= snapshot) return;
    const msg = row.msg;
    if (msg.t === 'update') {
      mergedData.set(row.graphic, { ...mergedData.get(row.graphic), ...msg.data });
    } else if (msg.t === 'event' && msg.payload) {
      mergedData.set(row.graphic, { ...mergedData.get(row.graphic), ...msg.payload });
    } else if (msg.t === 'play' || msg.t === 'snap') {
      liveGraphics.add(row.graphic);
    } else if (msg.t === 'stop') {
      liveGraphics.delete(row.graphic);
    }
    // The clock's new value goes in BEFORE a start and AFTER a hold. Starting, the shared origin
    // must already be in the document when `startMatchClock` runs, or the runtime mints a local
    // one and this renderer's clock is anchored a network hop away from every other's. Holding,
    // the banked value is what the graphic has just settled on, so it follows the event that
    // settled it.
    const clock = clockSpecs.get(row.graphic);
    const clockValue = clock ? clockAfter(row, clock) : null;
    const starting = msg.t === 'event' && msg.event === 'clockStart';
    if (clock && clockValue !== null && starting) applyClock(row, clock, clockValue);
    stage.apply(row.graphic, msg);
    if (clock && clockValue !== null && !starting) applyClock(row, clock, clockValue);
    // Status rows ('cue'/'staged'/'live') are for the operator pages; the stage ignored them
    // and so does the report path.
    const forwarded = msg.t === 'update' || msg.t === 'play' || msg.t === 'stop' || msg.t === 'next' || msg.t === 'event' || msg.t === 'snap';
    if (forwarded) scheduleReport(row.graphic);
    dbg('last row', String(row.id));
  };

  // ── Catch-up: everything commanded while this renderer was gone. Fetched BEFORE the rebuild
  // so the whole recovery happens in one hidden pass, because replayed commands are ordinary
  // commands and animate: a reopened output must show the settled picture, not the outage's
  // history playing out on air (the doctrine is data, then SNAP — recovery is never watchable).
  // Only lifecycle commands are worth hiding for; a missed `update` is a text swap with nothing
  // to watch, and nothing missed at all hides nothing, so an ordinary reopen still paints at
  // once. Paged, because the tail RPC answers CONTROL_TAIL_PAGE rows at a time. ──
  const missed: ControlEventRow[] = [];
  for (let page = 0; page < MAX_CATCH_UP_PAGES; page += 1) {
    const rows = await controlOutputTail(outputSlug, missed.length > 0 ? missed[missed.length - 1].id : followFrom);
    missed.push(...rows);
    if (rows.length < CONTROL_TAIL_PAGE) break;
  }
  const animates = missed.some(
    (row) =>
      row.id > (snapshotAt.get(row.graphic) ?? -1) &&
      (row.msg.t === 'play' || row.msg.t === 'stop' || row.msg.t === 'next' || row.msg.t === 'event'),
  );
  if (animates) {
    stage.setVisible(false);
    dbg('catch-up', `${missed.length} row(s), off air while they settle`);
  }

  // ── Boot recovery, per graphic: the data half, then the visual half (snap arms timers). ──
  for (const key of stage.graphics) {
    const mine = resolved.live[key];
    if (!mine) continue;
    if (mine.data) {
      mergedData.set(key, { ...mine.data });
      stage.apply(key, { t: 'update', data: mine.data });
    }
    if (mine.state?.groups) {
      stage.apply(key, { t: 'snap', snap: mine.state.groups });
      liveGraphics.add(key);
      // …and the data half AGAIN. Snap resets the graphic before composing the pose, which
      // clears every inline style — including ones the DATA layer owns, like the display:none
      // that hides an image field with no picture (that one recovers as an empty broken-image
      // box otherwise). Restating the data costs one message and repairs graphics whose code
      // was published before the runtime learned to preserve it.
      if (mine.data) stage.apply(key, { t: 'update', data: mine.data });
    }
  }

  // Replay what was missed, then come back on air once the animations it fired have landed.
  // A fixed settle beats waiting for "no state change in N ms": a recovered graphic can hold a
  // state that keeps moving (a ticker, a clock), so a quiet-period test would never fire.
  missed.forEach(apply);
  if (animates) {
    setTimeout(() => {
      stage.setVisible(true);
      dbg('catch-up', `${missed.length} row(s) replayed, back on air`);
    }, CATCH_UP_SETTLE_MS);
  }

  // ── Follow the log live (shared discipline: dedupe, hole → tail, refill on resubscribe). ──
  await followControlLog({
    showId: resolved.id,
    // Everything up to here is applied — including the catch-up rows replayed above, which is
    // why this is the applied cursor and not the baseline the catch-up started from.
    from: lastAppliedId,
    tail: (after) => controlOutputTail(outputSlug, after),
    onRow: apply,
  });
  dbg('realtime', 'following');

  // ── Heartbeat: operator surfaces read output_seen_at staleness as "renderer connected". ──
  void controlOutputSeen(outputSlug);
  setInterval(() => void controlOutputSeen(outputSlug), 60_000);
}

void boot();

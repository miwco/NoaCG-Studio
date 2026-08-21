// THE MATCH CLOCK ON THE WIRE (docs/CLOUD_PLAYOUT.md §3, docs/SPORTS_PACK.md).
//
// A match clock is the one piece of a graphic whose truth is a moving number, and a moving
// number cannot be recovered from a snapshot of the commands that moved it. Until 2026-08-19 it
// was not recovered at all: every renderer kept its own counter and incremented it once a
// second, so a browser source RELOADED at 67 minutes came back at 0:00, two renderers started a
// second apart stayed a second apart for the whole match, and a renderer in a background tab
// (Chromium throttles those timers to roughly one a minute) simply fell behind.
//
// THE FIX IS A TIME ORIGIN, and this module is the wire half of it: the clock's value carries
// the instant it was true, appended as `"45:00@1755600000000"`. The template runtime
// (templates/shared/matchClock.ts) paints `value ± elapsed` from that, so
//
//   - two renderers reading the same string paint the same second, whenever they read it;
//   - a re-send is idempotent, which matters because every Take and ✎ Update re-sends the cue's
//     whole value set — a raw counter snapshot pulled the clock backwards on every score bump;
//   - a renderer that boots into the middle of a match derives the right time from the value
//     alone, with no history to replay and no second message to wait for.
//
// **The stamp is DERIVED, never invented.** It is the `clockStart` row's own server time, which
// every renderer sees identically and which a boot-time replay of the log reconstructs exactly —
// so there is no authority to elect and nothing to keep in sync. A locally-authored row (an
// offline production's own commands) has no server time and falls back to the local clock,
// which is correct there because that log has exactly one renderer.
//
// Everything here is pure string work over the PUBLISHED html, so no design has to declare
// anything: the clock element is the one the template contract already names
// (`.<prefix>-clock`), and its field id and count direction are read off it.

import type { ControlEventRow } from './hostedControl';

/** What a published graphic's clock IS, read from its own markup. */
export interface ClockSpec {
  /** The field id the clock element carries (`f5`), i.e. the key its value rides under. */
  field: string;
  /** `data-count="down"` — a design decision, never an operator one. */
  countsDown: boolean;
  /** The clock's value before the wire has said anything: `data-start`, else the element's own
   *  initial text. Mirrors the runtime's `initMatchClock`. */
  seed: string;
  /** What `resetMatchClock` returns to — `data-start`, else ZERO, which is what the runtime
   *  actually does. It is deliberately not `seed`: at reset time the element's text is the
   *  RUNNING time, so falling back to it would reset a clock to wherever it had got to. The two
   *  differ only on a clock element with no `data-start`, which the scoreboard emitter never
   *  produces (it always writes the attribute and the text together). */
  resetTo: string;
}

/**
 * Read the clock out of a published graphic's html, or null for a graphic with no clock (which
 * is most of them). Uses DOMParser rather than a regex: attribute order is not something a
 * generated template promises, and a clock silently missed here is a clock that quietly stops
 * recovering.
 */
export function clockSpecFromHtml(html: string): ClockSpec | null {
  if (!html || html.indexOf('-clock') === -1) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  } catch {
    return null;
  }
  const el = [...doc.body.querySelectorAll<HTMLElement>('[class]')].find((node) =>
    [...node.classList].some((c) => c.endsWith('-clock')),
  );
  if (!el || !el.id) return null;                  // a readout with no field id is not on the wire
  const dataStart = el.getAttribute('data-start');
  return {
    field: el.id,
    countsDown: el.getAttribute('data-count') === 'down',
    seed: dataStart || (el.textContent ?? '').trim(),
    resetTo: dataStart || '0',
  };
}

/** The value without its origin stamp — what a person reads, and what a held clock sends. */
export function plainClockValue(raw: string | undefined | null): string {
  const text = String(raw ?? '').trim();
  const at = text.indexOf('@');
  return at === -1 ? text : text.slice(0, at).trim();
}

/** The origin stamp in epoch ms, or null for a held value. A stamp that is not a number reads
 *  as absent: a broken stamp must degrade to a held clock showing the right time. */
export function clockOriginOf(raw: string | undefined | null): number | null {
  const text = String(raw ?? '');
  const at = text.indexOf('@');
  if (at === -1) return null;
  const stamp = Number.parseInt(text.slice(at + 1), 10);
  return Number.isFinite(stamp) && stamp > 0 ? stamp : null;
}

/** "45:00" -> 2700 · "90" -> 90. The template's own parser, kept identical on purpose. */
export function clockSeconds(raw: string | undefined | null): number {
  const parts = plainClockValue(raw).split(':');
  const mins = Number.parseInt(parts[0], 10) || 0;
  if (parts.length < 2) return Math.max(0, mins);
  return Math.max(0, mins * 60 + (Number.parseInt(parts[1], 10) || 0));
}

/** 2700 -> "45:00". Minutes are never zero-padded (broadcast reads "7:05"); seconds always are. */
export function formatClock(total: number): string {
  const safe = total < 0 ? 0 : total;
  const s = safe % 60;
  return `${Math.floor(safe / 60)}:${s < 10 ? `0${s}` : s}`;
}

/**
 * What the clock field's held value becomes when an `update` row writes it.
 *
 * THE ORIGIN MUST SURVIVE A RESEND. Every Take and ✎ Update sends the cue's WHOLE value set, and
 * a cue stores a PLAIN time — so five minutes into a match, a score bump re-sends `"10:00"` over
 * a held `"10:00@1755600000000"`. Merging that blindly threw the origin away: the next clockStop
 * banked the seed instead of the running time, and a renderer booting from the report came back
 * at the seed too — both of them the very things the origin was added to prevent.
 *
 * The rule is the one the runtime already states: what distinguishes a CORRECTION from a resend
 * is that the value the wire carries CHANGED. It is compared against the held value's plain half
 * precisely because the origin write is ours, not the operator's — the operator's `"10:00"` has
 * not changed just because we stamped it.
 *
 * The honest limit, unchanged from the runtime's: an operator cannot re-apply the time the clock
 * already started from. No control surface can express that anyway (the field holds that text, so
 * there is no edit to send), and returning to a known value is `clockReset`'s job.
 */
export function clockValueAfterUpdate(held: string | undefined, incoming: string): string {
  if (clockOriginOf(incoming) !== null) return incoming;         // a stamped value always wins
  if (held === undefined || clockOriginOf(held) === null) return incoming;
  return plainClockValue(held) === plainClockValue(incoming) ? held : incoming;
}

/** What a clock reads at `now`: the held value, or the origin value plus the seconds since. */
export function clockValueAt(raw: string | undefined | null, countsDown: boolean, now: number): string {
  const origin = clockOriginOf(raw);
  const base = clockSeconds(raw);
  if (origin === null) return formatClock(base);
  const elapsed = Math.max(0, Math.floor((now - origin) / 1000));
  return formatClock(countsDown ? Math.max(0, base - elapsed) : base + elapsed);
}

/** Start the clock from where it stands: the value it reads at `at`, stamped with `at`. */
export function startedClockValue(raw: string | undefined | null, countsDown: boolean, at: number): string {
  return `${clockValueAt(raw, countsDown, at)}@${at}`;
}

/** Hold the clock where it stands at `at` — the derived time, banked as a plain value. */
export function heldClockValue(raw: string | undefined | null, countsDown: boolean, at: number): string {
  return clockValueAt(raw, countsDown, at);
}

/** When a row was written, for stamping. Server rows carry `created_at` and every renderer reads
 *  the same one; a locally-authored row has none and there is only one renderer to agree with. */
export function rowInstant(createdAt: string | undefined, fallback: number): number {
  if (!createdAt) return fallback;
  const at = Date.parse(createdAt);
  return Number.isFinite(at) ? at : fallback;
}

/** What one log row does to the clock. */
export interface ClockEffect {
  /** The clock field's value after this row. */
  value: string;
  /**
   * WHEN the renderer must write it, relative to forwarding the row itself.
   *
   * `before` for a START: the shared origin has to be in the document by the time
   * `startMatchClock` runs, or the runtime mints a LOCAL one and this renderer's clock ends up
   * anchored a network hop away from every other renderer's — which is the drift the origin
   * exists to remove.
   *
   * `after` for a hold or a reset: the value being banked is what the graphic has just settled
   * on, so it follows the event that settled it.
   */
  when: 'before' | 'after';
}

/**
 * THE ONE PLACE A LOG ROW IS READ AS A CLOCK MOVE. Pure on purpose: the renderer that uses it
 * (`output/main.ts`) only runs against a live backend, so a decision left inside its boot
 * closure could not be driven by any offline spec — and this is the live-broadcast half of the
 * fix, where "which event stamps what, and in which order" is exactly where a bug would hide.
 *
 * `held` is the clock field's CURRENT value on the wire — normally whatever the last Take or ✎
 * Update carried, which is why a start resumes from where the clock stands rather than from the
 * design's seed. Absent (nothing has been sent for this graphic yet), the design's own seed
 * stands in. `now` is only the fallback instant for a locally-authored row; a server row's own
 * `created_at` always wins, because that is the value every renderer agrees on.
 *
 * Returns null for every row that does not move the clock — which is nearly all of them.
 */
export function clockRowEffect(
  row: Pick<ControlEventRow, 'msg' | 'created_at'>,
  clock: ClockSpec,
  held: string | undefined,
  now: number,
): ClockEffect | null {
  if (row.msg.t !== 'event') return null;
  const at = rowInstant(row.created_at, now);
  const from = held ?? clock.seed;
  switch (row.msg.event) {
    case 'clockStart':
      return { value: startedClockValue(from, clock.countsDown, at), when: 'before' };
    case 'clockStop':
      return { value: heldClockValue(from, clock.countsDown, at), when: 'after' };
    // Reset banks `resetTo` — what the RUNTIME returns to — rather than what the element happens
    // to read, because the two must record the same number or a reboot after a reset would
    // recover a different time from the one on air.
    case 'clockReset':
      return { value: clock.resetTo, when: 'after' };
    default:
      return null;
  }
}

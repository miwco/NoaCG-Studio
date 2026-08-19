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

/** What a published graphic's clock IS, read from its own markup. */
export interface ClockSpec {
  /** The field id the clock element carries (`f5`), i.e. the key its value rides under. */
  field: string;
  /** `data-count="down"` — a design decision, never an operator one. */
  countsDown: boolean;
  /** What `resetMatchClock` returns to: `data-start`, else the element's own initial text. */
  start: string;
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
  return {
    field: el.id,
    countsDown: el.getAttribute('data-count') === 'down',
    start: el.getAttribute('data-start') || (el.textContent ?? '').trim(),
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

/**
 * Park a composed graphic at its SETTLED on-air state inside a preview iframe.
 *
 * A graphic is hidden until `play()` runs, so any surface that shows one WITHOUT a playback
 * gesture - a Home card's thumbnail, the operator panel's preview before the first take - must
 * drive it to rest itself, or it reads as an empty black frame. This is that one recipe, shared
 * so those surfaces can never drift into a second render path (the editor canvas settles the
 * same way in PlayoutSimulator).
 *
 * The recipe: write the data, jump the house entrance builder to the end of its FINITE motion,
 * write the data AGAIN. The second `update()` is load-bearing - the seek suppresses GSAP
 * callbacks, so anything a callback writes (a counter's digits, a bar's fill) would otherwise
 * be left at its pre-entrance value while the layout around it sits at the end state.
 *
 * A template with no builder (blank, hand-written, foreign import) has no entrance to jump, so
 * it gets its own `play()` and is allowed to come to rest on its own clock.
 *
 * ── WHY "THE END OF THE FINITE MOTION" AND NOT `progress(1)` ──
 *
 * An ENDLESS track has no end, and one endless child is enough to take the whole timeline's
 * end with it: GSAP reports the duration of a timeline containing a `repeat: -1` child as its
 * infinity sentinel, 1e10 seconds. `progress(1)` on that seeks to t = 1e10, which is not "the
 * end" of anything - it is an arbitrary phase of whatever is still looping there.
 *
 * That is not a hypothetical. EVERY end-credits design carries an ambient background drift
 * (`.credits-ambient`, `repeat: -1, yoyo`), so every one of them reported a duration of 1e10.
 * Eleven of the thirteen happened to look right anyway, because their travel is a finite tween
 * that had long since finished by t = 1e10. The two whose travel is ITSELF endless - the
 * `credits-loop` reel, cr06 and cr08 - landed at an arbitrary point in the loop, and both
 * settled to a COMPLETELY EMPTY frame: 0% of the viewport covered, on every Home card, every
 * library thumbnail and every operator preview. Measured 2026-08-26; seeking to the finite end
 * instead puts them at 51% and 69%, and leaves the other eleven byte-identical.
 *
 * So: a settled graphic is parked at the end of the motion that HAS an end. An endless track
 * is left wherever the finite motion put it, which for a reel is its natural first position -
 * a full screen of names, which is what the reel looks like on air. There is nothing better to
 * ask for, because "the end" of a thing that never ends is not a place.
 *
 * A ROLL still settles on its own designed rest pose (the logo and year centred), because a
 * roll's travel IS finite - it is the reel and the marquee that have no end. What a preview
 * must never do is show the empty frame a travelling graphic starts from; that is the same
 * fault seen from the other side, and it is why the wizard's preview settles a measured
 * graphic instead of playing it (components/wizard/WizardPreview.tsx).
 */

/** A settled timeline: the house entrance builder's return value. */
interface SettleTimeline {
  pause: () => void;
  /** Seconds on the timeline's own clock; the flag suppresses callbacks, as `progress` does. */
  time: (value: number, suppressEvents?: boolean) => void;
  /** Direct children, in the order added. `false` = do not descend into nested timelines. */
  getChildren?: (nested: boolean) => { startTime: () => number; totalDuration: () => number }[];
  progress: (value: number, suppressEvents?: boolean) => void;
}

/** The template globals this drives: the SPX contract plus the house entrance builder. */
export interface SettleWindow {
  update?: (json: string) => void;
  play?: () => void;
  buildInTimeline?: () => SettleTimeline;
}

/**
 * Settle `win` with `data` (a JSON string, the shape `update()` takes). Best-effort by design:
 * a template that throws still leaves its surface standing, because a preview is never worth
 * taking a page down for.
 *
 * SELF-CONTAINED ON PURPOSE, like `reportGraphicBox` below: this function is never called in
 * the module that defines it - every call site takes its `.toString()` and embeds the source in
 * a preview document's own script (composeDocument.ts). A reference to a module-level helper or
 * constant would compile here and throw `ReferenceError` there, so `finiteEnd` lives inside.
 */
export function settleGraphic(win: SettleWindow | null | undefined, data: string): void {
  if (!win) return;

  // The last moment at which anything with an END is still moving. GSAP reports a `repeat: -1`
  // child's total duration as its infinity sentinel (1e10 s) and a timeline inherits it, so
  // "the end" of a timeline holding one is not a place - see the note at the top of this file.
  const finiteEnd = (tl: SettleTimeline): number => {
    let end = 0;
    const children = tl.getChildren?.(false) ?? [];
    for (const child of children) {
      const total = child.totalDuration();
      if (Number.isFinite(total) && total < 1e9) end = Math.max(end, child.startTime() + total);
    }
    return end;
  };

  try {
    win.update?.(data);
    if (typeof win.buildInTimeline === 'function') {
      const tl = win.buildInTimeline();
      tl.pause();
      // `time`, not `progress`: an endless child makes `progress(1)` seek to 1e10 seconds,
      // which is a phase of the loop rather than the end of the entrance.
      if (typeof tl.getChildren === 'function' && typeof tl.time === 'function') {
        tl.time(finiteEnd(tl), true);
      } else {
        tl.progress(1, true);
      }
      win.update?.(data);
    } else {
      win.play?.();
    }
  } catch {
    /* best-effort: a broken template still gets its frame */
  }
}

/**
 * Report this document's graphic box back to `parent` (`{ type: 'spx-preview-box', x, y, w, h }`
 * — preview/previewProtocol.ts's `PREVIEW_BOX_TYPE`, spelled out as a literal here on purpose:
 * this function is never called directly — every call site takes its `.toString()` and embeds
 * the source in a document's own script (composeDocument.ts's settle and live-control
 * bootstraps), so a reference to an imported binding would compile here but throw
 * `ReferenceError` there, where no such import exists).
 * Shared by both bootstraps so the two scripts serialized into a preview document never drift on
 * the wire shape a caller (preview/frameGraphic.ts) reads.
 */
export function reportGraphicBox(win: Window): void {
  try {
    const root = win.document.body?.querySelector('div');
    const r = root?.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) {
      win.parent.postMessage({ type: 'spx-preview-box', x: r.left, y: r.top, w: r.width, h: r.height }, '*');
    }
  } catch {
    /* best-effort: a broken template still gets its frame */
  }
}

/**
 * Park a composed graphic at its SETTLED on-air state inside a preview iframe.
 *
 * A graphic is hidden until `play()` runs, so any surface that shows one WITHOUT a playback
 * gesture - a Home card's thumbnail, the operator panel's preview before the first take - must
 * drive it to rest itself, or it reads as an empty black frame. This is that one recipe, shared
 * so those surfaces can never drift into a second render path (the editor canvas settles the
 * same way in PlayoutSimulator).
 *
 * The recipe: write the data, jump the house entrance builder to its end, write the data AGAIN,
 * and jump again. The second `update()` is load-bearing - `progress(1, true)` suppresses GSAP
 * callbacks, so anything a callback writes (a counter's digits, a bar's fill) would otherwise be
 * left at its pre-entrance value while the layout around it sits at the end state.
 *
 * THE SECOND JUMP IS LOAD-BEARING TOO, and for the opposite reason: a design whose `update()`
 * RE-RENDERS its own rows throws the settled frame away with the elements it was written on. The
 * credits family is the worked example (templates/endCredits/shared.ts `rebuildCredits` assigns
 * `track.innerHTML`), and both of its failure modes were on the Browse grid on 2026-08-26:
 *
 *   - the one-pager design came back with EVERY page at its CSS opacity, so all six sections
 *     drew on top of each other - the "mess" the owner reported;
 *   - the roll, the crawl and the repeating reel kept the travel transform on the surviving
 *     track while its content was replaced, parking a full list off-screen: a blank card.
 *
 * Re-deriving the jump over whatever `update()` just built fixes both, and costs nothing on a
 * design that does not rebuild: the builder is measured from the same DOM and writes the same
 * end values onto the same elements.
 *
 * A template with no builder (blank, hand-written, foreign import) has no entrance to jump, so
 * it gets its own `play()` and is allowed to come to rest on its own clock.
 */

/** A settled timeline: the house entrance builder's return value. */
interface SettleTimeline {
  pause: () => void;
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
 */
export function settleGraphic(win: SettleWindow | null | undefined, data: string): void {
  if (!win) return;
  // Build the entrance and park it at its end. Declared here rather than inlined twice so the
  // two jumps can never drift into doing different things.
  const jump = () => {
    const tl = win.buildInTimeline?.();
    if (!tl) return;
    tl.pause();
    tl.progress(1, true);
  };
  try {
    win.update?.(data);
    if (typeof win.buildInTimeline === 'function') {
      jump();
      win.update?.(data);
      jump();
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

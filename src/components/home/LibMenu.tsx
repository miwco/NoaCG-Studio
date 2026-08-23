import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The breathing room kept against the viewport edge. The GAP between the button and its menu
 *  is not a constant here: it is MEASURED off the drawn menu (see below), so a surface with a
 *  different CSS offset cannot make the decision and the drawing disagree. */
const MARGIN = 8;

/**
 * THE BOX THE MENU MUST FIT INSIDE — the viewport, tightened by every ancestor that would clip
 * it. A `.lib-menu` is `position: absolute` inside its host, so a SCROLLING ancestor cuts it off
 * exactly as the fold does: the production dashboard's cue rundown (`.pd-cues`) is one, and the
 * last cue's menu was hidden by the list itself while it still cleared the bottom of the screen.
 * Measuring against the viewport alone answers a question nobody asked there.
 */
function clipBounds(host: HTMLElement): { top: number; bottom: number } {
  let top = MARGIN;
  let bottom = window.innerHeight - MARGIN;
  for (let el = host.parentElement; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    // `visible` on BOTH axes is the only value that does not clip — a single non-visible axis
    // computes the other to `auto`, so one test cannot stand for the pair.
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
    const rect = el.getBoundingClientRect();
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
  }
  return { top, bottom };
}

/**
 * THE ROW POPOVER SHELL — the one place that decides which WAY a `.lib-menu` opens.
 *
 * Every popover on Home hangs off a button inside a scrolling list, and two of them sit at the
 * BOTTOM of the viewport by construction: the bulk bar floats there on purpose
 * (`position: sticky; bottom`, styles.css), and the last row of a long library is there
 * because that is where the list ends. Opening downward from either put the menu off-screen —
 * bulk "+ Production" looked broken while it was in fact adding every graphic (owner walk
 * 2026-08-23: "the pop-up goes underneath my view field").
 *
 * So the direction is MEASURED, never assumed. The menu always renders downward first, this
 * measures what that actually costs against the box it has to fit in (`clipBounds` — the
 * viewport, and any scrolling ancestor that cuts it off sooner), and flips it above the button
 * when it does not fit below and does fit above. The measurement runs in a LAYOUT effect, before
 * paint, so a flipped menu is never briefly drawn in the wrong place.
 *
 * A menu too tall for either side stays below and scrolls inside itself (every `surface` below
 * caps its own height in styles.css) — the alternative, a menu taller than the screen placed
 * "where it fits best", is off-screen at one end whatever we choose.
 *
 * `surface` is the popover's own base class, so this shell is not tied to the library's look:
 * the production dashboard's links panel (`pd-links`) is the same measurement problem wearing a
 * different skin. A surface owes the shell two CSS rules — its own downward offset, and a
 * `<surface>--up` that swaps `top` for `bottom`.
 */
export default function LibMenu({
  open,
  onClose,
  testid,
  surface = 'lib-menu',
  role = 'menu',
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  testid?: string;
  /** The popover's base class; `<surface>--up` is the flipped placement it must also define. */
  surface?: string;
  /** What the popover IS. A list of verbs is a `menu`; a disclosure panel of links and forms is
   *  not one, and claiming the role there would promise arrow-key navigation nothing implements. */
  role?: string;
  /** Extra classes for the menu itself; the placement modifier is added on top. */
  className?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [up, setUp] = useState(false);

  useLayoutEffect(() => {
    // Reset on CLOSE, so the next open is always measured in its downward placement — reading
    // the rect of an already-flipped menu would answer a different question than the one asked.
    if (!open) {
      setUp(false);
      return;
    }
    const menu = menuRef.current;
    const host = menu?.parentElement;
    if (!menu || !host) return;
    const hostRect = host.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    // The gap is whatever THIS surface's CSS put between the button and the menu — read off the
    // drawn result rather than restated here, so the two can never drift apart.
    const gap = menuRect.top - hostRect.bottom;
    const bounds = clipBounds(host);
    const fitsBelow = menuRect.bottom <= bounds.bottom;
    const fitsAbove = hostRect.top - gap - menuRect.height >= bounds.top;
    setUp(!fitsBelow && fitsAbove);
  }, [open]);

  if (!open) return null;
  return (
    <>
      {/* The full-viewport backdrop closes on any outside press — including one on the sticky
          topbar, which is why it outranks that z-index (styles.css says so). */}
      <div className="lib-menu-backdrop" onClick={onClose} />
      <div
        ref={menuRef}
        className={`${surface}${up ? ` ${surface}--up` : ''}${className ? ` ${className}` : ''}`}
        role={role}
        data-placement={up ? 'up' : 'down'}
        data-testid={testid}
      >
        {children}
      </div>
    </>
  );
}

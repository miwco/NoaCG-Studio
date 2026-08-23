import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The gap between the button and its menu, and the breathing room kept against the viewport
 *  edge. Both are duplicated in styles.css's `.lib-menu` offsets — a menu whose measurement
 *  and whose placement disagree would flip on the wrong rows. */
const GAP = 4;
const MARGIN = 8;

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
 * measures what that actually costs against the viewport, and flips it above the button when
 * it does not fit below and does fit above. The measurement runs in a LAYOUT effect, before
 * paint, so a flipped menu is never briefly drawn in the wrong place.
 *
 * A menu too tall for either side stays below and scrolls inside itself (`.lib-menu` caps its
 * own height) — the alternative, a menu taller than the screen placed "where it fits best",
 * is off-screen at one end whatever we choose.
 */
export default function LibMenu({
  open,
  onClose,
  testid,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  testid?: string;
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
    const height = menu.offsetHeight;
    const fitsBelow = hostRect.bottom + GAP + height <= window.innerHeight - MARGIN;
    const fitsAbove = hostRect.top - GAP - height >= MARGIN;
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
        className={`lib-menu${up ? ' lib-menu--up' : ''}${className ? ` ${className}` : ''}`}
        role="menu"
        data-placement={up ? 'up' : 'down'}
        data-testid={testid}
      >
        {children}
      </div>
    </>
  );
}

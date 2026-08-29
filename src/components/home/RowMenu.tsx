import { useState, type ReactNode } from 'react';
import LibMenu from './LibMenu';
import { IconDots } from '../icons';

export interface RowMenuItem {
  /** The menu row's label — may change while armed (e.g. Delete → "Delete?"). */
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  testid?: string;
  destructive?: boolean;
  /** Keep the menu open after the click — the first press of a two-step delete arms it and
   *  the operator must see the armed row to confirm on. */
  keepOpen?: boolean;
}

/**
 * The row OVERFLOW menu (docs/GOALS_ARCHIVE.md "Student release" step 8): a library row keeps three
 * visible actions — Open, add to a production, and this — and everything rarer lives here.
 * Seven visible buttons per row was a control surface only its author could scan.
 *
 * A plain popover, not a portal: the row grid keeps `overflow: visible` and the menu is
 * positioned against the button. The shell (home/LibMenu) owns how it CLOSES — an outside press
 * listened for, never swallowed by a backdrop — and, since the 2026-08-23 owner walk, which WAY
 * it opens: the last row of a long library is at the bottom of the viewport, where a downward
 * menu has nowhere to go.
 */
export default function RowMenu({ items, label = 'More actions' }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lib-menu-host">
      <button
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        data-testid="row-menu"
      >
        <IconDots />
      </button>
      <LibMenu open={open} onClose={() => setOpen(false)}>
        {items.map((item) => (
          <button
            key={item.label + (item.testid ?? '')}
            role="menuitem"
            className={item.destructive ? 'lib-menu-destructive' : undefined}
            onClick={() => {
              item.onClick();
              if (!item.keepOpen) setOpen(false);
            }}
            data-testid={item.testid}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </LibMenu>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadShows, productionsContaining } from '../../model/shows';
import LibMenu from './LibMenu';
import { IconPlus, IconTv } from '../icons';

/** How long the button wears its ✓ after a successful add. Long enough to read on the way to
 *  the next row, short enough that it is gone before anyone wonders what it means. */
const CONFIRM_MS = 2000;

/**
 * THE "+ PRODUCTION" DOOR — one picker, every surface that has something to pool.
 *
 * A library row, a whole FOLDER, a bulk selection and the open graphic's control panel all ask
 * the same question ("which production airs this?") and used to answer it with four
 * near-identical popovers. The behaviour that matters is the same in all four, so it lives
 * here once:
 *
 * - **It CLOSES on a successful pick.** It used to show a ✓ for two seconds and stay open, so
 *   the surface underneath was hidden behind a menu that had already done its job (owner walk
 *   2026-08-23). The confirmation moves to the BUTTON, which is still on screen afterwards.
 *   Adding to a second production is a real thing to want and costs one more click — the
 *   picker is one press away and remembers nothing that a re-open would lose.
 * - **A FAILED add keeps it open.** `onAdd` answers whether the graphic actually reached the
 *   production (the durable store confirms a write after the call returns — see
 *   model/durableStore.ts); on a full quota, closing the menu and flashing ✓ would report a
 *   save that never happened.
 * - **Direction is measured** — see LibMenu. This picker's most important caller is the bulk
 *   bar, which floats at the bottom of the viewport.
 */
export default function ProductionPicker({
  open,
  onOpenChange,
  markGraphicId,
  buttonLabel,
  buttonTitle,
  buttonTestid,
  buttonClassName,
  menuTestid,
  newNameTestid,
  newSubmitTestid,
  newSubmitLabel = 'Create',
  emptyHint = 'No productions yet — name one below.',
  onAdd,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Marks the productions this ONE graphic already sits in. Absent for a folder or a bulk
   *  selection, where "already in it" has no single answer to report. */
  markGraphicId?: string;
  buttonLabel?: ReactNode;
  buttonTitle: string;
  buttonTestid: string;
  buttonClassName?: string;
  menuTestid: string;
  newNameTestid: string;
  newSubmitTestid: string;
  newSubmitLabel?: string;
  emptyHint?: string;
  /** Pool into an EXISTING production. Resolves to whether it actually landed. */
  onAdd: (showId: string, showName: string) => Promise<boolean>;
  /** Mint a production and pool into it. Answers the same question `onAdd` does — the callers
   *  that navigate away on success do it from here. */
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [newName, setNewName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  // Read the productions only while the menu is open: this component renders once per library
  // row, and a closed picker must cost nothing to have on screen.
  const productions = open ? loadShows() : [];
  const containing = open && markGraphicId
    ? new Set(productionsContaining(markGraphicId).map((s) => s.id))
    : new Set<string>();

  const pick = async (showId: string, showName: string) => {
    const landed = await onAdd(showId, showName);
    if (!landed) return; // the surface has already raised the failure; leave the menu standing
    onOpenChange(false);
    setConfirming(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirming(false), CONFIRM_MS);
  };

  /** The flash only makes sense while the menu it answers is gone. */
  const confirmVisible = confirming && !open;

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    // Same rule as `pick`: a refused write leaves the menu standing WITH the typed name, so
    // the way to retry is not to type it again. The success path usually navigates away.
    if (!(await onCreate(name))) return;
    setNewName('');
    onOpenChange(false);
  };

  return (
    <div className="lib-menu-host">
      <button
        className={`lib-picker-btn${confirmVisible ? ' is-confirming' : ''}${buttonClassName ? ` ${buttonClassName}` : ''}`}
        onClick={() => onOpenChange(!open)}
        title={buttonTitle}
        aria-expanded={open}
        data-testid={buttonTestid}
      >
        {/* The label STAYS in the flow and the ✓ overlays it, so the button keeps its resting
            width: a button that narrows for two seconds drags every control beside it
            sideways, on a row the pointer is still over. The confirmation carries its own
            font-size because a narrow surface renders this button icon-only through
            `font-size: 0` (a card, a phone row), and an inherited zero made a successful pick
            look like nothing had happened at all. */}
        <span className="lib-picker-label">{buttonLabel ?? (<><IconPlus /> Production</>)}</span>
        {confirmVisible && (
          <span className="lib-picker-confirm" data-testid="production-added">
            <span className="lib-added-mark" aria-hidden="true">✓</span>
            <span className="lib-added-word">Added</span>
          </span>
        )}
      </button>
      <LibMenu open={open} onClose={() => onOpenChange(false)} testid={menuTestid}>
        {productions.length === 0 && <p className="hint">{emptyHint}</p>}
        {productions.map((s) => (
          <button
            key={s.id}
            role="menuitem"
            onClick={() => void pick(s.id, s.name)}
            title={containing.has(s.id) ? 'Already in this production — adds/updates its copy' : `Add to "${s.name}"`}
          >
            <IconTv />
            {s.name}
            {containing.has(s.id) ? <span className="muted"> · in it</span> : null}
          </button>
        ))}
        <div className="lib-menu-new">
          <input
            value={newName}
            placeholder="New production…"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create(); }}
            data-testid={newNameTestid}
          />
          <button disabled={!newName.trim()} onClick={() => void create()} data-testid={newSubmitTestid}>
            {newSubmitLabel}
          </button>
        </div>
      </LibMenu>
    </div>
  );
}

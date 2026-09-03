import { useEffect, useRef, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import {
  saveCurrentGraphic,
  saveGraphicAs,
  useSaveUi,
} from '../../store/saveActions';
import { useModalGate } from '../spaceKey';

/**
 * The two save-flow dialogs (docs/SAVED_CONTENT_MODEL.md §2), mounted ONCE in App.tsx - OUTSIDE
 * the wizard, so the guard paints over it. The wizard's full-screen shell is a stacking context,
 * so a guard rendered inside it could not rise above the app's corner notices whatever z-index it
 * carried; out here it wins on the layer scale (src/styles/base.css). Per-shell mounts left the
 * shells without one (the control page, the production dashboard, the video shell) with a guard
 * that could be requested but never rendered.
 *
 * - SAVE DIALOG (first save / Save As): name the graphic. Every save is standalone in the
 *   flat library (packages retired - docs/GOALS_ARCHIVE.md "Student release" step 3); grouping for
 *   air happens in a PRODUCTION's own pool.
 * - UNSAVED-CHANGES GUARD: shown before an action that REPLACES the working document
 *   (opening another graphic, creating a new project, the wizard's mid-walk start-over).
 *   Save first, discard, or cancel.
 */
export default function SaveDialogs() {
  const saveDialog = useSaveUi((s) => s.saveDialog);
  const confirmSwitch = useSaveUi((s) => s.confirmSwitch);
  useModalGate(!!saveDialog || !!confirmSwitch);
  return (
    <>
      {saveDialog && <SaveDialog />}
      {confirmSwitch && <ConfirmSwitchDialog />}
    </>
  );
}

function SaveDialog() {
  const dialog = useSaveUi((s) => s.saveDialog)!;
  const close = useSaveUi((s) => s.closeSaveDialog);
  const template = useTemplateStore((s) => s.template);

  const [name, setName] = useState(dialog.mode === 'save-as' ? `${template.name} copy` : template.name);
  const [error, setError] = useState<string | null>(null);
  // Backdrop click-to-close must only fire on a genuine outside click — not when a text
  // selection drag STARTED in the name field and released over the backdrop (which routes the
  // release's `click` to the backdrop, the nearest common ancestor, discarding the typed name).
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const confirm = () => {
    void saveGraphicAs(name.trim() || template.name, { kind: 'standalone' }).then((res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      dialog.then?.();
    });
  };

  return (
    <div
      className="gallery-backdrop"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) close();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="wz-modal save-dialog" role="dialog" aria-modal="true" aria-label="Save graphic" data-testid="save-dialog">
        <div className="wz-header">
          <h2>{dialog.mode === 'save-as' ? 'Save a copy' : 'Save graphic'}</h2>
          <button className="gallery-close" onClick={close} title="Cancel">✕</button>
        </div>
        <div className="save-dialog-body">
          <label className="save-field">
            <span>Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
              placeholder="e.g. Presenter lower third"
              data-testid="save-name"
            />
          </label>
          <p className="hint">
            Saved graphics live in your library on Home. To run several together on air, add
            them to a <strong>production</strong> — its page holds the rundown and the links.
          </p>
          {error && <p className="status-bad">{error}</p>}
          <div className="dlg-foot dlg-foot--inline">
            <button onClick={close}>Cancel</button>
            <div className="spacer" />
            <button className="primary" onClick={confirm} data-testid="save-confirm">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmSwitchDialog() {
  const confirm = useSaveUi((s) => s.confirmSwitch)!;
  const closeConfirm = useSaveUi((s) => s.closeConfirm);
  const settleConfirm = useSaveUi((s) => s.settleConfirm);
  const openSaveDialog = useSaveUi((s) => s.openSaveDialog);
  const graphicId = useTemplateStore((s) => s.saved.graphicId);
  const name = useTemplateStore((s) => s.template.name);
  // Same guard as the save dialog: a press that began inside the dialog and released on the
  // backdrop must not be read as an outside click (see SaveDialog).
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeConfirm]);

  const saveThen = () => {
    const proceed = confirm.proceed;
    if (graphicId) {
      void saveCurrentGraphic().then((r) => {
        if (r !== 'saved') return;
        settleConfirm();
        proceed();
      });
    } else {
      // Never saved: settle the guard and hand the continuation to the save dialog.
      settleConfirm();
      openSaveDialog('first', proceed);
    }
  };

  const discard = () => {
    const proceed = confirm.proceed;
    settleConfirm();
    // Discarding means the replacement may proceed; the library copy (if any) is untouched.
    useTemplateStore.setState((s) => ({ saved: { ...s.saved, dirty: false } }));
    proceed();
  };

  return (
    <div
      className="gallery-backdrop"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) closeConfirm();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="wz-modal save-dialog" role="dialog" aria-modal="true" aria-label="Unsaved changes" data-testid="confirm-switch">
        <div className="wz-header">
          <h2>Unsaved changes</h2>
          <button className="gallery-close" onClick={closeConfirm} title="Cancel">✕</button>
        </div>
        <div className="save-dialog-body">
          <p>
            “{name}” has unsaved changes. Save them before continuing?
          </p>
          <div className="dlg-foot dlg-foot--inline">
            <button onClick={closeConfirm} data-testid="switch-cancel">Cancel</button>
            <div className="spacer" />
            <button onClick={discard} data-testid="switch-discard">Discard changes</button>
            <button className="primary" onClick={saveThen} data-testid="switch-save">
              {graphicId ? 'Save & continue' : 'Save first…'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import {
  saveCurrentGraphic,
  saveGraphicAs,
  useSaveUi,
  type SaveDestination,
} from '../../store/saveActions';
import { loadPackets } from '../../model/packets';
import { useModalGate } from '../spaceKey';

/**
 * The two save-flow dialogs (docs/SAVED_CONTENT_MODEL.md §2), mounted once in each shell:
 *
 * - SAVE DIALOG (first save / Save As): name the graphic and choose where it lives —
 *   standalone, an existing package, or a new package created right here. Packages are
 *   managed through Save and Home; there is no separate package manager.
 * - UNSAVED-CHANGES GUARD: shown before an action that REPLACES the working document
 *   (opening another graphic, creating a new project). Save first, discard, or cancel.
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
  const packages = useMemo(() => loadPackets(), []);

  const [name, setName] = useState(dialog.mode === 'save-as' ? `${template.name} copy` : template.name);
  const [dest, setDest] = useState<string>('standalone'); // 'standalone' | 'new' | a package id
  const [newPackage, setNewPackage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const confirm = () => {
    const destination: SaveDestination =
      dest === 'standalone' ? { kind: 'standalone' }
      : dest === 'new' ? { kind: 'new-package', name: newPackage }
      : { kind: 'package', id: dest };
    const res = saveGraphicAs(name.trim() || template.name, destination);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    close();
    dialog.then?.();
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
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
          <div className="save-field">
            <span>Where it lives</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)} data-testid="save-dest">
              <option value="standalone">Standalone graphic (no package)</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>📦 {p.name}</option>
              ))}
              <option value="new">＋ New package…</option>
            </select>
            {dest === 'new' && (
              <input
                placeholder="Package name, e.g. Election Night"
                value={newPackage}
                onChange={(e) => setNewPackage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
                data-testid="save-new-package"
              />
            )}
            <p className="hint">
              A package is a show or collection — its graphics stay together in Home and can
              be exported as one set.
            </p>
          </div>
          {error && <p className="status-bad">{error}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={close}>Cancel</button>
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
      if (saveCurrentGraphic() === 'saved') {
        settleConfirm();
        proceed();
      }
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
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
      <div className="wz-modal save-dialog" role="dialog" aria-modal="true" aria-label="Unsaved changes" data-testid="confirm-switch">
        <div className="wz-header">
          <h2>Unsaved changes</h2>
          <button className="gallery-close" onClick={closeConfirm} title="Cancel">✕</button>
        </div>
        <div className="save-dialog-body">
          <p>
            “{name}” has unsaved changes. Save them before continuing?
          </p>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeConfirm} data-testid="switch-cancel">Cancel</button>
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

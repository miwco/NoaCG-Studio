import { useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { useRouter } from '../../app/router';
import { graphicById, newEntry, updateGraphic, type ControlEntry, type GraphicDoc } from '../../model/library';
import { fieldDescriptors, eventButtons } from '../../control/controlModel';
import { renderControlPanelHtml } from '../../control/controlPanelHtml';
import { composeDocument } from '../../preview/composeDocument';
import { openGraphicById, useSaveUi } from '../../store/saveActions';
import { setFieldDefault } from '../../blocks/edit';
import { FieldRow } from '../fields/FieldControl';
import BrandLogo from '../BrandLogo';
import { slug } from '../../export/common';

/** The preview iframe's template globals (the SPX contract + the machine runtime). Window's
 *  own `stop()` collides with the SPX global of the same name, so this is a standalone shape
 *  rather than a Window extension. */
interface GraphicWindow {
  update?: (json: string) => void;
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  noacgDispatch?: (event: string, payload?: Record<string, string>) => void;
}

/**
 * The per-graphic CONTROL PANEL (route `#/control/<graphicId>`, docs/SAVED_CONTENT_MODEL.md §4):
 * the saved graphic's fields, its named ENTRIES (create / duplicate / edit / delete / select),
 * the state machine's event buttons, and a live preview to rehearse against. The active
 * entry's values feed Play here, the editor preview on open, and the downloadable standalone
 * controlpanel.html (entries baked in). Operating needs no account — this is local-first.
 */
export default function GraphicControlPage({ id }: { id: string }) {
  const navigate = useRouter((s) => s.navigate);
  const requestSwitch = useSaveUi((s) => s.requestSwitch);
  const [doc, setDoc] = useState<GraphicDoc | null>(() => graphicById(id));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [note, setNote] = useState<string | null>(null);

  // Re-read when the route id changes (Back/Forward between two panels).
  useEffect(() => setDoc(graphicById(id)), [id]);

  const descriptors = useMemo(
    () => (doc ? fieldDescriptors(doc.template.fields, { includeHidden: false }) : []),
    [doc],
  );
  const buttons = useMemo(() => (doc ? eventButtons(doc.template.js) : []), [doc]);
  const srcdoc = useMemo(() => (doc ? composeDocument(doc.template) : ''), [doc]);

  if (!doc) {
    return (
      <div className="app home-page">
        <header className="topbar">
          <button className="brand brand-home" onClick={() => navigate({ view: 'home', section: null })} title="Home">
            <BrandLogo size={24} />
          </button>
          <span className="tpl-name">Control panel</span>
        </header>
        <div className="home-body">
          <main className="home-content">
            <h2>Graphic not found</h2>
            <p className="hint">It may have been deleted, or it lives in another browser profile.</p>
            <button className="primary" onClick={() => navigate({ view: 'home', section: null })}>← Home</button>
          </main>
        </div>
      </div>
    );
  }

  const active = doc.entries.find((e) => e.id === doc.activeEntryId) ?? null;

  /** Persist a library patch and mirror it into local state (the model layer is the store).
   *  The patch is computed from the LIBRARY's current record, not the render's `doc` — two
   *  mutations in one tick (double-click, batched handlers) must compose, not overwrite. */
  const patch = (make: (cur: GraphicDoc) => Parameters<typeof updateGraphic>[1]) => {
    const cur = graphicById(doc.id);
    if (!cur) return;
    const { doc: next, error } = updateGraphic(cur.id, make(cur));
    if (next) setDoc(next);
    if (error) setNote(error);
  };

  const win = () => iframeRef.current?.contentWindow as unknown as GraphicWindow | null;

  const sendUpdate = (values: Record<string, string>) => {
    // The graphic's own defaults underlie the entry, exactly as update() merges live.
    const merged: Record<string, string> = {};
    for (const d of descriptors) merged[d.key] = String(values[d.key] ?? d.defaultValue ?? '');
    win()?.update?.(JSON.stringify(merged));
  };

  const playEntry = (entry: ControlEntry | null) => {
    sendUpdate(entry?.values ?? {});
    win()?.play?.();
  };

  const addEntry = () => {
    const values: Record<string, string> = {};
    for (const d of descriptors) values[d.key] = String(d.defaultValue ?? '');
    const entry = newEntry('', values);
    patch((cur) => ({
      entries: [...cur.entries, { ...entry, label: `Entry ${cur.entries.length + 1}` }],
      activeEntryId: entry.id,
    }));
  };

  const duplicateEntry = (entry: ControlEntry) => {
    const copy = newEntry(`${entry.label} copy`, entry.values);
    patch((cur) => {
      const i = cur.entries.findIndex((e) => e.id === entry.id);
      const entries = [...cur.entries];
      entries.splice(i + 1, 0, copy);
      return { entries, activeEntryId: copy.id };
    });
  };

  const deleteEntry = (entry: ControlEntry) => {
    patch((cur) => ({
      entries: cur.entries.filter((e) => e.id !== entry.id),
      activeEntryId: cur.activeEntryId === entry.id ? null : cur.activeEntryId,
    }));
  };

  const setEntryValue = (entry: ControlEntry, key: string, value: string) => {
    // The first field doubles as the label until the operator renames it explicitly.
    const firstKey = descriptors[0]?.key;
    const autoLabel = entry.label.startsWith('Entry ') && firstKey && key === firstKey;
    patch((cur) => ({
      entries: cur.entries.map((e) =>
        e.id === entry.id
          ? { ...e, values: { ...e.values, [key]: value }, label: autoLabel ? value || e.label : e.label, updatedAt: new Date().toISOString() }
          : e,
      ),
    }));
  };

  const renameEntry = (entry: ControlEntry, label: string) => {
    patch((cur) => ({ entries: cur.entries.map((e) => (e.id === entry.id ? { ...e, label } : e)) }));
  };

  /** Write the active entry's values into the template's field DEFAULTS, so every export
   *  (SPX, CasparCG, overlay…) carries this data out of the box. */
  const makeDefaultData = (entry: ControlEntry) => {
    patch((cur) => {
      let template = cur.template;
      for (const d of descriptors) {
        const v = entry.values[d.key];
        if (v !== undefined) template = setFieldDefault(template, d.key, v);
      }
      return { template };
    });
    setNote(`✓ "${entry.label}" is now the graphic's default data — exports start with it.`);
  };

  const downloadPanel = () => {
    const html = renderControlPanelHtml(doc.template, null, { entries: doc.entries });
    saveAs(new Blob([html], { type: 'text/html' }), `${slug(doc.name)}_controlpanel.html`);
    setNote('✓ Control panel downloaded — open it beside the exported graphic; entries included.');
  };

  return (
    <div className="app home-page control-page" data-testid="graphic-control-page">
      <header className="topbar">
        <button className="brand brand-home" onClick={() => navigate({ view: 'home', section: null })} title="Home">
          <BrandLogo size={24} />
        </button>
        <span className="divider-dot" aria-hidden="true">·</span>
        <span className="tpl-name">🎛 {doc.name}</span>
        <span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>control panel</span>
        <div className="spacer" />
        <button
          onClick={() =>
            requestSwitch(
              () => {
                openGraphicById(doc.id);
                navigate({ view: 'graphic', id: doc.id });
              },
            )
          }
          title="Open this graphic in the editor"
          data-testid="control-open-editor"
        >
          ✎ Edit graphic
        </button>
        <button onClick={downloadPanel} title="A standalone operator page for the exported graphic (entries included)">
          ⬇ controlpanel.html
        </button>
      </header>

      <div className="control-page-body">
        <section className="control-page-preview">
          <iframe ref={iframeRef} title="Graphic preview" srcDoc={srcdoc} sandbox="allow-scripts allow-same-origin" />
          <div className="control-page-transport">
            <button className="primary" onClick={() => playEntry(active)} data-testid="control-play">
              ▶ Play{active ? ` “${active.label}”` : ''}
            </button>
            <button onClick={() => sendUpdate(active?.values ?? {})} title="Update fields without replaying" data-testid="control-update">
              ⟳ Update
            </button>
            <button onClick={() => win()?.next?.()} title="Advance (next)">»</button>
            <button onClick={() => win()?.stop?.()} title="Take out" data-testid="control-stop">■ Stop</button>
            {buttons.length > 0 && <span className="control-events-sep" aria-hidden="true" />}
            {buttons.map((b) => (
              <button
                key={b.event}
                onClick={() => {
                  const payload: Record<string, string> = {};
                  for (const key of b.payload ?? []) payload[key] = String(active?.values[key] ?? '');
                  win()?.noacgDispatch?.(b.event, payload);
                }}
                title={`Fire "${b.event}"`}
              >
                ⚡ {b.label}
              </button>
            ))}
          </div>
        </section>

        <aside className="control-page-side">
          <div className="row" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Entries</h3>
            <div className="spacer" />
            <button className="primary" onClick={addEntry} data-testid="add-entry">＋ Add entry</button>
          </div>
          <p className="hint">
            Saved data rows for this graphic — “Anna Andersson · Presenter”, “Michael Smith ·
            Guest”. Select one, play it, switch, play again.
          </p>

          {doc.entries.length === 0 && (
            <p className="hint" data-testid="no-entries">No entries yet — add one to start building your rundown data.</p>
          )}

          <div className="control-entries">
            {doc.entries.map((entry) => (
              <div
                key={entry.id}
                className={`control-entry ${entry.id === doc.activeEntryId ? 'active' : ''}`}
                data-testid={`entry-${entry.id}`}
              >
                <button
                  className="control-entry-label"
                  onClick={() => patch(() => ({ activeEntryId: entry.id }))}
                  title="Make this the active entry"
                  data-testid="select-entry"
                >
                  {entry.id === doc.activeEntryId ? '●' : '○'} {entry.label}
                </button>
                <button onClick={() => playEntry(entry)} title="Play the graphic with this entry" data-testid="play-entry">▶</button>
                <button onClick={() => duplicateEntry(entry)} title="Duplicate">⧉</button>
                <button onClick={() => deleteEntry(entry)} title="Delete" data-testid="delete-entry">✕</button>
              </div>
            ))}
          </div>

          {active && (
            <div className="panel-section" data-testid="entry-editor">
              <label className="save-field">
                <span>Entry label</span>
                <input
                  value={active.label}
                  onChange={(e) => renameEntry(active, e.target.value)}
                  data-testid="entry-label"
                />
              </label>
              {descriptors.map((d) => (
                <FieldRow
                  key={d.key}
                  descriptor={d}
                  value={String(active.values[d.key] ?? d.defaultValue ?? '')}
                  onChange={(v) => setEntryValue(active, d.key, String(v))}
                  testIdPrefix="entry-field"
                />
              ))}
              <div className="row" style={{ marginTop: 8 }}>
                <button onClick={() => makeDefaultData(active)} title="Exports will start with this entry's data">
                  ★ Make default data
                </button>
              </div>
            </div>
          )}

          {note && <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'}>{note}</p>}
        </aside>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { controlsForFields, type ControlDescriptor } from '../control/controlModel';
import { renderControlPanelHtml } from '../control/controlPanelHtml';
import { hasLiveData, liveDataBlock, stripLiveData } from '../control/liveData';
import { slug } from '../export/common';
import { fileToDataUrl, isImageAsset, uniqueAssetPath } from '../assets/assetUtils';
import { useTemplateStore, type PlayoutAction } from '../store/templateStore';

/** One operator control, generated from the field's type. Updates live-drive the preview. */
function Control({ c, live }: { c: ControlDescriptor; live: boolean }) {
  const value = useTemplateStore((s) => s.sampleData[c.field] ?? '');
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const assets = useTemplateStore((s) => s.template.assets);
  const addAsset = useTemplateStore((s) => s.addAsset);
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState('1');

  const set = (v: string) => {
    setSampleValue(c.field, v);
    if (live) sendControl('update'); // Google-Docs feel: every edit shows on the preview
  };

  if (c.kind === 'number') {
    const bump = (dir: number) => {
      const s = parseFloat(step) || 1;
      set(String((parseFloat(value) || 0) + dir * s));
    };
    return (
      <div className="row">
        <button className="ctl-step" onClick={() => bump(-1)}>−</button>
        <input className="ctl-num" type="number" value={value} onChange={(e) => set(e.target.value)} />
        <button className="ctl-step" onClick={() => bump(1)}>+</button>
        <input className="ctl-num" style={{ width: 56 }} type="number" value={step} title="step" onChange={(e) => setStep(e.target.value)} />
      </div>
    );
  }
  if (c.kind === 'lines') {
    const lines = value.length ? value.split('\n') : [''];
    const commit = (next: string[]) => set(next.join('\n'));
    return (
      <div className="ctl-lines">
        {lines.map((ln, i) => (
          <div className="row" key={i}>
            <input value={ln} onChange={(e) => commit(lines.map((l, k) => (k === i ? e.target.value : l)))} />
            <button onClick={() => commit(lines.filter((_, k) => k !== i).length ? lines.filter((_, k) => k !== i) : [''])} title="Remove line">✕</button>
          </div>
        ))}
        <button onClick={() => commit([...lines, ''])}>+ Add line</button>
      </div>
    );
  }
  if (c.kind === 'select') {
    return (
      <select value={value} onChange={(e) => set(e.target.value)}>
        {(c.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </select>
    );
  }
  if (c.kind === 'toggle') {
    return (
      <label className="row" style={{ marginTop: 4 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={value === '1' || value === 'true'} onChange={(e) => set(e.target.checked ? '1' : '0')} />
        <span className="muted">enabled</span>
      </label>
    );
  }
  if (c.kind === 'color') {
    return (
      <div className="row">
        <input type="color" style={{ width: 44, padding: 2 }} value={/^#/.test(value) ? value : '#000000'} onChange={(e) => set(e.target.value)} />
        <input className="grow" value={value} onChange={(e) => set(e.target.value)} />
      </div>
    );
  }
  if (c.kind === 'image') {
    const images = assets.filter((a) => isImageAsset(a.path));
    const upload = async (file: File) => {
      const path = uniqueAssetPath(file.name, assets);
      addAsset({ path, data: await fileToDataUrl(file) });
      set(path);
    };
    return (
      <div className="row">
        <select className="grow" value={images.some((a) => a.path === value) ? value : ''} onChange={(e) => set(e.target.value)}>
          <option value="">(no image)</option>
          {images.map((a) => (
            <option key={a.path} value={a.path}>{a.path}</option>
          ))}
        </select>
        <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) void upload(e.target.files[0]); e.target.value = ''; }} />
        <button onClick={() => fileInput.current?.click()}>⬆</button>
      </div>
    );
  }
  return <input value={value} onChange={(e) => set(e.target.value)} />;
}

/**
 * The Control panel — an operator view generated from the template's fields (the same
 * modular engine that produces the standalone controlpanel.html export). Every edit
 * live-drives the preview; the action buttons play/stop/update/next it. There is no
 * per-template code: number → stepper, textarea → line editor, image → picker, etc.
 */
export default function ControlPanel() {
  const template = useTemplateStore((s) => s.template);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const [live, setLive] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [pollSecs, setPollSecs] = useState('5');

  const controls = controlsForFields(template.fields);
  const liveDataOn = hasLiveData(template.js);

  const drive = (action: PlayoutAction) => sendControl(action);

  const downloadPanel = () => {
    const html = renderControlPanelHtml(template);
    saveAs(new Blob([html], { type: 'text/html' }), `${slug(template.name)}_controlpanel.html`);
  };

  // Add / replace the live-data polling block in the template's own JS (undoable, and
  // highlighted in the editor). It maps sheet columns to fields and calls update().
  const addLiveData = () => {
    const block = liveDataBlock({ csvUrl: sheetUrl.trim(), pollSeconds: Number(pollSecs) || 5, fields: template.fields });
    const js = stripLiveData(template.js).trimEnd() + '\n\n' + block;
    applyTemplate({ ...template, js });
    setActiveTab('js');
  };
  const removeLiveData = () => {
    applyTemplate({ ...template, js: stripLiveData(template.js) });
    setActiveTab('js');
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Control panel <span className="muted">— operator view</span></h3>
        <p className="hint">
          Auto-built from this graphic's fields. Edits drive the preview live; the buttons play
          it out. <strong>Download</strong> a standalone copy to run the graphic as a browser
          source and operate it from another tab.
        </p>
      </div>

      <label className="row" style={{ gap: 8, marginBottom: 8 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={live} onChange={(e) => setLive(e.target.checked)} />
        <span>Live — send every edit to the preview</span>
      </label>

      {controls.length === 0 && <p className="muted">This template has no editable fields.</p>}
      {controls.map((c) => (
        <div className="field-row" key={c.field}>
          <div className="field-meta">
            <label style={{ margin: 0 }}>{c.title}</label>
            <span className="field-id">{c.field}</span>
          </div>
          <Control c={c} live={live} />
        </div>
      ))}

      <div className="ctl-actions">
        <button className="primary" onClick={() => drive('play')}>▶ Play</button>
        <button onClick={() => drive('stop')}>■ Stop</button>
        <button onClick={() => drive('update')}>⟳ Update</button>
        <button onClick={() => drive('next')}>» Next</button>
      </div>

      <div className="divider" />
      <button onClick={downloadPanel} title="A self-contained operator page that drives the exported graphic">
        ⬇ Download control panel (.html)
      </button>

      <div className="divider" />
      <div className="panel-section">
        <h3>Live data <span className="muted">— Google Sheet</span></h3>
        <p className="hint">
          Drive the graphic from a spreadsheet. In Sheets: <em>File → Share → Publish to web →
          CSV</em>, paste the link, and the graphic follows every edit. The polling code is added
          to the JS for you to read and tweak (column → field mapping and all).
        </p>
        <input
          placeholder="https://docs.google.com/…/pub?output=csv"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
        <div className="row" style={{ marginTop: 6 }}>
          <label className="muted" style={{ fontSize: 12 }}>every</label>
          <input type="number" style={{ width: 64 }} value={pollSecs} onChange={(e) => setPollSecs(e.target.value)} />
          <label className="muted" style={{ fontSize: 12 }}>seconds</label>
          <div className="spacer" style={{ flex: 1 }} />
          {liveDataOn && <button onClick={removeLiveData} title="Remove the live-data block">Remove</button>}
          <button className="primary" disabled={!sheetUrl.trim()} onClick={addLiveData}>
            {liveDataOn ? 'Update block' : 'Add live data'}
          </button>
        </div>
        {liveDataOn && <p className="status-ok" style={{ marginTop: 6 }}>✓ Live-data block is in the JS (see the marked region).</p>}
      </div>
    </div>
  );
}

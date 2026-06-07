import { useState } from 'react';
import { saveAs } from 'file-saver';
import { EXPORT_TARGETS } from '../export/registry';
import { slug } from '../export/common';
import { useTemplateStore } from '../store/templateStore';
import { validateTemplate } from '../validation/validateTemplate';

/** Choose an export mode, gate on validation, and download a plug-and-play SPX zip. */
export default function ExportPanel() {
  const template = useTemplateStore((s) => s.template);
  const previewError = useTemplateStore((s) => s.previewError);
  const setValidation = useTemplateStore((s) => s.setValidation);
  const setActivePanel = useTemplateStore((s) => s.setActivePanel);

  const [targetId, setTargetId] = useState(EXPORT_TARGETS[0].id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const target = EXPORT_TARGETS.find((t) => t.id === targetId)!;

  const exportZip = async () => {
    setMessage(null);
    const result = validateTemplate(template, { runtimeError: previewError });
    setValidation(result);
    if (!result.ok) {
      setMessage(`Cannot export: ${result.errors.length} validation error(s). See the Validate tab.`);
      setActivePanel('validate');
      return;
    }
    setBusy(true);
    try {
      const zip = await target.build(template);
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${slug(template.name)}_${target.id}.zip`);
      setMessage('✓ Exported. Drop the unzipped folder into your SPX templates.');
    } catch (err) {
      setMessage('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Export SPX package</h3>
        <p className="hint">
          The package is plug-and-play: relative paths, bundled GSAP, no external dependencies.
        </p>
      </div>

      <div className="stack">
        {EXPORT_TARGETS.map((t) => (
          <label
            key={t.id}
            className="issue"
            style={{ display: 'block', cursor: 'pointer', borderColor: targetId === t.id ? 'var(--accent)' : undefined }}
          >
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <input
                type="radio"
                name="export-target"
                style={{ width: 'auto', marginTop: 3 }}
                checked={targetId === t.id}
                onChange={() => setTargetId(t.id)}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="hint">{t.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>

      <button className="primary" style={{ marginTop: 12, width: '100%' }} disabled={busy} onClick={exportZip}>
        {busy ? 'Building…' : `Validate & download (${target.label})`}
      </button>

      {message && (
        <p className={message.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 10 }}>
          {message}
        </p>
      )}
    </div>
  );
}

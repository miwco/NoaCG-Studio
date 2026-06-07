import { DATA_FTYPES, type SpxField } from '../model/types';
import { useTemplateStore } from '../store/templateStore';

/** Render the appropriate input control for a field's ftype. */
function FieldControl({ field }: { field: SpxField }) {
  const value = useTemplateStore((s) => s.sampleData[field.field] ?? '');
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const set = (v: string) => setSampleValue(field.field, v);

  switch (field.ftype) {
    case 'textarea':
      return <textarea rows={3} value={value} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <input type="number" value={value} onChange={(e) => set(e.target.value)} />;
    case 'color':
      return (
        <div className="row">
          <input type="color" style={{ width: 44, padding: 2 }} value={value || '#000000'} onChange={(e) => set(e.target.value)} />
          <input className="grow" value={value} onChange={(e) => set(e.target.value)} />
        </div>
      );
    case 'checkbox':
      return (
        <label className="row" style={{ marginTop: 4 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={value === '1' || value === 'true'}
            onChange={(e) => set(e.target.checked ? '1' : '0')}
          />
          <span className="muted">enabled</span>
        </label>
      );
    case 'dropdown':
      return (
        <select value={value} onChange={(e) => set(e.target.value)}>
          {(field.items ?? []).map((it) => (
            <option key={it.value} value={it.value}>
              {it.text}
            </option>
          ))}
        </select>
      );
    default:
      return <input value={value} onChange={(e) => set(e.target.value)} />;
  }
}

/**
 * Edit the sample/test data fed to update(). Fields are parsed from the template's
 * SPXGCTemplateDefinition; each renders the control matching its ftype.
 */
export default function SampleDataPanel() {
  const fields = useTemplateStore((s) => s.template.fields);
  const resetSampleData = useTemplateStore((s) => s.resetSampleData);

  const dataFields = fields.filter((f) => DATA_FTYPES.includes(f.ftype));
  const noteFields = fields.filter((f) => ['instruction', 'caption'].includes(f.ftype));

  return (
    <div>
      <div className="panel-section">
        <h3>Sample data</h3>
        <p className="hint">
          These values are sent to <code className="inline">update(data)</code> as JSON when you press
          Play or Update. They come from the template's field definitions.
        </p>
      </div>

      {dataFields.length === 0 && <p className="muted">No editable data fields in this template.</p>}

      {dataFields.map((f) => (
        <div className="field-row" key={f.field}>
          <div className="field-meta">
            <label style={{ margin: 0 }}>{f.title || f.field}</label>
            <span className="field-id">{f.field}</span>
          </div>
          <FieldControl field={f} />
        </div>
      ))}

      {noteFields.length > 0 && (
        <>
          <div className="divider" />
          {noteFields.map((f, i) => (
            <p className="hint" key={i}>
              {f.ftype === 'instruction' ? 'ℹ ' : ''}
              {f.value}
            </p>
          ))}
        </>
      )}

      {dataFields.length > 0 && (
        <>
          <div className="divider" />
          <button onClick={resetSampleData}>Reset to defaults</button>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { type Ftype, type SpxField } from '../model/types';
import { fieldDescriptors } from '../control/controlModel';
import SpxFieldRow from './fields/SpxFieldRow';
import { addFieldToDefinition, nextFieldId } from '../blocks/edit';
import { useTemplateStore } from '../store/templateStore';

// The broadcast field set (same as the wizard's extras).
const ADD_FTYPES: { value: Ftype; label: string }[] = [
  { value: 'textfield', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'filelist', label: 'Image' },
];

/**
 * Edit the sample/test data fed to update(). Fields are parsed from the template's
 * SPXGCTemplateDefinition and become descriptors, each rendering the shared field control —
 * the same one the operator panel uses. Unlike the operator view this one includes `hidden`
 * fields: they carry a real input value (a countdown's duration) that must be testable here.
 */
export default function SampleDataPanel() {
  const template = useTemplateStore((s) => s.template);
  const fields = useTemplateStore((s) => s.template.fields);
  const resetSampleData = useTemplateStore((s) => s.resetSampleData);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Ftype>('textfield');

  const dataFields = fieldDescriptors(fields, { includeHidden: true });
  const noteFields = fields.filter((f) => ['instruction', 'caption'].includes(f.ftype));

  // Append a field to the SPX definition (the editor highlights the new entry). The field
  // is definition-only until it's wired to an element — AI modify does that in one prompt.
  const addField = () => {
    const field: SpxField = {
      field: nextFieldId(fields),
      ftype: newType,
      title: newTitle.trim() || 'New field',
      value: newType === 'number' ? '0' : '',
      ...(newType === 'filelist' ? { assetfolder: './images/', extension: 'png' } : {}),
    };
    applyTemplate(addFieldToDefinition(template, field));
    setActiveTab('html'); // the definition lives in the HTML — show what was added
    setNewTitle('');
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Sample data</h3>
        <p className="hint">
          These values come from the template's field definitions. After editing them, press
          <strong> Update</strong> below to send them to <code className="inline">update(data)</code> as
          JSON and refresh the preview (Play does this too).
        </p>
      </div>

      {dataFields.length === 0 && <p className="muted">No editable data fields in this template.</p>}

      {dataFields.map((d) => (
        <SpxFieldRow key={d.key} descriptor={d} />
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
          <div className="row">
            <button
              className="primary"
              onClick={() => sendControl('update')}
              title="Send the current values to update() and refresh the preview"
            >
              ⟳ Update
            </button>
            <button onClick={resetSampleData}>Reset to defaults</button>
          </div>
        </>
      )}

      <div className="divider" />
      <div className="panel-section">
        <h3>Add a field</h3>
        <div className="row field-add-row">
          <input
            className="grow"
            placeholder="Label the operator sees, e.g. Sponsor"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value as Ftype)}>
            {ADD_FTYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button onClick={addField} title="Append the field to the SPX definition">+ Add</button>
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          Lands in the SPX definition (highlighted in the HTML). To show it in the design, ask the
          AI — e.g. “display the new Sponsor field under the title”.
        </p>
      </div>
    </div>
  );
}

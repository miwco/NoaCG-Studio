import { useMemo, useState } from 'react';
import { type Ftype } from '../model/types';
import { fieldDescriptors } from '../control/controlModel';
import SpxFieldRow from './fields/SpxFieldRow';
import { addCatalogLine } from '../blocks/edit';
import { addPlacedImageSlot, addPlacedLine, designBoxInfo } from '../blocks/designLayout';
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
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Ftype>('textfield');
  const [addNote, setAddNote] = useState<string | null>(null);

  const dataFields = fieldDescriptors(fields, { includeHidden: true });
  const noteFields = fields.filter((f) => ['instruction', 'caption'].includes(f.ftype));

  // The placed-design shape (an imported design's artwork box) — code-derived, so any
  // template carrying the contract gets the real add, whatever category it came from.
  const placedDesign = useMemo(
    () => designBoxInfo(template.html, template.css) !== null,
    [template.html, template.css],
  );

  // Add a field. On a placed-design template a single-line field becomes a REAL placed line
  // and an image field a REAL placed slot — element + placement rule + DataField in one
  // undoable apply (blocks/designLayout.ts); on a standard-contract CATALOG template a
  // single-line field lands as a real line in the assembler's own mask idiom
  // (blocks/edit.ts addCatalogLine) — both code-derived gates, and in both cases the new
  // layer is selected so the canvas and Inspector pick it up straight away.
  //
  // An add that CANNOT land as a real element is REFUSED with the reason (docs/GOALS_ARCHIVE.md
  // "Student release" step 5): the old fallback appended a definition-only field no element
  // answered — a control that renders, accepts a value, and silently does nothing on air,
  // which is the exact defect class scripts/field-coverage.mjs exists to catch.
  const addField = () => {
    const title = newTitle.trim() || 'New field';
    if (newType === 'textfield' || newType === 'number' || newType === 'filelist') {
      const added =
        newType === 'filelist'
          ? addPlacedImageSlot(template, { title })
          : (addPlacedLine(template, { title, ftype: newType }) ??
            addCatalogLine(template, { title, ftype: newType }));
      if (added) {
        applyTemplate(added.template);
        setSelectedPart(`#${added.fieldId}`); // the new layer — selectable, draggable, animatable
        setActiveTab('html');
        setNewTitle('');
        setAddNote(null);
        return;
      }
    }
    const typeLabel = ADD_FTYPES.find((t) => t.value === newType)?.label ?? newType;
    setAddNote(
      `This design has no place for a ${typeLabel} field — it would exist in the template ` +
        `definition, but nothing on screen would show it, so on air it would silently do ` +
        `nothing. Fields this design supports are added where its layout can adapt to them.`,
    );
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Content <span className="muted">— preview values</span></h3>
        <p className="hint">
          The sample values shown in the preview while you design — they are <strong>not</strong>{' '}
          what airs. On air, an operator drives the graphic from its <strong>Control panel</strong>{' '}
          (Home → Control panels). After editing here, press <strong>Update</strong> below to send
          them to <code className="inline">update(data)</code> and refresh the preview (Play does this too).
        </p>
      </div>

      {dataFields.length === 0 && (
        <p className="hint">
          {placedDesign
            ? 'No fields on your design yet — add the first one below. It appears on the artwork, ready to drag into place.'
            : 'No editable data fields in this template.'}
        </p>
      )}

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
          <button onClick={addField} title="Add the field as a real element in the design">+ Add</button>
        </div>
        {addNote && (
          <p className="hint status-bad" style={{ marginTop: 6 }} data-testid="add-field-refused">
            {addNote}
          </p>
        )}
        <p className="hint" style={{ marginTop: 6 }}>
          {placedDesign
            ? 'Text, number, and image fields appear on your design, ready to drag into place on the canvas.'
            : 'A new field lands as a REAL line in the design (never a definition-only entry nothing shows).'}
        </p>
      </div>
    </div>
  );
}

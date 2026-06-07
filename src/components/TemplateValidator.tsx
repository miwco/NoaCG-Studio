import { useTemplateStore } from '../store/templateStore';
import { validateTemplate } from '../validation/validateTemplate';

/** Run and display template validation (errors block export; warnings are advisory). */
export default function TemplateValidator() {
  const template = useTemplateStore((s) => s.template);
  const previewError = useTemplateStore((s) => s.previewError);
  const validation = useTemplateStore((s) => s.validation);
  const setValidation = useTemplateStore((s) => s.setValidation);

  const run = () => setValidation(validateTemplate(template, { runtimeError: previewError }));

  return (
    <div>
      <div className="panel-section">
        <h3>Validation</h3>
        <p className="hint">
          Checks the template before export: runtime functions, the SPX definition, field/DOM mapping,
          relative paths, syntax, and preview errors.
        </p>
        <button className="primary" onClick={run} style={{ marginTop: 8 }}>
          Run validation
        </button>
      </div>

      {validation && (
        <>
          <p className={validation.ok ? 'status-ok' : 'status-bad'}>
            {validation.ok
              ? '✓ Template is valid and ready to export.'
              : `✗ ${validation.errors.length} error(s) must be fixed before export.`}
          </p>

          {validation.errors.map((issue, i) => (
            <div className="issue error" key={`e${i}`}>
              <span className="rule">{issue.rule}</span>
              {issue.message}
            </div>
          ))}

          {validation.warnings.map((issue, i) => (
            <div className="issue warn" key={`w${i}`}>
              <span className="rule">{issue.rule} · warning</span>
              {issue.message}
            </div>
          ))}

          {validation.ok && validation.warnings.length === 0 && (
            <p className="hint">No issues found.</p>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { aiProvider } from '../ai/stubProvider';
import { useTemplateStore } from '../store/templateStore';
import { validateTemplate, type ValidationResult } from '../validation/validateTemplate';
import type { TemplateChange } from '../model/types';

type Pending = { change: TemplateChange; validation: ValidationResult } | null;

/**
 * AI panel. The AI is constrained: it composes deterministic blocks/presets and every result is
 * validated. Changes are shown for confirm-before-apply so the platform keeps SPX compatibility.
 * (Currently backed by a deterministic stub; a real Claude provider drops in behind AIProvider.)
 */
export default function AIPromptPanel() {
  const template = useTemplateStore((s) => s.template);
  const activeTab = useTemplateStore((s) => s.activeTab);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const runChange = async (fn: () => Promise<TemplateChange>) => {
    setBusy(true);
    setExplanation(null);
    try {
      const change = await fn();
      setPending({ change, validation: validateTemplate(change.template) });
    } finally {
      setBusy(false);
    }
  };

  const onExplain = async () => {
    setBusy(true);
    setPending(null);
    try {
      const code = activeTab === 'html' ? template.html : activeTab === 'css' ? template.css : template.js;
      setExplanation(await aiProvider.explain(code));
    } finally {
      setBusy(false);
    }
  };

  const applyPending = () => {
    if (pending) applyTemplate(pending.change.template);
    setPending(null);
  };

  return (
    <div>
      <div className="panel-section">
        <h3>AI assistant</h3>
        <p className="hint">
          Describe what you want. The assistant proposes a change you review before applying. Every
          result is validated for SPX compatibility.
        </p>
      </div>

      <textarea
        rows={3}
        placeholder='e.g. "make a fullscreen title", "add a fade-in", "add a text field"'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="row wrap" style={{ marginTop: 8 }}>
        <button disabled={busy || !prompt.trim()} onClick={() => runChange(() => aiProvider.generate(prompt))}>
          Generate
        </button>
        <button disabled={busy || !prompt.trim()} onClick={() => runChange(() => aiProvider.modify(prompt, template))}>
          Modify
        </button>
      </div>
      <div className="row wrap" style={{ marginTop: 6 }}>
        <button disabled={busy} onClick={() => runChange(() => aiProvider.makeSpxReady(template))}>
          Make SPX-ready
        </button>
        <button disabled={busy} onClick={() => runChange(() => aiProvider.fix(template))}>
          Fix
        </button>
        <button disabled={busy} onClick={onExplain}>
          Explain {activeTab.toUpperCase()}
        </button>
      </div>

      {busy && <p className="hint" style={{ marginTop: 10 }}>Working…</p>}

      {explanation && (
        <div className="change-preview">
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>{explanation}</pre>
        </div>
      )}

      {pending && (
        <div className="change-preview">
          <strong>Proposed change</strong>
          <p style={{ marginTop: 6 }}>{pending.change.summary}</p>
          <p className={pending.validation.ok ? 'status-ok' : 'status-bad'} style={{ marginTop: 6 }}>
            {pending.validation.ok
              ? '✓ Passes validation'
              : `✗ ${pending.validation.errors.length} validation error(s)`}
          </p>
          {!pending.validation.ok && (
            <ul className="hint" style={{ margin: '4px 0 0 16px' }}>
              {pending.validation.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}
          <div className="change-actions">
            <button className="primary" onClick={applyPending} disabled={!pending.validation.ok}>
              Apply
            </button>
            <button onClick={() => setPending(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}

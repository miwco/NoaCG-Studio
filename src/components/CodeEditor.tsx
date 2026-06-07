import Editor from '@monaco-editor/react';
import { useTemplateStore, type EditorTab } from '../store/templateStore';

const TABS: { id: EditorTab; label: string; language: string }[] = [
  { id: 'html', label: 'HTML', language: 'html' },
  { id: 'css', label: 'CSS', language: 'css' },
  { id: 'js', label: 'JS', language: 'javascript' },
];

/** Monaco-based editor with HTML / CSS / JS tabs, bound to the template store. */
export default function CodeEditor() {
  const activeTab = useTemplateStore((s) => s.activeTab);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const template = useTemplateStore((s) => s.template);
  const setHtml = useTemplateStore((s) => s.setHtml);
  const setCss = useTemplateStore((s) => s.setCss);
  const setJs = useTemplateStore((s) => s.setJs);

  const current = TABS.find((t) => t.id === activeTab)!;
  const value = activeTab === 'html' ? template.html : activeTab === 'css' ? template.css : template.js;

  const onChange = (next: string | undefined) => {
    const v = next ?? '';
    if (activeTab === 'html') setHtml(v);
    else if (activeTab === 'css') setCss(v);
    else setJs(v);
  };

  return (
    <>
      <div className="pane-header">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          theme="vs-dark"
          language={current.language}
          path={`template.${activeTab}`}
          value={value}
          onChange={onChange}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 10 },
          }}
        />
      </div>
    </>
  );
}

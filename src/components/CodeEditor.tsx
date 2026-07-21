import { useEffect, useRef, useState } from 'react';
import '../monacoSetup'; // bundled Monaco + workers — no CDN, fully offline
import Editor, { type OnMount } from '@monaco-editor/react';
import { useTemplateStore, type EditorTab } from '../store/templateStore';
import { explain, tokenAt } from '../teach/explain';
import { formatCode, minimalTextChange, hasProtectedRegion, type CodeLang } from '../format/formatCode';
import { CommentVisibilitySelect, useCommentVisibility } from '../editor/CommentVisibilityControl';

const TABS: { id: EditorTab; label: string; language: string }[] = [
  { id: 'html', label: 'HTML', language: 'html' },
  { id: 'css', label: 'CSS', language: 'css' },
  { id: 'js', label: 'JS', language: 'javascript' },
];

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

// Register the hover explanations once per page (Monaco registries are global).
let hoverRegistered = false;
interface HoverModel { getLineContent(lineNumber: number): string }
interface HoverPosition { lineNumber: number; column: number }
function registerHoverExplanations(monaco: Monaco) {
  if (hoverRegistered) return;
  hoverRegistered = true;
  const provider = {
    provideHover(model: HoverModel, position: HoverPosition) {
      const line = model.getLineContent(position.lineNumber);
      const token = tokenAt(line, position.column - 1);
      if (!token) return null;
      const results = explain({ token, line });
      if (results.length === 0) return null;
      return {
        contents: results.map((r) => ({
          value:
            `**${r.title}** · ${r.category}\n\n${r.body}` +
            (r.affects ? `\n\n*In the preview:* ${r.affects}` : ''),
        })),
      };
    },
  };
  for (const lang of ['html', 'css', 'javascript']) {
    // The teach knowledge base shows up as hover tooltips right where the code is.
    monaco.languages.registerHoverProvider(lang, provider as never);
  }
}

// Register Prettier document formatting once per page (Monaco registries are global). This powers
// the toolbar Format button, the right-click "Format Document", and Shift+Alt+F. The provider
// returns a MINIMAL edit (only the changed span) so the cursor and selection stay put when the
// reformat is elsewhere, and Monaco's own edit stack keeps it undoable.
let formattersRegistered = false;
interface FormattableModel { getValue(): string; getPositionAt(offset: number): HoverPosition }
function registerFormatters(monaco: Monaco) {
  if (formattersRegistered) return;
  formattersRegistered = true;
  const byLanguage: Record<string, CodeLang> = { html: 'html', css: 'css', javascript: 'js' };
  for (const [language, lang] of Object.entries(byLanguage)) {
    monaco.languages.registerDocumentFormattingEditProvider(language, {
      async provideDocumentFormattingEdits(model: FormattableModel) {
        const original = model.getValue();
        let formatted: string;
        try {
          formatted = await formatCode(lang, original);
        } catch {
          return []; // never disrupt editing because the formatter failed
        }
        const change = minimalTextChange(original, formatted);
        if (!change) return [];
        const start = model.getPositionAt(change.start);
        const end = model.getPositionAt(change.end);
        return [
          {
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
            text: change.text,
          },
        ];
      },
    });
  }
}

/** Monaco-based editor with HTML / CSS / JS tabs, bound to the template store. */
export default function CodeEditor() {
  const activeTab = useTemplateStore((s) => s.activeTab);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const template = useTemplateStore((s) => s.template);
  const setHtml = useTemplateStore((s) => s.setHtml);
  const setCss = useTemplateStore((s) => s.setCss);
  const setJs = useTemplateStore((s) => s.setJs);
  const lastChange = useTemplateStore((s) => s.lastChange);

  const setEditorContext = useTemplateStore((s) => s.setEditorContext);

  const comments = useCommentVisibility();
  const editorRef = useRef<MonacoEditor | null>(null);
  const decorationsRef = useRef<ReturnType<MonacoEditor['createDecorationsCollection']> | null>(null);
  // Flips once Monaco has mounted, so effects that need the editor re-run when it arrives —
  // the editor loads lazily, and an apply can land before the chunk has finished loading.
  const [editorReady, setEditorReady] = useState(false);

  const current = TABS.find((t) => t.id === activeTab)!;
  const value = activeTab === 'html' ? template.html : activeTab === 'css' ? template.css : template.js;

  // The JS animation region is owned by the timeline; formatting deliberately leaves it alone.
  const formatProtected = activeTab === 'js' && hasProtectedRegion(template.js);

  const onChange = (next: string | undefined) => {
    const v = next ?? '';
    if (activeTab === 'html') setHtml(v);
    else if (activeTab === 'css') setCss(v);
    else setJs(v);
  };

  // Run Prettier on the active tab through Monaco's format action, so the edit goes onto Monaco's
  // own undo stack and onChange carries the result into the store like any manual edit.
  const formatActive = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.getAction('editor.action.formatDocument')?.run();
  };

  // Highlight + reveal the lines the last panel/AI apply changed in this tab.
  useEffect(() => {
    decorationsRef.current?.clear();
    const editor = editorRef.current;
    const range = lastChange?.ranges[activeTab];
    if (!editor || !range) return;
    const apply = (reveal: boolean) => {
      decorationsRef.current?.clear();
      decorationsRef.current = editor.createDecorationsCollection([
        {
          range: { startLineNumber: range.start, startColumn: 1, endLineNumber: range.end, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'changed-line',
            linesDecorationsClassName: 'changed-gutter',
          },
        },
      ]);
      if (reveal) editor.revealLineInCenter(range.start);
    };
    // Small delay: the new value reaches Monaco right after this render commit. On a loaded
    // machine, though, two async steps can land AFTER the delay and silently wipe the fresh
    // decorations: the per-tab MODEL swap (decoration collections die with the model) and the
    // controlled value commit (setValue drops them too). Cover both: re-apply on model change,
    // and once on the first content change (no reveal — a user's own keystroke must not
    // recenter the viewport).
    const handle = setTimeout(() => apply(true), 80);
    const subModel = editor.onDidChangeModel(() => apply(true));
    const subContent = editor.onDidChangeModelContent(() => {
      apply(false);
      subContent.dispose();
    });
    return () => {
      clearTimeout(handle);
      subModel.dispose();
      subContent.dispose();
    };
    // editorReady: a change applied while Monaco was still loading gets its highlight on mount.
  }, [lastChange, activeTab, editorReady]);

  // Report the token under the cursor (kept for future context-aware tools) and register the
  // hover explanations + the Prettier formatters.
  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditorReady(true);
    registerHoverExplanations(monaco);
    registerFormatters(monaco);
    comments.attach(monaco, editor);
    // When the editor mounts into a just-shown box (e.g. the mobile "Show code" panel), Monaco can
    // read a ~0 size at creation and stay collapsed at 5×5. Force a layout to the REAL container size
    // (bypassing Monaco's own measurement), after paint and once more shortly after, to fill it.
    const relayout = () => {
      const host = editor.getDomNode()?.closest('.editor-host') as HTMLElement | null;
      if (host && host.clientHeight) editor.layout({ width: host.clientWidth, height: host.clientHeight });
      else editor.layout();
    };
    requestAnimationFrame(relayout);
    setTimeout(relayout, 150);
    const report = () => {
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (!model || !pos) return;
      const line = model.getLineContent(pos.lineNumber);
      const token = tokenAt(line, pos.column - 1);
      const tab = useTemplateStore.getState().activeTab;
      setEditorContext({ tab, token, line });
    };
    editor.onDidChangeCursorPosition(report);
    editor.onDidFocusEditorText(report);
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
              title={
                t.id !== activeTab && lastChange?.ranges[t.id]
                  ? `The last change touched the ${t.label} — click to see it highlighted`
                  : undefined
              }
            >
              {t.label}
              {/* A dot marks a tab the last panel/canvas apply changed but isn't showing. */}
              {t.id !== activeTab && lastChange?.ranges[t.id] && <span className="change-dot" />}
            </button>
          ))}
        </div>
        <CommentVisibilitySelect mode={comments.mode} onChange={comments.setMode} />
        <button
          className="format-btn"
          onClick={formatActive}
          disabled={formatProtected}
          title={
            formatProtected
              ? 'The animation region is edited on the timeline — formatting leaves it untouched'
              : 'Format this file with Prettier (Shift+Alt+F)'
          }
        >
          Format
        </button>
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          theme="vs-dark"
          language={current.language}
          path={`template.${activeTab}`}
          value={value}
          onChange={onChange}
          onMount={onMount}
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

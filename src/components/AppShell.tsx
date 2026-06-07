import { useRef } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import SidePanel from './SidePanel';

/**
 * Three-pane workspace: code editor (left), live preview + playout simulator (center),
 * and the supporting side panels (right). The iframe ref is shared so the simulator can
 * call play()/stop()/update() on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const resetToDefault = useTemplateStore((s) => s.resetToDefault);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          SPX HTML GFX Builder <span className="dot">●</span>
        </div>
        <span className="tpl-name">{template.name}</span>
        <div className="spacer" />
        <button onClick={resetToDefault} title="Reload the default lower-third template">
          Reset template
        </button>
      </header>

      <div className="workspace">
        <section className="pane">
          <CodeEditor />
        </section>

        <section className="pane">
          <div className="preview-wrap">
            <PreviewFrame iframeRef={iframeRef} />
            <PlayoutSimulator iframeRef={iframeRef} />
          </div>
        </section>

        <section className="pane">
          <SidePanel />
        </section>
      </div>
    </div>
  );
}

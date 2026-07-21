// The video shell's Monaco editor: the project's ONE composition source file - the
// Remotion TSX module, or the HyperFrames composition HTML, whichever the engine reads.
// Lazy-loaded like the SPX CodeEditor - Monaco is the heaviest chunk and the code view
// is optional. Typing goes through setSource (no store history - Monaco's own undo
// covers keystrokes); TSX gets syntax-only diagnostics (see monacoSetup.ts).

import '../../monacoSetup'; // bundled Monaco + workers - no CDN, fully offline
import Editor from '@monaco-editor/react';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { videoSource } from '../../model/videoTypes';
import { CommentVisibilitySelect, useCommentVisibility } from '../../editor/CommentVisibilityControl';

export default function VideoCodeEditor() {
  const engine = useVideoProjectStore((s) => s.project.engine);
  const source = useVideoProjectStore((s) => videoSource(s.project));
  const setSource = useVideoProjectStore((s) => s.setSource);
  const hyperframes = engine === 'hyperframes';
  const comments = useCommentVisibility();

  return (
    <>
      <div className="pane-header">
        <div className="tabs">
          <button className="tab active">{hyperframes ? 'composition.html' : 'Composition.tsx'}</button>
        </div>
        <CommentVisibilitySelect mode={comments.mode} onChange={comments.setMode} />
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          theme="vs-dark"
          language={hyperframes ? 'html' : 'typescript'}
          path={hyperframes ? 'file:///video/composition.html' : 'file:///video/Composition.tsx'}
          value={source}
          onChange={(next) => setSource(next ?? '')}
          onMount={(editor, monaco) => comments.attach(monaco, editor)}
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

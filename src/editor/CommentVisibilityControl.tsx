// The React glue for the comments-visibility preference: one hook + one toolbar control, shared by
// the SPX code editor and the video shell's editor so the two can never drift. The preference is a
// device-level default (model/prefs.ts), remembered across reloads like the export target.

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { loadPrefs, savePrefs } from '../model/prefs';
import {
  attachCommentVisibility,
  COMMENT_VISIBILITY_MODES,
  type CommentVisibility,
  type CommentVisibilityController,
} from './commentVisibility';

export function useCommentVisibility() {
  const [mode, setModeState] = useState<CommentVisibility>(() => loadPrefs().commentVisibility);
  const modeRef = useRef(mode);
  const controllerRef = useRef<CommentVisibilityController | null>(null);

  // Called from the editor's onMount: the controller lives as long as the editor does and
  // reapplies itself on every model/file swap (see attachCommentVisibility).
  const attach = useCallback((monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) => {
    controllerRef.current?.dispose();
    controllerRef.current = attachCommentVisibility(monaco, editor, modeRef.current);
  }, []);

  useEffect(() => () => controllerRef.current?.dispose(), []);

  const setMode = useCallback((next: CommentVisibility) => {
    modeRef.current = next;
    setModeState(next);
    savePrefs({ commentVisibility: next });
    controllerRef.current?.setMode(next);
  }, []);

  return { mode, setMode, attach };
}

export function CommentVisibilitySelect({
  mode,
  onChange,
}: {
  mode: CommentVisibility;
  onChange: (mode: CommentVisibility) => void;
}) {
  return (
    <label
      className="comment-vis"
      title="Show, dim, or hide comments in the editor. This changes the view only — the comments stay in the code."
    >
      Comments
      <select
        data-testid="comment-visibility"
        value={mode}
        onChange={(e) => onChange(e.target.value as CommentVisibility)}
      >
        {COMMENT_VISIBILITY_MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

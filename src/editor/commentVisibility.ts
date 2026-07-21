// Comments visibility — a VIEW-ONLY preference for the code editors.
//
// Non-negotiable 1 says the code is the single source of truth, so this layer never edits it:
// dimming or hiding a comment is done with Monaco DECORATIONS over the untouched model. Nothing
// here writes text, so editing, saving, exporting, validation, undo/redo and cursor positions
// behave exactly as if the control did not exist. "Hidden" paints the comment transparent, which
// leaves its blank line in place — the alternative (folding the lines away) would move every line
// number the user, the timeline's ranges and the validator talk about.
//
// Which characters ARE a comment comes from Monaco's own TOKENIZER, not from regexes: that is what
// makes it correct across HTML, CSS, JS, TS and TSX at once, and what keeps `"// not a comment"`
// inside a string (or a `//` inside a regex literal) untouched. Embedded languages come along for
// free — the HTML tokenizer switches into the JS/CSS tokenizer inside <script>/<style>.
//
// The module is deliberately framework-free (the React glue is CommentVisibilityControl.tsx) and
// takes the `monaco` namespace as an argument, so both editors and the tests can drive it.

import type * as Monaco from 'monaco-editor';

export type CommentVisibility = 'normal' | 'dimmed' | 'hidden';

export const COMMENT_VISIBILITY_MODES: { id: CommentVisibility; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'dimmed', label: 'Dimmed' },
  { id: 'hidden', label: 'Hidden' },
];

/** Inline classes the decorations carry; the rules live in styles.css. */
export const DIMMED_CLASS = 'comment-dimmed';
export const HIDDEN_CLASS = 'comment-hidden';

// Monarch names comment tokens `comment`, `comment.html`, `comment.content.html`, `comment.js`,
// `comment.doc.ts`, … — always `comment` as a whole dot-separated segment.
const IS_COMMENT = /(?:^|\.)comment(?:\.|$)/;

// VS Code's default word separators — needed only to honour the find widget's "whole word".
const WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

/**
 * Every comment span in `text`, as Monaco ranges. Pure: tokenizes a copy of the text with the
 * language's own tokenizer, so it is safe to call on any string (tests included).
 */
export function findCommentRanges(monaco: typeof Monaco, text: string, languageId: string): Monaco.IRange[] {
  let lineTokens: Monaco.Token[][];
  try {
    lineTokens = monaco.editor.tokenize(text, languageId);
  } catch {
    return []; // an unknown/not-yet-loaded language must never break the editor
  }
  const lines = text.split(/\r\n|\r|\n/);
  const ranges: Monaco.IRange[] = [];
  for (let i = 0; i < lineTokens.length; i++) {
    const tokens = lineTokens[i];
    const lineLength = (lines[i] ?? '').length;
    let runStart = -1; // start offset of the comment run being accumulated, -1 = none
    const close = (endOffset: number) => {
      if (runStart >= 0 && endOffset > runStart) {
        ranges.push({
          startLineNumber: i + 1,
          startColumn: runStart + 1,
          endLineNumber: i + 1,
          endColumn: endOffset + 1,
        });
      }
      runStart = -1;
    };
    for (const token of tokens) {
      if (IS_COMMENT.test(token.type)) {
        if (runStart < 0) runStart = token.offset;
      } else {
        close(token.offset);
      }
    }
    close(lineLength); // a run that reaches the end of the line (the common case)
  }
  return ranges;
}

function intersects(a: Monaco.IRange, b: Monaco.IRange): boolean {
  if (a.endLineNumber < b.startLineNumber || b.endLineNumber < a.startLineNumber) return false;
  if (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn) return false;
  if (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn) return false;
  return true;
}

// The find widget's state is reached through its contribution. It is not part of the typed public
// API, so it is read defensively — a Monaco version that renames it costs the find reveal, nothing
// else.
interface FindStateLike {
  isRevealed: boolean;
  searchString: string;
  isRegex: boolean;
  matchCase: boolean;
  wholeWord: boolean;
  onFindReplaceStateChange(listener: () => void): Monaco.IDisposable;
}
interface FindControllerLike {
  getState?(): FindStateLike | undefined;
}
function findState(editor: Monaco.editor.IStandaloneCodeEditor): FindStateLike | undefined {
  try {
    const controller = editor.getContribution('editor.contrib.findController') as unknown as FindControllerLike | null;
    return controller?.getState?.();
  } catch {
    return undefined;
  }
}

export interface CommentVisibilityController {
  setMode(mode: CommentVisibility): void;
  /** Recompute ranges and redraw — for callers that changed the model behind Monaco's back. */
  refresh(): void;
  dispose(): void;
}

/**
 * Bind the control to one editor. Reapplies itself on every model swap (the HTML/CSS/JS tabs are
 * separate models) and on content change, and — in `hidden` mode only — temporarily reveals any
 * comment that holds the selection, a diagnostic marker, or a find match, so the editor can never
 * hide something the user is being pointed at.
 */
export function attachCommentVisibility(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
  initial: CommentVisibility,
): CommentVisibilityController {
  let mode = initial;
  let ranges: Monaco.IRange[] = [];
  let disposed = false;
  let retokenizeTimer: ReturnType<typeof setTimeout> | undefined;
  const collection = editor.createDecorationsCollection([]);

  const recompute = () => {
    const model = editor.getModel();
    ranges = model && mode !== 'normal' ? findCommentRanges(monaco, model.getValue(), model.getLanguageId()) : [];
  };

  // Ranges that must stay legible even while comments are hidden.
  const revealRanges = (): Monaco.IRange[] => {
    const model = editor.getModel();
    if (!model) return [];
    const out: Monaco.IRange[] = [...(editor.getSelections() ?? [])];
    for (const marker of monaco.editor.getModelMarkers({ resource: model.uri })) {
      out.push({
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
      });
    }
    const state = findState(editor);
    if (state?.isRevealed && state.searchString) {
      try {
        const matches = model.findMatches(
          state.searchString,
          false,
          state.isRegex,
          state.matchCase,
          state.wholeWord ? WORD_SEPARATORS : null,
          false,
          1000,
        );
        for (const match of matches) out.push(match.range);
      } catch {
        // an in-progress regex the user is still typing — no matches to reveal
      }
    }
    return out;
  };

  const render = () => {
    if (disposed) return;
    if (mode === 'normal' || ranges.length === 0) {
      collection.clear();
      return;
    }
    const inlineClassName = mode === 'hidden' ? HIDDEN_CLASS : DIMMED_CLASS;
    // Dimmed comments stay readable, so only hidden ones need the reveal pass.
    const revealed = mode === 'hidden' ? revealRanges() : [];
    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];
    for (const range of ranges) {
      if (revealed.some((r) => intersects(range, r))) continue;
      decorations.push({ range, options: { inlineClassName } });
    }
    collection.set(decorations);
  };

  const rebuild = () => {
    recompute();
    render();
  };

  // Monaco registers a language's tokenizer LAZILY, the first time a model needs it — so the very
  // first rebuild after a model swap can legitimately see no tokens at all (this is what made the
  // CSS tab open undecorated). There is no "tokenizer ready" event in the standalone API, so an
  // empty result is retried on a short, bounded ramp; a file that really has no comments just
  // costs a few cheap tokenize passes.
  const RETRY_DELAYS = [80, 250, 700, 1500];
  let retryTimers: ReturnType<typeof setTimeout>[] = [];
  const clearRetries = () => {
    for (const timer of retryTimers) clearTimeout(timer);
    retryTimers = [];
  };
  const rebuildWhenTokenized = () => {
    clearRetries();
    rebuild();
    if (mode === 'normal' || ranges.length > 0) return;
    retryTimers = RETRY_DELAYS.map((delay) =>
      setTimeout(() => {
        if (disposed || mode === 'normal' || ranges.length > 0) return;
        rebuild();
      }, delay),
    );
  };

  const scheduleRebuild = () => {
    clearTimeout(retokenizeTimer);
    retokenizeTimer = setTimeout(rebuild, 120); // typing retokenizes at most ~8×/s
  };

  const subscriptions: Monaco.IDisposable[] = [
    editor.onDidChangeModel(rebuildWhenTokenized),
    editor.onDidChangeModelLanguage(rebuildWhenTokenized),
    editor.onDidChangeModelContent(scheduleRebuild),
    editor.onDidChangeCursorSelection(() => {
      if (mode === 'hidden') render(); // reveal/re-hide only — the ranges did not move
    }),
    monaco.editor.onDidChangeMarkers((resources) => {
      const uri = editor.getModel()?.uri.toString();
      if (mode === 'hidden' && uri && resources.some((r) => r.toString() === uri)) render();
    }),
  ];
  const state = findState(editor);
  if (state) subscriptions.push(state.onFindReplaceStateChange(() => { if (mode === 'hidden') render(); }));

  rebuildWhenTokenized();

  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      rebuildWhenTokenized();
    },
    refresh: rebuildWhenTokenized,
    dispose() {
      disposed = true;
      clearTimeout(retokenizeTimer);
      clearRetries();
      for (const sub of subscriptions) sub.dispose();
      collection.clear();
    },
  };
}

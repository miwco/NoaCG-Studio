import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import SidePanel from './SidePanel';
import PacketManager from './PacketManager';
import CommunityGallery from './CommunityGallery';
import ModerationQueue from './ModerationQueue';
import CreationWizard from './wizard/CreationWizard';
import AuthStatus from './auth/AuthStatus';
import SyncStatus from './SyncStatus';
import { isBackendConfigured } from '../backend/config';
import { useIsModerator } from '../community/useIsModerator';
import { useIsMobile } from './useIsMobile';
import { clampRatio, loadLayout, saveLayout, type LayoutPrefs } from '../model/layout';

/**
 * Two-pane workspace: code editor (left) and, on the right, the live preview (16:9,
 * sized by the template's aspect) stacked above the playout simulator and the tool
 * panels. This keeps the canvas compact on portrait monitors instead of floating in
 * dead space. The iframe ref is shared so the simulator can call play()/stop()/update()
 * on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const openGallery = useTemplateStore((s) => s.openGallery);
  const undo = useTemplateStore((s) => s.undo);
  const [packetsOpen, setPacketsOpen] = useState(false);

  // Community gallery (Era 5.5) — only offered when a backend is configured (offline shows nothing).
  // A `?template=<slug>` share link auto-opens the gallery focused on that item.
  const backendConfigured = isBackendConfigured();
  const initialTemplateSlug = useMemo(
    () => (backendConfigured ? new URLSearchParams(window.location.search).get('template') : null),
    [backendConfigured],
  );
  const [communityOpen, setCommunityOpen] = useState(Boolean(initialTemplateSlug));

  // Moderator takedown queue — the button appears only for users in the moderators table.
  const isModerator = useIsModerator();
  const [moderationOpen, setModerationOpen] = useState(false);

  // On a phone the app reflows to a single column (preview + panels first); the code editor is
  // collapsed and mounted on demand (Monaco is heavy and secondary on mobile).
  const isMobile = useIsMobile();
  const [codeOpen, setCodeOpen] = useState(false);

  // Desktop layout: collapse the code pane for full-width preview, and drag the divider to resize the
  // code vs preview columns. Remembered in localStorage (the first persisted UI preference). Only the
  // desktop branch reads this; the mobile branch ignores it.
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutPrefs>(loadLayout);
  const [dragging, setDragging] = useState(false);

  const toggleCode = () => {
    setLayout((l) => {
      const codeCollapsed = !l.codeCollapsed;
      saveLayout({ codeCollapsed });
      return { ...l, codeCollapsed };
    });
  };

  const ratioFromEvent = (clientX: number): number | null => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return clampRatio((clientX - rect.left) / rect.width);
  };

  const onDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    document.body.classList.add('resizing-cols');
  };
  const onDividerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const ratio = ratioFromEvent(e.clientX);
    if (ratio !== null) setLayout((l) => ({ ...l, codeRatio: ratio }));
  };
  const onDividerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromEvent(e.clientX);
    if (ratio !== null) {
      setLayout((l) => ({ ...l, codeRatio: ratio }));
      saveLayout({ codeRatio: ratio }); // persist only on release, not on every move
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    document.body.classList.remove('resizing-cols');
  };

  // Global undo for block / AI / gallery actions. Skips Monaco and form fields so they
  // keep their own native text undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      if (!isZ || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      const inEditable =
        !!el?.closest?.('.monaco-editor') ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        !!el?.isContentEditable;
      if (inEditable) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          SPX GFX Builder
        </div>
        <span className="tpl-name">{template.name}</span>
        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
          {template.resolution.width}×{template.resolution.height} · {template.fps}&thinsp;fps
        </span>
        <div className="spacer" />
        {!isMobile && (
          <button
            className={layout.codeCollapsed ? '' : 'active'}
            onClick={toggleCode}
            data-testid="toggle-code"
            title={layout.codeCollapsed ? 'Show the code editor' : 'Collapse the code editor to give the preview full width'}
          >
            {layout.codeCollapsed ? '▸ Show code' : '▾ Hide code'}
          </button>
        )}
        <button onClick={() => setPacketsOpen(true)} title="Save this show's graphics together + manage brand looks">
          📦 Packets
        </button>
        {backendConfigured && (
          <button onClick={() => setCommunityOpen(true)} title="Browse and reuse templates shared by other users">
            🌐 Community
          </button>
        )}
        {isModerator && (
          <button onClick={() => setModerationOpen(true)} title="Review and remove published community templates">
            🛡 Moderate
          </button>
        )}
        <button onClick={openGallery} title="Start a new project from a template">
          + New project
        </button>
        {/* Both render nothing offline; cloud status + account appear in hosted mode. */}
        <SyncStatus />
        <AuthStatus />
      </header>

      {isMobile ? (
        <div className="workspace workspace-mobile">
          <div className="preview-wrap">
            <PreviewFrame iframeRef={iframeRef} />
            <PlayoutSimulator iframeRef={iframeRef} />
          </div>
          <SidePanel />
          <div className="mobile-code">
            <button className="mobile-code-toggle" onClick={() => setCodeOpen((o) => !o)}>
              {codeOpen ? '▾ Hide code' : '▸ Show code'}
            </button>
            {codeOpen && <CodeEditor />}
          </div>
        </div>
      ) : (
        <div
          className="workspace"
          ref={workspaceRef}
          style={{
            gridTemplateColumns: layout.codeCollapsed
              ? '1fr'
              : `${layout.codeRatio}fr 6px ${1 - layout.codeRatio}fr`,
          }}
        >
          {!layout.codeCollapsed && (
            <>
              <section className="pane" data-testid="code-pane">
                <CodeEditor />
              </section>
              <div
                className={`workspace-divider${dragging ? ' dragging' : ''}`}
                data-testid="workspace-divider"
                role="separator"
                aria-orientation="vertical"
                onPointerDown={onDividerPointerDown}
                onPointerMove={onDividerPointerMove}
                onPointerUp={onDividerPointerUp}
              />
            </>
          )}

          <section className="pane">
            <div className="preview-wrap">
              <PreviewFrame iframeRef={iframeRef} />
              <PlayoutSimulator iframeRef={iframeRef} />
            </div>
            <SidePanel />
          </section>
        </div>
      )}

      {/* Creation wizard overlay — shown on startup and via "New project". */}
      <CreationWizard />

      {/* Packet manager overlay — saved graphics collections + brand looks. */}
      {packetsOpen && <PacketManager onClose={() => setPacketsOpen(false)} />}

      {/* Community gallery overlay — browse + import shared templates (hosted mode only). */}
      {communityOpen && (
        <CommunityGallery onClose={() => setCommunityOpen(false)} initialSlug={initialTemplateSlug} />
      )}

      {/* Moderator takedown queue overlay — only reachable when the button is shown (a moderator). */}
      {moderationOpen && <ModerationQueue onClose={() => setModerationOpen(false)} />}
    </div>
  );
}

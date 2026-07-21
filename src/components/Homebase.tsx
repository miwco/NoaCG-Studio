import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { loadPackets, loadLooks, type Packet, type SavedGraphic } from '../model/packets';
import { loadShows } from '../model/shows';
import { listSavedVideoProjects, saveCurrentVideoProject, type SavedVideoRecord } from '../model/videoProject';
import { useDocKindStore } from '../store/docKindStore';
import { isBackendConfigured } from '../backend/config';
import { listMySubmissions, type MySubmission } from '../community/communityData';
import { useModalGate } from './spaceKey';

interface Props {
  /** The signed-in account's email (shown in the header). */
  email: string | null;
  onClose: () => void;
}

/** A graphic together with the packet it lives in (the homebase list is cross-packet). */
interface HomeRow {
  packet: Packet;
  graphic: SavedGraphic;
}

/**
 * The signed-in user's homebase — THE profile (Phase 5): everything they made or run, one
 * place. Saved graphics across all packets, video projects, shows with their hosted control
 * pages, community submissions, brand looks. Local-first (the same stores the managers
 * manage; cloud sync mirrors every kind for signed-in users), so there is exactly ONE source
 * of saved work.
 */
export default function Homebase({ email, onClose }: Props) {
  useModalGate(); // global editor shortcuts stand down while this is up
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const openGallery = useTemplateStore((s) => s.openGallery);
  const setDocKind = useDocKindStore((s) => s.setKind);

  const packets = useMemo(() => loadPackets(), []);
  const looks = useMemo(() => loadLooks(), []);
  const shows = useMemo(() => loadShows(), []);
  const videos = useMemo(() => listSavedVideoProjects(), []);
  const [community, setCommunity] = useState<MySubmission[]>([]);
  useEffect(() => {
    if (!isBackendConfigured()) return;
    void listMySubmissions().then(setCommunity).catch(() => {});
  }, []);

  const rows = useMemo<HomeRow[]>(
    () =>
      packets
        .flatMap((packet) => packet.graphics.map((graphic) => ({ packet, graphic })))
        .sort((a, b) => b.graphic.savedAt.localeCompare(a.graphic.savedAt)),
    [packets],
  );

  const open = (row: HomeRow) => {
    applyTemplate(row.graphic.template, { resetSampleData: true });
    setActiveTab('html');
    setDocKind('spx');
    onClose();
  };

  const openVideo = (record: SavedVideoRecord) => {
    // The video shell edits the CURRENT slot — same handoff as the wizard's reopen strip.
    saveCurrentVideoProject(record.project);
    setDocKind('video');
    onClose();
  };

  const newProject = () => {
    onClose();
    openGallery();
  };

  const controlUrl = (slug: string) => `${window.location.origin}/app?control=${encodeURIComponent(slug)}`;

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal" data-testid="homebase">
        <div className="wz-header">
          <div>
            <h2>Your homebase</h2>
            <p className="hint">
              {email ? `${email} · ` : ''}
              {rows.length} graphic{rows.length === 1 ? '' : 's'} · {videos.length} video
              {videos.length === 1 ? '' : 's'} · {shows.length} show{shows.length === 1 ? '' : 's'} ·{' '}
              {looks.length} look{looks.length === 1 ? '' : 's'}
            </p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          {rows.length === 0 && videos.length === 0 && shows.length === 0 ? (
            <div className="panel-section">
              <h3>Nothing saved yet</h3>
              <p className="hint">
                Create a graphic, then save it into a packet (📦 Packets in the topbar) — it will
                appear here, and sync across your devices while you are signed in.
              </p>
              <button className="primary" onClick={newProject}>+ New project</button>
            </div>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="panel-section">
                  <div className="row" style={{ alignItems: 'baseline' }}>
                    <h3>My graphics</h3>
                    <div className="spacer" />
                    <button onClick={newProject}>+ New project</button>
                  </div>
                  {rows.map((row) => (
                    <div className="pk-graphic" key={row.graphic.id}>
                      <strong>{row.graphic.name}</strong>
                      <span className="muted">
                        {row.packet.name} · {row.graphic.type} · {new Date(row.graphic.savedAt).toLocaleDateString()}
                      </span>
                      <div className="spacer" />
                      <button
                        className="primary"
                        onClick={() => open(row)}
                        title="Load into the editor (replaces the current graphic — undo with Ctrl+Z)"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                  <p className="hint" style={{ marginTop: 10 }}>
                    Organize packets, export a whole show, and manage brand looks in 📦 Packets.
                  </p>
                </div>
              )}

              {videos.length > 0 && (
                <div className="panel-section">
                  <h3>My videos</h3>
                  {videos.map((v) => (
                    <div className="pk-graphic" key={v.id}>
                      <strong>{v.name}</strong>
                      <span className="muted">
                        {v.project.engine} · {new Date(v.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="spacer" />
                      <button className="primary" onClick={() => openVideo(v)} title="Open in the video editor">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {shows.length > 0 && (
                <div className="panel-section">
                  <h3>My shows</h3>
                  {shows.map((s) => (
                    <div className="pk-graphic" key={s.id}>
                      <strong>{s.name}</strong>
                      <span className="muted">
                        {s.graphics.length} graphic{s.graphics.length === 1 ? '' : 's'}
                        {s.hostedSlug ? ' · hosted control live' : ''}
                      </span>
                      <div className="spacer" />
                      {s.hostedSlug && (
                        <a className="link-inline" href={controlUrl(s.hostedSlug)} target="_blank" rel="noreferrer" title="Open the hosted control page">
                          Control page ↗
                        </a>
                      )}
                    </div>
                  ))}
                  <p className="hint" style={{ marginTop: 10 }}>
                    Build shows and host their control pages in the Control tab's Shows section.
                  </p>
                </div>
              )}

              {community.length > 0 && (
                <div className="panel-section">
                  <h3>My community templates</h3>
                  {community.map((c) => (
                    <div className="pk-graphic" key={c.id}>
                      <strong>{c.name}</strong>
                      <span className="muted">{c.kind} · {c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

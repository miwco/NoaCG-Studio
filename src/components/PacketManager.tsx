import { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { useTemplateStore } from '../store/templateStore';
import {
  addLook,
  applyLookToTemplate,
  captureLookFromTemplate,
  createPacket,
  deleteLook,
  deletePacket,
  importLook,
  loadLooks,
  loadPackets,
  removeGraphic,
  saveGraphicToPacket,
  type Packet,
  type SavedLook,
} from '../model/packets';
import { saveBrand } from '../model/brand';
import { buildPacketZip } from '../export/packetExport';
import { slug } from '../export/common';

interface Props {
  onClose: () => void;
}

/**
 * The packet manager: a show's graphics saved together (open any, export the whole set
 * as one zip) plus named brand looks (apply to the current graphic, set for new ones,
 * share as a .json file). Everything lives in this browser's localStorage.
 */
export default function PacketManager({ onClose }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const [packets, setPackets] = useState<Packet[]>(loadPackets);
  const [looks, setLooks] = useState<SavedLook[]>(loadLooks);
  const [targetPacket, setTargetPacket] = useState<string>(packets[0]?.id ?? 'new');
  const [newPacketName, setNewPacketName] = useState('');
  const [newLookName, setNewLookName] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const saveCurrent = () => {
    let packetId = targetPacket;
    let list = packets;
    if (packetId === 'new') {
      list = createPacket(newPacketName || 'My show');
      packetId = list[list.length - 1].id;
      setTargetPacket(packetId);
      setNewPacketName('');
    }
    const { packets: next, error } = saveGraphicToPacket(packetId, template);
    setPackets(next);
    setNote(error ?? `✓ Saved "${template.name}" — saving again with the same name updates it.`);
  };

  const openGraphic = (packet: Packet, graphicId: string) => {
    const graphic = packet.graphics.find((g) => g.id === graphicId);
    if (!graphic) return;
    applyTemplate(graphic.template, { resetSampleData: true });
    setActiveTab('html');
    onClose();
  };

  const exportPacket = async (packet: Packet) => {
    setNote(null);
    const zip = await buildPacketZip(packet);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${slug(packet.name)}_packet.zip`);
    setNote(`✓ Exported "${packet.name}" (${packet.graphics.length} graphics, one folder each).`);
  };

  const saveLook = () => {
    setLooks(addLook(newLookName || 'My look', captureLookFromTemplate(template)));
    setNewLookName('');
    setNote('✓ Look saved — colors captured from the current graphic (Style-panel tweaks included).');
  };

  const applyLook = (look: SavedLook) => {
    applyTemplate(applyLookToTemplate(template, look.brand));
    setActiveTab('css'); // the retinted :root vars light up in the editor
    setNote(`✓ Applied "${look.name}" to the current graphic (undo with Ctrl+Z).`);
  };

  const shareLook = (look: SavedLook) => {
    const blob = new Blob([JSON.stringify({ name: look.name, brand: look.brand }, null, 2)], { type: 'application/json' });
    saveAs(blob, `${slug(look.name)}.look.json`);
  };

  const onImportLook = async (file: File | undefined) => {
    if (!file) return;
    const { looks: next, error } = importLook(await file.text());
    if (next) setLooks(next);
    setNote(error ?? '✓ Look imported.');
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal">
        <div className="wz-header">
          <div>
            <h2>Packets</h2>
            <p className="hint">A show's graphics saved together, plus named brand looks — stored in this browser.</p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          {/* ── Save the current graphic ── */}
          <div className="panel-section">
            <h3>Save the current graphic</h3>
            <div className="row">
              <span className="wz-fid">{template.name}</span>
              <select className="grow" value={targetPacket} onChange={(e) => setTargetPacket(e.target.value)}>
                {packets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="new">＋ New packet…</option>
              </select>
              {targetPacket === 'new' && (
                <input
                  placeholder="Show name, e.g. Friday Fight Night"
                  value={newPacketName}
                  onChange={(e) => setNewPacketName(e.target.value)}
                />
              )}
              <button className="primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>

          {/* ── Packets ── */}
          {packets.map((packet) => (
            <div className="panel-section pk-packet" key={packet.id}>
              <div className="row" style={{ alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>📦 {packet.name} <span className="muted">({packet.graphics.length})</span></h3>
                <div className="spacer" />
                <button onClick={() => void exportPacket(packet)} disabled={packet.graphics.length === 0} title="One zip: a folder per graphic, plug-and-play">
                  ⬇ Export packet
                </button>
                <button onClick={() => { setPackets(deletePacket(packet.id)); }} title="Delete this packet (graphics in it are removed from storage)">
                  🗑
                </button>
              </div>
              {packet.graphics.length === 0 && <p className="hint">Empty — save the current graphic into it above.</p>}
              {packet.graphics.map((g) => (
                <div className="pk-graphic" key={g.id}>
                  <strong>{g.name}</strong>
                  <span className="muted">{g.type} · {new Date(g.savedAt).toLocaleDateString()}</span>
                  <div className="spacer" />
                  <button onClick={() => openGraphic(packet, g.id)} title="Load into the editor (replaces the current graphic — undo with Ctrl+Z)">
                    Open
                  </button>
                  <button onClick={() => setPackets(removeGraphic(packet.id, g.id))} title="Remove from the packet">✕</button>
                </div>
              ))}
            </div>
          ))}

          {/* ── Looks ── */}
          <div className="panel-section">
            <h3>Brand looks</h3>
            <p className="hint">
              A look = this graphic's colors + font, captured as a named brand. Apply it to any
              graphic, use it for new ones, or share it as a file.
            </p>
            <div className="row">
              <input
                className="grow"
                placeholder="Look name, e.g. Channel A7 red"
                value={newLookName}
                onChange={(e) => setNewLookName(e.target.value)}
              />
              <button className="primary" onClick={saveLook}>Save current look</button>
              <input
                ref={importInput}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => { void onImportLook(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button onClick={() => importInput.current?.click()} title="Import a shared .look.json file">⬆ Import…</button>
            </div>
            {looks.map((look) => (
              <div className="pk-graphic" key={look.id}>
                <span className="pk-swatches" aria-hidden>
                  {[look.brand.palette.accent, look.brand.palette.panel, look.brand.palette.text].map((c, i) => (
                    <i key={i} style={{ background: c }} />
                  ))}
                </span>
                <strong>{look.name}</strong>
                <span className="muted">
                  {look.brand.customFont?.family ?? look.brand.fontId ?? ''}
                </span>
                <div className="spacer" />
                <button onClick={() => applyLook(look)} title="Retint the current graphic's :root vars + font">Apply</button>
                <button onClick={() => { saveBrand(look.brand); setNote(`✓ "${look.name}" is now the project brand for new graphics.`); }} title="New graphics from the wizard will match this look">
                  Use for new
                </button>
                <button onClick={() => shareLook(look)} title="Download as a shareable .look.json">⬇</button>
                <button onClick={() => setLooks(deleteLook(look.id))} title="Delete this look">✕</button>
              </div>
            ))}
          </div>

          {note && (
            <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 4 }}>{note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

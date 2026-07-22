// The packet manager's data layer.
//
// Two kinds of saved things, both in localStorage:
//   - Packets: named collections of ACTUAL GRAPHICS (a show's lower third + ticker +
//     credits + bug together). Save the current graphic in, reopen any of them, export
//     the whole packet as one zip.
//   - Looks: named brand looks (palette + font + style family) that can be applied to
//     the current graphic, set as the project brand for new graphics, and shared as a
//     .json file.

import { getCssVariable, setCssVariable } from '../blocks/cssVars';
import {
  FONTS,
  customFontFaceCss,
  customFontStack,
  fontById,
  fontFaceCss,
  fontFormatForExt,
  fontStack,
  type CustomFont,
} from './fonts';
import { loadBrand, type ProjectBrand } from './brand';
import type { SpxTemplate, TemplateType } from './types';
import { extOf, isFontAsset } from '../assets/assetUtils';
import { uuid } from './id';

// ── Packets (graphics collections) ───────────────────────────────────────────

export interface SavedGraphic {
  id: string;
  name: string;
  type: TemplateType;
  savedAt: string; // ISO date
  template: SpxTemplate;
  /**
   * The LIBRARY record this copy was taken from (model/library.ts GraphicDoc.id), when the
   * document was a saved graphic. Additive and optional - a copy without it stays valid; it
   * is what lets a show's hosted control page find the graphic's saved ENTRIES
   * (control/hostedControl.ts). Not an ownership link: the copy is still a copy.
   */
  graphicId?: string;
}

export interface Packet {
  id: string;
  name: string;
  /**
   * LEGACY EMBEDDED GRAPHICS (pre-library, docs/SAVED_CONTENT_MODEL.md). Version 2 packets are
   * FOLDERS: graphics live in the library (model/library.ts) pointing back via `packageId`, and
   * this array stays empty. Any embedded graphic found here (a v1 record, or one written by an
   * older build) is extracted into the library on read (library.ts migrateEmbeddedGraphics).
   * Kept as a real array — never undefined — so an older build reading a v2 packet still works.
   */
  graphics: SavedGraphic[];
  /** 2 = folder-over-the-library shape. Absent = v1 (embedded graphics, migrated on read). */
  version?: number;
  /** When the packet last changed (ISO). Bumped on every mutation; drives Era-5 cloud sync (LWW). */
  updatedAt: string;
  /**
   * Soft-delete tombstone: a deleted packet is hidden from the UI but kept (with its payload
   * stripped) so the deletion propagates to other devices via cloud sync, instead of the row
   * resurrecting from another device's stale copy. Purged after a grace period.
   */
  deleted?: boolean;
}

const PACKETS_KEY = 'spx-gfx-packets';
const LOOKS_KEY = 'spx-gfx-looks';

/** Record ids must be valid UUIDs — they become the cloud `documents.id` (uuid PK). */
function newId(): string {
  return uuid();
}

function nowIso(): string {
  return new Date().toISOString();
}

// A FIXED timestamp used to back-fill records saved before updatedAt existed (pre-Era-5). It must
// be a constant, not now(): a fresh now() on every read makes such a record look freshly-edited
// each sync, so it would be re-pushed forever and could wrongly win conflicts. A stable old value
// means it converges (both sides agree) and loses last-write-wins to any real dated edit.
const BACKFILL_TS = '1970-01-01T00:00:00.000Z';

// The sync layer (Era 5.2) listens for local data changes to schedule a cloud push. It is safe for
// sync's own pull-writes to fire this too: the sync is idempotent, so the extra pass it schedules
// finds nothing to do and settles.
function notifyDataChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spx-data-changed'));
  }
}

function loadList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

/** Persist; returns an error message when the browser storage quota is hit. */
function saveList(key: string, list: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    notifyDataChanged();
    return null;
  } catch {
    return 'Browser storage is full — remove a graphic (large fonts/images count) or export and delete a packet.';
  }
}

/** All packets INCLUDING tombstones — for the sync engine. Back-fills a stable sync timestamp. */
export function loadAllPackets(): Packet[] {
  return loadList<Packet>(PACKETS_KEY).map((p) => (p.updatedAt ? p : { ...p, updatedAt: BACKFILL_TS }));
}

/** Live packets for the UI (tombstones hidden). */
export function loadPackets(): Packet[] {
  return loadAllPackets().filter((p) => !p.deleted);
}

export function createPacket(name: string): Packet[] {
  const all = loadAllPackets();
  all.push({ id: newId(), name: name.trim() || 'Untitled package', graphics: [], version: 2, updatedAt: nowIso() });
  saveList(PACKETS_KEY, all);
  return all.filter((p) => !p.deleted);
}

/** Create a package and return the new record itself (the Save dialog's "new package" path). */
export function createPacketNamed(name: string): Packet {
  const packet: Packet = { id: newId(), name: name.trim() || 'Untitled package', graphics: [], version: 2, updatedAt: nowIso() };
  const all = loadAllPackets();
  all.push(packet);
  saveList(PACKETS_KEY, all);
  return packet;
}

/** Rename a package. */
export function renamePacket(packetId: string, name: string): Packet[] {
  const all = loadAllPackets();
  const packet = all.find((p) => p.id === packetId && !p.deleted);
  if (packet) {
    packet.name = name.trim() || packet.name;
    packet.updatedAt = nowIso();
    saveList(PACKETS_KEY, all);
  }
  return all.filter((p) => !p.deleted);
}

/**
 * Insert or replace a whole packet by id (used by the Era-5 storage seam's put('packet'), which
 * also writes tombstones on a pulled delete). Preserves the given id, graphics, and deleted flag.
 */
export function upsertPacket(packet: Packet): void {
  const all = loadAllPackets();
  const i = all.findIndex((p) => p.id === packet.id);
  if (i >= 0) all[i] = packet;
  else all.push(packet);
  saveList(PACKETS_KEY, all);
}

/**
 * Save the current graphic into a packet. A graphic with the same NAME in the same
 * packet is replaced (saving twice = updating), so iterating on a show is natural.
 */
export function saveGraphicToPacket(packetId: string, template: SpxTemplate): { packets: Packet[]; error: string | null } {
  const all = loadAllPackets();
  const packet = all.find((p) => p.id === packetId && !p.deleted);
  if (!packet) return { packets: all.filter((p) => !p.deleted), error: 'That packet no longer exists.' };
  const graphic: SavedGraphic = {
    id: newId(),
    name: template.name,
    type: template.type,
    savedAt: new Date().toISOString(),
    template,
  };
  const existing = packet.graphics.findIndex((g) => g.name === template.name);
  if (existing >= 0) packet.graphics[existing] = graphic;
  else packet.graphics.push(graphic);
  packet.updatedAt = nowIso();
  return { packets: all.filter((p) => !p.deleted), error: saveList(PACKETS_KEY, all) };
}

export function removeGraphic(packetId: string, graphicId: string): Packet[] {
  const all = loadAllPackets();
  const packet = all.find((p) => p.id === packetId);
  if (packet) {
    packet.graphics = packet.graphics.filter((g) => g.id !== graphicId);
    packet.updatedAt = nowIso();
  }
  saveList(PACKETS_KEY, all);
  return all.filter((p) => !p.deleted);
}

/** Delete = tombstone (strip payload, keep the id + fresh timestamp) so the delete syncs. */
export function deletePacket(packetId: string): Packet[] {
  const all = loadAllPackets();
  const packet = all.find((p) => p.id === packetId);
  if (packet) {
    packet.deleted = true;
    packet.graphics = [];
    packet.updatedAt = nowIso();
  }
  saveList(PACKETS_KEY, all);
  return all.filter((p) => !p.deleted);
}

// ── Looks (named brand looks) ────────────────────────────────────────────────

export interface SavedLook {
  id: string;
  name: string;
  brand: ProjectBrand;
  /** When the look last changed (ISO). Set on save; drives Era-5 cloud sync (LWW). */
  updatedAt: string;
  /** Soft-delete tombstone (hidden from the UI, kept so the delete syncs). See Packet.deleted. */
  deleted?: boolean;
}

/** All looks INCLUDING tombstones — for the sync engine. Back-fills a stable sync timestamp. */
export function loadAllLooks(): SavedLook[] {
  return loadList<SavedLook>(LOOKS_KEY).map((l) => (l.updatedAt ? l : { ...l, updatedAt: BACKFILL_TS }));
}

/** Live looks for the UI (tombstones hidden). */
export function loadLooks(): SavedLook[] {
  return loadAllLooks().filter((l) => !l.deleted);
}

export function addLook(name: string, brand: ProjectBrand): SavedLook[] {
  const all = loadAllLooks();
  all.push({ id: newId(), name: name.trim() || 'Untitled look', brand, updatedAt: nowIso() });
  saveList(LOOKS_KEY, all);
  return all.filter((l) => !l.deleted);
}

/**
 * Insert or replace a whole look by id (used by the Era-5 storage seam's put('look'), incl. a
 * pulled tombstone). Preserves the given id and deleted flag.
 */
export function upsertLook(look: SavedLook): void {
  const all = loadAllLooks();
  const i = all.findIndex((l) => l.id === look.id);
  if (i >= 0) all[i] = look;
  else all.push(look);
  saveList(LOOKS_KEY, all);
}

/** Delete = tombstone so the delete syncs (see deletePacket). */
export function deleteLook(lookId: string): SavedLook[] {
  const all = loadAllLooks();
  const look = all.find((l) => l.id === lookId);
  if (look) {
    look.deleted = true;
    look.updatedAt = nowIso();
  }
  saveList(LOOKS_KEY, all);
  return all.filter((l) => !l.deleted);
}

/**
 * Drop local tombstones whose updatedAt is older than `beforeIso`. The sync controller calls this
 * with the SAME cutoff it uses to purge the cloud, so a delete is dropped from BOTH sides at once
 * and can't be re-pulled. Writes only when something is actually removed.
 */
export function purgeOldTombstones(beforeIso: string): void {
  const fresh = <T extends { deleted?: boolean; updatedAt: string }>(x: T) => !x.deleted || x.updatedAt >= beforeIso;
  const packets = loadAllPackets();
  const keptP = packets.filter(fresh);
  if (keptP.length !== packets.length) saveList(PACKETS_KEY, keptP);
  const looks = loadAllLooks();
  const keptL = looks.filter(fresh);
  if (keptL.length !== looks.length) saveList(LOOKS_KEY, keptL);
}

/** Import a shared .json look file (shape-checked). Returns the new list or an error. */
export function importLook(json: string): { looks: SavedLook[] | null; error: string | null } {
  try {
    const parsed = JSON.parse(json) as Partial<SavedLook>;
    const brand = parsed.brand as ProjectBrand | undefined;
    if (!parsed.name || !brand?.palette?.accent || !brand.styleTag) {
      return { looks: null, error: 'Not a valid look file (missing name / palette / style).' };
    }
    return { looks: addLook(parsed.name, brand), error: null };
  } catch {
    return { looks: null, error: 'Could not read that file as JSON.' };
  }
}

// ── Capturing + applying a look ──────────────────────────────────────────────

/** The generated @font-face block both bundled and imported fonts carry. */
const FONT_BLOCK_RE = /\/\* (?:Bundled open-source|Imported) font[\s\S]*?\}/;

/**
 * Read the CURRENT template's look (colors straight from its :root vars — including any
 * Style-panel tweaks — plus its font). Falls back to the saved project brand.
 */
export function captureLookFromTemplate(template: SpxTemplate): ProjectBrand {
  const brand = loadBrand();
  const css = template.css;
  const val = (name: string, fallback: string) => getCssVariable(css, name) ?? fallback;

  // The font: match the css font-family against the bundled registry, else treat it as
  // an imported font whose file lives in the template's assets.
  const family = (css.match(/font-family:\s*"([^"]+)"/) || [])[1];
  const bundled = FONTS.find((f) => f.family === family);
  let customFont: CustomFont | null = null;
  if (!bundled && family) {
    const asset = template.assets.find((a) => isFontAsset(a.path));
    if (asset && typeof asset.data === 'string') {
      customFont = { family, format: fontFormatForExt(extOf(asset.path)), asset };
    }
  }

  return {
    styleTag: brand?.styleTag ?? 'minimal',
    palette: {
      id: 'captured',
      name: 'Captured',
      styleTags: [brand?.styleTag ?? 'minimal'],
      accent: val('accent', brand?.palette.accent ?? '#3aa0ff'),
      text: val('text-color', brand?.palette.text ?? '#ffffff'),
      textDim: val('text-dim', brand?.palette.textDim ?? 'rgba(255,255,255,0.7)'),
      panel: val('panel-bg', brand?.palette.panel ?? 'rgba(12,14,18,0.92)'),
    },
    fontId: bundled?.id ?? null,
    customFont,
  };
}

/**
 * Retint an EXISTING template with a look: rewrite the :root color vars and swap the
 * marked @font-face block (bundled or imported). Only the style contract is touched —
 * the user's own code stays intact.
 */
export function applyLookToTemplate(template: SpxTemplate, brand: ProjectBrand): SpxTemplate {
  let css = template.css;
  const setIf = (name: string, value: string) => {
    if (getCssVariable(css, name) !== null) css = setCssVariable(css, name, value);
  };
  setIf('accent', brand.palette.accent);
  setIf('text-color', brand.palette.text);
  setIf('text-dim', brand.palette.textDim);
  setIf('panel-bg', brand.palette.panel);

  let assets = template.assets;
  if (FONT_BLOCK_RE.test(css)) {
    if (brand.customFont) {
      css = css.replace(FONT_BLOCK_RE, customFontFaceCss(brand.customFont));
      setIf('font-heading', customFontStack(brand.customFont));
      // The look carries its font file — bundle it into this template too.
      assets = [...assets.filter((a) => a.path !== brand.customFont!.asset.path), brand.customFont.asset];
    } else if (brand.fontId) {
      const font = fontById(brand.fontId);
      css = css.replace(FONT_BLOCK_RE, fontFaceCss(font));
      setIf('font-heading', fontStack(font));
    }
  }

  return { ...template, css, assets };
}

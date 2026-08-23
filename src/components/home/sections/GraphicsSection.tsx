import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useRouter } from '../../../app/router';
import {
  deleteGraphics,
  graphicFolders,
  setGraphicsFolder,
  type GraphicDoc,
} from '../../../model/library';
import { addGraphicToShow, createShowNamedChecked, loadShows, productionsContaining } from '../../../model/shows';
import { raiseStorageAlert } from '../../../store/storageAlert';
import { loadPrefs, savePrefs } from '../../../model/prefs';
import { commitDurableWrites } from '../../../model/durableStore';
import { graphicKindLabel, type TemplateType } from '../../../model/types';
import GraphicRow from '../GraphicRow';
import RowMenu, { type RowMenuItem } from '../RowMenu';
import { IconFolder, IconGrid, IconList, IconPencil, IconPlus, IconTrash, IconTv } from '../../icons';

type SortKey = 'newest' | 'oldest' | 'name';

/** Plurals the rule below gets wrong. Everything else pluralises the shared kind word, so a
 *  new TemplateType needs no entry here — and one that reads badly gets a line, not a registry. */
const TYPE_PLURAL: Partial<Record<TemplateType, string>> = {
  quiz: 'Quizzes',
  'public-info': 'Public info',
  'starting-soon': 'Holding screens',
  'imported-design': 'Imported',
  blank: 'Custom',
};

/** The filter chip's word: the SAME kind vocabulary the rows show (model/types.ts
 *  graphicKindLabel), pluralised — a chip saying "Countdowns" over rows saying "Timer"
 *  would be two words for one kind on one screen. */
function typeLabel(type: TemplateType): string {
  const named = TYPE_PLURAL[type];
  if (named) return named;
  const label = graphicKindLabel(type);
  const last = label.split(' ').pop() ?? label;
  if (/(s|x|ch|sh)$/.test(last)) return last.endsWith('s') ? label : `${label}es`;
  return `${label}s`;
}

/**
 * The full Graphics section (docs/SAVED_CONTENT_MODEL.md): the flat library with the
 * organisation tools the dashboard's shelf deliberately does not carry —
 *
 * - ONE HEADER ROW (re-design/handoff.md §5b): title, search, sort, view toggle; then the
 *   TYPE chips, derived from the library so only types someone has appear.
 * - FLAT FOLDERS (GraphicDoc.folder, one level): cards in the card grid, chips in the table;
 *   a folder view can become a production in one click. Folders are the light sorting layer,
 *   deliberately not the retired packages — no export unit, no embedded copies.
 * - MULTI-SELECT: pip + shift-click range over the VISIBLE order, with one bulk bar
 *   (delete, move to folder, add to production, new production from selection). Selection is
 *   UI state over ids; every mutation goes through the model layer's bulk helpers so N rows
 *   cost one storage write.
 */
export default function GraphicsSection({
  graphics,
  query,
  onQuery,
  onOpen,
  onChanged,
  onPublish,
}: {
  /** Already search-filtered by HomePage — this section applies type, folder and sort on top. */
  graphics: GraphicDoc[];
  /** The search box lives in this section's header row, but the query filters in HomePage
   *  (the dashboard searches with the same one), so it arrives as a controlled value. */
  query: string;
  onQuery: (next: string) => void;
  onOpen: (g: GraphicDoc) => void;
  onChanged: () => void;
  onPublish?: (g: GraphicDoc) => void;
}) {
  const navigate = useRouter((s) => s.navigate);
  // Cards or table. Device-level and remembered (model/prefs.ts) — which one is right
  // depends on the library's size and the screen, so it is a setting, not a session state.
  const [view, setViewState] = useState<'grid' | 'list'>(() => loadPrefs().libraryView);
  const setView = (next: 'grid' | 'list') => {
    setViewState(next);
    savePrefs({ libraryView: next });
  };
  /** null = All; '' = the virtual Unfiled chip; a name = that folder. */
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  /** null = every type. The chips are DERIVED from the library, so only types someone
   *  actually has appear - a fixed strip would offer 24 filters, most of them empty. */
  const [typeFilter, setTypeFilter] = useState<TemplateType | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const types = useMemo(() => {
    const counts = new Map<TemplateType, number>();
    for (const g of graphics) counts.set(g.type, (counts.get(g.type) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || typeLabel(a[0]).localeCompare(typeLabel(b[0])));
  }, [graphics]);
  // `graphics` is the refresh signal, not an input: graphicFolders() reads the model layer
  // fresh, and the prop changing is what says the library changed (HomePage's rev idiom).
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const folders = useMemo(() => graphicFolders(), [graphics]);
  /** Type, then folder, then sort. The order matters for the CHIP COUNTS: they count the
   *  whole (search-filtered) library, so picking one never renumbers the others under the
   *  pointer, while the folder counts follow the type in view. */
  const listed = useMemo(() => {
    let out = typeFilter ? graphics.filter((g) => g.type === typeFilter) : graphics;
    if (folderFilter !== null) {
      out = out.filter((g) => (folderFilter === '' ? !g.folder : g.folder === folderFilter));
    }
    const by: Record<SortKey, (a: GraphicDoc, b: GraphicDoc) => number> = {
      newest: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      oldest: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...out].sort(by[sort]);
  }, [graphics, typeFilter, folderFilter, sort]);

  // A folder the user has NAMED but not filled yet. Folders are a name on their graphics, so
  // an empty one has nothing to persist; it lives here until something lands in it (the same
  // ephemeral-empty-folder rule the Assets panel follows) and is gone on reload.
  const [draftFolders, setDraftFolders] = useState<string[]>([]);
  const allFolders = useMemo(
    () => [...new Set([...folders, ...draftFolders])].sort((a, b) => a.localeCompare(b)),
    [folders, draftFolders],
  );
  const countIn = (folder: string) => graphics.filter((g) => g.folder === folder).length;

  // ── Selection: ids + the last toggled index, for shift ranges over the visible order. ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIndex = useRef<number | null>(null);
  const selectedListed = listed.filter((g) => selected.has(g.id));
  const clearSelection = () => {
    setSelected(new Set());
    lastIndex.current = null;
  };
  const toggle = (index: number, shiftKey: boolean) => {
    // Read the anchor BEFORE scheduling: the state updater runs after this function has
    // already advanced lastIndex to the clicked row, so reading the ref inside it compared
    // the click against itself and every shift-range degraded to a plain toggle.
    const anchor = lastIndex.current;
    lastIndex.current = index;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && anchor !== null && anchor !== index) {
        // Range = anchor..index over the list as displayed; the anchor's current state
        // decides whether the range selects or clears (the convention file managers use).
        const adding = next.has(listed[anchor]?.id ?? '');
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (let i = from; i <= to; i++) {
          const id = listed[i]?.id;
          if (!id) continue;
          if (adding) next.add(id);
          else next.delete(id);
        }
      } else {
        const id = listed[index]?.id;
        if (id) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
      }
      return next;
    });
  };

  // ── Bulk actions (each closes its popover; the model layer announces the change). ──
  const [note, setNote] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [prodOpen, setProdOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');

  const ids = () => selectedListed.map((g) => g.id);

  const doDelete = () => {
    const inProductions = selectedListed.filter((g) => productionsContaining(g.id).length > 0).length;
    deleteGraphics(ids());
    setNote(
      `✓ Deleted ${selectedListed.length} graphic${selectedListed.length === 1 ? '' : 's'}.` +
        (inProductions
          ? ` ${inProductions} of them were in productions — those keep their own embedded copy and stay operable.`
          : ''),
    );
    setDeleteArmed(false);
    clearSelection();
    onChanged();
  };

  /** Every folder write goes through here. The durable store ACCEPTS a write and confirms it a
   *  moment later (model/durableStore.ts), so the synchronous answer means accepted, not
   *  landed — and each of these verbs then tells the user what happened. */
  const claim = async (action: string, written: string | null, ok: string) => {
    const error = written ?? (await commitDurableWrites());
    if (error) raiseStorageAlert({ action, error, outcome: 'Your graphics are unchanged in the library.' });
    else setNote(ok);
    onChanged();
  };

  const moveTo = async (folder: string | undefined) => {
    const count = selectedListed.length;
    const written = setGraphicsFolder(ids(), folder);
    setFolderOpen(false);
    setNewFolder('');
    clearSelection();
    await claim(
      `Moving ${count} graphics to ${folder ? `“${folder}”` : 'Unfiled'}`,
      written,
      `✓ Moved ${count} to ${folder ? `"${folder}"` : 'Unfiled'}.`,
    );
  };

  // ── The FOLDERS band's own verbs (grid view). Every one of them is setGraphicsFolder over
  //    the folder's members — there is no folder record to rename, delete, or orphan. ──
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const idsIn = (folder: string) => graphics.filter((g) => g.folder === folder).map((g) => g.id);

  const commitFolderRename = async (from: string) => {
    const to = folderName.trim();
    setRenamingFolder(null);
    if (!to || to === from) return;
    const written = setGraphicsFolder(idsIn(from), to);
    setDraftFolders((d) => d.map((f) => (f === from ? to : f)));
    if (folderFilter === from) setFolderFilter(to);
    await claim(`Renaming the folder “${from}”`, written, `✓ Renamed "${from}" to "${to}".`);
  };

  const removeFolder = async (folder: string) => {
    const written = setGraphicsFolder(idsIn(folder), undefined);
    setDraftFolders((d) => d.filter((f) => f !== folder));
    if (folderFilter === folder) setFolderFilter(null);
    await claim(
      `Removing the folder “${folder}”`,
      written,
      `✓ Removed the folder "${folder}". Its graphics are unfiled, not deleted.`,
    );
  };

  const commitNewFolder = () => {
    const name = newFolder.trim();
    setNewFolderOpen(false);
    setNewFolder('');
    if (!name) return;
    // With a selection standing, naming a folder is the same gesture as filing into it.
    if (selectedListed.length > 0) void moveTo(name);
    else setDraftFolders((d) => (d.includes(name) ? d : [...d, name]));
  };

  /** A graphic dropped on a folder card. Dropping one that is part of the standing selection
   *  moves the WHOLE selection - dragging one of six ticked rows means all six, the way a file
   *  manager does it - and dropping an unticked one moves just that graphic. */
  const dropInto = async (e: DragEvent, folder: string) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData('application/x-noacg-graphic');
    if (!id) return;
    const moving = selected.has(id) ? ids() : [id];
    const written = setGraphicsFolder(moving, folder);
    clearSelection();
    await claim(
      `Moving ${moving.length} graphics to “${folder}”`,
      written,
      `✓ Moved ${moving.length} to "${folder}".`,
    );
  };

  const folderMenu = (folder: string): RowMenuItem[] => [
    {
      label: 'Rename',
      icon: <IconPencil />,
      onClick: () => { setFolderName(folder); setRenamingFolder(folder); },
      testid: 'rename-folder',
    },
    {
      label: 'Create production from it',
      icon: <IconTv />,
      onClick: () => void createProductionFrom(graphics.filter((g) => g.folder === folder), folder),
      testid: 'folder-card-to-production',
    },
    {
      label: 'Remove folder',
      icon: <IconTrash />,
      onClick: () => void removeFolder(folder),
      testid: 'remove-folder',
    },
  ];

  /** Pool every selected graphic, stopping at the FIRST failure and saying how far it got - a
   *  bulk add that reported "✓ Added 12" after storing three would be worse than the silence it
   *  replaces. Returns how many actually landed. */
  const poolAll = async (showId: string, showName: string, list: GraphicDoc[]): Promise<number> => {
    let added = 0;
    for (const g of list) {
      const { error: written } = addGraphicToShow(showId, g.template, { graphicId: g.id });
      // Confirmed per graphic (model/durableStore.ts's claim protocol): "stop at the first
      // failure and say how far it got" only means anything if each add is actually known to
      // have landed before the next one is attempted.
      const error = written ?? (await commitDurableWrites());
      if (error) {
        raiseStorageAlert({
          action: `Adding ${list.length} graphics to “${showName}”`,
          error,
          outcome:
            added === 0
              ? 'Nothing was added. Your graphics are unchanged in the library.'
              : `${added} of ${list.length} were added before storage ran out; the rest are unchanged in your library.`,
        });
        return added;
      }
      added += 1;
    }
    return added;
  };

  const addAllTo = async (showId: string, showName: string) => {
    const added = await poolAll(showId, showName, selectedListed);
    if (added === selectedListed.length) setNote(`✓ Added ${added} to "${showName}".`);
    setProdOpen(false);
    clearSelection();
    onChanged();
  };

  const createProductionFrom = async (list: GraphicDoc[], name: string) => {
    const { show, error: written } = createShowNamedChecked(name);
    const error = written ?? (await commitDurableWrites());
    if (error) {
      raiseStorageAlert({
        action: `Creating the production “${show.name}”`,
        error,
        outcome: 'Your graphics are unchanged in the library.',
      });
      return;
    }
    // The kit flow's primitive: one production, every graphic pooled in list order.
    const added = await poolAll(show.id, show.name, list);
    onChanged();
    if (added > 0) navigate({ view: 'production', id: show.id });
  };

  return (
    <>
      {/* ONE header row (re-design/handoff.md §5b): what this is, what to find in it, how to
          order it, how to look at it. GRID or LIST swaps only the item container — chrome,
          selection, folders and the bulk bar are identical either way, which is what keeps
          this a view preference rather than a second screen. */}
      <div className="lib-viewbar">
        <h2><IconGrid size={18} /> Graphics <span className="muted">({graphics.length})</span></h2>
        <input
          className="lib-search"
          placeholder="Search graphics…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          data-testid="home-search"
        />
        <div className="spacer" />
        <label className="lib-sort">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} data-testid="library-sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <div className="lib-viewtoggle" role="group" aria-label="Library view">
          <button
            className={view === 'grid' ? 'active' : ''}
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
            title="Cards"
            data-testid="library-view-grid"
          >
            <IconGrid />
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            title="List"
            data-testid="library-view-list"
          >
            <IconList />
          </button>
        </div>
      </div>

      {/* FOLDERS. Two presentations of one thing (re-design/handoff.md §5b/§5c): the card grid
          gets CARDS, because a folder is a container you put things into and a card is a place
          to drop them; the table gets the chips, where a second grid above a grid would push
          the first row of data off the fold. Both derive from the data, so an emptied folder
          disappears by itself. */}
      {/* TYPE chips, derived from the library. One type is no filter at all, so they appear
          from two — a strip reading "All 6 · Lower thirds 6" narrows nothing and costs a row. */}
      {types.length > 1 && (
        <div className="lib-typechips" data-testid="type-chips">
          <button
            className={`lib-type-chip${typeFilter === null ? ' active' : ''}`}
            onClick={() => { setTypeFilter(null); clearSelection(); }}
            data-testid="type-chip-all"
          >
            All <span className="lib-chip-count">{graphics.length}</span>
          </button>
          {types.map(([type, count]) => (
            <button
              key={type}
              className={`lib-type-chip${typeFilter === type ? ' active' : ''}`}
              onClick={() => { setTypeFilter(typeFilter === type ? null : type); clearSelection(); }}
              data-testid={`type-chip-${type}`}
            >
              {typeLabel(type)} <span className="lib-chip-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* The band stands whether or not a folder exists yet — the dashed card IS how the first
          one is made, and hiding it until one exists leaves the feature reachable only from a
          bulk-bar menu that needs a selection first. It stands down on an empty library, where
          there is nothing to file. */}
      {view === 'grid' && graphics.length > 0 && (
        <>
          <div className="lib-band-head">
            <h3>Folders</h3>
            <span className="hint">drag graphics here, or select them and use Folder</span>
          </div>
          <div className="lib-folder-cards" data-testid="folder-cards">
            {allFolders.map((f) => (
              <div
                key={f}
                className={`lib-folder-card${folderFilter === f ? ' active' : ''}${dropTarget === f ? ' dropping' : ''}`}
                onClick={() => { setFolderFilter(folderFilter === f ? null : f); clearSelection(); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(f); }}
                onDragLeave={() => setDropTarget((t) => (t === f ? null : t))}
                onDrop={(e) => void dropInto(e, f)}
                data-testid={`folder-card-${f}`}
              >
                <span className="lib-folder-mark"><IconFolder /></span>
                <div className="lib-folder-info">
                  {renamingFolder === f ? (
                    <input
                      autoFocus
                      value={folderName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setFolderName(e.target.value)}
                      onBlur={() => void commitFolderRename(f)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitFolderRename(f);
                        if (e.key === 'Escape') setRenamingFolder(null);
                      }}
                      data-testid="folder-rename-input"
                    />
                  ) : (
                    <strong>{f}</strong>
                  )}
                  <span className="muted">{countIn(f)} graphic{countIn(f) === 1 ? '' : 's'}</span>
                </div>
                <RowMenu items={folderMenu(f)} />
              </div>
            ))}
            {/* The dashed card. A folder is only a NAME on its graphics (model/library.ts), so
                a brand-new one has no record to write yet — it lives here until something is
                moved into it, exactly as an empty asset folder does in the Assets panel. */}
            <div className="lib-folder-card lib-folder-new" data-testid="new-folder-card">
              {newFolderOpen ? (
                <input
                  autoFocus
                  value={newFolder}
                  placeholder="Folder name…"
                  onChange={(e) => setNewFolder(e.target.value)}
                  onBlur={() => commitNewFolder()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNewFolder();
                    if (e.key === 'Escape') { setNewFolderOpen(false); setNewFolder(''); }
                  }}
                  data-testid="new-folder-name"
                />
              ) : (
                <button className="link-inline" onClick={() => setNewFolderOpen(true)} data-testid="new-folder">
                  + New folder
                </button>
              )}
            </div>
          </div>
        </>
      )}
      {view === 'list' && folders.length > 0 && (
        <div className="lib-folders" data-testid="folder-chips">
          <button className={`lib-folder-chip${folderFilter === null ? ' active' : ''}`} onClick={() => { setFolderFilter(null); clearSelection(); }}>
            All ({graphics.length})
          </button>
          {folders.map((f) => (
            <button
              key={f}
              className={`lib-folder-chip${folderFilter === f ? ' active' : ''}`}
              onClick={() => { setFolderFilter(f); clearSelection(); }}
              data-testid={`folder-chip-${f}`}
            >
              <IconFolder /> {f} ({graphics.filter((g) => g.folder === f).length})
            </button>
          ))}
          <button className={`lib-folder-chip${folderFilter === '' ? ' active' : ''}`} onClick={() => { setFolderFilter(''); clearSelection(); }}>
            Unfiled ({graphics.filter((g) => !g.folder).length})
          </button>
        </div>
      )}

      {/* A folder view is one click from being a production — the second door the ask named. */}
      {folderFilter ? (
        <div className="lib-folder-head" data-testid="folder-head">
          <span className="muted">
            Folder · {listed.length} graphic{listed.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => void createProductionFrom(listed, folderFilter)}
            disabled={listed.length === 0}
            title={`One production named "${folderFilter}" with every graphic of this folder`}
            data-testid="folder-to-production"
          >
            <IconTv /> Create production from this folder
          </button>
        </div>
      ) : null}

      {note && <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} data-testid="bulk-note">{note}</p>}

      {/* Clicking the empty space around the items clears the selection — the third gesture
          of the selection model, and the one that makes the other two safe to try. */}
      <div
        className={view === 'grid' ? 'lib-grid' : 'lib-list'}
        onClick={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
      >
        {/* The table's column headings (re-design/handoff.md §5c). Decorative: this is a grid
            of divs, not a <table>, so a header row conveys nothing to a screen reader that the
            cells do not already say — every cell carries its own testid and readable text. */}
        {view === 'list' && listed.length > 0 && (
          <div className="lib-thead" aria-hidden="true" data-testid="library-thead">
            <span>Preview</span>
            <span>Name</span>
            <span>Type</span>
            <span>Edited</span>
            <span>Folder</span>
            <span />
            <span />
          </div>
        )}
        {listed.map((g, i) => (
          <GraphicRow
            key={g.id}
            g={g}
            view={view}
            onOpen={onOpen}
            onChanged={onChanged}
            onPublish={onPublish}
            selected={selected.has(g.id)}
            onToggleSelect={(shiftKey) => toggle(i, shiftKey)}
          />
        ))}
      </div>

      {/* The bulk bar comes AFTER the items, which is what makes `position: sticky; bottom`
          float it over the bottom of the viewport: a sticky element only lifts off when its
          natural place is out of view, and above the list its natural place is the top. */}
      {selectedListed.length > 0 && (
        <div className="lib-bulkbar" data-testid="bulk-bar">
          <strong>{selectedListed.length} selected</strong>
          <button
            className="link-inline"
            onClick={() => {
              setSelected(new Set(listed.map((g) => g.id)));
              lastIndex.current = null;
            }}
          >
            Select all {listed.length}
          </button>

          <div className="spacer" />

          <div className="lib-menu-host">
            <button onClick={() => { setProdOpen((o) => !o); setFolderOpen(false); }} aria-expanded={prodOpen} data-testid="bulk-add-production">
              <IconPlus /> Production
            </button>
            {prodOpen && (
              <>
                <div className="lib-menu-backdrop" onClick={() => setProdOpen(false)} />
                <div className="lib-menu" role="menu" data-testid="bulk-production-menu">
                  {loadShows().map((s) => (
                    <button key={s.id} role="menuitem" onClick={() => void addAllTo(s.id, s.name)}>
                      <IconTv /> {s.name}
                    </button>
                  ))}
                  <div className="lib-menu-new">
                    <input
                      value={newProdName}
                      placeholder="New production…"
                      onChange={(e) => setNewProdName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newProdName.trim()) void createProductionFrom(selectedListed, newProdName.trim());
                      }}
                      data-testid="bulk-new-production-name"
                    />
                    <button
                      disabled={!newProdName.trim()}
                      onClick={() => void createProductionFrom(selectedListed, newProdName.trim())}
                      data-testid="bulk-new-production"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="lib-menu-host">
            <button onClick={() => { setFolderOpen((o) => !o); setProdOpen(false); }} aria-expanded={folderOpen} data-testid="bulk-move-folder">
              <IconFolder /> Folder
            </button>
            {folderOpen && (
              <>
                <div className="lib-menu-backdrop" onClick={() => setFolderOpen(false)} />
                <div className="lib-menu" role="menu" data-testid="bulk-folder-menu">
                  {folders.map((f) => (
                    <button key={f} role="menuitem" onClick={() => void moveTo(f)}>
                      <IconFolder /> {f}
                    </button>
                  ))}
                  <button role="menuitem" onClick={() => void moveTo(undefined)} data-testid="bulk-unfile">
                    Remove from folder
                  </button>
                  <div className="lib-menu-new">
                    <input
                      value={newFolder}
                      placeholder="New folder…"
                      onChange={(e) => setNewFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolder.trim()) void moveTo(newFolder.trim());
                      }}
                      data-testid="bulk-new-folder-name"
                    />
                    <button disabled={!newFolder.trim()} onClick={() => void moveTo(newFolder.trim())} data-testid="bulk-new-folder">
                      Move
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            className="destructive"
            onClick={() => (deleteArmed ? doDelete() : setDeleteArmed(true))}
            title={
              deleteArmed
                ? 'Click again to delete — productions using any of them keep their own copy'
                : 'Delete the selected graphics'
            }
            data-testid="bulk-delete"
          >
            <IconTrash /> {deleteArmed ? `Delete ${selectedListed.length}?` : 'Delete'}
          </button>

          <button onClick={clearSelection} title="Clear the selection" data-testid="bulk-clear">✕</button>
        </div>
      )}
    </>
  );
}

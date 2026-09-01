import { useEffect, useRef, useState } from 'react';
import { createShow, deleteShow, type Show } from '../../../model/shows';
import { outputPageUrl } from '../../../control/hostedControl';
import { installPack, parsePack } from '../../../packs/graphicsPack';
import { trackEvent } from '../../../backend/events';
import { copyLink } from '../copyLink';
import ProductionExportDialog from '../ProductionExportDialog';
import GraphicThumb from '../GraphicThumb';
import RowMenu from '../RowMenu';
import { useTeamsUi } from '../../teams/teamsUi';
import { useTeamsAvailable } from '../../teams/useTeamsAvailable';
import { IconDownload, IconLink, IconTrash, IconTv, IconUpload, IconUsers } from '../../icons';

/** One entry of `/packs/index.json` — the packs this build ships ready to install. */
interface BuiltInPack {
  file: string;
  name: string;
  description: string;
}

/**
 * The Productions section — Home's LEAD (docs/GOALS_ARCHIVE.md "Student release" step 8): a production
 * is the unit that airs, so the dashboard door and the output URL are the two things one click
 * away. Everything about one production (graphics, cues, publish, operating) lives on its own
 * page at #/production/<id>.
 */
export default function ProductionsSection({
  productions,
  onOpen,
  onChanged,
  limit,
  heading = true,
}: {
  productions: Show[];
  onOpen: (p: Show) => void;
  onChanged: () => void;
  /** Dashboard mode shows the top few; the full section shows everything. */
  limit?: number;
  heading?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // The team door (docs/TEAMS_PLAN.md §6). `useTeamsAvailable` is false offline AND signed out,
  // so this section grows no overflow menu at all in those builds - which is the rule that "a
  // user who never opens the door never sees the word team" is made of.
  const teamsAvailable = useTeamsAvailable();
  const openShare = useTeamsUi((s) => s.openShare);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [exportShow, setExportShow] = useState<Show | null>(null);
  // The pack door's state: which pack is installing, the outcome line, the shipped list.
  const [packBusy, setPackBusy] = useState<string | null>(null);
  const [packNote, setPackNote] = useState<string | null>(null);
  const [builtIn, setBuiltIn] = useState<BuiltInPack[]>([]);
  const packInput = useRef<HTMLInputElement>(null);
  const shown = limit ? productions.slice(0, limit) : productions;
  const create = () => {
    const next = createShow(newName);
    setNewName('');
    onChanged();
    const made = next[next.length - 1];
    if (made) onOpen(made);
  };

  // The packs this build ships (public/packs/index.json). Dashboard mode (`limit`) hides the
  // import card, so only the full section pays for the fetch; a build with no packs, or a
  // fetch that fails, degrades to the file door alone.
  useEffect(() => {
    if (limit) return;
    let stale = false;
    void fetch('/packs/index.json')
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : []))
      .then((list) => {
        if (stale || !Array.isArray(list)) return;
        setBuiltIn(
          list.filter(
            (p): p is BuiltInPack =>
              typeof p === 'object' && p !== null &&
              typeof (p as BuiltInPack).file === 'string' &&
              typeof (p as BuiltInPack).name === 'string',
          ),
        );
      })
      .catch(() => undefined);
    return () => { stale = true; };
  }, [limit]);

  /** Parse, validate and install one pack's text; land on the new production's dashboard. */
  const importPackText = async (label: string, text: string) => {
    setPackBusy(label);
    setPackNote(null);
    try {
      const { pack, error } = parsePack(text);
      if (!pack) throw new Error(error ?? 'That file is not a NoaCG graphics pack.');
      const show = await installPack(pack);
      trackEvent('activation', 'pack');
      onChanged();
      onOpen(show);
    } catch (error) {
      setPackNote(error instanceof Error ? error.message : String(error));
    } finally {
      setPackBusy(null);
    }
  };

  const importPackFile = async (file: File | undefined) => {
    if (!file) return;
    await importPackText(file.name, await file.text());
  };

  const installBuiltIn = async (pack: BuiltInPack) => {
    setPackBusy(pack.file);
    setPackNote(null);
    try {
      const response = await fetch(`/packs/${pack.file}`);
      if (!response.ok) throw new Error('The pack could not be loaded.');
      await importPackText(pack.file, await response.text());
    } catch (error) {
      setPackNote(error instanceof Error ? error.message : String(error));
      setPackBusy(null);
    }
  };
  return (
    <>
      {heading && (
        <>
          <h2><IconTv size={18} /> Productions</h2>
          <p className="hint">
            A production is the live unit: its graphics, a prepared CUE rundown, one persistent
            browser-<strong>output URL</strong> for CasparCG/OBS/vMix, and one <strong>control
            page</strong> for operating — see each production’s page for all of it.
          </p>
        </>
      )}
      {productions.length === 0 && (
        <p className="hint" data-testid="no-productions">No productions yet — name one below, then add graphics and cues.</p>
      )}
      {/* CARDS, not rows (re-design/handoff.md §5a). A production is the unit that airs — it
          has a state, a size, and a set of graphics — and a one-line row could show none of
          that. The card leads with its name and whether it is published, then what is in it,
          then a strip of the graphics themselves, then the ways to open and take it away. */}
      <div className="prod-grid">
        {shown.map((r) => (
          <div
            className={`prod-card${r.hostedSlug ? ' live' : ''}`}
            key={r.id}
            data-testid={`production-row-${r.id}`}
          >
            <div className="prod-card-head">
              {/* The NAME is the card's own door — reaching for "Open dashboard" for every
                  open was an acceptance-round papercut. */}
              <button
                className="lib-name-link"
                onClick={() => onOpen(r)}
                title={`Open "${r.name}"`}
                data-testid="open-production-name"
              >
                <strong>{r.name}</strong>
              </button>
              <span className={`prod-badge${r.hostedSlug ? ' live' : ''}`}>
                {r.hostedSlug ? '● Live' : 'Idle'}
              </span>
              <div className="spacer" />
              {confirmDelete === r.id ? (
                <button
                  className="destructive"
                  onClick={() => { deleteShow(r.id); setConfirmDelete(null); onChanged(); }}
                  title="Delete this production (its graphics stay saved wherever else they live)"
                >
                  Delete?
                </button>
              ) : (
                <button onClick={() => setConfirmDelete(r.id)} title="Delete this production" aria-label={`Delete ${r.name}`}>
                  <IconTrash />
                </button>
              )}
              {/* The overflow menu exists only when it has something in it. Delete stays a
                  visible button: it is this card's oldest action and moving it would relocate a
                  control people already know for the sake of tidiness. */}
              {teamsAvailable && (
                <RowMenu
                  label={`More actions for ${r.name}`}
                  items={[
                    {
                      label: 'Share with a team…',
                      icon: <IconUsers />,
                      onClick: () => openShare(r.id, r.name),
                      testid: 'share-with-team',
                    },
                  ]}
                />
              )}
            </div>

            <p className="prod-card-stats">
              {r.graphics.length} graphic{r.graphics.length === 1 ? '' : 's'}
              {r.cues?.length ? ` · ${r.cues.length} cue${r.cues.length === 1 ? '' : 's'}` : ''}
            </p>

            {/* What is actually in it. Four is the strip's width, and the remainder is
                counted rather than dropped silently. */}
            {r.graphics.length > 0 && (
              <div className="prod-card-strip">
                {r.graphics.slice(0, 4).map((g) => (
                  <GraphicThumb key={g.id} template={g.template} label={g.name} />
                ))}
                {r.graphics.length > 4 && (
                  <span className="prod-card-more">+{r.graphics.length - 4}</span>
                )}
              </div>
            )}

            <div className="prod-card-actions">
              <button className="primary" onClick={() => onOpen(r)} data-testid="open-production">
                Open dashboard
              </button>
              {r.outputSlug && (
                <button
                  onClick={() => {
                    void copyLink(outputPageUrl(r.outputSlug!)).then((ok) => {
                      if (!ok) return;
                      setCopiedLink(r.id);
                      setTimeout(() => setCopiedLink((c) => (c === r.id ? null : c)), 2000);
                    });
                  }}
                  title="Copy the browser-output URL (the one your playout client loads)"
                  data-testid="copy-production-output"
                >
                  {copiedLink === r.id ? '✓ Copied' : <><IconLink /> Output URL</>}
                </button>
              )}
              <button
                onClick={() => setExportShow(r)}
                disabled={r.graphics.length === 0}
                title="Export every graphic of this production — OGraf, CasparCG, SPX, OBS/vMix overlay, H2R, LiveOS"
                aria-label={`Export ${r.name}`}
                data-testid="export-production-row"
              >
                <IconDownload />
              </button>
            </div>
          </div>
        ))}
        {/* The way to make one, as the grid's last card — the reference's dashed slot. A
            create row above the list read as a stray form; here it is one of the choices. */}
        <div className="prod-card prod-card-new">
          <strong>New production</strong>
          <p className="prod-card-stats">Name it, add graphics, publish for a live URL.</p>
          <div className="spacer" />
          <input
            value={newName}
            placeholder="Production name…"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) create(); }}
            data-testid="new-production-name"
          />
          <button
            className="primary"
            disabled={!newName.trim()}
            onClick={create}
            data-testid="new-production"
          >
            ＋ Create
          </button>
        </div>
        {/* The pack door — a finished multi-graphic package installs as a ready production
            (src/packs/graphicsPack.ts). Dashboard mode hides it; the full section is where a
            production is set up. Shipped packs list first; any downloaded pack file imports
            through the same parser. */}
        {!limit && (
          <div className="prod-card prod-card-new" data-testid="import-pack-card">
            <strong>Import a package</strong>
            <p className="prod-card-stats">
              A finished graphics package — installs as a production with its cue rundown and
              layers ready to operate.
            </p>
            {builtIn.map((pack) => (
              <div className="pack-row" key={pack.file}>
                <div className="lib-info">
                  <strong>{pack.name}</strong>
                  {pack.description && <span className="muted">{pack.description}</span>}
                </div>
                <button
                  className="primary"
                  disabled={packBusy !== null}
                  onClick={() => void installBuiltIn(pack)}
                  data-testid={`install-pack-${pack.file}`}
                >
                  {packBusy === pack.file ? 'Installing…' : 'Install'}
                </button>
                <a
                  href={`/packs/${pack.file}`}
                  download={pack.file}
                  title={`Download ${pack.name} as a shareable pack file`}
                  aria-label={`Download ${pack.name}`}
                >
                  <IconDownload />
                </a>
              </div>
            ))}
            <div className="spacer" />
            <input
              ref={packInput}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => { void importPackFile(e.target.files?.[0]); e.target.value = ''; }}
              data-testid="import-pack-file"
            />
            <button
              disabled={packBusy !== null}
              onClick={() => packInput.current?.click()}
              title="Import a downloaded .noacgpack.json file"
            >
              <IconUpload /> Import a pack file…
            </button>
            {packNote && <p className="status-bad">{packNote}</p>}
          </div>
        )}
      </div>
      {exportShow && <ProductionExportDialog show={exportShow} onClose={() => setExportShow(null)} />}
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { routeHash, useRouter, type ProductionSub } from '../../app/router';
import { useTemplateStore } from '../../store/templateStore';
import {
  addGraphicToShow,
  addShowCue,
  duplicateLayers,
  graphicLayer,
  loadShows,
  MAX_PLAYOUT_LAYER,
  MIN_PLAYOUT_LAYER,
  moveShowCue,
  nextFreeLayer,
  removeShowCue,
  removeShowGraphic,
  setShowGraphicLayer,
  setShowAudienceSlugs,
  setShowHostedSlug,
  setShowOutputSlug,
  updateShowCue,
  type Show,
  type ShowCue,
} from '../../model/shows';
import { graphicKindLabel, type Resolution } from '../../model/types';
import {
  diffResolved,
  replacementPatch,
  resolveBindings,
  type JsonObject,
  type ResolvedValues,
} from '../../model/productionData';
import { loadLiveData, saveLiveData, PRODUCTION_DATA_KEY } from '../../model/productionState';
import { fetchProductionData, patchProductionData, productionDataKey } from '../../control/productionDataApi';
import { DEFAULT_GRAPHICS_RESOLUTION } from '../../model/projectFormat';
import { outputEmbedFileName, outputEmbedHtml } from '../../export/outputEmbed';
import { revealCue, stepSelection, usePlayoutVerbKeys, type PlayoutVerb } from '../playoutKeys';
import { cueDataRows, hasSideFields, nextRow, rowsForSide } from '../../control/cueData';
import { groupCueFields, groupHeading } from '../../control/cueFieldGroups';
import ProductionDataWorkspace from './ProductionDataWorkspace';
import ProductionAudienceWorkspace from './ProductionAudienceWorkspace';
import { loadGraphics, templateForSavedGraphic } from '../../model/library';
import {
  adjustWords,
  controlSections,
  eventButtons,
  eventLegality,
  eventPayload,
  fieldDescriptors,
  formatMachineState,
  isEventLegal,
  machineStateGroups,
  machineStateNames,
  overflowNote,
  type ControlButton,
} from '../../control/controlModel';
import {
  clearAllCueBatches,
  clearCueItems,
  controlOutputSeenAt,
  controlPageUrl,
  controlShowBySlug,
  followControlLog,
  hostedControlTail,
  joinPageUrl,
  presenterPageUrl,
  claimJoinName,
  outputPageUrl,
  publishControlShow,
  sendHostedControlBatch,
  takeCueItems,
  unpublishControlShow,
  withLiveCue,
  type ControlSendItem,
  type LiveCueMap,
  type ResolvedControlShow,
} from '../../control/hostedControl';
import { appendLogEntries, describeLogRow, logTime, type LogEntry } from '../../control/eventLog';
import {
  clockRowEffect,
  clockSpecFromHtml,
  clockValueAfterUpdate,
  speakingClockRowEffect,
  speakingClocksFromHtml,
  type ClockSpec,
  type SpeakingClockPair,
} from '../../control/matchClockWire';
import ProgramStage, { type ProgramStageHandle } from './ProgramStage';
import { composeDocument } from '../../preview/composeDocument';
import { postPreviewCmd, PREVIEW_STATE_TYPE, type PreviewStateMessage } from '../../preview/previewProtocol';
import { isBackendConfigured } from '../../backend/config';
import { useAuthState } from '../auth/useAuthState';
import { useAuthUi } from '../auth/authUi';
import ProductionExportDialog from './ProductionExportDialog';
import { FieldRow } from '../fields/FieldControl';
import { isImageAsset } from '../../assets/assetUtils';
import { importImageFile } from '../../assets/imageImport';
import {
  addPictureToTemplate,
  createPictureTemplate,
  MAX_PICTURES,
  PICTURE_FIELD,
  PICTURE_GRAPHIC_NAME,
  pictureLabel,
} from '../../templates/picture';
import BrandLogo from '../BrandLogo';
import LibMenu from './LibMenu';
import { copyLink } from './copyLink';
import { IconDownload, IconLink, IconTv } from '../icons';
// Deliberately last rather than beside the other control/ imports: this file's import head is a
// hot spot two branches at a time edit, and the only merge conflict CasparCG Connect imposed on
// anything in flight was this one statement landing in the same place as somebody else's.
import {
  airOnCaspar,
  casparAddress,
  casparConfigured,
  loadCasparSettings,
  stopOnCaspar,
  type CasparResult,
} from '../../control/casparLink';

/** The selected cue's UNSAVED edits: local echo for instant typing, flushed to the record on a
 *  300 ms idle (a keystroke must not parse + rewrite the whole shows store — the store embeds
 *  full template snapshots, so that is a visible input-lag class of cost). */
interface CueDraft {
  cueId: string;
  label: string;
  note: string;
  values: Record<string, string>;
}

/** How far behind the log head the action log seeds its history. Global ids mean this is a
 *  ceiling on rows READ, not on rows shown — a busy instance yields fewer of this show's. */
const LOG_HISTORY_SPAN = 400;

/** Elapsed-time formatting for the header clock: how long this session has been in SHOW. */
function elapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** "A, B and C" — a warning an operator reads under pressure has to be a sentence. */
function nameList(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * THE PLAYOUT DASHBOARD (route `#/production/<id>`) — the surface an operator runs a production
 * from. Its design contract is **docs/PLAYOUT_DASHBOARD.md**; the hosted control page and the
 * exported controller render the same one, and a change here that is not in that doc is a
 * divergence.
 *
 * The job, in one line: **choose a cue → look at it on PREVIEW → TAKE**. Selecting a cue in the
 * rundown IS the preview gesture; nothing about it touches air. Take airs what is on preview.
 *
 * Two monitors, both real: PREVIEW composes the selected cue's graphic locally and settles the
 * cue's values into it; PROGRAM is the actual output renderer (ProgramStage), fed every command
 * that reaches air — this operator's and, on a published production, everyone else's off the
 * shared log.
 *
 * Every graphic is a LAYER holding its OWN on-air cue, so several are up at once and Take never
 * clears another layer. That is why `liveCue` is a MAP and why every verb but Take addresses the
 * selected cue's layer. The layer is a NUMBER the operator types (§5), defaulting to 20.
 */
export default function ProductionPage({ id, sub }: { id: string; sub?: ProductionSub | null }) {
  const navigate = useRouter((s) => s.navigate);
  // The mutators return the fresh list — holding it in state (the ControlPanel pattern) keeps
  // an edit from re-parsing every store on every render.
  const [shows, setShows] = useState<Show[]>(() => loadShows());

  /**
   * ANOTHER TAB CHANGED THIS PRODUCTION - re-read it.
   *
   * The workspaces open in their own browser tab, so the ordinary case is now two tabs on one
   * production: the bank is typed on Data over there and loaded into a cue over here. The
   * durable store keeps their MIRRORS honest across tabs (model/durableStore.ts announces every
   * landed write), but a mirror nobody re-reads changes nothing on screen - this surface seeded
   * `shows` once and would go on offering a rundown with no data rows in it.
   *
   * Deliberately a RE-READ of the record and nothing else. The cue DRAFT, the selection and the
   * playhead are this tab's own state and are untouched, so a table appearing in the other tab
   * cannot move what this operator is holding. Re-reading after this tab's OWN write is
   * harmless: it reads back what it just wrote.
   */
  useEffect(() => {
    const onDataChanged = () => setShows(loadShows());
    window.addEventListener('spx-data-changed', onDataChanged);
    return () => window.removeEventListener('spx-data-changed', onDataChanged);
  }, []);
  const library = useMemo(() => loadGraphics(), []);
  const show: Show | null = shows.find((s) => s.id === id) ?? null;

  const backendConfigured = isBackendConfigured();
  const { needsSignIn } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);

  const [note, setNote] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // THE KIT WIZARD'S EXPORT DOOR (templateStore `pendingProductionExport`): a kit is exported
  // without the editor ever opening, and the target picker + validation gate it needs are this
  // page's own dialog - so the wizard asks for that surface instead of growing a second one.
  // One-shot, and cleared as it is read, like every other `pending*` in the store.
  useEffect(() => {
    const pending = useTemplateStore.getState().pendingProductionExport;
    if (!pending || pending !== id) return;
    useTemplateStore.setState({ pendingProductionExport: null });
    setExportOpen(true);
  }, [id]);
  const [linksOpen, setLinksOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'output' | 'control' | 'join' | 'presenter' | null>(null);
  /** The readable audience name being typed, and what the database said about the last claim. */
  const [nameDraft, setNameDraft] = useState('');
  const [nameNote, setNameNote] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [addPick, setAddPick] = useState('');
  /** The hidden file input behind "＋ Add pictures…". */
  const pictureInput = useRef<HTMLInputElement>(null);
  const [menuCueId, setMenuCueId] = useState<string | null>(null);
  /** Which removal in the open row menu is ARMED (`cue` / `graphic`). A cue holds values somebody
   *  typed and there is no undo behind the rundown, so a removal that also takes uploaded
   *  pictures or a whole graphic's rows asks twice — the same two-step Home's delete uses. */
  const [armedRemove, setArmedRemove] = useState<'cue' | 'graphic' | null>(null);
  /** Which cue the editor is pointed at: the one on PREVIEW (the default — edits air on Take),
   *  or the one already ON AIR on that layer, where ✎ Update pushes edits live (§2). */
  const [editTarget, setEditTarget] = useState<'preview' | 'air'>('preview');
  /** Per cue, the last data row loaded into it (`datasetId:rowId`) — what ↷ Next advances from. */
  const [lastLoaded, setLastLoaded] = useState<Record<string, string>>({});
  /** Which side of a two-team board the next data-row load fills. */
  const [loadSide, setLoadSide] = useState<'A' | 'B'>('A');

  // ── Live status: the renderer heartbeat + which cue is on air ON EACH LAYER. Several
  // graphics are up at once by design, so this is a map keyed by graphic name. ──
  const [liveCue, setLiveCue] = useState<LiveCueMap>({});
  /** What the WIRE said was live when this page resolved the production - null until it has
   *  answered, and never written by anything this operator does. The boot recovery below is
   *  keyed on it for exactly that reason. */
  const [bootLive, setBootLive] = useState<LiveCueMap | null>(null);
  /** Each graphic's last reported MACHINE state, keyed by pool name. Two sources converge on
   *  the same answer: the local PROGRAM monitor's own state replies (fresh — the stage posts
   *  one after every applied command), and the wire's {t:'live'} report rows, which also cover
   *  what happened before this page opened. The event buttons grey against this. */
  const [machineStates, setMachineStates] = useState<Record<string, { groups?: Record<string, string> } | null>>({});
  /** Per graphic, the field ids the PROGRAM monitor last reported as too long to fit
   *  (`noacgTextOverflow()`). This is the ON-AIR answer, which is why it is kept apart from the
   *  preview's below: the editor pointed at the live cue must warn about what air is showing,
   *  not about the cue sitting on preview. Only the monitor can answer it - the fit ladder is a
   *  measurement of the rendered graphic, and no source check can stand in for it. */
  const [programOverflow, setProgramOverflow] = useState<Record<string, string[]>>({});
  const noteMachineState = useCallback(
    (graphic: string, state: { groups?: Record<string, string> } | null, overflow?: string[]) => {
      setMachineStates((m) => {
        if (JSON.stringify(m[graphic] ?? null) === JSON.stringify(state)) return m;
        return { ...m, [graphic]: state };
      });
      // The wire's `live` rows carry no overflow (a report row is the renderer naming its
      // state), so those callers pass nothing and the last monitor answer stands.
      if (!overflow) return;
      setProgramOverflow((m) => {
        if ((m[graphic] ?? []).join(',') === overflow.join(',')) return m;
        return { ...m, [graphic]: overflow };
      });
    },
    [],
  );
  const [outputSeenAt, setOutputSeenAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [openedAt] = useState(() => Date.now());
  const hostedSlug = show?.hostedSlug ?? null;

  const programRef = useRef<ProgramStageHandle>(null);
  /**
   * What each graphic was last SENT locally — the input to rebuilding the PROGRAM monitor after
   * it is unmounted (the Data-workspace round trip). The wire report is a snapshot taken when
   * this page resolved the published show and never moves again, and an unpublished production
   * has no report at all, so after the first take this is the only current answer to "what is
   * on air". Declared up here because the log follower below writes to it.
   *
   * It is STATE as well as a ref, because the same fact answers a second question: whether the
   * values in front of the operator have actually been SENT. An on-air cue whose draft has
   * moved past what air is showing has to say so rather than wait to be noticed.
   */
  const [airedData, setAiredData] = useState<Record<string, Record<string, string>>>({});
  const airedRef = useRef(airedData);
  airedRef.current = airedData;
  const rememberAired = useCallback((items: ControlSendItem[]) => {
    setAiredData((prev) => {
      let next = prev;
      for (const item of items) {
        // MERGED, not replaced: an update may be PARTIAL (a ± live-number bump carries one
        // field on purpose), and replacing the baseline with it marked every other field as
        // unsent — an amber "3 changes not on air yet" about values that were on air.
        if (item.msg.t === 'update') next = { ...next, [item.graphic]: { ...next[item.graphic], ...item.msg.data } };
        // An accepted event's payload lands through the same field path (the hosted log merges
        // it the same way), so a goal's +1 is part of what air shows - and what the next press
        // counts from. (If the guard dropped the event this runs slightly ahead of the graphic;
        // the greyed buttons make that the rare case, and the log stays self-consistent.)
        else if (item.msg.t === 'event' && item.msg.payload) next = { ...next, [item.graphic]: { ...next[item.graphic], ...item.msg.payload } };
        else if (item.msg.t === 'stop' && next[item.graphic]) {
          // Taken off air: forget it, or the next rebuild would restore a graphic nobody is
          // running any more.
          next = { ...next };
          delete next[item.graphic];
        }
      }
      return next;
    });
  }, []);
  const [wireLog, setWireLog] = useState<LogEntry[]>([]);
  const localLogId = useRef(0);

  /**
   * THE MATCH CLOCK ON THE LOCAL PROGRAM MONITOR (docs/SPORTS_PACK.md, control/matchClockWire.ts).
   *
   * This monitor follows the same commands air does but never ran `clockRowEffect`, so it let
   * the runtime mint its OWN origin when `clockStart` arrived: it could sit a second off the
   * published renderer, and — the part that actually showed — a stage remount rebuilt it from
   * the last SENT value, so a running clock came back at its seed. It now makes the same
   * decision the hosted renderer makes, against the LOCAL receive instant rather than a server
   * row's `created_at`: the two therefore agree within delivery skew rather than exactly, which
   * is the honest ceiling for a monitor. **It is a monitor, not air** — nothing here reaches a
   * production's renderers.
   *
   * The clock is read out of each graphic's own published markup, keyed by the name the wire
   * uses (`buildOutputPayload` keys the payload by `g.name`, and so does every command), and
   * read through a ref so the ONE entry point (`applyProgram`) is stable: the log follower binds
   * it once and must still see a pool the operator has changed since.
   */
  const clockSpecs = useMemo(() => {
    const out = new Map<string, ClockSpec>();
    for (const g of show?.graphics ?? []) {
      const spec = clockSpecFromHtml(templateForSavedGraphic(g, library).html);
      if (spec) out.set(g.name, spec);
    }
    return out;
  }, [show, library]);
  const clockSpecsRef = useRef(clockSpecs);
  clockSpecsRef.current = clockSpecs;
  /** …and the debate boards' PAIRS of speaking clocks, read the same way off the same markup.
   *  A graphic carries one kind or the other, never both. */
  const speakingClocks = useMemo(() => {
    const out = new Map<string, SpeakingClockPair>();
    for (const g of show?.graphics ?? []) {
      const pair = speakingClocksFromHtml(templateForSavedGraphic(g, library).html);
      if (pair) out.set(g.name, pair);
    }
    return out;
  }, [show, library]);
  const speakingClocksRef = useRef(speakingClocks);
  speakingClocksRef.current = speakingClocks;
  /**
   * The clock field's value ON THE WIRE per graphic — the monitor's own copy of what the
   * renderer keeps in `mergedData`. Deliberately NOT folded into `airedData`: that one also
   * answers "are the operator's values on air yet", and a stamped clock value differs from the
   * cue's plain one forever, which would light an amber "1 change not on air yet" for the whole
   * match. `restoreProgram` folds it back in at the one moment it is needed.
   */
  const clockValues = useRef<Record<string, string>>({});
  /** The same, per FIELD, for a debate board's two clocks — the monitor's copy of what the
   *  renderer keeps in `mergedData` for the pair. Kept out of `airedData` for the same reason. */
  const speakingValues = useRef<Record<string, Record<string, string>>>({});
  /**
   * A debate board's two clocks, put through the same decision the hosted renderer makes. The
   * pair is handled apart from the single match clock rather than folded in with it because the
   * two share nothing but the stamp: one clock verb settles one field, a `switch` settles both.
   */
  const applySpeakingClocks = useCallback(
    (out: ControlSendItem[], item: ControlSendItem, pair: SpeakingClockPair) => {
      const msg = item.msg;
      const held = speakingValues.current[item.graphic] ?? {};
      // A plain resend of the cue's own allowance must not erase a stamp, exactly as for the
      // match clock: the cue stores "05:00" forever and every Take mid-debate re-sends it.
      const carried = msg.t === 'update' ? msg.data : msg.t === 'event' ? msg.payload : undefined;
      for (const field of [pair.fieldA, pair.fieldB]) {
        const value = carried?.[field];
        if (value !== undefined) held[field] = clockValueAfterUpdate(held[field], value);
      }
      // The allowance and the penalty size ride the wire plain and are read back as themselves.
      for (const field of [pair.allowanceField, pair.penaltyField]) {
        const value = field ? carried?.[field] : undefined;
        if (field && value !== undefined) held[field] = value;
      }
      speakingValues.current[item.graphic] = held;
      // The monitor is sent what we now hold, not what the row carried — the same rule
      // `src/output/main.ts` states: once a clock has run away from the time the cue stores, a
      // resend of that stored time is no longer recognisable as a resend to the template.
      let staged = item;
      if (msg.t === 'update' && msg.data) {
        const forwarded = { ...msg.data };
        for (const field of [pair.fieldA, pair.fieldB]) {
          if (forwarded[field] !== undefined) forwarded[field] = held[field];
        }
        staged = { graphic: item.graphic, msg: { ...msg, data: forwarded } };
      }
      const effect = speakingClockRowEffect({ msg }, pair, held, Date.now());
      if (!effect) {
        out.push(staged);
        return;
      }
      speakingValues.current[item.graphic] = { ...held, ...effect.values };
      const clockItem: ControlSendItem = { graphic: item.graphic, msg: { t: 'update', data: effect.values } };
      if (effect.when === 'before') out.push(clockItem);
      out.push(staged);
      if (effect.when === 'after') out.push(clockItem);
    },
    [],
  );
  /**
   * The ONE way a command reaches the PROGRAM monitor, so the clock cannot be handled on one
   * route and missed on the other (the wire follower and the offline verbs both come here).
   * A clock verb gets its value written around it in the order `clockRowEffect` fixes: the
   * origin BEFORE a start, so the runtime adopts it instead of minting one; the banked time
   * AFTER a hold or a reset, because what is banked is what the graphic has just settled on.
   */
  const applyProgram = useCallback((items: ControlSendItem[]) => {
    const out: ControlSendItem[] = [];
    for (const item of items) {
      const pair = speakingClocksRef.current.get(item.graphic);
      if (pair) {
        applySpeakingClocks(out, item, pair);
        continue;
      }
      const clock = clockSpecsRef.current.get(item.graphic);
      if (!clock) {
        out.push(item);
        continue;
      }
      const msg = item.msg;
      // Track the clock field exactly as the renderer's own merged data does: an update writes
      // it, and an accepted event's payload rides the same field path.
      const carried =
        msg.t === 'update' ? msg.data?.[clock.field] : msg.t === 'event' ? msg.payload?.[clock.field] : undefined;
      // A plain resend of the cue's own time must not erase the origin (clockValueAfterUpdate):
      // the cue stores "10:00" forever, so every Take mid-match re-sends it.
      if (carried !== undefined) {
        clockValues.current[item.graphic] = clockValueAfterUpdate(clockValues.current[item.graphic], carried);
      }
      if (msg.t === 'stop') delete clockValues.current[item.graphic];
      const effect = clockRowEffect({ msg }, clock, clockValues.current[item.graphic], Date.now());
      if (!effect) {
        out.push(item);
        continue;
      }
      clockValues.current[item.graphic] = effect.value;
      const clockItem: ControlSendItem = {
        graphic: item.graphic,
        msg: { t: 'update', data: { [clock.field]: effect.value } },
      };
      if (effect.when === 'before') out.push(clockItem);
      out.push(item);
      if (effect.when === 'after') out.push(clockItem);
    }
    programRef.current?.apply(out);
  }, [applySpeakingClocks]);


  const cues = useMemo(() => show?.cues ?? [], [show]);
  const graphicByPoolId = useMemo(() => new Map((show?.graphics ?? []).map((g) => [g.id, g] as const)), [show]);
  const selectedCue = cues.find((c) => c.id === selectedCueId) ?? cues[0] ?? null;
  const cueGraphicName = useCallback(
    (cue: ShowCue) => graphicByPoolId.get(cue.sourceId)?.name ?? null,
    [graphicByPoolId],
  );

  // ── The cue draft: edits echo locally, persist on idle / switch / take / unmount. ──
  const [draft, setDraft] = useState<CueDraft | null>(null);
  const draftRef = useRef<CueDraft | null>(null);
  draftRef.current = draft;
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushDraft = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const d = draftRef.current;
    if (!d) return;
    setShows(updateShowCue(id, d.cueId, { label: d.label, note: d.note || null, values: d.values }));
  }, [id]);
  useEffect(() => () => flushDraft(), [flushDraft]);

  // ── PRODUCTION DATA: the tree, and what it resolves to (docs/PRODUCTION_DATA_PLAN.md) ────
  // Held on THIS page rather than in the Data workspace, because the one sender lives here and
  // the Data tab unmounts the playout surface. Runtime state: it is read from and written to
  // productionState.ts, never to the show record, which syncs and would churn per tick. The
  // DISPATCH half sits further down, beside `runVerb`.
  const [liveData, setLiveDataState] = useState<JsonObject>({});
  /** The tree as it is RIGHT NOW, for callbacks that must not close over a stale render. */
  const liveDataRef = useRef<JsonObject>(liveData);
  liveDataRef.current = liveData;
  /** The server re-read, reachable from the log follower — which is declared above the callback
   *  it needs, because the follower must be in place before the wire's first row arrives. */
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  /** What was last put on the wire, per graphic per field — the diff baseline (see the effect). */
  const lastResolved = useRef<ResolvedValues>({});
  useEffect(() => {
    // The local tree seeds an UNPUBLISHED production only. Published, the server's copy is the
    // authority and arrives a moment later - seeding from localStorage first would show the
    // operator a stale tree and then swap it under them.
    setLiveDataState(id && !hostedSlug ? loadLiveData(id) : {});
    // A different production is a different tree AND a different baseline, so the next dispatch
    // reconciles the new production from scratch rather than against the old one's values.
    lastResolved.current = {};
  }, [id, hostedSlug]);

  /**
   * THE LIVE TREE, WRITTEN IN ANOTHER TAB.
   *
   * The Data workspace opens in its own browser tab, and an UNPUBLISHED production's tree lives
   * in localStorage (model/productionState.ts - deliberately not on the synced Show record).
   * This page is the ONE sender: it holds the tree, resolves the bindings and dispatches the
   * changes, precisely because the workspace has no route to air of its own. Split across tabs,
   * a value typed on Data reached storage and stopped there - the operator watched PROGRAM keep
   * the old score.
   *
   * `storage` fires in the OTHER tabs only, which is exactly the ones that need telling, and it
   * carries the key so an unrelated write costs nothing. Published productions are untouched:
   * there the server's copy is the authority and the API answer is what this page holds.
   */
  useEffect(() => {
    if (!id || hostedSlug) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== PRODUCTION_DATA_KEY) return;
      setLiveDataState(loadLiveData(id));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [id, hostedSlug]);

  /**
   * PUBLISHED = the SERVER owns the tree. `control_shows.data` is what a feed writes and what
   * the patch RPC merges against, so keeping a second copy in localStorage would be two truths
   * with no tiebreak. The key is the owner's own, read over RLS (control/productionDataApi.ts
   * says why that is not the "never a web page" case the integrator doc warns about).
   *
   * `undefined` means NOT YET KNOWN, and that is load-bearing: until the key has resolved, this
   * page must not dispatch the local tree to air. A published production opened cold would
   * otherwise spend one render believing it was offline and push the last LOCAL tree - stale
   * values, briefly, on air.
   */
  const [dataKey, setDataKey] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!hostedSlug || !backendConfigured) {
      setDataKey(null);
      return;
    }
    void productionDataKey(id).then((key) => {
      if (alive) setDataKey(key);
    });
    return () => {
      alive = false;
    };
  }, [id, hostedSlug, backendConfigured]);

  /** Pull the server's tree in - at mount, and whenever a FEED row says it moved. */
  const refreshServerData = useCallback(async () => {
    if (!dataKey) return;
    const current = await fetchProductionData(dataKey);
    if (current) setLiveDataState(current.data as JsonObject);
  }, [dataKey]);
  refreshRef.current = refreshServerData;
  useEffect(() => {
    void refreshServerData();
  }, [refreshServerData]);

  const setLiveData = useCallback(
    (next: JsonObject) => {
      // Optimistic either way, so typing stays immediate.
      setLiveDataState(next);
      if (!dataKey) {
        saveLiveData(id, next);
        return;
      }
      // Published: say the change as a PATCH - including the removals, which a merge patch can
      // only express by naming them (model/productionData.ts replacementPatch). The ANSWER is
      // what we then hold: a feed tick that landed in the same moment is already merged into
      // it, so the operator's edit cannot silently overwrite the feed's.
      const patch = replacementPatch(liveDataRef.current, next);
      if (Object.keys(patch).length === 0) return;
      void patchProductionData(dataKey, patch)
        .then((server) => setLiveDataState(server as JsonObject))
        .catch((error: Error) => {
          setNote(`Production data not saved: ${error.message}`);
          void refreshServerData();
        });
    },
    [id, dataKey, refreshServerData],
  );

  const bindings = show?.bindings;
  /** What every bound field SHOULD be showing right now. */
  const resolved = useMemo(() => resolveBindings(liveData, bindings), [liveData, bindings]);
  const resolvedRef = useRef<ResolvedValues>(resolved);
  resolvedRef.current = resolved;

  /**
   * The values a Take, an Update or the PREVIEW must carry for one graphic — bound fields
   * overlaid on the cue's own.
   *
   * THE RULE (plan §2.7): a bound field is never a stored cue value, so taking a cue prepared
   * at 1–0 while the tree says 3–2 airs 3–2. Read through a ref so long-lived callbacks do not
   * need this render's closure.
   */
  const withBoundValues = useCallback(
    (graphic: string, values: Record<string, string>): Record<string, string> => ({
      ...values,
      ...(resolvedRef.current[graphic] ?? {}),
    }),
    [],
  );

  /** The paths this production has bound, per graphic — what the cue editor greys out. */
  const boundFields = useCallback(
    (graphic: string | null): Record<string, string> => (graphic ? (bindings?.[graphic] ?? {}) : {}),
    [bindings],
  );

  /** The cue as the operator currently sees it — draft over record. */
  const cueView = useCallback(
    (cue: ShowCue): Pick<CueDraft, 'label' | 'note' | 'values'> => {
      const d = draftRef.current;
      return d && d.cueId === cue.id ? d : { label: cue.label, note: cue.note ?? '', values: cue.values };
    },
    [],
  );

  // The log names cues by the LABEL the operator wrote, and it is read from long-lived
  // callbacks, so the lookup goes through a ref rather than a dependency.
  const cuesRef = useRef(cues);
  cuesRef.current = cues;
  const cueLabel = useCallback((cueId: string) => {
    // The DRAFT wins: a verb runs in the same tick as the `flushDraft()` before it, so reading
    // the record alone logged the name the cue had BEFORE the rename just made.
    const d = draftRef.current;
    if (d && d.cueId === cueId) return d.label;
    return cuesRef.current.find((c) => c.id === cueId)?.label ?? null;
  }, []);

  // ── Live tracking: recover the marker from the log's tail, then follow. Rows also drive the
  // PROGRAM monitor, so it shows what is really on air — including another operator's take. ──
  useEffect(() => {
    if (!hostedSlug || !backendConfigured || !show) return;
    let alive = true;
    let unsubscribe: (() => void) | null = null;
    const tail = (after: number) => hostedControlTail(hostedSlug, after);
    void (async () => {
      const resolved = await controlShowBySlug(hostedSlug);
      if (!alive || !resolved) return;
      setOutputSeenAt(resolved.outputSeenAt);
      // The boot-recovery effect below replays each live layer's last REPORT into the local
      // monitor, so the reports must be in hand before the wire's picture commits and fires it.
      liveReportsRef.current = resolved.live;
      setLiveCue(resolved.liveCue);
      // …and the recovery is triggered by THE WIRE'S OWN ANSWER, never by `liveCue` moving —
      // see the effect below for what that distinction cost.
      setBootLive(resolved.liveCue);
      // Seed each graphic's machine state from its last published report — the page may be
      // opening onto a production another operator drove mid-sequence.
      for (const [graphic, report] of Object.entries(resolved.live)) {
        if (report && typeof report === 'object' && 'state' in report) {
          noteMachineState(graphic, (report as { state?: { groups?: Record<string, string> } | null }).state ?? null);
        }
      }
      const history = await hostedControlTail(hostedSlug, Math.max(0, resolved.lastEventId - LOG_HISTORY_SPAN));
      if (!alive) return;
      setWireLog((l) =>
        appendLogEntries(
          l,
          history.map((r) => describeLogRow(r, cueLabel)).filter((e): e is LogEntry => !!e),
        ),
      );
      unsubscribe = await followControlLog({
        showId: show.id,
        from: resolved.lastEventId,
        tail,
        onRow: (row) => {
          const msg = row.msg;
          if (msg.t === 'cue') setLiveCue((m) => withLiveCue(m, row.graphic, msg.cue));
          // A 'live' row is the renderer REPORTING what it applied — machine state included,
          // which is what keeps the action buttons' greying honest about air.
          else if (msg.t === 'live') noteMachineState(row.graphic, msg.state ?? null);
          // Mirror air locally: the PROGRAM monitor follows the wire, not just this page's own
          // buttons, so a take from another operator's phone shows here too. Only RENDERER
          // commands go through — 'staged' and 'live' are bookkeeping rows the stage has no
          // meaning for (staged data has not aired; a 'live' row is a graphic REPORTING).
          else if (msg.t !== 'staged') {
            rememberAired([{ graphic: row.graphic, msg }]);
            applyProgram([{ graphic: row.graphic, msg }]);
            // A FEED wrote (control_data_patch marks its rows `src:'api'`), so the production's
            // tree moved server-side. The row carries the resolved FIELD values, not the tree,
            // so re-read it - and reuse this signal rather than adding a second subscription on
            // control_shows just to learn the same fact.
            if ((msg as { src?: string }).src === 'api') void refreshRef.current();
          }
          const entry = describeLogRow(row, cueLabel);
          if (entry) setWireLog((l) => appendLogEntries(l, [entry]));
        },
      });
    })();
    const seenTimer = setInterval(() => {
      setNow(Date.now());
      void controlOutputSeenAt(show.id).then((at) => {
        if (alive && at !== null) setOutputSeenAt(at);
      });
    }, 30_000);
    return () => {
      alive = false;
      unsubscribe?.();
      clearInterval(seenTimer);
    };
  }, [hostedSlug, backendConfigured, show?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // RECOVERY for the PROGRAM monitor (docs/CLOUD_PLAYOUT.md's recovery discipline). The log
  // follower only sees rows that arrive AFTER this page opened, so reopening a production that
  // has been on air showed an empty PROGRAM box beside a rundown row marked ON AIR — the surface
  // contradicting itself. Replay each live layer with the full recipe — data, snap to the
  // reported state, data again — never a bare play(): the bare replay left the monitor at the
  // entrance while air sat mid-sequence, and its state reply then OVERWROTE the wire-seeded
  // truth, so the chip claimed the entrance state and greyed the one legal recovery event.
  // (The trailing data write is what lets call-painted looks repaint — the G9 rule.)
  // It drives nothing but the local monitor, which is why this is safe here and was not in an
  // exported package.
  //
  // THIS IS NOT ONLY A BOOT CONCERN, which is what the acceptance pass of 2026-08-06 found:
  // switching to the Data workspace unmounts the monitors, and coming back builds a BLANK
  // stage — so the graphic disappeared from PROGRAM while it was still live on CasparCG. It
  // is the same shape as the Phase 2 defect on this exact round trip (the preview came back
  // unscaled because the measurement was keyed on the unchanged document): the state lives
  // outside the remounted thing and nothing re-established it. So the replay is keyed on the
  // STAGE being fresh, not on the page being new.
  const liveReportsRef = useRef<ResolvedControlShow['live'] | null>(null);
  // Read through refs: the replay must use the FRESHEST answer at the moment a stage comes up,
  // and it must not re-run every time a take changes either of them.
  const liveCueRef = useRef(liveCue);
  liveCueRef.current = liveCue;
  const machineStatesRef = useRef(machineStates);
  machineStatesRef.current = machineStates;
  const restoreProgram = useCallback(() => {
    for (const [graphic, cueId] of Object.entries(liveCueRef.current)) {
      if (!cueId) continue;
      const report = (liveReportsRef.current?.[graphic] ?? null) as { data?: Record<string, string> } | null;
      const base = airedRef.current[graphic] ?? report?.data;
      // THE CLOCK'S WIRE VALUE OVERRIDES THE AIRED ONE. What this replays is what was SENT, and
      // a clock's sent value is a plain time — so without this a rebuilt monitor came back at
      // whatever the last Take carried and re-ran from there. The stamped value is kept apart
      // from `airedData` on purpose (see applyProgram) and is folded back in only here.
      const clock = clockSpecsRef.current.get(graphic);
      const stamped = clock ? clockValues.current[graphic] : undefined;
      let data = base && stamped !== undefined ? { ...base, [clock!.field]: stamped } : base;
      // A debate board's pair replays the same way, both fields at once — the running one
      // stamped, the held one plain, which is the whole state the floor was in.
      const pair = speakingClocksRef.current.get(graphic);
      const speaking = pair ? speakingValues.current[graphic] : undefined;
      if (base && pair && speaking) data = { ...base, ...speaking };
      const groups = machineStatesRef.current[graphic]?.groups;
      const items: ControlSendItem[] = [];
      if (data) items.push({ graphic, msg: { t: 'update', data } });
      if (groups) items.push({ graphic, msg: { t: 'snap', snap: groups } });
      else items.push({ graphic, msg: { t: 'play' } });
      if (data) items.push({ graphic, msg: { t: 'update', data } });
      applyProgram(items);
    }
  }, [applyProgram]);
  // The boot half: the wire resolve lands after the stage is already up, so the first time the
  // WIRE says a layer is live there is nothing to have signalled.
  //
  // It is keyed on the wire's own answer (`bootLive`), NOT on `liveCue`, and that is the whole
  // point rather than a refactor. `liveCue` also moves when THIS operator takes a cue, so the
  // recovery used to fire on the first Take of every session: it replayed `snap` to the machine
  // state last reported — "off", because the stage reports that once a second and the reply to
  // the play in flight had not landed yet — and put the graphic straight back off air. The
  // monitor went black, the state chip read Off and every ⚡ action greyed, with nothing said.
  // Offline it was every take, since with no wire `liveCue` can only ever move locally. Every
  // spec took a cue and asserted immediately, inside the window before the first state poll, so
  // the whole suite stayed green over it (`e2e/production-controls.spec.ts` now waits first).
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (recoveredRef.current || !bootLive) return;
    recoveredRef.current = true;
    if (!Object.values(bootLive).some(Boolean)) return;
    restoreProgram();
  }, [bootLive, restoreProgram]);

  // The header clock ticks on its own — the heartbeat poll above is every 30 s, far too slow
  // for a running timer.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── PREVIEW: the selected cue's graphic, composed ONCE per template, its values pushed as
  // settle commands (rebuilding the document per edit re-parses GSAP and reloads every asset on
  // the most common gesture a rundown has). Local by construction — it never touches the wire. ──
  const previewIframe = useRef<HTMLIFrameElement>(null);
  const poolGraphic = selectedCue ? graphicByPoolId.get(selectedCue.sourceId) ?? null : null;
  const previewKey = poolGraphic ? `${poolGraphic.id}:${poolGraphic.savedAt}` : '';
  /* eslint-disable react-hooks/exhaustive-deps */
  const previewTemplate = useMemo(
    () => (poolGraphic ? templateForSavedGraphic(poolGraphic, library) : null),
    [previewKey, library],
  );
  const previewDoc = useMemo(
    () => (previewTemplate ? composeDocument(previewTemplate, { liveControl: true }) : ''),
    [previewTemplate],
  );
  /* eslint-enable react-hooks/exhaustive-deps */
  // The machine's side of the selected graphic (docs/CONTROL_LAYER.md): its ⚡ buttons, the
  // structural guard they grey by, and its states for the recovery snap picker. All parsed
  // from the same live template the PREVIEW composes, so the panel can never describe a
  // different graphic than the monitor shows. Empty on a template with no explicit machine.
  const events = useMemo(() => (previewTemplate ? eventButtons(previewTemplate.js) : []), [previewTemplate]);
  const legality = useMemo(() => (previewTemplate ? eventLegality(previewTemplate.js) : {}), [previewTemplate]);
  const stateGroups = useMemo(() => (previewTemplate ? machineStateGroups(previewTemplate.js) : []), [previewTemplate]);
  // The NAMES for the chip come from their own resolver rather than from `stateGroups`: that
  // list is the snap PICKER's and is empty without an explicit machine by design, while a
  // machine-less graphic's `enter` still has to read "Enter" (controlModel.ts says why).
  const stateNames = useMemo(() => (previewTemplate ? machineStateNames(previewTemplate.js) : {}), [previewTemplate]);
  // The PREVIEW settles with bound fields overlaid too, for the same reason Take does: the
  // monitor has to show what a Take would actually put on air, not the cue's prepared value.
  const settleData = selectedCue
    ? JSON.stringify(withBoundValues(cueGraphicName(selectedCue) ?? '', cueView(selectedCue).values))
    : '';
  const settlePreview = useCallback((data: string) => {
    postPreviewCmd(previewIframe.current?.contentWindow, { cmd: 'settle', data });
  }, []);
  useEffect(() => {
    if (!previewDoc || !settleData) return;
    const t = setTimeout(() => settlePreview(settleData), 150);
    return () => clearTimeout(t);
  }, [previewDoc, settleData, settlePreview]);
  /**
   * WHICH OF THE VALUES BEING TYPED DO NOT FIT — the warn half of the owner's fit ruling
   * (docs/SVG_IMPORT_PLAN.md §3). The graphic on PREVIEW has already settled with exactly the
   * values a Take would air, so asking IT is asking the only thing that knows: whether the copy
   * fits is a measurement of the rendered artwork, not a property of the string.
   *
   * Same request/reply round trip the machine state uses, for the same reason — this iframe
   * carries no `allow-same-origin`, so nothing here can read the document directly. It is
   * polled rather than answered once because the answer moves without any command: a webfont
   * arriving re-measures every budget, and the ladder re-runs.
   */
  const [previewOverflow, setPreviewOverflow] = useState<string[]>([]);
  useEffect(() => {
    if (!previewDoc) {
      setPreviewOverflow([]);
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== previewIframe.current?.contentWindow) return;
      const msg = ev.data as PreviewStateMessage | undefined;
      if (!msg || msg.type !== PREVIEW_STATE_TYPE) return;
      const next = Array.isArray(msg.overflow) ? msg.overflow.map(String) : [];
      setPreviewOverflow((prev) => (prev.join(',') === next.join(',') ? prev : next));
    };
    window.addEventListener('message', onMessage);
    const tick = () => postPreviewCmd(previewIframe.current?.contentWindow, { cmd: 'state' });
    const handle = window.setInterval(tick, 500);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(handle);
    };
  }, [previewDoc]);
  // The frame sizes itself in CSS from the graphic's own aspect ratio; the measurement drives
  // ONE number, the inner scale. (Sizing the frame from the measurement made the observed box
  // depend on the value it produced — a late observer left a right-sized frame around a
  // wrongly scaled graphic.) Keyed on the NODE, not the document: the Data tab unmounts this
  // subtree, and an effect keyed on the unchanged previewDoc never measured the remounted
  // frame — the observer's last tick on the detaching node had left stageW at 0, so the
  // returning preview rendered a 1920px document unscaled and showed its empty corner.
  const [stageBox, setStageBox] = useState({ width: 0, height: 0 });
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!stageEl) return;
    const measure = () => setStageBox({ width: stageEl.clientWidth, height: stageEl.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, [stageEl]);

  /**
   * THE STAGE THE PRODUCTION DRAWS ON - both monitors' shape, and never the selected cue's.
   *
   * Derived exactly as `buildOutputPayload` derives it (and as the exported controller bakes it
   * from the payload), so all three surfaces agree on one canvas. The monitor cap is a grid
   * TRACK WIDTH scaled by this ratio, which is why it has to be the production's: keyed on the
   * PREVIEWED graphic it re-sized both monitors every time an operator selected a differently
   * shaped cue - the "monitors don't jump between scales depending on what graphic we are
   * looking at" rule (docs/PLAYOUT_DASHBOARD.md §2), broken by the mechanism enforcing the cap.
   * A cue that is not this shape is LETTERBOXED into it below, which is what the /output
   * renderer has always done with the same payload.
   */
  const pool = show?.graphics;
  const poolResolutionKey = (pool ?? []).map((g) => `${g.id}:${g.savedAt}`).join('|');
  const stage = useMemo(
    () =>
      (pool ?? []).reduce<Resolution>((r, g) => {
        const res = templateForSavedGraphic(g, library).resolution;
        return { width: Math.max(r.width, res.width), height: Math.max(r.height, res.height), label: r.label };
      }, DEFAULT_GRAPHICS_RESOLUTION),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poolResolutionKey, library],
  );
  const stageAspect = `${stage.width} / ${stage.height}`;

  /**
   * DOES THIS BROWSER TAB OWN A PLAYOUT SURFACE?
   *
   * The workspaces open in their own tab now, so "am I on a sub-route" stopped being the same
   * question as "should the playout column exist". A tab that STARTED on Playout keeps it
   * mounted behind Data forever, because unmounting restarts every live graphic. A tab that
   * OPENED onto Data never had one, and building it there would put a SECOND renderer on a
   * production that already has one - the same log followed twice, every asset re-inlined, and
   * a PROGRAM monitor nobody is looking at.
   *
   * A ref rather than state: it only ever latches ON, and re-rendering when it does would be a
   * render for a value this same render already read.
   */
  const ownsPlayout = useRef(sub === null);
  if (sub === null) ownsPlayout.current = true;
  const keepPlayout = ownsPlayout.current;
  // CONTAIN, not width-fill (`Math.min`, the same arithmetic as src/output/stage.ts): the frame
  // is the production's shape now, so a cue of another shape has to fit inside it rather than
  // overflow its height.
  const fit =
    previewTemplate && stageBox.width && stageBox.height
      ? Math.min(
          stageBox.width / previewTemplate.resolution.width,
          stageBox.height / previewTemplate.resolution.height,
        )
      : 0;

  const selectCue = useCallback(
    (cueId: string) => {
      flushDraft();
      setDraft(null);
      setSelectedCueId(cueId);
      setEditTarget('preview');
    },
    [flushDraft],
  );

  // ── The verbs. ONE place a verb's commands go somewhere: the wire when published, the local
  // PROGRAM monitor always, so the two can never drift into two behaviours. ──
  const runVerb = useCallback(
    async (batches: ControlSendItem[][], label: string): Promise<boolean> => {
      if (!hostedSlug) {
        // Not published: the verbs still drive the local PROGRAM monitor, which is what makes
        // the whole surface usable (and provable) offline. Nothing leaves the machine.
        for (const batch of batches) {
          rememberAired(batch);
          applyProgram(batch);
        }
        const at = new Date().toISOString();
        const entries = batches
          .flat()
          .map((item) =>
            describeLogRow({ id: (localLogId.current -= 1), graphic: item.graphic, msg: item.msg, created_at: at }, cueLabel),
          )
          .filter((e): e is LogEntry => !!e);
        setWireLog((l) => appendLogEntries(l, entries));
        return true;
      }
      try {
        for (const batch of batches) await sendHostedControlBatch(hostedSlug, batch);
        // The published path mirrors through the log follower above, so nothing is applied
        // locally here — that would double-apply every command this page sends.
        return true;
      } catch (e) {
        setNote(`${label} failed: ${(e as Error).message}`);
        return false;
      }
    },
    [hostedSlug, cueLabel, rememberAired, applyProgram],
  );

  /**
   * PRODUCTION DATA, the dispatch half: put the CHANGES on the wire, and nothing else.
   *
   * Diffing is not an optimisation. The log caps a production at 50 commands per 5 s (migration
   * 0008) and every row fans out over Realtime to the renderer and to every open operator page,
   * so a tree with one moving value must cost ONE row rather than one per bound graphic per
   * tick. The baseline starts empty on purpose: the first pass after opening the page (or after
   * switching production) reconciles every bound field once, which is safe precisely because
   * these are absolute values and re-sending one changes nothing.
   */
  useEffect(() => {
    // PUBLISHED, the SERVER does this half: control_data_patch resolves the bindings and appends
    // the update rows itself, and the log follower above brings them back here. Dispatching
    // locally too would double every write - one row from the API, one from this page.
    // `undefined` = the key has not resolved yet, so we do not know which world we are in and
    // must not guess: guessing "offline" airs the stale local tree for a moment.
    if (dataKey !== null) return;
    const changes = diffResolved(lastResolved.current, resolved);
    const graphics = Object.keys(changes);
    if (graphics.length === 0) return;
    lastResolved.current = resolved;
    void runVerb(
      [graphics.map((graphic) => ({ graphic, msg: { t: 'update' as const, data: changes[graphic] } }))],
      'Data',
    );
  }, [resolved, runVerb, dataKey]);

  if (!show) {
    return (
      <div className="app home-page" data-testid="production-page">
        <header className="topbar">
          <button className="brand brand-home" onClick={() => navigate({ view: 'home', section: null })} title="Home">
            <BrandLogo size={24} />
          </button>
          <span className="tpl-name">Production not found</span>
        </header>
        <main className="home-content" style={{ padding: 24 }}>
          <p className="hint">This production no longer exists.</p>
          <button onClick={() => navigate({ view: 'home', section: 'productions' })}>← Back to productions</button>
        </main>
      </div>
    );
  }

  const outputUrl = show.outputSlug ? outputPageUrl(show.outputSlug) : null;
  /** The PUBLIC audience URL. Only a production published against a server carrying migration
   *  0035 has one, so it stays absent rather than showing a link that would not resolve. */
  const joinUrl = show.joinSlug ? joinPageUrl(show.joinSlug) : null;
  /** The PRESENTER's own page — a third capability, minted at publish beside the join slug and
   *  absent for the same reason when the server predates 0035. */
  const presenterUrl = show.presenterSlug ? presenterPageUrl(show.presenterSlug) : null;
  const controlUrl = show.hostedSlug ? controlPageUrl(show.hostedSlug) : null;
  const unpublishedChanges = !!show.publishedAt && show.updatedAt > show.publishedAt;
  const rendererFresh = outputSeenAt ? now - Date.parse(outputSeenAt) < 90_000 : false;
  const clashes = duplicateLayers(show.graphics);

  /**
   * Claim the readable audience name. The database owns every rule (0035's shape constraint,
   * reserved list and unique index), so this only asks and reports - and on success it adopts
   * the name locally, because `joinUrl` is built from the stored slug and would otherwise keep
   * showing the old one until a republish.
   */
  const claimName = async () => {
    setBusy(true);
    try {
      const failure = await claimJoinName(show.id, nameDraft);
      if (failure) {
        setNameNote(failure);
        return;
      }
      const claimed = nameDraft.trim();
      setShows(setShowAudienceSlugs(show.id, { joinSlug: claimed, presenterSlug: show.presenterSlug }));
      setNameDraft('');
      setNameNote(`✓ The audience link is now /join/${claimed}`);
    } catch (e) {
      setNameNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * The OUTPUT EMBED (export/outputEmbed.ts) - the output URL packaged as a template FILE.
   * It lives beside the URL rather than in the production's export dialog because it is not a
   * package of the graphics at all: it is the same live output the URL addresses, in the one
   * shape a host that lists template files (SPX, and CasparCG's own template folder) can load.
   * The resolution is the stage's, derived exactly as `buildOutputPayload` derives it, so the
   * size the file quotes to the operator is the size the renderer actually paints.
   */
  const downloadEmbed = () => {
    if (!outputUrl) return;
    const library = loadGraphics();
    const resolution = show.graphics.reduce<Resolution>((r, g) => {
      const res = templateForSavedGraphic(g, library).resolution;
      return { width: Math.max(r.width, res.width), height: Math.max(r.height, res.height), label: r.label };
    }, DEFAULT_GRAPHICS_RESOLUTION);
    const html = outputEmbedHtml({ production: show.name, outputUrl, resolution });
    saveAs(new Blob([html], { type: 'text/html' }), outputEmbedFileName(show.name));
    setNote('✓ Template file downloaded. Drop it into SPX ASSETS/templates (or your CasparCG template folder) and add it to a rundown.');
  };

  /**
   * Upload pictures into the production (the PICTURE graphic — src/templates/picture.ts).
   *
   * ONE picture graphic per production, holding every uploaded still, with one CUE per picture.
   * That is the cue model as designed: many cues over one pool graphic means taking picture 3
   * replaces picture 1 on the same layer instead of stacking a second still over it.
   *
   * It is deliberately NOT a library graphic. The production page may not write into a document
   * it only references (the rule the cue editor's image picker states), so the picture graphic
   * belongs to the pool instead — which also means `templateForSavedGraphic` resolves the POOL
   * copy, the one this handler updates. The name is made unique against the library because that
   * fallback resolves by NAME when there is no `graphicId`, and an unrelated library graphic
   * called "Pictures" would otherwise capture the production's own.
   */
  const uploadPictures = async (files: File[]) => {
    if (files.length === 0) return;
    const existing = show.graphics.find((g) => g.type === 'picture') ?? null;
    // The stage the pictures are drawn on, derived the way the output payload derives it, so an
    // upload into a 4K production keeps 4K pixels instead of being capped at 1080.
    const stage = show.graphics.reduce<Resolution>((r, g) => {
      const res = templateForSavedGraphic(g, library).resolution;
      return { width: Math.max(r.width, res.width), height: Math.max(r.height, res.height), label: r.label };
    }, DEFAULT_GRAPHICS_RESOLUTION);
    let template = existing ? existing.template : createPictureTemplate('', stage);
    if (!existing) {
      const taken = new Set(library.map((d) => d.name));
      let name = PICTURE_GRAPHIC_NAME;
      for (let n = 2; taken.has(name); n += 1) name = `${PICTURE_GRAPHIC_NAME} ${n}`;
      template = { ...template, name };
    }
    const room = MAX_PICTURES - template.assets.length;
    if (room <= 0) {
      setNote(`This production already holds ${MAX_PICTURES} pictures — remove one before adding another.`);
      return;
    }
    const chosen = files.slice(0, room);
    const added: { path: string; label: string }[] = [];
    for (const file of chosen) {
      // Downscaled here, in the browser, before the bytes ever leave the tab: every picture is
      // base64'd into the published output row, so an untouched phone photo would cost megabytes
      // on every renderer AND operator page load.
      const { data } = await importImageFile(file, Math.max(stage.width, stage.height));
      const result = addPictureToTemplate(template, { fileName: file.name, data });
      template = result.template;
      added.push({ path: result.path, label: pictureLabel(file.name, added.length) });
    }
    // Replacing by NAME keeps the pool id, the layer and every cue already prepared against it.
    const { shows: afterPool, error } = addGraphicToShow(show.id, template, {});
    setShows(afterPool);
    if (error) {
      setNote(error);
      return;
    }
    const poolId = afterPool
      .find((s) => s.id === show.id)
      ?.graphics.find((g) => g.name === template.name)?.id;
    if (poolId) {
      // A NEW graphic arrives with one cue already seeded from its field defaults, and the first
      // picture IS that default — so only the pictures after it need cues of their own.
      const needCues = existing ? added : added.slice(1);
      let next = afterPool;
      if (!existing && added.length > 0) {
        // That seeded cue is labelled after the GRAPHIC ("Pictures"), which is the right default
        // for a lower third and the wrong one here: an operator scanning the rundown is looking
        // for the picture's own name.
        const seeded = next.find((s) => s.id === show.id)?.cues?.find((c) => c.sourceId === poolId);
        if (seeded) next = updateShowCue(show.id, seeded.id, { label: added[0].label });
      }
      for (const picture of needCues) {
        next = addShowCue(show.id, poolId, {
          label: picture.label,
          values: { [PICTURE_FIELD]: picture.path },
        }).shows;
      }
      setShows(next);
    }
    const skipped = files.length - chosen.length;
    setNote(
      `✓ ${chosen.length} picture${chosen.length === 1 ? '' : 's'} added` +
        (skipped > 0 ? `, ${skipped} skipped (${MAX_PICTURES} per production)` : '') +
        // Assets are pinned at publish, so a picture does not reach a running renderer until
        // the production is published again — said here rather than discovered on air. An
        // unpublished production has nothing to re-publish, so it is not told to.
        (show.outputSlug ? '. Publish again to put them on the output.' : '.'),
    );
  };

  const copy = (kind: 'output' | 'control' | 'join' | 'presenter', text: string) => {
    void copyLink(text).then((ok) => {
      if (!ok) return;
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    });
  };

  const publish = async () => {
    if (needsSignIn) {
      openSignIn('Publishing a production needs an account — the hosted pages live in your cloud space.');
      return;
    }
    flushDraft();
    setBusy(true);
    try {
      const current = loadShows().find((s) => s.id === show.id);
      const published = current ? await publishControlShow(current) : null;
      if (published) {
        setShowHostedSlug(show.id, published.slug);
        // The audience capabilities are minted by the database and read back, never chosen
        // here. A server without migration 0035 hands back nulls, which clears them — the
        // production simply has no join link, and nothing else about publishing changes.
        setShowAudienceSlugs(show.id, {
          joinSlug: published.joinSlug,
          presenterSlug: published.presenterSlug,
        });
        setShows(setShowOutputSlug(show.id, published.outputSlug ?? undefined));
        setLinksOpen(true);
        setNote('✓ Published. Load the output URL in your browser source once — it stays the same across re-publishes.');
      } else {
        setNote('Publishing needs the cloud backend — this build runs offline.');
      }
    } catch (e) {
      setNote(`Publish failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      await unpublishControlShow(show.id);
      setShowHostedSlug(show.id, undefined);
      // The AUDIENCE slugs are deliberately kept. Migration 0040 reserves every address a
      // production has ever had, so re-publishing hands the same four back — and the readable
      // join name is derived on the FIRST publish only, from `!show.joinSlug`. Clearing it here
      // made every re-publish look like a first one, so the name could be re-derived and MOVE
      // even though the database still had it. Nothing displays these while unpublished: the
      // whole Links block is gated on `hostedSlug`, which is cleared above.
      setShows(setShowOutputSlug(show.id, undefined));
      setLiveCue({});
      setNote('Production unpublished — its links stop working until you publish again, and come back unchanged when you do.');
    } catch (e) {
      setNote(`Unpublish failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  /** The layers that are up, each with the cue that put it there, front to back. */
  const liveLayers = show.graphics
    .map((g) => ({ layer: graphicLayer(g), graphic: g.name, cueId: liveCue[g.name] ?? null }))
    .filter((l): l is { layer: number; graphic: string; cueId: string } => !!l.cueId)
    .map((l) => ({ ...l, label: cues.find((c) => c.id === l.cueId)?.label ?? l.graphic }))
    .sort((a, b) => b.layer - a.layer);

  const selectedGraphic = selectedCue ? cueGraphicName(selectedCue) : null;
  /** What is on air on the SELECTED cue's layer — its own cue, another cue, or nothing. */
  const selectedLayerCueId = selectedGraphic ? liveCue[selectedGraphic] ?? null : null;
  const selectedLayerLive = !!selectedLayerCueId;
  /** The cue the editor is actually pointed at (§2): the previewed one, or the live one. */
  const airCue = selectedLayerCueId ? cues.find((c) => c.id === selectedLayerCueId) ?? null : null;
  const editingCue = editTarget === 'air' && airCue ? airCue : selectedCue;
  const editingIsLive = !!editingCue && !!selectedGraphic && liveCue[selectedGraphic] === editingCue.id;
  /** The SELECTED cue is the one on air (not merely something on its layer) - what SPACE
   *  toggles off, and what makes ⟳ TAKE a deliberate re-take rather than a first airing. */
  const selectedCueIsLive = !!selectedCue && selectedLayerCueId === selectedCue.id;
  /**
   * UNSENT CHANGES on the cue that is on air (acceptance pass, 2026-08-06: "there needs to be
   * an alert when something changes and you need to send that update - I had problems with my
   * CasparCG output but only because I hadn't sent an update").
   *
   * It compares the edited values against what was last SENT, never against the stored cue: the
   * whole point of staged-vs-take is that those legitimately differ, and data still does NOT
   * air by itself - this only says so out loud. A cue that has never been taken is not
   * "unsent"; it is simply not on air, which the rundown already says.
   */
  const unsentFields =
    editingIsLive && selectedGraphic && editingCue
      ? Object.entries(cueView(editingCue).values)
          .filter(([field, value]) => (airedData[selectedGraphic]?.[field] ?? '') !== value)
          .map(([field]) => field)
      : [];
  const hasUnsent = unsentFields.length > 0;

  const editDraft = (patch: Partial<Pick<CueDraft, 'label' | 'note'>> & { values?: Record<string, string> }) => {
    if (!editingCue) return;
    setDraft((d) => {
      const base: CueDraft =
        d && d.cueId === editingCue.id
          ? d
          : { cueId: editingCue.id, label: editingCue.label, note: editingCue.note ?? '', values: { ...editingCue.values } };
      return { ...base, ...patch, values: { ...base.values, ...(patch.values ?? {}) } };
    });
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushDraft, 300);
  };

  const takeCue = async (cue: ShowCue) => {
    const graphic = cueGraphicName(cue);
    if (!graphic) return;
    flushDraft();
    // Bound fields come from the LIVE tree, not from what this cue stored when it was prepared
    // (plan §2.7) — otherwise taking an old cue would re-air a stale score.
    const values = withBoundValues(graphic, cueView(cue).values);
    if (await runVerb([takeCueItems({ id: cue.id, graphic, values })], 'Take')) {
      setLiveCue((m) => withLiveCue(m, graphic, cue.id));
    }
  };

  const updateLive = async () => {
    if (!editingCue || !selectedGraphic || !editingIsLive) return;
    flushDraft();
    // Same overlay as Take: ✎ Update must not push a bound field back to its prepared value.
    const data = withBoundValues(selectedGraphic, cueView(editingCue).values);
    await runVerb([[{ graphic: selectedGraphic, msg: { t: 'update', data } }]], 'Update');
  };

  /**
   * One press bumps a number field ON AIR: a PARTIAL update carrying just that field, plus the
   * same value into the edited cue so the cue and the air cannot drift apart. Game-show points
   * and match scores change constantly, and stepper-then-✎-Update was two presses under
   * pressure — this is the one data write that airs immediately, which is why it renders with
   * the on-air controls rather than in the cue editor above.
   *
   * PARTIAL on purpose: ✎ Update sends the cue's whole value set, so riding it here would also
   * air every OTHER staged edit the operator has not sent yet — a bump must never publish a
   * half-typed name. Receivers write exactly the fields a message carries, and the logs merge
   * partial data, so recovery replays it correctly (docs/CONTROL_LAYER.md).
   */
  const bumpLive = async (fieldKey: string, delta: number) => {
    if (!editingCue || !selectedGraphic || !editingIsLive) return;
    const base = airedData[selectedGraphic]?.[fieldKey] ?? cueView(editingCue).values[fieldKey] ?? '0';
    const next = String((parseInt(base, 10) || 0) + delta);
    editDraft({ values: { [fieldKey]: next } });
    await runVerb([[{ graphic: selectedGraphic, msg: { t: 'update', data: { [fieldKey]: next } } }]], 'Update');
  };

  const nextLive = async () => {
    if (!selectedGraphic || !selectedLayerLive) return;
    await runVerb([[{ graphic: selectedGraphic, msg: { t: 'next' } }]], 'Next');
  };

  const outLive = async () => {
    if (!selectedGraphic || !selectedLayerLive) return;
    if (await runVerb([clearCueItems(selectedGraphic)], 'Out')) {
      setLiveCue((m) => withLiveCue(m, selectedGraphic, null));
    }
  };

  /**
   * Play a named graphic off air, if it is up. Removal goes through this first: the output page
   * follows the LOG, not the payload, so a pool graphic deleted while live would keep rendering
   * on its layer with nothing left on this surface able to take it off.
   */
  const takeOffAir = async (graphic: string) => {
    if (!liveCue[graphic]) return;
    if (await runVerb([clearCueItems(graphic)], 'Out')) {
      setLiveCue((m) => withLiveCue(m, graphic, null));
    }
  };

  /** Remove one cue. When it is its graphic's LAST cue the graphic goes with it (shows.ts
   *  removeShowCue): the rundown is the only list of what a production holds, so nothing may
   *  survive out of sight of it. */
  const removeCue = async (cue: ShowCue) => {
    const entry = graphicByPoolId.get(cue.sourceId);
    const isLast = cues.filter((c) => c.sourceId === cue.sourceId).length === 1;
    if (isLast && entry) await takeOffAir(entry.name);
    setDraft(null);
    setShows(removeShowCue(show.id, cue.id));
  };

  /** Remove a graphic and every cue prepared against it — the one gesture for getting a graphic
   *  out of the production without deleting its rows one by one. */
  const removeGraphic = async (poolId: string) => {
    const entry = graphicByPoolId.get(poolId);
    if (!entry) return;
    await takeOffAir(entry.name);
    setDraft(null);
    setShows(removeShowGraphic(show.id, poolId));
  };

  /** Clear the screen — the one an operator reaches for under pressure, which is why it sits
   *  apart from the others, in the header. */
  const outAll = async () => {
    if (liveLayers.length === 0) return;
    const cleared = liveLayers.map((l) => l.graphic);
    if (await runVerb(clearAllCueBatches(cleared), 'All out')) {
      setLiveCue((m) => cleared.reduce((acc, g) => withLiveCue(acc, g, null), m));
    }
  };

  const descriptors = previewTemplate ? fieldDescriptors(previewTemplate.fields) : [];
  const editingView = editingCue ? cueView(editingCue) : null;
  // The graphic's own picture assets, so an IMAGE field is actually pickable here. Without
  // them the control renders a select whose only option is "None" — which is how a match
  // board's two crest slots came to be unreachable from the cockpit while the hosted page
  // could set them, exactly the divergence docs/PLAYOUT_DASHBOARD.md forbids. Derived the same
  // way the published panel derives its own list (control/hostedControl.ts), so the two
  // surfaces offer the same pictures.
  // Uploading is deliberately NOT offered: an upload has to land in the saved graphic's
  // assets, which is the editor's job, and adding it here would be a second write path into a
  // document the production only references.
  const cueImages = previewTemplate
    ? previewTemplate.assets.filter((a) => isImageAsset(a.path)).map((a) => ({ value: a.path }))
    : [];
  const canTake = !!selectedCue;

  // The number fields the ± LIVE NUMBERS block bumps: operator-visible `number` fields that no
  // ⚡ event carries as payload. A payload field (the spotlight index, a focused row) is set by
  // its own action — a second road to it would air a value without the state that gives it
  // meaning. Derived from the template alone, like everything else here: any graphic with a
  // number field gets the block, and no category is ever consulted.
  const eventPayloadKeys = new Set(events.flatMap((e) => e.payload ?? []));
  const liveNumberFields = descriptors.filter((d) => d.kind === 'number' && !eventPayloadKeys.has(d.key));

  /** Rows the edited cue can load (D3's binding) — the SHARED matcher, `control/cueData.ts`,
   *  so the hosted control page offers exactly the rows this page does. Live here (a dataset
   *  edited a second ago is loadable); published for the hosted page. */
  const dataRows = cueDataRows(descriptors, show.datasets ?? []);
  const hasSides = hasSideFields(descriptors);
  /** The editor's BANDS (control/cueFieldGroups.ts): one per side on a two-sided board, one for
   *  everything both sides share, and a single unlabelled band - today's flat flow - on every
   *  graphic the rule is not confident about. */
  const fieldGroups = groupCueFields(descriptors);
  const descriptorByKey = new Map(descriptors.map((d) => [d.key, d]));
  /**
   * THE VALUES THAT DO NOT FIT, for the cue the editor is actually pointed at. Two monitors
   * answer, and which one is right depends on the editing target: editing the ON-AIR cue, the
   * only honest report is PROGRAM's, because that is the graphic carrying those values; editing
   * the previewed cue, it is PREVIEW's, which settled with exactly what a Take would send.
   * Reading one of them for both would warn about a cue nobody is typing into.
   */
  const overflowKeys = (
    editingIsLive ? programOverflow[selectedGraphic ?? ''] ?? [] : previewOverflow
  ).filter((key) => descriptorByKey.has(key));
  const overflowSet = new Set(overflowKeys);
  const overflowMessage = overflowNote(
    overflowKeys,
    Object.fromEntries(descriptors.map((d) => [d.key, d.label])),
  );
  /** What a band HEADING reads, resolved the way the field boxes under it resolve: the live tree
   *  for a bound field, then the cue's own value, then the authored default. */
  const headingValues = Object.fromEntries(
    descriptors.map((d) => [
      d.key,
      (boundFields(selectedGraphic)[d.key] ? resolved[selectedGraphic ?? '']?.[d.key] : undefined) ??
        editingView?.values[d.key] ??
        d.defaultValue ??
        '',
    ]),
  );
  const loadableRows = rowsForSide(dataRows, loadSide);
  /** Load one row into the edited cue's DRAFT (never air), remembering it per cue so ↷ Next
   *  walks the bank in order. */
  const loadRow = (id: string) => {
    const row = dataRows.find((r) => r.id === id);
    if (!row || !editingCue) return;
    editDraft({ values: row.values });
    setLastLoaded((m) => ({ ...m, [editingCue.id]: id }));
  };

  // ── Graphic-specific ACTIONS (the ⚡ buttons — docs/PLAYOUT_DASHBOARD.md §8). They act ON
  // AIR the moment they are pressed, like ✎ Update, so they follow Update's legality: live
  // only while the selected cue's graphic is up on its layer. ──
  const machineState = selectedGraphic ? machineStates[selectedGraphic] ?? null : null;
  const stateLabel = formatMachineState(stateNames, machineState);
  // Grouped by the SHARED helper (controlModel `controlSections`), so the hosted page's ⚡ block
  // and this one can never sort the author's sections differently.
  const eventSections = controlSections(events);

  /** The data that belongs to AIR: the cue live on the selected layer, draft included when it
   *  is also the one being edited. Events and snaps act on the live graphic, so their values
   *  must come from ITS cue — sourcing them from the previewed cue would air unprepared
   *  content the operator never took (staged data airs only on an explicit take). */
  const airValues = (): Record<string, string> => (airCue ? cueView(airCue).values : {});

  /** Fire a machine event on the live graphic. Payload values ride from the ON-AIR cue, and
   *  land only if the machine accepts the event (the structural guard). An `adjust` field (a
   *  goal's +1 on that side's score) rides moved by its delta from what AIR shows - the same
   *  base the ± live-number bump counts from - and the new figure is mirrored into the on-air
   *  cue, so the cue and the air cannot drift apart and ⟳ Take / ✎ Update never regress it. */
  const fireEvent = async (button: ControlButton) => {
    if (!selectedGraphic || !selectedLayerLive) return;
    flushDraft();
    const values = airValues();
    const payload = eventPayload(button, (key) =>
      button.adjust && key in button.adjust ? (airedData[selectedGraphic]?.[key] ?? values[key] ?? '0') : values[key],
    );
    const adjusted = Object.fromEntries(Object.keys(button.adjust ?? {}).map((key) => [key, payload?.[key] ?? '']));
    if (Object.keys(adjusted).length > 0 && airCue) {
      // Into the draft when the on-air cue is the one being edited (its box repaints at once),
      // straight into the record otherwise - either way the cue holds the figure air shows.
      if (editingIsLive) editDraft({ values: adjusted });
      else setShows(updateShowCue(id, airCue.id, { values: { ...airCue.values, ...adjusted } }));
    }
    const msg = payload
      ? { t: 'event' as const, event: button.event, payload }
      : { t: 'event' as const, event: button.event };
    await runVerb([[{ graphic: selectedGraphic, msg }]], `Event ${button.event}`);
  };

  /** Snap the live graphic straight to a state — recovery, never an animation. A null group
   *  resets EVERY group to its initial. Recovery is BOTH halves (docs/STATE_MACHINE_SCHEMA.md:
   *  reset is two operations), so the snap rides with an update of the ON-AIR cue's values:
   *  the snap replays intermediate states with suppressed callbacks, and it is the trailing
   *  data write that lets their call-painted looks (a quiz's selection under a lock) repaint
   *  from the fields. */
  const snapTo = async (groupId: string | null, stateId: string) => {
    if (!selectedGraphic || !selectedLayerLive) return;
    flushDraft();
    const snap = groupId === null ? null : { [groupId]: stateId };
    await runVerb(
      [
        [
          { graphic: selectedGraphic, msg: { t: 'snap' as const, snap } },
          { graphic: selectedGraphic, msg: { t: 'update' as const, data: airValues() } },
        ],
      ],
      'Snap',
    );
  };

  return (
    <ProductionShell
      show={show}
      now={now}
      openedAt={openedAt}
      hostedSlug={hostedSlug}
      rendererFresh={rendererFresh}
      outputSeenAt={outputSeenAt}
      liveLayers={liveLayers}
      onHome={() => navigate({ view: 'home', section: null })}
      onBack={() => navigate({ view: 'home', section: 'productions' })}
      onAllOut={() => void outAll()}
      onExport={() => setExportOpen(true)}
      onKey={(key) => {
        // SPACE IS THE TOGGLE, and so is the button under it (acceptance pass 2026-08-06: "it
        // should go in and out with space"; operator feedback 2026-08-07: the key and the
        // button disagreed - SPACE took a live cue OFF while the button beside it re-took).
        // One control, one gesture, the SPX way: the selected cue goes on, and the same
        // control takes it off. RE-TAKE is a SECONDARY action with its own key, never the
        // primary control wearing a different meaning while a cue happens to be live - that
        // is the state an operator is least able to check before pressing.
        // `0` still means Out, from either state.
        if (key === 'take') {
          if (selectedCueIsLive) void outLive();
          else if (canTake && selectedCue) void takeCue(selectedCue);
        }
        // Re-take: play a live cue's entrance again from the start. Only meaningful on a cue
        // that IS live - on anything else it would just be Take under a second name.
        if (key === 'retake' && selectedCueIsLive && selectedCue) void takeCue(selectedCue);
        if (key === 'update' && editingIsLive) void updateLive();
        if (key === 'next' && selectedLayerLive) void nextLive();
        if (key === 'out' && selectedLayerLive) void outLive();
        // Walk the rundown. Selecting a cue is the same act as clicking it - it goes to
        // PREVIEW, nothing airs - so an operator can line the next item up and take it
        // without touching the mouse.
        if (key === 'select-prev' || key === 'select-next') {
          const next = stepSelection(cues, selectedCue?.id ?? null, key === 'select-next' ? 1 : -1);
          if (!next) return;
          selectCue(next.id);
          revealCue(`cue-${next.id}`);
        }
      }}
      sub={sub ?? null}
      onTab={() => navigate({ view: 'production', id: show.id })}
      links={
        <ProductionLinks
          show={show}
          open={linksOpen}
          onToggle={() => setLinksOpen((o) => !o)}
          backendConfigured={backendConfigured}
          busy={busy}
          outputUrl={outputUrl}
          controlUrl={controlUrl}
          joinUrl={joinUrl}
          presenterUrl={presenterUrl}
          nameDraft={nameDraft}
          nameNote={nameNote}
          onNameDraft={(v) => { setNameDraft(v); setNameNote(null); }}
          onClaimName={() => void claimName()}
          copied={copied}
          unpublishedChanges={unpublishedChanges}
          onCopy={copy}
          embedFileName={outputEmbedFileName(show.name)}
          onDownloadEmbed={downloadEmbed}
          onPublish={() => void publish()}
          onUnpublish={() => void unpublish()}
        />
      }
    >
      {sub === 'data' && (
        <ProductionDataWorkspace
          show={show}
          setShows={setShows}
          liveData={liveData}
          setLiveData={setLiveData}
          resolved={resolved}
          dataKey={dataKey ?? null}
        />
      )}
      {sub === 'audience' && <ProductionAudienceWorkspace show={show} setShows={setShows} />}
      {/* THE PLAYOUT SURFACE STAYS MOUNTED behind a sub-page, hidden rather than unmounted.
          Unmounting it destroyed the PROGRAM monitor's iframes, so a trip to Data or Audience
          RELOADED every live graphic: a running match clock came back at its seed, and anything
          else with runtime state came back from the top. Nothing on this page is a reason to
          restart a graphic that is on air. `display: none` costs the monitors their measured
          width while they are away, which the ResizeObserver hands straight back. */}
      {keepPlayout && (<>
      <section className={`pd-main${sub ? ' pd-offstage' : ''}`}>
        {/* `--pd-ar` is the PREVIEW graphic's aspect ratio as a bare number. The monitor cap is
            a height and CSS cannot derive a width from `aspect-ratio`, so the grid turns the cap
            into a track width with this (docs/PLAYOUT_DASHBOARD.md §2). A portrait graphic
            therefore caps at the same HEIGHT as a 16:9 one rather than the same width. */}
        {/* THE STAGE HEAD: the monitors and the verbs that act on them, as ONE sticky block.
            Two things came out of the 2026-08-21 owner read (docs/PLAYOUT_DASHBOARD.md §2). The
            verb bar used to scroll away under the sticky monitors - "a bit scary that you scroll
            the monitors on top of the take buttons" - and what must never leave the screen is
            sticky, not small, which TAKE and Out plainly are. And above 1366px the bar moves
            into the empty column beside PROGRAM, which spends that width and gives the monitors
            back the height the bar was using. Below it, the bar returns underneath. */}
        <div className="pd-stagehead">
        <div
          className="pd-monitors"
          style={{ ['--pd-ar' as string]: stage.width / stage.height }}
        >
          <div className="pd-monitor pd-pvw">
            <h2>
              <span className="pd-dot" aria-hidden="true" />
              PREVIEW
              <span className="pd-what">{selectedCue ? cueView(selectedCue).label : 'nothing selected'}</span>
            </h2>
            <div className="pd-screen">
              {previewDoc && previewTemplate ? (
                <div
                  className="pd-frame"
                  ref={setStageEl}
                  style={{ aspectRatio: stageAspect }}
                  data-testid="production-preview"
                >
                  <iframe
                    ref={previewIframe}
                    title="Cue preview"
                    sandbox="allow-scripts"
                    srcDoc={previewDoc}
                    onLoad={() => settlePreview(settleData)}
                    style={{
                      position: 'absolute',
                      // CENTRED IN THE STAGE, the same way src/output/stage.ts centres its own:
                      // origin at the frame's middle, then translated back by half the SCALED
                      // size. Percentage translates would compound with the scale.
                      left: '50%',
                      top: '50%',
                      width: previewTemplate.resolution.width,
                      height: previewTemplate.resolution.height,
                      border: 0,
                      transformOrigin: '0 0',
                      transform: `translate(${(-previewTemplate.resolution.width * (fit || 1)) / 2}px, ${
                        (-previewTemplate.resolution.height * (fit || 1)) / 2
                      }px) scale(${fit || 1})`,
                    }}
                  />
                </div>
              ) : (
                <div className="pd-frame pd-frame-empty" style={{ aspectRatio: stageAspect }}>
                  <p className="hint">Add a cue to preview it here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pd-monitor pd-pgm">
            <h2>
              <span className="pd-dot" aria-hidden="true" />
              PROGRAM — ON AIR
              <span className="pd-what">
                {liveLayers.length === 0 ? 'nothing on air' : liveLayers.map((l) => l.label).join(' · ')}
              </span>
              {liveLayers[0] && <span className="pd-layer-badge">L{liveLayers[0].layer}</span>}
            </h2>
            <div className="pd-screen">
              <div className="pd-frame pd-frame-pgm" style={{ aspectRatio: stageAspect }}>
                <ProgramStage
                  ref={programRef}
                  show={show}
                  library={library}
                  empty={liveLayers.length === 0}
                  onState={noteMachineState}
                  onReady={restoreProgram}
                />
              </div>
            </div>
          </div>
        </div>

        {/* The verbs, with the keys that fire them. All out lives in the header — it is the
            panic control and must not sit beside the ones used every minute. */}
        <div className="pd-verbs" data-testid="production-verbs">
          {/* There is no → Preview button (2026-08-22). PREVIEW here is a local stage that
              already follows the selection, so the verb re-selected the cue that was on it and
              nothing else — while sitting second-loudest on a bar where every other control
              changes air. Selecting a cue in the rundown IS previewing it. */}
          {/* THE TOGGLE. The button IS the key: on when the cue is off, off when it is on.
              It used to re-take here while SPACE took the cue off air — one surface, two
              behaviours, and the button's own label ("RE-TAKE") was what an operator read
              while their finger was on the key that did the opposite. */}
          <button
            className={`pd-verb pd-verb-take${selectedCueIsLive ? ' pd-verb-live' : ''}`}
            disabled={selectedCueIsLive ? !selectedLayerLive : !canTake}
            onClick={() => {
              if (selectedCueIsLive) void outLive();
              else if (selectedCue) void takeCue(selectedCue);
            }}
            title={
              selectedCueIsLive
                ? 'Take this cue OFF air — the same thing SPACE does'
                : 'Air the previewed cue'
            }
            data-testid="verb-take"
          >
            {selectedCueIsLive ? <>■ TAKE OFF <kbd>SPACE</kbd></> : <>⟳ TAKE <kbd>SPACE</kbd></>}
          </button>
          {/* RE-TAKE is secondary: replaying the entrance of a cue that is already on air. It
              never becomes the primary button. It is always PRESENT and greys out when it does
              not apply, like every other verb on this bar — a control that appears and
              disappears would move Update, Next and Out sideways at the exact moment a cue
              goes live, which is when an operator is least looking at the bar. */}
          <button
            className="pd-verb pd-verb-secondary"
            disabled={!selectedCueIsLive}
            onClick={() => selectedCue && void takeCue(selectedCue)}
            title="Re-take: play this cue’s entrance again from the start"
            data-testid="verb-retake"
          >
            ⟳ Re-take <kbd>R</kbd>
          </button>
          <button
            className={`pd-verb pd-verb-update${hasUnsent ? ' pd-unsent' : ''}`}
            disabled={!editingIsLive}
            onClick={() => void updateLive()}
            title={
              hasUnsent
                ? `${unsentFields.length} edited value${unsentFields.length === 1 ? '' : 's'} has not been sent yet — air still shows the previous one`
                : 'Send the edited values to the live layer, without replaying it'
            }
            data-testid="verb-update"
          >
            ✎ Update <kbd>U</kbd>
            {/* The DOT is the whole point of §3c: nothing here airs by itself, so the only way
                an operator learns that air is behind their screen is if the surface says so. */}
            {hasUnsent && <span className="pd-unsent-dot" aria-hidden="true" />}
          </button>
          <button
            className="pd-verb"
            disabled={!selectedLayerLive}
            onClick={() => void nextLive()}
            title={selectedGraphic ? `Advance ${selectedGraphic} to its next step` : 'Advance the layer'}
            data-testid="verb-next"
          >
            » Next <kbd>N</kbd>
          </button>
          <button
            className="pd-verb"
            disabled={!selectedLayerLive}
            onClick={() => void outLive()}
            title={selectedGraphic ? `Play ${selectedGraphic} off — the other layers stay up` : 'Play this layer off'}
            data-testid="verb-out"
          >
            {/* SPACE belongs to the toggle above, and only there. This button is about the
                selected LAYER, which is not always the selected cue's. */}
            ■ Out <kbd>0</kbd>
          </button>
          <span className="pd-onair-line" data-testid="live-cue-chip">
            {liveLayers.length === 0 ? (
              <span className="muted">○ nothing on air</span>
            ) : (
              <>
                on air: <span className="pd-onair">● {liveLayers.map((l) => l.label).join(' · ')}</span>
              </>
            )}
          </span>
        </div>
        </div>

        {note && <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} data-testid="production-note">{note}</p>}

        {/* The editor. It edits the PREVIEW cue by default and says so; the switch points it at
            the cue already on air on that layer, where ✎ Update pushes edits live. */}
        {editingCue && editingView && poolGraphic && (
          <div className={`pd-editor${editingIsLive ? ' live' : ''}`} data-testid="cue-editor">
            <div className="pd-editor-head">
              <span className="pd-editor-kicker">
                EDITING {editingIsLive ? 'ON-AIR CUE' : 'PREVIEW CUE'}
              </span>
              {/* The cue's own title, editable HERE: mislabelling "Guest lower third" as "Host"
                  is a live-show mistake and must be fixable without leaving the surface. */}
              <input
                className="pd-cue-title"
                value={editingView.label}
                onChange={(e) => editDraft({ label: e.target.value })}
                aria-label="Cue name"
                data-testid="cue-label"
              />
              <span
                className={hasUnsent ? 'pd-editor-fate pd-unsent-note' : 'muted pd-editor-fate'}
                data-testid="cue-unsent"
              >
                {hasUnsent
                  ? `${unsentFields.length} change${unsentFields.length === 1 ? '' : 's'} not on air yet — press ✎ Update`
                  : editingIsLive
                    ? 'changes push live on ✎ Update'
                    : 'changes air on ⟳ Take'}
              </span>
              {/* TOO LONG TO FIT (owner ruling 2026-08-23, docs/SVG_IMPORT_PLAN.md §3). The
                  graphic itself reports it after its fit ladder has filled the panel, wrapped,
                  and shrunk to the readability floor - past that the copy runs over the
                  artwork, and neither cutting it nor reshaping the design is allowed. Beside
                  the unsent note because both answer the same operator question: is what I am
                  looking at what will air? */}
              {overflowMessage && (
                <span className="pd-editor-fate pd-over-note" data-testid="cue-overflow">
                  {overflowMessage}
                </span>
              )}
              {/* Phone only (the bottom bar carries TAKE/Next/Out): Update belongs beside the
                  line that names it rather than hidden from the operator entirely. */}
              {editingIsLive && (
                <button className="pd-editor-update" onClick={() => void updateLive()} data-testid="editor-update">
                  ✎ Update
                </button>
              )}
              <div className="spacer" />
              {airCue && airCue.id !== selectedCue?.id && (
                <button
                  className="pd-editor-switch"
                  onClick={() => setEditTarget((t) => (t === 'preview' ? 'air' : 'preview'))}
                  data-testid="cue-editor-switch"
                >
                  {editTarget === 'preview' ? 'switch to on-air cue ▾' : 'switch to preview cue ▾'}
                </button>
              )}
            </div>

            <div className="pd-fields">
              {/* LOAD A DATA ROW (the Data workspace's other half): a table whose column names
                  match this graphic's field titles offers its rows here. Loading fills the
                  EDITED CUE's draft — data prepares, only Take (or ✎ Update, deliberately)
                  airs. Unmatched columns are skipped; untouched fields keep their values. */}
              {loadableRows.length > 0 && (
                <label className="pd-field pd-field-load">
                  <span>
                    Load data row
                    {/* THE SIDE PICKER. Only a board with A/B fields shows it, and it says
                        which side the next load fills — one row is one team, so without it a
                        teams table can only ever describe half the graphic. */}
                    {hasSides && (
                      <span className="pd-side-pick" data-testid="cue-load-side">
                        {(['A', 'B'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={loadSide === s ? 'active' : ''}
                            onClick={() => setLoadSide(s)}
                            title={`Load the picked row into side ${s}`}
                            data-testid={`cue-load-side-${s}`}
                          >
                            {s}
                          </button>
                        ))}
                      </span>
                    )}
                  </span>
                  <div className="row">
                    <select className="grow" value="" onChange={(e) => loadRow(e.target.value)} data-testid="cue-load-row">
                      <option value="">Pick a row from the production's data…</option>
                      {loadableRows.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    {/* The running-order gesture: next question, next name — one press. Loads
                        the row AFTER the one this cue last loaded (the first, before any). */}
                    <button
                      onClick={() => {
                        const next = nextRow(dataRows, loadSide, editingCue ? lastLoaded[editingCue.id] ?? null : null);
                        if (next) loadRow(next.id);
                      }}
                      disabled={
                        !editingCue ||
                        !nextRow(dataRows, loadSide, lastLoaded[editingCue.id] ?? null)
                      }
                      title="Load the next row"
                      data-testid="cue-load-next"
                    >
                      ↷ Next
                    </button>
                  </div>
                </label>
              )}
              {/* THE BANDS. One per side on a two-sided board, headed by the operator's own
                  word for that side; one unlabelled band - today's flat flow - on everything
                  else. The grouping is derived, never authored (control/cueFieldGroups.ts). */}
              {fieldGroups.map((group) => {
                // WHAT THE OPERATOR IS LOOKING AT, in the same order the field boxes resolve it:
                // a bound field shows the live tree's value, an unset one its authored default.
                // Reading `editingView.values` alone would head a band "Side A" while the box
                // under it plainly said HOME.
                const heading = groupHeading(group, headingValues);
                return (
                  <div
                    className={`pd-band${heading ? '' : ' pd-band-plain'}`}
                    key={group.id}
                    data-testid={`cue-band-${group.id}`}
                  >
                    {heading && (
                      <span className="pd-band-label" data-testid={`cue-band-label-${group.id}`}>
                        {heading}
                      </span>
                    )}
                    <div className="pd-band-fields">
                      {group.keys.map((key) => {
                        const d = descriptorByKey.get(key);
                        if (!d) return null;
                        // A BOUND field is not a cue value (plan §2.7): it takes the live tree's
                        // value at Take, at ✎ Update and in the preview, so an editable box here
                        // would show a number nothing will ever air. It reads out instead,
                        // wearing its path — the one override gesture is Unbind, on the Data tab.
                        const path = boundFields(selectedGraphic)[d.key];
                        if (path) {
                          // Built on `.field-row`/`.field-meta` - FieldRow's OWN structure -
                          // rather than on a hand-rolled label. The cue fields lay out in a grid,
                          // so a row of a different height sits its input a few pixels off its
                          // neighbour's; matching the real structure makes them line up by
                          // construction instead of by a number kept in step here.
                          return (
                            <div className="field-row pd-field-bound" key={d.key} data-testid={`cue-bound-${d.key}`}>
                              <div className="field-meta">
                                <label style={{ margin: 0 }}>
                                  {d.key.toUpperCase()} · {d.label}
                                </label>
                                <span className="pd-bound-mark" title={`Bound to production data: ${path}`}>
                                  🔗 {path}
                                </span>
                              </div>
                              <input value={resolved[selectedGraphic ?? '']?.[d.key] ?? '—'} readOnly tabIndex={-1} />
                            </div>
                          );
                        }
                        return (
                          <FieldRow
                            key={d.key}
                            descriptor={{ ...d, label: `${d.key.toUpperCase()} · ${d.label}` }}
                            value={String(editingView.values[d.key] ?? d.defaultValue ?? '')}
                            onChange={(v) => editDraft({ values: { [d.key]: String(v) } })}
                            overflow={overflowSet.has(d.key)}
                            testIdPrefix="cue-field"
                            images={cueImages}
                            imageHint={
                              poolGraphic.type === 'picture'
                                ? 'Pictures come from this production — add more with ＋ Add pictures.'
                                : "Pictures come from the graphic itself — add one in the editor's Assets tab."
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CUE SETTINGS, under a rule and not in the content grid. The note is the cue's and
                the layer is the graphic's; neither is something the graphic SHOWS, and flowing
                them in beside the content fields is what left "Playout layer" alone on a second
                row looking like a field nobody finished (owner, 2026-08-21). The layer stays
                here rather than moving to a settings screen - it belongs where the operator
                already is when they decide a graphic needs its own (§5). */}
            <div className="pd-cue-meta" data-testid="cue-meta">
              <label className="pd-field pd-field-note">
                <span>Operator note</span>
                <input
                  value={editingView.note}
                  placeholder="e.g. after the intro"
                  onChange={(e) => editDraft({ note: e.target.value })}
                  data-testid="cue-note"
                />
              </label>
              <label className="pd-field pd-field-layer">
                <span>Playout layer</span>
                <input
                  type="number"
                  min={MIN_PLAYOUT_LAYER}
                  max={MAX_PLAYOUT_LAYER}
                  value={graphicLayer(poolGraphic)}
                  onChange={(e) => setShows(setShowGraphicLayer(show.id, poolGraphic.id, Number(e.target.value)))}
                  data-testid="graphic-layer"
                />
              </label>
            </div>

            {clashes.has(graphicLayer(poolGraphic)) && (
              <p className="status-warn pd-layer-clash" data-testid="layer-clash">
                {nameList(clashes.get(graphicLayer(poolGraphic))!.map((g) => g.name))} share layer{' '}
                {graphicLayer(poolGraphic)} — on air they replace each other.
                <button
                  onClick={() => setShows(setShowGraphicLayer(show.id, poolGraphic.id, nextFreeLayer(show.graphics)))}
                  data-testid="layer-clash-fix"
                >
                  Move to layer {nextFreeLayer(show.graphics)}
                </button>
              </p>
            )}
          </div>
        )}

        {/* GRAPHIC ACTIONS — the machine's own verbs, rendered from the metadata that travels
            inside the template (docs/CONTROL_LAYER.md; the region docs/PLAYOUT_DASHBOARD.md §8
            reserves). Deliberately OUTSIDE the editor's frame: fields up there edit a CUE and
            air on ⟳ Take / ✎ Update, while these act on the LIVE graphic the moment they are
            pressed — so they follow Update's legality and say so in their own header. */}
        {events.length > 0 && selectedGraphic && (
          <div className="pd-actions" data-testid="cue-actions">
            <div className="pd-actions-head">
              <span className="pd-actions-kicker">
                ⚡ GRAPHIC ACTIONS <b className="pd-actions-air">act on air</b>
              </span>
              <span
                className="pd-state-chip"
                data-testid="machine-state-chip"
                // A multi-group graphic's label is longer than the chip, so the full text has
                // to stay reachable on hover — the chip truncates rather than reflowing.
                title={
                  !selectedLayerLive
                    ? "The live graphic's current state — what the greying is judged against"
                    : `${stateLabel ?? 'no state reported yet'} — the live graphic's current state, what the greying is judged against`
                }
              >
                {!selectedLayerLive ? 'not on air' : stateLabel ?? 'no state reported yet'}
              </span>
              <div className="spacer" />
              {stateGroups.length > 0 && (
                <select
                  className="pd-snap"
                  value=""
                  disabled={!selectedLayerLive}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v === '::reset') void snapTo(null, '');
                    else {
                      const i = v.indexOf(':');
                      void snapTo(v.slice(0, i), v.slice(i + 1));
                    }
                  }}
                  title={
                    'RECOVERY. Jumps the live graphic straight to a state with no animation, ' +
                    'and re-sends this cue’s values with it — use it when air and the dashboard ' +
                    'have got out of step (a renderer restart, a missed press). It is not how a ' +
                    'graphic is normally driven: that is the ⚡ actions and » Next.'
                  }
                  data-testid="machine-snap"
                >
                  <option value="">Snap to state…</option>
                  <option value="::reset">⟲ Back to start (visual reset)</option>
                  {stateGroups.map((g) =>
                    g.states.map((s) => (
                      <option key={`${g.id}:${s.id}`} value={`${g.id}:${s.id}`}>
                        {stateGroups.length > 1 ? `${g.id}: ${s.name}` : s.name}
                      </option>
                    )),
                  )}
                </select>
              )}
            </div>
            {/* INLINE HELP, because two of these controls were unreadable to their first real
                operator (acceptance pass, 2026-08-06). It is one line and it says what the
                block IS — a documented control the user has to leave the surface to understand
                is a control they will not use. */}
            <p className="hint pd-actions-help" data-testid="cue-actions-help">
              These fire the graphic’s own beats on the layer that is on air, immediately —
              they carry values from this cue, so type them above first.
              {stateGroups.length > 0 && ' “Snap to state…” is for RECOVERY: it jumps straight to a state with no animation.'}
            </p>
            {eventSections.map(([section, btns]) => (
              <div key={section} className="pd-actions-section">
                {(eventSections.length > 1 || section !== 'Actions') && <h4>{section}</h4>}
                <div className="pd-actions-row">
                  {btns.map((b) => {
                    const legal = isEventLegal(legality, b.event, machineState);
                    return (
                      <button
                        key={b.event}
                        className={`pd-action${b.destructive ? ' destructive' : ''}`}
                        disabled={!selectedLayerLive || !legal}
                        title={
                          !selectedLayerLive
                            ? 'The graphic is not on air — Take the cue first'
                            : !legal
                              ? `"${b.event}" has no arrow out of the current state, so the graphic would drop it`
                              : b.adjust
                                ? // An adjust press moves a figure WITH the event (a goal's +1),
                                  // counted from what air shows - the hint says which and by how much.
                                  `Fires "${b.event}" on air and moves ${adjustWords(b, (key) => descriptors.find((d) => d.key === key)?.label)} with it`
                              : b.payload?.length
                                ? // The payload in the OPERATOR'S words, not as `f7`. This is
                                  // what makes an action self-explanatory: the acceptance pass
                                  // could not tell what "Show audience result" would do, and
                                  // the answer is "it shows the Audience results field, which
                                  // you type above" — a field id says none of that.
                                  `Fires "${b.event}" on air, carrying this cue's ${b.payload
                                    .map((key) => descriptors.find((d) => d.key === key)?.label ?? key)
                                    .join(', ')}`
                                : `Fires "${b.event}" on air`
                        }
                        onClick={() => void fireEvent(b)}
                        data-testid={`cue-action-${b.event}`}
                      >
                        ⚡ {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIVE NUMBERS — one press changes a figure on the live graphic (a score, a goal
            total, a stock count). The same doctrine as the ⚡ actions above: fields in the
            editor edit a CUE and air on ⟳ Take / ✎ Update, these act on AIR the moment they
            are pressed — a partial update carrying just the bumped field, mirrored into the
            cue so the two never drift. Derived from the template's own `number` fields, so
            every scoreboard, podium board and goal meter gets it with no per-graphic code. */}
        {liveNumberFields.length > 0 && selectedGraphic && (
          <div className="pd-actions pd-live-numbers" data-testid="live-numbers">
            <div className="pd-actions-head">
              <span className="pd-actions-kicker">
                ± LIVE NUMBERS <b className="pd-actions-air">act on air</b>
              </span>
            </div>
            <p className="hint pd-actions-help">
              One press changes the figure on the live graphic and keeps this cue in step — no
              ✎ Update needed. Typing a value above still stages it for ✎ Update instead.
            </p>
            <div className="pd-actions-row">
              {liveNumberFields.map((d) => {
                const disabled = !selectedLayerLive || !editingIsLive;
                const title = !selectedLayerLive
                  ? 'The graphic is not on air — Take the cue first'
                  : !editingIsLive
                    ? 'Another cue is on air — select the live cue to bump its numbers'
                    : `Changes "${d.label}" on air immediately`;
                return (
                  <span key={d.key} className="pd-live-number" data-testid={`live-number-${d.key}`}>
                    <span className="pd-live-number-label">{d.label}</span>
                    <button
                      disabled={disabled}
                      title={title}
                      onClick={() => void bumpLive(d.key, -1)}
                      data-testid={`live-number-${d.key}-down`}
                    >
                      −
                    </button>
                    <button
                      disabled={disabled}
                      title={title}
                      onClick={() => void bumpLive(d.key, 1)}
                      data-testid={`live-number-${d.key}-up`}
                    >
                      +
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <details className="pd-activity" data-testid="action-log">
          <summary>
            Activity
            {wireLog[0] && (
              <span className="muted">
                {' '}
                {logTime(wireLog[0].at)} {wireLog[0].text}
              </span>
            )}
          </summary>
          {wireLog.length === 0 ? (
            <p className="hint" data-testid="action-log-empty">
              Nothing yet. Every Take, Update, Next and Out lands here, whoever sends it.
            </p>
          ) : (
            <ol className="prod-log-list">
              {wireLog.map((e) => (
                <li key={e.id} className={`prod-log-row prod-log-${e.kind}`} data-testid="action-log-row">
                  <span className="prod-log-time">{logTime(e.at)}</span>
                  <span className="prod-log-text">{e.text}</span>
                  <span className="muted prod-log-graphic">{e.graphic}</span>
                </li>
              ))}
            </ol>
          )}
        </details>
      </section>

      <aside className={`pd-rail${sub ? ' pd-offstage' : ''}`}>
        <div className="pd-rail-head">
          <h2>Cue rundown</h2>
          <span className="muted">{cues.length}</span>
          <div className="spacer" />
          <button
            className="pd-icon"
            title="Add a cue on the selected graphic"
            disabled={!poolGraphic}
            onClick={() => {
              if (!poolGraphic) return;
              const { shows: next, cueId } = addShowCue(show.id, poolGraphic.id);
              setShows(next);
              if (cueId) selectCue(cueId);
            }}
            data-testid="add-cue"
          >
            ＋
          </button>
        </div>

        {cues.length === 0 && (
          <p className="hint" data-testid="no-cues">
            No cues yet — add a graphic below, then add cues on it.
          </p>
        )}

        <div className="pd-cues" data-testid="cue-list">
          {cues.map((cue, i) => {
            const view = cueView(cue);
            const cueGraphic = cueGraphicName(cue);
            const poolEntry = graphicByPoolId.get(cue.sourceId);
            const cueIsLive = !!cueGraphic && liveCue[cueGraphic] === cue.id;
            const isSelected = cue.id === (selectedCue?.id ?? '');
            // Removal wording, decided per row. How many cues the graphic has says whether this
            // one takes the graphic with it (shows.ts removeShowCue) and whether removing the
            // graphic outright is a distinct gesture at all; pictures live ONLY in their pool
            // graphic, so losing it loses the uploads and the operator has to be told.
            const siblingCues = cues.filter((c) => c.sourceId === cue.sourceId).length;
            const pictures = poolEntry?.type === 'picture' ? poolEntry.template.assets.length : 0;
            const clashWith = poolEntry
              ? (clashes.get(graphicLayer(poolEntry)) ?? []).filter((g) => g.id !== poolEntry.id)
              : [];
            return (
              <div
                key={cue.id}
                className={`pd-cue${isSelected ? ' selected' : ''}${cueIsLive ? ' on-air' : isSelected ? ' on-pvw' : ''}`}
                data-testid={`cue-${cue.id}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/noacg-cue', cue.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData('text/noacg-cue');
                  const fromIndex = cues.findIndex((c) => c.id === from);
                  if (fromIndex < 0 || fromIndex === i) return;
                  flushDraft();
                  // moveShowCue steps by one, so walk it to the drop position — the store keeps
                  // one mutation shape and the drag stays a pure view concern.
                  let next = shows;
                  const step = fromIndex < i ? 1 : -1;
                  for (let k = fromIndex; k !== i; k += step) next = moveShowCue(show.id, from, step);
                  setShows(next);
                }}
              >
                <span className="pd-grip" aria-hidden="true">⣿</span>
                <span className="pd-cue-no">{cueIsLive ? '●' : i + 1}</span>
                <button className="pd-cue-label" onClick={() => selectCue(cue.id)} data-testid="select-cue">
                  <strong>{view.label}</strong>
                  <span className="muted">
                    {/* The LAYER, and the one place a shared layer is announced now that the
                        layer list is gone (§5): two graphics on one number replace each other on
                        air, so both rows wear the warning colour where the operator is already
                        looking. The repair — the editor's one-click "Move to layer N" — stays
                        beside the number itself. */}
                    {poolEntry && (
                      <span
                        className={`pd-cue-layer${clashWith.length ? ' clash' : ''}`}
                        title={
                          clashWith.length
                            ? `Shares layer ${graphicLayer(poolEntry)} with ${nameList(clashWith.map((g) => g.name))} — on air they replace each other`
                            : `${poolEntry.name} airs on layer ${graphicLayer(poolEntry)}`
                        }
                        data-testid="cue-layer"
                      >
                        L{graphicLayer(poolEntry)}
                      </span>
                    )}
                    {poolEntry ? ' · ' : ''}
                    {/* The KIND beside the name: the label above is the operator's own word for
                        the cue, so this is what says "that one is the scoreboard" at a glance. */}
                    {poolEntry ? `${graphicKindLabel(poolEntry.type)} · ` : ''}
                    {view.note || cueGraphic || 'missing graphic'}
                  </span>
                </button>
                {cueIsLive ? (
                  <span className="pd-tag air">ON AIR</span>
                ) : isSelected ? (
                  <span className="pd-tag pvw">PVW</span>
                ) : null}
                <div className="pd-cue-menu-host">
                  <button
                    className="pd-icon pd-cue-more"
                    onClick={() => {
                      setArmedRemove(null);
                      setMenuCueId((m) => (m === cue.id ? null : cue.id));
                    }}
                    title="More"
                    aria-label={`More actions for ${view.label}`}
                    data-testid="cue-menu"
                  >
                    ⋯
                  </button>
                  {/* The rundown SCROLLS, so the last cue's ⋯ is at the bottom of the rail by
                      arithmetic — the same defect the library's bulk bar had, on the surface an
                      operator uses live. The shell measures which way to open. */}
                  <LibMenu
                    open={menuCueId === cue.id}
                    onClose={() => {
                      setArmedRemove(null);
                      setMenuCueId(null);
                    }}
                    testid="cue-actions-menu"
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        flushDraft();
                        const v = cueView(cue);
                        const { shows: next, cueId } = addShowCue(show.id, cue.sourceId, {
                          label: `${v.label} copy`,
                          values: v.values,
                          note: v.note || undefined,
                        });
                        setShows(next);
                        setMenuCueId(null);
                        if (cueId) selectCue(cueId);
                      }}
                    >
                      Duplicate
                    </button>
                    {/* Removing the LAST cue removes the graphic too, so the label says so
                        rather than letting it be discovered. A picture graphic carries the
                        uploads themselves, which is the one removal that destroys content
                        with no copy in the library — it asks twice, naming the count. */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        if (siblingCues === 1 && pictures > 0 && armedRemove !== 'cue') {
                          setArmedRemove('cue');
                          return;
                        }
                        void removeCue(cue);
                        setArmedRemove(null);
                        setMenuCueId(null);
                      }}
                      title={
                        siblingCues === 1
                          ? `The last cue on ${cueGraphic ?? 'this graphic'} — the graphic leaves the production with it`
                          : 'Remove this cue; the graphic and its other cues stay'
                      }
                      data-testid="delete-cue"
                    >
                      {armedRemove === 'cue'
                        ? `Also deletes ${pictures} picture${pictures === 1 ? '' : 's'} — confirm?`
                        : siblingCues === 1
                          ? 'Remove cue and graphic'
                          : 'Remove cue'}
                    </button>
                    {/* One gesture for getting a graphic out of the production. Offered only
                        where it differs from the item above: with a single cue, that one
                        already takes the graphic. */}
                    {siblingCues > 1 && (
                      <button
                        role="menuitem"
                        onClick={() => {
                          if (armedRemove !== 'graphic') {
                            setArmedRemove('graphic');
                            return;
                          }
                          void removeGraphic(cue.sourceId);
                          setArmedRemove(null);
                          setMenuCueId(null);
                        }}
                        title={`Remove ${cueGraphic ?? 'this graphic'} from the production, with every cue prepared against it`}
                        data-testid="delete-graphic"
                      >
                        {armedRemove === 'graphic'
                          ? `Remove ${siblingCues} cues${pictures > 0 ? ` and ${pictures} pictures` : ''} — confirm?`
                          : `Remove graphic and its ${siblingCues} cues`}
                      </button>
                    )}
                  </LibMenu>
                </div>
              </div>
            );
          })}
        </div>

        {/* The foot is how graphics GET IN. It used to carry a layer list as well — a second
            list of the same graphics, in a corner the rundown wanted for itself. The layer is
            typed beside the graphic's content, every rundown row wears its number, and removal
            lives in the row's ⋯ menu, so the rundown is the only list (§5). */}
        <div className="pd-rail-foot">
          <div className="row">
            <select value={addPick} onChange={(e) => setAddPick(e.target.value)} data-testid="add-graphic-pick">
              <option value="">Add a graphic from your library…</option>
              {library.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button
              disabled={!addPick}
              onClick={() => {
                const doc = library.find((g) => g.id === addPick);
                if (!doc) return;
                const { shows: next } = addGraphicToShow(show.id, doc.template, { graphicId: doc.id });
                setShows(next);
                setAddPick('');
              }}
              data-testid="add-graphic"
            >
              ＋ Add
            </button>
          </div>
          <button
            className="pd-new-graphic"
            onClick={() => {
              useTemplateStore.setState({ pendingProductionId: show.id });
              navigate({ view: 'new' });
            }}
            title="Create a new graphic for this production — the wizard uses its look and adds it here"
            data-testid="production-new-graphic"
          >
            ＋ New graphic for this production…
          </button>
          {/* Pictures, straight into the rundown — one still per cue, on the production's own
              picture layer. The editor is never opened for this, which is the whole point.
              A real <button> driving a hidden input, so it is the same control as its sibling
              rather than a label wearing a button's clothes. */}
          <button
            className="pd-new-graphic"
            onClick={() => pictureInput.current?.click()}
            title={`Add pictures to this production — each one becomes a cue (up to ${MAX_PICTURES})`}
            data-testid="add-pictures"
          >
            ＋ Add pictures…
          </button>
          <input
            ref={pictureInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              // COPIED out of the live FileList first: clearing `value` empties that list in
              // place, so reading it afterwards hands the handler nothing at all.
              const files = Array.from(e.target.files ?? []);
              // Cleared so choosing the SAME file again still fires a change event.
              e.target.value = '';
              void uploadPictures(files);
            }}
            data-testid="add-pictures-input"
          />
        </div>
      </aside>
      </>)}
      {exportOpen && <ProductionExportDialog show={show} onClose={() => setExportOpen(false)} />}
    </ProductionShell>
  );
}

/** The shell: header + the two-column body, plus the keyboard verbs. Split out so the page body
 *  above reads as the surface it is rather than as chrome wrapped around a surface. */
function ProductionShell({
  show,
  now,
  openedAt,
  hostedSlug,
  rendererFresh,
  outputSeenAt,
  liveLayers,
  sub,
  onTab,
  onHome,
  onBack,
  onAllOut,
  onExport,
  onKey,
  links,
  children,
}: {
  show: Show;
  now: number;
  openedAt: number;
  hostedSlug: string | null;
  rendererFresh: boolean;
  outputSeenAt: string | null;
  liveLayers: { layer: number }[];
  sub: ProductionSub | null;
  /** Back to Playout IN THIS TAB. The workspaces are links now, never calls into here. */
  onTab: () => void;
  onHome: () => void;
  onBack: () => void;
  onAllOut: () => void;
  onExport: () => void;
  onKey: (key: PlayoutVerb) => void;
  links: React.ReactNode;
  children: React.ReactNode;
}) {
  // The verb keys (docs/PLAYOUT_DASHBOARD.md §2) come from the SHARED keymap, so the hosted
  // control page cannot drift away from this one again — see components/playoutKeys.ts.
  //
  // ONLY WHILE PLAYOUT IS THE SURFACE ON SCREEN. This shell renders on Data and Audience too,
  // with the playout column hidden behind them, so bound-while-mounted meant SPACE ran Take
  // from a screen showing neither monitor. The hosted page has no workspaces and passes nothing.
  usePlayoutVerbKeys(onKey, sub === null);

  return (
    <div className="app playout-dashboard" data-testid="production-page">
      <header className="pd-header">
        <button className="brand brand-home" onClick={onHome} title="Home">
          <BrandLogo size={22} />
        </button>
        <button className="pd-back" onClick={onBack} data-testid="production-back">
          ←
        </button>
        <h1><IconTv /> {show.name}</h1>
        <span className={`pd-mode pd-mode-${hostedSlug ? 'show' : 'idle'}`} data-testid="production-mode">
          {hostedSlug ? '● SHOW' : '○ NOT PUBLISHED'}
        </span>
        <span className="pd-clock mono">{elapsed(now - openedAt)}</span>
        {/* The workspaces (docs/INTERACTIVE_PLAYOUT_PLAN.md D6): Playout is the operating
            surface, Data the production's own tables. One shared record underneath — a row
            typed on the Data tab is loadable into a cue the moment you switch back.

            THEY OPEN IN THEIR OWN BROWSER TAB, so Playout never leaves the screen. Owner,
            2026-08-21: "the buttons that we have and the side pages we have feel a bit
            dangerous to swap between. I think the playout should always be open." Data and
            Audience are AUTHORING surfaces, and authoring while the thing you are steering is
            off-screen is how a live mistake happens.
            This needed the durable store's CROSS-TAB INVALIDATION first (model/durableStore.ts):
            two tabs on one production used to overwrite each other, so shipping this before that
            would have made the losing path the default rather than an unlucky one.
            They are real routes with real history, so these are real links - middle-click and
            Ctrl-click start working, which they never did as buttons. The one already open is a
            plain marker rather than a link to itself, and Playout stays a button because it
            returns IN THIS TAB, where the monitors already are. */}
        <nav className="pd-tabs" aria-label="Production workspaces">
          <button className={sub === null ? 'on' : undefined} onClick={onTab} data-testid="tab-playout">
            Playout
          </button>
          {(['data', 'audience'] as const).map((tab) => {
            const label = tab === 'data' ? 'Data' : 'Audience';
            return sub === tab ? (
              <span key={tab} className="on" aria-current="page" data-testid={`tab-${tab}`}>
                {label}
              </span>
            ) : (
              <a
                key={tab}
                href={routeHash({ view: 'production', id: show.id, sub: tab })}
                target="_blank"
                rel="noopener"
                title={`Open ${label} in a new tab — this one keeps Playout on screen`}
                data-testid={`tab-${tab}`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        <div className="spacer" />
        {/* The renderer heartbeat — only once published. Unpublished, the mode chip already
            says so and a second "not published" beside it is noise, not status. */}
        {hostedSlug && (
          <span className={`pd-status${rendererFresh ? ' ok' : ''}`} data-testid="renderer-status">
            {rendererFresh ? '● output connected' : outputSeenAt ? '○ output not seen lately' : '○ output never connected'}
          </span>
        )}
        {links}
        <button onClick={onExport} title="Export this production as a package" data-testid="export-production">
          <IconDownload /> Export…
        </button>
        <button
          className="pd-allout"
          disabled={liveLayers.length === 0}
          onClick={onAllOut}
          title="Play every live layer off — clear the frame"
          data-testid="verb-out-all"
        >
          ■ All out
        </button>
      </header>
      <main className="pd-body">{children}</main>
    </div>
  );
}

/**
 * ONE ROW of the links panel: the capability on a single line, its explanation one small arrow
 * away.
 *
 * Every row here used to carry an always-open paragraph, and five of them turned a popover into
 * a page — the control page, the link a class actually operates from, sat below the fold under
 * an explanation of an SPX file most of them will never download. The text is not the problem
 * (an operator reading it once is exactly who it is for); being unable to put it away is. So the
 * help COLLAPSES per row, and a row can be `quiet` — present, findable, but not competing with
 * the links people copy every show.
 */
/**
 * THE ONE BUTTON (docs/CASPARCG_CONNECT.md §2). One `PLAY <channel>-<layer> [HTML] "<output
 * URL>"` is the entire live link: from there every cue, take, update and recovery flows through
 * the durable command log the /output page already follows, which is why there is no per-take
 * CG traffic here.
 *
 * It appears only once a server is configured under Settings -> Playout. Unconfigured, the row
 * would be a dead control on the busiest surface in the app - and the URL row directly above it
 * is the manual route that has always worked and still does.
 */
function CasparAirRow({ outputUrl }: { outputUrl: string | null }) {
  const [busy, setBusy] = useState<'air' | 'stop' | null>(null);
  const [result, setResult] = useState<CasparResult | null>(null);

  // Read on every render, and again at the moment of the click, rather than latching a copy at
  // mount: Settings is a modal that can be opened and changed without this page unmounting, and
  // a latched copy would quietly send the command to the OLD server while the row displayed the
  // old channel. It is a parse of a few hundred bytes, against a control that airs a graphic.
  const settings = loadCasparSettings();
  if (!casparConfigured(settings)) return null;

  const run = async (what: 'air' | 'stop') => {
    const now = loadCasparSettings();
    setBusy(what);
    setResult(null);
    try {
      setResult(what === 'air' ? await airOnCaspar(now, outputUrl!) : await stopOnCaspar(now));
    } finally {
      setBusy(null);
    }
  };

  return (
    <LinkRow
      label="CasparCG"
      testId="caspar-air"
      help={
        <>
          Loads the output URL above onto channel <code>{casparAddress(settings)}</code> of{' '}
          <code>{settings.host}</code>, through the agent running on this machine. Do it once at the
          start of the production and leave it up - the graphics are cued from this page, not by
          re-loading the layer. Change the server under Settings &rarr; Playout.
        </>
      }
      under={
        result && (
          <span
            className={result.state === 'ok' ? 'status-ok' : 'status-bad'}
            data-testid="caspar-air-result"
            data-state={result.state}
          >
            {result.state === 'ok' ? `✓ On ${casparAddress(settings)}` : result.detail}
          </span>
        )
      }
    >
      <span className="prod-link-file" data-testid="caspar-air-target">
        {settings.host} · {casparAddress(settings)}
      </span>
      <button onClick={() => void run('air')} disabled={!outputUrl || busy !== null} data-testid="caspar-put-on-air">
        {busy === 'air' ? 'Sending…' : 'Put on air'}
      </button>
      <button
        className="prod-link-quiet-action"
        onClick={() => void run('stop')}
        disabled={busy !== null}
        data-testid="caspar-take-off-air"
      >
        {busy === 'stop' ? 'Stopping…' : 'Take off'}
      </button>
    </LinkRow>
  );
}

function LinkRow({
  label,
  help,
  testId,
  quiet,
  openByDefault,
  under,
  children,
}: {
  label: string;
  help: React.ReactNode;
  testId: string;
  /** A secondary capability: smaller and dimmer, so the row is found rather than read past. */
  quiet?: boolean;
  openByDefault?: boolean;
  /** A verdict belonging to this row's own control, always shown (a refusal never collapses). */
  under?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!openByDefault);
  return (
    <div className={`prod-link-item${quiet ? ' quiet' : ''}`}>
      <div className="prod-link-row">
        <span className="mono muted">{label}</span>
        {children}
        <button
          className="prod-link-help-toggle"
          aria-expanded={open}
          aria-label={open ? `Hide what the ${label.toLowerCase()} is for` : `What is the ${label.toLowerCase()} for?`}
          title={open ? 'Hide the explanation' : 'What is this for?'}
          onClick={() => setOpen((o) => !o)}
          data-testid={`${testId}-help-toggle`}
        >
          {open ? '▾' : '▸'}
        </button>
      </div>
      {under}
      {open && (
        <p className="hint prod-link-help" data-testid={`${testId}-help`}>
          {help}
        </p>
      )}
    </div>
  );
}

/** Publishing and the two capability links (docs/PLAYOUT_DASHBOARD.md §7) — the dashboard's
 *  other job, one click from the operator rather than a page they must navigate away to. */
function ProductionLinks({
  show,
  open,
  onToggle,
  backendConfigured,
  busy,
  outputUrl,
  controlUrl,
  joinUrl,
  presenterUrl,
  nameDraft,
  nameNote,
  onNameDraft,
  onClaimName,
  copied,
  unpublishedChanges,
  onCopy,
  embedFileName,
  onDownloadEmbed,
  onPublish,
  onUnpublish,
}: {
  show: Show;
  open: boolean;
  onToggle: () => void;
  backendConfigured: boolean;
  busy: boolean;
  outputUrl: string | null;
  controlUrl: string | null;
  joinUrl: string | null;
  presenterUrl: string | null;
  nameDraft: string;
  nameNote: string | null;
  onNameDraft: (value: string) => void;
  onClaimName: () => void;
  copied: 'output' | 'control' | 'join' | 'presenter' | null;
  unpublishedChanges: boolean;
  onCopy: (kind: 'output' | 'control' | 'join' | 'presenter', text: string) => void;
  embedFileName: string;
  onDownloadEmbed: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  if (!show.hostedSlug) {
    return (
      <button
        className="primary"
        onClick={onPublish}
        disabled={busy || !backendConfigured}
        title={
          backendConfigured
            ? 'Publish: one persistent output URL for CasparCG/OBS/vMix and one control page for operating'
            : 'Publishing needs the cloud backend — this build runs offline'
        }
        data-testid="production-publish"
      >
        ▶ Start production
      </button>
    );
  }
  return (
    <div className="pd-links-host">
      <button onClick={onToggle} aria-expanded={open} data-testid="production-links-toggle">
        <IconLink /> Links{unpublishedChanges ? ' •' : ''}
      </button>
      {/* Same shell as the library's row menus (home/LibMenu). What was off-screen here is the
          panel's own TAIL: six link rows with their ▸ explanations open, then Publish/Unpublish,
          is taller than a short laptop window, and this popover had no `max-height` at all. So
          the repair is the cap `.pd-links` now carries rather than the flip — hanging off a
          header pinned to the top of the page, down stays the better side. It is on the shell
          anyway, because the measurement must not fork per popover. */}
      <LibMenu open={open} onClose={onToggle} surface="pd-links" role="none" testid="production-links">
        <LinkRow
          label="Output URL"
          testId="output-url"
          help={
            <>
              Add this once as a browser source (OBS / vMix) or a CasparCG HTML template. It keeps
              working across re-publishes; graphics and cues update in place.
            </>
          }
        >
          <code className="prod-url">{outputUrl}</code>
          <button onClick={() => outputUrl && onCopy('output', outputUrl)} data-testid="copy-output-url">
            {copied === 'output' ? '✓ Copied' : 'Copy'}
          </button>
        </LinkRow>
        {/* The same URL, loaded for you. Directly under the row it acts on, because it IS that
            row's other verb - not a separate capability. */}
        <CasparAirRow outputUrl={outputUrl} />
        {/* THE SAME OUTPUT, AS A FILE. An SPX rundown lists template files out of
            ASSETS/templates and has nowhere to paste a URL, so the row above reaches every
            playout host except the one this project treats as canonical. The file wraps this
            production's output URL in a full-frame iframe (export/outputEmbed.ts): SPX plays
            the item, NoaCG cues what is inside it.
            QUIET, and directly under the URL it is a second form of: it belongs to the one
            host that cannot take the link, so as a full-size row with its own paragraph it
            read as a fourth capability and pushed the control page below the fold. */}
        <LinkRow
          label="Template file"
          testId="spx-template"
          quiet
          help={
            <>
              For playout that loads template <em>files</em> instead of URLs - SPX, or a CasparCG
              template folder. Drop it into SPX&rsquo;s <code>ASSETS/templates</code> and add it to a
              rundown: Play puts the output up, Stop takes it down, and you cue the graphics from here
              or the control page. It carries the output link, so keep it as private as the link itself.
            </>
          }
        >
          {/* NOT `.mono` as a class: `.prod-link-row > .mono` is the 92px LABEL column, so
              wearing it made the file name a second label and left the row's ▸ short of the
              column every other row's sits in. The mono FACE comes from the rule below. */}
          <span className="prod-link-file">{embedFileName}</span>
          {/* "Download", not "⬇ Download": it sits in a column with two Copy buttons, and the
              glyph made this one row a pixel taller than its neighbours. */}
          <button className="prod-link-quiet-action" onClick={onDownloadEmbed} data-testid="download-output-embed">
            Download
          </button>
        </LinkRow>
        <LinkRow
          label="Control page"
          testId="control-url"
          help={
            <>
              Operate from a phone or tablet, no account needed. Keep the link private: holding it is
              the permission to operate.
            </>
          }
        >
          <code className="prod-url">{controlUrl}</code>
          <button onClick={() => controlUrl && onCopy('control', controlUrl)} data-testid="copy-control-url">
            {copied === 'control' ? '✓ Copied' : 'Copy'}
          </button>
        </LinkRow>
        {/* The AUDIENCE link is the one link here meant to be given away — read out on air,
            put on a slide, printed on a QR code. It is listed last and described as public
            so it can never be mistaken for the control page above it. Its help opens by
            DEFAULT for that reason: every other row explains a thing that is private, and a
            collapsed "public" is the one omission on this panel that could air. */}
        {joinUrl && (
          <>
            <LinkRow
              label="Audience link"
              testId="join-url"
              openByDefault
              help={
                <>
                  Public — share it with the room. Viewers send questions and vote here; nothing they
                  send goes on air until you approve it and take it, on the Audience tab.
                </>
              }
            >
              <code className="prod-url">{joinUrl}</code>
              <button onClick={() => onCopy('join', joinUrl)} data-testid="copy-join-url">
                {copied === 'join' ? '✓ Copied' : 'Copy'}
              </button>
            </LinkRow>
            {/* A READABLE NAME, because this is the one URL that gets said out loud. The
                first publish already derived one from the production's name (control/
                joinName.ts), so this field is for CHANGING it rather than for having a link
                at all. It validates nothing: every rule lives on the column in migration
                0035, and the answer to "is it free?" is the claim itself (hostedControl
                claimJoinName says why there is no availability check). */}
            <LinkRow
              label="Readable name"
              testId="join-name"
              quiet
              help={
                <>
                  The name above came from this production&rsquo;s name when you first published.
                  Changing it makes the old audience link stop working — do it before you share it,
                  not mid-show.
                </>
              }
              under={
                nameNote ? (
                  <p
                    className={nameNote.startsWith('✓') ? 'status-ok' : 'status-bad'}
                    data-testid="join-name-note"
                  >
                    {nameNote}
                  </p>
                ) : null
              }
            >
              <input
                type="text"
                value={nameDraft}
                placeholder="friday-night-live"
                onChange={(e) => onNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onClaimName();
                }}
                data-testid="join-name-input"
              />
              <button onClick={onClaimName} disabled={busy} data-testid="join-name-claim">
                Use this name
              </button>
            </LinkRow>
          </>
        )}
        {/* The PRESENTER link is a third capability with a third audience: not the operator's
            control page and emphatically not the public one. It carries no moderation and no
            tally — only the two questions the Audience tab points at, in the presenter's own
            hand. Listed after the audience link and described by who it is FOR, because the
            one mistake that matters here is reading the wrong URL out on air. */}
        {presenterUrl && (
          <LinkRow
            label="Presenter link"
            testId="presenter-url"
            help={
              <>
                For the presenter&rsquo;s own phone or tablet — it shows what they are on now and what
                comes next, and nothing else. Choose those with 🎤 Now and ⇢ Next on the Audience tab.
              </>
            }
          >
            <code className="prod-url">{presenterUrl}</code>
            <button onClick={() => onCopy('presenter', presenterUrl)} data-testid="copy-presenter-url">
              {copied === 'presenter' ? '✓ Copied' : 'Copy'}
            </button>
          </LinkRow>
        )}
        {unpublishedChanges && (
          <p className="status-warn" data-testid="publish-freshness">
            The production changed after the last publish — the output and control pages run the older
            snapshot until you publish changes.
          </p>
        )}
        <div className="row">
          <button className="primary" onClick={onPublish} disabled={busy} data-testid="production-republish">
            ⟳ Publish changes
          </button>
          <button onClick={onUnpublish} disabled={busy} data-testid="production-unpublish">
            Unpublish
          </button>
        </div>
      </LibMenu>
    </div>
  );
}

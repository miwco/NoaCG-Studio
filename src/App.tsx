import { useEffect, useLayoutEffect, useRef } from 'react';
import AppShell from './components/AppShell';
import VideoAppShell from './components/video/VideoAppShell';
import SendIn from './showchat/SendIn';
import HostedControlPage from './components/HostedControlPage';
import HomePage from './components/home/HomePage';
import ExportWindow from './components/ExportWindow';
import CreationWizard from './components/wizard/CreationWizard';
import GraphicControlPage from './components/home/GraphicControlPage';
import ProductionPage from './components/home/ProductionPage';
import PasswordRecoveryDialog from './components/auth/PasswordRecoveryDialog';
import AgentAccessConsent from './components/auth/AgentAccessConsent';
import StorageAlertDialog from './components/save/StorageAlertDialog';
import SaveDialogs from './components/save/SaveDialogs';
import ShareWithTeamDialog from './components/teams/ShareWithTeamDialog';
import JoinTeamDialog from './components/teams/JoinTeamDialog';
import { useAuthUi } from './components/auth/authUi';
import { isBackendConfigured } from './backend/config';
import { isAgentRequestUrl } from './backend/agentAccess';
import { getAccessToken } from './backend/auth';
import { syncNow } from './backend/syncController';
import { useDocKindStore } from './store/docKindStore';
import { useTemplateStore } from './store/templateStore';
import { parseRoute, useRouter, type Route } from './app/router';
import { openGraphicById, useSaveUi } from './store/saveActions';
import { raiseStorageAlert } from './store/storageAlert';
import { isAdvancedMode, useAdvancedMode } from './components/useAdvancedMode';
import AnalyticsConsentBanner from './components/AnalyticsConsentBanner';
import StorageHealthNotice from './components/StorageHealthNotice';

/**
 * WHICH SURFACE THIS PAGE LOAD LANDS ON — decided HERE, at module load, before React's first
 * render. main.tsx imports this module and renders immediately after, so "module load" is
 * "before the first frame" by construction, and the answer cannot be confused with a later
 * in-app navigation.
 *
 * THE RULE THIS FILE KEEPS: a boot surface is never chosen in an effect. An effect — layout
 * or not — runs after the first commit has been PAINTED, so the frame it corrects is a frame
 * the reader already saw. Both halves of that were paid for:
 *
 *   - The wizard used to be opened from an effect. A zustand write made there is scheduled,
 *     not flushed: the store notifies through useSyncExternalStore and React renders the
 *     wizard in a LATER frame, so the first commit painted the studio with no wizard in it.
 *     Two earlier attempts (useLayoutEffect, sharing HomePage's `key`) changed what happened
 *     AROUND that frame and never the fact that the wizard did not exist IN it.
 *   - The wizard-first REDIRECT used to be an effect too, and cost the same frame at the
 *     other end: a plain `/app` boot rendered `<AppShell/>` because `''` still parsed as the
 *     editor, painted the whole canvas editor, and only then rewrote the route to Home.
 *     Measured 2026-09-02 on a production build at 4x CPU throttle: one full frame of the
 *     editor, on top, on a boot whose destination was always Home (owner walk 2026-08-28,
 *     "it flashes some other screen underneath... It's very annoying").
 *
 * Deciding here makes the first render the only render there is: `galleryOpen` is already
 * true when the wizard is the answer, and the route already says Home when Home is.
 */
function decideBootRoute(): Route {
  const url = parseRoute(window.location.hash);

  // A boot onto `#/new` is the product's PRIMARY DOOR (the landing page's "Start creating").
  // Open the wizard now, so it is in the first frame there is.
  if (url.view === 'new') {
    useTemplateStore.getState().openGallery(url.design ?? null);
    return url;
  }

  // A DEEP LINK (a production page, a control panel, a graphic, a video) must never open
  // under the startup wizard: the auto-open (galleryOpen's initial value — no autosaved
  // project) exists for the bare '' boot only, and since the wizard mounts at App level it
  // would otherwise cover whatever the link pointed at. Both modes.
  if (url.view !== 'editor') {
    if (useTemplateStore.getState().galleryOpen) useTemplateStore.getState().closeGallery();
    return url;
  }

  // WIZARD-FIRST BOOT (docs/GOALS_ARCHIVE.md "Student release" step 4), default mode only:
  // the bare '' route lands on the wizard for a first-ever visit (galleryOpen's initial
  // value) and on HOME for a returning reader. Advanced mode keeps the classic behaviour —
  // '' is the editor, restoring the autosaved document.
  if (isAdvancedMode()) return url;
  const landing: Route = useTemplateStore.getState().galleryOpen
    ? { view: 'new' }
    : { view: 'home', section: null };
  useRouter.getState().replace(landing);
  return landing;
}

const bootRoute = typeof window !== 'undefined' ? decideBootRoute() : null;

export default function App() {
  // Which editor world is active: SPX live graphics or the AI video editor. Persisted;
  // the wizard flips it when a project of the other kind is created or opened.
  const kind = useDocKindStore((s) => s.kind);
  const advanced = useAdvancedMode((s) => s.advanced);

  // In-app surface routing (docs/SAVED_CONTENT_MODEL.md §3): hash routes for Home,
  // per-graphic control panels, productions, and direct graphic links — real history, so
  // Back/Forward walk between surfaces and a refresh restores the same place.
  const route = useRouter((s) => s.route);

  // The boot surface is decided at module load (decideBootRoute above), never here: an
  // effect would run a frame too late and paint the wrong surface first.

  // A `#/graphic/<id>` route means THAT library graphic should be the working document.
  // Loading is guarded (unsaved changes ask first); handled once per route change so a
  // canceled guard doesn't re-ask in a loop. Cancel rewinds the URL to the plain editor.
  const handledGraphicRoute = useRef<string | null>(null);
  useEffect(() => {
    if (route.view !== 'graphic') {
      handledGraphicRoute.current = null;
      return;
    }
    if (handledGraphicRoute.current === route.id) return;
    handledGraphicRoute.current = route.id;
    const { saved } = useTemplateStore.getState();
    if (saved.graphicId === route.id) return; // already open (the normal refresh case)
    useSaveUi.getState().requestSwitch(
      () => {
        if (openGraphicById(route.id)) return;
        // A MISS while signed in may be a record that exists in the cloud and has not been
        // pulled yet - the deep link an agent's `noacg save` printed, opened on a machine that
        // has not synced since (docs/AGENT_SAVE.md). One sync pass, one retry, then Home: the
        // link works on first open instead of "next time the studio opens".
        void (async () => {
          if (isBackendConfigured() && (await getAccessToken().catch(() => null))) {
            await syncNow().catch(() => undefined);
            if (openGraphicById(route.id)) return;
          }
          // Unknown id (deleted, other profile): land on Home rather than a dead editor.
          useRouter.getState().replace({ view: 'home', section: null });
        })();
      },
      () => useRouter.getState().replace({ view: 'editor' }),
    );
  }, [route]);

  // `#/video` and `#/graphic` pin the persisted shell kind so refresh matches the URL.
  useEffect(() => {
    if (route.view === 'video' && useDocKindStore.getState().kind !== 'video') {
      useDocKindStore.getState().setKind('video');
    }
    if (route.view === 'graphic' && useDocKindStore.getState().kind !== 'spx') {
      useDocKindStore.getState().setKind('spx');
    }
  }, [route]);

  // The wizard is routed (`#/new`): opening the route opens it, Back closes it, and closing
  // it IN the app (create, ✕, Escape) rewinds the route — otherwise the still-current `#/new`
  // would immediately reopen it. The store flag stays the source the shells read; this effect
  // only keeps the two in agreement. Only a wizard the ROUTE opened is closed by leaving the
  // route — the first-visit startup wizard (galleryOpen's initial value, true only when no
  // autosaved project exists) must not be closed by the plain '' route on boot.
  const galleryOpen = useTemplateStore((s) => s.galleryOpen);
  const routedWizard = useRef(false);
  // Which design id this route has already pushed into the store — a first-ever visit opens
  // the wizard by DEFAULT (galleryOpen's initial value), before this effect ever runs, so the
  // `if (galleryOpen)` branch below must still hand a `#/new/<id>` route's design off to
  // openGallery rather than assuming a prior call already did.
  const consumedDesign = useRef<string | null>(null);
  // useLayoutEffect, not useEffect: on the WARM path (Home → `#/new`) the wizard should be in
  // the frame the route change paints. It cannot carry the COLD path — a store write from any
  // effect lands a frame later — which is why a boot onto `#/new` opens the wizard at module
  // load instead (bootRoute above).
  useLayoutEffect(() => {
    if (route.view === 'new') {
      const design = route.design ?? null;
      // The LIVE flag, not the rendered one: this effect writes `galleryOpen` and its own
      // subscribed value is still the pre-write `false` when it runs again with the same
      // deps — which StrictMode's remount simulation does on every mount. Read stale, the
      // run below mistook "I just opened it" for "the reader closed it" and rewound `#/new`
      // to `#/home` on boot. Reading the store makes the effect idempotent, which is exactly
      // what that simulation is there to check.
      if (useTemplateStore.getState().galleryOpen) {
        routedWizard.current = true;
        if (design && consumedDesign.current !== design) {
          consumedDesign.current = design;
          useTemplateStore.getState().openGallery(design);
        }
      } else if (routedWizard.current) {
        // Closed from inside the app while the route still says wizard: rewind the URL.
        // Create paths navigate somewhere real in their own handler (same tick, so this
        // branch never sees them); what lands here is ✕/Escape — and a default-mode close
        // must land on Home, never the editor (step 4). Advanced keeps the classic rewind.
        routedWizard.current = false;
        consumedDesign.current = null;
        useRouter.getState().replace(isAdvancedMode() ? { view: 'editor' } : { view: 'home', section: null });
      } else {
        routedWizard.current = true;
        consumedDesign.current = design;
        useTemplateStore.getState().openGallery(design);
      }
    } else {
      if (useTemplateStore.getState().galleryOpen && routedWizard.current) {
        useTemplateStore.getState().closeGallery();
      }
      routedWizard.current = false;
      consumedDesign.current = null;
    }
    // `galleryOpen` stays a dependency — it is what RE-RUNS this effect when the wizard opens
    // or closes; the branches above just read the live value rather than this snapshot of it.
  }, [route, galleryOpen]);

  // Only the WARM path (Home → `#/new`) has a Home worth preserving under the wizard. A boot
  // that LANDED on `#/new` renders NO under-surface: there is nothing to keep alive, and
  // mounting the whole dashboard (with its thumbnails) beneath a full-screen opaque wizard is
  // work whose only possible visible outcome is a flash. The flag clears the moment the route
  // leaves the wizard, so Home → `#/new` gets the preserved Home back for the rest of the
  // session. It reads the RESOLVED boot route, so a first-ever visit to a bare `/app` — which
  // decideBootRoute lands on the wizard — counts as a wizard boot too, the same as the
  // landing page's `/app#/new`.
  const bootedOnWizard = useRef(bootRoute?.view === 'new');
  useEffect(() => {
    if (route.view !== 'new') bootedOnWizard.current = false;
  }, [route]);

  // A session that DIED (refresh token expired/revoked — syncController's transition, never a
  // deliberate Sign out) surfaces as the ordinary sign-in prompt with a reason: sync stops
  // silently otherwise, and local work was never at risk, so the prompt says both. Never a
  // wall — dismissing it keeps the whole studio working offline-style (step 9).
  useEffect(() => {
    if (!isBackendConfigured()) return;
    const onExpired = () =>
      useAuthUi.getState().openSignIn('Your session expired — sign in again to keep syncing. Everything you made is safe on this device.');
    window.addEventListener('spx-session-expired', onExpired);
    return () => window.removeEventListener('spx-session-expired', onExpired);
  }, []);

  // A DURABLE WRITE that failed after the fact (model/durableStore.ts). Persisting to IndexedDB
  // is confirmed a moment after the call returns, so a refusal cannot come back as that call's
  // return value the way a localStorage quota error did - it arrives here instead, and it must
  // still be loud. The same dialog, raised from the event, is what keeps "a save either happened
  // or said so" true now that the write is asynchronous. The next write throws synchronously
  // (the store's sticky full flag), so the ordinary in-line error paths take over from here.
  useEffect(() => {
    const onStorageError = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string; message?: string }>).detail;
      raiseStorageAlert({
        action: 'Saving to this browser',
        error: detail?.message ?? 'Your work could not be saved to browser storage.',
        outcome: 'Your work is still open here — export it or free some room, then save again.',
      });
      // The topbar must not keep reading "Saved" for a write that did not land.
      const s = useTemplateStore.getState();
      if (s.saved.status !== 'failed') s.setSaved({ ...s.saved, dirty: true, status: 'failed' });
    };
    window.addEventListener('spx-storage-error', onStorageError);
    return () => window.removeEventListener('spx-storage-error', onStorageError);
  }, []);

  // Public show-chat send-in page: <app-url>?chat=<slug>. Anyone with the link may submit;
  // RLS is the boundary. Everything else is the builder.
  const params = new URLSearchParams(window.location.search);
  const chatSlug = params.get('chat');
  if (chatSlug) return <SendIn slug={chatSlug} />;

  // Hosted control page: <app-url>?control=<slug> — the show's operator page, no login,
  // the unguessable slug is the capability (same pattern as ?chat=).
  const controlSlug = params.get('control');
  if (controlSlug) return <HostedControlPage slug={controlSlug} />;

  // Agent access consent: <app-url>?agent=<state>&port=&name=&challenge= — a coding agent's CLI
  // (`noacg login`) opened this; the page asks once and hands a one-time code to the CLI's
  // loopback listener (docs/AGENT_SAVE.md). A query route like the two above, rendered INSTEAD
  // of the studio: it is a question, not a surface.
  if (isAgentRequestUrl(params)) return <AgentAccessConsent params={params} />;

  // Routed surfaces: Home, a saved graphic's control panel, a production's page; then the
  // editor, which is open to everyone — no login wall (Era 5.6). Account features (cloud
  // sync, community, AI) gate themselves via useAuthState and the on-demand SignInDialog.
  // Under the full-screen wizard (`#/new`) the default studio renders HOME, not an editor
  // shell — booting Monaco under a surface that covers it helped no one; Advanced mode keeps
  // the classic editor-under-wizard so its create flows land where they always did.
  // The two HomePage usages share ONE key on purpose: navigating Home ⇄ `#/new` must NOT
  // remount Home — the remount repainted blank thumbnails for a frame before the wizard
  // covered them (the acceptance round's "flash"). Freshness after a wizard create comes from
  // Home's own 'spx-data-changed' listener instead.
  // ...but only the WARM path has a Home worth preserving — see `bootedOnWizard` above.
  const surface =
    route.view === 'home' ? <HomePage key="home" route={route} />
    : route.view === 'control' ? <GraphicControlPage id={route.id} />
    : route.view === 'production' ? <ProductionPage id={route.id} sub={route.sub ?? null} />
    // A join link's SURFACE is Home - the dialog itself mounts below, with the app-level
    // dialogs, so an offline build (where it renders nothing) simply lands the visitor on Home
    // rather than on a blank surface.
    : route.view === 'join-team' ? <HomePage key="home" route={{ view: 'home', section: 'productions' }} />
    : route.view === 'video' ? <VideoAppShell />
    : route.view === 'graphic' ? <AppShell />
    : route.view === 'new' && !advanced ? (bootedOnWizard.current ? null : <HomePage key="home" route={{ view: 'home', section: null }} />)
    : kind === 'video' ? <VideoAppShell />
    : <AppShell />;

  // The export window and the WIZARD mount HERE rather than inside a shell: Home is a
  // SIBLING of AppShell, not a child, and both open them. The wizard used to mount in each
  // editor shell, which forced `#/new` to render an editor underneath - at App level it
  // opens full-screen over ANY surface (step 4). Both live in module stores, so mounting
  // per surface would put two modals on screen at once.
  return (
    <>
      {surface}
      <CreationWizard />
      {/* The save dialogs mount ONCE, here, and AFTER the wizard on purpose. They used to be
          per-shell, which left every shell without one (the control page, the production
          dashboard, the video shell, a cold boot on `#/new`) with a guard that could be
          REQUESTED but never rendered - requestSwitch set the store and nothing appeared. And
          the unsaved-changes guard can now be raised from INSIDE the wizard (its + New graphic
          door), so it must paint over the wizard: every backdrop shares z-index 100, and DOM
          order is what decides. */}
      <SaveDialogs />
      {/* The teams doors (docs/TEAMS_PLAN.md §6), mounted ONCE here because both are reached
          from siblings: the share dialog from Home's production card menu AND the production
          page header, the join dialog from a route. Each renders nothing at all unless a real
          session exists on a build with a backend - an offline build grows no team UI, which is
          pinned by e2e/auth.spec.ts. */}
      <ShareWithTeamDialog />
      {route.view === 'join-team' && <JoinTeamDialog code={route.code} />}
      <ExportWindow />
      {/* The password-reset link can land on ANY route, so its dialog mounts once here
          (renders nothing offline — step 9). */}
      <PasswordRecoveryDialog />
      {/* A failed write to browser storage is announced HERE, not by whichever surface hit it:
          the wizard closes itself the moment a create replaces the route, so an inline message
          would unmount before it could be read (the "add to production dumps you in the canvas"
          defect). */}
      <StorageAlertDialog />
      <AnalyticsConsentBanner />
      {/* A boot that could not use IndexedDB (blocked, wedged, or absent) says so once,
          honestly - model/durableStore.ts durableStoreHealth. Renders null on the healthy
          path, which is every ordinary browser. */}
      <StorageHealthNotice />
    </>
  );
}

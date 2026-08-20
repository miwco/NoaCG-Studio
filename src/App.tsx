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
import StorageAlertDialog from './components/save/StorageAlertDialog';
import { useAuthUi } from './components/auth/authUi';
import { isBackendConfigured } from './backend/config';
import { useDocKindStore } from './store/docKindStore';
import { useTemplateStore } from './store/templateStore';
import { useRouter } from './app/router';
import { openGraphicById, useSaveUi } from './store/saveActions';
import { raiseStorageAlert } from './store/storageAlert';
import { isAdvancedMode, useAdvancedMode } from './components/useAdvancedMode';
import AnalyticsConsentBanner from './components/AnalyticsConsentBanner';
import StorageHealthNotice from './components/StorageHealthNotice';

export default function App() {
  // Which editor world is active: SPX live graphics or the AI video editor. Persisted;
  // the wizard flips it when a project of the other kind is created or opened.
  const kind = useDocKindStore((s) => s.kind);
  const advanced = useAdvancedMode((s) => s.advanced);

  // In-app surface routing (docs/SAVED_CONTENT_MODEL.md §3): hash routes for Home,
  // per-graphic control panels, productions, and direct graphic links — real history, so
  // Back/Forward walk between surfaces and a refresh restores the same place.
  const route = useRouter((s) => s.route);

  // WIZARD-FIRST BOOT (docs/GOALS.md "Student release" step 4), once per load, default mode
  // only: the bare '' route lands on the wizard for a first-ever visit (galleryOpen's initial
  // value - no autosaved project) and on HOME for a returning user. Advanced mode keeps the
  // classic behavior ('' = the editor, restoring the autosaved document). Deep links
  // (#/graphic, #/production, ?control=...) are never rewritten.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const bootRoute = useRouter.getState().route;
    // A DEEP LINK (a production page, a control panel, a graphic) must never open under the
    // startup wizard: the auto-open (galleryOpen's initial value - no autosaved project)
    // exists for the bare '' boot only, and since the wizard mounts at App level it would
    // otherwise cover whatever the link pointed at. Both modes.
    if (bootRoute.view !== 'editor' && bootRoute.view !== 'new') {
      if (useTemplateStore.getState().galleryOpen) useTemplateStore.getState().closeGallery();
      return;
    }
    if (isAdvancedMode()) return;
    if (bootRoute.view !== 'editor') return;
    if (useTemplateStore.getState().galleryOpen) {
      useRouter.getState().replace({ view: 'new' });
    } else {
      useRouter.getState().replace({ view: 'home', section: null });
    }
  }, []);

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
        if (!openGraphicById(route.id)) {
          // Unknown id (deleted, other profile): land on Home rather than a dead editor.
          useRouter.getState().replace({ view: 'home', section: null });
        }
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
  // useLayoutEffect, not useEffect: the wizard must be IN the frame the route change paints.
  // As a post-paint effect this ran one frame late, so navigating Home → `#/new` painted an
  // uncovered under-surface first — the visible "flash" the acceptance round reported.
  useLayoutEffect(() => {
    if (route.view === 'new') {
      const design = route.design ?? null;
      if (galleryOpen) {
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
      if (galleryOpen && routedWizard.current) useTemplateStore.getState().closeGallery();
      routedWizard.current = false;
      consumedDesign.current = null;
    }
  }, [route, galleryOpen]);

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
  const surface =
    route.view === 'home' ? <HomePage key="home" route={route} />
    : route.view === 'control' ? <GraphicControlPage id={route.id} />
    : route.view === 'production' ? <ProductionPage id={route.id} sub={route.sub ?? null} />
    : route.view === 'video' ? <VideoAppShell />
    : route.view === 'graphic' ? <AppShell />
    : route.view === 'new' && !advanced ? <HomePage key="home" route={{ view: 'home', section: null }} />
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
